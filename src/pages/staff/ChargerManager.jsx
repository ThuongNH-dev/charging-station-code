import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getApiBase, fetchAuthJSON } from "../../utils/api";
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
  const [sp] = useSearchParams();
  const stationId = sp.get("stationId") || "";

  const [rows, setRows] = useState([]);
  const [latestSessions, setLatestSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState("guest");
  const [chargerId, setChargerId] = useState("");
  const [portId, setPortId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [ports, setPorts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Load chargers + lấy phiên gần nhất ---------- */
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const q = stationId ? `?stationId=${encodeURIComponent(stationId)}` : "";
        const chargersRaw = await fetchAuthJSON(`${API_BASE}/Chargers${q}`);
        const chargers = toArray(chargersRaw).map(normCharger);

        const sessionsRaw = await fetchAuthJSON(`${API_BASE}/ChargingSessions`);
        const sessions = toArray(sessionsRaw);

        const latestMap = {};
        for (const s of sessions) {
          const key = s.portId ?? s.PortId ?? s.chargerId ?? s.ChargerId;
          if (!key) continue;
          if (!latestMap[key] || new Date(s.startedAt) > new Date(latestMap[key].startedAt)) {
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
  }, [stationId]);

  /* ---------- Lấy cổng theo chargerId ---------- */
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
        console.log(`✅ Ports của trụ ${chargerId}:`, filtered);
      } catch (e) {
        console.error("❌ Lỗi tải cổng sạc:", e);
        setPorts([]);
      }
    }
    loadPorts();
  }, [chargerId]);

  /* ---------- Hiển thị phiên gần nhất ---------- */
  const renderLatest = (r) => {
    const found = latestSessions.find(
      (s) =>
        String(s.portId) === String(r.id) || String(s.chargerId) === String(r.id)
    );
    if (!found) return "—";
    const id = found.chargingSessionId || found.id;
    const start = found.startedAt
      ? new Date(found.startedAt).toLocaleString("vi-VN")
      : "Không rõ";
    return <span title={`Bắt đầu: ${start}`}>S-{id}</span>;
  };

  /* ---------- Cập nhật trạng thái ---------- */
  async function updateChargerStatus(chargerId, newStatus) {
    try {
      const statusMap = {
        Available: "Online",
        available: "Online",
        Charging: "Online",
        charging: "Online",
        Offline: "Offline",
        offline: "Offline",
        Off: "Offline",
        off: "Offline",
        Error: "OutOfOrder",
        error: "OutOfOrder",
        Fault: "OutOfOrder",
        fault: "OutOfOrder",
      };
      const apiStatus = statusMap[newStatus] || newStatus;

      await fetchAuthJSON(`${API_BASE}/Chargers/${chargerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: apiStatus }),
        headers: { "Content-Type": "application/json" },
      });

      const chargersRaw = await fetchAuthJSON(`${API_BASE}/Chargers`);
      setRows(toArray(chargersRaw).map(normCharger));
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  }

  /* ---------- Bắt đầu phiên ---------- */
  async function handleStartNew() {
    if (!chargerId || !portId || !licensePlate)
      return alert("⚠️ Vui lòng chọn trụ, cổng và nhập biển số!");

    setSubmitting(true);
    try {
      if (type === "guest") {
        await fetchAuthJSON(`${API_BASE}/ChargingSessions/guest/start`, {
          method: "POST",
          body: JSON.stringify({
            licensePlate,
            portId: Number(portId),
          }),
        });
        alert("✅ Phiên sạc (Guest) đã khởi động!");
      } else {
        const found = await fetchAuthJSON(
          `${API_BASE}/Vehicles?licensePlate=${encodeURIComponent(licensePlate)}`
        );
        const v = toArray(found.items || found.data || found.results || found.$values || found)[0];
        if (!v?.vehicleId)
          throw new Error("Không tìm thấy xe này trong hệ thống công ty!");

        const body = {
          customerId: v.customerId,
          companyId: v.companyId,
          vehicleId: v.vehicleId,
          bookingId: null,
          portId: Number(portId),
        };

        await fetchAuthJSON(`${API_BASE}/ChargingSessions/start`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        alert("✅ Phiên sạc (Company) đã khởi động!");
      }

      setShowModal(false);
      setLicensePlate("");
      setPortId("");
      setType("guest");
    } catch (e) {
      alert(`❌ Lỗi: ${e.message || JSON.stringify(e)}`);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- Render Action ---------- */
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
        <div className="sc-actions">
          <input className="sc-search" placeholder="🔍  Tìm kiếm" />
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
                    Chưa có trụ sạc nào.
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
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <p>Chọn loại khách hàng và thông tin cần thiết.</p>

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

            <label>Trụ sạc</label>
            <select value={chargerId} onChange={(e) => setChargerId(e.target.value)}>
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
                  Cổng {p.portId} • {p.connectorType} • {p.status} • {p.maxPowerKw}kW
                </option>
              ))}
            </select>

            <label>Biển số xe</label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="VD: 51H-12345"
              required
            />

            <div className="modal-actions">
              <button className="sc-cancel" onClick={() => setShowModal(false)}>
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
