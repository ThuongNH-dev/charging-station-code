import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../../layouts/MainLayout";
import StationFilters from "../../components/station/StationFilters";
import StationListItem from "../../components/station/StationListItem";
import StationMap from "../../components/station/StationMap";
import "./style/StationList.css";

import { fetchStations } from "../../api/station";

export default function StationList() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // 🔎 Search + 🏙️ City
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  // 🔢 Pagination
  const PAGE_SIZE = 6; // <= 6 trạm / trang
  const [page, setPage] = useState(1);
  const [pendingScrollId, setPendingScrollId] = useState(null);

  const itemRefs = useRef({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchStations(); // có thể truyền {page, pageSize, keyword}
        if (mounted) setStations(list || []);
      } catch (err) {
        if (mounted) setError(err?.message || "Đã có lỗi xảy ra");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const cityOptions = useMemo(() => {
    const fromData = stations.map((s) => s.city || s.addressCity || "").filter(Boolean);
    return Array.from(new Set(fromData)).sort((a, b) => a.localeCompare(b, "vi"));
  }, [stations]);

  // ✅ Lọc theo keyword + city
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const result = stations.filter((st) => {
      const stCity = st.city || st.addressCity || "";
      const hitCity = !city || stCity === city;
      const hitKW =
        !kw ||
        (st.name || "").toLowerCase().includes(kw) ||
        (st.address || "").toLowerCase().includes(kw);
      return hitCity && hitKW;
    });

    // Reset về trang 1 nếu filter thay đổi mà trang hiện tại vượt quá tổng trang
    return result;
  }, [stations, q, city]);

  // 👉 Tổng trang & data cho trang hiện tại
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Nếu filter làm tổng trang < page hiện tại thì kéo về trang cuối
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // Marker -> nhảy tới đúng trang rồi highlight item
  const handleMarkerClick = (id) => {
    const idxInFiltered = filtered.findIndex((s) => (s.id ?? s.name) === id || s.id === id);
    if (idxInFiltered === -1) return;

    const targetPage = Math.floor(idxInFiltered / PAGE_SIZE) + 1;
    setPage(targetPage);
    setPendingScrollId(id);
  };

  // Sau khi page đổi và list render, scroll & highlight
  useEffect(() => {
    if (!pendingScrollId) return;
    // chờ DOM cập nhật refs
    const t = setTimeout(() => {
      const el = itemRefs.current[pendingScrollId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("highlight-card");
        setTimeout(() => el.classList.remove("highlight-card"), 900);
      }
      setPendingScrollId(null);
    }, 50);
    return () => clearTimeout(t);
  }, [pendingScrollId, page, current]);

  // Breadcrumb-style pagination (1 … 3 4 5 … n)
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const push = (p, label = p) => {
      pages.push(
        <button
          key={label}
          className={`bp-breadcrumb ${p === page ? "active" : ""}`}
          aria-current={p === page ? "page" : undefined}
          onClick={() => setPage(p)}
        >
          {label}
        </button>
      );
    };

    const showPage = (p) => p >= 1 && p <= totalPages;

    // First
    push(1);

    // Left ellipsis
    if (page > 3) pages.push(<span key="l-ellipsis" className="bp-ellipsis">…</span>);

    // Middle neighbors
    [page - 1, page, page + 1].forEach((p) => {
      if (p !== 1 && p !== totalPages && showPage(p)) push(p);
    });

    // Right ellipsis
    if (page < totalPages - 2) pages.push(<span key="r-ellipsis" className="bp-ellipsis">…</span>);

    // Last
    if (totalPages > 1) push(totalPages);

    return (
      <nav className="bp-breadcrumbs" aria-label="Phân trang">
        <button
          className="bp-breadcrumb nav"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ← Trước
        </button>
        {pages}
        <button
          className="bp-breadcrumb nav"
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Sau →
        </button>
      </nav>
    );
  };

  return (
    <MainLayout>
      <div className="bp-container">
        <h2 className="bp-title with-mb">Danh sách trạm sạc</h2>

        <div className="bp-panel">
          <StationFilters
            context="list"
            q={q} onQChange={(v)=>{ setQ(v); setPage(1); }}
            city={city} onCityChange={(v)=>{ setCity(v); setPage(1); }}
            cityOptions={cityOptions}
            visible={{
              search: true,
              city: true,
              power: false,
              status: false,
              sortPrice: false,
              connector: false,
              speed: false,
            }}
          />
        </div>

        {loading && <div className="bp-note">Đang tải dữ liệu...</div>}
        {error && <div className="error-text">Lỗi: {error}</div>}

        {!loading && !error && (
          filtered.length === 0 ? (
            <p className="bp-subtle">Không có trạm phù hợp với điều kiện</p>
          ) : (
            <>
              <div className="bp-panel stations-map-panel">
                <div className="stations-map-canvas">
                  {/* Map vẫn nhận toàn bộ filtered để hiển thị đủ marker */}
                  <StationMap stations={filtered} onMarkerClick={handleMarkerClick} />
                </div>
              </div>

              {/* Grid 3 cột, 6 item tối đa / trang */}
              <div className="stationListGrid three-cols">
                {current.map((st) => (
                  <div
                    key={st.id ?? `${st.name}-${st.city}`}
                    ref={(el) => { if (el && st.id != null) itemRefs.current[st.id] = el; }}
                    className="stationListItemWrapper station-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/stations/${st.id}`)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(`/stations/${st.id}`)}
                    aria-label={`Xem chi tiết trạm ${st.name}`}
                  >
                    <StationListItem station={st} />
                  </div>
                ))}
              </div>

              {/* Breadcrumb-style pagination */}
              {renderPagination()}
            </>
          )
        )}
      </div>
    </MainLayout>
  );
}
