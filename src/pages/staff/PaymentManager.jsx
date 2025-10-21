import React, { useEffect, useState } from "react";
import "./PaymentManager.css";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function PaymentManager() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState("");
  const [method, setMethod] = useState("CASH");
  const [invoice, setInvoice] = useState("");
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // giả lập phiên đã kết thúc
    setSessions([
      { code: "S-1001", customer: "CUST-8821", kWh: 71, cost: 298200, status: "UNPAID" },
      { code: "S-1002", customer: "CUST-9123", kWh: 45, cost: 190000, status: "PAID" },
    ]);
  }, []);

  const onUpdatePayment = () => {
    if (!selected || !invoice) return alert("Vui lòng chọn mã phiên và nhập hóa đơn!");
    const sess = sessions.find((s) => s.code === selected);
    if (!sess) return alert("Không tìm thấy phiên!");

    const trans = {
      ...sess,
      method,
      invoice,
      time: new Date().toLocaleString("vi-VN"),
      status: "PAID",
    };

    setTransactions((prev) => [...prev, trans]);
    setSessions((prev) =>
      prev.map((s) => (s.code === selected ? { ...s, status: "PAID" } : s))
    );
    setInvoice("");
    alert("✅ Thanh toán thành công!");
  };

  const exportCSV = () => {
    const header = "Phiên,Khách hàng,kWh,Chi phí,PTTT,Hóa đơn,Trạng thái\n";
    const rows = transactions.map(
      (t) => `${t.code},${t.customer},${t.kWh},${t.cost},${t.method},${t.invoice},${t.status}`
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
  };

  return (
    <div className="pay-wrap">
      <div className="pay-top">
        <div className="pay-card">
          <h3>Ghi nhận thanh toán trực tiếp</h3>
          <div className="pay-form">
            <label>Mã phiên</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Chọn phiên đã kết thúc</option>
              {sessions
                .filter((s) => s.status === "UNPAID")
                .map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code}
                  </option>
                ))}
            </select>

            <label>Phương thức</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">CASH</option>
              <option value="POS">POS</option>
              <option value="QR">QR</option>
            </select>

            <label>Hóa đơn (#)</label>
            <input
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              placeholder="VD: INV-2025-0001"
            />

            <button onClick={onUpdatePayment}>Cập nhật thanh toán</button>
          </div>
        </div>

        <div className="pay-card">
          <h3>Danh sách giao dịch</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phiên</th>
                  <th>Khách</th>
                  <th>kWh</th>
                  <th>Chi phí</th>
                  <th>PTTT</th>
                  <th>Hóa đơn</th>
                  <th>TT</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="center muted">
                      Chưa có giao dịch nào.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t, i) => (
                    <tr key={i}>
                      <td>{t.code}</td>
                      <td>{t.customer}</td>
                      <td>{t.kWh}</td>
                      <td>{vnd(t.cost)}</td>
                      <td>{t.method}</td>
                      <td>{t.invoice}</td>
                      <td className="paid">PAID</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button className="export" onClick={exportCSV}>⭳ Xuất CSV</button>
        </div>
      </div>
    </div>
  );
}