// ✅ src/components/Charging/ChargingProgress.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { ThunderboltOutlined, WarningOutlined } from "@ant-design/icons";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { message } from "antd";
import "./ChargingProgress.css";
import MainLayout from "../../layouts/MainLayout";
import { fetchJSON, fetchAuthJSON, getApiBase, getToken } from "../../utils/api";
import { resolveCustomerIdFromAuth } from "../../api/authHelpers";
import { setChargeContext } from "../../utils/chargeSessionCtx";


const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " VND";
// --- DEMO SPEED SETTINGS ---
// Bật/tắt tăng tốc (đặt DEMO_SPEED=1 là tốc độ thật)
const DEMO_SPEED = 40;          // tăng ~8x
const TICK_MS = 100;            // mỗi tick UI mượt (không ảnh hưởng logic)
const PENALTY_TICK_MS = 200;    // không còn dùng (đồng hồ phạt dựa trên real-time)

// ================== Helpers ==================
function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";

function saveCtx({ orderId = null, stationId = null, chargerId = null, portId = null, stationCode = null, chargerCode = null, portCode = null, endedAt = null }) {
  try {
    setChargeContext({
      orderId, stationId, chargerId, portId,
      stationCode, chargerCode, portCode,
      endedAt
    });
  } catch { }
}
function toId(v) {
  const s = String(v ?? "").trim();
  const m = s.match(/\d+/g);
  if (!m) return null;
  const n = Number(m.join(""));
  return Number.isFinite(n) && n > 0 ? n : null;
}


// ============ Live persistence (localStorage) ============
const LS_KEY = "charging:live:v1";

function loadLive() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLive(obj) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch { }
}

function clearLive() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch { }
}

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function parseNumberLike(n) {
  if (typeof n === "number") return n;
  if (typeof n === "string") {
    const digits = (n.match(/\d+/g) || []).join("");
    return digits ? Number(digits) : NaN;
  }
  return NaN;
}

// % pin tăng mỗi giây thực (đã nhân DEMO_SPEED)
function pctPerSecond(powerKw, capacityKwh) {
  const cap = Number(capacityKwh) > 0 ? Number(capacityKwh) : 60;
  const kw = Number(powerKw) > 0 ? Number(powerKw) : 7;
  const pctPerSecReal = ((kw / 3600) / cap) * 100;
  return pctPerSecReal * DEMO_SPEED;
}

// Tính % pin tại "bây giờ" dựa trên live state
function computeBatteryNow(live) {
  if (!live) return null;
  const rate = pctPerSecond(live.powerKw, live.batteryCapacity);
  const now = Date.now();
  const elapsedSec = Math.max(0, (now - (live.lastUpdateAt || live.startedAt || now)) / 1000);
  const next = Math.min(100, (live.batteryAtLastUpdate || live.startSoc || 0) + rate * elapsedSec);
  return Number(next.toFixed(2));
}

// Khớp GetCurrentTimeRange() bên BE
function nowTimeRange(dt = new Date()) {
  const h = dt.getHours();
  if (h >= 22 || h < 6) return "Low";
  if (h >= 6 && h < 17) return "Normal";
  return "Peak";
}

function normalizeCharger(c = {}) {
  const powerKw = c.powerKw ?? c.PowerKW ?? c.power ?? c.Power;
  const priceText = c.price ?? c.Price ?? "";
  const pricePerKwh =
    c.pricePerKwh ?? c.pricePerKWh ?? c.PricePerKwh ?? c.PricePerKWh ?? parseNumberLike(priceText);

  const idleFeePerMin =
    c.idleFeePerMin ??
    c.IdleFeePerMin ??
    c.idleFeePerMinute ??
    c.IdleFeePerMinute ??
    c.idleFee ??
    c.IdleFee ??
    NaN;

  const idleGraceSeconds =
    c.idleGraceSeconds ??
    c.IdleGraceSeconds ??
    (c.idleGraceMinutes ?? c.IdleGraceMinutes ? Number(c.idleGraceMinutes ?? c.IdleGraceMinutes) * 60 : NaN);

  return {
    id: c.id ?? c.chargerId ?? c.ChargerId,
    code: c.code ?? c.Code,
    connector: c.type ?? c.Type,
    powerKw: Number(powerKw),
    priceText: String(priceText || ""),
    pricePerKwh: Number(pricePerKwh),
    idleFeePerMin: Number(idleFeePerMin),
    idleGraceSeconds: Number(idleGraceSeconds),
  };
}

function pickRule(rules = [], { powerKw, timeRange }) {
  const list = Array.isArray(rules) ? rules : [];
  const sameTR = list.filter((r) => {
    const tr = (r.timeRange ?? r.TimeRange ?? "").toString().toLowerCase();
    return tr ? tr.includes(timeRange.toLowerCase()) : true;
  });

  if (!sameTR.length) return null;
  if (!Number.isFinite(powerKw)) return sameTR[0];

  let best = sameTR[0],
    bestDiff = Infinity;
  for (const r of sameTR) {
    const pk = Number(r.powerKw ?? r.PowerKW ?? r.power ?? r.Power);
    const diff = Number.isFinite(pk) ? Math.abs(pk - powerKw) : 1e9;
    if (diff < bestDiff) {
      best = r;
      bestDiff = diff;
    }
  }
  return best;
}

function fmtDateTimeISO(s) {
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s || "—");
    return d.toLocaleString("vi-VN", { hour12: false });
  } catch {
    return String(s || "—");
  }
}

function showStartSessionToast(data) {
  message.destroy(); // xoá hết toast cũ trước khi hiện cái mới
  message.success({
    content: "✅ Bắt đầu phiên sạc thành công!",
    duration: 3,
  });
}



// =============================================================
const ChargingProgress = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location?.state ?? null; // luôn có biến state (có thể là null)

  const liveAtBoot = React.useMemo(() => loadLive(), []);
  // ==== Session từ BE ====
  const [session, setSession] = useState(null);
  // Lưu thông tin chi tiết của Charger để hiển thị label khi không có state
  const [chargerInfo, setChargerInfo] = useState(null);
  // trạng thái hiển thị: không có phiên sạc đang diễn ra
  const [noActiveSession, setNoActiveSession] = useState(false);
  // đang khởi tạo/đang kiểm tra: tránh show "chưa có phiên" quá sớm
  const [booting, setBooting] = useState(true);

  // Ưu tiên state -> session -> chargerInfo -> live
  const stationId = React.useMemo(() => {
    return (
      state?.station?.id ??
      state?.station?.stationId ??
      state?.station?.StationId ??
      session?.stationId ??
      session?.StationId ??
      null // (không quá cần thiết cho logic hiện tại)
    );
  }, [state, session]);

  const chargerId = React.useMemo(() => {
    return (
      state?.charger?.id ??
      state?.charger?.chargerId ??
      state?.charger?.ChargerId ??
      session?.chargerId ??
      session?.ChargerId ??
      chargerInfo?.id ??
      chargerInfo?.chargerId ??
      chargerInfo?.ChargerId ??
      null
    );
  }, [state, session, chargerInfo]);

  const portId = React.useMemo(() => {
    return (
      state?.gun?.id ??
      state?.gun?.portId ??
      state?.gun?.PortId ??
      session?.portId ??
      session?.PortId ??
      liveAtBoot?.portId ??
      null
    );
  }, [state, session, liveAtBoot]);

  const stationName = state?.station?.name ?? session?.stationName ?? "—";
  const chargerTitle =
    state?.charger?.title ??
    state?.charger?.code ??
    chargerInfo?.title ??
    chargerInfo?.code ??
    "—";
  const powerLabel = (() => {
    const fromState = Number(state?.charger?.powerKw);
    const fromChInfo = Number(chargerInfo?.powerKw ?? chargerInfo?.PowerKW);
    if (Number.isFinite(fromState)) return `${fromState} kW`;
    if (Number.isFinite(fromChInfo)) return `${fromChInfo} kW`;
    return state?.charger?.power ?? "—";
  })();
  const priceLabel =
    state?.charger?.price ??
    chargerInfo?.price ??
    chargerInfo?.Price ??
    null;


  // ==== Pricing dynamic ====
  const [dynPricePerKWh, setDynPricePerKWh] = useState(NaN);
  const [dynPenaltyPerMin, setDynPenaltyPerMin] = useState(NaN);
  const [dynGraceSeconds, setDynGraceSeconds] = useState(NaN);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");

  // ==== Subscription đang active (để tính đúng như BE) ====
  const [activeSub, setActiveSub] = useState({ discountPercent: 0, freeIdleMinutes: 0 });


  const parsedFromLabel = priceLabel ? Number((priceLabel.match(/\d+/g) || []).join("")) : NaN;
  // const fallbackPricePerKWh = Number.isFinite(state.pricePerKWh)
  //   ? state.pricePerKWh
  const fallbackPricePerKWh = Number.isFinite(state?.pricePerKWh)
    ? state?.pricePerKWh
    : Number.isFinite(parsedFromLabel)
      ? parsedFromLabel
      : 5500;

  // const batteryCapacity = Number.isFinite(state.batteryCapacity) ? state.batteryCapacity : 75;
  const batteryCapacity = Number.isFinite(state?.batteryCapacity) ? state?.batteryCapacity : 75;
  const initialBattery = (() => {
    const fromSession = Number(session?.startSoc);
    if (Number.isFinite(fromSession)) return Math.max(0, Math.min(100, fromSession));
    const fromState = Number(state?.startSoc);
    if (Number.isFinite(fromState)) return Math.max(0, Math.min(100, fromState));
    return 0;
  })();
  const [battery, setBattery] = useState(initialBattery);
  const startSocRef = useRef(initialBattery);
  useEffect(() => {
    const soc = Number(session?.startSoc);
    if (Number.isFinite(soc)) {
      const clamp = Math.max(0, Math.min(100, soc));
      startSocRef.current = clamp;
      setBattery(clamp);
    }
  }, [session]);

  // const TOTAL_TIME_MINUTES = Number.isFinite(state.totalTimeMinutes) ? state.totalTimeMinutes : 120;
  const TOTAL_TIME_MINUTES = Number.isFinite(state?.totalTimeMinutes) ? state?.totalTimeMinutes : 120;

  const [timeLeft, setTimeLeft] = useState("");
  const [overTimeSecs, setOverTimeSecs] = useState(0);
  const [isCharging, setIsCharging] = useState(true);

  const chargeInterval = useRef(null);     // không dùng nữa nhưng giữ để clear defensively
  const penaltyInterval = useRef(null);    // không dùng nữa
  const startedAtRef = useRef(state?.startedAt || Date.now());
  const fullAtRef = useRef(null); // ⬅️ thời điểm lần đầu chạm 100%

  // ====== Tự động bắt đầu phiên sạc nếu chưa có id ======
  useEffect(() => {
    let alive = true;
    async function startSessionIfNeeded() {
      setBooting(true);
      const stateSessionId = state?.chargingSessionId ?? state?.sessionId ?? null; // ✅ fallback
      if (stateSessionId) {
        let seed = state?.startSessionData || null;
        if (!seed) {
          try {
            const s = await fetchAuthJSON(`${API_ABS}/ChargingSessions/${encodeURIComponent(stateSessionId)}`, { method: "GET" });
            seed = s?.data || s || null;
          } catch { }
        }
        if (!seed) return;

        // Hydrate Port/Charger
        let port = null, charger = null;
        try {
          const pId = seed.portId ?? state?.portId ?? state?.gun?.id ?? state?.gun?.portId ?? state?.gun?.PortId;
          if (pId != null) port = await fetchAuthJSON(`${API_ABS}/Ports/${encodeURIComponent(pId)}`, { method: "GET" });
        } catch { }
        try {
          const chId =
            port?.chargerId ?? port?.ChargerId ??
            seed?.chargerId ?? seed?.ChargerId ??
            state?.charger?.id ?? state?.charger?.chargerId ?? state?.charger?.ChargerId ?? null;
          if (chId != null) charger = await fetchAuthJSON(`${API_ABS}/Chargers/${encodeURIComponent(chId)}`, { method: "GET" });
          if (charger) setChargerInfo(charger);
        } catch { }

        const merged = {
          ...seed,
          portStatus: seed?.portStatus ?? null,
          chargerType: seed?.chargerType ?? null,
          chargerPowerKw: seed?.chargerPowerKw ?? null,
        };
        setSession(merged);
        sessionStorage.setItem("charging:start:data", JSON.stringify({ message: "Bắt đầu phiên sạc", data: merged }));
        showStartSessionToast(merged);

        // Lưu context (chưa có orderId) để Invoice merge được nếu reload
        saveCtx({
          stationId: merged?.stationId
            ?? port?.stationId
            ?? state?.station?.id
            ?? state?.station?.stationId
            ?? null,
          chargerId: merged?.chargerId
            ?? port?.chargerId
            ?? state?.charger?.id
            ?? state?.charger?.chargerId
            ?? null,
          portId: merged?.portId
            ?? state?.gun?.id
            ?? state?.portId
            ?? null,
          stationCode: state?.station?.code ?? null,
          chargerCode: state?.charger?.code ?? charger?.code ?? null,
          portCode: state?.gun?.name ?? state?.gun?.code ?? port?.code ?? null,
        });


        // NEW: init/update live persisted state
        const kwFromState = Number(state?.charger?.powerKw);
        const kwFromSession = Number(merged?.chargerPowerKw);
        const powerKw = (Number.isFinite(kwFromSession) && kwFromSession > 0)
          ? kwFromSession
          : (Number.isFinite(kwFromState) && kwFromState > 0 ? kwFromState : 7);

        const startSoc = Number.isFinite(merged?.startSoc) ? Math.max(0, Math.min(100, Number(merged.startSoc))) : 0;

        const now = Date.now();
        // ✅ Chỉ kế thừa live nếu cùng chargingSessionId (an toàn nhất)
        const prev = loadLive();
        const sameSession = !!(prev && prev.chargingSessionId === merged?.chargingSessionId);
        const keepBattery = sameSession ? computeBatteryNow(prev) : NaN;
        if (!sameSession && prev) {
          // khác phiên => xoá live cũ để tránh mốc thời gian/pin sai
          clearLive();
        }

        const live = {
          isActive: true,
          isCharging: true,
          chargingSessionId: merged?.chargingSessionId ?? stateSessionId,
          portId: merged?.portId ?? state?.gun?.id ?? state?.portId ?? null,
          // ✅ KHÔNG dùng startedAt từ live cũ khi khác phiên
          startedAt: (merged?.startedAt ? new Date(merged.startedAt).getTime() : now),
          lastUpdateAt: now,
          startSoc,
          // ✅ chỉ giữ pin nếu đúng cùng phiên; ngược lại seed theo startSoc để không nhảy 100%
          batteryAtLastUpdate: Number.isFinite(keepBattery) ? keepBattery : startSoc,
          powerKw,
          batteryCapacity: Number.isFinite(state?.batteryCapacity) ? state.batteryCapacity : 75,
          // ✅ không “kế thừa” fullAt từ phiên cũ
          fullAt: sameSession ? (prev?.fullAt ?? null) : null,
          graceSeconds: Number.isFinite(dynGraceSeconds) ? dynGraceSeconds : 5 * 60,
        };
        saveLive(live);
        setNoActiveSession(false);
        setBooting(false);
        return;
      }

      // Bắt đầu mới nếu chưa có id
      // Ép về số an toàn
      const customerId = toId(
        state?.customerId ??
        state?.customer?.customerId ??
        (await resolveCustomerIdFromAuth(API_ABS))
      );
      const vehicleId = toId(state?.vehicleId ?? state?.vehicle?.id ?? state?.vehicle?.vehicleId);
      const bookingId = toId(state?.bookingId ?? state?.booking?.id ?? state?.booking?.bookingId);
      const portIdToUse = toId(state?.gun?.id ?? state?.gun?.portId ?? state?.gun?.PortId ?? state?.portId);

      if (!customerId || !vehicleId || !portIdToUse) {
        console.warn("[ChargingProgress] Missing IDs for start", {
          customerId, vehicleId, portIdToUse, bookingId
        });
        // Không đủ dữ liệu để start: nếu không có live thì coi như no active
        const live = loadLive();
        if (!live?.isActive) setNoActiveSession(true);
        setBooting(false);
        return;
      }

      try {
        const body = { customerId, vehicleId, portId: portIdToUse, bookingId: bookingId ?? null };
        console.log("[ChargingProgress] POST /ChargingSessions/start payload =", body);

        const url = `${API_ABS}/ChargingSessions/start`;     // ✅ thêm dòng này

        const res = await fetchAuthJSON(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });


        const msg = res?.message || "Bắt đầu phiên sạc";
        const raw = res?.data || res || null;
        if (!alive || !raw) return;

        // Hydrate thêm
        let port = null, charger = null;
        try {
          if (raw.portId != null) {
            port = await fetchAuthJSON(`${API_ABS}/Ports/${encodeURIComponent(raw.portId)}`, { method: "GET" });
          }
        } catch { }
        try {
          const chargerId =
            port?.chargerId ?? port?.ChargerId ??
            raw?.chargerId ?? raw?.ChargerId ?? null;
          if (chargerId != null) {
            charger = await fetchAuthJSON(`${API_ABS}/Chargers/${encodeURIComponent(chargerId)}`, { method: "GET" });
          }
          if (charger) setChargerInfo(charger);
        } catch { }

        const merged = {
          ...raw,
          chargerId: (port?.chargerId ?? port?.ChargerId ?? null) ?? (raw?.chargerId ?? raw?.ChargerId ?? null),
        };
        setSession(merged);
        sessionStorage.setItem("charging:start:data", JSON.stringify({ message: msg, data: merged }));
        showStartSessionToast(merged);

        // Lưu context (chưa có orderId)
        saveCtx({
          stationId: merged?.stationId
            ?? port?.stationId
            ?? state?.station?.id
            ?? state?.station?.stationId
            ?? null,
          chargerId: merged?.chargerId
            ?? port?.chargerId
            ?? state?.charger?.id
            ?? state?.charger?.chargerId
            ?? null,
          portId: merged?.portId
            ?? state?.gun?.id
            ?? state?.portId
            ?? null,
          stationCode: state?.station?.code ?? null,
          chargerCode: state?.charger?.code ?? charger?.code ?? null,
          portCode: state?.gun?.name ?? state?.gun?.code ?? port?.code ?? null,
        });


        // NEW: init live persisted state for new session
        const kwFromState = Number(state?.charger?.powerKw);
        const kwFromSession = Number(merged?.chargerPowerKw);
        const powerKw = (Number.isFinite(kwFromSession) && kwFromSession > 0)
          ? kwFromSession
          : (Number.isFinite(kwFromState) && kwFromState > 0 ? kwFromState : 7);

        const startSoc = Number.isFinite(merged?.startSoc)
          ? Math.max(0, Math.min(100, Number(merged.startSoc)))
          : (Number.isFinite(state?.startSoc) ? state.startSoc : 0);

        const now = Date.now();
        const live = {
          isActive: true,
          isCharging: true,
          chargingSessionId: merged?.chargingSessionId,
          portId: merged?.portId ?? state?.gun?.id ?? state?.portId ?? null,
          startedAt: merged?.startedAt ? new Date(merged.startedAt).getTime() : now,
          lastUpdateAt: now,
          startSoc,
          batteryAtLastUpdate: startSoc,
          powerKw,
          batteryCapacity: Number.isFinite(state?.batteryCapacity) ? state.batteryCapacity : 75,
          fullAt: null,
          graceSeconds: Number.isFinite(dynGraceSeconds) ? dynGraceSeconds : 5 * 60,
        };
        saveLive(live);
        setNoActiveSession(false);
        setBooting(false);
      } catch (e) {
        if (!alive) return;
        message.error(`Không thể bắt đầu phiên sạc: ${e?.message || "Lỗi không xác định"}`);
        setNoActiveSession(true);
        setBooting(false);
      }
    }

    startSessionIfNeeded();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    API_ABS,
    state?.chargingSessionId,
    state?.customerId,
    state?.vehicleId,
    state?.bookingId,
    state?.gun?.id,
    state?.portId,
  ]);
  
  // Resume khi vào từ Menu (không có state): đọc live và hydrate session/charger
  useEffect(() => {
    if (state) return; // có state thì không cần resume
    setBooting(true);
    const live = loadLive();
    if (!live?.isActive || !live?.chargingSessionId) {
      // không có gì để resume => nếu cũng không có state, coi như no active
      setNoActiveSession(true);
      setBooting(false);
      return;
    }
    let ignore = false;
    (async () => {
      try {
        // 1) lấy session theo id
        const s = await fetchAuthJSON(`${API_ABS}/ChargingSessions/${encodeURIComponent(live.chargingSessionId)}`, { method: "GET" });
        const seed = s?.data || s || null;
        if (!seed || ignore) {
          setBooting(false);
          return;
        }
        // Nếu trên server phiên đã kết thúc → đánh dấu noActive + clear live
        if (isEndedStatus(seed.status) || seed.endedAt) {
          markLiveInactive();
          setSession(null);
          setChargerInfo(null);
          setNoActiveSession(true);
          setBooting(false);
          return;
        }

        // 2) lấy Port và Charger để có chargerId và info
        let port = null, charger = null;
        try {
          const pId = seed.portId ?? live.portId ?? null;
          if (pId != null) port = await fetchAuthJSON(`${API_ABS}/Ports/${encodeURIComponent(pId)}`, { method: "GET" });
        } catch { }

        try {
          const chId =
            port?.chargerId ?? port?.ChargerId ??
            seed?.chargerId ?? seed?.ChargerId ?? null;
          if (chId != null) {
            charger = await fetchAuthJSON(`${API_ABS}/Chargers/${encodeURIComponent(chId)}`, { method: "GET" });
          }
        } catch { }

        const merged = {
          ...seed,
          chargerId: (port?.chargerId ?? port?.ChargerId ?? null) ?? (seed?.chargerId ?? seed?.ChargerId ?? null),
          portStatus: seed?.portStatus ?? null,
          chargerType: seed?.chargerType ?? null,
          chargerPowerKw: seed?.chargerPowerKw ?? null,
        };
        if (ignore) return;

        setSession(merged);
        if (charger) setChargerInfo(charger);
        // thông báo nhẹ khi resume
        message.destroy();
        message.open({
          type: "success",
          duration: 3,
          content: "🔄 Khôi phục phiên sạc đang chạy.",
        });
        setNoActiveSession(false);
        setBooting(false);
      } catch {/* ignore */ }
    })();

    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, API_ABS]);




  // ==== Pricing theo trụ/cổng ====
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPricingLoading(true);
        setPricingError("");

        let chargerRaw = null;
        if (chargerId) {
          try {
            chargerRaw = await fetchJSON(`${API_ABS}/Chargers/${encodeURIComponent(chargerId)}`);
          } catch { }
        }

        const chNorm = normalizeCharger(chargerRaw || state?.charger || {});
        const currentTR = nowTimeRange(new Date());
        const chargerType = (chargerRaw?.type ?? chargerRaw?.Type ?? state?.charger?.type ?? state?.charger?.Type ?? "").toString();

        let rules = null;
        const tryEndpoints = [
          `${API_ABS}/PricingRules?chargerId=${encodeURIComponent(chNorm.id || chargerId || "")}`,
          `${API_ABS}/PricingRule?chargerId=${encodeURIComponent(chNorm.id || chargerId || "")}`,
          `${API_ABS}/PricingRules`,
        ];
        for (const url of tryEndpoints) {
          try {
            const r = await fetchJSON(url);
            const arr = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : null;
            if (arr && arr.length) {
              rules = arr;
              break;
            }
          } catch { }
        }

        let pricePerKwh = chNorm.pricePerKwh;
        let idleFeePerMin = chNorm.idleFeePerMin;
        let graceSeconds = chNorm.idleGraceSeconds;

        if (rules && rules.length) {
          const typed = rules.filter(r => {
            const rTR = (r.timeRange ?? r.TimeRange ?? "").toString();
            const rType = (r.chargerType ?? r.ChargerType ?? "").toString();
            return rTR === currentTR && (!chargerType || rType === chargerType);
          });
          const best = pickRule(typed.length ? typed : rules, { powerKw: chNorm.powerKw, timeRange: currentTR });
          if (best) {
            const rPrice = Number(best.pricePerKwh ?? best.pricePerKWh ?? best.PricePerKwh ?? best.PricePerKWh);
            const rPenalty = Number(best.idleFeePerMin ?? best.IdleFeePerMin);
            const rGraceSec =
              Number(best.idleGraceSeconds ?? best.IdleGraceSeconds) ||
              Number(best.idleGraceMinutes ?? best.IdleGraceMinutes) * 60;

            if (Number.isFinite(rPrice) && rPrice > 0) pricePerKwh = rPrice;
            if (Number.isFinite(rPenalty) && rPenalty > 0) idleFeePerMin = rPenalty;
            if (Number.isFinite(rGraceSec) && rGraceSec > 0) graceSeconds = rGraceSec;
          }
        }

        if (!Number.isFinite(pricePerKwh) || pricePerKwh <= 0) pricePerKwh = fallbackPricePerKWh;
        if (!Number.isFinite(idleFeePerMin) || idleFeePerMin <= 0) idleFeePerMin = 10000;
        if (!Number.isFinite(graceSeconds) || graceSeconds <= 0) graceSeconds = 5 * 60;

        if (!alive) return;
        setDynPricePerKWh(pricePerKwh);
        setDynPenaltyPerMin(idleFeePerMin);
        setDynGraceSeconds(graceSeconds);
      } catch (e) {
        if (!alive) return;
        setPricingError(e?.message || "Không tải được thông tin giá.");
        setDynPricePerKWh(fallbackPricePerKWh);
        setDynPenaltyPerMin(10000);
        setDynGraceSeconds(5 * 60);
      } finally {
        if (alive) setPricingLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_ABS, chargerId, portId]);

  // ==== Lấy Subscription active để tính đúng như BE ====
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Ưu tiên lấy từ token
        let customerId = state?.customerId ?? null;
        let companyId = state?.companyId ?? null;
        try {
          const tk = getToken && getToken();
          const decoded = tk ? decodeJwtPayload(tk) : null;
          customerId = customerId ?? decoded?.customerId ?? decoded?.nameid ?? decoded?.sub ?? null;
          if (typeof customerId === "string" && /^\d+$/.test(customerId)) customerId = Number(customerId);
          companyId = companyId ?? decoded?.companyId ?? null;
        } catch { }

        // Thử các endpoint khả dĩ của BE
        const candidates = [];
        if (customerId && companyId) {
          candidates.push(`${API_ABS}/Subscriptions/active?customerId=${customerId}&companyId=${companyId}`);
        }
        if (customerId) {
          candidates.push(`${API_ABS}/Subscriptions/active?customerId=${customerId}`);
          candidates.push(`${API_ABS}/Subscriptions/by-customer/${customerId}?status=active`);
        }
        if (companyId) {
          candidates.push(`${API_ABS}/Subscriptions/active?companyId=${companyId}`);
          candidates.push(`${API_ABS}/Subscriptions/by-company/${companyId}?status=active`);
        }

        let found = null;
        for (const url of candidates) {
          try {
            const r = await fetchAuthJSON(url, { method: "GET" });
            const data = r?.data || r;
            if (!data) continue;

            // Chuẩn hoá
            const plan =
              data?.subscriptionPlan ??
              data?.plan ??
              data?.SubscriptionPlan ??
              data?.Plan ??
              null;

            const discountPercent =
              data?.discountPercent ??
              plan?.discountPercent ??
              plan?.DiscountPercent ??
              0;

            const freeIdleMinutes =
              data?.freeIdleMinutes ??
              plan?.freeIdleMinutes ??
              plan?.FreeIdleMinutes ??
              0;

            found = {
              discountPercent: Number(discountPercent) || 0,
              freeIdleMinutes: Number(freeIdleMinutes) || 0,
            };
            break;
          } catch { }
        }

        if (!alive) return;
        if (found) setActiveSub(found);
        else setActiveSub({ discountPercent: 0, freeIdleMinutes: 0 });
      } catch {
        if (!alive) return;
        setActiveSub({ discountPercent: 0, freeIdleMinutes: 0 });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_ABS, state?.customerId, state?.companyId]);

  // ==== Ước tính theo BE ====
  const needKWhToFull = useMemo(() => ((100 - initialBattery) / 100) * batteryCapacity, [initialBattery, batteryCapacity]);
  const estimatedCostToFull = useMemo(
    () => vnd(Math.round(needKWhToFull * (Number.isFinite(dynPricePerKWh) ? dynPricePerKWh : fallbackPricePerKWh))),
    [needKWhToFull, dynPricePerKWh, fallbackPricePerKWh]
  );

  const estimatedTimeMinutes = useMemo(
    () => Math.round((TOTAL_TIME_MINUTES * (100 - initialBattery)) / 100),
    [TOTAL_TIME_MINUTES, initialBattery]
  );

  const fmtHM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m.toString().padStart(2, "0")}p`;
  };

  const GRACE_SECONDS = Number.isFinite(dynGraceSeconds) ? dynGraceSeconds : 5 * 60;
  const PENALTY_PER_MIN = Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000;

  // thời gian miễn phí còn lại sau khi đầy
  const chargeableSecs = Math.max(0, overTimeSecs - GRACE_SECONDS);
  const chargeableMinutesRaw = Math.floor(chargeableSecs / 60);

  // Live calc theo BE (áp freeIdleMinutes & discountPercent nếu đã lấy được)
  const roundedBattery = Math.floor(battery);
  const roundedStartSoc = Math.floor(startSocRef.current);
  const chargedPercentSoFar = Math.max(0, roundedBattery - roundedStartSoc);
  const energyKwhSoFar = Number(((chargedPercentSoFar / 100) * batteryCapacity).toFixed(2));

  const pricePerKWhLive = Number.isFinite(dynPricePerKWh) ? dynPricePerKWh : fallbackPricePerKWh;

  // Idle live (chỉ tính khi đã đầy pin)
  const idleMinutesSoFar = roundedBattery < 100 ? 0 : chargeableMinutesRaw;
  const chargeableIdleAfterSub = Math.max(idleMinutesSoFar - (activeSub.freeIdleMinutes || 0), 0);
  const idleCostLive = chargeableIdleAfterSub * PENALTY_PER_MIN;

  const subtotalBeforeDiscountLive = Math.round(energyKwhSoFar * pricePerKWhLive + idleCostLive);
  const subtotalLive =
    Math.round(subtotalBeforeDiscountLive * (1 - (activeSub.discountPercent || 0) / 100));
  const taxLive = Math.round(subtotalLive * 0.1);
  const totalLive = subtotalLive + taxLive;

  // đồng hồ thời gian sạc còn lại
  const [displayTimeLeft, setDisplayTimeLeft] = useState("");
  useEffect(() => {
    const minutesLeft = Math.round((TOTAL_TIME_MINUTES * (100 - battery)) / 100);
    const h = Math.floor(minutesLeft / 60);
    const m = minutesLeft % 60;
    setDisplayTimeLeft(`${h}h${m.toString().padStart(2, "0")}p`);
  }, [battery, TOTAL_TIME_MINUTES]);

  // --- Hydrate UI từ live khi mount ---
  useEffect(() => {
    if (state) return;
    const live = loadLive();
    // Nếu chưa có live/không active:
    // - Nếu có state (đang vào từ màn xác nhận để bắt đầu phiên) => KHÔNG gán noActive, để chế độ booting
    // - Nếu không có state => thật sự không có phiên -> noActive
    if (!live || !live.isActive) {
      if (!state) setNoActiveSession(true);
      setBooting(false);
      return;
    }

    const nextBatt = computeBatteryNow(live);
    if (Number.isFinite(nextBatt)) {
      setBattery(nextBatt);
      startSocRef.current = live.startSoc ?? startSocRef.current;
    }

    if (live.fullAt) {
      const secs = Math.max(0, Math.floor((Date.now() - live.fullAt) / 1000));
      setOverTimeSecs(secs);
      fullAtRef.current = live.fullAt;
    }

    setIsCharging(Boolean(live.isCharging));
    setBooting(false);
  }, []);

  // --- Tick UI: đọc/ghi live, không phụ thuộc tick để tăng pin ---
  useEffect(() => {
    if (!isCharging) return;

    const tick = () => {
      // Nếu chưa có live mà UI đang sạc, tạo seed
      let live = loadLive();
      if (!live) {
        const now = Date.now();
        const kwFromState = Number(state?.charger?.powerKw);
        const kwFromSession = Number(session?.chargerPowerKw);
        const powerKw = (Number.isFinite(kwFromSession) && kwFromSession > 0)
          ? kwFromSession
          : (Number.isFinite(kwFromState) && kwFromState > 0 ? kwFromState : 7);

        live = {
          isActive: true,
          isCharging: true,
          chargingSessionId: session?.chargingSessionId ?? state?.chargingSessionId ?? null,
          portId: session?.portId ?? state?.gun?.id ?? state?.portId ?? null,
          startedAt: startedAtRef.current || now,
          lastUpdateAt: now,
          startSoc: startSocRef.current || 0,
          batteryAtLastUpdate: startSocRef.current || 0,
          powerKw,
          batteryCapacity: Number.isFinite(state?.batteryCapacity) ? state.batteryCapacity : 75,
          fullAt: null,
          graceSeconds: Number.isFinite(dynGraceSeconds) ? dynGraceSeconds : 5 * 60,
        };
        saveLive(live);
        setNoActiveSession(false);
        setBooting(false);
      }

      const nextBatt = computeBatteryNow(live);
      if (!Number.isFinite(nextBatt)) return;

      let fullAt = live.fullAt;
      if (nextBatt >= 100 && !fullAt) {
        fullAt = Date.now();
      }

      setBattery(nextBatt);
      if (fullAt) {
        const secs = Math.max(0, Math.floor((Date.now() - fullAt) / 1000));
        setOverTimeSecs(secs);
        fullAtRef.current = fullAt;
      }

      // cập nhật mốc live
      saveLive({
        ...live,
        isCharging: true,
        batteryAtLastUpdate: nextBatt,
        lastUpdateAt: Date.now(),
        fullAt: fullAt ?? live.fullAt ?? null,
      });
    };

    // cập nhật lần đầu
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [isCharging, session?.chargerPowerKw, state?.charger?.powerKw, state?.batteryCapacity, dynGraceSeconds]);

  // --- Không dùng nữa: interval phạt theo tick (đã thay bằng tính theo fullAt)
  // useEffect(() => { ... })  ← đã xoá

  function getChargingSessionIdSafe() {
    let sid = session?.chargingSessionId ?? state?.chargingSessionId ?? state?.sessionId ?? null; // ✅ thêm fallback
    if (!sid) {
      try {
        const cached = JSON.parse(sessionStorage.getItem("charging:start:data") || "null");
        sid = cached?.data?.chargingSessionId ?? cached?.chargingSessionId ?? null;
      } catch { }
    }
    if (!sid) {
      const live = loadLive();
      if (live?.chargingSessionId) sid = live.chargingSessionId;
    }
    return sid;
  }

  function isEndedStatus(s) {
    if (!s) return false;
    const t = String(s).toLowerCase();
    return /(end|ended|finish|finished|stop|stopped|complete|completed|cancel)/.test(t);
  }

  function markLiveInactive(extra = {}) {
    const live = loadLive();
    if (!live) return;
    saveLive({
      ...live,
      isActive: false,
      isCharging: false,
      lastUpdateAt: Date.now(),
      ...extra,
    });
  }


  // ==== END SESSION (chuẩn BE) ====
  async function endSessionOnServer({ endSoc, chargingSessionId }) {
    if (!chargingSessionId || !Number.isFinite(Number(chargingSessionId))) return null;
    try {
      const url = `${API_ABS}/ChargingSessions/end`;

      // Nếu reload mà chưa set fullAtRef, lấy từ live
      if (!fullAtRef.current) {
        const live = loadLive();
        if (live?.fullAt) fullAtRef.current = live.fullAt;
      }

      // ✅ Tính overtime theo thời gian thực để không lệ thuộc interval
      const secondsSinceFull = Math.floor(
        (fullAtRef.current ? (Date.now() - fullAtRef.current) : 0) / 1000
      );

      // ✅ Lấy giá trị lớn hơn giữa đồng hồ UI & thời gian thực
      const overtimeSecs = Math.max(
        (Math.floor(battery) >= 100 ? overTimeSecs : 0),
        secondsSinceFull
      );

      // ✅ Sau grace mới tính phí
      const chargeableSecs = Math.max(0, overtimeSecs - GRACE_SECONDS);

      // ✅ Làm tròn xuống số phút
      const idleMinToSend = Math.floor(chargeableSecs / 60);

      const body = {
        chargingSessionId: Number(chargingSessionId),
        endSoc: Math.round(Number(endSoc) || 0),
        idleMin: idleMinToSend,
      };
      console.debug("[Charging] END payload:", { ...body, overtimeSecs, GRACE_SECONDS });

      const res = await fetchAuthJSON(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res?.data || res || null;
    } catch (e) {
      console.error("[Charging] endSessionOnServer error:", e);
      return null;
    }
  }

  // ==== Điều hướng về Invoice (đã sửa chắc chắn khớp Invoice.jsx) ====
  const goToInvoicePage = async () => {
    const sid = getChargingSessionIdSafe();
    if (!sid) {
      message.error("Chưa có mã phiên sạc (chargingSessionId). Hãy chờ vài giây rồi thử lại.");
      return;
    }

    // chốt live trước khi gọi BE
    const liveBefore = loadLive();
    if (liveBefore) {
      const curr = computeBatteryNow(liveBefore);
      saveLive({
        ...liveBefore,
        batteryAtLastUpdate: Number.isFinite(curr) ? curr : (liveBefore.batteryAtLastUpdate || 0),
        lastUpdateAt: Date.now(),
      });
    }

    const beData = await endSessionOnServer({
      endSoc: Math.round(battery),
      chargingSessionId: sid,
    });

    if (!beData) {
      message.error("Không kết thúc được phiên sạc. Thử lại nhé.");
      return;
    }

    // Đánh dấu local live đã kết thúc để quay lại trang này sẽ không resume
    markLiveInactive({ batteryAtLastUpdate: Math.round(battery) });
    setNoActiveSession(true);
    setBooting(false);

    const orderId = `CHG${beData.chargingSessionId || Date.now()}`;// Ghi context theo orderId để Invoice.jsx đọc được charge:ctx:{orderId}
    saveCtx({
      orderId,
      stationId: beData?.stationId
        ?? session?.stationId
        ?? state?.station?.id
        ?? null,
      chargerId: beData?.chargerId
        ?? session?.chargerId
        ?? chargerInfo?.chargerId
        ?? chargerInfo?.id
        ?? null,
      portId: beData?.portId
        ?? session?.portId
        ?? state?.gun?.id
        ?? state?.portId
        ?? null,
      endedAt: beData?.endedAt ?? new Date().toISOString(),
    });

    // Lưu theo 2 key mà Invoice.jsx có thể đọc
    sessionStorage.setItem(`chargepay:${orderId}`, JSON.stringify({ orderId, ...beData }));
    sessionStorage.setItem("charge:end:last", JSON.stringify({ orderId, data: beData }));

    // Có thể clear live tại Invoice sau khi thanh toán xong
    navigate(`/invoice?order=${orderId}`, {
      state: { orderId, data: beData },
      replace: true,
    });
  };

  const handleStopCharging = async () => {
    setIsCharging(false);
    clearInterval(chargeInterval.current);
    clearInterval(penaltyInterval.current);

    // NEW: mark paused in live
    const live = loadLive();
    if (live) {
      const curr = computeBatteryNow(live);
      saveLive({
        ...live,
        isCharging: false,
        isActive: true,
        batteryAtLastUpdate: Number.isFinite(curr) ? curr : (live.batteryAtLastUpdate || 0),
        lastUpdateAt: Date.now(),
      });
    }

    await goToInvoicePage();
  };

  const handleFinishCharging = async () => {
    clearInterval(chargeInterval.current);
    clearInterval(penaltyInterval.current);

    // NEW: mark ended in live
    const live = loadLive();
    if (live) {
      const curr = computeBatteryNow(live);
      saveLive({
        ...live,
        isCharging: false,
        isActive: false,
        batteryAtLastUpdate: Number.isFinite(curr) ? curr : (live.batteryAtLastUpdate || 0),
        lastUpdateAt: Date.now(),
      });
    }

    await goToInvoicePage();
  };

  const canEnd = Boolean(
    session?.chargingSessionId ||
    state?.chargingSessionId ||
    state?.sessionId ||
    (() => {
      try {
        const cached = JSON.parse(sessionStorage.getItem("charging:start:data") || "null");
        if (cached?.data?.chargingSessionId ?? cached?.chargingSessionId) return true;
        const live = loadLive();
        return !!live?.chargingSessionId;
      } catch {
        return null;
      }
    })()
  );

  // Trước khi rời trang, chốt lại mốc live
  useEffect(() => {
    const onBeforeUnload = () => {
      const live = loadLive();
      if (live) {
        const curr = computeBatteryNow(live);
        saveLive({
          ...live,
          batteryAtLastUpdate: Number.isFinite(curr) ? curr : (live.batteryAtLastUpdate || 0),
          lastUpdateAt: Date.now(),
        });
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ================== Render ==================
  const graceLeftSecs = Math.max(0, (Number.isFinite(dynGraceSeconds) ? dynGraceSeconds : 5 * 60) - overTimeSecs);
  const graceLeftMMSS = useMemo(() => {
    const m = Math.floor(graceLeftSecs / 60);
    const s = Math.floor(graceLeftSecs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [graceLeftSecs]);

  const penaltyElapsedSecs = Math.max(0, overTimeSecs - (Number.isFinite(dynGraceSeconds) ? dynGraceSeconds : 5 * 60));
  const penaltyElapsedMMSS = useMemo(() => {
    const s = Math.floor(penaltyElapsedSecs);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  }, [penaltyElapsedSecs]);

  if (booting) {
    return (
      <MainLayout>
        <div style={{ padding: 24 }}>
          <h3>Đang khởi tạo phiên sạc…</h3>
          <p>Vui lòng đợi trong giây lát.</p>
        </div>
      </MainLayout>
    );
  }

  if (noActiveSession) {
    return (
      <MainLayout>
        <div className="cp-empty">
          <div className="cp-empty-card">
            <h2 className="cp-empty-title">Chưa có phiên sạc đang diễn ra</h2>
            <p className="cp-empty-desc">Bạn có thể bắt đầu phiên sạc mới từ danh sách trạm.</p>
            <div className="cp-empty-actions">
              <Link to="/stations" className="cp-link-btn">🔌 Về danh sách trạm</Link>
              <Link to="/invoiceSummary" className="cp-link-secondary">🧾 Xem hoá đơn</Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="cp-root">
        <div className="charging-wrapper">
          <div className="charging-card">
            <h2 className="charging-title">Chế độ sạc</h2>
            <div className="accent-bar" />

            <p className="charging-station">
              {stationName} — {chargerTitle} ({powerLabel})
            </p>

            {pricingLoading ? (
              <div className="bp-hint" style={{ marginBottom: 8 }}>
                Đang tải biểu giá…
              </div>
            ) : pricingError ? (
              <div className="error-text" style={{ marginBottom: 8 }}>
                Không tải được biểu giá: {pricingError}. Đang dùng giá mặc định.
              </div>
            ) : null}

            <div className="charging-status">
              <div className="status-box battery-box">
                <div className="battery-ring" style={{ ["--pct"]: Math.round(battery) }} aria-label={`Mức pin hiện tại ${Math.round(battery)}%`}>
                  <ThunderboltOutlined className="battery-icon" />
                </div>
                <div className="battery-info">
                  <p>Phần trăm pin</p>
                  <h3>{Math.round(battery)}%</h3>
                </div>
              </div>

              <div className="status-box">
                <p>Thời gian sạc dự kiến</p>
                <h3>{displayTimeLeft}</h3>
                <div className="chip" style={{ marginTop: 6 }}>
                  {(Number.isFinite(dynPricePerKWh) ? dynPricePerKWh : fallbackPricePerKWh).toLocaleString("vi-VN")} VND/kWh
                </div>
              </div>
            </div>

            <div className="charging-info-wrapper">
              <div className="info-box left-box">
                {state?.carModel && (
                  <div>
                    <p>Hãng xe</p>
                    <h4>{state.carModel}</h4>
                  </div>
                )}
                {state?.plate && (
                  <div>
                    <p>Biển số</p>
                    <h4>{state.plate}</h4>
                  </div>
                )}
                <div>
                  <p>Công suất</p>
                  <h4>{powerLabel}</h4>
                </div>
              </div>

              <div className="info-box right-box">
                <div>
                  <p>Giá điện</p>
                  <h4>
                    {(Number.isFinite(dynPricePerKWh) ? dynPricePerKWh : fallbackPricePerKWh).toLocaleString("vi-VN")} VND/kWh
                  </h4>
                </div>

                {/* ==== Tạm tính khớp BE: (energy*price + max(idle-free,0)*penalty) → discount% → +VAT 10% ==== */}
                <div>
                  <p>Tạm tính đến hiện tại</p>
                  <h4>{vnd(totalLive)}</h4>
                  <div className="sub">
                    {energyKwhSoFar.toFixed(2)} kWh × {pricePerKWhLive.toLocaleString("vi-VN")} +{" "}
                    {chargeableIdleAfterSub}’ × {(Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000).toLocaleString("vi-VN")}
                    {activeSub.discountPercent ? ` → giảm ${activeSub.discountPercent}%` : ""} → VAT 10%
                  </div>
                </div>

                {/* Hiển thị phí phạt realtime (sau khi đầy) */}
                <div>
                  <p>Phí chiếm trụ (tạm tính)</p>
                  {Math.floor(battery) < 100 ? (
                    <h4>0 VND</h4>
                  ) : graceLeftSecs > 0 ? (
                    <div>
                      <h4>0 VND</h4>
                      <div className="sub">Miễn phí còn lại: {graceLeftMMSS}</div>
                    </div>
                  ) : (
                    <div className="penalty-stripe">
                      <h4>{vnd(chargeableIdleAfterSub * PENALTY_PER_MIN)}</h4>
                      <div className="sub">
                        Đã chiếm trụ: <b>{penaltyElapsedMMSS}</b>
                      </div>
                      <div className="sub">
                        Đang tính: ( {idleMinutesSoFar}’ − {activeSub.freeIdleMinutes || 0}’ ) ×{" "}
                        {(Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="charging-buttons">
              {Math.floor(battery) < 100 && isCharging ? (
                <>
                  <button className="btn-stop" onClick={handleStopCharging} disabled={!canEnd}>
                    Dừng sạc
                  </button>
                  <button className="btn-error">
                    <WarningOutlined /> Báo cáo sự cố
                  </button>
                </>
              ) : battery < 100 && !isCharging ? (
                <h3 style={{ color: "#f44336", fontSize: 16, gridColumn: "1 / -1" }}>🔴 Phiên sạc đã tạm dừng</h3>
              ) : (
                <div>
                  <h2 style={{ fontSize: 16 }}>Phiên sạc đã hoàn tất</h2>
                  {graceLeftSecs > 0 ? (
                    <p style={{ fontSize: 12 }}>
                      Vui lòng rút sạc trong vòng <b>{graceLeftMMSS}</b> để tránh phí phạt.
                    </p>
                  ) : (
                    <p style={{ fontSize: 12 }}>
                      Đang tính phí: {Math.max(0, idleMinutesSoFar - (activeSub.freeIdleMinutes || 0))} phút ×{" "}
                      {(Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000).toLocaleString("vi-VN")} VND/phút
                    </p>
                  )}
                  <button className="btn-finish" onClick={handleFinishCharging} disabled={!canEnd}>
                    Rút sạc
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ChargingProgress;