// src/api/stationApi.js
import { fetchAuthJSON, resolveUrl } from "../utils/api";

/* =========================
 * 1) HÀM CHUẨN HÓA DỮ LIỆU
 * ========================= */

function normalizePort(p) {
  if (!p || typeof p !== "object") {
    console.warn(
      "normalizePort: dữ liệu không hợp lệ (null/undefined/không phải object)."
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

function normalizeCharger(c) {
  if (!c || typeof c !== "object") {
    console.warn(
      "normalizeCharger: dữ liệu không hợp lệ (null/undefined/không phải object)."
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
      "normalizeStation: dữ liệu không hợp lệ (null/undefined/không phải object)."
    );
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

  const all = await fetchAuthJSON(resolveUrl("/api/ChargingSessions"), {
    method: "GET",
  }).catch((e) => {
    console.warn("[stationApi] list sessions fail:", e?.message || e);
    return [];
  });

  const list = Array.isArray(all) ? all : [];

  // Active nếu chưa có endedAt hoặc status = 'Charging'
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
    "/ConnectorTypes", // /api/ConnectorTypes (phổ biến nhất với ASP.NET)
    "/Ports/connector-types", // /api/Ports/connector-types (nếu BE có action này)
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
      throw new Error(
        `Tạo trạm thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  async updateStation(stationId, stationData) {
    try {
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
        // Fallback endpoint khác nhau theo BE
        try {
          res = await fetchAuthJSON(resolveUrl(`/stations/${stationId}`), {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: requestBody,
          });
        } catch (altErr) {
          console.warn("Fallback updateStation failed:", altErr);
        }
      }

      let updatedData = res;
      if (res === null || res === undefined) {
        // BE trả 204
        updatedData = { ...stationData, StationId: stationId };
      }
      return normalizeStation(updatedData);
    } catch (error) {
      console.error("API Error: updateStation", error);
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
      console.error("API Error: deleteStation", error);
      throw new Error(
        `Xóa trạm thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
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
      let addedData = res;
      if (!res) {
        console.warn(
          "createCharger: BE trả rỗng, dùng dữ liệu đầu vào để hiển thị."
        );
        addedData = chargerData;
      }
      return normalizeCharger(addedData);
    } catch (error) {
      console.error("API Error: createCharger", error);
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
          "updateCharger: BE trả rỗng, dùng dữ liệu đầu vào để hiển thị."
        );
        updatedData = { ...chargerData, ChargerId: chargerId };
      }
      return normalizeCharger(updatedData);
    } catch (error) {
      console.error("API Error: updateCharger", error);
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
      console.error("API Error: deleteCharger", error);
      throw new Error(
        `Xóa bộ sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
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
      let addedData = res;
      if (!res) {
        console.warn(
          "createPort: BE trả rỗng, dùng dữ liệu đầu vào để hiển thị."
        );
        addedData = portData;
      }
      return normalizePort(addedData);
    } catch (error) {
      console.error("API Error: createPort", error);
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
          "updatePort: BE trả rỗng, dùng dữ liệu đầu vào để hiển thị."
        );
        updatedData = { ...portData, PortId: portId };
      }
      return normalizePort(updatedData);
    } catch (error) {
      console.error("API Error: updatePort", error);
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
      console.error("API Error: deletePort", error);
      throw new Error(
        `Xóa cổng sạc thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  /* ---- SESSIONS ---- */
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
      console.error("API Error: startSession", error);
      throw new Error(`Bắt đầu phiên sạc thất bại: ${error.message}`);
    }
  },

  // Lấy phiên active theo cổng (public)
  async getActiveSessionByPort(portId) {
    return _getActiveSessionByPort(portId);
  },

  // Kết thúc phiên — truyền { chargingSessionId } hoặc { portId }
  async endSession({ chargingSessionId, portId, endSoc, idleMin } = {}) {
    let finalId = chargingSessionId;

    if (!finalId && portId) {
      const active = await _getActiveSessionByPort(portId);
      finalId = active?.chargingSessionId ?? active?.id ?? null;
    }

    if (!finalId) {
      throw new Error("Thiếu chargingSessionId khi gọi endSession()");
    }

    const payload = {
      chargingSessionId: finalId,
      idleMin: typeof idleMin === "number" ? idleMin : 0,
    };
    if (typeof endSoc === "number") payload.endSoc = endSoc;

    try {
      const res = await fetchAuthJSON(resolveUrl("/api/ChargingSessions/end"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res ?? { success: true }; // 204 -> OK
    } catch (error) {
      console.error("API Error: endSession", error);
      throw new Error(`Kết thúc phiên sạc thất bại: ${error.message}`);
    }
  },

  // Kết thúc theo portId (tiện cho UI dùng nhanh)
  async endSessionByPort(portId, { endSoc, idleMin } = {}) {
    const active = await _getActiveSessionByPort(portId);
    const sessionId = active?.chargingSessionId || active?.id;
    if (!sessionId) {
      return {
        success: false,
        code: "NO_ACTIVE_SESSION",
        message: "Cổng không có phiên đang sạc.",
      };
    }
    return this.endSession({ chargingSessionId: sessionId, endSoc, idleMin });
  },

  /* ---- PRICING RULES (stub) ---- */
  async getConnectorTypes() {
    try {
      // Gọi endpoint CÓ THẬT: GET /api/Ports
      const ports = await this.getAllPorts();
      const types = Array.isArray(ports)
        ? Array.from(
            new Set(
              ports
                .map(
                  (p) =>
                    p?.ConnectorType ??
                    p?.connectorType ??
                    p?.Type ??
                    p?.type ??
                    null
                )
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
      // ĐÚNG theo Swagger: GET /api/PricingRule
      const res = await fetchAuthJSON(resolveUrl("/PricingRule"));
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.warn("[stationApi] getPricingRules() failed:", e);
      return [];
    }
  },
};
