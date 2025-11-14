// src/api/stationApi.js
import { fetchAuthJSON, resolveUrl } from "../utils/api";

/* =========================
 * 1) HÀM CHUẨN HÓA DỮ LIỆU
 * ========================= */

function normalizePort(p) {
  if (!p || typeof p !== "object") {
    console.warn("normalizePort: dữ liệu không hợp lệ.");
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

function normalizeCharger(c) {
  if (!c || typeof c !== "object") {
    console.warn("normalizeCharger: dữ liệu không hợp lệ.");
    return {};
  }
  return {
    ChargerId: c.id ?? c.chargerId ?? c.ChargerId ?? "",
    Code: c.code ?? c.Code ?? "",
    Type: c.type ?? c.Type ?? "",
    PowerKw: Number(c.maxPowerKw ?? c.MaxPowerKw ?? c.PowerKw ?? c.powerKw ?? 0),
    Status: c.status ?? c.Status ?? "",
    StationId: c.stationId ?? c.StationId ?? "",
    ImageUrl: c.imageUrl ?? c.ImageUrl ?? c.imageurl ?? "",
    ports: Array.isArray(c.ports) ? c.ports.map(normalizePort) : [],
  };
}

function normalizeStation(s = {}) {
  if (!s || typeof s !== "object") {
    console.warn("normalizeStation: dữ liệu không hợp lệ.");
    return {};
  }

  const rawStatus = s.status ?? s.Status ?? "";
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

/* =========================
 * 2) HÀM PHỤ TRỢ NỘI BỘ
 * ========================= */

async function _getActiveSessionByPort(portId) {
  if (!portId) return null;
  const all = await fetchAuthJSON(resolveUrl("/ChargingSessions"), {
    method: "GET",
  }).catch((e) => {
    console.warn("[stationApi] list sessions fail:", e?.message || e);
    return [];
  });

  const list = Array.isArray(all) ? all : [];
  const active = list
    .filter(
      (s) =>
        Number(s?.portId) === Number(portId) &&
        (s?.endedAt == null || String(s?.status).toLowerCase() === "charging")
    )
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];

  return active || null;
}

async function _getConnectorTypesFromDB() {
  const candidates = [
    "/ConnectorTypes",
    "/Ports/connector-types",
    "/ports/connector-types",
    "/Ports/ConnectorTypes",
    "/ports/ConnectorTypes",
  ];
  for (const ep of candidates) {
    try {
      const res = await fetchAuthJSON(resolveUrl(ep), { method: "GET" });
      if (!res) continue;

      if (Array.isArray(res)) {
        const list = res
          .map((x) => {
            if (typeof x === "string") return x;
            if (x?.name) return String(x.name);
            if (x?.Name) return String(x.Name);
            if (x?.type) return String(x.type);
            if (x?.Type) return String(x.Type);
            return null;
          })
          .filter(Boolean);
        if (list.length) return Array.from(new Set(list));
      }

      if (res?.items && Array.isArray(res.items)) {
        const list = res.items.map(String);
        if (list.length) return Array.from(new Set(list));
      }
    } catch (e) {
      console.warn("[stationApi] connector-types fail @", ep, e?.message || e);
    }
  }
  return [];
}

/* =========================
 * 3) PUBLIC API
 * ========================= */

export const stationApi = {
  /* ---- STATIONS ---- */
  async getAllStations() {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Stations"));
      return Array.isArray(res) ? res.map(normalizeStation) : [];
    } catch (error) {
      console.error("API Error: getAllStations", error);
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
      console.error("API Error: createStation", error);
      throw new Error(`Tạo trạm thất bại: ${error.message || "Lỗi không xác định"}`);
    }
  },

  async updateStation(stationId, stationData) {
    try {
      const requestBody = JSON.stringify(stationData);
      let res = await fetchAuthJSON(resolveUrl(`/Stations/${stationId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: requestBody,
      });

      if (!res) {
        try {
          res = await fetchAuthJSON(resolveUrl(`/stations/${stationId}`), {
            method: "PUT",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: requestBody,
          });
        } catch {}
      }

      let updatedData = res;
      if (res === null || res === undefined) {
        updatedData = { ...stationData, StationId: stationId }; // 204
      }
      return normalizeStation(updatedData);
    } catch (error) {
      console.error("API Error: updateStation", error);
      throw new Error(`Cập nhật trạm thất bại: ${error.message || "Lỗi không xác định"}`);
    }
  },

  async deleteStation(stationId) {
    try {
      await fetchAuthJSON(resolveUrl(`/Stations/${stationId}`), { method: "DELETE" });
      return true;
    } catch (error) {
      console.error("API Error: deleteStation", error);
      throw new Error(`Xóa trạm thất bại: ${error.message || "Lỗi không xác định"}`);
    }
  },

  // ✅ Upload ảnh cho TRẠM (dùng khi cần gọi trực tiếp)
  async uploadStationImage(stationId, file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("id", String(stationId));
    fd.append("stationId", String(stationId));
    const res = await fetch(resolveUrl("/Stations/image/upload"), { method: "POST", body: fd });
    return res;
  },

  /* ---- CHARGERS ---- */
  async getAllChargers() {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Chargers"));
      return Array.isArray(res) ? res.map(normalizeCharger) : [];
    } catch (error) {
      console.error("API Error: getAllChargers", error);
      return [];
    }
  },

  async createCharger(chargerData) {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Chargers"), {
        method: "POST",
        body: JSON.stringify(chargerData),
      });
      return normalizeCharger(res || chargerData);
    } catch (error) {
      console.error("API Error: createCharger", error);
      throw new Error(`Tạo bộ sạc thất bại: ${error.message || "Lỗi không xác định"}`);
    }
  },

  async updateCharger(chargerId, chargerData) {
    try {
      const res = await fetchAuthJSON(resolveUrl(`/Chargers/${chargerId}`), {
        method: "PUT",
        body: JSON.stringify(chargerData),
      });
      return normalizeCharger(res || { ...chargerData, ChargerId: chargerId });
    } catch (error) {
      console.error("API Error: updateCharger", error);
      throw new Error(`Cập nhật bộ sạc thất bại: ${error.message || "Lỗi không xác định"}`);
    }
  },

  async deleteCharger(chargerId) {
    // Validate ID
    if (!chargerId || chargerId === null || chargerId === undefined) {
      throw new Error("ID bộ sạc không hợp lệ");
    }
    
    const idStr = String(chargerId).trim();
    if (!idStr || idStr === "0" || idStr === "null" || idStr === "undefined") {
      throw new Error("ID bộ sạc không hợp lệ");
    }

    try {
      // Thử endpoint chính
      await fetchAuthJSON(resolveUrl(`/Chargers/${idStr}`), { method: "DELETE" });
      return true;
    } catch (error) {
      console.error("API Error: deleteCharger", error);
      
      // Xử lý lỗi chi tiết hơn
      if (error.status === 404) {
        throw new Error(`Không tìm thấy bộ sạc với ID: ${idStr}. Có thể bộ sạc đã bị xóa hoặc không tồn tại.`);
      } else if (error.status === 403) {
        throw new Error("Bạn không có quyền xóa bộ sạc này.");
      } else if (error.status === 400) {
        throw new Error(`Yêu cầu không hợp lệ: ${error.message || "Vui lòng kiểm tra lại thông tin."}`);
      } else if (error.status >= 500) {
        throw new Error("Lỗi máy chủ. Vui lòng thử lại sau.");
      }
      
      // Parse error message từ response
      let errorMessage = "Lỗi không xác định";
      try {
        if (error.message) {
          const errorText = error.message;
          // Thử parse JSON nếu có
          if (errorText.startsWith("{") || errorText.startsWith("[")) {
            const parsed = JSON.parse(errorText);
            errorMessage = parsed.title || parsed.message || parsed.detail || errorText;
          } else {
            errorMessage = errorText;
          }
        }
      } catch (parseErr) {
        errorMessage = error.message || "Lỗi không xác định";
      }
      
      throw new Error(`Xóa bộ sạc thất bại: ${errorMessage}`);
    }
  },

  // ✅ Upload ảnh cho TRỤ
  async uploadChargerImage(chargerId, file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("id", String(chargerId));
    fd.append("chargerId", String(chargerId));
    const res = await fetch(resolveUrl("/Chargers/image/upload"), { method: "POST", body: fd });
    return res;
  },

  /* ---- PORTS ---- */
  async getAllPorts() {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Ports"));
      return Array.isArray(res) ? res.map(normalizePort) : [];
    } catch (error) {
      console.error("API Error: getAllPorts", error);
      return [];
    }
  },

  async createPort(portData) {
    try {
      const res = await fetchAuthJSON(resolveUrl("/Ports"), {
        method: "POST",
        body: JSON.stringify(portData),
      });
      return normalizePort(res || portData);
    } catch (error) {
      console.error("API Error: createPort", error);
      throw new Error(`Tạo cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`);
    }
  },

  async updatePort(portId, portData) {
    try {
      const res = await fetchAuthJSON(resolveUrl(`/Ports/${portId}`), {
        method: "PUT",
        body: JSON.stringify(portData),
      });
      return normalizePort(res || { ...portData, PortId: portId });
    } catch (error) {
      console.error("API Error: updatePort", error);
      throw new Error(`Cập nhật cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`);
    }
  },

  async deletePort(portId) {
    try {
      await fetchAuthJSON(resolveUrl(`/Ports/${portId}`), { method: "DELETE" });
      return true;
    } catch (error) {
      console.error("API Error: deletePort", error);
      throw new Error(`Xóa cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`);
    }
  },
  

  /* ---- SESSIONS ---- */
  async startSession(sessionData) {
    try {
      const res = await fetchAuthJSON(resolveUrl("/ChargingSessions/start"), {
        method: "POST",
        body: JSON.stringify(sessionData),
      });
      if (!res) return { success: true, message: "Ended (204)" };
      if (typeof res === "object" && res.success === undefined) {
        return { success: true, ...res };
      }
      return res;
    } catch (error) {
      console.error("API Error: startSession", error);
      throw new Error(`Bắt đầu phiên sạc thất bại: ${error.message}`);
    }
  },

  async getActiveSessionByPort(portId) {
    return _getActiveSessionByPort(portId);
  },

  async endSession({ chargingSessionId, portId, endSoc, idleMin } = {}) {
    let finalId = chargingSessionId;

    if (!finalId && portId) {
      const active = await _getActiveSessionByPort(portId);
      finalId = active?.chargingSessionId ?? active?.id ?? null;
    }
    if (!finalId) throw new Error("Thiếu chargingSessionId khi gọi endSession()");

    const payload = {
      chargingSessionId: finalId,
      idleMin: typeof idleMin === "number" ? idleMin : 0,
    };
    if (typeof endSoc === "number") payload.endSoc = endSoc;

    try {
      const res = await fetchAuthJSON(resolveUrl("/ChargingSessions/end"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res ?? { success: true };
    } catch (error) {
      console.error("API Error: endSession", error);
      throw new Error(`Kết thúc phiên sạc thất bại: ${error.message}`);
    }
  },

  async endSessionByPort(portId, { endSoc, idleMin } = {}) {
    const active = await _getActiveSessionByPort(portId);
    const sessionId = active?.chargingSessionId || active?.id;
    if (!sessionId) {
      return { success: false, code: "NO_ACTIVE_SESSION", message: "Cổng không có phiên đang sạc." };
    }
    return this.endSession({ chargingSessionId: sessionId, endSoc, idleMin });
  },

  /* ---- PRICING RULES ---- */
  async getConnectorTypes() {
    try {
      const ports = await this.getAllPorts();
      const types = Array.isArray(ports)
        ? Array.from(
            new Set(
              ports
                .map((p) => p?.ConnectorType ?? p?.connectorType ?? p?.Type ?? p?.type ?? null)
                .filter((x) => typeof x === "string" && x.trim())
            )
          )
        : [];
      return types;
    } catch (e) {
      console.warn("[stationApi] getConnectorTypes() from Ports failed:", e);
      return [];
    }
  },

  async getPricingRules() {
    try {
      const res = await fetchAuthJSON(resolveUrl("/PricingRule"));
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.warn("[stationApi] getPricingRules() failed:", e);
      return [];
    }
  },
};
