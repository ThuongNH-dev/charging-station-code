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
// --- DEMO SPEED SETTINGS ---
// Bật/tắt tăng tốc (đặt DEMO_SPEED=1 là tốc độ thật)
const DEMO_SPEED = 40;          // tăng ~8x
const TICK_MS = 100;           // mỗi tick 0.2s (mượt)
const PENALTY_TICK_MS = 200;   // đồng hồ chiếm trụ cũng nhanh

// ================== Helpers ==================
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

  // ==== Pricing dynamic ====
  const [dynPricePerKWh, setDynPricePerKWh] = useState(NaN);
  const [dynPenaltyPerMin, setDynPenaltyPerMin] = useState(NaN);
  const [dynGraceSeconds, setDynGraceSeconds] = useState(NaN);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");

  // ==== Subscription đang active (để tính đúng như BE) ====
  const [activeSub, setActiveSub] = useState({ discountPercent: 0, freeIdleMinutes: 0 });

  // ==== Session từ BE ====
  const [session, setSession] = useState(null);

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
  const fullAtRef = useRef(null); // ⬅️ thời điểm lần đầu chạm 100%


  // ====== Tự động bắt đầu phiên sạc nếu chưa có id ======
  useEffect(() => {
    let alive = true;
    async function startSessionIfNeeded() {
      if (state?.chargingSessionId) {
        let seed = state?.startSessionData || null;
        if (!seed) {
          try {
            const s = await fetchAuthJSON(`${API_ABS}/ChargingSessions/${encodeURIComponent(state.chargingSessionId)}`, { method: "GET" });
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
        return;
      }

      // Bắt đầu mới nếu chưa có id
      const customerId =
        state?.customerId ??
        state?.customer?.customerId ??
        (await resolveCustomerIdFromAuth(API_ABS));

      const vehicleId = state?.vehicleId ?? state?.vehicle?.id ?? state?.vehicle?.vehicleId;
      const bookingId = state?.bookingId ?? state?.booking?.id ?? state?.booking?.bookingId;
      const portIdToUse = state?.gun?.id ?? state?.gun?.portId ?? state?.gun?.PortId ?? state?.portId;

      if (!customerId || !vehicleId || !portIdToUse) return;

      try {
        const url = `${API_ABS}/ChargingSessions/start`;
        const body = {
          customerId: Number(customerId),
          vehicleId: Number(vehicleId),
          bookingId: bookingId == null ? null : Number(bookingId),
          portId: Number(portIdToUse),
        };
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
        } catch { }

        const merged = {
          ...raw,
          chargerId: (port?.chargerId ?? port?.ChargerId ?? null) ?? (raw?.chargerId ?? raw?.ChargerId ?? null),
        };
        setSession(merged);
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

  // Show lại toast nếu reload
  useEffect(() => {
    const cached = sessionStorage.getItem("charging:start:data");
    if (cached) {
      try {
        const obj = JSON.parse(cached);
        if (obj?.data) showStartSessionToast(obj.data);
      } catch { }
    }
  }, []);

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

  // Sim sạc (tăng tốc theo DEMO_SPEED, tick theo TICK_MS)
  useEffect(() => {
    if (!isCharging || battery >= 100) return;

    const kwFromState = Number(state?.charger?.powerKw);
    const kwFromSession = Number(session?.chargerPowerKw);
    const powerKw = Number.isFinite(kwFromSession) && kwFromSession > 0
      ? kwFromSession
      : (Number.isFinite(kwFromState) && kwFromState > 0 ? kwFromState : 7); // fallback 7kW

    const cap = Number.isFinite(batteryCapacity) && batteryCapacity > 0 ? batteryCapacity : 60;

    // %/giây * hệ số demo
    const deltaPctPerSec = ((powerKw / 3600) / cap) * 100 * DEMO_SPEED;
    const deltaPctPerTick = deltaPctPerSec * (TICK_MS / 1000);

    chargeInterval.current = setInterval(() => {
      setBattery((prev) => {
        const next = prev + deltaPctPerTick;
        const clamped = next >= 100 ? 100 : Number(next.toFixed(2));
        // ✅ nếu lần đầu đạt 100% thì ghi lại thời điểm
        if (prev < 100 && clamped >= 100 && !fullAtRef.current) {
          fullAtRef.current = Date.now();
        }
        return clamped;
      });

    }, TICK_MS);

    return () => clearInterval(chargeInterval.current);
  }, [isCharging, batteryCapacity, state?.charger?.powerKw, session?.chargerPowerKw]);


  // Idle sau khi đầy
  useEffect(() => {
    if (battery < 100 || !isCharging) return;
    penaltyInterval.current = setInterval(() => {
      // Mỗi tick +1 "giây mô phỏng". Với PENALTY_TICK_MS=200ms → ~5 giây mô phỏng/giây thực
      setOverTimeSecs((prev) => prev + 1);
    }, PENALTY_TICK_MS);
    return () => clearInterval(penaltyInterval.current);
  }, [battery, isCharging]);

  function getChargingSessionIdSafe() {
    let sid = session?.chargingSessionId ?? state?.chargingSessionId ?? null;
    if (!sid) {
      try {
        const cached = JSON.parse(sessionStorage.getItem("charging:start:data") || "null");
        sid = cached?.data?.chargingSessionId ?? cached?.chargingSessionId ?? null;
      } catch { }
    }
    return sid;
  }

  // ==== END SESSION (chuẩn BE) ====
  // ==== END SESSION (chuẩn BE) ====
  async function endSessionOnServer({ endSoc, chargingSessionId }) {
    if (!chargingSessionId || !Number.isFinite(Number(chargingSessionId))) return null;
    try {
      const url = `${API_ABS}/ChargingSessions/end`;

      // ✅ Tính overtime theo thời gian thực để không lệ thuộc interval
      const secondsSinceFull = Math.floor(
        (fullAtRef.current ? (Date.now() - fullAtRef.current) : 0) / 1000
      );

      // ✅ Lấy giá trị lớn hơn giữa đồng hồ interval & thời gian thực
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

    const beData = await endSessionOnServer({
      endSoc: Math.round(battery),
      chargingSessionId: sid,
    });

    if (!beData) {
      message.error("Không kết thúc được phiên sạc. Thử lại nhé.");
      return;
    }

    const orderId = `CHG${beData.chargingSessionId || Date.now()}`;

    // Lưu theo 2 key mà Invoice.jsx có thể đọc
    sessionStorage.setItem(`chargepay:${orderId}`, JSON.stringify({ orderId, ...beData }));
    sessionStorage.setItem("charge:end:last", JSON.stringify({ orderId, data: beData }));

    // Điều hướng: ưu tiên state.data như Invoice.jsx đang parse
    navigate(`/invoice?order=${orderId}`, {
      state: { orderId, data: beData },
      replace: true,
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

  const canEnd = Boolean(
    session?.chargingSessionId ||
    state?.chargingSessionId ||
    (() => {
      try {
        const cached = JSON.parse(sessionStorage.getItem("charging:start:data") || "null");
        return cached?.data?.chargingSessionId ?? cached?.chargingSessionId;
      } catch {
        return null;
      }
    })()
  );

  // ================== Render ==================
  const graceLeftSecs = Math.max(0, (Number.isFinite(dynGraceSeconds) ? dynGraceSeconds : 5 * 60) - overTimeSecs);
  const graceLeftMMSS = useMemo(() => {
    const m = Math.floor(graceLeftSecs / 60);
    const s = Math.floor(graceLeftSecs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [graceLeftSecs]);

  const penaltyElapsedSecs = Math.max(0, overTimeSecs - GRACE_SECONDS);
  const penaltyElapsedMMSS = useMemo(() => {
    const s = Math.floor(penaltyElapsedSecs);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  }, [penaltyElapsedSecs]);


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

                {/* ==== Tạm tính khớp BE: (energy*price + max(idle-free,0)*penalty) → discount% → +VAT 10% ==== */}
                <div>
                  <p>Tạm tính đến hiện tại</p>
                  <h4>{vnd(totalLive)}</h4>
                  <div className="sub">
                    {energyKwhSoFar.toFixed(2)} kWh × {pricePerKWhLive.toLocaleString("vi-VN")} +{" "}
                    {chargeableIdleAfterSub}’ × {(Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000).toLocaleString("vi-VN")}
                    {/*  → discount% → + VAT 10% */}
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
