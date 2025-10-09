import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import GoongMiniMap from "../../components/map/GoongMiniMap";
import "./style/StationDetail.css";

const API_URL = "http://127.0.0.1:4000/stations";

export default function StationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/${id}`)
      .then(r => { if (!r.ok) throw new Error("Không tìm thấy trạm!"); return r.json(); })
      .then(data => setStation(data))
      .catch(e => setError(e.message || "Đã có lỗi xảy ra"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <MainLayout><div className="bp-container"><div className="bp-note">Đang tải dữ liệu...</div></div></MainLayout>;
  if (error)   return <MainLayout><div className="bp-container"><div className="error-text">Lỗi: {error}</div></div></MainLayout>;
  if (!station) return <MainLayout><div className="bp-container"><div className="bp-note">Không có dữ liệu trạm.</div></div></MainLayout>;

  const handleOpenBook = (chargerId) => {
    nav(`/stations/${station.id}/chargers/${chargerId}/book`);
  };

  return (
    <MainLayout>
      <div className="bp-container">
        <Link to="/stations" className="bp-back">← Quay về danh sách</Link>

        <div className="bp-add">
        <h1 className="bp-title sd-title">{station.name}</h1>
        <div className="sd-address">{station.address}</div>
        </div>
        
        {(Number.isFinite(station.lat) && Number.isFinite(station.lng)) && (
          <div className="bp-panel sd-map-panel">
            <div className="sd-map-canvas">
              <GoongMiniMap lat={station.lat} lng={station.lng} title={station.name} height={280} zoom={15} />
            </div>
          </div>
        )}

        <h2 className="bp-title with-mb">Các trụ sạc</h2>
        <div className="sd-grid">
          {(station.chargers || []).map(ch => (
            <div
              key={ch.id}
              className={`chargerItem clickable ${ch.status || ""}`}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenBook(ch.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleOpenBook(ch.id)}
              aria-label={`Đặt trụ ${ch.title || ch.id}`}
            >
              {/* Ảnh (nếu có), không thì placeholder */}
              {ch.imageUrl ? (
                <img className="thumb" src={ch.imageUrl} alt={ch.title || "Charger"} />
              ) : (
                <div className="thumb" />
              )}

              <div className="chargerBody">
                <div className="chargerTitle">{ch.title}</div>

                <div className="row">
                  <span className="label">Công suất:</span>
                  <span>{ch.power || "—"}</span>
                </div>

                <div className="row">
                  <span className="label">Tình trạng trụ:</span>
                  <span className={`statusBadge ${ch.status}`}>
                    {ch.status === "available" ? "Trống" :
                     ch.status === "busy" ? "Đang dùng" :
                     ch.status || "—"}
                  </span>
                </div>

                <div className="row">
                  <span className="label">Loại cổng sạc:</span>
                  <span>{(/type\s*2/i.test(ch.connector) && "AC") || (/(ccs|chademo)/i.test(ch.connector) && "DC") || ch.connector || "—"}</span>
                </div>

                <div className="groupTitle">Tốc độ sạc:</div>
                <ul className="bullets">
                  <li>8 – 12 tiếng cho ô tô</li>
                  <li>4 – 6 tiếng cho xe máy điện</li>
                </ul>

                <div className="row priceRow">
                  <span className="label">Giá cả:</span>
                  <span className="price">{ch.price || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
