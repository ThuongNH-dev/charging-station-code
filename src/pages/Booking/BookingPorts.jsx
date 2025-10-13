import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import ChargersCard from "../../components/station/ChargersCard";
import ChargersGun from "../../components/station/ChargersGun";
import "./BookingPorts.css";

// ===== API base (ưu tiên .env) =====
const API_BASE =
  (typeof import.meta !== "undefined" ? import.meta.env.VITE_API_URL : process.env.REACT_APP_API_URL)
  ?? "https://localhost:7268/api";

// ===== Helpers =====
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

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

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
  const id = c.id ?? c.chargerId ?? c.ChargerId;
  const p = c.powerKw ?? c.PowerKW ?? c.power ?? c.Power;
  const powerText = (p !== undefined && p !== null && String(p) !== "") ? `${p} kW` : "";

  const rawStatus = (c.status ?? c.Status ?? "").toString().toLowerCase();
  const status =
    rawStatus.includes("available") ? "available" :
    rawStatus.includes("busy")      ? "busy" :
    rawStatus.includes("maint")     ? "maintenance" :
    rawStatus || "unknown";

  return {
    id,
    stationId: c.stationId ?? c.StationId,
    title: c.code ?? c.Code ?? `Trụ #${id}`,
    connector: c.type ?? c.Type ?? "",   // "Type 2" | "CCS2" | "CHAdeMO" ...
    power: powerText,                    // "60 kW"
    status,
    price: c.price ?? c.Price ?? "",
    imageUrl: c.imageUrl ?? c.ImageUrl ?? "",
  };
}

function normalizePort(p = {}) {
  const id = p.id ?? p.PortId ?? p.portId;
  const code = p.code ?? p.Code ?? `P-${id}`;
  const connector = p.connector ?? p.connectorType ?? p.ConnectorType ?? p.Connector ?? "-";
  const pw = p.power ?? p.maxPowerKW ?? p.MaxPowerKW;
  const powerText = (pw !== undefined && pw !== null && String(pw) !== "") ? `${pw} kW` : "";

  const rawStatus = (p.status ?? p.Status ?? "").toString().toLowerCase();
  const status =
    rawStatus.includes("available") || rawStatus === "1" ? "available" :
    rawStatus.includes("busy")      || rawStatus === "2" ? "busy" :
    rawStatus.includes("inactive")  || rawStatus === "0" ? "inactive" :
    rawStatus.includes("maint")                         ? "maintenance" :
    "unknown";

  return {
    id,
    name: code,             // ChargersGun hiển thị name
    connector,
    power: powerText,
    status,
    chargerId: p.chargerId ?? p.ChargerId, // để lọc/đối chiếu
    _raw: p,
  };
}

// ===== Component =====
export default function BookingPorts() {
  const { id, cid } = useParams(); // stationId & chargerId
  const navigate = useNavigate();

  const [station, setStation] = useState(null);
  const [charger, setCharger] = useState(null);
  const [ports, setPorts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [portsLoading, setPortsLoading] = useState(true);
  const [portsError, setPortsError] = useState("");

  const [selectedGun, setSelectedGun] = useState(null);

  // ====== THỜI GIAN (từng phút) ======
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const nowHour = now.getHours();
  const nowMinute = now.getMinutes();

  const ceilNowToNextMinute = () => {
    let h = nowHour;
    let m = nowMinute + 1;
    if (m >= 60) {
      h = nowHour + 1;
      m = 0;
    }
    return { h, m };
  };
  const baseline = ceilNowToNextMinute();

  // Tối thiểu cách baseline 60 phút
  const minSelAbsMin = baseline.h * 60 + baseline.m + 60;
  const minSelHour = Math.floor(minSelAbsMin / 60);
  const minSelMinute = minSelAbsMin % 60;

  // Cho phép tới 23:59
  const LAST_ABS_MIN = 23 * 60 + 59;
  const canBookToday = minSelAbsMin <= LAST_ABS_MIN;

  const [startHour, setStartHour] = useState(() => Math.min(minSelHour, 23));
  const [startMinute, setStartMinute] = useState(() => minSelMinute);

  useEffect(() => {
    if (!canBookToday) return;
    if (startHour < minSelHour || (startHour === minSelHour && startMinute < minSelMinute)) {
      setStartHour(minSelHour);
      setStartMinute(minSelMinute);
    }
  }, [nowHour, nowMinute, minSelHour, minSelMinute, canBookToday]);

  const baselineAbsMin = baseline.h * 60 + baseline.m;

  const hourOptions = useMemo(() => {
    const arr = [];
    for (let h = minSelHour; h <= 23; h++) arr.push(h);
    return arr;
  }, [minSelHour]);

  const minuteOptionsForHour = (h) => {
    const all = Array.from({ length: 60 }, (_, i) => i);
    if (h > minSelHour) return all;
    return all.filter((m) => m >= minSelMinute);
  };

  const totalMinutes = useMemo(() => {
    if (!canBookToday) return 0;
    const selAbs = startHour * 60 + startMinute;
    const diff = Math.max(0, selAbs - baselineAbsMin);
    if (diff === 0) return 0;
    return Math.max(60, diff);
  }, [startHour, startMinute, baselineAbsMin, canBookToday]);

  const totalHoursFloat = useMemo(() => totalMinutes / 60, [totalMinutes]);

  // ====== PHÍ ======
  const [parkingFee, setParkingFee] = useState(20000); // đ/giờ
  const perMinute = useMemo(() => parkingFee / 60, [parkingFee]);
  const bookingFee = useMemo(() => Math.round(totalMinutes * perMinute), [totalMinutes, perMinute]);

  // ====== LOAD STATION + CHARGER ======
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        // Station
        const stationRaw = await fetchJSON(`${API_BASE}/Stations/${id}`);
        if (!alive) return;
        setStation(normalizeStation(stationRaw));

        // Charger theo cid
        const chRaw = await fetchJSON(`${API_BASE}/Chargers/${cid}`);
        if (!alive) return;
        setCharger(normalizeCharger(chRaw));
      } catch (e) {
        if (!alive) return;
        const msg = /404|không tìm/i.test(String(e?.message))
          ? "Không tìm thấy trạm hoặc trụ!"
          : `Không tải được dữ liệu. ${e?.message ?? ""}`;
        setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, cid]);

  // ====== LOAD PORTS THEO CHARGER (chỉ của đúng cid) ======
  useEffect(() => {
    let alive = true;
    if (!cid) return;
    (async () => {
      try {
        setPortsLoading(true);
        setPortsError("");

        // Thử route REST trước
        let data;
        try {
          data = await fetchJSON(`${API_BASE}/Chargers/${encodeURIComponent(cid)}/Ports`);
        } catch {
          // fallback query
          data = await fetchJSON(`${API_BASE}/Ports?chargerId=${encodeURIComponent(cid)}`);
        }

        if (!alive) return;
        let arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);

        // 🔒 Lọc chặt theo chargerId đề phòng BE trả toàn bộ
        const same = (a, b) => String(a) === String(b);
        arr = arr.filter(p => same(p.chargerId ?? p.ChargerId, cid));

        setPorts(arr.map(normalizePort));
        if (arr.length === 0 && Array.isArray(data) && data.length > 0) {
          console.warn("[Ports] API trả rộng, FE đã lọc client-side theo chargerId =", cid);
        }
      } catch (e) {
        setPortsError(e?.message || "Lỗi tải cổng.");
        setPorts([]);
      } finally {
        if (alive) setPortsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cid]);

  // Auto-chọn cổng khả dụng đầu tiên
  useEffect(() => {
    if (!ports.length) { setSelectedGun(null); return; }
    if (selectedGun && ports.some(p => p.id === selectedGun.id && p.status === "available")) return;
    const firstAvail = ports.find(p => p.status === "available") || null;
    setSelectedGun(firstAvail);
  }, [ports, selectedGun]);

  // ====== BOOK ======
  const handleBook = () => {
    if (!selectedGun || totalMinutes <= 0) return;

    const hh = String(startHour).padStart(2, "0");
    const mm = String(startMinute).padStart(2, "0");

    const payload = {
      station: {
        id,
        name: station?.name,
        address: station?.address,
      },
      charger: {
        id: cid,
        connector: selectedGun?.connector || charger?.connector,
        power: selectedGun?.power || charger?.power,
        price: charger?.price,
      },
      gun: {
        id: selectedGun?.id,
        name: selectedGun?.name || `Súng ${selectedGun?.id}`,
      },
      startTime: `${hh}:${mm}`,
      baseline: `${String(baseline.h).padStart(2, "0")}:${String(baseline.m).padStart(2, "0")}`,
      totalMinutes,
      perMinute,
      bookingFee,
    };

    navigate("/payment", { state: payload });
  };

  // ====== RENDER ======
  if (loading) {
    return (
      <MainLayout>
        <div className="bp-container"><div>Đang tải dữ liệu...</div></div>
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
        <div className="bp-container"><div>Không có dữ liệu trạm.</div></div>
      </MainLayout>
    );
  }
  if (!charger) {
    return (
      <MainLayout>
        <div className="bp-container"><div>Không tìm thấy trụ để đặt.</div></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bp-container">
        <Link to={`/stations/${id}`} className="bp-back">← Quay về trạm</Link>

        <div className="bp-grid">
          {/* Cột trái */}
          <div className="bp-left-col">
            <div className="bp-panel">
              <div className="bp-title">{station.name}</div>
              <div className="bp-subtle">{station.address}</div>
            </div>

            <div className="bp-panel-chargers">
              <ChargersCard charger={charger} />
              <div className="bp-charger-grid">
                <div className="bp-panel-note">
                  <div className="bp-note">Biểu giá dịch vụ sạc điện</div>
                  <div className="bp-price">{charger.price || "—"}</div>
                  <div className="bp-footnote">© Biểu giá có thể thay đổi theo từng trạm và khung giờ.</div>
                </div>

                <div className="bp-section">
                  <div className="bp-label">Chọn súng sạc</div>

                  {portsLoading ? (
                    <div className="bp-hint">Đang tải cổng…</div>
                  ) : portsError ? (
                    <div className="error-text">Lỗi: {portsError}</div>
                  ) : (
                    <ChargersGun
                      guns={ports}
                      value={selectedGun}
                      onChange={setSelectedGun}
                      autoSelect={true}
                    />
                  )}

                  {!selectedGun && !portsLoading && (
                    <div className="bp-hint" style={{ marginTop: 8 }}>
                      Hiện không còn súng rảnh để đặt.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bp-panel">
              <div className="bp-title">Khung giá</div>
              <div className="bp-table-wrapper">
                <table className="bp-table">
                  <thead>
                    <tr><th>Loại giá</th><th>Thời gian</th><th>Ngày</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Giờ thấp điểm</td><td>22:00 – 06:00</td><td>Tất cả các ngày</td></tr>
                    <tr><td>Giờ bình thường</td><td>06:00 – 17:00</td><td>Thứ 2–7</td></tr>
                    <tr><td>Giờ cao điểm</td><td>17:00 – 22:00</td><td>Thứ 2–7</td></tr>
                    <tr><td>Giờ CN</td><td>08:00 – 17:00</td><td>Chủ nhật</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cột phải */}
          <div>
            <div className="bp-panel">
              <div className="bp-title">Đặt trước trụ sạc</div>

              <div className="bp-section">
                <div className="bp-label">Giờ bắt đầu hôm nay</div>

                {!canBookToday && (
                  <div className="bp-hint" style={{ marginBottom: 8 }}>
                    Hiện đã quá muộn trong ngày. Vui lòng quay lại vào ngày mai.
                  </div>
                )}

                <div className="bp-time-row">
                  <div className="bp-time-col">
                    <div className="bp-subtle" style={{ marginBottom: 6 }}>Giờ</div>
                    <select
                      className="bp-input-select"
                      value={startHour}
                      onChange={(e) => {
                        let h = Number(e.target.value) || minSelHour;
                        const mins = minuteOptionsForHour(h);
                        let m = startMinute;
                        if (!mins.includes(m)) m = mins[0] ?? 0;
                        setStartHour(h);
                        setStartMinute(m);
                      }}
                      disabled={!canBookToday}
                    >
                      {hourOptions.map(h => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bp-time-col">
                    <div className="bp-subtle" style={{ marginBottom: 6 }}>Phút</div>
                    <select
                      className="bp-input-select"
                      value={startMinute}
                      onChange={(e) => {
                        const m = Number(e.target.value) || 0;
                        const mins = minuteOptionsForHour(startHour);
                        setStartMinute(mins.includes(m) ? m : (mins[0] ?? 0));
                      }}
                      disabled={!canBookToday}
                    >
                      {minuteOptionsForHour(startHour).map(m => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bp-hint">
                  Mốc nhỏ nhất: {String(minSelHour).padStart(2,"0")}:{String(minSelMinute).padStart(2,"0")}.
                  Phí tính từ {String(baseline.h).padStart(2,"0")}:{String(baseline.m).padStart(2,"0")} → giờ đã chọn, tối thiểu 60 phút.
                </div>
              </div>

              <div className="bp-section">
                <div className="bp-label">Phí đặt chỗ</div>
                <select
                  value={parkingFee}
                  onChange={e => setParkingFee(Number(e.target.value))}
                  className="bp-input-select"
                >
                  <option value={20000}>20,000 đ/giờ (xe máy)</option>
                  <option value={40000}>40,000 đ/giờ (ô tô)</option>
                </select>
              </div>

              <div className="bp-summary">
                <RowKV
                  k="Cổng sạc"
                  v={`${selectedGun?.connector || charger?.connector || "—"} • ${(selectedGun?.power || charger?.power || "—")}`}
                />
                <RowKV k="Súng" v={selectedGun ? (selectedGun.name || `Súng ${selectedGun.id}`) : "—"} />
                <RowKV k="Phí đặt chỗ / phút" v={vnd(perMinute)} />
                <RowKV
                  k="Tổng thời gian (phút)"
                  v={`${totalMinutes} phút (${totalHoursFloat.toFixed(2)} giờ)`}
                />
                <RowKV k="Tổng chi phí" v={<b>{vnd(bookingFee)}</b>} />
              </div>

              <button
                className="bp-btn-primary"
                disabled={!canBookToday || totalMinutes <= 0 || !selectedGun}
                onClick={handleBook}
              >
                Đặt ngay
              </button>
            </div>

            <div className="bp-panel">
              <div className="bp-title with-mb">Đánh giá</div>
              <Review name="N***n" text="Nhân viên hỗ trợ tốt. Dịch vụ okie." />
              <Review name="Q***h" text="Sạc nhanh, vị trí dễ tìm." />
              <Review name="B***n" text="Nên đặt trước cuối tuần." />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function RowKV({ k, v }) {
  return (
    <div className="bp-row-kv">
      <span className="bp-row-kv-key">{k}</span>
      <span className="bp-row-kv-val">{v}</span>
    </div>
  );
}

function Review({ name, text }) {
  return (
    <div className="bp-review">
      <div className="bp-avatar" />
      <div>
        <div className="bp-review-head">
          <b>{name}</b><span>⭐️⭐️⭐️⭐️⭐️</span>
        </div>
        <div className="bp-subtle">{text}</div>
      </div>
    </div>
  );
}
