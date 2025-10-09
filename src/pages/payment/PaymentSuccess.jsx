// src/pages/payment/PaymentSuccess.jsx
import React, { useMemo, useEffect, useState } from "react";
import { useLocation, useNavigate, Link, useSearchParams } from "react-router-dom";
import { CheckCircleFilled } from "@ant-design/icons";
import "./PaymentSuccess.css";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function PaymentSuccess() {
  const { state } = useLocation();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (state) return state;
    const order = search.get("order");
    if (!order) return null;
    const cached = sessionStorage.getItem(`pay:${order}`);
    return cached ? JSON.parse(cached) : null;
  }, [state, search]);

  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Đơn đặt trước</h2>
        <p>Không tìm thấy thông tin đơn — có thể bạn đã tải lại trang.</p>
        <Link to="/stations">Về danh sách trạm</Link>
      </div>
    );
  }

  const { orderId, station, charger, bookingFee, paidAt, totalMinutes = 0 } = data;

  // ===== COUNTDOWN =====
  const totalSeconds = Math.max(0, Math.floor(totalMinutes * 60));
  const calcRemaining = () => {
    const elapsed = Math.floor((Date.now() - (paidAt || Date.now())) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  };
  const [timeLeft, setTimeLeft] = useState(calcRemaining());
  useEffect(() => {
    const timer = setInterval(() => {
      const left = calcRemaining();
      setTimeLeft(left);
      if (left <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [paidAt, totalSeconds]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ===== NHẬP ID TRỤ & ĐIỀU HƯỚNG =====
  const [idInput, setIdInput] = useState("");
  const [idError, setIdError] = useState("");

  const normalize = (s) => (s || "").toString().trim().toLowerCase();
  // ID hợp lệ: ưu tiên charger.id, fallback sang charger.code hoặc charger.name
  const expectedId = useMemo(
    () => normalize(charger?.id) || normalize(charger?.title),
    [charger]
  );

  const handleStart = () => {
    if (timeLeft <= 0) {
      setIdError("Hết thời gian giữ chỗ. Vui lòng đặt lại.");
      return;
    }
    if (normalize(idInput) !== expectedId) {
      setIdError("ID trụ không đúng. Vui lòng kiểm tra lại.");
      return;
    }
    setIdError("");
    // Mang toàn bộ payload sang trang sạc
    navigate("/charging", {
      state: {
        orderId,
        station,
        charger,
        bookingFee,
        paidAt,
        totalMinutes,
        // có thể thêm những trường cần thiết khác:
        fromPayment: true,
      },
      replace: false,
    });
  };

  const onEnter = (e) => {
    if (e.key === "Enter") handleStart();
  };

  return (
    <div className="payment-success-container">
      <div className="left-column">
        <CheckCircleFilled className="success-icon" />
        <h2>Đơn đặt trước đã được xác nhận</h2>
        <p>
          {new Date(paidAt).toLocaleTimeString("vi-VN")}{" "}
          {new Date(paidAt).toLocaleDateString("vi-VN")}
        </p>

        <div className="timer">{formatTime(timeLeft)}</div>

        <p>Nhập ID trụ để bắt đầu phiên sạc</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Nhập ID trụ sạc"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={onEnter}
          />
          <button onClick={handleStart} disabled={timeLeft <= 0}>
            Bắt đầu sạc
          </button>
        </div>
        {!!idError && (
          <div style={{ color: "#d4380d", marginTop: 6 }}>{idError}</div>
        )}

        {timeLeft === 0 && (
          <p style={{ marginTop: 12, color: "#d4380d" }}>
            Hết thời gian giữ chỗ. Vui lòng đặt lại.
          </p>
        )}
      </div>

      <div className="right-column">
        <h3>Thông tin đơn đặt trước</h3>
        <div style={{ marginTop: 16 }}>
          <p style={{ fontWeight: "bold" }}>1. Thông tin trụ sạc</p>
          <p style={{ marginLeft: 8 }}>
            {station?.name ?? "—"}<br />
            Công suất: {charger?.power ?? "—"}<br />
            Loại đầu nối: {charger?.connector ?? "—"}<br />
            Số cổng: {Array.isArray(charger?.guns) ? charger.guns.length : "—"}
          </p>

          <p style={{ fontWeight: "bold", marginTop: 16 }}>2. Chi phí</p>
          <table>
            <tbody>
              <tr>
                <td>Phí đặt chỗ</td>
                <td style={{ textAlign: "right" }}>{vnd(bookingFee)}</td>
              </tr>
              <tr>
                <td>Tạm tính</td>
                <td style={{ textAlign: "right" }}>{vnd(bookingFee)}</td>
              </tr>
              <tr>
                <td>Giảm giá</td>
                <td style={{ textAlign: "right" }}>0%</td>
              </tr>
              <tr>
                <td><b>Tổng</b></td>
                <td style={{ textAlign: "right" }}><b>{vnd(bookingFee)}</b></td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 16 }}>
            <Link to="/stations">Về danh sách trạm</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
