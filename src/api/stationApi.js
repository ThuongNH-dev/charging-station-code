// ✅ src/api/stationApi.js
const BASE_URL = "https://localhost:7268/api";

// Xử lý phản hồi từ server
const handleResponse = async (res, resourceName) => {
  if (!res.ok) {
    const errorDetail = await res.text();
    console.error(
      `❌ Lỗi khi fetch ${resourceName}: ${res.status} - ${errorDetail}`
    );
    throw new Error(`Không thể lấy ${resourceName}.`);
  }
  return res.json();
};

export const stationApi = {
  // 1️⃣ -------- STATIONS (Trạm) --------

  // ✅ Lấy tất cả trạm
  async getAllStations() {
    const res = await fetch(`${BASE_URL}/Stations`);
    return handleResponse(res, "Stations");
  },

  // ✅ Lấy trạm có phân trang (nếu BE hỗ trợ)
  async getPagedStations(page = 1, pageSize = 10) {
    const res = await fetch(
      `${BASE_URL}/Stations/paged?page=${page}&pageSize=${pageSize}`
    );
    return handleResponse(res, "Paged Stations");
  },

  // ✅ Thêm trạm mới
  async addStation(data) {
    const body = { ...data };
    const res = await fetch(`${BASE_URL}/Stations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleResponse(res, "Add Station");
  },

  // ✅ Cập nhật trạm
  async updateStation(stationId, data) {
    const res = await fetch(`${BASE_URL}/Stations/${stationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res, "Update Station");
  },

  // ✅ Cập nhật trạng thái trạm
  async updateStationStatus(stationId, status) {
    const res = await fetch(`${BASE_URL}/Stations/${stationId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res, "Update Station Status");
  },

  // ✅ Xóa trạm
  async deleteStation(stationId) {
    const res = await fetch(`${BASE_URL}/Stations/${stationId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Không thể xóa trạm.");
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
    return handleResponse(res, "Upload Station Image");
  },

  // 2️⃣ -------- CHARGERS (Trụ) --------

  // ✅ Lấy tất cả trụ
  async getAllChargers() {
    const res = await fetch(`${BASE_URL}/Chargers`);
    return handleResponse(res, "Chargers");
  },

  // ✅ Lấy trụ theo trạm
  async getChargersByStation(stationId) {
    const res = await fetch(`${BASE_URL}/Stations/${stationId}/Chargers`);
    return handleResponse(res, "Chargers by Station");
  },

  // ✅ Thêm trụ mới vào trạm-----
  async addCharger(stationId, data) {
    const body = { ...data, stationId };
    const res = await fetch(`${BASE_URL}/Chargers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleResponse(res, "Add Charger");
  },

  // ✅ Cập nhật trụ
  async updateCharger(chargerId, data) {
    // ✅ Đảm bảo lấy đúng id dù trả về chữ hoa hay thường
    const id = chargerId?.chargerId ?? chargerId?.ChargerId ?? chargerId;

    if (!id) throw new Error("Không tìm thấy ChargerId để cập nhật.");

    const res = await fetch(`${BASE_URL}/Chargers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse(res, "Update Charger");
  },

  // ✅ Xóa trụ
  async deleteCharger(chargerId) {
    const res = await fetch(`${BASE_URL}/Chargers/${chargerId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Không thể xóa trụ.");
    return true;
  },

  // 3️⃣ -------- PORTS (Cổng) --------

  // ✅ Lấy tất cả cổng
  async getAllPorts() {
    const res = await fetch(`${BASE_URL}/Ports`);
    return handleResponse(res, "Ports");
  },

  // ✅ Lấy cổng theo trụ
  async getPortsByCharger(chargerId) {
    const res = await fetch(`${BASE_URL}/Chargers/${chargerId}/Ports`);
    return handleResponse(res, "Ports by Charger");
  },

  // Thêm cổng vào trụ sạc
  async addPort(chargerId, data) {
    if (!chargerId) throw new Error("ChargerId không được để trống");

    const res = await fetch(`${BASE_URL}/Ports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data), // body phải có stationId, code, ConnectorType, MaxPowerKw, Status
    });

    return handleResponse(res, "Add Port");
  },

  // ✅ Cập nhật cổng
  async updatePort(portId, data) {
    const res = await fetch(`${BASE_URL}/Ports/${portId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res, "Update Port");
  },

  // ✅ Xóa cổng
  async deletePort(portId) {
    const res = await fetch(`${BASE_URL}/Ports/${portId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Không thể xóa cổng.");
    return true;
  },
};
