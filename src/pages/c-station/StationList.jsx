import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";          // ⬅️ thêm
import MainLayout from "../../layouts/MainLayout";
import StationFilters from "../../components/station/StationFilters";
import StationListItem from "../../components/station/StationListItem";
import StationMap from "../../components/station/StationMap";
import "./style/StationList.css";

const API_URL = "http://127.0.0.1:4000/stations";

export default function StationList() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();                       // ⬅️ thêm

  // Filters
  const [q, setQ] = useState("");
  const [connector, setConnector] = useState("");
  const [minPower, setMinPower] = useState("");

  const itemRefs = useRef({});

  useEffect(() => {
    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error("Lỗi khi tải dữ liệu!");
        return r.json();
      })
      .then((data) => setStations(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Đã có lỗi xảy ra"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const minKW = parseFloat(minPower) || 0;
    return stations.filter((st) => {
      const hitKW =
        !kw ||
        (st.name || "").toLowerCase().includes(kw) ||
        (st.address || "").toLowerCase().includes(kw);
      const hitConnector =
        !connector ||
        (st.chargers || []).some(
          (c) => (c.connector || "").toLowerCase() === connector.toLowerCase()
        );
      const hitPower =
        !minKW ||
        (st.chargers || []).some((c) => {
          const m = String(c.power || "").match(/([\d.]+)/);
          const kwVal = m ? parseFloat(m[1]) : 0;
          return kwVal >= minKW;
        });
      return hitKW && hitConnector && hitPower;
    });
  }, [stations, q, connector, minPower]);

  const handleMarkerClick = (id) => {
    const el = itemRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("highlight-card");
      setTimeout(() => el.classList.remove("highlight-card"), 900);
    }
  };

  return (
    <MainLayout>
      <div className="bp-container">
        <h2 className="bp-title with-mb">Danh sách trạm sạc</h2>

        <div className="bp-panel">
          <StationFilters
            q={q}
            onQChange={setQ}
            connector={connector}
            onConnectorChange={setConnector}
            minPower={minPower}
            onMinPowerChange={setMinPower}
          />
        </div>

        {loading && <div className="bp-note">Đang tải dữ liệu...</div>}
        {error && <div className="error-text">Lỗi: {error}</div>}

        {!loading && !error && (
          filtered.length === 0 ? (
            <p className="bp-subtle">Không có trạm phù hợp với bộ lọc</p>
          ) : (
            <div className="bp-left-col mapListLayout">
              <div className="bp-panel stations-map-panel">
                <div className="stations-map-canvas">
                  <StationMap stations={filtered} onMarkerClick={handleMarkerClick} />
                </div>
              </div>

              <div className="stationListGrid">
                {filtered.map((st) => (
                  <div
                    key={st.id}
                    ref={(el) => { if (el) itemRefs.current[st.id] = el; }}
                    className="stationListItemWrapper station-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/stations/${st.id}`)}               // ⬅️ click thẳng card
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(`/stations/${st.id}`)}
                    aria-label={`Xem chi tiết trạm ${st.name}`}
                  >
                    <StationListItem station={st} />
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </MainLayout>
  );
}
