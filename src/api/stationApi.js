// ✅ src/api/stationApi.js - BẢN CHỈNH SỬA VỚI LOGIC XỬ LÝ LỖI HOÀN CHỈNH
import { fetchAuthJSON, resolveUrl } from "../utils/api";

// === 1. HÀM CHUẨN HÓA DỮ LIỆU ===

// Chuẩn hóa object Port (Cổng sạc)
function normalizePort(p) {
  if (!p || typeof p !== "object") {
    console.warn(
      "normalizePort: Dữ liệu đầu vào không hợp lệ (null/undefined/không phải object). Trả về object rỗng."
    );
    return {};
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
    return {};
  }
  return {
    ChargerId: c.id ?? c.chargerId ?? c.ChargerId ?? "",
    Code: c.code ?? c.Code ?? "",
    Type: c.type ?? c.Type ?? "",
    PowerKw: Number(
      c.maxPowerKw ?? c.MaxPowerKw ?? c.PowerKw ?? c.powerKw ?? 0
    ),
    Status: c.status ?? c.Status ?? "",
    StationId: c.stationId ?? c.StationId ?? "",
    ImageUrl: c.imageUrl ?? c.ImageUrl ?? c.imageurl ?? "",
    ports: Array.isArray(c.ports) ? c.ports.map(normalizePort) : [],
  };
}

function normalizeStation(s = {}) {
  if (!s || typeof s !== "object") {
    console.warn(
      "normalizeStation: Dữ liệu đầu vào không hợp lệ (null/undefined/không phải object). Trả về object rỗng."
    );
    return {};
  }

  let rawStatus = s.status ?? s.Status ?? "";
  let normalizedStatus = "Closed";

  if (
    rawStatus === 1 ||
    String(rawStatus).toLowerCase() === "online" ||
    String(rawStatus).toLowerCase() === "onl" ||
    String(rawStatus).toLowerCase() === "active" ||
    String(rawStatus).toLowerCase() === "open" ||
    String(rawStatus) === "Đang hoạt động"
  ) {
    normalizedStatus = "Open";
  } else if (
    rawStatus === 0 ||
    String(rawStatus).toLowerCase() === "offline" ||
    String(rawStatus).toLowerCase() === "off" ||
    String(rawStatus).toLowerCase() === "closed" ||
    String(rawStatus) === "Nghỉ"
  ) {
    normalizedStatus = "Closed";
  }

  return {
    StationId: s.id ?? s.stationId ?? s.StationId ?? s.Id,
    StationName: s.name ?? s.stationName ?? s.StationName ?? "",
    Address: s.address ?? s.Address ?? "",
    City: s.city ?? s.City ?? s.addressCity ?? "",
    Latitude: Number(s.lat ?? s.latitude ?? s.Latitude ?? 0),
    Longitude: Number(s.lng ?? s.longitude ?? s.Longitude ?? 0),
    ImageUrl: s.imageUrl ?? s.ImageUrl ?? s.thumbnail ?? "",
    Status: normalizedStatus,
    Power: s.power ?? s.Power ?? "",
    chargers: s.connectors ?? s.Connectors ?? s.chargers ?? s.Chargers ?? [],
  };
}

async function _getActiveSessionByPort(portId) {
  if (!portId) return null;

  // ❗Chỉ dùng các endpoint có /api để tránh router nuốt "active" như /{controller}/{id}
  const tryGets = [
    `/api/ChargingSessions/active?portId=${encodeURIComponent(portId)}`,
    `/api/ChargingSessions/active-by-port?portId=${encodeURIComponent(portId)}`,
    `/api/Ports/${encodeURIComponent(portId)}/active-session`,
    `/api/ports/${encodeURIComponent(portId)}/active-session`,
  ];

  for (const ep of tryGets) {
    try {
      const res = await fetchAuthJSON(resolveUrl(ep), { method: "GET" });
      if (res) return res; // { chargingSessionId, ... } hoặc null
    } catch (e) {
      console.warn(
        "[stationApi] getActiveSessionByPort fail @",
        ep,
        e?.message || e
      );
    }
  }

  // (Fallback hiếm gặp) một số BE cho phép POST để truy vấn
  const tryPosts = [
    { url: `/api/ChargingSessions/active`, body: { portId } },
    { url: `/api/charging-sessions/active`, body: { portId } },
  ];
  for (const { url, body } of tryPosts) {
    try {
      const res = await fetchAuthJSON(resolveUrl(url), {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res) return res;
    } catch (e) {
      console.warn(
        "[stationApi] getActiveSessionByPort(POST) fail @",
        url,
        e?.message || e
      );
    }
  }

  return null;
}

// === 2. HÀM XỬ LÝ LỖI (CRUD API) ===

export const stationApi = {
  // --- 1️⃣ STATIONS ---
  async getAllStations() {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Stations"));
      return Array.isArray(res) ? res.map(normalizeStation) : [];
    } catch (error) {
      console.error("API Error: Lấy danh sách Trạm thất bại.", error);
      return [];
    }
  },

  async createStation(stationData) {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Stations"), {
        method: "POST",
        body: JSON.stringify(stationData),
      });
      return normalizeStation(res);
    } catch (error) {
      console.error("API Error: Thêm Trạm mới thất bại.", error);
      throw new Error(
        `Tạo trạm thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  async updateStation(stationId, stationData) {
    try {
      console.log("🔄 API: Đang gửi request cập nhật trạm:", {
        url: `/Stations/${stationId}`,
        method: "PUT",
        data: stationData,
        status: stationData.Status,
      });

      const requestBody = JSON.stringify(stationData);

      let res = await fetchAuthJSON(resolveUrl(`/Stations/${stationId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: requestBody,
      });

      if (!res) {
        console.warn("⚠️ Endpoint chính không hoạt động, thử endpoint khác...");
        try {
          res = await fetchAuthJSON(resolveUrl(`/stations/${stationId}`), {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: requestBody,
          });
          console.log("📥 API Response (endpoint thay thế):", res);
        } catch (altErr) {
          console.warn("⚠️ Endpoint thay thế cũng không hoạt động:", altErr);
        }
      }

      let updatedData = res;
      if (res === null || res === undefined) {
        console.log(
          "✅ Backend trả về HTTP 204 No Content - cập nhật thành công"
        );
        updatedData = { ...stationData, StationId: stationId };
      }

      return normalizeStation(updatedData);
    } catch (error) {
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
        addedData = chargerData;
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
      if (!res) {
        console.warn(
          `Cập nhật Bộ sạc ID ${chargerId} thành công (Backend trả về rỗng). Sử dụng dữ liệu đầu vào.`
        );
        updatedData = { ...chargerData, ChargerId: chargerId };
      }
      return normalizeCharger(updatedData);
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

  async createPort(portData) {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Ports"), {
        method: "POST",
        body: JSON.stringify(portData),
      });

      let addedData = res;
      if (!res) {
        console.warn(
          `Tạo Cổng sạc thành công (Backend trả về rỗng). Sử dụng dữ liệu đầu vào.`
        );
        addedData = portData;
      }
      return normalizePort(addedData);
    } catch (error) {
      console.error("API Error: Thêm Cổng sạc mới thất bại.", error);
      throw new Error(
        `Tạo cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  async updatePort(portId, portData) {
    try {
      const res = await fetchAuthJSON(resolveUrl(`/Ports/${portId}`), {
        method: "PUT",
        body: JSON.stringify(portData),
      });

      let updatedData = res;
      if (!res) {
        console.warn(
          `Cập nhật Cổng sạc ID ${portId} thành công (Backend trả về rỗng). Sử dụng dữ liệu đầu vào.`
        );
        updatedData = { ...portData, PortId: portId };
      }
      return normalizePort(updatedData);
    } catch (error) {
      console.error(`API Error: Sửa Cổng sạc ID ${portId} thất bại.`, error);
      throw new Error(
        `Cập nhật cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  async deletePort(portId) {
    try {
      await fetchAuthJSON(resolveUrl(`/Ports/${portId}`), { method: "DELETE" });
      return true;
    } catch (error) {
      console.error(`API Error: Xóa Cổng sạc ID ${portId} thất bại.`, error);
      throw new Error(
        `Xóa cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  // --- 4️⃣ SESSIONS ---
  async startSession(sessionData) {
    try {
      const res = await fetchAuthJSON(
        resolveUrl("/api/ChargingSessions/start"),
        {
          method: "POST",
          body: JSON.stringify(sessionData),
        }
      );
      if (!res) return { success: true, message: "Ended (204)" };
      if (typeof res === "object" && res.success === undefined) {
        return { success: true, ...res };
      }
      return res;
    } catch (error) {
      console.error("API Error: Bắt đầu phiên sạc thất bại.", error);
      throw new Error(`Bắt đầu phiên sạc thất bại: ${error.message}`);
    }
  },

  // ✅ Public API: lấy phiên theo cổng
  async getActiveSessionByPort(portId) {
    return _getActiveSessionByPort(portId);
  },

  // ✅ Public API: kết thúc phiên — chấp nhận { chargingSessionId HOẶC portId, endSoc }
  async endSession({ chargingSessionId, portId, endSoc } = {}) {
    try {
      const basePayload = {};
      if (typeof endSoc === "number") basePayload.endSoc = endSoc;

      // 1) Có sẵn sessionId -> kết thúc trực tiếp
      if (chargingSessionId) {
        const payload = { ...basePayload, chargingSessionId };
        const tryDirect = [
          { url: "/api/ChargingSessions/end", method: "POST", body: payload },
          { url: "/api/charging-sessions/end", method: "POST", body: payload },
        ];
        for (const t of tryDirect) {
          try {
            const res = await fetchAuthJSON(resolveUrl(t.url), {
              method: t.method,
              body: JSON.stringify(t.body),
            });
            return res || { success: true }; // 204
          } catch (e) {
            console.warn(
              "[stationApi] endSession by ID fail @",
              t.url,
              e?.message || e
            );
          }
        }
      }

      // 2) Không có sessionId nhưng có portId -> để BE tự resolve theo portId
      if (portId) {
        const tryByPort = [
          {
            url: "/api/ChargingSessions/end",
            method: "POST",
            body: { ...basePayload, portId },
          },
          {
            url: "/api/charging-sessions/end",
            method: "POST",
            body: { ...basePayload, portId },
          },
          {
            url: `/api/ChargingSessions/end-by-port?portId=${encodeURIComponent(
              portId
            )}`,
            method: "POST",
            body: basePayload,
          },
          {
            url: `/api/Ports/${encodeURIComponent(portId)}/end-session`,
            method: "POST",
            body: basePayload,
          },
          {
            url: `/api/ports/${encodeURIComponent(portId)}/end-session`,
            method: "POST",
            body: basePayload,
          },
        ];
        for (const t of tryByPort) {
          try {
            const res = await fetchAuthJSON(resolveUrl(t.url), {
              method: t.method,
              body: JSON.stringify(t.body),
            });
            if (res) return res; // 200
            return { success: true }; // 204
          } catch (e) {
            console.warn(
              "[stationApi] endSession by PORT fail @",
              t.url,
              e?.message || e
            );
          }
        }

        // 3) Fallback cuối: tự lấy phiên active -> lấy id -> end
        const active = await this.getActiveSessionByPort(portId);
        const sessionId = active?.chargingSessionId || active?.id || null;
        if (sessionId) {
          const payload = { ...basePayload, chargingSessionId: sessionId };
          const tryDirectAgain = [
            { url: "/api/ChargingSessions/end", method: "POST", body: payload },
            {
              url: "/api/charging-sessions/end",
              method: "POST",
              body: payload,
            },
          ];
          for (const t of tryDirectAgain) {
            try {
              const res = await fetchAuthJSON(resolveUrl(t.url), {
                method: t.method,
                body: JSON.stringify(t.body),
              });
              return res || { success: true };
            } catch (e) {
              console.warn(
                "[stationApi] endSession by resolved ID fail @",
                t.url,
                e?.message || e
              );
            }
          }
        }
      }

      return {
        success: false,
        code: "END_FAILED",
        message: "Kết thúc phiên sạc thất bại.",
      };
    } catch (error) {
      console.error("API Error: Kết thúc phiên sạc thất bại.", error);
      throw new Error(`Kết thúc phiên sạc thất bại: ${error.message}`);
    }
  },
};
