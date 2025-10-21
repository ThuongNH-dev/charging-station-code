import React, { useEffect, useState } from "react";
import "./ReportPage.css";

export default function ReportPage() {
  const [report, setReport] = useState({
    chargers: 0,
    active: 0,
    revenue: 0,
    incidents: 0,
  });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // DEMO data mô phỏng
    setReport({ chargers: 3, active: 1, revenue: 298200, incidents: 0 });
    setHistory([
      {
        session: "S-1001",
        charger: "A-02",
        customer: "CUST-8821",
        duration: "1h 11m",
        kWh: 71,
        cost: 298200,
        invoice: "INV-2025-0001",
      },
    ]);
  }, []);

  const exportCSV = () => {
    const header = "Phiên,Trụ,Khách,Thời lượng,kWh,Chi phí,Hóa đơn\n";
    const rows = history.map(
      (h) =>
        `${h.session},${h.charger},${h.customer},${h.duration},${h.kWh},${h.cost},${h.invoice}`
    );
    const blob = new Blob([header + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
  };

  return (
    <div className="rep-wrap">
      <h3>Báo cáo nhanh theo ca</h3>
      <div className="rep-summary">
        <div className="rep-box">
          <p>Trụ hoạt động</p>
          <h2>{report.chargers}/4</h2>
        </div>
        <div className="rep-box">
          <p>Phiên đang chạy</p>
          <h2>{report.active}</h2>
        </div>
        <div className="rep-box">
          <p>Doanh thu (ước tính)</p>
          <h2>{report.revenue.toLocaleString("vi-VN")} đ</h2>
        </div>
        <div className="rep-box">
          <p>Sự cố mở</p>
          <h2>{report.incidents}</h2>
        </div>
      </div>

      <h3>Lịch sử phiên đã thanh toán</h3>
      <div className="rep-table">
        <table>
          <thead>
            <tr>
              <th>Phiên</th>
              <th>Trụ</th>
              <th>Khách</th>
              <th>Thời lượng</th>
              <th>kWh</th>
              <th>Chi phí</th>
              <th>Hóa đơn</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} className="center muted">
                  Chưa có phiên thanh toán.
                </td>
              </tr>
            ) : (
              history.map((h, i) => (
                <tr key={i}>
                  <td>{h.session}</td>
                  <td>{h.charger}</td>
                  <td>{h.customer}</td>
                  <td>{h.duration}</td>
                  <td>{h.kWh}</td>
                  <td>{h.cost.toLocaleString("vi-VN")} đ</td>
                  <td>{h.invoice}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <button className="export" onClick={exportCSV}>⭳ Xuất CSV</button>
      </div>
    </div>
  );
}