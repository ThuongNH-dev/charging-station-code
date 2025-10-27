// ✅ src/api/stationApi.js - BẢN CHỈNH SỬA VỚI LOGIC XỬ LÝ LỖI HOÀN CHỈNH
import { fetchAuthJSON, resolveUrl } from "../utils/api";

// === 1. HÀM CHUẨN HÓA DỮ LIỆU ===

// Chuẩn hóa object Port (Cổng sạc)
function normalizePort(p) {
  if (!p || typeof p !== "object") {
    console.warn(
      "normalizePort: Dữ liệu đầu vào không hợp lệ (null/undefined/không phải object). Trả về object rỗng."
    );
    return {}; // Trả về object rỗng
  }
  return {
    PortId: p.id ?? p.portId ?? p.PortId ?? "",
    Code: p.code ?? p.Code ?? "",
    ConnectorType: p.connectorType ?? p.ConnectorType ?? "",
    MaxPowerKw: Number(p.maxPowerKw ?? p.MaxPowerKw ?? 0),
    Status: p.status ?? p.Status ?? "",
    ChargerId: p.chargerId ?? p.ChargerId ?? "",
  };
}

// Chuẩn hóa object Charger (Bộ sạc)
function normalizeCharger(c) {
  if (!c || typeof c !== "object") {
    console.warn(
      "normalizeCharger: Dữ liệu đầu vào không hợp lệ (null/undefined/không phải object). Trả về object rỗng."
    );
    return {}; // Trả về object rỗng để tránh lỗi crash
  }
  return {
    ChargerId: c.id ?? c.chargerId ?? c.ChargerId ?? "",
    Code: c.code ?? c.Code ?? "",
    Type: c.type ?? c.Type ?? "",
    // Đảm bảo là số
    PowerKw: Number(
      c.maxPowerKw ?? c.MaxPowerKw ?? c.PowerKw ?? c.powerKw ?? 0
    ),
    Status: c.status ?? c.Status ?? "",
    StationId: c.stationId ?? c.StationId ?? "",
    ImageUrl: c.imageUrl ?? c.ImageUrl ?? c.imageurl ?? "",
    // Đệ quy chuẩn hóa các ports
    ports: Array.isArray(c.ports) ? c.ports.map(normalizePort) : [],
  };
}

// ✅ SỬA TRONG src/api/stationApi.js

function normalizeStation(s = {}) {
  if (!s || typeof s !== "object") {
    console.warn(
      "normalizeStation: Dữ liệu đầu vào không hợp lệ (null/undefined/không phải object). Trả về object rỗng."
    );
    return {};
  }

  // 1. Lấy giá trị trạng thái thô
  let rawStatus = s.status ?? s.Status ?? "";

  // 2. CHUẨN HÓA TRẠNG THÁI (STATUS) - Backend sử dụng "Open"/"Closed"
  let normalizedStatus = "Closed"; // Mặc định là Closed nếu không xác định

  // Kiểm tra các định dạng có thể có từ DB
  if (
    rawStatus === 1 ||
    String(rawStatus).toLowerCase() === "online" ||
    String(rawStatus).toLowerCase() === "onl" ||
    String(rawStatus).toLowerCase() === "active" ||
    String(rawStatus).toLowerCase() === "open" ||
    String(rawStatus) === "Đang hoạt động" // Thêm các chuỗi tiếng Việt nếu cần
  ) {
    normalizedStatus = "Open"; // Backend sử dụng "Open" thay vì "Active"
  }
  // Nếu không phải Open, giữ nguyên 'Closed' (hoặc kiểm tra rõ ràng cho Closed)
  else if (
    rawStatus === 0 ||
    String(rawStatus).toLowerCase() === "offline" ||
    String(rawStatus).toLowerCase() === "off" ||
    String(rawStatus).toLowerCase() === "closed" ||
    String(rawStatus) === "Nghỉ"
  ) {
    normalizedStatus = "Closed";
  }
  // Ghi chú: Nếu giá trị Status là một chuỗi tùy chỉnh (ví dụ: 'Maintenance'), bạn có thể giữ nguyên.

  return {
    StationId: s.id ?? s.stationId ?? s.StationId ?? s.Id,
    StationName: s.name ?? s.stationName ?? s.StationName ?? "",
    Address: s.address ?? s.Address ?? "",
    City: s.city ?? s.City ?? s.addressCity ?? "",
    Latitude: Number(s.lat ?? s.latitude ?? s.Latitude ?? 0),
    Longitude: Number(s.lng ?? s.longitude ?? s.Longitude ?? 0),
    ImageUrl: s.imageUrl ?? s.ImageUrl ?? s.thumbnail ?? "",

    // Gán trạng thái đã được chuẩn hóa
    Status: normalizedStatus,

    Power: s.power ?? s.Power ?? "",
    // ... (chargers logic giữ nguyên)
    chargers: s.connectors ?? s.Connectors ?? s.chargers ?? s.Chargers ?? [],
  };
}

// === 2. HÀM XỬ LÝ LỖI (CRUD API) ===

export const stationApi = {
  // --- 1️⃣ STATIONS ---

  async getAllStations() {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Stations"));
      // Luôn kiểm tra res có phải mảng không trước khi map
      return Array.isArray(res) ? res.map(normalizeStation) : [];
    } catch (error) {
      console.error("API Error: Lấy danh sách Trạm thất bại.", error);
      // Quan trọng: Trả về mảng rỗng để UI không bị crash
      return [];
    }
  },

  async createStation(stationData) {
    try {
      // Đảm bảo dữ liệu gửi lên khớp với API
      const res = await fetchAuthJSON(resolveUrl("/Stations"), {
        method: "POST",
        body: JSON.stringify(stationData),
      });
      // Nếu API trả về đối tượng trạm mới tạo, hãy chuẩn hóa nó
      return normalizeStation(res);
    } catch (error) {
      console.error("API Error: Thêm Trạm mới thất bại.", error);
      // Ném lại lỗi để component gọi biết rằng có vấn đề
      throw new Error(
        `Tạo trạm thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  // ✅ SỬA LOGIC TRONG updateStation
  async updateStation(stationId, stationData) {
    try {
      console.log("🔄 API: Đang gửi request cập nhật trạm:", {
        url: `/Stations/${stationId}`,
        method: "PUT",
        data: stationData,
        status: stationData.Status
      });

      // Đảm bảo dữ liệu được gửi đúng format
      const requestBody = JSON.stringify(stationData);
      console.log("📤 Request Body:", requestBody);

      // Thử endpoint chính trước
      let res = await fetchAuthJSON(resolveUrl(`/Stations/${stationId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: requestBody,
      });

      // Nếu endpoint chính không hoạt động, thử các endpoint khác
      if (!res) {
        console.warn("⚠️ Endpoint chính không hoạt động, thử endpoint khác...");
        
        // Thử endpoint với tên khác
        try {
          res = await fetchAuthJSON(resolveUrl(`/stations/${stationId}`), {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: requestBody,
          });
          console.log("📥 API Response (endpoint thay thế):", res);
        } catch (altErr) {
          console.warn("⚠️ Endpoint thay thế cũng không hoạt động:", altErr);
        }
      }

      console.log("📥 API Response:", res);
      console.log("📥 Response Status:", res?.status || "No status");
      console.log("📥 Response Data:", res);

      // ✅ SỬA LỖI: Backend trả về HTTP 204 No Content (thành công nhưng không có body)
      // Đây là hành vi bình thường của REST API khi cập nhật thành công
      let updatedData = res;

      // Nếu API trả về null/undefined (HTTP 204), coi như thành công
      if (res === null || res === undefined) {
        console.log("✅ Backend trả về HTTP 204 No Content - cập nhật thành công");
        console.log("✅ Sử dụng dữ liệu đã gửi để cập nhật UI");
        // Sử dụng dữ liệu đã gửi, kết hợp với StationId
        updatedData = { ...stationData, StationId: stationId };
      }

      // Trả về dữ liệu đã được chuẩn hóa (có thể là res hoặc stationData)
      return normalizeStation(updatedData);
    } catch (error) {
      // Giữ nguyên logic xử lý lỗi API thất bại (4xx, 5xx, network errors)
      console.error(`API Error: Sửa Trạm ID ${stationId} thất bại.`, error);
      throw new Error(
        `Cập nhật trạm thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  async deleteStation(stationId) {
    try {
      await fetchAuthJSON(resolveUrl(`/Stations/${stationId}`), {
        method: "DELETE",
      });
      // Trả về true nếu thành công
      return true;
    } catch (error) {
      console.error(`API Error: Xóa Trạm ID ${stationId} thất bại.`, error);
      throw new Error(
        `Xóa trạm thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  // --- 2️⃣ CHARGERS ---

  async getAllChargers() {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Chargers"));
      return Array.isArray(res) ? res.map(normalizeCharger) : [];
    } catch (error) {
      console.error("API Error: Lấy danh sách Bộ sạc thất bại.", error);
      return [];
    }
  },

  async createCharger(chargerData) {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Chargers"), {
        method: "POST",
        body: JSON.stringify(chargerData),
      });
      let addedData = res;
      if (!res) {
        console.warn(
          "Tạo Bộ sạc thành công (Backend trả về rỗng). Sử dụng dữ liệu đầu vào."
        );
        addedData = chargerData; // Sử dụng dữ liệu đã gửi đi để tạo đối tượng tạm
      }
      return normalizeCharger(addedData);
    } catch (error) {
      console.error("API Error: Thêm Bộ sạc mới thất bại.", error);
      throw new Error(
        `Tạo bộ sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  async updateCharger(chargerId, chargerData) {
    try {
      const res = await fetchAuthJSON(resolveUrl(`/Chargers/${chargerId}`), {
        method: "PUT",
        body: JSON.stringify(chargerData),
      });
      let updatedData = res;

      // KIỂM TRA QUAN TRỌNG:
      if (!res) {
        console.warn(
          `Cập nhật Bộ sạc ID ${chargerId} thành công (Backend trả về rỗng). Sử dụng dữ liệu đầu vào.`
        );
        // Tạo đối tượng dữ liệu cập nhật từ đầu vào và ID
        updatedData = { ...chargerData, ChargerId: chargerId };
      }

      // SỬA LỖI: Sử dụng biến 'updatedData' đã được kiểm tra/gán lại
      return normalizeCharger(updatedData); // <--- ĐÃ SỬA LỖI
    } catch (error) {
      console.error(`API Error: Sửa Bộ sạc ID ${chargerId} thất bại.`, error);
      throw new Error(
        `Cập nhật bộ sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  async deleteCharger(chargerId) {
    try {
      await fetchAuthJSON(resolveUrl(`/Chargers/${chargerId}`), {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      console.error(`API Error: Xóa Bộ sạc ID ${chargerId} thất bại.`, error);
      throw new Error(
        `Xóa bộ sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  // --- 3️⃣ PORTS ---

  async getAllPorts() {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Ports"));
      return Array.isArray(res) ? res.map(normalizePort) : [];
    } catch (error) {
      console.error("API Error: Lấy danh sách Cổng sạc thất bại.", error);
      return [];
    }
  },

  /// ✅ HÀM CREATE: SỬ DỤNG portData
  // ✅ BẢN SỬA LỖI CHO createPort
  async createPort(portData) {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Ports"), {
        method: "POST",
        body: JSON.stringify(portData),
      });

      let addedData = res;

      // KIỂM TRA QUAN TRỌNG:
      // Nếu API trả về rỗng (null/undefined), giả định thành công và sử dụng
      // dữ liệu đã gửi (portData) để cập nhật UI, đồng thời gán một ID tạm thời
      // nếu portData chưa có ID (tùy thuộc vào cách Backend gán ID).
      if (!res) {
        console.warn(
          `Tạo Cổng sạc thành công (Backend trả về rỗng). Sử dụng dữ liệu đầu vào.`
        );
        // Nếu Backend không trả ID, bạn có thể cần ID tạm thời ở đây
        // (Hoặc giả định Backend đã xử lý và portData đủ để UI hoạt động)
        addedData = portData;
      }

      // SỬA LỖI: Sử dụng biến 'addedData' đã được kiểm tra/gán lại
      return normalizePort(addedData);
    } catch (error) {
      console.error("API Error: Thêm Cổng sạc mới thất bại.", error);
      // Ném lỗi để component React có thể bắt và hiển thị
      throw new Error(
        `Tạo cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  // ✅ HÀM UPDATE: SỬ DỤNG portData
  // ✅ src/api/stationApi.js - THÊM HÀM updatePort ĐÃ SỬA LỖI
  async updatePort(portId, portData) {
    try {
      const res = await fetchAuthJSON(resolveUrl(`/Ports/${portId}`), {
        method: "PUT", // Hoặc PATCH
        body: JSON.stringify(portData),
      });

      let updatedData = res;

      // KIỂM TRA QUAN TRỌNG:
      // Nếu API không trả về đối tượng nào (res là null/undefined),
      // giả định thành công và sử dụng dữ liệu đã gửi.
      if (!res) {
        console.warn(
          `Cập nhật Cổng sạc ID ${portId} thành công (Backend trả về rỗng). Sử dụng dữ liệu đầu vào.`
        );
        // Tạo đối tượng dữ liệu cập nhật từ đầu vào và ID
        updatedData = { ...portData, PortId: portId };
      }

      // Gọi hàm normalize đã được sửa lỗi
      return normalizePort(updatedData);
    } catch (error) {
      console.error(`API Error: Sửa Cổng sạc ID ${portId} thất bại.`, error);
      throw new Error(
        `Cập nhật cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  // ✅ HÀM DELETE: KHÔNG CẦN DÙNG portData
  async deletePort(portId) {
    try {
      await fetchAuthJSON(resolveUrl(`/Ports/${portId}`), {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      console.error(`API Error: Xóa Cổng sạc ID ${portId} thất bại.`, error);
      throw new Error(
        `Xóa cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },
};
