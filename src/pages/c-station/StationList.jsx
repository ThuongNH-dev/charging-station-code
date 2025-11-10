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

// ==== helper: chuẩn hoá id về string, fallback rỗng nếu không có
const toStationId = (s) => {
  const id = s?.id ?? s?.stationId ?? s?.StationId;
  return id != null ? String(id) : "";
};

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

  // ✅ NEW: khi bấm marker, có thể chuyển qua “xem 1 trạm”
  const [selectedId, setSelectedId] = useState(null);

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

  // ✅ Lọc theo keyword + city (base list)
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

  // ✅ NEW: danh sách thực sự hiển thị (nếu đã chọn trạm -> chỉ còn 1 trạm)
  const visibleList = useMemo(() => {
    if (!selectedId) return filtered;
    const found = filtered.find((s) => toStationId(s) === String(selectedId));
    return found ? [found] : filtered;
  }, [filtered, selectedId]);

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

  // 👉 Tổng trang & data cho trang hiện tại (lưới) — dựa trên visibleList
  const totalPages = Math.max(1, Math.ceil(visibleList.length / PAGE_SIZE));
  const current = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleList.slice(start, start + PAGE_SIZE);
  }, [visibleList, page]);

  // Nếu filter làm tổng trang < page hiện tại thì kéo về trang cuối
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // Marker -> CHỈ HIỆN đúng trạm đó + scroll tới card
  const handleMarkerClick = (rawId) => {
    const idStr = String(rawId);
    setSelectedId(idStr);
    // tìm index theo visibleList (sau khi chọn chỉ còn 1, nhưng vẫn cố đảm bảo)
    const idxVisible = visibleList.findIndex((s) => toStationId(s) === idStr);
    const base = idxVisible === -1 ? filtered : visibleList;
    const pos = base.findIndex((s) => toStationId(s) === idStr);
    if (pos !== -1) {
      const targetPage = Math.floor(pos / PAGE_SIZE) + 1;
      setPage(targetPage);
      setPendingScrollId(idStr);
    }
  };

  // Sau khi list render, scroll & highlight phần tử được chọn
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

  // Helper: thông tin trạm đang chọn (nếu có)
  const selectedStation = useMemo(() => {
    if (!selectedId) return null;
    return stations.find((s) => toStationId(s) === String(selectedId)) || null;
  }, [stations, selectedId]);

  const clearSelected = () => setSelectedId(null);

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
                    {nearItems.map((st) => {
                      const sid = toStationId(st);
                      const canGo = !!sid;
                      return (
                        <div
                          key={sid || `${st.name}-${st.city}`}
                          className={`nearby-card compact station-card-clickable ${!canGo ? "disabled" : ""}`}
                          role={canGo ? "button" : "group"}
                          tabIndex={canGo ? 0 : -1}
                          title={`${st.distance.toFixed(2)} km`}
                          onClick={() => canGo && navigate(`/stations/${encodeURIComponent(sid)}`)}
                          onKeyDown={(e) => (canGo && (e.key === "Enter" || e.key === " ")) && navigate(`/stations/${encodeURIComponent(sid)}`)}
                        >
                          <StationListItem station={st} />
                          <div className="distance-chip">{st.distance.toFixed(2)} km</div>
                        </div>
                      );
                    })}
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

        {/* Banner hiển thị trạng thái chọn 1 trạm */}
        {selectedStation && (
          <div className="bp-selected-banner">
            <div className="label">
              Đang xem 1 trạm từ bản đồ:
              <strong> {selectedStation.name}</strong>
            </div>
            <button className="btn-ghost" onClick={clearSelected}>
              Hiển thị tất cả trạm
            </button>
          </div>
        )}

        {/* ===== Map ===== */}
        {loading && <div className="bp-note">Đang tải dữ liệu...</div>}
        {error && <div className="error-text">Lỗi: {error}</div>}

        {!loading && !error && (
          visibleList.length === 0 ? (
            <p className="bp-subtle">Không có trạm phù hợp với điều kiện</p>
          ) : (
            <>
              <div className="bp-panel stations-map-panel">
                <div className="stations-map-canvas">
                  {/* Map chỉ nhận visibleList (nếu chọn -> chỉ 1 marker) */}
                  <StationMap stations={selectedId ? visibleList : filtered} onMarkerClick={handleMarkerClick} />
                </div>
              </div>

              {/* ===== Grid danh sách ===== */}
              <div className={`stationListGrid three-cols ${selectedStation ? "single-selected" : ""}`}>
                {current.map((st) => {
                  const sid = toStationId(st);
                  const canGo = !!sid;
                  return (
                    <div
                      key={sid || `${st.name}-${st.city}`}
                      ref={(el) => { if (el && sid) itemRefs.current[sid] = el; }}
                      className={`stationListItemWrapper station-card-clickable ${!canGo ? "disabled" : ""}`}
                      role={canGo ? "button" : "group"}
                      tabIndex={canGo ? 0 : -1}
                      onClick={() => canGo && navigate(`/stations/${encodeURIComponent(sid)}`)}
                      onKeyDown={(e) => (canGo && (e.key === "Enter" || e.key === " ")) && navigate(`/stations/${encodeURIComponent(sid)}`)}
                      aria-label={`Xem chi tiết trạm ${st.name || sid}`}
                      title={!canGo ? "Trạm thiếu id, không thể chuyển trang" : undefined}
                    >
                      <StationListItem station={st} />
                    </div>
                  );
                })}
              </div>

              {/* ===== Pagination ===== */}
              {!selectedStation && renderPagination()}
            </>
          )
        )}
      </div>
    </MainLayout>
  );
}
