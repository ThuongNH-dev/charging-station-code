import React, { useEffect, useRef, useState } from "react";
import "./SessionManager.css";

const fmtTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  const day = d.getDate();
  const mon = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${hh}:${mm}:${ss} ${day}/${mon}/${year}`;
};
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function SessionManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeStop, setActiveStop] = useState(null);
  const [showPaymentMenu, setShowPaymentMenu] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("POS");
  const dropdownRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      setRows([
        {
          sessionCode: "S-1001",
          chargerCode: "A-02",
          customerCode: "CUST-8821",
          startTime: "2025-09-22T10:15:12",
          endTime: "2025-09-22T11:26:34",
          energyKwh: 71,
          cost: 298200,
          status: "UNPAID",
        },
      ]);
      setLoading(false);
    }, 300);
  }, []);

  // ✅ Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowPaymentMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStopClick = (row) => {
    setShowPaymentMenu(null);
    if (activeStop === row.sessionCode) setActiveStop(null);
    else setActiveStop(row.sessionCode);
  };

  const handleCancel = () => {
    setActiveStop(null);
    setShowPaymentMenu(null);
  };

  const handleShowPayment = (row) => {
    setShowPaymentMenu((prev) => (prev === row.sessionCode ? null : row.sessionCode));
  };

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    alert(`✅ Đã chọn phương thức: ${method}`);
    setShowPaymentMenu(null);
    setActiveStop(null);
  };

  return (
    <div className="sess-wrap">
      <div className="sess-card">
        <div className="sess-head">
          <h3>Phiên sạc (đang chạy / lịch sử)</h3>
        </div>

        <div className="sess-table">
          <table>
            <thead>
              <tr>
                <th>Mã phiên</th>
                <th>Trụ</th>
                <th>Khách hàng</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>kWh</th>
                <th>Chi phí</th>
                <th>TT</th>
                <th style={{ width: "160px" }}>Thao tác</th> {/* ✅ rộng hơn */}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="center muted">
                    Đang tải…
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.sessionCode}>
                    <td className="strong">{r.sessionCode}</td>
                    <td>{r.chargerCode}</td>
                    <td>{r.customerCode}</td>
                    <td>{fmtTime(r.startTime)}</td>
                    <td>{fmtTime(r.endTime)}</td>
                    <td>{r.energyKwh}</td>
                    <td>{vnd(r.cost)}</td>
                    <td>
                      <span className="pill unpaid">UNPAID</span>
                    </td>
                    <td className="relative">
                      {/* Trạng thái bình thường */}
                      {activeStop !== r.sessionCode && (
                        <button
                          className="btn-dark"
                          onClick={() => handleStopClick(r)}
                        >
                          Dừng
                        </button>
                      )}

                      {/* Khi bấm Dừng → hiện hai nút */}
                      {activeStop === r.sessionCode && (
                        <div className="inline-actions">
                          <button
                            className="btn-dark small"
                            onClick={() => handleShowPayment(r)}
                          >
                            Thu tiền
                          </button>
                          <button
                            className="btn-light small"
                            onClick={handleCancel}
                          >
                            Hủy
                          </button>
                        </div>
                      )}

                      {/* Dropdown chọn phương thức */}
                      {showPaymentMenu === r.sessionCode && (
                        <div
                          ref={dropdownRef}
                          className="popup-payment"
                        >
                          <div className="popup-header">Chọn phương thức</div>
                          <div
                            className={`popup-item ${
                              selectedMethod === "CASH" ? "active" : ""
                            }`}
                            onClick={() => handleSelectMethod("CASH")}
                          >
                            🏦 Tiền mặt
                          </div>
                          <div
                            className={`popup-item ${
                              selectedMethod === "POS" ? "active" : ""
                            }`}
                            onClick={() => handleSelectMethod("POS")}
                          >
                            💳 POS
                          </div>
                          <div
                            className={`popup-item ${
                              selectedMethod === "QR" ? "active" : ""
                            }`}
                            onClick={() => handleSelectMethod("QR")}
                          >
                            📱 QR tại trạm
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
