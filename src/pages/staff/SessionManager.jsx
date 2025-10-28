import React, { useEffect, useState } from "react";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import "./SessionManager.css";

const API_BASE = getApiBase();

// === Helpers ===
function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const mon = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${hh}:${mm}:${ss} ${day}/${mon}/${year}`;
}

function vnd(n) {
  if (!n && n !== 0) return "—";
  return (Number(n) || 0).toLocaleString("vi-VN") + " ₫";
}

export default function SessionManager() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const pageSize = 8;
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  // ✅ Lấy danh sách phiên + hóa đơn tương ứng
  async function loadSessions() {
    setLoading(true);
    try {
      const res = await fetchAuthJSON(`${API_BASE}/ChargingSessions`);
      let sessionArr = res?.data ?? res?.$values ?? res?.items ?? res ?? [];
      if (!Array.isArray(sessionArr)) sessionArr = [sessionArr];

      // Lấy chi tiết từng phiên
      const detailed = await Promise.all(
        sessionArr.map(async (s) => {
          try {
            const det = await fetchAuthJSON(
              `${API_BASE}/ChargingSessions/${s.chargingSessionId || s.id}`
            );
            return {
              ...s,
              ...det,
              invoiceId: det?.data?.invoiceId || det?.invoiceId || s.invoiceId,
            };
          } catch {
            return s;
          }
        })
      );

      // Lấy toàn bộ hóa đơn
      const invRes = await fetchAuthJSON(`${API_BASE}/Invoices`);
      let invoices =
        invRes?.data ?? invRes?.$values ?? invRes?.items ?? invRes ?? [];
      if (!Array.isArray(invoices)) invoices = [invoices];

      // Map phiên -> trạng thái hóa đơn
      const sessionToInvoiceStatus = {};
      for (const inv of invoices) {
        try {
          const invDetail = await fetchAuthJSON(
            `${API_BASE}/Invoices/${inv.invoiceId || inv.id}`
          );
          const invoiceData = invDetail?.data || invDetail;
          const sessionsList =
            invoiceData?.chargingSessions ||
            invoiceData?.$values?.chargingSessions ||
            [];

          sessionsList.forEach((session) => {
            const sessionId = session.chargingSessionId || session.id;
            if (sessionId) {
              sessionToInvoiceStatus[sessionId] = {
                status: (inv.status || "UNPAID").toUpperCase(),
                invoiceId: inv.invoiceId || inv.id,
              };
            }
          });
        } catch (e) {
          console.error(`Error loading invoice ${inv.invoiceId}:`, e);
        }
      }

      // Gộp dữ liệu & sắp xếp theo ID giảm dần
      const merged = detailed
        .map((s) => {
          const sessionId = s.chargingSessionId || s.id;
          const invoiceInfo = sessionToInvoiceStatus[sessionId];
          let invoiceStatus = "UNPAID";
          if (invoiceInfo?.status) invoiceStatus = invoiceInfo.status;

          return {
            ...s,
            energyKwh: s.energyKwh ?? 0,
            total: s.total ?? 0,
            invoiceStatus: invoiceStatus,
            invoiceId: invoiceInfo?.invoiceId || null,
          };
        })
        .sort((a, b) => (b.chargingSessionId || 0) - (a.chargingSessionId || 0));

      setSessions(merged);
    } catch (e) {
      console.error(e);
      setErr("Không thể tải danh sách phiên hoặc hóa đơn!");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Dừng phiên
  async function handleStopSession(s) {
    const confirmStop = window.confirm(
      `Bạn có chắc chắn muốn dừng phiên sạc #${s.chargingSessionId}?`
    );
    if (!confirmStop) return;

    try {
      const res = await fetchAuthJSON(`${API_BASE}/ChargingSessions/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargingSessionId: s.chargingSessionId,
          endSoc: s.endSoc ?? 80,
        }),
      });

      const beData = res?.data || res;
      if (!beData) {
        alert("❌ Không thể dừng phiên sạc!");
        return;
      }

      const orderId = `CHG${beData.chargingSessionId || Date.now()}`;
      const finalPayload = {
        orderId,
        ...beData,
        chargingSessionId: beData.chargingSessionId ?? s.chargingSessionId,
        customerId: beData.customerId ?? s.customerId ?? "—",
        customerName:
          beData.customerName ?? s.customerName ?? s.name ?? "Không có",
        startedAt: beData.startedAt ?? s.startedAt ?? new Date().toISOString(),
        endedAt: beData.endedAt ?? new Date().toISOString(),
        energyKwh: beData.energyKwh ?? s.energyKwh ?? 0,
        total: beData.total ?? s.total ?? 0,
        station: s.station ?? { id: s.stationId, name: s.stationName },
        charger: s.charger ?? { id: s.chargerId, name: s.chargerName },
        gun: s.gun ?? { id: s.portId },
        invoiceStatus: "UNPAID",
        isMonthlyInvoice: false,
      };

      sessionStorage.setItem(`chargepay:${orderId}`, JSON.stringify(finalPayload));
      alert("✅ Phiên sạc đã dừng! Chuyển đến hóa đơn...");

      navigate(`/staff/invoice?order=${orderId}`, {
        state: finalPayload,
        replace: true,
      });
    } catch (err) {
      console.error(err);
      alert(`❌ Lỗi khi dừng phiên: ${err.message}`);
    } finally {
      await loadSessions();
    }
  }

  // ✅ Lọc & tìm kiếm
  const filteredSessions = sessions.filter((s) => {
    const matchSearch = search
      ? String(s.chargingSessionId)
          .toLowerCase()
          .includes(search.toLowerCase())
      : true;
    const matchStatus =
      filterStatus === "all"
        ? true
        : filterStatus === "charging"
        ? (s.status || "").toLowerCase() === "charging"
        : (s.status || "").toLowerCase() !== "charging";
    return matchSearch && matchStatus;
  });

  // ✅ Thống kê
  const total = sessions.length;
  const chargingCount = sessions.filter(
    (s) => (s.status || "").toLowerCase() === "charging"
  ).length;
  const stoppedCount = total - chargingCount;

  // ✅ Phân trang
  const totalPages = Math.ceil(filteredSessions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSessions = filteredSessions.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <div className="sess-wrap">
      <div className="sess-card">
        <div className="sess-head">
          <h3>Phiên sạc (đang chạy / lịch sử)</h3>

          {/* 🔍 Thanh tìm kiếm + Lọc */}
          <div className="sess-filters">
            <input
              type="text"
              placeholder="🔍 Tìm mã phiên..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">Tất cả</option>
              <option value="charging">Đang sạc</option>
              <option value="stopped">Đã dừng</option>
            </select>
          </div>
        </div>

        {/* 📊 Thanh thống kê */}
        <div className="sess-summary">
          <span>🧾 Tổng số phiên: <strong>{total}</strong></span>
          <span>⚡ Đang sạc: <strong>{chargingCount}</strong></span>
          <span>✅ Đã dừng: <strong>{stoppedCount}</strong></span>
        </div>

        {/* === Bảng dữ liệu === */}
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
                <th style={{ width: "160px" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="center muted">
                    Đang tải…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={9} className="center error">
                    {err}
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="center muted">
                    Không tìm thấy phiên phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((s) => (
                  <tr key={s.chargingSessionId}>
                    <td className="strong">S-{s.chargingSessionId}</td>
                    <td>{s.portId ?? "—"}</td>
                    <td>{s.customerId ? `CUST-${s.customerId}` : "—"}</td>
                    <td>{fmtTime(s.startedAt)}</td>
                    <td>{fmtTime(s.endedAt)}</td>
                    <td>{s.energyKwh?.toFixed(2) ?? "—"}</td>
                    <td>{vnd(s.total)}</td>
                    <td>
                      <span
                        className={`pill ${
                          s.invoiceStatus === "PAID"
                            ? "paid"
                            : s.invoiceStatus === "UNPAID"
                            ? "unpaid"
                            : "charging"
                        }`}
                      >
                        {s.invoiceStatus}
                      </span>
                    </td>
                    <td>
                      {s.status?.toLowerCase() === "charging" ? (
                        <button
                          className="btn-dark"
                          onClick={() => handleStopSession(s)}
                        >
                          Dừng
                        </button>
                      ) : (
                        <button
                          className="btn-light"
                          onClick={() =>
                            navigate(`/staff/invoice?order=S${s.chargingSessionId}`, {
                              state: s,
                            })
                          }
                        >
                          Chi tiết
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination */}
        {!loading && filteredSessions.length > pageSize && (
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ← Trang trước
            </button>
            <span>
              Trang {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Trang sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
