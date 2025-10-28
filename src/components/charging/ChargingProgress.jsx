// ✅ src/components/Charging/ChargingProgress.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { ThunderboltOutlined, WarningOutlined } from "@ant-design/icons";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { message } from "antd";
import "./ChargingProgress.css";
import MainLayout from "../../layouts/MainLayout";
import { fetchJSON, fetchAuthJSON, getApiBase, getToken } from "../../utils/api";
import { resolveCustomerIdFromAuth } from "../../api/authHelpers";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " VND";

// ================== Helpers chuẩn hoá/parse ==================

// ✅ Chuẩn hóa API base tránh lỗi Invalid URL
function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";

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

// Khớp chính xác với GetCurrentTimeRange() bên BE:
// Low: 22:00–06:00, Normal: 06:00–17:00, Peak: 17:00–22:00
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

// ================== Helpers message/toast ==================
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
  const rows = [
    ["chargingSessionId", data.chargingSessionId],
    ["portId", data.portId],
    ["vehicleId", data.vehicleId],
    ["customerId", data.customerId],
    ["status", data.status],
    ["startSoc", data.startSoc],
    ["startedAt", fmtDateTimeISO(data.startedAt)],
    ["pricingRuleId", data.pricingRuleId],
    ["vehicleType", data.vehicleType],
    ["portStatus", data.portStatus ?? "—"],
    ["chargerType", data.chargerType ?? "—"],
    ["chargerPowerKw", data.chargerPowerKw ?? "—"],
  ];

  message.open({
    type: "success",
    duration: 6,
    content: (
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>✅ Bắt đầu phiên sạc theo Booking thành công!</div>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {rows.map(([k, v]) => (
            <div key={k}>
              <span style={{ color: "#888" }}>{k}:</span> <span>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  });
}

// =============================================================

const ChargingProgress = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Thiếu dữ liệu phiên sạc</h2>
        <p>Bạn cần bắt đầu từ trang xác nhận để vào màn hình sạc.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/stations">Về danh sách trạm</Link>
          <Link to="/payment">Về thanh toán</Link>
        </div>
      </div>
    );
  }

  const stationId = state.station?.id ?? state.station?.stationId ?? state.station?.StationId;
  const chargerId = state.charger?.id ?? state.charger?.chargerId ?? state.charger?.ChargerId;
  const portId = state.gun?.id ?? state.gun?.portId ?? state.gun?.PortId;

  const stationName = state.station?.name ?? "—";
  const chargerTitle = state.charger?.title ?? state.charger?.code ?? "—";
  const powerLabel =
    state.charger?.power ?? (Number.isFinite(state.charger?.powerKw) ? `${state.charger.powerKw} kW` : "—");
  const priceLabel = state.charger?.price ?? null;

  const [dynPricePerKWh, setDynPricePerKWh] = useState(NaN);
  const [dynPenaltyPerMin, setDynPenaltyPerMin] = useState(NaN);
  const [dynGraceSeconds, setDynGraceSeconds] = useState(NaN);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");
  const [session, setSession] = useState(null); // dữ liệu phiên sạc chuẩn từ BE

  const parsedFromLabel = priceLabel ? Number((priceLabel.match(/\d+/g) || []).join("")) : NaN;
  const fallbackPricePerKWh = Number.isFinite(state.pricePerKWh)
    ? state.pricePerKWh
    : Number.isFinite(parsedFromLabel)
      ? parsedFromLabel
      : 5500;

  const batteryCapacity = Number.isFinite(state.batteryCapacity) ? state.batteryCapacity : 75;
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

  const TOTAL_TIME_MINUTES = Number.isFinite(state.totalTimeMinutes) ? state.totalTimeMinutes : 120;

  const [timeLeft, setTimeLeft] = useState("");
  const [overTimeSecs, setOverTimeSecs] = useState(0);
  const [isCharging, setIsCharging] = useState(true);

  const chargeInterval = useRef(null);
  const penaltyInterval = useRef(null);
  const startedAtRef = useRef(state.startedAt || Date.now());

  // 🔁 NEW: tự động gọi /ChargingSessions/start (nếu cần) và hiển thị message nhỏ
  useEffect(() => {
    let alive = true;

    async function startSessionIfNeeded() {
      // Nếu đã có id: dùng startSessionData nếu có, nếu KHÔNG thì tự fetch + hydrate
      if (state?.chargingSessionId) {
        let seed = state?.startSessionData || null;
        if (!seed) {
          try {
            const s = await fetchAuthJSON(`${API_ABS}/ChargingSessions/${encodeURIComponent(state.chargingSessionId)}`, { method: "GET" });
            seed = s?.data || s || null;
          } catch { }
        }
        if (!seed) return; // không có gì để hydrate

        // --- Hydrate từ Port & Charger (giống đoạn bạn đã viết) ---
        let port = null, charger = null;
        try {
          const pId = seed.portId ?? state?.portId ?? state?.gun?.id ?? state?.gun?.portId ?? state?.gun?.PortId;
          if (pId != null) {
            port = await fetchAuthJSON(`${API_ABS}/Ports/${encodeURIComponent(pId)}`, { method: "GET" });
          }
        } catch { }
        try {
          const chId =
            port?.chargerId ?? port?.ChargerId ??
            seed?.chargerId ?? seed?.ChargerId ??
            state?.charger?.id ?? state?.charger?.chargerId ?? state?.charger?.ChargerId ?? null;
          if (chId != null) {
            charger = await fetchAuthJSON(`${API_ABS}/Chargers/${encodeURIComponent(chId)}`, { method: "GET" });
          }
        } catch { }

        const merged = {
          ...seed,
          // Không cố lấy 3 field null của BE
          portStatus: seed?.portStatus ?? null,
          chargerType: seed?.chargerType ?? null,
          chargerPowerKw: seed?.chargerPowerKw ?? null,
        };
        setSession(merged);
        sessionStorage.setItem("charging:start:data", JSON.stringify({ message: "Bắt đầu phiên sạc", data: merged }));
        showStartSessionToast(merged);
        return;
      }
      // Lấy dữ liệu để start
      const customerId =
        state?.customerId
        ?? state?.customer?.customerId
        ?? await resolveCustomerIdFromAuth(API_ABS);


      const vehicleId = state?.vehicleId ?? state?.vehicle?.id ?? state?.vehicle?.vehicleId;
      const bookingId = state?.bookingId ?? state?.booking?.id ?? state?.booking?.bookingId;
      const portIdToUse = state?.gun?.id ?? state?.gun?.portId ?? state?.gun?.PortId ?? state?.portId;

      // ✅ bookingId có thể null
      if (!customerId || !vehicleId || !portIdToUse) return;

      try {
        const url = `${API_ABS}/ChargingSessions/start`;
        const body = { customerId: Number(customerId), vehicleId: Number(vehicleId), bookingId: Number(bookingId), portId: Number(portIdToUse) };
        console.debug("[Charging] start payload", body);
        const res = await fetchAuthJSON(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const msg = res?.message || "Bắt đầu phiên sạc";
        const raw = res?.data || res || null;
        if (!alive || !raw) return;

        // --- Hydrate thêm từ Port & Charger ---
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
        } catch { }

        const merged = {
          ...raw,
          // Có thể bổ sung chargerId nếu cần
          chargerId: (port?.chargerId ?? port?.ChargerId ?? null) ?? (raw?.chargerId ?? raw?.ChargerId ?? null),
        };
        setSession(merged); // << BẮT BUỘC có
        sessionStorage.setItem("charging:start:data", JSON.stringify({ message: msg, data: merged }));
        showStartSessionToast(merged);
      } catch (e) {
        if (!alive) return;
        message.error(`Không thể bắt đầu phiên sạc: ${e?.message || "Lỗi không xác định"}`);
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

  // (Tuỳ chọn) Show lại toast nếu có cache khi reload
  useEffect(() => {
    const cached = sessionStorage.getItem("charging:start:data");
    if (cached) {
      try {
        const obj = JSON.parse(cached);
        if (obj?.data) showStartSessionToast(obj.data);
      } catch { }
    }
  }, []);

  // 🔁 NEW: tải pricing theo trụ/cổng
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
          } catch {
            /* ignore, dùng state */
          }
        }

        const chNorm = normalizeCharger(chargerRaw || state.charger || {});
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
          // Lọc trước theo type & timeRange (==, không includes)
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

  const chargeableSecs = Math.max(0, overTimeSecs - GRACE_SECONDS);
  const chargeableMinutes = Math.floor(chargeableSecs / 60);

  const penaltyCharging = useMemo(() => {
    if (battery < 100) return "0 VND";
    const penalty = chargeableMinutes * PENALTY_PER_MIN;
    return vnd(penalty);
  }, [battery, chargeableMinutes, PENALTY_PER_MIN]);

  const graceLeftSecs = Math.max(0, GRACE_SECONDS - overTimeSecs);
  const graceLeftMMSS = useMemo(() => {
    const m = Math.floor(graceLeftSecs / 60);
    const s = Math.floor(graceLeftSecs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [graceLeftSecs]);

  useEffect(() => {
    const minutesLeft = Math.round((TOTAL_TIME_MINUTES * (100 - battery)) / 100);
    const h = Math.floor(minutesLeft / 60);
    const m = minutesLeft % 60;
    setTimeLeft(`${h}h${m.toString().padStart(2, "0")}p`);
  }, [battery, TOTAL_TIME_MINUTES]);

  useEffect(() => {
    if (!isCharging || battery >= 100) return;
    const kwFromState = Number(state?.charger?.powerKw);
    const kwFromSession = Number(session?.chargerPowerKw);
    const powerKw = Number.isFinite(kwFromSession) && kwFromSession > 0
      ? kwFromSession
      : (Number.isFinite(kwFromState) && kwFromState > 0 ? kwFromState : 7); // fallback 7kW
    const cap = Number.isFinite(batteryCapacity) && batteryCapacity > 0 ? batteryCapacity : 60;

    const tickSec = 1_0; // 10s/tick
    const deltaPctPerSec = (powerKw / 3600) / cap * 100;

    chargeInterval.current = setInterval(() => {
      setBattery((prev) => {
        const next = prev + deltaPctPerSec;
        return next >= 100 ? 100 : Number(next.toFixed(2));
      });
    }, tickSec);
    return () => clearInterval(chargeInterval.current);
  }, [isCharging, batteryCapacity, state?.charger?.powerKw, session?.chargerPowerKw]);

  useEffect(() => {
    if (battery < 100 || !isCharging) return;
    penaltyInterval.current = setInterval(() => {
      setOverTimeSecs((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(penaltyInterval.current);
  }, [battery, isCharging]);

  // Tạm tính đến hiện tại (chỉ tăng khi % pin nhảy thêm 1%)
  const roundedBattery = Math.floor(battery);
  const roundedStartSoc = Math.floor(startSocRef.current);
  const chargedPercentSoFar = Math.max(0, roundedBattery - roundedStartSoc); // chỉ dùng % nguyên
  const energyKwhSoFar = Number(((chargedPercentSoFar / 100) * batteryCapacity).toFixed(2));
  const livePricePerKwh = Number.isFinite(dynPricePerKWh) ? dynPricePerKWh : fallbackPricePerKWh;
  const liveSubtotal = Math.round(energyKwhSoFar * livePricePerKwh); // chưa cộng idle
  const liveTax = Math.round(liveSubtotal * 0.1); // BE 10%
  const liveTotal = liveSubtotal + liveTax;

  const buildChargingPaymentPayload = () => {
    const endedAt = Date.now();
    const sessionSeconds = Math.max(1, Math.round((endedAt - startedAtRef.current) / 1000));
    const chargedPercent = Math.max(0, Math.min(100, battery - initialBattery));
    const energyUsedKWh = Number(((chargedPercent / 100) * batteryCapacity).toFixed(2));

    const pricePerKWh = Number.isFinite(dynPricePerKWh) ? dynPricePerKWh : fallbackPricePerKWh;
    const energyCost = Math.round(energyUsedKWh * pricePerKWh);

    const penalty =
      battery >= 100 ? Math.floor(Math.max(0, overTimeSecs - GRACE_SECONDS) / 60) * PENALTY_PER_MIN : 0;

    const orderId = "CHG" + Date.now();

    let customerId = null;
    try {
      const tk = getToken && getToken();
      const decoded = tk ? decodeJwtPayload(tk) : null;
      customerId = decoded?.customerId ?? decoded?.nameid ?? decoded?.sub ?? null;
      if (typeof customerId === "string" && /^\d+$/.test(customerId)) customerId = Number(customerId);
    } catch { }

    const payload = {
      orderId,
      kind: "after_charge",
      station: state.station,
      charger: state.charger,
      gun: state.gun,
      stationId,
      chargerId,
      portId,
      pricePerKWh,
      penaltyPerMin: PENALTY_PER_MIN,
      graceSeconds: GRACE_SECONDS,
      batteryCapacity,
      initialBattery,
      finalBattery: battery,
      energyUsedKWh,
      sessionSeconds,
      energyCost,
      idlePenalty: penalty,
      totalPayable: energyCost + penalty,
      startedAt: startedAtRef.current,
      endedAt,
      pricingSource: pricingError ? "fallback" : "dynamic",
      customerId,
      chargingSessionId: state?.chargingSessionId ?? null,
    };

    sessionStorage.setItem(`chargepay:${orderId}`, JSON.stringify(payload));
    return payload;
  };

  // ✅ Gọi BE để kết thúc phiên sạc và nhận số liệu chuẩn (unwrap {message, data})
  async function endSessionOnServer({ endSoc, chargingSessionId, customerId }) {
    if (!chargingSessionId || !Number.isFinite(Number(chargingSessionId))) return null;

    try {
      const url = `${API_ABS}/ChargingSessions/end`;
      const body = {
        chargingSessionId: Number(chargingSessionId),
        endSoc: Math.round(Number(endSoc) || 0),
        ...(Number(customerId) > 0 ? { customerId: Number(customerId) } : {}),
      };

      const res = await fetchAuthJSON(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res?.data) return res.data;
      return res || null;
    } catch (e) {
      console.error("[Charging] endSessionOnServer error:", e);
      return null;
    }
  }

  const goToInvoicePage = async () => {
    const beData = await endSessionOnServer({
      endSoc: Math.round(battery),
      chargingSessionId: state?.chargingSessionId,
    });
    if (!beData) {
      message.error("Không kết thúc phiên sạc được. Vui lòng thử lại.");
      return;
    }
    // Lưu số liệu từ BE + một ít info hiển thị
    const orderId = `CHG${beData.chargingSessionId || Date.now()}`;
    const finalPayload = {
      orderId,
      ...beData,
      station: state.station,
      charger: state.charger,
      gun: state.gun,
      invoiceStatus: "Unpaid",
      isMonthlyInvoice: false,
    };
    sessionStorage.setItem(`chargepay:${orderId}`, JSON.stringify(finalPayload));
    navigate(`/invoice?order=${orderId}`, {
      state: { ...finalPayload, customerId: session?.customerId ?? state?.customerId ?? null },
      replace: true
    });
  };


  const handleStopCharging = async () => {
    setIsCharging(false);
    clearInterval(chargeInterval.current);
    clearInterval(penaltyInterval.current);
    await goToInvoicePage();
  };

  const handleFinishCharging = async () => {
    clearInterval(chargeInterval.current);
    clearInterval(penaltyInterval.current);
    await goToInvoicePage();
  };

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
                <h3>{timeLeft}</h3>
                <div className="chip" style={{ marginTop: 6 }}>
                  {(Number.isFinite(dynPricePerKWh) ? dynPricePerKWh : fallbackPricePerKWh).toLocaleString("vi-VN")} VND/kWh
                </div>
              </div>
            </div>

            <div className="charging-info-wrapper">
              <div className="info-box left-box">
                {state.carModel && (
                  <div>
                    <p>Hãng xe</p>
                    <h4>{state.carModel}</h4>
                  </div>
                )}
                {state.plate && (
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

                <div>
                  <p>Tạm tính đến hiện tại</p>
                  <h4>{vnd(liveTotal)}</h4>
                  <div className="sub">
                    {energyKwhSoFar.toFixed(2)} kWh • Giá {livePricePerKwh.toLocaleString("vi-VN")} VND/kWh • Thuế 10%
                  </div>
                </div>

                <div>
                  <p>Phí phạt</p>
                  {roundedBattery < 100 ? (
                    <h4>0 VND</h4>
                  ) : graceLeftSecs > 0 ? (
                    <div>
                      <h4>0 VND</h4>
                      <div className="sub">Miễn phí còn lại: {graceLeftMMSS}</div>
                    </div>
                  ) : (
                    <div className="penalty-stripe">
                      <h4>{penaltyCharging}</h4>
                      <div className="sub">
                        Đang tính phí: {chargeableMinutes} phút ×{" "}
                        {(Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000).toLocaleString("vi-VN")} VND/phút
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="charging-buttons">
              {roundedBattery < 100 && isCharging ? (
                <>
                  <button className="btn-stop" onClick={handleStopCharging}>
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
                      Đang tính phí: {chargeableMinutes} phút ×{" "}
                      {(Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000).toLocaleString("vi-VN")} VND/phút
                    </p>
                  )}
                  <button className="btn-finish" onClick={handleFinishCharging}>
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
