import React, { useEffect, useMemo, useState } from "react";
import "./Feedback.css";
import { getApiBase, fetchJSON } from "../../utils/api";

const API_BASE = getApiBase();

// Che tên như "N***n"
function maskName(name = "") {
  const s = String(name).trim();
  if (s.length <= 2) return s || "Người dùng";
  return s[0] + " " + "★".repeat(Math.max(1, s.length - 2)) + " " + s[s.length - 1];
}

// Icon Avatar đơn giản
function Avatar() {
  return (
    <svg aria-hidden width="36" height="36" viewBox="0 0 24 24" className="fb-ava">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

// Icon ngôi sao
function Star({ filled }) {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      className={filled ? "fb-star fb-star--filled" : "fb-star"}
    >
      <path d="M12 2l3.09 6.29 6.95 1.01-5.02 4.89 1.19 6.93L12 18.77 5.79 21.12l1.19-6.93L1.96 9.3l6.95-1.01L12 2z" />
    </svg>
  );
}

function StarRow({ rating = 0 }) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <div className="fb-stars" aria-label={`${r} sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} filled={i < r} />
      ))}
    </div>
  );
}

// Phân trang cho modal
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

// Modal đơn giản
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

// ===== Main =====
export default function FeedbackSection() {
  const [top3, setTop3] = useState([]);
  const [loading3, setLoading3] = useState(true);
  const [error3, setError3] = useState("");

  const [open, setOpen] = useState(false);

  // Modal states
  const [all, setAll] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [errAll, setErrAll] = useState("");
  const [star, setStar] = useState(0); // 0 = tất cả
  const [page, setPage] = useState(1);
  const MODAL_PAGE_SIZE = 10;

  // Lấy 3 mới nhất
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading3(true);
        setError3("");
        const url = `${API_BASE}/feedbacks?page=1&pageSize=3`;
        const data = await fetchJSON(url);
        if (!mounted) return;
        setTop3(Array.isArray(data) ? data : data.items || []);
      } catch (e) {
        setError3("Không tải được đánh giá.");
        console.error(e);
      } finally {
        setLoading3(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // Mở modal -> lấy tất cả
  const openModal = async () => {
    setOpen(true);
    if (all.length) return;
    try {
      setLoadingAll(true);
      setErrAll("");
      const url = `${API_BASE}/feedbacks?page=1&pageSize=1000`;
      const data = await fetchJSON(url);
      const list = Array.isArray(data) ? data : data.items || [];
      setAll(list);
      setPage(1);
    } catch (e) {
      setErrAll("Không tải được danh sách đánh giá.");
      console.error(e);
    } finally {
      setLoadingAll(false);
    }
  };

  // Lọc + phân trang trong modal
  const filtered = useMemo(
    () => (star ? all.filter((x) => Number(x.rating) === star) : all),
    [all, star]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / MODAL_PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * MODAL_PAGE_SIZE;
    return filtered.slice(start, start + MODAL_PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => setPage(1), [star]);

  return (
    <section className="fb-card">
      <div className="fb-head">
        <h3 style={{fontSize: "16px"}}>Đánh giá</h3>
        <button className="fb-more" onClick={openModal} aria-label="Xem tất cả đánh giá">
          Xem tất cả
          <span className="fb-chevron" aria-hidden>›</span>
        </button>
      </div>

      {loading3 && <p className="fb-muted">Đang tải…</p>}
      {error3 && <p className="fb-err">{error3}</p>}

      <ul className="fb-list">
        {top3.map((fb) => (
          <li key={fb.id} className="fb-item">
            <div className="fb-item__left">
              <Avatar />
            </div>
            <div className="fb-item__right">
              <div className="fb-row1">
                <strong className="fb-name">{maskName(fb.userName || fb.name || "Ngdung")}</strong>
                <StarRow rating={fb.rating} />
              </div>
              <p className="fb-content">{fb.comment || fb.content || ""}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* ===== Modal ===== */}
      <Modal
        open={open}
        title="Tất cả đánh giá"
        onClose={() => setOpen(false)}
        footer={<Pager page={page} totalPages={totalPages} onChange={setPage} />}
      >
        <div className="fb-toolbar">
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
        </div>

        {loadingAll && <p className="fb-muted">Đang tải…</p>}
        {errAll && <p className="fb-err">{errAll}</p>}

        <ul className="fb-list fb-list--modal">
          {paged.map((fb) => (
            <li key={fb.id} className="fb-item">
              <div className="fb-item__left">
                <Avatar />
              </div>
              <div className="fb-item__right">
                <div className="fb-row1">
                  <strong className="fb-name">{maskName(fb.userName || fb.name || "Người dùng")}</strong>
                  <StarRow rating={fb.rating} />
                </div>
                <p className="fb-content">{fb.comment || fb.content || ""}</p>
              </div>
            </li>
          ))}
          {!loadingAll && !paged.length && (
            <li className="fb-empty">Không có đánh giá phù hợp.</li>
          )}
        </ul>
      </Modal>
    </section>
  );
}
