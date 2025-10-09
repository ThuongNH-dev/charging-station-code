// ✅ src/components/Charging/ChargingProgress.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { ThunderboltOutlined, WarningOutlined } from "@ant-design/icons";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./ChargingProgress.css";
import MainLayout from "../../layouts/MainLayout";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " VND";

const GRACE_SECONDS = 5 * 60;   // 5 phút miễn phí
const PENALTY_PER_MIN = 5000;   // 5.000 VND mỗi phút sau thời gian miễn phí

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
  const stationName  = state.station?.name ?? "—";
  const chargerTitle = state.charger?.title ?? "—";
  const powerLabel   = state.charger?.power ?? "—";
  const priceLabel   = state.charger?.price ?? null; // ví dụ: "5,500đ/kWh"

  // Giá/kWh: ưu tiên số (state.pricePerKWh), nếu không có thì parse từ "5,500đ/kWh", cuối cùng mặc định 5500
  const parsedFromLabel = priceLabel ? Number((priceLabel.match(/\d+/g) || []).join("")) : NaN;
  const pricePerKWh = Number.isFinite(state.pricePerKWh)
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

  // ====== TẠM TÍNH (ƯỚC TÍNH TỚI KHI ĐẦY) DỰA TRÊN SOC BAN ĐẦU ======
  const needKWhToFull = useMemo(
    () => ((100 - initialBattery) / 100) * batteryCapacity,
    [initialBattery, batteryCapacity]
  );

  const estimatedCostToFull = useMemo(
    () => vnd(Math.round(needKWhToFull * pricePerKWh)),
    [needKWhToFull, pricePerKWh]
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

  // ====== PHÍ PHẠT CHIẾM TRỤ (sau 5 phút kể từ khi đầy) ======
  // Tính số giây vượt quá miễn phí
  const chargeableSecs = Math.max(0, overTimeSecs - GRACE_SECONDS);
  const chargeableMinutes = Math.floor(chargeableSecs / 60); // làm tròn xuống theo phút
  const penaltyCharging = useMemo(() => {
    if (battery < 100) return "0 VND";
    const penalty = chargeableMinutes * PENALTY_PER_MIN;
    return vnd(penalty);
  }, [battery, chargeableMinutes]);

  const graceLeftSecs = Math.max(0, GRACE_SECONDS - overTimeSecs);
  const graceLeftMMSS = useMemo(() => {
    const m = Math.floor(graceLeftSecs / 60);
    const s = graceLeftSecs % 60;
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

  // ⚠️ Khi đầy pin → bắt đầu đếm giây ngay để tính miễn phí 5p & phạt sau đó
  useEffect(() => {
    if (battery < 100 || !isCharging) return;
    penaltyInterval.current = setInterval(() => {
      setOverTimeSecs((prev) => prev + 1);
    }, 1000); // ✅ mỗi giây
    return () => clearInterval(penaltyInterval.current);
  }, [battery, isCharging]);

  const buildChargingPaymentPayload = () => {
    const endedAt = Date.now();
    const sessionSeconds = Math.max(1, Math.round((endedAt - startedAtRef.current) / 1000));
    const chargedPercent = Math.max(0, Math.min(100, battery - initialBattery));
    const energyUsedKWh = Number(((chargedPercent / 100) * batteryCapacity).toFixed(2));
    const energyCost = Math.round(energyUsedKWh * pricePerKWh);

    const penalty = battery >= 100
      ? Math.floor(Math.max(0, overTimeSecs - GRACE_SECONDS) / 60) * PENALTY_PER_MIN
      : 0;

    const orderId = "CHG" + Date.now();

    const payload = {
      orderId,
      kind: "after_charge",
      station: state.station,
      charger: state.charger,
      gun: state.gun,
      pricePerKWh,
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
    };

    sessionStorage.setItem(`chargepay:${orderId}`, JSON.stringify(payload));
    return payload;
  };

  const goToChargingPayment = () => {
    const payload = buildChargingPaymentPayload();
    // 👉 Điều hướng sang trang thanh toán sau sạc
    navigate(`/payment/charging?order=${payload.orderId}`, { state: payload, replace: true });
  };

  const handleStopCharging = () => {
    setIsCharging(false);
    clearInterval(chargeInterval.current);
    clearInterval(penaltyInterval.current);
    goToChargingPayment();
  };

  const handleFinishCharging = () => {
    clearInterval(chargeInterval.current);
    clearInterval(penaltyInterval.current);
    goToChargingPayment();
  };

  return (
    <MainLayout>
    <div className="cp-root">
      <div className="charging-wrapper">
        <div className="charging-card">
          <h2 className="charging-title">Chế độ sạc</h2>
          {/* Accent gradient bar mới */}
          <div className="accent-bar" />

          <p className="charging-station">
            {stationName} — {chargerTitle} ({powerLabel})
          </p>

          <div className="charging-status">
            {/* Cột PIN có vòng tiến độ conic quanh icon */}
            <div className="status-box battery-box">
              <div
                className="battery-ring"
                // truyền % pin vào biến CSS --pct (0–100)
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
              {/* Chip hiển thị giá điện (nhỏ xinh) */}
              <div className="chip" style={{ marginTop: 6 }}>
                {pricePerKWh
                  ? `${pricePerKWh.toLocaleString()} VND/kWh`
                  : (priceLabel || "—")}
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
                  {pricePerKWh
                    ? `${pricePerKWh.toLocaleString()} VND/kWh`
                    : (priceLabel || "—")}
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
                  // Khi đang tính phí: dùng stripe cảnh báo
                  <div className="penalty-stripe">
                    <h4>{penaltyCharging}</h4>
                    <div className="sub">
                      Đang tính phí: {chargeableMinutes} phút × {PENALTY_PER_MIN.toLocaleString("vi-VN")} VND/phút
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
                    Đang tính phí: {chargeableMinutes} phút × {PENALTY_PER_MIN.toLocaleString("vi-VN")} VND/phút
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
