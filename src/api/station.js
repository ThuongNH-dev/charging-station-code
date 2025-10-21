// src/api/station.js
import { getApiBase, fetchAuthJSON } from "../utils/api";
const API_BASE = getApiBase();

function normalizeStation(s = {}) {
  return {
    id: s.id ?? s.stationId ?? s.StationId ?? s.Id,
    name: s.name ?? s.stationName ?? s.StationName ?? "",
    address: s.address ?? s.Address ?? "",
    city: s.city ?? s.City ?? s.addressCity ?? "",
    lat: Number(s.lat ?? s.latitude ?? s.Latitude),
    lng: Number(s.lng ?? s.longitude ?? s.Longitude),
    imageUrl: s.imageUrl ?? s.ImageUrl ?? s.thumbnail ?? "",
    status: s.status ?? s.Status ?? "",
    power: s.power ?? s.Power ?? "",
    connectors: s.connectors ?? s.Connectors ?? [],
  };
}

// ✅ NAMED export — đúng cái bạn đang import trong StationList.jsx
export const fetchStations = async ({ page = 1, pageSize = 100, keyword = "" } = {}) => {
  const qs = new URLSearchParams({ page, pageSize, keyword }).toString();
  const res = await fetchAuthJSON(`${API_BASE}/Stations?${qs}`, { method: "GET" });
  const items = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
  return items.map(normalizeStation);
};

// (tuỳ chọn)
export const fetchStationById = async (id) => {
  const res = await fetchAuthJSON(`${API_BASE}/Stations/${encodeURIComponent(id)}`, { method: "GET" });
  return normalizeStation(res);
};

// ❌ KHÔNG dùng CommonJS kiểu module.exports ở file này
// ❌ KHÔNG viết `export default function fetchStations(){...}` (sẽ không có named export)
