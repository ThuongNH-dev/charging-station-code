import React, { useEffect, useMemo, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase, getToken } from "../../utils/api";
import "./style/InvoiceCharging.css";

const API_ABS = getApiBase() || "https://localhost:7268/api";
const VND = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

// ===== Helpers: decode JWT -> payload =====
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
    return JSON.parse(jsonPayload || "{}");
  } catch {
    return {};
  }
}

// ===== Lấy customerId hiện tại (đủ mạnh, có fallback) =====
function getCurrentCustomerId() {
  // 1) từ token (ưu tiên)
  const token = getToken?.() || (typeof localStorage !== "undefined" && (localStorage.getItem("token") || localStorage.getItem("access_token"))) || "";
  if (token) {
    const pl = decodeJwtPayload(token);
    // thử các key phổ biến
    const cand =
      pl.customerId ?? pl.CustomerId ?? pl.custId ?? pl.custID ??
      pl["customer_id"] ?? pl["cust_id"] ?? null;
    if (cand != null) return Number(cand);

    // một số hệ thống chỉ có accountId -> đôi khi map 1-1 với customerId
    const acc =
      pl.accountId ?? pl.AccountId ?? pl.sub ??
      pl["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      null;
    if (acc != null && !Number.isNaN(Number(acc))) {
      // nếu dự án của bạn dùng accountId == customerId, bật dòng dưới:
      // return Number(acc);
    }
  }

  // 2) thử đọc nhớ tạm
  try {
    const stored = sessionStorage.getItem("customerId") || localStorage.getItem("customerId");
    if (stored) return Number(stored);
  } catch {}

  return null; // không xác định -> sẽ hiển thị cảnh báo
}

// ===== Badge trạng thái =====
function StatusPill({ status }) {
  const raw = String(status || "");
  const key = raw.toLowerCase();
  const cls =
    key.includes("paid") ? "pill ok" :
    key.includes("unpaid") ? "pill warn" :
    key.includes("overdue") ? "pill danger" :
    "pill";
  return <span className={cls}>{raw}</span>;
}

// ====== Row con: chi tiết phiên sạc trong 1 invoice ======
function SessionList({ sessions }) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return <div className="iv-empty-sub">Không có phiên sạc nào.</div>;
  }
  return (
    <div className="iv-subtable">
      <div className="iv-subhead">
        <div>#</div>
        <div>Thời gian</div>
        <div>SoC</div>
        <div>Năng lượng</div>
        <div>Phí trước thuế</div>
        <div>Thuế</div>
        <div>Tổng</div>
        <div>Trạng thái</div>
      </div>
      <div className="iv-sublist">
        {sessions.map((s) => (
          <div key={s.chargingSessionId} className="iv-subrow">
            <div>#{s.chargingSessionId}</div>
            <div>
              <div>
                Bắt đầu: {s.startedAt ? new Date(s.startedAt).toLocaleString("vi-VN") : "—"}
              </div>
              <div>
                Kết thúc: {s.endedAt ? new Date(s.endedAt).toLocaleString("vi-VN") : "—"}
              </div>
              <div>
                Thời lượng: {Number(s.durationMin) || 0} phút • Idle: {Number(s.idleMin) || 0} phút
              </div>
            </div>
            <div>{s.startSoc ?? "—"}% → {s.endSoc ?? "—"}%</div>
            <div>{(Number(s.energyKwh) || 0).toLocaleString("vi-VN")} kWh</div>
            <div>{VND(s.subtotal)}</div>
            <div>{VND(s.tax)}</div>
            <div>{VND(s.total)}</div>
            <div><StatusPill status={s.status} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InvoiceCharging() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [raw, setRaw] = useState([]); // tất cả invoice trả về
  const [expandedId, setExpandedId] = useState(null);

  // Lọc
  const [statusFilter, setStatusFilter] = useState("all"); // all | Paid | Unpaid
  const [month, setMonth] = useState(""); // 1-12
  const [year, setYear] = useState("");   // YYYY

  // Lấy id người dùng
  const myCustomerId = useMemo(() => getCurrentCustomerId(), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const url = `${API_ABS}/Invoices`;
        const res = await fetchAuthJSON(url, { method: "GET" });
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setRaw(list);
      } catch (e) {
        setErr(e?.message || "Không tải được danh sách hóa đơn.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Lọc theo customerId + status + tháng/năm
  const items = useMemo(() => {
    let arr = Array.isArray(raw) ? raw : [];
    if (myCustomerId != null) {
      arr = arr.filter((x) => {
        const cid = x?.customerId ?? x?.customer?.customerId;
        return Number(cid) === Number(myCustomerId);
      });
    }
    if (statusFilter !== "all") {
      arr = arr.filter((x) => String(x.status || "").toLowerCase() === statusFilter.toLowerCase());
    }
    if (month) {
      arr = arr.filter((x) => Number(x.billingMonth) === Number(month));
    }
    if (year) {
      arr = arr.filter((x) => Number(x.billingYear) === Number(year));
    }
    // mới nhất trước
    arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return arr;
  }, [raw, myCustomerId, statusFilter, month, year]);

  const clearFilters = () => { setStatusFilter("all"); setMonth(""); setYear(""); };

  return (
    <MainLayout>
      <div className="iv-root">
        <div className="iv-topbar">
          <h2>Hóa đơn sạc</h2>
          <div className="iv-filters">
            <label className="iv-filter">
              Trạng thái:&nbsp;
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </label>
            <label className="iv-filter">
              Tháng:&nbsp;
              <input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="1-12"
              />
            </label>
            <label className="iv-filter">
              Năm:&nbsp;
              <input
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="YYYY"
              />
            </label>
            {(statusFilter !== "all" || month || year) && (
              <button className="iv-btn ghost" onClick={clearFilters} title="Xóa bộ lọc">Xóa lọc</button>
            )}
          </div>
        </div>

        {loading && <div className="iv-empty">Đang tải dữ liệu...</div>}
        {!!err && !loading && <div className="iv-error">{err}</div>}

        {!loading && !err && myCustomerId == null && (
          <div className="iv-warn">
            Không xác định được <b>customerId</b> từ token/bộ nhớ local.
            Trang sẽ hiển thị toàn bộ hóa đơn (nếu có). Bạn có thể lưu <code>customerId</code> vào localStorage/sessionStorage để lọc chính xác.
          </div>
        )}

        {!loading && !err && items.length === 0 && (
          <div className="iv-empty">Không có hóa đơn phù hợp.</div>
        )}

        {!loading && !err && items.length > 0 && (
          <div className="iv-table">
            <div className="iv-head">
              <div>Mã</div>
              <div>Khách hàng</div>
              <div>Kỳ</div>
              <div>Tổng</div>
              <div>Trạng thái</div>
              <div>Tạo lúc</div>
              <div>Cập nhật</div>
              <div>Phiên sạc</div>
              <div>Hành động</div>
            </div>

            <div className="iv-list">
              {items.map((inv) => {
                const id = inv.invoiceId;
                const custName = inv.customer?.fullName || `#${inv.customerId ?? "—"}`;
                const sessions = Array.isArray(inv.chargingSessions) ? inv.chargingSessions : [];
                const isOpen = expandedId === id;

                return (
                  <div key={id} className="iv-rowwrap">
                    <div className="iv-row">
                      <div className="cell mono">#{id}</div>
                      <div className="cell">{custName}</div>
                      <div className="cell">{String(inv.billingMonth || "—")}/{String(inv.billingYear || "—")}</div>
                      <div className="cell strong">{VND(inv.total)}</div>
                      <div className="cell"><StatusPill status={inv.status} /></div>
                      <div className="cell">{inv.createdAt ? new Date(inv.createdAt).toLocaleString("vi-VN") : "—"}</div>
                      <div className="cell">{inv.updatedAt ? new Date(inv.updatedAt).toLocaleString("vi-VN") : "—"}</div>
                      <div className="cell">{sessions.length}</div>
                      <div className="cell actions">
                        <button
                          className="iv-btn"
                          onClick={() => setExpandedId(isOpen ? null : id)}
                          title={isOpen ? "Ẩn chi tiết" : "Xem chi tiết phiên sạc"}
                        >
                          {isOpen ? "Ẩn chi tiết" : "Xem chi tiết"}
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="iv-expand">
                        <SessionList sessions={sessions} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
