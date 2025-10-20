import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "antd";

import MainLayout from "../../layouts/MainLayout";
import HoverCarousel from "../../components/others/HoverCarousel";
import StationMap from "../../components/station/StationMap";
import StationListItem from "../../components/station/StationListItem";
import { fetchStations } from "../../api/station";
import { getApiBase } from "../../utils/api";
import "./Homepage.css";

const API_BASE = getApiBase();

export default function Homepage() {
  const navigate = useNavigate();
  const { Title } = Typography;

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const itemRefs = useRef({});
  const [selectedStationId, setSelectedStationId] = useState(null);

  // ==== Pagination ====
  const PER_PAGE = 3;
  const [page, setPage] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((stations?.length || 0) / PER_PAGE)),
    [stations]
  );

  const pageItems = useMemo(() => {
    const start = page * PER_PAGE;
    return (stations || []).slice(start, start + PER_PAGE);
  }, [stations, page]);

  // ==== Fetch Stations ====
  useEffect(() => {
    let mounted = true;
    fetchStations()
      .then((list) => mounted && setStations(list || []))
      .catch((err) => mounted && setError(err?.message || "Đã có lỗi xảy ra"))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  // ==== Marker Click ====
  const handleMarkerClick = (id) => {
    const idx = (stations || []).findIndex(
      (s) => String(s.id) === String(id)
    );
    if (idx >= 0) {
      const targetPage = Math.floor(idx / PER_PAGE);
      setPage(targetPage);
      setSelectedStationId(id);
      setTimeout(() => {
        const el = itemRefs.current[id];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add("highlight-card");
          setTimeout(() => el.classList.remove("highlight-card"), 900);
        }
      }, 50);
    }
  };

  // ==== Pagination controls ====
  const gotoPrev = () => setPage((p) => (p > 0 ? p - 1 : totalPages - 1));
  const gotoNext = () => setPage((p) => (p < totalPages - 1 ? p + 1 : 0));
  const gotoPage = (i) => setPage(i);

  const pics = [
    "/homepage/component1.jpg",
    "/homepage/component2.jpg",
    "/homepage/component3.jpg",
    "/homepage/component4.jpg",
  ];

  return (
    <MainLayout>
      <div className="homepage-container">
        <main className="homepage-content">
          {/* ===== HERO ===== */}
          <section className="hero hero--split hero--bleed">
            <div className="hero-copy">
              <Title level={1} className="hero-title">
                Kết nối trạm sạc, tối ưu<br />hành trình xanh
              </Title>
              <p className="hero-sub">
                Trạm sạc điện thông minh – tìm kiếm, đặt chỗ và thanh toán chỉ trong một chạm
              </p>
              <button className="btn-hero" onClick={() => navigate("/stations")}>
                Đặt chỗ ngay!
              </button>
            </div>

            <div className="hero-media hero-media--bleed">
              <HoverCarousel images={pics} width={380} height={520} radius={15} />
            </div>
          </section>

          {/* ===== BANNER ===== */}
          <section className="banner banner--bleed">
            <img src="/homepage/homepage4.webp" alt="banner" />
            <div className="overlay-dark"></div>
            <div className="banner-caption">
              <Title level={1}>Trạm sạc thông minh</Title>
              <p>Kết nối trạm sạc thông minh, hành trình luôn sẵn sàng</p>
              <div className="banner-buttons">
                <button className="btn-primary" onClick={() => navigate("/stations")}>
                  Đặt hàng
                </button>
                <button className="btn-outline" onClick={() => navigate("/stations")}>
                  Tìm hiểu thêm
                </button>
              </div>
            </div>
          </section>

          {/* ===== MAP ===== */}
          <div className="mapCard">
            <div className="mapPanel">
              <div className="stations-map-canvas">
                <StationMap stations={stations} onMarkerClick={handleMarkerClick} />
              </div>
            </div>
          </div>

          {/* ===== STRIP 3 TRẠM ===== */}
          <section className="station-strip">
            <div className="strip-head">
              <Title level={2} style={{ margin: 0 }}>
                Trạm sạc nổi bật
              </Title>
              {!loading}
            </div>

            {loading ? (
              <div className="note">Đang tải dữ liệu...</div>
            ) : error ? (
              <div className="error">Lỗi: {error}</div>
            ) : (stations || []).length === 0 ? (
              <div className="note">Chưa có trạm nào.</div>
            ) : (
              <>
                <div className="strip-body">
                  <button className="nav-arrow left" onClick={gotoPrev} aria-label="Trang trước">
                    ‹
                  </button>

                  <div className="strip-viewport">
                    <div className="strip-row stations-3-col">
                      {pageItems.map((st) => (
                        <div
                          key={st.id ?? `${st.name}-${st.city}`}
                          ref={(el) => {
                            if (el && st.id != null) itemRefs.current[st.id] = el;
                          }}
                          className={`station-card stationListItemWrapper station-card-clickable${
                            String(st.id) === String(selectedStationId) ? " highlight-card" : ""
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/stations/${st.id}`)}
                          onKeyDown={(e) =>
                            (e.key === "Enter" || e.key === " ") &&
                            navigate(`/stations/${st.id}`)
                          }
                          aria-label={`Xem chi tiết trạm ${st.name}`}
                        >
                          <StationListItem station={st} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="nav-arrow right" onClick={gotoNext} aria-label="Trang sau">
                    ›
                  </button>
                </div>

                <div className="dots">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`dot ${i === page ? "active" : ""}`}
                      onClick={() => gotoPage(i)}
                      aria-label={`Trang ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* ===== CTA ===== */}
          <section className="find">
            <Title level={1}>Tìm trạm sạc</Title>
            <p>Xem mạng lưới các trạm sạc gần chỗ bạn.</p>
            <div className="btn-row">
              <button className="btn-primary" onClick={() => navigate("/stations")}>
                Xem mạng lưới
              </button>
              <button className="btn-outline" onClick={() => navigate("/about")}>
                Tìm hiểu thêm
              </button>
            </div>
          </section>

          {/* ===== NEWSLETTER ===== */}
          <section className="newsletter newsletter--bleed">
            <img src="/homepage/homepage3.webp" alt="newsletter" />
            <div className="overlay-dark"></div>
            <div className="nl-overlay">
              <div className="nl-content">
                <Title level={1}>Đăng ký nhận thông tin</Title>
                <p>Đừng bỏ lỡ chương trình khuyến mãi và cập nhật về trạm sạc.</p>
                <div className="newsletter-input">
                  <input type="email" placeholder="Hãy nhập email của bạn" />
                  <button className="btn-black">Đăng Ký</button>
                  <p className="detail">
                    Bằng cách đăng ký, Quý khách xác nhận đã đọc, hiểu và đồng ý với Chính sách Quyền riêng tư của Charger.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </MainLayout>
  );
}
