import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Input,
  Button,
  message,
  Card,
  Tag,
  Alert,
  Tooltip,
  Skeleton,
  Divider,
  Row,
  Col,
  Space,
  Typography,
  Badge,
} from "antd";
import { ThunderboltOutlined, CheckOutlined, InfoCircleOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import { resolveCustomerIdFromAuth } from "../../api/authHelpers";
import "./ChargingSessionStart.css";

const { Title, Text } = Typography;

/* ===== Helpers ===== */
function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";

const toNumId = (v) => {
  const s = String(v ?? "").trim();
  if (!/^\d+$/.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : NaN;
};
const normId = (x) =>
  x?.id ?? x?.Id ?? x?.stationId ?? x?.StationId ?? x?.chargerId ?? x?.ChargerId ?? x?.portId ?? x?.PortId;
const normText = (x) => (x == null || x === "" ? "—" : x);
const fmtAddress = (s = {}) => s.address || s.Address || s.fullAddress || s.FullAddress || "—";

async function fetchOne(paths) {
  const list = Array.isArray(paths) ? paths : [paths];
  for (const p of list) {
    try {
      const url = p.startsWith("http") ? p : `${API_ABS}${p.startsWith("/") ? "" : "/"}${p}`;
      const res = await fetchAuthJSON(url, { method: "GET" });
      if (res) return res;
    } catch { }
  }
  throw new Error("Not found");
}

// PATCH A: helpers chọn vehicleId & lấy chi tiết từ API (không gán cứng)
async function pickVehicleIdFromApi({ apiBase, customerId, companyId }) {
  // Ưu tiên: liệt kê xe theo customerId
  const urls = [];
  if (Number.isFinite(customerId)) {
    urls.push(`${apiBase}/Vehicles?page=1&pageSize=50&customerId=${encodeURIComponent(customerId)}`);
  }
  // Fallback: theo companyId
  if (Number.isFinite(companyId)) {
    urls.push(`${apiBase}/Vehicles?page=1&pageSize=50&companyId=${encodeURIComponent(companyId)}`);
  }
  // Fallback cuối: không filter
  urls.push(`${apiBase}/Vehicles?page=1&pageSize=50`);

  for (const url of urls) {
    try {
      const r = await fetchAuthJSON(url, { method: "GET" });
      const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
      if (!items.length) continue;

      // Ưu tiên chiếc thực sự thuộc customer hiện tại
      const mine = Number.isFinite(customerId)
        ? items.find(v => Number(v?.customerId ?? v?.CustomerId) === Number(customerId)) || items[0]
        : items[0];

      const vid = Number(mine?.vehicleId ?? mine?.VehicleId ?? mine?.id ?? mine?.Id);
      if (Number.isFinite(vid) && vid > 0) return vid;
    } catch { }
  }
  return null;
}

async function fetchVehicleById(apiBase, vehicleId) {
  if (!Number.isFinite(vehicleId)) return null;
  try {
    const v = await fetchAuthJSON(`${apiBase}/Vehicles/${vehicleId}`, { method: "GET" });
    return v?.data || v || null;
  } catch {
    return null;
  }
}


const pickCompanyId = (st, ch, g) => {
  const fromState = st?.companyId ?? st?.CompanyId ?? ch?.companyId ?? ch?.CompanyId ?? g?.companyId ?? g?.CompanyId;
  const fromStorage = Number(localStorage.getItem("companyId")) || Number(sessionStorage.getItem("companyId"));
  const n = toNumId(fromState ?? fromStorage);
  return Number.isFinite(n) ? n : null;
};

// ====== GỢI Ý CỔNG TƯƠNG THÍCH ======
function normalizeConnectorString(raw = "") {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[-_]/g, "");
}

// Lấy danh sách ports của 1 charger và tìm port có connector trùng với xe
async function findCompatiblePort(apiBase, chargerId, wantedConnector) {
  try {
    if (!chargerId || !wantedConnector) return null;
    const res = await fetchAuthJSON(`${apiBase}/Ports?chargerId=${encodeURIComponent(chargerId)}&page=1&pageSize=100`, { method: "GET" });
    const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
    if (!items.length) return null;

    const normWant = normalizeConnectorString(wantedConnector);
    // Ưu tiên port available
    const sameAndAvail = items.find(p =>
      normalizeConnectorString(p?.connectorType ?? p?.ConnectorType) === normWant &&
      normalizePortStatus(p?.status ?? p?.Status) === "available"
    );
    if (sameAndAvail) return sameAndAvail;

    // fallback: port trùng connector (bất kể trạng thái)
    return items.find(p =>
      normalizeConnectorString(p?.connectorType ?? p?.ConnectorType) === normWant
    ) || null;
  } catch {
    return null;
  }
}


/* ===== Pricing helpers ===== */
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const VI_TIME_RANGE = { Low: "Thấp điểm", Normal: "Bình thường", Peak: "Cao điểm" };
const viTimeRange = (tr) => VI_TIME_RANGE[tr] || tr;
const low = (s) => String(s ?? "").trim().toLowerCase();
const mkKey = (typeRaw, powerKw) => `${low(typeRaw)}|${Number(powerKw) || 0}`;
function parseKwFromText(txt) {
  const m = String(txt ?? "").match(/([\d.]+)/);
  return m ? Number(m[1]) : undefined;
}
// Low: 22:00–06:00 ; Peak: 17:00–22:00 ; còn lại Normal
function timeRangeOfHM(h, m) {
  const t = h * 60 + m;
  const inRange = (a, b, x) => (a <= b ? x >= a && x < b : x >= a || x < b);
  if (inRange(22 * 60, 6 * 60, t)) return "Low";
  if (inRange(17 * 60, 22 * 60, t)) return "Peak";
  return "Normal";
}

function normalizePortStatus(raw = "") {
  const s = String(raw).trim().toLowerCase();
  switch (s) {
    case "available":
      return "available";
    case "reserved":
      return "reserved";
    case "occupied":
    case "busy":
    case "charging":
      case "inuse":
      return "busy";
    case "disabled":
    case "inactive":
    case "maintenance":
      return "maintenance";
    default:
      return "unknown";
  }
}

function isCarType(t = "") {
  const s = String(t).toLowerCase();
  return ["car", "oto", "ô tô", "ôto", "auto", "four-wheeler"].some((k) => s.includes(k));
}
function isBikeType(t = "") {
  const s = String(t).toLowerCase();
  return ["bike", "xe máy", "xemay", "motor", "scooter", "moped", "two-wheeler"].some((k) => s.includes(k));
}
function normTypeACDC(s = "") {
  const t = String(s).toLowerCase();
  if (/(^|\W)dc(\W|$)|fast|rapid|ultra/.test(t)) return "DC";
  if (/(^|\W)ac(\W|$)|slow|normal/.test(t)) return "AC";
  return s || "";
}

function normConnector(raw = "") {
  const s = String(raw || "").trim().toLowerCase().replace(/\s+/g, "").replace(/-/g, "").replace(/_/g, "");
  if (/^type2$|^t2$|^mennekes$/.test(s)) return "type2"; // AC
  if (/^ccs2$|^combo2$|^ccscombo2$/.test(s)) return "ccs2"; // DC
  if (/^chademo$|^cha?de?mo$/.test(s)) return "chademo"; // DC
  if (/^gbt$|^gbtac$/.test(s)) return "gbt";
  if (/^schuko$|^2pin$|^2prong$|^scooter$/.test(s)) return "2pin";
  return s;
}
function sameConnector(a, b) {
  const x = normConnector(a);
  const y = normConnector(b);
  if (!x || !y) return false;
  return x === y;
}

function checkCompatibility(vehicle, charger, port) {
  if (!vehicle || !port) return { ok: true };
  const vConn = vehicle.connectorType ?? vehicle.ConnectorType ?? "";
  const pConn = port.connectorType ?? port.ConnectorType ?? port.portConnectorType ?? "";
  if (vConn && pConn && !sameConnector(vConn, pConn)) {
    return { ok: false, reason: `Đầu nối xe (${vConn}) không khớp với cổng (${pConn}).`, code: "CONNECTOR_MISMATCH" };
  }
  const vType = normTypeACDC(vehicle.vehicleType ?? vehicle.type ?? "");
  const cType = normTypeACDC(charger?.type ?? charger?.Type ?? "");
  if (isBikeType(vType) && cType === "DC") {
    return { ok: false, reason: "Xe máy không hỗ trợ sạc DC.", code: "AC_DC_RULE" };
  }
  return { ok: true };
}

/* ===== Component ===== */
export default function ChargingSessionStart() {
  const [vehicle, setVehicle] = useState(null);
  const [vehicleError, setVehicleError] = useState("");
  const navigate = useNavigate();
  const { state } = useLocation();

  const [station, setStation] = useState(state?.station || {});
  const [charger, setCharger] = useState(state?.charger || {});
  const [gun, setGun] = useState(state?.gun || state?.port || {});
  const [suggestedPort, setSuggestedPort] = useState(null);
  const [infoReady, setInfoReady] = useState(!!normId(gun) || !!normId(charger));
  const [showInfo, setShowInfo] = useState(false);

  const stationName = normText(station.stationName || station.StationName || station.name || station.title);
  const stationAddress = fmtAddress(station);
  const chargerCode = normText(charger.code || charger.Code);
  const chargerType = normText(charger.type || charger.Type);
  const chargerPower =
    charger.powerLabel ||
    charger.power ||
    (Number.isFinite(charger.powerKw) ? `${charger.powerKw} kW` : charger.Power || charger.PowerKW || "—");
  const gunCode = gun.code || gun.Code || gun.name;
  const gunDisplay = gunCode || (normId(gun) ? `P-${normId(gun)}` : "—");

  const idHints = useMemo(() => {
    const gid = normId(gun);
    const cid = normId(charger);
    const rawId = gid || cid || "1";
    const pish = `P-${gid || 1}`;
    const dash = `${cid || 1}-${gid || 1}`;
    return [String(rawId), pish, dash].filter(Boolean);
  }, [gun, charger]);

  const [typedId, setTypedId] = useState("");
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [starting, setStarting] = useState(false);

  /* ===== Pricing states & timers ===== */
  const [pricingMap, setPricingMap] = useState(() => new Map());
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const pr = await fetchAuthJSON(`/PricingRule`);
        const items = Array.isArray(pr?.items) ? pr.items : Array.isArray(pr) ? pr : [];
        const active = items.filter((r) => low(r.status) === "active");
        const mp = new Map();
        for (const r of active) {
          const key = mkKey(r.chargerType, r.powerKw);
          const bucket = mp.get(key) || {};
          bucket[low(r.timeRange)] = r;
          mp.set(key, bucket);
        }
        if (alive) setPricingMap(mp);
      } catch (e) {
        console.warn("[ChargingSessionStart] Không tải được PricingRule:", e?.message);
        if (alive) setPricingMap(new Map());
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cid = await resolveCustomerIdFromAuth(API_ABS);
        if (!Number.isFinite(cid)) {
          setVehicleError("Không xác định được khách hàng.");
          return;
        }
        const res = await fetchAuthJSON(`/Vehicles?page=1&pageSize=50&customerId=${cid}`);
        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        if (!items.length) {
          setVehicleError("Tài khoản của bạn chưa có xe. Hãy thêm xe trước khi bắt đầu sạc.");
          return;
        }
        const first = items.find((v) => String(v.customerId ?? v.CustomerId) === String(cid)) || items[0];
        if (alive) setVehicle(first);
      } catch (e) {
        if (alive) setVehicleError(e?.message || "Không thể tải danh sách xe.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currentPricing = useMemo(() => {
    if (!charger) return null;
    const typeRaw = charger.type ?? charger.Type ?? "";
    const kw = Number.isFinite(charger.powerKw) ? charger.powerKw : parseKwFromText(chargerPower);
    if (!typeRaw || !Number.isFinite(kw)) return null;
    const key = mkKey(typeRaw, kw);
    const bucket = pricingMap.get(key);
    if (!bucket) return null;
    const h = now.getHours();
    const m = now.getMinutes();
    const tr = timeRangeOfHM(h, m);
    const r = bucket[low(tr)];
    if (!r) return null;
    return { ...r, timeRange: tr, label: `${viTimeRange(tr)} • ${vnd(r.pricePerKwh)}/kWh` };
  }, [charger, chargerPower, pricingMap, now]);

  // === XÁC NHẬN + TRA CỨU ===
  async function lookupInfo() {
    const parsePort = (s) => {
      if (!s) return null;
      const m = String(s).match(/(\d+)$/);
      return m ? Number(m[1]) : Number(s);
    };
    const portId = toNumId(parsePort(typedId) ?? normId(gun));
    if (!Number.isFinite(portId)) {
      message.error("Vui lòng nhập ID trụ/súng hợp lệ.");
      return;
    }

    setLoadingLookup(true);
    try {
      // 1) Port
      const port = await fetchOne([`/Ports/${portId}`, `/ChargingPorts/${portId}`]);
      const resolvedPortId = port?.portId ?? port?.PortId ?? portId;
      const portStatus = normalizePortStatus(
        port?.status ?? port?.Status ?? port?.state ?? port?.State ?? port?.currentStatus ?? port?.CurrentStatus ?? port?.availability ?? port?.Availability ?? ""
      );
      setGun({ ...(port || {}), portId: resolvedPortId, id: resolvedPortId, status: portStatus });

      // 2) Charger
      const chId = port?.chargerId ?? port?.ChargerId ?? gun?.chargerId ?? gun?.ChargerId ?? normId(charger);
      if (!Number.isFinite(toNumId(chId))) throw new Error("Không tìm thấy trụ sạc từ port.");
      const chg = await fetchOne([`/Chargers/${chId}`, `/api/Chargers/${chId}`]);
      setCharger(chg || {});

      // 3) Station
      const stId = chg?.stationId ?? chg?.StationId ?? normId(station);
      if (!Number.isFinite(toNumId(stId))) throw new Error("Không tìm thấy trạm từ trụ sạc.");
      const st = await fetchOne([`/Stations/${stId}`, `/api/Stations/${stId}`]);
      setStation(st || {});

      // 4) Lấy vehicle mới nhất (để biết đúng connector)
      const cid = await resolveCustomerIdFromAuth(API_ABS);
      let veh = null;
      try {
        const vres = await fetchAuthJSON(`/Vehicles?page=1&pageSize=50&customerId=${cid}`, { method: "GET" });
        const items = Array.isArray(vres?.items) ? vres.items : Array.isArray(vres) ? vres : [];
        veh = items.find(v => String(v?.customerId ?? v?.CustomerId) === String(cid)) || items[0] || null;
      } catch { }
      if (veh) setVehicle(veh);

      // 5) Nếu connector xe ≠ connector port ⇒ gợi ý port cùng trụ phù hợp
      setSuggestedPort(null);
      if (veh) {
        const vConn = veh?.connectorType ?? veh?.ConnectorType ?? "";
        const pConn = port?.connectorType ?? port?.ConnectorType ?? port?.portConnectorType ?? "";
        if (normalizeConnectorString(vConn) && normalizeConnectorString(pConn) &&
          normalizeConnectorString(vConn) !== normalizeConnectorString(pConn)) {
          const hint = await findCompatiblePort(API_ABS, chId, vConn);
          if (hint) setSuggestedPort(hint);
        }
      }

      setInfoReady(true);
      setShowInfo(true);
      message.success("Đã xác nhận và tải thông tin từ máy chủ.");
    } catch (e) {
      console.error("[lookupInfo]", e);
      setInfoReady(false);
      setShowInfo(false);
      setStation({});
      setCharger({});
      setGun({});
      setSuggestedPort(null);
      message.error(e?.message || "Không tra cứu được thông tin từ máy chủ.");
    } finally {
      setLoadingLookup(false);
    }
  }


  // === BẮT ĐẦU SẠC ===
  async function resolveFirstVehicleIdForCustomer(customerId) {
    try {
      const tryUrls = [
        `${API_ABS}/Vehicles?page=1&pageSize=10&customerId=${encodeURIComponent(customerId)}`,
        `${API_ABS}/Vehicles?page=1&pageSize=50`,
      ];
      for (const url of tryUrls) {
        const r = await fetchAuthJSON(url, { method: "GET" });
        const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
        if (!items.length) continue;
        const mine = items.find((v) => String(v?.customerId ?? v?.CustomerId) === String(customerId)) || items[0];
        const vid = Number(mine?.vehicleId ?? mine?.VehicleId ?? mine?.id ?? mine?.Id);
        if (Number.isFinite(vid) && vid > 0) return vid;
      }
    } catch { }
    return null;
  }

  function readVehicleIdFromStorage(customerId) {
    try {
      // key global (tiện cho code cũ)
      const g = Number(localStorage.getItem("vehicleId") || sessionStorage.getItem("vehicleId"));
      // key scoped theo customer (Login.jsx đã set nếu có customerId)
      const scopedKey = Number.isFinite(customerId) ? `vehicleId__${customerId}` : null;
      const s = scopedKey
        ? Number(localStorage.getItem(scopedKey) || sessionStorage.getItem(scopedKey))
        : NaN;
      if (Number.isFinite(s) && s > 0) return s;
      if (Number.isFinite(g) && g > 0) return g;
    } catch { }
    return null;
  }


  async function handleStart() {
    if (!infoReady) return message.error("Vui lòng xác nhận ID trước khi bắt đầu sạc.");
    if (gun?.status && gun.status !== "available") return message.warning("Cổng này hiện không khả dụng để sạc.");
    if (!vehicle) return message.error("Không tìm thấy xe của bạn.");

    const portId = toNumId(normId(gun));
    if (!Number.isFinite(portId)) return message.error("Thiếu portId hợp lệ.");

    // Lấy id chuẩn
    let customerId = toNumId(state?.customerId ?? state?.customer?.id ?? (await resolveCustomerIdFromAuth(API_ABS)));
    // 1) ƯU TIÊN: vehicleId đã lưu khi Login
    let vehicleId =
      toNumId(readVehicleIdFromStorage(customerId)) ??
      NaN;
    // 2) Fallback: state (nếu màn trước có truyền)
    if (!Number.isFinite(vehicleId)) {
      vehicleId = toNumId(state?.vehicleId ?? state?.vehicle?.id ?? state?.vehicle?.vehicleId);
    }
    // 3) Fallback cuối: tra qua API
    if (!Number.isFinite(vehicleId)) {
      vehicleId = await resolveFirstVehicleIdForCustomer(customerId);
    }
    if (!Number.isFinite(vehicleId)) {
      return message.error("Không tìm được vehicleId (hãy thêm xe hoặc đăng nhập lại).");
    }

    // 🔄 lấy vehicle fresh từ API để chắc connector đúng nhất
    const vehicleFresh = await fetchVehicleById(API_ABS, vehicleId);
    if (!vehicleFresh) return message.error("Không đọc được thông tin xe từ máy chủ.");

    const comp = checkCompatibility(vehicleFresh, charger, gun);
    if (!comp.ok) {
      // Nếu đã có suggestedPort thì đề nghị chuyển
      if (suggestedPort) {
        return message.warning(
          `Xe dùng ${vehicleFresh.connectorType}, cổng hiện tại là ${gun?.connectorType}. Hãy bấm "Chuyển sang cổng gợi ý" bên dưới.`
        );
      }
      return message.error(comp.reason || "Xe và cổng sạc không tương thích.");
    }

    const bookingRaw = state?.bookingId ?? state?.booking?.id ?? state?.booking?.bookingId ?? null;
    const nBooking = toNumId(bookingRaw);
    const bookingId = Number.isFinite(nBooking) ? nBooking : null;
    const companyId = pickCompanyId(state, charger, gun);

    setStarting(true);
    try {
      const payload = {
        customerId,
        companyId: Number.isFinite(companyId) ? companyId : null,
        vehicleId,
        bookingId,
        portId
      };
      const url = `${API_ABS}/ChargingSessions/start`;
      const res = await fetchAuthJSON(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = res?.data || res;
      if (!data?.chargingSessionId) throw new Error(res?.message || "Không nhận được sessionId.");
      message.success(res?.message || "Đã bắt đầu phiên sạc!");

      navigate("/charging", {
        replace: true,
        state: {
          station, charger, gun,
          customerId,
          companyId: Number.isFinite(companyId) ? companyId : undefined,
          vehicleId,
          bookingId,
          portId,
          startedAt: data.startedAt || Date.now(),
          chargingSessionId: data.chargingSessionId,
          startSessionData: data,
          carModel: state?.carModel ?? undefined,
          plate: state?.plate ?? undefined,
        },
      });
    } catch (e) {
      console.error("[startSession]", e);
      message.error(e?.message || "Không bắt đầu được phiên sạc.");
    } finally {
      setStarting(false);
    }
  }


  // ======= UI helpers =======
  const statusTag = (st) => {
    const s = (st || "").toLowerCase();
    if (s === "available") return <Tag color="success">Sẵn sàng</Tag>;
    if (s === "busy") return <Tag color="warning">Đang bận</Tag>;
    if (s === "reserved") return <Tag color="processing">Đã đặt trước</Tag>;
    if (s === "maintenance") return <Tag color="error">Bảo trì</Tag>;
    return <Tag>Không rõ</Tag>;
  };

  const PriceBadge = () => (
    <Tooltip
      title={
        currentPricing ? (
          <span>
            Áp dụng lúc {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")} –
            khung giờ {viTimeRange(currentPricing.timeRange)}
          </span>
        ) : (
          "Giá tham khảo nếu có."
        )
      }
    >
      <Badge
        count={currentPricing ? `${vnd(currentPricing.pricePerKwh)}/kWh` : "—"}
        style={{ background: "var(--cs-chip-bg)", color: "var(--cs-chip-fg)" }}
      />
    </Tooltip>
  );

  // ======= WHY BUTTON DISABLED (for tooltip only) =======
  function getDisableReason() {
    if (!infoReady) return "Chưa xác nhận trụ/cổng.";
    const s = (gun?.status || "").toLowerCase();
    if (s === "busy") return "Cổng đang bận.";
    if (s === "maintenance" || s === "inactive") return "Cổng đang bảo trì/không hoạt động.";
    if (s === "reserved") return "Cổng đã được đặt trước.";
    if (vehicleError) return vehicleError;

    // KHÔNG disable vì không tương thích nữa — chỉ hiển thị cảnh báo ở trên và chặn trong handleStart()
    return "";
  }


  return (
    <MainLayout>
      <div className="cs-root pro-bg">
        {/* Hero */}
        <div className="cs-hero">
          <div className="cs-hero-left">
            <Title level={2} style={{ margin: 0 }}>
              Bắt đầu phiên sạc
            </Title>
            <Text type="secondary">
              Nhập ID trụ hoặc súng – hệ thống sẽ tự nhận diện và hiển thị thông tin chi tiết.
            </Text>
          </div>
          <div className="cs-hero-right">
            <Space size={8} wrap>
              <Tag icon={<InfoCircleOutlined />} color="blue">
                Real‑time Pricing
              </Tag>
              <Tag color="purple">Smart Validation</Tag>
              <Tag color="geekblue">AC/DC Rules</Tag>
            </Space>
          </div>
        </div>

        {/* Ô nhập + XÁC NHẬN */}
        <Card className="cs-elevate cs-enter">
          <label className="cs-input-label">Nhập ID trụ hoặc súng để bắt đầu phiên sạc</label>
          <div className="cs-input-row fancy">
            <Input
              placeholder={`VD: ${idHints[0] || "1"}`}
              value={typedId}
              onChange={(e) => setTypedId(e.target.value)}
              onPressEnter={() => {
                if (typedId.trim()) lookupInfo();
              }}
              size="large"
            />
            <Button
              className="cs-btn-green big"
              size="large"
              icon={<CheckOutlined />}
              loading={loadingLookup}
              onClick={lookupInfo}
              disabled={!typedId.trim()}
              type="primary"
            >
              Xác nhận
            </Button>
          </div>
          <div className="cs-hints">
            Gợi ý:&nbsp;
            {idHints.map((h, i) => (
              <React.Fragment key={h}>
                <a
                  href="#!"
                  onClick={(e) => {
                    e.preventDefault();
                    setTypedId(h);
                  }}
                  className="cs-hint"
                >
                  {h}
                </a>
                {i < idHints.length - 1 ? <span className="cs-dot"> • </span> : null}
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* Thông tin: chỉ hiện sau khi XÁC NHẬN thành công */}
        {showInfo && infoReady ? (
          <div className={`cs-card-reveal show`}>
            {/* SUMMARY STRIP */}
            <div className="cs-summary">
              <Space size={16} wrap>
                <Tag color="green">Trạm: {stationName}</Tag>
                <Tag>Trụ: {normText(chargerCode)}</Tag>
                <Tag>Loại: {normText(chargerType)}</Tag>
                <Tag>kW: {normText(chargerPower)}</Tag>
                <Tag>Port: {normText(gunDisplay)}</Tag>
                <PriceBadge />
                <div style={{ marginLeft: 8 }}>{statusTag(gun?.status)}</div>
              </Space>
            </div>

            <Row gutter={[16, 16]}>
              {/* STATION */}
              <Col xs={24} md={12}>
                <Card title="Trạm sạc" className="cs-elevate glass">
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <div className="cs-row">
                      <div className="cs-label">Trạm</div>
                      <div className="cs-value">{stationName}</div>
                    </div>
                    <div className="cs-row">
                      <div className="cs-label">Địa chỉ</div>
                      <div className="cs-value">{stationAddress}</div>
                    </div>
                  </Space>
                </Card>
              </Col>

              {/* CHARGER */}
              <Col xs={24} md={12}>
                <Card title="Trụ & Cổng" className="cs-elevate glass" extra={<PriceBadge />}>
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <div className="cs-row">
                      <div className="cs-label">Mã trụ</div>
                      <div className="cs-value">{normText(chargerCode)}</div>
                    </div>
                    <div className="cs-row">
                      <div className="cs-label">Loại</div>
                      <div className="cs-value">{normText(chargerType)}</div>
                    </div>
                    <div className="cs-row">
                      <div className="cs-label">Công suất</div>
                      <div className="cs-value">{normText(chargerPower)}</div>
                    </div>
                    <div className="cs-row">
                      <div className="cs-label">Súng/Cổng</div>
                      <div className="cs-value">{normText(gunDisplay)}</div>
                    </div>
                    <div className="cs-row">
                      <div className="cs-label">Tình trạng</div>
                      <div className="cs-value">{statusTag(gun?.status)}</div>
                    </div>
                    {currentPricing && (
                      <div className="cs-footnote">
                        Áp dụng theo thời điểm bắt đầu sạc: <b>{String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}</b>. Giá chỉ mang tính tham khảo; hệ thống sẽ tính cuối cùng.
                      </div>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* WARNINGS */}
            {gun?.status && gun.status !== "available" && (
              <Alert
                className="cs-elevate"
                style={{ marginTop: 12 }}
                type={gun.status === "busy" ? "warning" : gun.status === "maintenance" ? "error" : "info"}
                showIcon
                message={
                  gun.status === "busy"
                    ? "Cổng này đang bận (Occupied). Vui lòng chờ."
                    : gun.status === "reserved"
                      ? "Cổng này đã được đặt trước. Vui lòng chọn cổng khác."
                      : "Cổng này đang bảo trì hoặc bị vô hiệu hóa."
                }
              />
            )}

            {vehicleError && (
              <Alert className="cs-elevate" style={{ marginTop: 12 }} type="error" showIcon message={`🚫 ${vehicleError}`} />
            )}

            {vehicle && gun?.status === "available" && (() => {
              const comp = checkCompatibility(vehicle, charger, gun);
              return !comp.ok ? (
                <Alert className="cs-elevate" style={{ marginTop: 12 }} type="warning" showIcon message={comp.reason || "Xe và cổng sạc không tương thích."} />
              ) : null;
            })()}

            {/* ACTIONS */}
            <div className="cs-actions" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {suggestedPort ? (
                <Button
                  icon={<InfoCircleOutlined />}
                  onClick={() => {
                    const p = suggestedPort;
                    const pid = p?.portId ?? p?.PortId ?? p?.id ?? p?.Id;
                    const st = normalizePortStatus(p?.status ?? p?.Status);
                    setGun({ ...(p || {}), portId: pid, id: pid, status: st });
                    setSuggestedPort(null);
                    message.success(`Đã chuyển sang cổng gợi ý: P-${pid}`);
                  }}
                >
                  Chuyển sang cổng gợi ý ({suggestedPort?.code || suggestedPort?.name || `P-${suggestedPort?.portId || suggestedPort?.Id}`})
                </Button>
              ) : null}

              {/* Antd Tooltip không hoạt động với button disabled => bọc thêm <span> */}
              <Tooltip title={getDisableReason()} mouseEnterDelay={0.3}>
                <span>
                  <Button
                    className="cs-btn-green big pulse"
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    disabled={
                      !infoReady ||
                      ["busy", "maintenance", "reserved"].includes((gun?.status || "").toLowerCase()) ||
                      starting
                      // KHÔNG check "không tương thích" ở đây nữa
                    }
                    loading={starting}
                    onClick={handleStart}
                  >
                    Bắt đầu sạc
                  </Button>
                </span>
              </Tooltip>
            </div>


          </div>
        ) : (
          loadingLookup && (
            <Card className="cs-elevate" style={{ marginTop: 16 }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          )
        )}
      </div>
    </MainLayout>
  );
}

