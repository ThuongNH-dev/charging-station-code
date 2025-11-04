import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../../layouts/MainLayout";
import StationFilters from "../../components/station/StationFilters";
import StationListItem from "../../components/station/StationListItem";
import StationMap from "../../components/station/StationMap";
import "./style/StationList.css";

import { fetchStations } from "../../api/station";

const PAGE_SIZE = 6;            // danh sách lưới
const NEAR_LIMIT = 12;          // lấy tối đa 12 trạm gần (để có vài trang)
const DEFAULT_RADIUS_KM = 10;   // bán kính lọc “gần bạn”
const NEAR_PER_PAGE = 3;        // 3 card / trang cho strip

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StationList() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // 🔎 Search + 🏙️ City
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  // 🔢 Pagination cho lưới
  const [page, setPage] = useState(1);
  const [pendingScrollId, setPendingScrollId] = useState(null);

  const itemRefs = useRef({});

  // 📍 Geolocation
  const [userPos, setUserPos] = useState(null); // {lat, lng}
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchStations();
        if (mounted) setStations(list || []);
      } catch (err) {
        if (mounted) setError(err?.message || "Đã có lỗi xảy ra");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const askGeolocation = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => setGeoError(err?.message || "Không thể truy cập vị trí."),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
  };

  // gọi 1 lần khi vào trang
  useEffect(() => { askGeolocation(); }, []);

  const cityOptions = useMemo(() => {
    const fromData = stations.map((s) => s.city || s.addressCity || "").filter(Boolean);
    return Array.from(new Set(fromData)).sort((a, b) => a.localeCompare(b, "vi"));
  }, [stations]);

  // ✅ Lọc theo keyword + city (cho Map + Grid)
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return stations.filter((st) => {
      const stCity = st.city || st.addressCity || "";
      const hitCity = !city || stCity === city;
      const hitKW =
        !kw ||
        (st.name || "").toLowerCase().includes(kw) ||
        (st.address || "").toLowerCase().includes(kw);
      return hitCity && hitKW;
    });
  }, [stations, q, city]);

  // 👇 “Trạm sạc gần bạn” — dùng full data (độc lập filter)
  const nearbyStations = useMemo(() => {
    if (!userPos || !Array.isArray(stations)) return [];
    return stations
      .map((s) => {
        const lat = Number(s.latitude ?? s.lat);
        const lng = Number(s.longitude ?? s.lng);
        const valid = Number.isFinite(lat) && Number.isFinite(lng);
        const distance = valid ? haversineKm(userPos.lat, userPos.lng, lat, lng) : Infinity;
        return { ...s, distance };
      })
      .filter((s) => s.distance < Infinity && s.distance <= DEFAULT_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, NEAR_LIMIT);
  }, [stations, userPos]);

  // 🔢 Phân trang cho strip gần bạn
  const [nearPage, setNearPage] = useState(0);
  const nearTotalPages = Math.max(1, Math.ceil(nearbyStations.length / NEAR_PER_PAGE));
  const nearItems = useMemo(() => {
    const start = nearPage * NEAR_PER_PAGE;
    return nearbyStations.slice(start, start + NEAR_PER_PAGE);
  }, [nearbyStations, nearPage]);
  const nearPrev = () => setNearPage(p => (p > 0 ? p - 1 : nearTotalPages - 1));
  const nearNext = () => setNearPage(p => (p < nearTotalPages - 1 ? p + 1 : 0));
  const nearGoto = (i) => setNearPage(i);

  // 👉 Tổng trang & data cho trang hiện tại (lưới)
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

        {/* ===== Filters ===== */}
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

        {/* ===== NEARBY STRIP — trước Map, trước Grid ===== */}
        <section className="nearby-strip bp-panel">
          <div className="nearby-head">
            <h3 className="nearby-title">Trạm sạc gần bạn</h3>

            {userPos ? (
              <span className="pill ok">📍 {userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}</span>
            ) : geoError ? (
              <span className="pill warn">⚠️ {geoError}</span>
            ) : (
              <span className="pill">Đang xác định vị trí...</span>
            )}

            <button className="btn-ghost" onClick={askGeolocation} style={{ marginLeft: "auto" }}>
              Lấy lại vị trí
            </button>
          </div>

          {userPos && nearbyStations.length > 0 ? (
            <>
              <div className="nearby-strip-body">
                <button
                  className="nav-arrow left"
                  onClick={nearPrev}
                  aria-label="Trang trước"
                >
                  ‹
                </button>

                <div className="nearby-viewport">
                  <div className="nearby-row">
                    {nearItems.map((st) => (
                      <div
                        key={st.id ?? `${st.name}-${st.city}`}
                        className="nearby-card compact station-card-clickable"
                        role="button"
                        tabIndex={0}
                        title={`${st.distance.toFixed(2)} km`}
                        onClick={() => navigate(`/stations/${st.id}`)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(`/stations/${st.id}`)}
                      >
                        <StationListItem station={st} />
                        <div className="distance-chip">{st.distance.toFixed(2)} km</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className="nav-arrow right"
                  onClick={nearNext}
                  aria-label="Trang sau"
                >
                  ›
                </button>
              </div>

              <div className="dots">
                {Array.from({ length: nearTotalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`dot ${i === nearPage ? "active" : ""}`}
                    onClick={() => nearGoto(i)}
                    aria-label={`Trang ${i + 1}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="bp-subtle">
              {userPos
                ? `Không có trạm nào trong bán kính ${DEFAULT_RADIUS_KM}km quanh bạn.`
                : `Hãy bật quyền định vị để xem trạm gần bạn.`}
            </p>
          )}
        </section>

        {/* ===== Map ===== */}
        {loading && <div className="bp-note">Đang tải dữ liệu...</div>}
        {error && <div className="error-text">Lỗi: {error}</div>}

        {!loading && !error && (
          filtered.length === 0 ? (
            <p className="bp-subtle">Không có trạm phù hợp với điều kiện</p>
          ) : (
            <>
              <div className="bp-panel stations-map-panel">
                <div className="stations-map-canvas">
                  <StationMap stations={filtered} onMarkerClick={handleMarkerClick} />
                </div>
              </div>

              {/* ===== Grid danh sách ===== */}
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

              {/* ===== Pagination ===== */}
              {renderPagination()}
            </>
          )
        )}
      </div>
    </MainLayout>
  );
}
