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
            context="list"
            q={q} onQChange={setQ}
            city={city} onCityChange={setCity}
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
            <div className="bp-left-col mapListLayout">
              <div className="bp-panel stations-map-panel">
                <div className="stations-map-canvas">
                  <StationMap stations={filtered} onMarkerClick={handleMarkerClick} />
                </div>
              </div>

              <div className="stationListGrid">
                {filtered.map((st) => (
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
            </div>
          )
        )}
      </div>
    </MainLayout>
  );
}
