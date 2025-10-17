import React, { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import "./SessionManager.css";

/** ================= Helpers (định dạng) ================= */
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

/** ================== Component ================== */
export default function SessionManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        // TODO: GẮN API Ở ĐÂY
        // const res = await fetchAuthJSON(`${API_BASE}/Sessions?stationId=...`);
        // const items = res.items || res.data || res.results || res.$values || res || [];
        // const parsed = Array.isArray(items) ? items : [items];

        // Demo data (xóa khi nối API):
        const parsed = [
          {
            sessionCode: "S-1001",
            chargerCode: "A-02",
            customerCode: "CUST-8821",
            startTime: "2025-09-22T11:12:10",
            endTime: null,
            energyKwh: null,
            cost: null,
            status: "UNPAID", // hoặc PAID / CANCELLED
          },
        ];

        if (alive) {
          setRows(parsed);
          setLoading(false);
        }
      } catch (e) {
        if (alive) {
          setErr(e?.message || "Lỗi tải dữ liệu");
          setLoading(false);
        }
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  const onStop = (row) => {
    // TODO: gọi API dừng phiên
    console.log("Stop session", row.sessionCode);
  };

  return (
    <MainLayout>
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
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="center muted">Đang tải…</td></tr>
                )}
                {err && !loading && (
                  <tr><td colSpan={9} className="center error">{err}</td></tr>
                )}
                {!loading && !err && rows.length === 0 && (
                  <tr><td colSpan={9} className="center muted">Chưa có phiên nào.</td></tr>
                )}

                {!loading && !err && rows.map((r, i) => (
                  <tr key={r.sessionCode || i}>
                    <td className="strong">{r.sessionCode}</td>
                    <td>{r.chargerCode || "—"}</td>
                    <td>{r.customerCode || "—"}</td>
                    <td>{fmtTime(r.startTime)}</td>
                    <td>{fmtTime(r.endTime)}</td>
                    <td>{r.energyKwh != null ? r.energyKwh : "—"}</td>
                    <td>{r.cost != null ? vnd(r.cost) : "—"}</td>
                    <td>
                      <span className={`pill ${String(r.status).toLowerCase()}`}>
                        {String(r.status).toUpperCase() || "—"}
                      </span>
                    </td>
                    <td>
                      <button className="btn-ghost" onClick={() => onStop(r)}>
                        Dừng
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
