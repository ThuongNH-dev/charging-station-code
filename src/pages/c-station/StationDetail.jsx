import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import GoongMiniMap from "../../components/map/GoongMiniMap";
import StationFilters from "../../components/station/StationFilters";
import "./style/StationDetail.css";

const API_URL = "http://127.0.0.1:4000/stations";

export default function StationDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔎 Search + các filter (TRỪ địa điểm)
  const [q, setQ] = useState("");
  const [connector, setConnector] = useState("");
  const [minPower, setMinPower] = useState("");
  const [status, setStatus] = useState("");
  const [sortPrice, setSortPrice] = useState("");
  const [speed, setSpeed] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Không tìm thấy trạm!");
        return r.json();
      })
      .then((data) => alive && setStation(data))
      .catch((e) => setError(e.message || "Đã có lỗi xảy ra"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  const handleOpenBook = (chargerId) => {
    nav(`/stations/${id}/chargers/${chargerId}/book`);
  };

  // toạ độ (đảm bảo là số)
  const lat = Number(station?.lat);
  const lng = Number(station?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  // ===== Options filter lấy từ chargers =====
  const {
    connectorOptions,
    powerOptions,
    statusOptions,
    speedOptions,
  } = useMemo(() => {
    const chargers = Array.isArray(station?.chargers) ? station.chargers : [];
    const connectors = Array.from(new Set(chargers.map(c => (c.connector || "").trim()).filter(Boolean)));
    const powers = Array.from(new Set(chargers.map(c => (c.power || "").trim()).filter(Boolean)));
    const statuses = Array.from(new Set(chargers.map(c => (c.status || "").trim()).filter(Boolean)));
    const speeds = Array.from(new Set(chargers.map(c => (c.speed || "").trim()).filter(Boolean)));
    return {
      connectorOptions: connectors.length ? connectors : ["Type 2", "CCS", "CHAdeMO"],
      powerOptions: powers.length ? powers : ["7 kW", "22 kW", "60 kW", "120 kW"],
      statusOptions: statuses.length ? statuses : ["available", "busy", "maintenance"],
      speedOptions: speeds.length ? speeds : ["Chậm", "Nhanh"],
    };
  }, [station]);

  // ===== Lọc + sắp xếp danh sách TRỤ SẠC (luôn có grid) =====
  const filteredChargers = useMemo(() => {
    const chargers = Array.isArray(station?.chargers) ? station.chargers : [];
    const kw = q.trim().toLowerCase();
    const minKW = parseFloat(minPower) || 0;

    const parsePower = (p) => {
      const m = String(p || "").match(/([\d.]+)/);
      return m ? parseFloat(m[1]) : 0;
    };
    const parsePrice = (p) => {
      const m = String(p || "").replace(/,/g, "").match(/([\d.]+)/);
      return m ? parseFloat(m[1]) : Number.POSITIVE_INFINITY;
    };

    let list = chargers.filter((c) => {
      const title = String(c.title || c.id || "").toLowerCase();
      const conn  = String(c.connector || "").toLowerCase();
      const stt   = String(c.status || "").toLowerCase();
      const spd   = String(c.speed || "").toLowerCase();

      const hitKW = !kw || title.includes(kw) || conn.includes(kw);
      const hitConnector = !connector || conn === connector.toLowerCase();
      const hitStatus = !status || stt === status.toLowerCase();
      const hitSpeed = !speed || spd === speed.toLowerCase();
      const hitPower = !minKW || parsePower(c.power) >= minKW;

      return hitKW && hitConnector && hitStatus && hitSpeed && hitPower;
    });

    if (sortPrice === "asc") {
      list = [...list].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortPrice === "desc") {
      list = [...list].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }

    return list;
  }, [station, q, connector, minPower, status, speed, sortPrice]);

  if (loading) {
    return (
      <MainLayout>
        <div className="bp-container"><div className="bp-note">Đang tải dữ liệu...</div></div>
      </MainLayout>
    );
  }
  if (error) {
    return (
      <MainLayout>
        <div className="bp-container"><div className="error-text">Lỗi: {error}</div></div>
      </MainLayout>
    );
  }
  if (!station) {
    return (
      <MainLayout>
        <div className="bp-container"><div className="bp-note">Không có dữ liệu trạm.</div></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bp-container">
        <Link to="/stations" className="bp-back">← Quay về danh sách</Link>

        <div className="bp-add">
          <h1 className="bp-title sd-title">{station.name}</h1>
          <div className="sd-address">{station.address}</div>
        </div>

        {/* ⬆️ FILTER LUÔN HIỂN THỊ (trước map) */}
        <div className="bp-panel sd-filter-sticky" style={{ marginTop: 16 }}>
          <StationFilters
            context="detail"
            // search
            q={q} onQChange={setQ}
            // filters (trừ city)
            connector={connector} onConnectorChange={setConnector}
            power={minPower} onPowerChange={setMinPower}
            status={status} onStatusChange={setStatus}
            sortPrice={sortPrice} onSortPriceChange={setSortPrice}
            speed={speed} onSpeedChange={setSpeed}
            // options
            connectorOptions={connectorOptions}
            powerOptions={powerOptions}
            statusOptions={statusOptions}
            speedOptions={speedOptions}
            // ẩn city, bật các filter khác
            visible={{
              search: true,
              connector: true,
              power: true,
              status: true,
              sortPrice: true,
              speed: true,
              city: false,
            }}
          />
          {/* <div className="bp-subtle" style={{ marginTop: 8 }}>
            {filteredChargers.length} / {(station.chargers || []).length} trụ hiển thị
          </div> */}
        </div>

        {/* MAP */}
        {hasCoords && (
          <div className="bp-panel sd-map-panel">
            <div className="sd-map-canvas">
              <GoongMiniMap lat={lat} lng={lng} title={station.name} height={280} zoom={15} />
            </div>
          </div>
        )}

        {/* DANH SÁCH TRỤ — luôn render grid, không thay thế bằng thông điệp */}
        <h2 className="bp-title with-mb">Các trụ sạc</h2>

        {/* Nếu không khớp filter, hiển thị note NHƯNG vẫn giữ grid phía dưới */}
        {filteredChargers.length === 0 && (
          <p className="bp-subtle">Không có trụ phù hợp với bộ lọc</p>
        )}

        <div className="sd-grid">
          {filteredChargers.length > 0 ? (
            filteredChargers.map((ch) => {
              const statusClass = ch.status || "unknown";
              const connectorText =
                (/type\s*2/i.test(ch.connector || "") && "AC") ||
                (/(ccs|chademo)/i.test(ch.connector || "") && "DC") ||
                ch.connector || "—";

              return (
                <div
                  key={ch.id}
                  className={`chargerItem clickable ${statusClass}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenBook(ch.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleOpenBook(ch.id)}
                  aria-label={`Đặt trụ ${ch.title || ch.id}`}
                >
                  {ch.imageUrl ? (
                    <img className="thumb" src={ch.imageUrl} alt={ch.title || "Charger"} loading="lazy" />
                  ) : (
                    <div className="thumb" />
                  )}

                  <div className="chargerBody">
                    <div className="chargerTitle">{ch.title || ch.id}</div>

                    <div className="row">
                      <span className="label">Công suất:</span>
                      <span>{ch.power || "—"}</span>
                    </div>

                    <div className="row">
                      <span className="label">Tình trạng trụ:</span>
                      <span className={`statusBadge ${statusClass}`}>
                        {statusClass === "available" ? "Trống"
                          : statusClass === "busy" ? "Đang dùng"
                          : statusClass}
                      </span>
                    </div>

                    <div className="row">
                      <span className="label">Loại cổng sạc:</span>
                      <span>{connectorText}</span>
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
              );
            })
          ) : (
            // Giữ grid có 1 thẻ “empty state” để layout không nhảy
            <div className="chargerItem empty">
              <div className="thumb" />
              <div className="chargerBody">
                <div className="chargerTitle">Không có trụ hiển thị</div>
                <div className="row">
                  <span className="label">Gợi ý:</span>
                  <span>Thử bỏ bớt bộ lọc hoặc xoá từ khóa.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
