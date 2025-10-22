// src/api/stationApi.js
const BASE_URL = "https://localhost:7268/api";

export const stationApi = {
  // Lấy danh sách tất cả trạm (có bao gồm chargers & ports)
  async getAllStations() {
    const res = await fetch(`${BASE_URL}/Stations`, { method: "GET" });
    if (!res.ok) throw new Error("Không thể tải danh sách trạm");
    return res.json();
  },

  // ✅ Lấy trạm phân trang
  async getPagedStations(page = 1, pageSize = 10) {
    const res = await fetch(
      `${BASE_URL}/Stations/paged?page=${page}&pageSize=${pageSize}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Không thể tải danh sách trạm có phân trang");
    return res.json();
  },

  // Thêm trạm mới
  async addStation(data) {
    const res = await fetch(`${BASE_URL}/Stations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Không thể thêm trạm mới");
    return res.json();
  },

  // Cập nhật trạm
  async updateStation(id, data) {
    const res = await fetch(`${BASE_URL}/Stations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Không thể cập nhật trạm");
    return res.json();
  },

  // ✅ Cập nhật trạng thái (status)
  async updateStationStatus(id, status) {
    const res = await fetch(`${BASE_URL}/Stations/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Không thể cập nhật trạng thái trạm");
    return res.json();
  },

  // Xóa trạm
  async deleteStation(id) {
    const res = await fetch(`${BASE_URL}/Stations/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Không thể xóa trạm");
    return true;
  },

  // ✅ Upload ảnh trạm
  async uploadStationImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/Stations/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Không thể tải ảnh trạm lên");
    return res.json();
  },

  // Thêm bộ sạc cho trạm
  async addCharger(stationId, data) {
    const res = await fetch(`${BASE_URL}/Stations/${stationId}/Chargers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Không thể thêm bộ sạc");
    return res.json();
  },

  // Cập nhật bộ sạc
  async updateCharger(id, data) {
    const res = await fetch(`${BASE_URL}/Chargers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Không thể cập nhật bộ sạc");
    return res.json();
  },

  // Xóa bộ sạc
  async deleteCharger(id) {
    const res = await fetch(`${BASE_URL}/Chargers/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Không thể xóa bộ sạc");
    return true;
  },

  // Thêm cổng sạc
  async addPort(chargerId, data) {
    const res = await fetch(`${BASE_URL}/Chargers/${chargerId}/Ports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Không thể thêm cổng sạc");
    return res.json();
  },

  // Cập nhật cổng sạc
  async updatePort(id, data) {
    const res = await fetch(`${BASE_URL}/Ports/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Không thể cập nhật cổng sạc");
    return res.json();
  },

  // Xóa cổng sạc
  async deletePort(id) {
    const res = await fetch(`${BASE_URL}/Ports/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Không thể xóa cổng sạc");
    return true;
  },
};
