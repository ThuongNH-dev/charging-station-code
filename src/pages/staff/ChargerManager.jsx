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
  try { return toArray(JSON.parse(raw)); } catch { return []; }
}

function pickPowerKW(obj = {}) {
  const candidates = [
    obj.powerKW, obj.PowerKW,
    obj.power, obj.Power,
    obj.maxPower, obj.MaxPower,
    obj.ratedPower, obj.RatedPower,
    obj.capacityKW, obj.CapacityKW,
    obj.outputPower, obj.OutputPower,
  ];
  for (const v of candidates) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "string") {
      const m = v.match(/[\d.]+/);
      if (m) return Number(m[0]);
    }
    if (!Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

/* ---------- Normalizers ---------- */
const normCharger = (c = {}) => ({
  id: c.id ?? c.chargerId ?? c.ChargerId,
  code: c.code ?? c.chargerCode ?? c.Code ?? `C-${c.id ?? ""}`,
  powerKW: pickPowerKW(c),
  status: (c.status ?? c.Status ?? ""),
  stationId: c.stationId ?? c.StationId,
});

const normPort = (p = {}) => ({
  id: p.id ?? p.portId ?? p.PortId,
  chargerId: p.chargerId ?? p.ChargerId ?? p.chargerID ?? p.ChargerID,
});

const normBooking = (b = {}) => ({
  id: String(b.id ?? b.bookingId ?? b.BookingId),
  portId: b.portId ?? b.PortId,
  status: b.status ?? b.Status ?? "",
  startTime: b.startTime ?? b.StartTime ?? b.createdAt ?? null,
});

export default function ChargerManager() {
  const [sp] = useSearchParams();
  const stationId = sp.get("stationId") || "";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true); setErr("");

      try {
        const q = stationId ? `?stationId=${encodeURIComponent(stationId)}` : "";

        const chargersRaw = await fetchAuthJSON(`${API_BASE}/Chargers${q}`);
        const chargers = toArray(chargersRaw).map(normCharger);

        const portsRaw = await fetchAuthJSON(`${API_BASE}/Ports${q}`);
        const ports = toArray(portsRaw).map(normPort);

        const bookingsRaw = await fetchAuthJSON(`${API_BASE}/Booking${q}`);
        const bookings = toArray(bookingsRaw).map(normBooking);

        const bookingsByPort = new Map();
        for (const b of bookings) {
          if (!b.portId) continue;
          if (!bookingsByPort.has(b.portId)) bookingsByPort.set(b.portId, []);
          bookingsByPort.get(b.portId).push(b);
        }
        for (const list of bookingsByPort.values()) {
          list.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
        }

        const portsByCharger = new Map();
        for (const p of ports) {
          if (!p.chargerId) continue;
          if (!portsByCharger.has(p.chargerId)) portsByCharger.set(p.chargerId, []);
          portsByCharger.get(p.chargerId).push(p);
        }

        const computed = chargers.map((c) => {
          const itsPorts = portsByCharger.get(c.id) || [];

          let latestBookingId = "-";
          let latestTime = 0;
          for (const p of itsPorts) {
            const list = bookingsByPort.get(p.id) || [];
            if (list.length) {
              const t = new Date(list[0].startTime || 0).getTime();
              if (t > latestTime) {
                latestTime = t;
                latestBookingId = list[0].id || "-";
              }
            }
          }

          return {
            id: c.id,
            code: c.code,
            powerKW: c.powerKW,
            status: c.status,
            latestBookingId,
          };
        });

        if (alive) { setRows(computed); setLoading(false); }
      } catch (e) {
        if (alive) { setErr(e?.message || "Lỗi tải dữ liệu"); setLoading(false); }
      }
    }

    load();
    return () => { alive = false; };
  }, [stationId]);

  const onStart  = (id) => console.log("Start", id);
  const onStop   = (id) => console.log("Stop", id);
  const onDetail = (id) => console.log("Detail", id);

  const renderAction = (r) => {
    const s = r.status;
    if (["Available", "Idle", "Có sẵn"].includes(s)) {
      return <button className="link" onClick={() => onStart(r.id)}>Bắt đầu</button>;
    }
    if (["Charging", "Active", "InProgress", "Đang sạc"].includes(s)) {
      return <button className="link" onClick={() => onStop(r.id)}>Dừng</button>;
    }
    return <button className="link" onClick={() => onDetail(r.id)}>Chi tiết</button>;
  };

  return (
    <div className="sc-wrap">
      <div className="sc-header">
        <h2>Danh sách trụ sạc</h2>
        <div className="sc-actions">
          <input className="sc-search" placeholder="🔍  Tìm kiếm" />
          <button className="sc-primary">+ Bắt đầu phiên</button>
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
                <tr><td colSpan={5} style={{ textAlign:"center" }}>Chưa có trụ sạc nào.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.code}</td>
                  <td>{r.powerKW != null ? `${r.powerKW}kW` : "-"}</td>
                  <td className={`status ${
                    ["Charging","Active","InProgress","Đang sạc"].includes(r.status) ? "charging"
                    : ["Error","Fault","Inactive","Lỗi","Không hoạt động"].includes(r.status) ? "error"
                    : "ok"
                  }`}>
                    {r.status}
                  </td>
                  <td>{r.latestBookingId || "-"}</td>
                  <td>{renderAction(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}