import React, { useEffect, useState } from "react";
import { getApiBase, fetchAuthJSON } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { message } from "antd";
import "./ChargerManager.css";

const API_BASE = getApiBase();

/* ---------- Helpers ---------- */
function toArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.$values)) return raw.$values;
  if (typeof raw === "object") return [raw];
  try {
    return toArray(JSON.parse(raw));
  } catch {
    return [];
  }
}

/* ---------- Normalizer ---------- */
const normCharger = (c = {}) => ({
  id: c.id ?? c.chargerId ?? c.ChargerId,
  code: c.code ?? c.chargerCode ?? c.Code ?? `C-${c.id ?? ""}`,
  powerKW:
    c.powerKw ??
    c.powerKW ??
    c.PowerKW ??
    c.maxPower ??
    c.MaxPower ??
    c.capacityKW ??
    c.CapacityKW ??
    "-",
  status: c.status ?? c.Status ?? "Unknown",
  stationId: c.stationId ?? c.StationId,
});

export default function ChargerManager() {
  const { user } = useAuth();
  const currentAccountId = user?.accountId || localStorage.getItem("accountId");

  const [rows, setRows] = useState([]);
  const [latestSessions, setLatestSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState("guest");
  const [vehicleType, setVehicleType] = useState("");
  const [chargerId, setChargerId] = useState("");
  const [portId, setPortId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [ports, setPorts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Company
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [companyVehicles, setCompanyVehicles] = useState([]);

  // Station restriction
  const [stations, setStations] = useState([]);
  const [myStations, setMyStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);

  /* ---------- Load trạm của staff ---------- */
  useEffect(() => {
    async function loadStations() {
      try {
        const allStations = await fetchAuthJSON(`${API_BASE}/Stations`);
        const stationsArr = toArray(allStations);
        const myStationIds = [];

        for (const st of stationsArr) {
          try {
            const res = await fetchAuthJSON(
              `${API_BASE}/station-staffs?stationId=${st.stationId}`
            );
            const staffs = toArray(res);
            const found = staffs.some(
              (s) => String(s.staffId) === String(currentAccountId)
            );
            if (found) myStationIds.push(st.stationId);
          } catch {
            console.warn("Không lấy được staff của trạm:", st.stationId);
          }
        }

        const mine = stationsArr.filter((s) =>
          myStationIds.includes(s.stationId)
        );
        setStations(stationsArr);
        setMyStations(mine);
        if (mine.length > 0) setSelectedStationId(mine[0].stationId);
      } catch (err) {
        console.error("Lỗi khi tải danh sách trạm:", err);
      }
    }
    loadStations();
  }, [currentAccountId]);

  /* ---------- Load chargers + latest sessions theo trạm ---------- */
  useEffect(() => {
    if (!selectedStationId) return;
    let alive = true;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const chargersRaw = await fetchAuthJSON(`${API_BASE}/Chargers`);
        const chargers = toArray(chargersRaw)
          .map(normCharger)
          .filter((c) => String(c.stationId) === String(selectedStationId));

        const sessionsRaw = await fetchAuthJSON(`${API_BASE}/ChargingSessions`);
        const sessions = toArray(sessionsRaw);

        const latestMap = {};
        for (const s of sessions) {
          const key = s.portId ?? s.PortId ?? s.chargerId ?? s.ChargerId;
          if (!key) continue;
          if (
            !latestMap[key] ||
            new Date(s.startedAt) > new Date(latestMap[key].startedAt)
          ) {
            latestMap[key] = s;
          }
        }

        if (alive) {
          setRows(chargers);
          setLatestSessions(Object.values(latestMap));
          setLoading(false);
        }
      } catch (e) {
        if (alive) {
          setErr(e?.message || "Lỗi tải dữ liệu");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [selectedStationId]);

  /* ---------- Load ports theo chargerId ---------- */
  useEffect(() => {
    async function loadPorts() {
      if (!chargerId) {
        setPorts([]);
        return;
      }
      try {
        const allPorts = await fetchAuthJSON(`${API_BASE}/Ports`);
        const filtered = toArray(allPorts).filter(
          (p) => String(p.chargerId ?? p.ChargerId) === String(chargerId)
        );
        setPorts(filtered);
      } catch (e) {
        console.error("❌ Lỗi tải cổng sạc:", e);
        setPorts([]);
      }
    }
    loadPorts();
  }, [chargerId]);

  /* ---------- Load danh sách công ty ---------- */
  useEffect(() => {
    async function loadCompanies() {
      if (type !== "company") return;
      try {
        const res = await fetchAuthJSON(`${API_BASE}/Auth`);
        const all = Array.isArray(res) ? res : res?.$values || [];
        const comps = all
          .filter((a) => a.role === "Company" && a.company)
          .map((a) => ({
            companyId: a.company.companyId,
            name: a.company.name,
            email: a.company.email,
          }));
        setCompanies(comps);
      } catch (e) {
        console.error("❌ Lỗi tải danh sách công ty:", e);
        setCompanies([]);
      }
    }
    loadCompanies();
  }, [type]);

  /* ---------- Load xe theo công ty ---------- */
  useEffect(() => {
    async function loadVehiclesByCompany() {
      if (!selectedCompany) {
        setCompanyVehicles([]);
        return;
      }
      try {
        const res = await fetchAuthJSON(`${API_BASE}/Vehicles?page=1&pageSize=999`);
        const items = res?.items ?? res?.data?.items ?? res?.$values ?? [];
        const filteredByCompany = items.filter(
          (v) => String(v.companyId) === String(selectedCompany)
        );
        const filteredByType = vehicleType
          ? filteredByCompany.filter(
              (v) =>
                v.vehicleType?.toLowerCase() === vehicleType?.toLowerCase()
            )
          : filteredByCompany;
        setCompanyVehicles(filteredByType);
      } catch (e) {
        console.error("❌ Lỗi tải xe công ty:", e);
        setCompanyVehicles([]);
      }
    }
    loadVehiclesByCompany();
  }, [selectedCompany, vehicleType]);

  /* ---------- Update charger status ---------- */
  async function updateChargerStatus(chargerId, newStatus) {
    try {
      const statusMap = {
        Available: "Online",
        Charging: "Online",
        Offline: "Offline",
        Error: "OutOfOrder",
      };
      const apiStatus = statusMap[newStatus] || newStatus;

      await fetchAuthJSON(`${API_BASE}/Chargers/${chargerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: apiStatus }),
        headers: { "Content-Type": "application/json" },
      });

      const chargersRaw = await fetchAuthJSON(`${API_BASE}/Chargers`);
      const chargers = toArray(chargersRaw)
        .map(normCharger)
        .filter((c) => String(c.stationId) === String(selectedStationId));
      setRows(chargers);
    } catch (err) {
      message.error(`❌ ${err.message}`);

    }
  }

  /* ---------- Bắt đầu phiên ---------- */
  async function handleStartNew() {
    if (!chargerId || !portId)
      return message.warning("⚠️ Vui lòng chọn trụ và cổng sạc!");
    if (type === "guest" && !licensePlate)
      return message.warning("⚠️ Nhập biển số cho khách vãng lai!");
    if (type === "company" && (!selectedCompany || !licensePlate))
      return message.warning("⚠️ Chọn công ty và xe thuộc công ty!");

    setSubmitting(true);
    try {
      const selectedPort = ports.find(
        (p) => String(p.portId) === String(portId)
      );
      const charger = rows.find((c) => String(c.id) === String(chargerId));

      let portCode =
        selectedPort?.code ||
        selectedPort?.portCode ||
        `P${String(portId).padStart(3, "0")}`;
      const chargerCode = charger?.code || `C${chargerId}`;

      if (type === "guest") {
        const body = {
          licensePlate,
          portId: Number(portId),
          PortCode: portCode,
          ChargerCode: chargerCode,
          vehicleType,
          stationId: selectedStationId,
        };
        const res = await fetchAuthJSON(
          `${API_BASE}/ChargingSessions/guest/start`,
          {
            method: "POST",
            body: JSON.stringify(body),
          }
        );
        // 🟢 Thêm sau khi nhận phản hồi
const sid =
  res?.chargingSessionId ||
  res?.id ||
  res?.data?.chargingSessionId ||
  res?.data?.id;
  console.log("Guest start response:", res);

if (sid) sessionStorage.setItem("staffLiveSessionId", sid);
console.log("🔌 Guest session started:", sid);
        message.success(res?.message || "✅ Phiên sạc (guest) đã được khởi động!");
      } else {
        const vehicle = companyVehicles.find(
          (v) => v.licensePlate === licensePlate
        );
        if (!vehicle)
          throw new Error("Không tìm thấy xe trong công ty đã chọn!");

        const fullVehicleRes = await fetchAuthJSON(
          `${API_BASE}/Vehicles/${vehicle.vehicleId}`
        );
        const fullVehicle =
          fullVehicleRes?.data ??
          fullVehicleRes?.item ??
          fullVehicleRes?.$values?.[0] ??
          fullVehicleRes;

        const body = {
          customerId: fullVehicle?.customerId ?? null,
          companyId:
            fullVehicle?.companyId != null
              ? Number(fullVehicle.companyId)
              : selectedCompany
              ? Number(selectedCompany)
              : null,
          vehicleId: fullVehicle?.vehicleId ?? vehicle.vehicleId,
          bookingId: null,
          portId: Number(portId),
          PortCode: portCode,
          ChargerCode: chargerCode,
          stationId: selectedStationId,
        };

        const res = await fetchAuthJSON(`${API_BASE}/ChargingSessions/start`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        // 🟢 Thêm sau khi nhận phản hồi
const sid = res?.chargingSessionId || res?.data?.chargingSessionId;
if (sid) sessionStorage.setItem("staffLiveSessionId", sid);
console.log("🏢 Company session started:", sid);
        message.success(res?.message || "✅ Phiên sạc (company) đã được khởi động!");
      }

      setShowModal(false);
      setLicensePlate("");
      setPortId("");
      setSelectedCompany("");
      setVehicleType("");
      setType("guest");
    } catch (e) {
      message.error(`❌ Lỗi: ${e.message || "Không thể khởi động phiên sạc"}`);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- Render ---------- */
  const renderLatest = (r) => {
    const found = latestSessions.find(
      (s) =>
        String(s.portId) === String(r.id) ||
        String(s.chargerId) === String(r.id)
    );
    if (!found) return "—";
    const id = found.chargingSessionId || found.id;
    const start = found.startedAt
      ? new Date(found.startedAt).toLocaleString("vi-VN")
      : "Không rõ";
    return <span title={`Bắt đầu: ${start}`}>S-{id}</span>;
  };

  const renderAction = (r) => {
    const s = (r.status || "").toLowerCase();
    if (s === "online") {
      return (
        <button
          className="link"
          onClick={() => updateChargerStatus(r.id, "Offline")}
          style={{ color: "#dc2626" }}
        >
          Dừng
        </button>
      );
    }
    if (s === "offline") {
      return (
        <button
          className="link"
          onClick={() => updateChargerStatus(r.id, "Online")}
          style={{ color: "#16a34a" }}
        >
          Bật
        </button>
      );
    }
    if (s === "outoforder") {
      return (
        <button
          className="link"
          onClick={() => updateChargerStatus(r.id, "Online")}
          style={{ color: "#2563eb" }}
        >
          Khôi phục
        </button>
      );
    }
    return <button className="link">Chi tiết</button>;
  };

  return (
    <div className="sc-wrap">
      <div className="sc-header">
        <h2>Danh sách trụ sạc</h2>
        {myStations.length > 1 && (
          <select
            value={selectedStationId || ""}
            onChange={(e) => setSelectedStationId(Number(e.target.value))}
            className="station-select"
          >
            {myStations.map((st) => (
              <option key={st.stationId} value={st.stationId}>
                {st.stationName}
              </option>
            ))}
          </select>
        )}
        <div className="sc-actions">
          <button className="sc-primary" onClick={() => setShowModal(true)}>
            + Bắt đầu phiên
          </button>
        </div>
      </div>

      {loading && <div className="sc-empty">Đang tải…</div>}
      {err && <div className="sc-error">{err}</div>}

      {!loading && !err && (
        <div className="sc-table">
          <table>
            <thead>
              <tr>
                <th>Mã trụ</th>
                <th>Công suất</th>
                <th>Trạng thái</th>
                <th>Phiên gần nhất</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="center">
                    Không có trụ sạc thuộc trạm này.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.code}</td>
                    <td>{r.powerKW}kW</td>
                    <td>
                      <span
                        className={`status ${
                          r.status?.toLowerCase() === "outoforder"
                            ? "error"
                            : r.status?.toLowerCase() === "offline"
                            ? "error"
                            : "ok"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>{renderLatest(r)}</td>
                    <td>{renderAction(r)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Modal ===== */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Khởi động phiên sạc</h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <p>Chọn loại khách hàng và thông tin cần thiết.</p>

            {/* ---- Loại khách hàng ---- */}
            <label>Loại khách hàng</label>
            <div className="type-select">
              <label>
                <input
                  type="radio"
                  name="type"
                  value="guest"
                  checked={type === "guest"}
                  onChange={() => setType("guest")}
                />
                Khách vãng lai
              </label>
              <label>
                <input
                  type="radio"
                  name="type"
                  value="company"
                  checked={type === "company"}
                  onChange={() => setType("company")}
                />
                Xe công ty
              </label>
            </div>

            {type === "company" ? (
              <>
                <label>Công ty</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setLicensePlate("");
                  }}
                >
                  <option value="">-- Chọn công ty --</option>
                  {companies.map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>

                <label>Loại xe</label>
                <select
                  value={vehicleType}
                  onChange={(e) => {
                    setVehicleType(e.target.value);
                    setLicensePlate("");
                  }}
                  disabled={!selectedCompany}
                >
                  <option value="">-- Chọn loại xe --</option>
                  <option value="Car">Ô tô</option>
                  <option value="Motorbike">Xe máy</option>
                </select>

                <label>Xe thuộc công ty</label>
                <select
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  disabled={!selectedCompany || !vehicleType}
                >
                  <option value="">
                    {selectedCompany
                      ? vehicleType
                        ? "-- Chọn xe --"
                        : "Chọn loại xe trước"
                      : "Chọn công ty trước"}
                  </option>
                  {companyVehicles.map((v) => (
                    <option key={v.vehicleId} value={v.licensePlate}>
                      {v.licensePlate} • {v.vehicleType} • {v.connectorType}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label>Loại xe</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                >
                  <option value="Car">Ô tô</option>
                  <option value="Motorbike">Xe máy</option>
                </select>

                <label>Biển số xe</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="VD: 51H-12345"
                  required
                />
              </>
            )}

            <label>Trụ sạc</label>
            <select
              value={chargerId}
              onChange={(e) => setChargerId(e.target.value)}
            >
              <option value="">-- Chọn trụ sạc --</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} • {r.powerKW}kW • {r.status}
                </option>
              ))}
            </select>

            <label>Cổng sạc</label>
            <select
              value={portId}
              onChange={(e) => setPortId(e.target.value)}
              disabled={!chargerId}
            >
              <option value="">
                {chargerId ? "-- Chọn cổng sạc --" : "Chọn trụ trước"}
              </option>
              {ports.map((p) => (
                <option key={p.portId} value={p.portId}>
                  {p.code || p.portCode || `P-${p.portId}`} •{" "}
                  {p.connectorType} • {p.status} • {p.maxPowerKw}kW
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button
                className="sc-cancel"
                onClick={() => setShowModal(false)}
              >
                Hủy
              </button>
              <button
                className="sc-primary"
                onClick={handleStartNew}
                disabled={submitting}
              >
                {submitting ? "Đang khởi động..." : "Bắt đầu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
