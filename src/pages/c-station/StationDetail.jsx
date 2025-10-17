import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import GoongMiniMap from "../../components/map/GoongMiniMap";
import StationFilters from "../../components/station/StationFilters";
import "./style/StationDetail.css";

// API base (ưu tiên .env)
const API_BASE =
  (typeof import.meta !== "undefined" ? import.meta.env.VITE_API_URL : process.env.REACT_APP_API_URL)
  ?? "https://localhost:7268/api";

// ---------- Helpers ----------
function normalizeStation(s = {}) {
  return {
    id: s.id ?? s.stationId ?? s.StationId,
    name: s.name ?? s.stationName ?? s.StationName ?? "",
    address: s.address ?? s.Address ?? "",
    city: s.city ?? s.City ?? "",
    lat: parseFloat(s.lat ?? s.latitude ?? s.Latitude),
    lng: parseFloat(s.lng ?? s.longitude ?? s.Longitude),
    imageUrl: s.imageUrl ?? s.ImageUrl ?? "",
    status: s.status ?? s.Status ?? "Active",
  };
}

function normalizeCharger(c = {}) {
  return {
    id: c.chargerId ?? c.ChargerId,
    stationId: c.stationId ?? c.StationId,
    title: c.code ?? c.Code ?? `Trụ #${c.ChargerId}`,
    connector: c.type ?? c.Type ?? "",
    power: c.powerKw ?? c.PowerKW ? `${c.powerKw ?? c.PowerKW} kW` : "",
    status: (c.status ?? c.Status ?? "").toLowerCase(),
    imageUrl: c.imageUrl ?? c.ImageUrl ?? "",
  };
}


function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("id_token") ||
    "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON(url, init = {}) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function fetchJSONAuth(url) {
  // Gửi kèm Bearer (nếu có) và cookie (credentials)
  return fetchJSON(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
  });
}

// ---------- Component ----------
export default function StationDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [station, setStation] = useState(null);
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authNeeded, setAuthNeeded] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [connector, setConnector] = useState("");
  const [minPower, setMinPower] = useState("");
  const [status, setStatus] = useState("");
  const [sortPrice, setSortPrice] = useState("");
  const [speed, setSpeed] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setAuthNeeded(false);

        // 1) Lấy trạm
        const stationRaw = await fetchJSON(`${API_BASE}/Stations/${id}`);
        const st = normalizeStation(stationRaw);
        if (!alive) return;

        // 2) Lấy trụ — thử lần lượt các route, có auth
        let list = [];
        let lastErr = null;

        const tryRoutes = [
          `${API_BASE}/Chargers?stationId=${st.id}`,
          `${API_BASE}/Stations/${st.id}/chargers`,
          `${API_BASE}/Chargers/by-station/${st.id}`,
        ];

        for (const url of tryRoutes) {
          try {
            const data = await fetchJSONAuth(url);
            // Một số API có thể trả { items: [...] }
            let arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
            if (!arr.length) continue;

            // Lọc chặt theo stationId của trạm hiện tại (ép cùng kiểu để so sánh “mềm”)
            const sameId = (a, b) => String(a) === String(b);
            arr = arr.filter(c => sameId(c.stationId ?? c.StationId, st.id));

            // Nếu route trả tất cả trụ nhưng không có trụ thuộc trạm này, thử route sau
            if (!arr.length) continue;

            list = arr.map(normalizeCharger);
            break;
          } catch (e) {
            lastErr = e;
            if (e?.status === 401) {
              setAuthNeeded(true);
              // vẫn tiếp tục thử route khác phòng khi route khác mở ẩn danh
              continue;
            }
            // 404/500 thì cứ thử route sau
          }
        }

        if (alive) {
          setStation(st);
          setChargers(list);
          if (!list.length && lastErr && lastErr.status && lastErr.status !== 404) {
            // Ghi chú lỗi để dev biết (không chặn UI)
            console.warn("Chargers fetch last error:", lastErr);
          }
        }
      } catch (e) {
        if (alive) {
          const msg = /404|không tìm/i.test(String(e?.message))
            ? "Không tìm thấy trạm!"
            : `Không tải được dữ liệu trạm. ${e?.message ?? ""}`;
          setError(msg);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [id]);

  const handleOpenBook = (chargerId) => {
    nav(`/stations/${id}/chargers/${chargerId}/book`);
  };

  const lat = Number(station?.lat);
  const lng = Number(station?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  // Options for filters
  const {
    connectorOptions,
    powerOptions,
    statusOptions,
    speedOptions,
  } = useMemo(() => {
    const connectors = Array.from(new Set(chargers.map(c => (c.connector || "").trim()).filter(Boolean)));
    const powers = Array.from(new Set(chargers.map(c => (c.power || "").trim()).filter(Boolean)));
    const statuses = Array.from(new Set(chargers.map(c => (c.status || "").trim()).filter(Boolean)));
    const speeds = Array.from(new Set(chargers.map(c => (c.speed || "").trim()).filter(Boolean)));
    return {
      connectorOptions: connectors.length ? connectors : ["Type 2", "CCS", "CHAdeMO"],
      powerOptions: powers.length ? powers : ["7 kW", "22 kW", "60 kW", "120 kW"],
      statusOptions: statuses.length ? statuses : ["Online", "Offline", "OutOfOrder"],
      speedOptions: speeds.length ? speeds : ["Chậm", "Nhanh"],
    };
  }, [chargers]);

  // Filtered list
  const filteredChargers = useMemo(() => {
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
      const conn = String(c.connector || "").toLowerCase();
      const stt = String(c.status || "");
      const spd = String(c.speed || "").toLowerCase();

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
  }, [chargers, q, connector, minPower, status, speed, sortPrice]);

  const hasAnyFilter =
    (q && q.trim() !== "") ||
    !!connector || !!minPower || !!status || !!speed || !!sortPrice;

  const displayChargers = hasAnyFilter ? filteredChargers : chargers;

  // ---------- Render ----------
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

        {/* Filter */}
        <div className="bp-panel sd-filter-sticky" style={{ marginTop: 16 }}>
          <StationFilters
            context="detail"
            q={q} onQChange={setQ}
            connector={connector} onConnectorChange={setConnector}
            power={minPower} onPowerChange={setMinPower}
            status={status} onStatusChange={setStatus}
            sortPrice={sortPrice} onSortPriceChange={setSortPrice}
            speed={speed} onSpeedChange={setSpeed}
            connectorOptions={connectorOptions}
            powerOptions={powerOptions}
            statusOptions={statusOptions}
            speedOptions={speedOptions}
            visible={{ search: true, connector: true, power: true, status: true, sortPrice: true, speed: true, city: false }}
          />

          {/* Thông báo cần đăng nhập nếu 401 */}
          {authNeeded && (
            <div className="bp-alert warn" style={{ marginTop: 8 }}>
              Cần đăng nhập để xem danh sách trụ. Hãy đăng nhập rồi tải lại trang.
            </div>
          )}
        </div>

        {/* Map */}
        {hasCoords && (
          <div className="bp-panel sd-map-panel">
            <div className="sd-map-canvas">
              <GoongMiniMap lat={lat} lng={lng} title={station.name} height={280} zoom={15} />
            </div>
          </div>
        )}

        {/* Chargers */}
        <h2 className="bp-title with-mb">Các trụ sạc</h2>

        {hasAnyFilter && filteredChargers.length === 0 && (
          <p className="bp-subtle">Không có trụ phù hợp với bộ lọc</p>
        )}

        <div className="sd-grid">
          {displayChargers.length > 0 ? (
            displayChargers.map((ch) => {
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
                        {statusClass === "online" ? "Trống"
                          : statusClass === "outoforder" ? "Hết chỗ"
                            : statusClass === "offline" ? "Bảo trì"
                              : statusClass || "—"}
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
            <div className="chargerItem empty">
              <div className="thumb" />
              <div className="chargerBody">
                <div className="chargerTitle">
                  {authNeeded ? "Cần đăng nhập để xem trụ" : "Trạm chưa có trụ sạc"}
                </div>
                <div className="row">
                  <span className="label">Gợi ý:</span>
                  <span>
                    {authNeeded ? "Vui lòng đăng nhập rồi tải lại trang." : "Thêm dữ liệu trụ sạc cho trạm này trong hệ thống."}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
