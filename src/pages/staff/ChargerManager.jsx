import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

/* ---------- Extract user-friendly error message ---------- */
function extractErrorMessage(error) {
  if (!error) return "Đã xảy ra lỗi không xác định";

  // Try to get error from response body (if it's a JSON string)
  let message = error.message || error.error || "";
  
  if (typeof message === "string" && message.length > 0) {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error) {
        message = typeof parsed.error === "string" ? parsed.error : parsed.error.error || "";
      } else if (typeof parsed === "string") {
        message = parsed;
      } else if (parsed?.message) {
        message = parsed.message;
      }
    } catch {
      // Not JSON, use message as is
    }
  }

  if (typeof message !== "string") {
    if (message?.error) {
      message = typeof message.error === "string" ? message.error : "";
    } else if (message?.message) {
      message = message.message;
    } else {
      message = "";
    }
  }

  // Clean up the message - remove stack traces and technical details
  if (message) {
    // First, try to extract meaningful error from common patterns
    // Look for user-friendly Vietnamese error messages (these are usually the first meaningful text)
    const userMessagePatterns = [
      /Trụ sạc đang bận hoặc không khả dụng[\.!。！]?/i,
      /Cổng sạc đang được sử dụng hoặc bị khóa[\.!。！]?/i,
      /Không tìm thấy[^\.!。！\n]*[\.!。！]?/i,
      /Không thể[^\.!。！\n]*[\.!。！]?/i,
      /Đã xảy ra lỗi[^\.!。！\n]*[\.!。！]?/i,
    ];
    
    let foundUserMessage = false;
    for (const pattern of userMessagePatterns) {
      const match = message.match(pattern);
      if (match && match[0]) {
        const extracted = match[0].trim();
        // Only use if it's a reasonable length (not too short, not too long)
        if (extracted.length >= 10 && extracted.length < 200) {
          message = extracted;
          foundUserMessage = true;
          break;
        }
      }
    }
    
    // If we didn't find a user-friendly message, clean up the original message
    if (!foundUserMessage) {
      // Remove stack trace (lines starting with "at " or containing file paths)
      message = message.split("\n")
        .filter(line => {
          const trimmed = line.trim();
          // Keep lines that don't look like stack traces or technical info
          return !trimmed.startsWith("at ") && 
                 !trimmed.includes("System.Exception") &&
                 !trimmed.includes("Stack Trace") &&
                 !trimmed.match(/^\s*at\s+\w+/) &&
                 !trimmed.match(/\.(js|ts|cs|dll|exe):\d+/) &&
                 !trimmed.match(/^at\s+/i) &&
                 !trimmed.toLowerCase().includes("user-agent") &&
                 !trimmed.toLowerCase().includes("accept-encoding") &&
                 !trimmed.toLowerCase().includes("cookie") &&
                 !trimmed.toLowerCase().includes("referer") &&
                 !trimmed.toLowerCase().includes("x-requested-with") &&
                 !trimmed.toLowerCase().includes("content-length") &&
                 !trimmed.toLowerCase().match(/^host:/) &&
                 !trimmed.match(/^\d{3}\s+[a-z]/i) && // HTTP status codes
                 trimmed.length > 0;
        })
        .join(" ")
        .trim();
    }

    // Remove common technical prefixes
    message = message
      .replace(/^System\.Exception:\s*/i, "")
      .replace(/^Error:\s*/i, "")
      .replace(/^Lỗi:\s*/i, "")
      .replace(/\s*at\s+.*$/i, "")
      .replace(/Stack Trace:.*$/is, "")
      .trim();

    // Extract message from JSON-like structures
    const jsonMatch = message.match(/\{\s*"error"\s*:\s*"([^"]+)"\s*\}/i);
    if (jsonMatch && jsonMatch[1]) {
      message = jsonMatch[1];
    }


    // If message is too long, take first sentence or first 200 chars
    if (message.length > 200) {
      const firstSentence = message.split(/[.!?。！？]/)[0];
      message = firstSentence.length > 0 && firstSentence.length < 200 
        ? firstSentence.trim() 
        : message.substring(0, 200).trim() + "...";
    }
  }

  return message || "Đã xảy ra lỗi không xác định";
}

export default function ChargerManager() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const stationId = sp.get("stationId") || "";

  const [rows, setRows] = useState([]);
  const [latestSessions, setLatestSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState("guest");
  const [vehicleType, setVehicleType] = useState("Car");
  const [chargerId, setChargerId] = useState("");
  const [portId, setPortId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [ports, setPorts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const redirectTimerRef = React.useRef(null);

  /* ---------- Cleanup timer on unmount ---------- */
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

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
    if (!chargerId || !portId || !licensePlate) {
      setFormError("⚠️ Vui lòng chọn trụ, cổng và nhập biển số!");
      return;
    }

    setFormError("");
    setSubmitting(true);
    try {
      const selectedPort = ports.find((p) => String(p.portId) === String(portId));
      const charger = rows.find((c) => String(c.id) === String(chargerId));

      let portCode =
  selectedPort?.code ||
  selectedPort?.Code ||
  selectedPort?.portCode ||
  selectedPort?.PortCode;

if (!portCode) {
  // ✅ Tự sinh PortCode fallback nếu API không trả về
  const portNum = String(portId).padStart(3, "0"); // -> 001, 002...
  portCode = `P${portNum}`;
  console.warn(`⚠️ API /Ports không có Code, sinh tạm PortCode = ${portCode}`);
}


      const chargerCode =
        charger?.code || charger?.Code || `C${chargerId}`;

      if (type === "guest") {
        const body = {
          licensePlate,
          portId: Number(portId),
          PortCode: portCode,
          ChargerCode: chargerCode,
          vehicleType,
        };

        console.log("🚀 Guest start body:", body);

        const res = await fetchAuthJSON(`${API_BASE}/ChargingSessions/guest/start`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        // Success - show success message and redirect
        setShowModal(false);
        setLicensePlate("");
        setPortId("");
        setType("guest");
        setFormError("");
        setSuccessMessage(res?.message || "✅ Phiên sạc (guest) đã được khởi động thành công!");
        
        // Clear any existing timer
        if (redirectTimerRef.current) {
          clearTimeout(redirectTimerRef.current);
        }
        
        // Redirect to sessions after 2 seconds
        redirectTimerRef.current = setTimeout(() => {
          navigate("/staff/sessions");
        }, 2000);
      } else {
        const found = await fetchAuthJSON(
          `${API_BASE}/Vehicles?licensePlate=${encodeURIComponent(
            licensePlate
          )}&vehicleType=${vehicleType}`
        );
        const v = toArray(
          found.items || found.data || found.results || found.$values || found
        )[0];
        if (!v?.vehicleId)
          throw new Error("Không tìm thấy xe này trong hệ thống công ty!");

        const body = {
          customerId: v.customerId,
          companyId: v.companyId,
          vehicleId: v.vehicleId,
          bookingId: null,
          portId: Number(portId),
          PortCode: portCode,
          ChargerCode: chargerCode,
        };

        console.log("🚀 Company start body:", body);

        const res = await fetchAuthJSON(`${API_BASE}/ChargingSessions/start`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        // Success - show success message and redirect
        setShowModal(false);
        setLicensePlate("");
        setPortId("");
        setType("guest");
        setFormError("");
        setSuccessMessage(res?.message || "✅ Phiên sạc (company) đã được khởi động thành công!");
        
        // Clear any existing timer
        if (redirectTimerRef.current) {
          clearTimeout(redirectTimerRef.current);
        }
        
        // Redirect to sessions after 2 seconds
        redirectTimerRef.current = setTimeout(() => {
          navigate("/staff/sessions");
        }, 2000);
      }
    } catch (e) {
      // Extract user-friendly error message
      const errorMsg = extractErrorMessage(e);
      setFormError(errorMsg);
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
          <button className="sc-primary" onClick={() => {
            setShowModal(true);
            setFormError("");
            setSuccessMessage("");
          }}>
            + Bắt đầu phiên
          </button>
        </div>
      </div>

      {loading && <div className="sc-empty">Đang tải…</div>}
      {err && <div className="sc-error">{err}</div>}
      
      {/* Success message */}
      {successMessage && (
        <div className="success-message-box">
          <div className="success-message-icon">
            ✓
          </div>
          <div className="success-message-content">
            {successMessage}
          </div>
          <button
            className="success-message-close"
            onClick={() => setSuccessMessage("")}
            aria-label="Đóng thông báo"
            title="Đóng"
          >
            ✕
          </button>
        </div>
      )}

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
              <button className="modal-close" onClick={() => {
                setShowModal(false);
                setFormError("");
              }}>
                ✕
              </button>
            </div>

            <p>Chọn loại khách hàng và thông tin cần thiết.</p>

            {/* Inline error message */}
            {formError && (
              <div className="error-message-box">
                <div className="error-message-icon">
                  ⚠
                </div>
                <div className="error-message-content">
                  {formError}
                </div>
                <button
                  className="error-message-close"
                  onClick={() => setFormError("")}
                  aria-label="Đóng thông báo lỗi"
                  title="Đóng"
                >
                  ✕
                </button>
              </div>
            )}

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

            <label>Loại xe</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="Car">Ô tô</option>
              <option value="Motorbike">Xe máy</option>
            </select>

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
                  {p.code || p.Code || `P-${p.portId}`} • {p.connectorType} • {p.status} •{" "}
                  {p.maxPowerKw}kW
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
