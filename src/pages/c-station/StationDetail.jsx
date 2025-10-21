import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import GoongMiniMap from "../../components/map/GoongMiniMap";
import StationFilters from "../../components/station/StationFilters";
import "./style/StationDetail.css";

// ================= API base (ưu tiên .env) =================
const API_BASE =
  (typeof import.meta !== "undefined" ? import.meta.env.VITE_API_URL : process.env.REACT_APP_API_URL)
  ?? "https://localhost:7268/api"; // dùng /api

// ====== VI MAPPERS (chỉ speed & charger status) ======
const VI_SPEED = {
  // slow: "Chậm",
  normal: "Thông thường",
  fast: "Nhanh",
  // rapid: "Rất nhanh",
  // ultra: "Siêu nhanh",
};
const VI_CHARGER_STATUS = {
  online: "Hoạt động",
  offline: "Bảo trì",
  outoforder: "Hết chỗ",
};
const toLow = (v) => String(v ?? "").trim().toLowerCase();
const viSpeed = (s) => VI_SPEED[toLow(s)] || s || "—";
const viChargerStatus = (s) => VI_CHARGER_STATUS[toLow(s)] || s || "—";

// ================= Helpers: Normalizers =================

function normalizePricingRule(r = {}) {
  return {
    id: r.pricingRuleId ?? r.PricingRuleId ?? r.id ?? r.Id,
    chargerType: String(r.chargerType ?? r.ChargerType ?? "").trim(), // "AC" | "DC"
    powerKw: Number(r.powerKw ?? r.PowerKW ?? r.power ?? 0),
    timeRange: String(r.timeRange ?? r.TimeRange ?? "").trim(),       // "Normal" | "Peak"
    pricePerKwh: Number(r.pricePerKwh ?? r.PricePerKwh ?? 0),
    idleFeePerMin: Number(r.idleFeePerMin ?? r.IdleFeePerMin ?? 0),
    status: r.status ?? r.Status ?? "Active",
  };
}

const _low = (s) => String(s ?? "").trim().toLowerCase();
const _mkKey = (typeRaw, powerKw) => `${_low(typeRaw)}|${Number(powerKw) || 0}`;
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

// Charger từ /api/Chargers
function normalizeCharger(c = {}) {
  const powerNumber =
    (c.powerKw ?? c.PowerKW ?? c.powerkw ?? c.power) != null
      ? Number(c.powerKw ?? c.PowerKW ?? c.powerkw ?? c.power)
      : undefined;

  const price =
    c.price ?? c.Price ?? c.priceText ?? c.PriceText ?? c.tariffText ?? c.TariffText ?? null;

  const rawStatus = (c.status ?? c.Status ?? "").toString();
  const rawSpeed = c.type ?? c.Type ?? c.speed ?? c.Speed ?? "";

  return {
    id: c.chargerId ?? c.ChargerId ?? c.id ?? c.Id,
    stationId: c.stationId ?? c.StationId,
    title: c.code ?? c.Code ?? c.title ?? c.Title ?? `Charger ${c.chargerId ?? c.ChargerId ?? ""}`,

    // speed (BE: field "type")
    speed: rawSpeed,
    speedLabel: viSpeed(rawSpeed), // VI

    // connector sẽ được merge từ Ports (nhiều port → mảng)
    connector: "",
    connectorLabel: "",  // giữ nguyên raw (không dịch)
    connectorTypes: [],  // mảng từ Ports.connectorType (raw)

    // power
    powerKw: powerNumber,
    power: powerNumber != null ? `${powerNumber} kW` : (c.power ?? c.Power ?? ""),

    // status
    status: rawStatus.toLowerCase(),               // dùng cho CSS/filter
    statusLabel: viChargerStatus(rawStatus),       // VI cho hiển thị

    // price
    priceText: typeof price === "string" ? price : "",
    priceValue: typeof price === "number" ? price : (c.priceValue ?? c.PriceValue),
    priceUnit: c.priceUnit ?? c.PriceUnit ?? c.unit ?? c.Unit ?? "",

    bullets: Array.isArray(c.bullets ?? c.Bullets ?? c.notes ?? c.Notes)
      ? (c.bullets ?? c.Bullets ?? c.notes ?? c.Notes)
      : [],

    imageUrl: c.imageUrl ?? c.ImageUrl ?? "",
  };
}

// Port từ /api/Ports
function normalizePort(p = {}) {
  return {
    portId: p.portId ?? p.PortId ?? p.id ?? p.Id,
    chargerId: p.chargerId ?? p.ChargerId,
    connectorType: p.connectorType ?? p.ConnectorType ?? p.type ?? p.Type ?? "", // ví dụ: CCS2, Type2 (raw)
    maxPowerKw: p.maxPowerKw ?? p.MaxPowerKw ?? p.powerKw ?? p.PowerKW,
    status: p.status ?? p.Status,
    imageUrl: p.imageUrl ?? p.ImageUrl ?? null,
  };
}

// ================= Helpers: Fetch =================
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
  return fetchJSON(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
  });
}

// ================= Helpers: Format =================
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
function formatPrice(ch) {
  if (ch.priceText) return ch.priceText;
  if (ch.priceValue != null) {
    const unit = (ch.priceUnit || "").toLowerCase();
    if (unit === "kwh") return `${vnd(ch.priceValue)} / kWh`;
    if (unit === "hour") return `${vnd(ch.priceValue)} / giờ`;
    if (unit === "session" || unit === "time") return `${vnd(ch.priceValue)} / lượt`;
    return vnd(ch.priceValue);
  }
  return "—";
}

// ================= Component =================
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

        // 1) station
        const stationRaw = await fetchJSON(`${API_BASE}/Stations/${id}`);
        const st = normalizeStation(stationRaw);
        if (!alive) return;

        // 2) chargers (theo station)
        let chargersList = [];
        let lastErr = null;
        const chargerRoutes = [
          `${API_BASE}/Chargers?stationId=${st.id}`,
        ];
        for (const url of chargerRoutes) {
          try {
            const data = await fetchJSONAuth(url);
            let arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
            if (!arr.length) continue;
            const sameId = (a, b) => String(a) === String(b);
            arr = arr.filter(c => sameId(c.stationId ?? c.StationId, st.id));
            if (!arr.length) continue;

            chargersList = arr.map(normalizeCharger);
            break;
          } catch (e) {
            lastErr = e;
            if (e?.status === 401) setAuthNeeded(true);
          }
        }

        // 3) ports → collect connectors per charger (raw)
        let ports = [];
        if (chargersList.length) {
          const chargerIds = chargersList.map(c => c.id);
          const portsRoutes = [
            `${API_BASE}/Ports?stationId=${st.id}`,
          ];
          for (const url of portsRoutes) {
            try {
              const data = await fetchJSONAuth(url);
              const arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
              if (!arr.length) continue;

              let normalized = arr.map(normalizePort);

              // fallback /Ports: lọc theo danh sách chargerIds
              if (url.endsWith("/Ports")) {
                const idset = new Set(chargerIds.map(String));
                normalized = normalized.filter(p => idset.has(String(p.chargerId)));
              }
              ports = normalized;
              break;
            } catch {
              // thử route tiếp
            }
          }
        }

        // 4) merge: gộp connectorTypes (raw) theo chargerId
        if (ports.length) {
          const mapTypes = new Map(); // chargerId -> Set(connectorType)
          ports.forEach(p => {
            const key = String(p.chargerId);
            if (!mapTypes.has(key)) mapTypes.set(key, new Set());
            if (p.connectorType) mapTypes.get(key).add(String(p.connectorType));
          });

          chargersList = chargersList.map(ch => {
            const typesSet = mapTypes.get(String(ch.id));
            const typesArr = typesSet ? Array.from(typesSet) : [];
            const label = typesArr.join(", "); // giữ nguyên raw
            return {
              ...ch,
              connectorTypes: typesArr,
              connectorLabel: label,
              connector: typesArr.length === 1 ? typesArr[0] : label,
            };
          });
        }
        // 5) PRICING RULES: lấy từ BE và ghép vào chargers theo (type, powerKw)
        let pricingRules = [];
        try {
          // Thử nhiều route cho chắc (tùy BE đặt)
          const ruleRoutes = [
            `${API_BASE}/PricingRules`,
            `${API_BASE}/Pricing/rules`,
            `${API_BASE}/PricingRule`,
          ];
          // const ruleRoutes = []; // để trống nếu BE không có endpoint này
          for (const url of ruleRoutes) {
            try {
              const data = await fetchJSONAuth(url);
              const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
              if (arr?.length) { pricingRules = arr.map(normalizePricingRule); break; }
            } catch { /* thử route tiếp */ }
          }
        } catch { /* im lặng nếu không có */ }

        if (pricingRules.length) {
          // Gom rule theo key (type|powerKw) và theo timeRange (normal/peak)
          const byKey = new Map();
          for (const r of pricingRules) {
            if (_low(r.status) !== "active") continue;
            const key = _mkKey(r.chargerType, r.powerKw);
            const bucket = byKey.get(key) || {};
            bucket[_low(r.timeRange)] = r; // bucket.normal / bucket.peak
            byKey.set(key, bucket);
          }

          // merge rule vào từng charger
          chargersList = chargersList.map(ch => {
            // Lấy raw type: trong normalizeCharger bạn đang để ở ch.speed (raw từ c.type)
            // Nếu BE của bạn trả "type" là AC/DC thì ch.speed chính là raw đó
            const typeRaw = ch.speed || ch.type || "";
            let power = ch.powerKw;
            if (power == null) {
              // fallback tách số từ "120 kW"
              const m = String(ch.power || "").match(/([\d.]+)/);
              power = m ? Number(m[1]) : undefined;
            }
            const key = _mkKey(typeRaw, power);
            const rr = byKey.get(key);
            if (!rr) return ch;

            const normal = rr.normal;
            const peak = rr.peak;

            let priceText = "";
            if (normal && peak) {
              priceText = `${vnd(normal.pricePerKwh)}/kWh - ${vnd(peak.pricePerKwh)}/kWh `;
            } else if (normal) {
              priceText = `${vnd(normal.pricePerKwh)}/kWh`;
            } else if (peak) {
              priceText = `${vnd(peak.pricePerKwh)}/kWh`;
            }

            const priceValue = (normal?.pricePerKwh ?? peak?.pricePerKwh ?? ch.priceValue);
            const priceUnit = "kWh";
            const idleFeePerMin = normal?.idleFeePerMin ?? peak?.idleFeePerMin ?? ch.idleFeePerMin;

            return {
              ...ch,
              priceText: priceText || ch.priceText || "",
              priceValue,
              priceUnit,
              idleFeePerMin,
            };
          });
        }


        // 5) (optional) merge pricing theo station
        if (chargersList.length) {
          try {
            // const priceUrl = `${API_BASE}/Pricing/by-station/${st.id}`;
            // const pricing = await fetchJSONAuth(priceUrl).catch(() => null);
            const rows = Array.isArray(pricing?.items) ? pricing.items : (Array.isArray(pricing) ? pricing : []);
            if (rows?.length) {
              const map = new Map(rows.map(r => [String(r.chargerId ?? r.ChargerId), r]));
              chargersList = chargersList.map(ch => {
                const m = map.get(String(ch.id));
                if (!m) return ch;
                const merged = normalizeCharger({ ...ch, ...m });
                // giữ lại connectors (raw) đã merge từ ports
                return { ...merged, connectorTypes: ch.connectorTypes, connectorLabel: ch.connectorLabel, connector: ch.connector };
              });
            }
          } catch {
            // im lặng nếu không có endpoint này
          }
        }

        if (alive) {
          setStation(st);
          setChargers(chargersList);
          if (!chargersList.length && lastErr && lastErr.status && lastErr.status !== 404) {
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

  // ===== UI helpers =====
  const handleOpenBook = (chargerId) => {
    nav(`/stations/${id}/chargers/${chargerId}/book`);
  };

  const lat = Number(station?.lat);
  const lng = Number(station?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  // ===== Filter options (connector raw, speed/status VI) =====
  const { connectorOptions, powerOptions, statusOptions, speedOptions } = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    return {
      connectorOptions: uniq(
        chargers.flatMap(c =>
          (c.connectorTypes?.length ? c.connectorTypes : [c.connectorLabel || c.connector])
        )
      ), // raw
      powerOptions: uniq(chargers.map(c => c.power).filter(Boolean)),
      statusOptions: uniq(chargers.map(c => c.statusLabel || c.status)), // VI label
      speedOptions: uniq(chargers.map(c => c.speedLabel || c.speed)),    // VI label
    };
  }, [chargers]);

  // ===== Filtering =====
  const filteredChargers = useMemo(() => {
    const kw = toLow(q);
    const minKW = parseFloat(minPower) || 0;

    const parsePower = (p) => {
      const m = String(p || "").match(/([\d.]+)/);
      return m ? parseFloat(m[1]) : 0;
    };

    const matchConnector = (c) => {
      if (!connector) return true;
      const wanted = toLow(connector);
      // so khớp theo mảng raw
      if (Array.isArray(c.connectorTypes) && c.connectorTypes.length) {
        if (c.connectorTypes.some(t => toLow(t) === wanted)) return true;
      }
      // fallback theo text đã gộp (raw)
      if (toLow(c.connectorLabel) === wanted) return true;
      return toLow(c.connector) === wanted;
    };

    const matchStatus = (c) =>
      !status || toLow(c.statusLabel || c.status) === toLow(status);

    const matchSpeed = (c) =>
      !speed || toLow(c.speedLabel || c.speed) === toLow(speed);

    const matchKW = (c) => {
      if (!kw) return true;
      const title = toLow(c.title || c.id);
      const conn = toLow(c.connectorLabel || c.connector); // raw
      const spd = toLow(c.speedLabel || c.speed);         // VI label
      return title.includes(kw) || conn.includes(kw) || spd.includes(kw);
    };

    let list = chargers.filter((c) => {
      const passText = matchKW(c);
      const passConn = matchConnector(c);
      const passStatus = matchStatus(c);
      const passSpeed = matchSpeed(c);
      const passPower = !minKW || parsePower(c.power) >= minKW;
      return passText && passConn && passStatus && passSpeed && passPower;
    });

    const getPriceValue = (c) => (c.priceValue != null ? Number(c.priceValue) : Number.POSITIVE_INFINITY);
    if (sortPrice === "asc") {
      list = [...list].sort((a, b) => getPriceValue(a) - getPriceValue(b));
    } else if (sortPrice === "desc") {
      list = [...list].sort((a, b) => getPriceValue(b) - getPriceValue(a));
    }

    return list;
  }, [chargers, q, connector, minPower, status, speed, sortPrice]);

  const hasAnyFilter =
    (q && q.trim() !== "") ||
    !!connector || !!minPower || !!status || !!speed || !!sortPrice;

  const displayChargers = hasAnyFilter ? filteredChargers : chargers;

  // ===== Render =====
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

        {hasAnyFilter && displayChargers.length === 0 && (
          <p className="bp-subtle">Không có trụ phù hợp với bộ lọc</p>
        )}

        <div className="sd-grid">
          {displayChargers.length > 0 ? (
            displayChargers.map((ch) => {
              const statusClass = (ch.status || "unknown").toLowerCase(); // dùng raw cho class
              const connectorText = ch.connectorLabel || ch.connector || "—"; // raw
              const speedText = ch.speedLabel || ch.speed || "—";            // VI
              const priceText = formatPrice(ch);

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
                        {ch.statusLabel || ch.status || "—" /* VI */}
                      </span>
                    </div>

                    <div className="row">
                      <span className="label">Loại cổng sạc:</span>
                      <span>{connectorText /* raw */}</span>
                    </div>

                    <div className="row">
                      <span className="label">Tốc độ sạc:</span>
                      <span>{speedText /* VI */}</span>
                    </div>

                    {!!ch.bullets?.length && (
                      <>
                        <div className="groupTitle">Thông tin thêm:</div>
                        <ul className="bullets">
                          {ch.bullets.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </>
                    )}

                    <div className="row priceRow">
                      <span className="label">Giá cả:</span>
                      <span className="price">{priceText}</span>
                    </div>

                    {Number.isFinite(ch.idleFeePerMin) && ch.idleFeePerMin > 0 && (
                      <div className="row">
                        <span className="label">Phí phạt:</span>
                        <span>{vnd(ch.idleFeePerMin)} / phút</span>
                      </div>
                    )}

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
