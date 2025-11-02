// src/pages/payment/PaymentSuccess.jsx
import React, { useMemo, useEffect, useState } from "react";
import { useLocation, useNavigate, Link, useSearchParams } from "react-router-dom";
import { CheckCircleFilled, ArrowLeftOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import "./style/PaymentSuccess.css";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import { getCustomerIdStrict, getAccountIdStrict } from "../../api/authHelpers";
import { useAuth } from "../../context/AuthContext"; // ✅ THÊM import này

const API_BASE = getApiBase();
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const HOLD_MINUTES_DEFAULT = 15;
const TIME_WARP = 120;

// ===== Helpers decode token & pick user record (same style as PaymentPage) =====
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
function getClaimsFromToken() {
  const t = localStorage.getItem("token") || "";
  const p = decodeJwtPayload(t) || {};
  const NAME_ID = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
  const EMAIL_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
  const NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";

  const accountId =
    p[NAME_ID] != null
      ? Number(p[NAME_ID])
      : p.sub != null
        ? Number(p.sub)
        : p.userid != null
          ? Number(p.userid)
          : null;

  const username =
    p.unique_name ?? p.preferred_username ?? p.username ?? p.userName ?? p[NAME_CLAIM] ?? null;

  const email = p.email ?? p[EMAIL_CLAIM] ?? null;
  const customerId = p.customerId ?? p.CustomerId ?? null;

  return { accountId, username, email, customerId };
}
function pickCurrentUserRecord(data, claims) {
  if (!data) return null;
  if (!Array.isArray(data)) return data;

  const { accountId, username, email } = claims;

  let found =
    data.find(
      (x) =>
        Number(x.accountId ?? x.id ?? x.AccountId ?? x.Id) === Number(accountId)
    ) || null;

  if (!found && username) {
    found =
      data.find((x) => {
        const u = String(x.userName ?? x.username ?? "").toLowerCase();
        return u && u === String(username).toLowerCase();
      }) || null;
  }

  if (!found && email) {
    found =
      data.find((x) => {
        const e =
          String(x.email ?? x.userName ?? x.username ?? "").toLowerCase();
        return e === String(email).toLowerCase();
      }) || null;
  }

  return found || null;
}
function extractItems(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  return [];
}

// ===== Booking helpers =====
const toMs = (s) => (s ? Date.parse(s) : NaN);

function normalizeBooking(b = {}) {
  const price = Number(b.price ?? b.Price ?? 0);

  let totalMinutes = 0;
  const tStart = toMs(b.startTime);
  const tEnd = toMs(b.endTime);
  if (Number.isFinite(tStart) && Number.isFinite(tEnd) && tEnd > tStart) {
    totalMinutes = Math.round((tEnd - tStart) / 60000);
  }

  return {
    bookingId: b.bookingId ?? b.id ?? b.Id,
    orderId: b.orderId ?? b.OrderId ?? null,
    paidAt: Number.isFinite(toMs(b.updatedAt))
      ? toMs(b.updatedAt)
      : Number.isFinite(toMs(b.createdAt))
        ? toMs(b.createdAt)
        : Date.now(),
    bookingFee: price > 0 ? price : 0,
    // sẽ được enrich sau
    station: {},
    charger: {},
    gun: { id: b.portId != null ? String(b.portId) : undefined, name: b.portId != null ? `P-${b.portId}` : undefined },
    totalMinutes: totalMinutes || HOLD_MINUTES_DEFAULT,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    customerId: b.customerId ?? b.CustomerId ?? null,
  };
}

function pickLatest(items = []) {
  if (!items.length) return null;
  const list = [...items];

  const confirmed = list
    .filter((x) => String(x.status ?? "").toLowerCase() === "confirmed")
    .sort((a, b) => {
      const ta = Date.parse(a.createdAt || a.startTime || 0);
      const tb = Date.parse(b.createdAt || b.startTime || 0);
      return (tb || 0) - (ta || 0);
    });
  if (confirmed.length) return confirmed[0];

  list.sort((a, b) => {
    const ta = Date.parse(a.createdAt || 0);
    const tb = Date.parse(b.createdAt || 0);
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
    return (Number(b.bookingId || 0) - Number(a.bookingId || 0));
  });
  return list[0];
}

async function getCurrentCustomerIdLikePaymentPage() {
  const claims = getClaimsFromToken();

  let authRes = null;
  try { authRes = await fetchAuthJSON(`/Auth`, { method: "GET" }); }
  catch { try { authRes = await fetchAuthJSON(`${API_BASE}/Auth`, { method: "GET" }); } catch { } }

  let record = pickCurrentUserRecord(authRes, claims);

  if (!record && claims?.accountId != null) {
    try { record = await fetchAuthJSON(`${API_BASE}/Account/${claims.accountId}`, { method: "GET" }); }
    catch { /* ignore */ }
  }

  if (!record) record = { customers: [], customerId: claims?.customerId ?? null };

  const cid =
    record?.customers?.[0]?.customerId ??
    record?.customerId ??
    record?.Customers?.[0]?.CustomerId ??
    claims?.customerId ?? null;

  return cid ? Number(cid) : null;
}

// ===== Fetch helpers cho chuỗi enrich (port -> charger -> station) =====
async function fetchOne(url) {
  try {
    return await fetchAuthJSON(url, { method: "GET" });
  } catch {
    // nếu fail, thử kèm API_BASE
    if (!/^https?:\/\//i.test(url)) {
      return await fetchAuthJSON(
        `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`,
        { method: "GET" }
      );
    }
    throw new Error("Fetch failed");
  }
}

// Chuỗi enrich: portId -> charger -> station
// Resolve charger & station from a portId (port -> charger -> station)
async function enrichByPortId(portId) {
  if (portId == null) {
    return { charger: null, station: null };
  }

  // 1) Get PORT -> find chargerId
  let port = null;
  try {
    port = await fetchOne(`/Ports/${encodeURIComponent(portId)}`);
  } catch {
    try {
      port = await fetchOne(`/ChargingPorts/${encodeURIComponent(portId)}`);
    } catch { }
  }

  const chargerId =
    port?.chargerId ?? port?.ChargerId ?? port?.chargerID ?? port?.ChargerID ?? null;

  // 2) Get CHARGER (contains stationId)
  let charger = null;
  if (chargerId != null) {
    try {
      charger = await fetchOne(`/api/Chargers/${encodeURIComponent(chargerId)}`);
    } catch {
      // fallback: list -> find by id
      try {
        const list = await fetchOne(`/api/Chargers`);
        const items = Array.isArray(list) ? list : (Array.isArray(list?.items) ? list.items : []);
        charger = items.find(
          (c) => Number(c?.chargerId ?? c?.id ?? c?.Id) === Number(chargerId)
        ) || null;
      } catch { }
    }
  }

  // 3) Get STATION by stationId from charger
  let station = null;
  const stationId =
    charger?.stationId ?? charger?.StationId ?? charger?.stationID ?? charger?.StationID ?? null;

  if (stationId != null) {
    try {
      station = await fetchOne(`/api/Stations/${encodeURIComponent(stationId)}`);
    } catch {
      try {
        const list = await fetchOne(`/api/Stations`);
        const items = Array.isArray(list) ? list : (Array.isArray(list?.items) ? list.items : []);
        station = items.find(
          (s) => Number(s?.stationId ?? s?.id ?? s?.Id) === Number(stationId)
        ) || null;
      } catch { }
    }
  }

  return { charger, station };
}

// === API: bắt đầu phiên sạc theo Booking ===
// Ghép URL an toàn cho cả base absolute ("https://.../api") lẫn relative ("/api")
function joinUrl(base, path) {
  const b = String(base || "");
  const p = String(path || "");
  if (/^https?:\/\//i.test(b)) {
    // absolute
    return (b.endsWith("/") ? b.slice(0, -1) : b) + (p.startsWith("/") ? p : `/${p}`);
  }
  // relative -> tránh "new URL" (cần absolute), nối chuỗi thường
  const left = b ? (b.startsWith("/") ? b : `/${b}`) : "";
  const right = p.startsWith("/") ? p : `/${p}`;
  // loại bỏ double slashes (trừ "http://")
  return (left + right).replace(/([^:]\/)\/+/g, "$1");
}


async function startChargingSession({ vehicleId, bookingId, portId, customerId }) {
  const bid = Number(bookingId);
  const pid = Number(portId);
  const vidN = Number(vehicleId);
  const cid = Number(customerId);

  // Body PHẲNG đúng như BE mẫu của bạn
  const body = {
    bookingId: bid,
    portId: pid,
    ...(Number.isFinite(vidN) ? { vehicleId: vidN } : {}),
    ...(Number.isFinite(cid) ? { customerId: cid } : {}),
  };

  const url = joinUrl(API_BASE, "/ChargingSessions/start");

  return await fetchAuthJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function resolveMyVehicleId() {
  // lấy customerId từ storage/token
  const myCid =
    Number(localStorage.getItem("customerId")) ||
    Number(sessionStorage.getItem("customerId")) ||
    Number((decodeJwtPayload(localStorage.getItem("token") || "") || {}).customerId) || null;

  // gọi Vehicles (ép pageSize lớn, rồi lọc client-side theo customerId)
  const paths = [
    `/Vehicles?page=1&pageSize=200`,
    `/Vehicles`
  ];

  let items = [];
  for (const p of paths) {
    try {
      const res = await fetchAuthJSON(`${API_BASE}${p}`, { method: "GET" });
      const list = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
      if (list.length) { items = list; break; }
    } catch { }
  }

  if (!items.length) return null;

  let mine = myCid ? items.filter(v =>
    String(v.customerId ?? v.CustomerId ?? v.userId ?? v.UserId) === String(myCid)
  ) : items;

  if (!mine.length) mine = items;

  const first = mine[0];
  return first?.vehicleId ?? first?.id ?? null;
}

export default function PaymentSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  
  // ✅ THÊM: Lấy thông tin user để kiểm tra role
  const { user, loading: authLoading } = useAuth();

  const SPEED = Math.max(1, Number(search.get("speed") || 1));
  const [t0] = useState(() => Date.now());

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [idInput, setIdInput] = useState("");
  const [idError, setIdError] = useState("");

  const okFlag = (search.get("success") || "true").toLowerCase() === "true";
  const bookingIdFromQS = search.get("bookingId");

  // ✅ THÊM: Redirect Staff sang trang riêng
  useEffect(() => {
    // Đợi AuthContext load xong
    if (authLoading) return;
    
    // Nếu user là Staff, redirect sang /staff/payment-success với toàn bộ query params
    if (user?.role === "Staff") {
      console.log("🔄 Staff detected, redirecting to staff payment success page");
      console.log("🔍 Query params:", search.toString());
      navigate(`/staff/payment-success?${search.toString()}`, { 
        replace: true 
      });
    }
  }, [user, authLoading, navigate, search]);

  // === Fetch booking từ BE ===
  useEffect(() => {
    (async () => {
      if (!okFlag) {
        setLoading(false);
        setFetchError("Thanh toán không thành công hoặc đã bị huỷ.");
        return;
      }
      try {
        setLoading(true);
        setFetchError("");

        // 1) Nếu URL có bookingId => lấy đúng đơn đó
        if (bookingIdFromQS) {
          const one = await fetchAuthJSON(
            `${API_BASE}/Booking/${encodeURIComponent(bookingIdFromQS)}`,
            { method: "GET" }
          );
          // BE đôi khi trả object hoặc {items:[...]}
          const item = Array.isArray(one) ? one[0] : (one?.items?.[0] ?? one);
          if (!item) throw new Error("Không tìm thấy đơn đặt chỗ theo bookingId cung cấp.");
          setData(normalizeBooking(item));
          return;
        }

        // 2) Không có bookingId => rơi về logic cũ: lấy theo customer, chọn đơn phù hợp
        // Ưu tiên customerId của chính booking để đảm bảo trùng
        const customerId = data?.customerId ?? (await getCustomerIdStrict());
        if (!customerId) throw new Error("Không xác định được khách hàng.");

        const res = await fetchAuthJSON(
          `${API_BASE}/Booking?customerId=${encodeURIComponent(customerId)}&page=1&pageSize=20`,
          { method: "GET" }
        );
        const items = extractItems(res);
        if (!items.length) throw new Error("Không tìm thấy đơn đặt chỗ nào của bạn.");

        const latest = pickLatest(items);
        if (!latest) throw new Error("Không chọn được đơn đặt chỗ phù hợp.");

        setData(normalizeBooking(latest));
      } catch (e) {
        setFetchError(e?.message || "Không lấy được thông tin đơn từ máy chủ.");
      } finally {
        setLoading(false);
      }
    })();
  }, [okFlag, bookingIdFromQS]);

  // ===== Countdown logic =====
  const parseLocal = (s) => (s ? new Date(s).getTime() : NaN);
  const [timeLeft, setTimeLeft] = useState(0);
  const [phase, setPhase] = useState("idle"); // toStart | running | ended

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!data) return;

    const startTs = parseLocal(data.startTime);
    const endTs = parseLocal(data.endTime);

    if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs <= startTs) {
      setPhase("idle");
      setTimeLeft(0);
      return;
    }

    const tick = () => {
      const now = t0 + (Date.now() - t0) * TIME_WARP; // thời gian ảo
      if (now < startTs) {
        setPhase("toStart");
        setTimeLeft(Math.max(0, Math.floor((startTs - now) / 1000)));
      } else if (now >= startTs && now < endTs) {
        setPhase("running");
        setTimeLeft(Math.max(0, Math.floor((endTs - now) / 1000)));
      } else {
        setPhase("ended");
        setTimeLeft(0);
      }
    };

    tick();
    const timer = setInterval(tick, 250); // 250ms là đủ mượt
    return () => clearInterval(timer);
  }, [data, t0]);

  // ===== Enrich station/charger sau khi có booking (dựa trên portId) =====
  useEffect(() => {
    let aborted = false;
    (async () => {
      const portId = data?.gun?.id;
      if (!portId) return;
      try {
        const { charger, station } = await enrichByPortId(portId);
        if (aborted) return;
        setData((prev) => ({
          ...prev,
          charger: charger || prev?.charger || {},
          station: station || prev?.station || {},
        }));
      } catch {
        // im lặng, không block UI
      }
    })();
    return () => { aborted = true; };
  }, [data?.gun?.id]);

  // ===== Gợi ý đơn giản =====
  const hintSamples = useMemo(() => {
    if (!data) return [];
    const arr = [];
    const gunId = data.gun?.id ? String(data.gun.id) : null;
    const gunNm = data.gun?.name ? String(data.gun.name) : null;
    const chgId = data.charger?.chargerId ?? data.charger?.id ?? data.charger?.Id;
    if (gunId) arr.push(gunId);
    if (gunNm && gunNm !== gunId) arr.push(gunNm);
    if (chgId && gunId) arr.push(`${chgId}-${gunId}`);
    if (chgId && gunNm) arr.push(`${chgId}-${gunNm}`);
    return Array.from(new Set(arr)).slice(0, 3);
  }, [data]);

  const navigateToCharging = (extra = {}) => {
    const startTs = data?.startTime ? new Date(data.startTime).getTime() : NaN;
    const endTs = data?.endTime ? new Date(data.endTime).getTime() : NaN;
    const totalMinutes =
      Number.isFinite(startTs) && Number.isFinite(endTs) && endTs > startTs
        ? Math.round((endTs - startTs) / 60000)
        : HOLD_MINUTES_DEFAULT;

    navigate("/charging", {
      state: { ...data, ...extra, fromPayment: true, totalMinutes },
      replace: true,
    });
  };

  const handleStart = async () => {
    if (phase === "toStart") {
      setIdError("Chưa đến giờ bắt đầu. Vui lòng đợi.");
      return;
    }
    if (phase === "ended") {
      setIdError("Đã quá thời gian đặt. Vui lòng đặt lại.");
      return;
    }
    if (timeLeft <= 0) {
      setIdError("Hết thời gian giữ chỗ. Vui lòng đặt lại.");
      return;
    }
    if (!idInput.trim()) {
      setIdError("Vui lòng nhập ID trụ hoặc súng.");
      return;
    }
    setIdError("");

    try {
      // Xác định portId: ưu tiên người dùng nhập, fallback từ booking
      const portId =
        Number(idInput) || Number(data?.gun?.id) || Number(data?.gun?.portId);
      if (!Number.isFinite(portId)) {
        setIdError("Port/Gun ID không hợp lệ.");
        return;
      }

      // Lấy vehicleId giống trang Booking
      const vehicleId = state?.vehicleId ?? (await resolveMyVehicleId());
      // Nếu BE cho phép không gửi vehicleId thì có thể bỏ check này
      if (vehicleId == null) {
        setIdError("Không tìm thấy phương tiện của bạn.");
        return;
      }
      const customerId =
        Number(localStorage.getItem("customerId")) ||
        Number(sessionStorage.getItem("customerId")) ||
        Number((decodeJwtPayload(localStorage.getItem("token") || "") || {}).customerId) || null;

      const res = await startChargingSession({
        vehicleId,
        bookingId: data.bookingId,
        portId,
        ...(customerId ? { customerId } : {}),
      });

      const d = res?.data || {};

      // ✅ Truyền toàn bộ thông tin cần hiển thị, nhất là startSoc
      navigateToCharging({
        chargingSessionId: d.chargingSessionId,
        startedAt: d.startedAt,
        startSoc: d.startSoc,            // << thêm
        status: d.status,                // << thêm (để hiển thị trạng thái)
        pricingRuleId: d.pricingRuleId ?? null,
        vehicleType: d.vehicleType,      // << thêm (nếu muốn hiển thị)
        vehicleId: d.vehicleId ?? vehicleId,
        customerId: d.customerId,        // << thêm (giữ nhất quán)
        portId,                          // giữ lại để FE gọi pricing động nếu cần
      });

    } catch (e) {
      setIdError(e?.message || "Không bắt đầu phiên sạc được. Vui lòng thử lại.");
    }
  };


  const onEnter = (e) => e.key === "Enter" && handleStart();

  // ===== Render =====
  // ✅ THÊM: Hiển thị loading khi đang kiểm tra auth
  if (authLoading) {
    return (
      <MainLayout>
        <div style={{ padding: 24, textAlign: 'center' }}>
          Đang kiểm tra quyền truy cập...
        </div>
      </MainLayout>
    );
  }

  if (loading && !data)
    return (
      <MainLayout>
        <div style={{ padding: 24 }}>Đang tải dữ liệu...</div>
      </MainLayout>
    );

  if (!okFlag || (!data && fetchError))
    return (
      <MainLayout>
        <div className="ps-root">
          <div className="ps-empty">
            <h2>Đơn đặt trước</h2>
            <p>{fetchError || "Không tìm thấy thông tin đơn."}</p>
            <Link className="ps-link is-back" to="/stations">
              <ArrowLeftOutlined /> Về danh sách trạm
            </Link>
          </div>
        </div>
      </MainLayout>
    );

  if (!data) return null;

  return (
    <MainLayout>
      <div className="ps-root">
        <div className="ps-topbar">
          <Link className="ps-link is-back" to="/stations">
            <ArrowLeftOutlined /> Về danh sách trạm
          </Link>
        </div>

        <div className="ps-grid">
          <section className="ps-panel ps-pane-left">
            <div className="ps-success-block">
              <div className="ps-success-icon">
                <CheckCircleFilled />
              </div>
              <h2 className="ps-success-title">Đơn đặt trước đã được xác nhận</h2>
              <p className="ps-success-time">
                {new Date(data.paidAt).toLocaleTimeString("vi-VN")}{" "}
                {new Date(data.paidAt).toLocaleDateString("vi-VN")}
              </p>
            </div>

            <div className="ps-timer">
              {phase === "toStart" && <div className="ps-timer-label">Đếm ngược đến giờ bắt đầu</div>}
              {phase === "running" && <div className="ps-timer-label">Thời gian còn lại đến khi kết thúc</div>}
              {phase === "ended" && <div className="ps-timer-label">Phiên đã kết thúc</div>}
              <div className="ps-timer-clock">{fmt(timeLeft)}</div>
            </div>

            <div className="ps-form">
              <label className="ps-label">Nhập ID trụ hoặc súng để bắt đầu phiên sạc</label>
              <div className="ps-row">
                <input
                  className="ps-input"
                  placeholder={
                    hintSamples.length ? `VD: ${hintSamples[0]}` : "VD: PORT-5"
                  }
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  onKeyDown={onEnter}
                />
                <button
                  className="ps-btn"
                  onClick={handleStart}
                  disabled={phase !== "running"}
                >
                  Bắt đầu sạc
                </button>
              </div>

              {/* Gợi ý ID đơn giản */}
              {hintSamples.length > 0 && (
                <p className="ps-hint" style={{ marginTop: 8, color: "#666" }}>
                  Gợi ý: {hintSamples.join("  •  ")}
                </p>
              )}

              {!!idError && <p className="ps-error">{idError}</p>}
            </div>
          </section>

          <aside className="ps-panel ps-pane-right">
            <h3 className="ps-pane-title">Thông tin đặt chỗ</h3>
            <div className="ps-block">
              <div className="ps-block-head">Trạm sạc</div>
              <div className="ps-kv">
                <span className="ps-k">Trạm</span>
                <span className="ps-v">
                  {data.station?.name ?? data.station?.stationName ?? "—"}
                </span>
              </div>
              <div className="ps-kv">
                <span className="ps-k">Địa chỉ</span>
                <span className="ps-v">
                  {data.station?.address ?? data.station?.location ?? "—"}
                </span>
              </div>
            </div>

            <div className="ps-block">
              <div className="ps-block-head">Trụ sạc</div>
              <div className="ps-kv">
                <span className="ps-k">Mã trụ</span>
                <span className="ps-v">
                  {data.charger?.code ?? data.charger?.Code ??
                    (data.charger?.chargerId ? `#${data.charger.chargerId}` : "—")}
                </span>
              </div>
              <div className="ps-kv">
                <span className="ps-k">Loại</span>
                <span className="ps-v">{data.charger?.type ?? "—"}</span>
              </div>
              <div className="ps-kv">
                <span className="ps-k">Công suất</span>
                <span className="ps-v">
                  {data.charger?.powerKw != null ? `${data.charger.powerKw} kW` : "—"}
                </span>
              </div>
              <div className="ps-kv">
                <span className="ps-k">Súng/Cổng đã đặt</span>
                                <span className="ps-v">
                  {[data.gun?.name, data.gun?.id].filter(Boolean).join(" — ") || "—"}
                </span>
              </div>
            </div>

            <div className="ps-block">
              <div className="ps-block-head">Chi phí</div>
              <div className="ps-kv">
                <span className="ps-k">Phí đặt chỗ</span>
                <span className="ps-v">{vnd(data.bookingFee)}</span>
              </div>
              <div className="ps-sep" />
              <div className="ps-kv ps-total">
                <span className="ps-k"><b>Tổng</b></span>
                <span className="ps-v"><b>{vnd(data.bookingFee)}</b></span>
              </div>
            </div>

            {(data?.startTime || data?.endTime || data?.status) && (
              <div className="ps-block">
                <div className="ps-block-head">Khung giờ</div>
                <div className="ps-kv">
                  <span className="ps-k">Bắt đầu</span>
                  <span className="ps-v">
                    {data.startTime ? new Date(data.startTime).toLocaleString("vi-VN") : "—"}
                  </span>
                </div>
                <div className="ps-kv">
                  <span className="ps-k">Kết thúc</span>
                  <span className="ps-v">
                    {data.endTime ? new Date(data.endTime).toLocaleString("vi-VN") : "—"}
                  </span>
                </div>
                <div className="ps-kv">
                  <span className="ps-k">Trạng thái</span>
                  <span className="ps-v">{data.status ?? "—"}</span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}