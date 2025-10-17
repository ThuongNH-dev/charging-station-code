import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "antd";

import MainLayout from "../../layouts/MainLayout";
import HoverCarousel from "../../components/others/HoverCarousel";
import StationMap from "../../components/station/StationMap";
import StationListItem from "../../components/station/StationListItem";
import { fetchStations } from "../../api/station";
import "./Homepage.css";

export default function Homepage() {
  const navigate = useNavigate();
  const { Title } = Typography;

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const itemRefs = useRef({});

  useEffect(() => {
    let mounted = true;
    fetchStations()
      .then((list) => mounted && setStations(list || []))
      .catch((err) => setError(err?.message || "Đã có lỗi xảy ra"))
      .finally(() => setLoading(false));
    return () => (mounted = false);
  }, []);

  const topStations = useMemo(() => (stations || []).slice(0, 6), [stations]);

  const handleMarkerClick = (id) => {
    const el = itemRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("highlight-card");
      setTimeout(() => el.classList.remove("highlight-card"), 900);
    }
  };

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
          {/* ===== HERO (ảnh tràn mép phải) ===== */}
          <section className="hero hero--split hero--bleed">
            <div className="hero-copy">
              <Title level={1} className="hero-title">
                Kết nối trạm sạc, tối ưu<br/>hành trình xanh
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

          {/* ===== BANNER full-bleed ===== */}
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
                <button className="btn-outline" onClick={() => navigate("/stations")}>Tìm hiểu thêm</button>
              </div>
            </div>
          </section>

          {/* ===== MAP + vài trạm nổi bật ===== */}
          <div className="mapCard">
            <div className="mapPanel">
              <div className="stations-map-canvas">
                <StationMap stations={stations} onMarkerClick={handleMarkerClick} />
              </div>
            </div>
          </div>

          {/* ===== CTA ===== */}
          <section className="find">
            <Title level={1}>Tìm trạm sạc</Title>
            <p>Xem mạng lưới các trạm sạc gần chỗ bạn.</p>
            <div className="btn-row">
              <button className="btn-primary" onClick={() => navigate("/stations")}>Xem mạng lưới</button>
              <button className="btn-outline" onClick={() => navigate("/about")}>Tìm hiểu thêm</button>
            </div>
          </section>
        </main>

        {/* ===== NEWSLETTER full-bleed ===== */}
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
                <p className="detail">Bằng cách đăng ký, Quý khách xác nhận đã đọc, hiểu và đồng ý với Chính sách Quyền riêng tư của Charger.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
