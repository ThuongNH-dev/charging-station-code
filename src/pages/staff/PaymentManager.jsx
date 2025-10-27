import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "./PaymentManager.css";

const API_BASE = getApiBase();
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " ₫";

export default function PaymentManager() {
  const { id } = useParams(); // nếu có từ SessionManager
  const [search] = useSearchParams();
  const defaultMethod = search.get("method") || "CASH";

  const [sessions, setSessions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState("");
  const [method, setMethod] = useState(defaultMethod);
  const [invoice, setInvoice] = useState("");
  const [invoiceId, setInvoiceId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paidTransactions, setPaidTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // ================= LOAD PHIÊN + HÓA ĐƠN =================
  async function loadData() {
    setLoading(true);
    try {
      // 1️⃣ Lấy danh sách phiên sạc
      const res = await fetchAuthJSON(`${API_BASE}/ChargingSessions`);
      let arr = res?.data ?? res?.$values ?? res?.items ?? res ?? [];
      if (!Array.isArray(arr)) arr = [arr];
      
      // 2️⃣ Lọc các phiên đã hoàn thành
      const completed = arr.filter((s) => {
        const st = (s.status || "").toLowerCase();
        return ["completed", "done", "finished", "ended"].includes(st);
      });

      // 3️⃣ Lấy danh sách hóa đơn và tạo map sessionId -> invoice
      const invRes = await fetchAuthJSON(`${API_BASE}/Invoices`);
      let invArr = invRes?.data ?? invRes?.$values ?? invRes?.items ?? invRes ?? [];
      if (!Array.isArray(invArr)) invArr = [invArr];

      // Tạo map: sessionId -> invoice
      const sessionToInvoice = {};
      
      for (const inv of invArr) {
        try {
          const invDetail = await fetchAuthJSON(`${API_BASE}/Invoices/${inv.invoiceId || inv.id}`);
          const invoiceData = invDetail?.data || invDetail;
          
          // Get chargingSessions from invoice
          const sessionsList = invoiceData?.chargingSessions || 
                             invoiceData?.$values?.chargingSessions || 
                             [];
          
          // Map each session in this invoice
          sessionsList.forEach(session => {
            const sessionId = session.chargingSessionId || session.id;
            if (sessionId) {
              sessionToInvoice[sessionId] = {
                invoiceId: inv.invoiceId || inv.id,
                status: inv.status || "UNPAID",
                invoice: inv
              };
            }
          });
        } catch (e) {
          console.error(`Error loading invoice ${inv.invoiceId}:`, e);
        }
      }

      // 4️⃣ Tách hóa đơn đã thanh toán và chưa thanh toán
      const paidInvoices = invArr.filter(
        (inv) => (inv.status || "").toLowerCase() === "paid"
      );
      const unpaidInvoices = invArr.filter(
        (inv) => (inv.status || "").toLowerCase() !== "paid"
      );

      setSessions(completed);
      setInvoices(unpaidInvoices);
      
      // Store the session-to-invoice map
      window.sessionToInvoiceMap = sessionToInvoice;
      
      // 5️⃣ Load danh sách giao dịch đã thanh toán (từ invoices)
      const paidList = await loadPaidTransactions(paidInvoices);
      setPaidTransactions(paidList);

      console.log("✅ Completed sessions:", completed.length);
      console.log("✅ Paid invoices:", paidInvoices.length);
      console.log("✅ Unpaid invoices:", unpaidInvoices.length);
      console.log("✅ Session-to-invoice map:", Object.keys(sessionToInvoice).length, "sessions mapped");

      // 6️⃣ Nếu có id từ URL → tự chọn phiên và hóa đơn
      if (id) {
        const match = completed.find(
          (s) => Number(s.chargingSessionId) === Number(id) || Number(s.id) === Number(id)
        );
        if (match) {
          setSelected(`S-${match.chargingSessionId || match.id}`);

          // Tìm invoice từ map
          const sessionId = match.chargingSessionId || match.id;
          const invoiceInfo = sessionToInvoice[sessionId];
          
          if (invoiceInfo?.invoiceId) {
            setInvoice(`INV-${invoiceInfo.invoiceId}`);
            setInvoiceId(invoiceInfo.invoiceId);
          } else {
            setInvoice("Không có hóa đơn");
            setInvoiceId(null);
          }
        }
      }
    } catch (e) {
      console.error("❌ Lỗi khi tải dữ liệu:", e);
      alert("❌ Không thể tải danh sách phiên hoặc hóa đơn!");
    } finally {
      setLoading(false);
    }
  }

  // ================= CẬP NHẬT THANH TOÁN =================
  async function handlePaymentUpdate() {
    if (!selected || !invoiceId)
      return alert("⚠️ Vui lòng chọn phiên sạc!");
    
    if (invoice === "Không có hóa đơn")
      return alert("⚠️ Phiên này chưa có hóa đơn, không thể thanh toán!");
    
    try {
      const sess = sessions.find(
        (s) => `S-${s.chargingSessionId}` === selected
      );
      if (!sess) return alert("Không tìm thấy phiên!");

      // Tìm hóa đơn tương ứng
      const inv = invoices.find(
        (i) => i.invoiceId === invoiceId || i.id === invoiceId
      );
      if (!inv) return alert("Không tìm thấy hóa đơn tương ứng!");

      // ✅ Gọi API cập nhật trạng thái hóa đơn
      await fetchAuthJSON(`${API_BASE}/Invoices/status`, {
        method: "PUT",
        body: JSON.stringify({
          invoiceId: inv.invoiceId,
          status: "Paid",
        }),
      });

      const trans = {
        ...sess,
        method,
        invoice: invoice,
        time: new Date().toLocaleString("vi-VN"),
        status: "PAID",
      };
      setTransactions((prev) => [...prev, trans]);
      alert("✅ Đã ghi nhận thanh toán!");
      
      // Reset form
      setSelected("");
      setInvoice("");
      setInvoiceId(null);
      
      // Reload data to update invoice status
      await loadData();
    } catch (e) {
      console.error("❌ Lỗi cập nhật thanh toán:", e);
      alert("❌ Cập nhật thanh toán thất bại!");
    }
  }

  // ================= LOAD GIAO DỊCH ĐÃ THANH TOÁN =================
  async function loadPaidTransactions(paidInvoices) {
    try {
      const allTransactions = [];
      
      for (const inv of paidInvoices) {
        // Lấy chi tiết hóa đơn để có thông tin đầy đủ
        try {
          const invoiceDetail = await fetchAuthJSON(`${API_BASE}/Invoices/${inv.invoiceId}`);
          
          if (invoiceDetail?.data?.chargingSessions) {
            const sessionsList = toArray(invoiceDetail.data.chargingSessions);
            
            sessionsList.forEach((session) => {
              allTransactions.push({
                chargingSessionId: session.chargingSessionId || session.id,
                customerId: session.customerId || invoiceDetail.data.customerId,
                energyKwh: session.energyKwh || 0,
                total: session.total || invoiceDetail.data.total || 0,
                method: "API_PAID",
                invoice: `INV-${inv.invoiceId}`,
                time: session.endedAt || inv.updatedAt || new Date().toISOString(),
                status: "PAID"
              });
            });
          }
        } catch (e) {
          console.error(`Error loading invoice ${inv.invoiceId}:`, e);
        }
      }
      
      return allTransactions;
    } catch (e) {
      console.error("Error loading paid transactions:", e);
      return [];
    }
  }

  function toArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.$values)) return data.$values;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [data];
  }

  // ================= XUẤT FILE CSV =================
  function exportCSV() {
    // Gộp tất cả giao dịch (local + từ API)
    const allTrans = [...transactions, ...paidTransactions];
    
    const header = "Phiên,Khách hàng,kWh,Chi phí,PTTT,Hóa đơn,Trạng thái,Thời gian\n";
    const rows = allTrans.map(
      (t) =>
        `${t.chargingSessionId},${t.customerId || 'N/A'},${t.energyKwh || 0},${t.total || 0},${t.method || 'N/A'},${t.invoice || 'N/A'},${t.status},${t.time || 'N/A'}`
    );
    const blob = new Blob([header + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  // ================= GIAO DIỆN =================
  return (
    <div className="pay-wrap">
      <div className="pay-top">
        {/* Ghi nhận thanh toán */}
        <div className="pay-card">
          <h3>Ghi nhận thanh toán trực tiếp</h3>
          {loading ? (
            <p className="center muted">Đang tải dữ liệu...</p>
          ) : (
            <div className="pay-form">
              <label>Mã phiên</label>
              <select
                value={selected}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelected(val);
                  const sid = Number(val.replace("S-", ""));
                  
                  // Tìm session được chọn
                  const selectedSession = sessions.find(
                    (s) => Number(s.chargingSessionId) === Number(sid) ||
                          Number(s.id) === Number(sid)
                  );
                  
                  if (selectedSession) {
                    // Lấy invoiceInfo từ map (sessionId -> invoice)
                    const sessionId = sid;
                    const invoiceInfo = window.sessionToInvoiceMap?.[sessionId];
                    
                    console.log("🔍 Selected session ID:", sessionId);
                    console.log("🔍 Invoice info from map:", invoiceInfo);
                    
                    if (invoiceInfo?.invoiceId) {
                      setInvoice(`INV-${invoiceInfo.invoiceId}`);
                      setInvoiceId(invoiceInfo.invoiceId);
                      console.log("✅ Set invoice:", invoiceInfo.invoiceId);
                      console.log("✅ Invoice status:", invoiceInfo.status);
                    } else {
                      setInvoice("Chưa có hóa đơn");
                      setInvoiceId(null);
                      console.log("⚠️ Session chưa có invoice trong map");
                    }
                  } else {
                    setInvoice("Không có hóa đơn");
                    setInvoiceId(null);
                    console.log("❌ Session not found");
                  }
                }}
              >
                <option value="">Chọn phiên đã hoàn thành</option>
                {sessions.map((s) => (
                  <option
                    key={s.chargingSessionId}
                    value={`S-${s.chargingSessionId}`}
                  >
                    S-{s.chargingSessionId}
                  </option>
                ))}
              </select>

              <label>Phương thức</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="CASH">Tiền mặt</option>
                <option value="POS">POS</option>
                <option value="QR">QR tại trạm</option>
              </select>

              <label>Hóa đơn (#)</label>
              <input
                value={invoice}
                readOnly
                style={{
                  backgroundColor: "#f3f4f6",
                  cursor: "not-allowed",
                  borderColor: invoice === "Không có hóa đơn" ? "#dc2626" : "#d1d5db"
                }}
                placeholder="VD: INV-2025-0001"
              />

              <button 
                onClick={handlePaymentUpdate}
                disabled={!selected || !invoiceId}
                style={{
                  opacity: (!selected || !invoiceId) ? 0.5 : 1,
                  cursor: (!selected || !invoiceId) ? "not-allowed" : "pointer"
                }}
              >
                Cập nhật thanh toán
              </button>
              <p className="hint">
                🪙 Trạng thái giao dịch sẽ chuyển sang{" "}
                <strong>ĐÃ THANH TOÁN</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Danh sách giao dịch */}
        <div className="pay-card">
          <h3>Danh sách giao dịch 
            <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginLeft: '10px' }}>
              ({transactions.length + paidTransactions.length} giao dịch)
            </span>
          </h3>
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
                {transactions.length === 0 && paidTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="center muted">
                      Chưa có giao dịch nào.
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Giao dịch mới ghi nhận */}
                    {transactions.map((t, i) => (
                      <tr key={`local-${i}`}>
                        <td>S-{t.chargingSessionId}</td>
                        <td>CUST-{t.customerId || 'N/A'}</td>
                        <td>{t.energyKwh || '-'}</td>
                        <td>{vnd(t.total || 0)}</td>
                        <td>{t.method || 'N/A'}</td>
                        <td>{t.invoice}</td>
                        <td className="paid">PAID</td>
                      </tr>
                    ))}
                    {/* Giao dịch từ database */}
                    {paidTransactions.map((t, i) => (
                      <tr key={`paid-${i}`}>
                        <td>S-{t.chargingSessionId}</td>
                        <td>CUST-{t.customerId || 'N/A'}</td>
                        <td>{t.energyKwh || '-'}</td>
                        <td>{vnd(t.total || 0)}</td>
                        <td>{t.method || 'API'}</td>
                        <td>{t.invoice}</td>
                        <td className="paid">PAID</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <button className="export" onClick={exportCSV}>
            ⭳ Xuất CSV
          </button>
        </div>
      </div>
    </div>
  );
}