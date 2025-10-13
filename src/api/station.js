const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function normalizeStation(s) {
  return {
    id: s.id ?? s.stationId ?? s.StationId,
    name: s.name ?? s.stationName ?? s.StationName,
    address: s.address ?? s.Address ?? "",
    city: s.city ?? s.City ?? "",
    lat: parseFloat(s.lat ?? s.latitude ?? s.Latitude),
    lng: parseFloat(s.lng ?? s.longitude ?? s.Longitude),
    imageUrl: s.imageUrl ?? s.ImageUrl ?? "",
    status: s.status ?? s.Status ?? "Active",
  };
}

export async function fetchStations() {
  const res = await fetch(`${API_BASE}/Stations`);
  if (!res.ok) throw new Error(`Lỗi tải dữ liệu (${res.status})`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(normalizeStation);
}
