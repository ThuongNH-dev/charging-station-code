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

/* ---------- Component ---------- */
export default function ChargerManager() {
  const [sp] = useSearchParams();
  const stationId = sp.get("stationId") || "";

  const [rows, setRows] = useState([]);
  const [latestSessions, setLatestSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [chargerId, setChargerId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [portId, setPortId] = useState("");
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
  }, [stationId]);

  /* ---------- Hiển thị phiên gần nhất ---------- */
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

  /* ---------- Cập nhật trạng thái trụ ---------- */
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
      const response = await fetchAuthJSON(`${API_BASE}/Chargers/${chargerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: apiStatus }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const q = stationId ? `?stationId=${encodeURIComponent(stationId)}` : "";
      const chargersRaw = await fetchAuthJSON(`${API_BASE}/Chargers${q}`);
      const chargers = toArray(chargersRaw).map(normCharger);
      setRows(chargers);

      return response;
    } catch (err) {
      console.error("❌ Lỗi đổi trạng thái trụ:", err);
      throw err;
    }
  }

  /* ---------- Bắt đầu phiên ---------- */
  async function handleStart() {
    if (!chargerId || !customerId || !vehicleId || !portId)
      return alert("⚠️ Vui lòng nhập đủ thông tin!");

    setSubmitting(true);
    try {
      const body = {
        customerId: Number(customerId),
        companyId: 0,
        vehicleId: Number(vehicleId),
        bookingId: null,
        portId: Number(portId),
      };

      console.log("🚀 Gửi dữ liệu:", body);

      const res = await fetchAuthJSON(`${API_BASE}/ChargingSessions/start`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      console.log("✅ Phản hồi từ API:", res);

      const message =
        res?.message ||
        "✅ Phiên sạc đã được khởi động thành công!";
      alert(message);

      // Đóng modal + reset form
      setShowModal(false);
      setChargerId("");
      setCustomerId("");
      setVehicleId("");
      setPortId("");

      // Cập nhật lại danh sách trụ
      const q = stationId ? `?stationId=${encodeURIComponent(stationId)}` : "";
      const chargersRaw = await fetchAuthJSON(`${API_BASE}/Chargers${q}`);
      const chargers = toArray(chargersRaw).map(normCharger);
      setRows(chargers);

      // Lấy lại danh sách phiên để cập nhật "Phiên gần nhất"
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
      setLatestSessions(Object.values(latestMap));
    } catch (e) {
      console.error("❌ Lỗi bắt đầu phiên:", e);
      alert(`❌ Lỗi khởi động phiên:\n${e.message || JSON.stringify(e)}`);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- Dừng phiên ---------- */
  async function handleStop(charger) {
    if (!window.confirm("Bạn có chắc muốn dừng phiên sạc?")) return;
    try {
      const sessions = await fetchAuthJSON(`${API_BASE}/ChargingSessions`);
      const current = toArray(sessions).find(
        (s) =>
          s.status?.toLowerCase() === "charging" &&
          s.portId &&
          s.customerId &&
          s.vehicleId
      );
      if (!current) throw new Error("Không tìm thấy phiên đang chạy cho trụ này!");

      await fetchAuthJSON(`${API_BASE}/ChargingSessions/end`, {
        method: "POST",
        body: JSON.stringify({
          chargingSessionId:
            current.chargingSessionId ?? current.id ?? current.sessionId,
          endSoc: 80,
        }),
      });

      const q = stationId ? `?stationId=${encodeURIComponent(stationId)}` : "";
      const chargersRaw = await fetchAuthJSON(`${API_BASE}/Chargers${q}`);
      const chargers = toArray(chargersRaw).map(normCharger);
      setRows(chargers);

      alert("✅ Phiên sạc đã dừng!");
    } catch (e) {
      console.error(e);
      alert(`❌ Lỗi dừng phiên:\n${e.message}`);
    }
  }

  /* ---------- Render Action ---------- */
  const renderAction = (r) => {
    const s = (r.status || "").toLowerCase();

    if (s === "online") {
      return (
        <button
          className="link"
          onClick={async () => {
            if (window.confirm("Bạn có chắc muốn tắt trụ sạc này?")) {
              try {
                await updateChargerStatus(r.id, "Offline");
                alert("✅ Trụ sạc đã được tắt!");
              } catch (err) {
                console.error(err);
                alert(`❌ Lỗi khi tắt trụ: ${err.message || JSON.stringify(err)}`);
              }
            }
          }}
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
          onClick={async () => {
            if (window.confirm("Bạn có chắc muốn bật trụ sạc này?")) {
              try {
                await updateChargerStatus(r.id, "Online");
                alert("✅ Trụ sạc đã được bật!");
              } catch (err) {
                console.error(err);
                alert(`❌ Lỗi khi bật trụ: ${err.message || JSON.stringify(err)}`);
              }
            }
          }}
          style={{ color: "#16a34a" }}
        >
          Bắt đầu
        </button>
      );
    }

    if (s === "outoforder") {
      return (
        <button
          className="link"
          onClick={async () => {
            if (window.confirm("Sửa xong trụ này chưa? Khôi phục về Online?")) {
              try {
                await updateChargerStatus(r.id, "Online");
                alert("✅ Trụ sạc đã được khôi phục!");
              } catch (err) {
                console.error(err);
                alert(`❌ Lỗi: ${err.message || JSON.stringify(err)}`);
              }
            }
          }}
          style={{ color: "#16a34a" }}
        >
          Khôi phục
        </button>
      );
    }

    return (
      <button
        className="link"
        onClick={async () => {
          const data = await fetchAuthJSON(`${API_BASE}/Chargers/${r.id}`);
          alert(`🔍 Thông tin trụ:\n${JSON.stringify(data, null, 2)}`);
        }}
      >
        Chi tiết
      </button>
    );
  };

  return (
    <div className="sc-wrap">
      <div className="sc-header">
        <h2>Danh sách trụ sạc</h2>
        <div className="sc-actions">
          <input className="sc-search" placeholder="🔍  Tìm kiếm" />
          <button
            className="sc-primary"
            onClick={() => {
              setChargerId("");
              setShowModal(true);
            }}
          >
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
                      <span className={`status ${
                        r.status?.toLowerCase() === "outoforder"
                          ? "error"
                          : r.status?.toLowerCase() === "offline"
                          ? "error"
                          : "ok"
                      }`}>
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
                onClick={() => {
                  setShowModal(false);
                  setCustomerId("");
                  setVehicleId("");
                  setPortId("");
                  setChargerId("");
                }}
              >
                ✕
              </button>
            </div>
            <p>Nhập thông tin cần thiết để bắt đầu.</p>

            {!chargerId ? (
              <>
                <label>Mã trụ sạc</label>
                <select
                  value={chargerId}
                  onChange={(e) => setChargerId(e.target.value)}
                  required
                >
                  <option value="">Chọn trụ sạc</option>
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} • {r.powerKW}kW • {r.status}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div
                style={{
                  padding: "10px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              >
                <label>Mã trụ sạc đã chọn</label>
                <p
                  style={{
                    margin: "5px 0 0 0",
                    fontWeight: "600",
                    color: "#16a34a",
                  }}
                >
                  {rows.find((r) => r.id === chargerId)?.code || chargerId}
                </p>
              </div>
            )}

            <label>Port ID (Bắt buộc)</label>
            <input
              type="number"
              value={portId}
              onChange={(e) => setPortId(e.target.value)}
              placeholder="VD: 1"
              min="1"
              required
            />

            <label>Customer ID (Bắt buộc)</label>
            <input
              type="number"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="VD: 4"
              min="1"
              required
            />

            <label>Vehicle ID (Bắt buộc)</label>
            <input
              type="number"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="VD: 14"
              min="1"
              required
            />

            <div className="modal-actions">
              <button
                className="sc-cancel"
                onClick={() => {
                  setShowModal(false);
                  setCustomerId("");
                  setVehicleId("");
                  setPortId("");
                  setChargerId("");
                }}
              >
                Hủy
              </button>
              <button
                className="sc-primary"
                onClick={handleStart}
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