// ✅ src/components/Charging/ChargingProgress.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { ThunderboltOutlined, WarningOutlined } from "@ant-design/icons";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./ChargingProgress.css";
import MainLayout from "../../layouts/MainLayout";

// 🔁 NEW: dùng utils để gọi API giống các trang khác
// import { fetchJSON, fetchAuthJSON, getApiBase } from "../../utils/api";
import { fetchJSON, fetchAuthJSON, getApiBase, getToken } from "../../utils/api";
const API_BASE = getApiBase();

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " VND";

// ================== Helpers chuẩn hoá/parse ==================

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

function nowTimeRange(dt = new Date()) {
  // Map khung giờ: BE demo trước đó dùng "Peak"/"Normal"
  const wd = dt.getDay(); // 0=CN, 1..6=Thứ2..Thứ7
  const h = dt.getHours();
  // Chủ nhật coi như "Normal"
  if (wd === 0) return "Normal";
  // Thứ 2-7:
  if (h >= 17 && h < 22) return "Peak";
  // 06:00–17:00 Normal, 22:00–06:00 Off-peak (nếu BE không có Off-peak thì dùng Normal)
  if (h >= 6 && h < 17) return "Normal";
  return "Normal";
}

function normalizeCharger(c = {}) {
  const powerKw = c.powerKw ?? c.PowerKW ?? c.power ?? c.Power;
  const priceText = c.price ?? c.Price ?? ""; // có thể là "5,500đ/kWh"
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
    (c.idleGraceMinutes ?? c.IdleGraceMinutes ? (Number(c.idleGraceMinutes ?? c.IdleGraceMinutes) * 60) : NaN);

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

// chọn rule phù hợp theo power gần nhất + timeRange
function pickRule(rules = [], { powerKw, timeRange }) {
  const list = Array.isArray(rules) ? rules : [];
  const sameTR = list.filter(r => {
    const tr = (r.timeRange ?? r.TimeRange ?? "").toString().toLowerCase();
    return tr ? tr.includes(timeRange.toLowerCase()) : true; // nếu BE không set, coi như khớp
  });

  if (!sameTR.length) return null;

  if (!Number.isFinite(powerKw)) return sameTR[0];

  // chọn rule có powerKw gần nhất
  let best = sameTR[0], bestDiff = Infinity;
  for (const r of sameTR) {
    const pk = Number(r.powerKw ?? r.PowerKW ?? r.power ?? r.Power);
    const diff = Number.isFinite(pk) ? Math.abs(pk - powerKw) : 1e9;
    if (diff < bestDiff) { best = r; bestDiff = diff; }
  }
  return best;
}

// =============================================================

const ChargingProgress = () => {
  const navigate = useNavigate();
  const { state } = useLocation(); // nhận payload từ PaymentSuccess / Booking

  // Nếu không có state → không chạy demo, yêu cầu quay lại
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

  // ==== LẤY DỮ LIỆU TỪ state ====
  const stationId = state.station?.id ?? state.station?.stationId ?? state.station?.StationId;
  const chargerId = state.charger?.id ?? state.charger?.chargerId ?? state.charger?.ChargerId;
  const portId = state.gun?.id ?? state.gun?.portId ?? state.gun?.PortId;

  const stationName = state.station?.name ?? "—";
  const chargerTitle = state.charger?.title ?? state.charger?.code ?? "—";
  const powerLabel = state.charger?.power ?? (Number.isFinite(state.charger?.powerKw) ? `${state.charger.powerKw} kW` : "—");
  const priceLabel = state.charger?.price ?? null; // ví dụ: "5,500đ/kWh"

  // 🔁 NEW: pricing dynamic từ BE
  const [dynPricePerKWh, setDynPricePerKWh] = useState(NaN);
  const [dynPenaltyPerMin, setDynPenaltyPerMin] = useState(NaN);
  const [dynGraceSeconds, setDynGraceSeconds] = useState(NaN);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");

  // Giá/kWh fallback: ưu tiên số (state.pricePerKWh), nếu không có thì parse từ label, cuối cùng mặc định 5500
  const parsedFromLabel = priceLabel ? Number((priceLabel.match(/\d+/g) || []).join("")) : NaN;
  const fallbackPricePerKWh = Number.isFinite(state.pricePerKWh)
    ? state.pricePerKWh
    : (Number.isFinite(parsedFromLabel) ? parsedFromLabel : 5500);

  // Dung lượng pin (kWh): nếu BE không trả thì mặc định 75 để có thể tính ước lượng
  const batteryCapacity = Number.isFinite(state.batteryCapacity) ? state.batteryCapacity : 75;

  // % pin ban đầu (SOC lúc bắt đầu phiên sạc) – dùng cho TẠM TÍNH (ước tính tới khi đầy)
  const initialBattery = Number.isFinite(state.battery) ? Math.max(0, Math.min(100, state.battery)) : 0;

  // % pin hiện tại (cho animation/hiển thị tiến độ)
  const [battery, setBattery] = useState(initialBattery);

  // Tổng thời gian sạc từ 0→100% (giả lập tuyến tính). Cho phép BE truyền vào, mặc định 120p.
  const TOTAL_TIME_MINUTES = Number.isFinite(state.totalTimeMinutes) ? state.totalTimeMinutes : 120;

  const [timeLeft, setTimeLeft] = useState("");
  const [overTimeSecs, setOverTimeSecs] = useState(0);  // đếm từ lúc đầy pin
  const [isCharging, setIsCharging] = useState(true);

  const chargeInterval = useRef(null);
  const penaltyInterval = useRef(null);
  const startedAtRef = useRef(state.startedAt || Date.now());

  // 🔁 NEW: tải pricing theo trụ/cổng
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPricingLoading(true);
        setPricingError("");

        // 1) lấy thông tin trụ
        let chargerRaw = null;
        if (chargerId) {
          try {
            chargerRaw = await fetchJSON(`${API_BASE}/Chargers/${encodeURIComponent(chargerId)}`);
          } catch (e) {
            // không có cũng không sao, dùng state
          }
        }

        const chNorm = normalizeCharger(chargerRaw || state.charger || {});
        const currentTR = nowTimeRange(new Date());

        // 2) cố lấy PricingRule (nếu BE có). Thử vài endpoint phổ biến.
        let rules = null;
        const tryEndpoints = [
          `${API_BASE}/PricingRules?chargerId=${encodeURIComponent(chNorm.id || chargerId || "")}`,
          `${API_BASE}/PricingRule?chargerId=${encodeURIComponent(chNorm.id || chargerId || "")}`,
          `${API_BASE}/PricingRules`,
        ];
        for (const url of tryEndpoints) {
          try {
            const r = await fetchJSON(url);
            const arr = Array.isArray(r) ? r : (Array.isArray(r?.items) ? r.items : null);
            if (arr && arr.length) { rules = arr; break; }
          } catch { }
        }

        let pricePerKwh = chNorm.pricePerKwh;               // ưu tiên số trên charger
        let idleFeePerMin = chNorm.idleFeePerMin;           // phí phạt/phút
        let graceSeconds = chNorm.idleGraceSeconds;         // miễn phí theo giây

        // 3) nếu có rules → chọn rule khớp khung giờ + power gần nhất
        if (rules && rules.length) {
          const best = pickRule(rules, { powerKw: chNorm.powerKw, timeRange: currentTR });
          if (best) {
            const rPrice = Number(best.pricePerKwh ?? best.pricePerKWh ?? best.PricePerKwh ?? best.PricePerKWh);
            const rPenalty = Number(best.idleFeePerMin ?? best.IdleFeePerMin);
            const rGraceSec =
              Number(best.idleGraceSeconds ?? best.IdleGraceSeconds) ||
              (Number(best.idleGraceMinutes ?? best.IdleGraceMinutes) * 60);

            if (Number.isFinite(rPrice) && rPrice > 0) pricePerKwh = rPrice;
            if (Number.isFinite(rPenalty) && rPenalty > 0) idleFeePerMin = rPenalty;
            if (Number.isFinite(rGraceSec) && rGraceSec > 0) graceSeconds = rGraceSec;
          }
        }

        // 4) fallback cuối
        if (!Number.isFinite(pricePerKwh) || pricePerKwh <= 0) pricePerKwh = fallbackPricePerKWh;
        if (!Number.isFinite(idleFeePerMin) || idleFeePerMin <= 0) idleFeePerMin = 10000; // fallback
        if (!Number.isFinite(graceSeconds) || graceSeconds <= 0) graceSeconds = 5 * 60;   // fallback 5 phút

        if (!alive) return;
        setDynPricePerKWh(pricePerKwh);
        setDynPenaltyPerMin(idleFeePerMin);
        setDynGraceSeconds(graceSeconds);
      } catch (e) {
        if (!alive) return;
        setPricingError(e?.message || "Không tải được thông tin giá.");
        // vẫn set fallback để UI chạy
        setDynPricePerKWh(fallbackPricePerKWh);
        setDynPenaltyPerMin(10000);
        setDynGraceSeconds(5 * 60);
      } finally {
        if (alive) setPricingLoading(false);
      }
    })();

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, chargerId, portId]);

  // ====== TẠM TÍNH (ƯỚC TÍNH TỚI KHI ĐẦY) DỰA TRÊN SOC BAN ĐẦU ======
  const needKWhToFull = useMemo(
    () => ((100 - initialBattery) / 100) * batteryCapacity,
    [initialBattery, batteryCapacity]
  );

  const estimatedCostToFull = useMemo(
    () => vnd(Math.round(needKWhToFull * (Number.isFinite(dynPricePerKWh) ? dynPricePerKWh : fallbackPricePerKWh))),
    [needKWhToFull, dynPricePerKWh, fallbackPricePerKWh]
  );

  const estimatedTimeMinutes = useMemo(
    () => Math.round(TOTAL_TIME_MINUTES * (100 - initialBattery) / 100),
    [TOTAL_TIME_MINUTES, initialBattery]
  );

  const fmtHM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m.toString().padStart(2, "0")}p`;
  };

  // ====== PHÍ PHẠT CHIẾM TRỤ (sau miễn phí) ======
  const GRACE_SECONDS = Number.isFinite(dynGraceSeconds) ? dynGraceSeconds : 5 * 60;      // 🔁 dùng giá trị động
  const PENALTY_PER_MIN = Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000;   // 🔁 dùng giá trị động

  // Tính số giây vượt quá miễn phí
  const chargeableSecs = Math.max(0, overTimeSecs - GRACE_SECONDS);
  const chargeableMinutes = Math.floor(chargeableSecs / 60); // làm tròn xuống theo phút
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

  // ====== THỜI GIAN DỰ KIẾN CÒN LẠI (theo % hiện tại) ======
  useEffect(() => {
    const minutesLeft = Math.round((TOTAL_TIME_MINUTES * (100 - battery)) / 100);
    const h = Math.floor(minutesLeft / 60);
    const m = minutesLeft % 60;
    setTimeLeft(`${h}h${m.toString().padStart(2, "0")}p`);
  }, [battery, TOTAL_TIME_MINUTES]);

  // 🔋 Animation tăng pin (giả lập)
  useEffect(() => {
    if (!isCharging || battery >= 100) return;
    chargeInterval.current = setInterval(() => {
      setBattery((prev) => (prev < 100 ? prev + 1 : 100));
    }, 300);
    return () => clearInterval(chargeInterval.current);
  }, [battery, isCharging]);

  // ⚠️ Khi đầy pin → bắt đầu đếm giây ngay để tính miễn phí & phạt sau đó
  useEffect(() => {
    if (battery < 100 || !isCharging) return;
    // 🔁 FIX: trước để 10ms (comment "mỗi giây"), chỉnh lại 1000ms = 1 giây
    penaltyInterval.current = setInterval(() => {
      setOverTimeSecs((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(penaltyInterval.current);
  }, [battery, isCharging]);

  const buildChargingPaymentPayload = () => {
    const endedAt = Date.now();
    const sessionSeconds = Math.max(1, Math.round((endedAt - startedAtRef.current) / 1000));
    const chargedPercent = Math.max(0, Math.min(100, battery - initialBattery));
    const energyUsedKWh = Number(((chargedPercent / 100) * batteryCapacity).toFixed(2));

    const pricePerKWh = Number.isFinite(dynPricePerKWh) ? dynPricePerKWh : fallbackPricePerKWh; // 🔁 động
    const energyCost = Math.round(energyUsedKWh * pricePerKWh);

    const penalty = battery >= 100
      ? Math.floor(Math.max(0, overTimeSecs - GRACE_SECONDS) / 60) * PENALTY_PER_MIN
      : 0;

    const orderId = "CHG" + Date.now();
    // Lấy customerId từ JWT (nếu BE encode)
    let customerId = null;
    try {
      const tk = getToken && getToken();
      const decoded = tk ? decodeJwtPayload(tk) : null;
      // tuỳ BE map claim nào: "customerId" hoặc "nameid"…
      customerId = decoded?.customerId ?? decoded?.nameid ?? null;
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
      penaltyPerMin: PENALTY_PER_MIN,   // 🔁 include vào payload để trang thanh toán hiển thị đúng
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
      // thông tin bổ sung:
      customerId,
      // nếu hệ thống đã có ChargingSession, bạn có thể đẩy id vào state khi bắt đầu sạc:
      chargingSessionId: state?.chargingSessionId ?? null,
    };

    sessionStorage.setItem(`chargepay:${orderId}`, JSON.stringify(payload));
    return payload;
  };

  // ✨ NEW: gọi BE để kết thúc phiên sạc và nhận số liệu chuẩn
  async function endSessionOnServer({ endSoc, chargingSessionId }) {
    // Nếu chưa có chargingSessionId (demo), bỏ qua gọi API để không lỗi.
    if (!chargingSessionId || !Number.isFinite(Number(chargingSessionId))) return null;

    try {
      const url = `${API_BASE}/ChargingSessions/end`;
      const body = {
        chargingSessionId: Number(chargingSessionId),
        endSoc: Math.round(Number(endSoc) || 0),
      };

      // dùng fetchAuthJSON để tự gắn Authorization
      const res = await fetchAuthJSON(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Kỳ vọng res.data theo mẫu BE gửi
      if (res && res.data) return res.data;
      return null;
    } catch (e) {
      console.error("[Charging] endSessionOnServer error:", e);
      return null; // fallback sang tính tạm nếu BE lỗi
    }
  }


  // ✨ UPDATE: gọi BE trước khi điều hướng sang Invoice
  const goToInvoicePage = async () => {
    // build payload tạm (phòng khi BE lỗi vẫn có số liệu)
    const draft = buildChargingPaymentPayload();

    // ✨ NEW: gọi BE end session (nếu có chargingSessionId)
    let beData = null;
    try {
      beData = await endSessionOnServer({
        endSoc: battery,                           // % pin kết thúc
        chargingSessionId: state?.chargingSessionId ?? draft.chargingSessionId,
      });
    } catch { }

    // ✨ NEW: nếu BE trả data → dùng số liệu chính thức để override draft
    let finalPayload = { ...draft };
    if (beData) {
      finalPayload = {
        ...finalPayload,
        // Đồng bộ lại các trường chuẩn từ BE
        chargingSessionId: beData.chargingSessionId ?? finalPayload.chargingSessionId,
        vehicleId: beData.vehicleId ?? finalPayload.vehicleId,
        portId: beData.portId ?? finalPayload.portId,
        startSoc: beData.startSoc ?? finalPayload.initialBattery,
        finalBattery: beData.endSoc ?? finalPayload.finalBattery,
        energyUsedKWh: beData.energyKwh ?? finalPayload.energyUsedKWh,
        sessionSeconds: Number.isFinite(beData.durationMin) ? beData.durationMin * 60 : finalPayload.sessionSeconds,
        idlePenalty: undefined, // sẽ tính lại từ beData.idleMin * (dynPenaltyPerMin)
        subtotal: beData.subtotal,
        tax: beData.tax,
        totalPayable: beData.total ?? finalPayload.totalPayable,
        endedAt: beData.endedAt,
        billingMonth: beData.billingMonth,
        billingYear: beData.billingYear,
        status: beData.status ?? "Completed",
        // nếu muốn lưu riêng các giá trị BE
        be: {
          durationMin: beData.durationMin,
          idleMin: beData.idleMin,
        },
      };

      // Nếu BE không trả penalty trực tiếp, tính lại penalty theo rule hiện tại:
      if (Number.isFinite(beData.idleMin)) {
        const perMin = Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000;
        const penaltyFromBE = beData.idleMin * perMin;
        finalPayload.idlePenalty = penaltyFromBE;
        // Nếu muốn đồng bộ tổng:
        if (!Number.isFinite(finalPayload.totalPayable)) {
          finalPayload.totalPayable = (beData.total ?? 0) || ((beData.subtotal ?? 0) + (beData.tax ?? 0) + penaltyFromBE);
        }
      }
    }

    // ✨ UPDATE: lưu lại payload cuối cùng (để Invoice.jsx có thể đọc)
    sessionStorage.setItem(`chargepay:${finalPayload.orderId}`, JSON.stringify(finalPayload));

    // Điều hướng sang hóa đơn (giữ nguyên)
    navigate(`/invoice?order=${finalPayload.orderId}`, {
      state: {
        ...finalPayload,
        invoiceStatus: "Unpaid",
        isMonthlyInvoice: false,
      },
      replace: true,
    });
  };

  // =======================
  // ✨ HANDLERS KẾT THÚC SẠC
  // =======================
  const handleStopCharging = async () => {
    setIsCharging(false);
    clearInterval(chargeInterval.current);
    clearInterval(penaltyInterval.current);
    await goToInvoicePage(); // Gọi hàm đã sửa ở trên
  };

  const handleFinishCharging = async () => {
    clearInterval(chargeInterval.current);
    clearInterval(penaltyInterval.current);
    await goToInvoicePage(); // Gọi hàm đã sửa ở trên
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

            {/* Thông báo pricing */}
            {pricingLoading ? (
              <div className="bp-hint" style={{ marginBottom: 8 }}>Đang tải biểu giá…</div>
            ) : pricingError ? (
              <div className="error-text" style={{ marginBottom: 8 }}>
                Không tải được biểu giá: {pricingError}. Đang dùng giá mặc định.
              </div>
            ) : null}

            <div className="charging-status">
              {/* Cột PIN */}
              <div className="status-box battery-box">
                <div
                  className="battery-ring"
                  style={{ ["--pct"]: battery }}
                  aria-label={`Mức pin hiện tại ${battery}%`}
                >
                  <ThunderboltOutlined className="battery-icon" />
                </div>
                <div className="battery-info">
                  <p>Phần trăm pin</p>
                  <h3>{battery}%</h3>
                </div>
              </div>

              {/* Cột thời gian + chip giá điện */}
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
                  <p>Tạm tính (ước tính tới khi đầy)</p>
                  <h4>{estimatedCostToFull}</h4>
                  <div className="sub">
                    Cần khoảng {needKWhToFull.toFixed(2)} kWh • {fmtHM(estimatedTimeMinutes)}
                  </div>
                </div>

                <div>
                  <p>Phí phạt</p>
                  {battery < 100 ? (
                    <h4>0 VND</h4>
                  ) : graceLeftSecs > 0 ? (
                    <div>
                      <h4>0 VND</h4>
                      <div className="sub">
                        Miễn phí còn lại: {graceLeftMMSS}
                      </div>
                    </div>
                  ) : (
                    <div className="penalty-stripe">
                      <h4>{penaltyCharging}</h4>
                      <div className="sub">
                        Đang tính phí: {chargeableMinutes} phút × {(Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000).toLocaleString("vi-VN")} VND/phút
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="charging-buttons">
              {battery < 100 && isCharging ? (
                <>
                  <button className="btn-stop" onClick={handleStopCharging}>Dừng sạc</button>
                  <button className="btn-error"><WarningOutlined /> Báo cáo sự cố</button>
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
                      Đang tính phí: {chargeableMinutes} phút × {(Number.isFinite(dynPenaltyPerMin) ? dynPenaltyPerMin : 10000).toLocaleString("vi-VN")} VND/phút
                    </p>
                  )}
                  <button className="btn-finish" onClick={handleFinishCharging}>Rút sạc</button>
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
