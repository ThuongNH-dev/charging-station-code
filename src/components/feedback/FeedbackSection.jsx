// src/components/feedback/FeedbackSection.jsx
import React from "react";

/**
 * Props:
 * - apiBase: string (vd "https://localhost:7268/api")
 * - stationId: number|string  ✅ bắt buộc (chỉ lọc theo trạm)
 * - pageSize?: number         (mặc định 10, áp dụng cho modal)
 * - initialCount?: number     (mặc định 3, số item rút gọn ngoài panel)
 * - className?: string        (vd "bp-feedback" từ BookingPorts)
 * - style?: React.CSSProperties
 *
 * Bố cục & className giữ nguyên ở phần list:
 *  - section.wrapper -> className
 *  - .bp-panel
 *  - .bp-title
 *  - ul.bp-review-list > li.bp-review-item
 *  - .bp-review  (gồm .bp-avatar + phần nội dung)
 *  - .bp-review-head: <b>{name}</b><span>⭐️⭐️⭐️...</span>
 *  - .bp-subtle cho comment
 *
 * Phần “Xem tất cả” dùng Modal (class fb-*) giống code cũ để tránh ảnh hưởng layout bên ngoài.
 */

const toNum = (v) => (v == null || v === "" ? NaN : Number(v));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const fmtTime = (v) => (v ? new Date(v).toLocaleString("vi-VN") : "—");

// ⭐️ sao kiểu emoji — như Review cũ của bạn
function renderStarsEmoji(n) {
  const v = clamp(Number(n) || 0, 0, 5);
  return "⭐️".repeat(v) + "☆".repeat(5 - v);
}

/* ---------- Modal + Pager như phiên bản cũ đã sửa ---------- */
function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const nums = [];
  const push = (n) =>
    nums.push(
      <button
        key={`p${n}`}
        className={`fb-page ${n === page ? "is-active" : ""}`}
        onClick={() => onChange(n)}
        disabled={n === page}
        aria-current={n === page ? "page" : undefined}
      >
        {n}
      </button>
    );

  const windowSize = 1;
  const addEllipsis = (key) => nums.push(<span key={key} className="fb-ellipsis">…</span>);

  nums.push(
    <button
      key="prev"
      className="fb-page fb-page--ghost"
      onClick={() => onChange(Math.max(1, page - 1))}
      disabled={page === 1}
    >
      ← Trước
    </button>
  );

  push(1);
  let start = Math.max(2, page - windowSize);
  let end = Math.min(totalPages - 1, page + windowSize);
  if (start > 2) addEllipsis("e1");
  for (let n = start; n <= end; n++) push(n);
  if (end < totalPages - 1) addEllipsis("e2");
  if (totalPages > 1) push(totalPages);

  nums.push(
    <button
      key="next"
      className="fb-page fb-page--ghost"
      onClick={() => onChange(Math.min(totalPages, page + 1))}
      disabled={page === totalPages}
    >
      Sau →
    </button>
  );

  return <div className="fb-pager">{nums}</div>;
}

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fb-modal-backdrop" role="dialog" aria-modal="true">
      <div className="fb-modal">
        <header className="fb-modal__header">
          <h3>{title}</h3>
          <button className="fb-close" onClick={onClose} aria-label="Đóng">×</button>
        </header>
        <div className="fb-modal__body">{children}</div>
        {footer && <footer className="fb-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}

/* ------------------------- Component chính ------------------------- */
export default function FeedbackSection({
  apiBase,
  stationId,
  pageSize = 10,
  initialCount = 3,
  className,
  style,
}) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  const sId = toNum(stationId);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);

  // modal state
  const [open, setOpen] = React.useState(false);
  const [star, setStar] = React.useState(0); // 0 = tất cả
  const [page, setPage] = React.useState(1);

  const abortRef = React.useRef(null);

  // fetch cho outside (lấy dư một chút để chắc chắn đủ sau lọc client)
  const fetchOutside = React.useCallback(
    async () => {
      if (!Number.isFinite(sId)) return;
      setLoading(true);
      setError("");

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const qs = new URLSearchParams();
        qs.set("page", "1");
        qs.set("pageSize", String(Math.max(initialCount, 10)));
        qs.set("stationId", String(sId)); // nếu BE hỗ trợ sẽ filter server-side
        const url = `${base}/feedbacks?${qs.toString()}`;

        const res = await fetch(url, {
          method: "GET",
          headers: { accept: "application/json, */*" },
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`GET /feedbacks ${res.status}: ${text}`);
        }
        const data = await res.json();

        const raw = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

        // luôn đảm bảo lọc client-side theo stationId
        const filtered = raw.filter(
          (rv) => Number(rv?.stationId ?? rv?.StationId) === sId
        );

        // sắp xếp mới nhất trước (nếu có createdAt)
        filtered.sort((a, b) => {
          const ta = Date.parse(a?.createdAt || "") || 0;
          const tb = Date.parse(b?.createdAt || "") || 0;
          return tb - ta;
        });

        setItems(filtered);
        const serverTotal = Number(data?.total);
        setTotal(Number.isFinite(serverTotal) ? serverTotal : filtered.length);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("[FeedbackSection] fetchOutside error:", e);
          setError(e?.message || "Không tải được đánh giá.");
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
      }
    },
    [base, sId, initialCount]
  );

  // fetch dành cho modal (lấy nhiều)
  const fetchForModal = React.useCallback(
    async () => {
      if (!Number.isFinite(sId)) return;
      setLoading(true);
      setError("");

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const qs = new URLSearchParams();
        qs.set("page", "1");
        qs.set("pageSize", "1000"); // gom hết để lọc/phan trang client-side
        qs.set("stationId", String(sId));
        const url = `${base}/feedbacks?${qs.toString()}`;

        const res = await fetch(url, {
          method: "GET",
          headers: { accept: "application/json, */*" },
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`GET /feedbacks ${res.status}: ${text}`);
        }
        const data = await res.json();

        const raw = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

        const filtered = raw.filter(
          (rv) => Number(rv?.stationId ?? rv?.StationId) === sId
        );

        filtered.sort((a, b) => {
          const ta = Date.parse(a?.createdAt || "") || 0;
          const tb = Date.parse(b?.createdAt || "") || 0;
          return tb - ta;
        });

        setItems(filtered); // dùng chung items cho cả outside + modal
        const serverTotal = Number(data?.total);
        setTotal(Number.isFinite(serverTotal) ? serverTotal : filtered.length);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("[FeedbackSection] fetchForModal error:", e);
          setError(e?.message || "Không tải được đánh giá.");
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
      }
    },
    [base, sId]
  );

  // nạp lần đầu + khi stationId đổi
  React.useEffect(() => {
    setItems([]);
    setTotal(0);
    setStar(0);
    setPage(1);
    if (Number.isFinite(sId)) fetchOutside();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sId]);

  // danh sách hiển thị rút gọn ở ngoài
  const shortList = React.useMemo(() => {
    return items.slice(0, clamp(initialCount, 0, 100));
  }, [items, initialCount]);

  // mở modal -> nếu đang có ít dữ liệu thì fetch đầy
  const openModal = React.useCallback(async () => {
    setOpen(true);
    // nếu đã có > initialCount thì coi như đã đủ cho modal
    if (items.length > initialCount) return;
    await fetchForModal();
  }, [items.length, initialCount, fetchForModal]);

  // lọc theo sao trong modal
  const modalFiltered = React.useMemo(() => {
    const list = star ? items.filter((x) => Number(x.rating) === star) : items;
    return list;
  }, [items, star]);

  const totalPages = Math.max(1, Math.ceil(modalFiltered.length / pageSize));
  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return modalFiltered.slice(start, start + pageSize);
  }, [modalFiltered, page, pageSize]);

  React.useEffect(() => setPage(1), [star]);

  return (
    <section className={className || ""} style={style}>
      <div className="bp-panel">
        <div className="bp-title">Đánh giá trạm</div>

        {!Number.isFinite(sId) ? (
          <div className="bp-hint">Không xác định stationId.</div>
        ) : loading && items.length === 0 ? (
          <div className="bp-hint">Đang tải đánh giá…</div>
        ) : error ? (
          <div className="error-text">Lỗi: {error}</div>
        ) : items.length === 0 ? (
          <div className="bp-hint">Chưa có đánh giá cho trạm này.</div>
        ) : (
          <>
            {/* Outside (rút gọn) */}
            <ul className="bp-review-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {shortList.map((rv) => (
                <li key={rv.feedbackId ?? rv.id} className="bp-review-item" style={{ marginBottom: 12 }}>
                  <div className="bp-review">
                    <div className="bp-avatar">
                      {(rv.customerName || "N")[0].toUpperCase()}
                    </div>

                    <div>
                      <div className="bp-review-head">
                        <b>{rv.customerName || `Khách #${rv.customerId || "?"}`}</b>
                        <span>
                          {renderStarsEmoji(rv.rating)}
                          <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>
                            {fmtTime(rv.createdAt)}
                          </span>
                        </span>
                      </div>
                      <div className="bp-subtle">{rv.comment || ""}</div>
                      {(rv.chargerCode || rv.portCode) && (
                        <div className="bp-subtle" style={{ marginTop: 4 }}>
                          {rv.chargerCode ? `Trụ: ${rv.chargerCode}` : ""}
                          {rv.portCode ? ` • Cổng: ${rv.portCode}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Button mở modal */}
            <button
              className="bp-btn-secondary"
              style={{ marginTop: 8 }}
              onClick={openModal}
            >
              Xem tất cả ({items.length})
            </button>
          </>
        )}
      </div>

      {/* ===== Modal “Xem tất cả” ===== */}
      <Modal
        open={open}
        title="Tất cả đánh giá"
        onClose={() => setOpen(false)}
        footer={<Pager page={page} totalPages={totalPages} onChange={setPage} />}
      >
        <div className="fb-toolbar" style={{ marginBottom: 8 }}>
          <label>
            Lọc theo sao:&nbsp;
            <select
              className="fb-select"
              value={star}
              onChange={(e) => setStar(Number(e.target.value))}
            >
              <option value={0}>Tất cả</option>
              <option value={5}>5 sao</option>
              <option value={4}>4 sao</option>
              <option value={3}>3 sao</option>
              <option value={2}>2 sao</option>
              <option value={1}>1 sao</option>
            </select>
          </label>
          {loading && <span className="bp-hint" style={{ marginLeft: 12 }}>Đang tải…</span>}
          {error && <span className="error-text" style={{ marginLeft: 12 }}>Lỗi: {error}</span>}
        </div>

        {modalFiltered.length === 0 && !loading ? (
          <div className="bp-hint">Không có đánh giá phù hợp.</div>
        ) : (
          <ul className="bp-review-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {paged.map((rv) => (
              <li key={rv.feedbackId ?? rv.id} className="bp-review-item" style={{ marginBottom: 12 }}>
                <div className="bp-review">
                  <div className="bp-avatar" />
                  <div>
                    <div className="bp-review-head">
                      <b>{rv.customerName || `Khách #${rv.customerId || "?"}`}</b>
                      <span>
                        {renderStarsEmoji(rv.rating)}
                        <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>
                          {fmtTime(rv.createdAt)}
                        </span>
                      </span>
                    </div>
                    <div className="bp-subtle">{rv.comment || ""}</div>
                    {(rv.chargerCode || rv.portCode) && (
                      <div className="bp-subtle" style={{ marginTop: 4 }}>
                        {rv.chargerCode ? `Trụ: ${rv.chargerCode}` : ""}
                        {rv.portCode ? ` • Cổng: ${rv.portCode}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </section>
  );
}
