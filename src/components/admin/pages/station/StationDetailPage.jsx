import React, { useEffect, useState, useMemo } from "react";
import "../StationManagement.css";
import { message, Button } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { stationApi } from "../../../../api/stationApi";
import { userApi } from "../../../../api/userApi";

import StationList from "./StationList";
import DetailFiltersBar from "./DetailFiltersBar";

import StartSessionModal from "./modals/StartSessionModal";
import EndSessionModal from "./modals/EndSessionModal";
import AddEditStationModal from "./modals/AddEditStationModal";
import AddEditChargerModal from "./modals/AddEditChargerModal";
import AddEditPortModal from "./modals/AddEditPortModal";
import DeleteConfirmModal from "./modals/DeleteConfirmModal";
import EndSessionSummaryModal from "./modals/EndSessionSummaryModal";

// (tùy bạn còn dùng không)
const customerApi = {
  getById: async (id) => {
    if (id && Number(id) > 0 && Number(id) !== 999) {
      return { FullName: `User ${id} (Đã xác minh)` };
    }
    return null;
  },
  getUserById: async (id) => customerApi.getById(id),
};

export default function StationDetailPage() {
  const { stationId } = useParams();
  const navigate = useNavigate();

  const [activeModal, setActiveModal] = useState(null);

  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==== Bộ lọc CHI TIẾT (Trụ/Cổng) ====
  const [chargerStatus, setChargerStatus] = useState("All"); // Online | Offline | Maintenance | All
  const [portStatus, setPortStatus] = useState("All"); // available | occupied | reserved | disabled | All
  const [connector, setConnector] = useState("All"); // lấy từ API trong DetailFiltersBar
  const [powerMin, setPowerMin] = useState("");
  const [powerMax, setPowerMax] = useState("");
  const [searchCode, setSearchCode] = useState(""); // filter code trụ/cổng

  // ==== State tạo/sửa ====
  const newStationInitialState = {
    StationName: "",
    Address: "",
    City: "",
    Latitude: "",
    Longitude: "",
    Status: "Open",
    ImageUrl: "",
  };
  const [newStation, setNewStation] = useState(newStationInitialState); // hiện chưa dùng tạo ở trang detail
  const [editingStation, setEditingStation] = useState({});

  const newChargerInitialState = {
    Code: "",
    Type: "DC",
    PowerKw: "",
    Status: "Online",
    ImageUrl: "",
    InstalledAt: "",
  };
  const [newChargerData, setNewChargerData] = useState(newChargerInitialState);
  const [editingCharger, setEditingCharger] = useState({});

  const newPortInitialState = {
    ConnectorType: "",
    MaxPowerKw: "",
    Code: "",
    Status: "Available",
  };
  const [newPortData, setNewPortData] = useState(newPortInitialState);
  const [editingPort, setEditingPort] = useState({});

  // ==== Context id ====
  const [currentStationId, setCurrentStationId] = useState(null);
  const [currentChargerId, setCurrentChargerId] = useState(null);
  const [currentPortId, setCurrentPortId] = useState(null);

  // ==== Delete target ====
  const [targetId, setTargetId] = useState(null);
  const [targetType, setTargetType] = useState(null);

  // ==== Session ====
  const [isEnding, setIsEnding] = useState(false);
  const [startSessionData, setStartSessionData] = useState({
    userId: "",
    vehicleInput: "",
  });
  const [foundUserName, setFoundUserName] = useState(null);
  const [endSessionData, setEndSessionData] = useState(null);
  const [endSoc, setEndSoc] = useState("");
  const [activeSessionsByPort, setActiveSessionsByPort] = useState({});
  const [isManualEndRequired, setIsManualEndRequired] = useState(false);
  const [manualEndSessionId, setManualEndSessionId] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  // ====== LOAD chi tiết trạm ======
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [stationsRaw, chargersRaw, portsRaw] = await Promise.all([
          stationApi.getAllStations(),
          stationApi.getAllChargers(),
          stationApi.getAllPorts(),
        ]);

        const s = (stationsRaw || []).find(
          (x) => String(x.stationId ?? x.StationId) === String(stationId)
        );
        if (!s) {
          setStation(null);
          return;
        }

        const sId = s.stationId ?? s.StationId;
        const stationChargers = (chargersRaw || [])
          .filter((c) => (c.stationId ?? c.StationId) === sId)
          .map((c) => {
            const chargerId = c.chargerId ?? c.ChargerId;
            const chargerPorts = (portsRaw || []).filter(
              (p) => (p.chargerId ?? p.ChargerId) === chargerId
            );
            return {
              ChargerId: chargerId,
              StationId: sId,
              Code: c.code ?? c.Code,
              Type: c.type ?? c.Type,
              PowerKw: c.powerKw ?? c.PowerKw,
              InstalledAt: c.installedAt ?? c.InstalledAt,
              ImageUrl: c.imageUrl ?? c.ImageUrl,
              Status: c.status ?? c.Status,
              ports: (chargerPorts || []).map((p) => ({
                PortId: p.portId ?? p.PortId,
                ChargerId: chargerId,
                ConnectorType: p.connectorType ?? p.ConnectorType,
                MaxPowerKw: p.maxPowerKw ?? p.MaxPowerKw,
                Code: p.code ?? p.Code,
                Status: p.status ?? p.Status,
                ImageUrl: p.imageUrl ?? p.ImageUrl,
              })),
            };
          });

        setStation({
          StationId: sId,
          StationName: s.stationName ?? s.StationName ?? "Tên không xác định",
          Address: s.address ?? s.Address,
          City: s.city ?? s.City,
          Latitude: s.latitude ?? s.Latitude,
          Longitude: s.longitude ?? s.Longitude,
          Status: s.status ?? s.Status ?? "Closed",
          ImageUrl: s.imageUrl ?? s.ImageUrl,
          chargers: stationChargers,
        });
      } catch (e) {
        console.error("❌ Lỗi tải chi tiết trạm:", e);
        message.error("Không tải được chi tiết trạm");
      } finally {
        setLoading(false);
      }
    })();
  }, [stationId]);

  const closeModal = () => {
    setActiveModal(null);
    setStartSessionData({ userId: "", vehicleInput: "" });
    setFoundUserName(null);
    setEndSessionData(null);
    setEndSoc("");
  };

  // ====== BỘ LỌC ÁP DỤNG CHO DỮ LIỆU HIỂN THỊ ======
  const filteredStation = useMemo(() => {
    if (!station) return null;
    const codeQ = searchCode.trim().toLowerCase();

    const filterPort = (p) => {
      const s = String(p.Status || "").toLowerCase();
      const stOk =
        portStatus === "All" ? true : s.includes(portStatus.toLowerCase());
      const connOk =
        connector === "All" ? true : (p.ConnectorType || "") === connector;
      const pow = Number(p.MaxPowerKw || 0);
      const powOk =
        (powerMin === "" || pow >= Number(powerMin)) &&
        (powerMax === "" || pow <= Number(powerMax));
      const codeOk =
        codeQ === "" ? true : (p.Code || "").toLowerCase().includes(codeQ);
      return stOk && connOk && powOk && codeOk;
    };

    const filterCharger = (c) => {
      const s = String(c.Status || "");
      const chOk = chargerStatus === "All" ? true : s === chargerStatus;
      const codeOk =
        codeQ === "" ? true : (c.Code || "").toLowerCase().includes(codeQ);

      const ports = (c.ports || []).filter(filterPort);
      return chOk && codeOk ? { ...c, ports } : null;
    };

    const chargers = (station.chargers || [])
      .map(filterCharger)
      .filter(Boolean);

    return { ...station, chargers };
  }, [
    station,
    chargerStatus,
    portStatus,
    connector,
    powerMin,
    powerMax,
    searchCode,
  ]);

  // ====== helpers chung ======
  const handleInputChange = (e, state, setState) => {
    const { name, value } = e.target;
    setState({ ...state, [name]: value });
  };
  const handleNewStationInputChange = (e) =>
    handleInputChange(e, newStation, setNewStation);
  const handleEditStationInputChange = (e) =>
    handleInputChange(e, editingStation, setEditingStation);
  const handleNewChargerInputChange = (e) =>
    handleInputChange(e, newChargerData, setNewChargerData);
  const handleEditChargerInputChange = (e) =>
    handleInputChange(e, editingCharger, setEditingCharger);
  const handleNewPortInputChange = (e) =>
    handleInputChange(e, newPortData, setNewPortData);
  const handleEditPortInputChange = (e) =>
    handleInputChange(e, editingPort, setEditingPort);

  // user lookup
  const pickUserName = (res) => {
    return (
      res?.customers?.[0]?.fullName ||
      res?.data?.customers?.[0]?.fullName ||
      res?.fullName ||
      res?.data?.fullName ||
      res?.username ||
      res?.userName ||
      null
    );
  };

  const handleUserIdChange = async (value) => {
    if (!value) {
      setUserInfo(null);
      setFoundUserName(null);
      return;
    }
    try {
      const res = await userApi.getUserById(value);
      const displayName = pickUserName(res);

      if (displayName) {
        setUserInfo(res);
        setFoundUserName(displayName);
        message.success(`Tìm thấy user: ${displayName}`);
      } else {
        setUserInfo(null);
        setFoundUserName(null);
        message.warning("Không tìm thấy người dùng này");
      }
    } catch (error) {
      setUserInfo(null);
      setFoundUserName(null);
      console.error("❌ Lỗi khi tìm user:", error);
      message.error("Không thể tìm người dùng, kiểm tra lại ID");
    }
  };

  // ====== LƯU SỬA TRẠM (payload camelCase đúng BE) ======
  const handleSaveEditStation = async () => {
    try {
      const sid = editingStation?.StationId ?? editingStation?.stationId;
      if (!sid) {
        message.error("Lỗi: Không tìm thấy ID trạm");
        return;
      }

      const payload = {
        stationName: (editingStation?.StationName || "").trim(),
        address: (editingStation?.Address || "").trim(),
        city: (editingStation?.City || "").trim(),
        latitude: Number(editingStation?.Latitude) || 0,
        longitude: Number(editingStation?.Longitude) || 0,
        status: editingStation?.Status || "Closed",
        imageUrl: (editingStation?.ImageUrl || "").trim(),
      };

      if (!payload.stationName) {
        message.error("Lỗi: Tên trạm không được để trống");
        return;
      }
      if (!payload.address) {
        message.error("Lỗi: Địa chỉ không được để trống");
        return;
      }

      const updated = await stationApi.updateStation(sid, payload);

      setStation((prev) => ({
        ...(prev || {}),
        ...(updated || {
          StationId: sid,
          StationName: payload.stationName,
          Address: payload.address,
          City: payload.city,
          Latitude: payload.latitude,
          Longitude: payload.longitude,
          Status: payload.status,
          ImageUrl: payload.imageUrl,
        }),
        chargers: prev?.chargers || [],
      }));

      message.success("Cập nhật trạm thành công!");
      setActiveModal(null);
    } catch (err) {
      console.error("❌ Lỗi cập nhật trạm:", err);
      message.error(
        "Cập nhật trạm thất bại: " + (err?.message || "Không xác định")
      );
    }
  };

  // ====== XÓA TRẠM / TRỤ / CỔNG ======
  const handleDeleteConfirm = async () => {
    if (!targetId || !targetType) {
      message.error("Không xác định được đối tượng cần xóa.");
      return;
    }

    // Validate ID
    const idStr = String(targetId).trim();
    if (!idStr || idStr === "0" || idStr === "null" || idStr === "undefined") {
      message.error("ID không hợp lệ. Vui lòng thử lại.");
      setActiveModal(null);
      return;
    }

    try {
      let res;
      if (targetType === "station") {
        res = await stationApi.deleteStation(targetId);
        message.success("Đã xóa trạm thành công!");
        navigate("/admin/stations");
      } else if (targetType === "charger") {
        console.log("🔄 Đang xóa bộ sạc với ID:", targetId);
        res = await stationApi.deleteCharger(targetId);
        setStation((prev) => ({
          ...prev,
          chargers: (prev?.chargers || []).filter(
            (c) => String(c.ChargerId) !== String(targetId)
          ),
        }));
        message.success("Đã xóa trụ sạc thành công!");
      } else if (targetType === "port") {
        res = await stationApi.deletePort(targetId);
        setStation((prev) => ({
          ...prev,
          chargers: (prev?.chargers || []).map((c) => ({
            ...c,
            ports: (c.ports || []).filter(
              (p) => String(p.PortId) !== String(targetId)
            ),
          })),
        }));
        message.success("Đã xóa cổng sạc thành công!");
      } else {
        message.error("Loại đối tượng không hợp lệ.");
        return;
      }

      console.log("✅ Delete result:", res);
    } catch (err) {
      console.error("❌ Lỗi xóa:", err);
      
      // Hiển thị thông báo lỗi chi tiết hơn
      const errorMsg = err?.message || "Không xác định";
      
      // Nếu lỗi đã có thông báo rõ ràng từ API, dùng trực tiếp
      if (errorMsg.includes("Không tìm thấy") || 
          errorMsg.includes("không tồn tại") ||
          errorMsg.includes("404")) {
        message.error(errorMsg);
      } else {
        // Parse error message nếu là JSON string
        let displayMsg = errorMsg;
        try {
          if (errorMsg.startsWith("{") || errorMsg.startsWith("[")) {
            const parsed = JSON.parse(errorMsg);
            displayMsg = parsed.title || parsed.message || parsed.detail || errorMsg;
          }
        } catch (parseErr) {
          // Giữ nguyên errorMsg nếu không parse được
        }
        
        message.error(`Xóa thất bại: ${displayMsg}`);
      }
    } finally {
      setActiveModal(null);
    }
  };

  // ====== TẠO TRỤ (CHARGER) ======
  const handleCreateCharger = async () => {
    try {
      const stId = station?.StationId;
      if (!stId) return message.error("Chưa có StationId hợp lệ.");

      const payload = {
        StationId: stId,
        Code: (newChargerData?.Code || "").trim(),
        Type: newChargerData?.Type || "DC",
        PowerKw: Number(newChargerData?.PowerKw) || 0,
        Status: newChargerData?.Status || "Online",
        ImageUrl: newChargerData?.ImageUrl || "",
        InstalledAt: newChargerData?.InstalledAt || null,
      };
      if (!payload.Code) return message.error("Vui lòng nhập mã trụ (Code).");

      const added = await stationApi.createCharger(payload);

      setStation((prev) => ({
        ...prev,
        chargers: [...(prev?.chargers || []), added || payload],
      }));
      message.success("Thêm bộ sạc thành công!");
      setActiveModal(null);
    } catch (err) {
      console.error("❌ Lỗi thêm bộ sạc:", err);
      message.error(
        "Không thể thêm bộ sạc: " + (err?.message || "Không xác định")
      );
    }
  };

  // ====== LƯU SỬA TRỤ (CHARGER) ======
  const handleSaveEditCharger = async () => {
    try {
      const chargerId =
        editingCharger?.ChargerId ??
        editingCharger?.chargerId ??
        editingCharger?.id;

      if (!chargerId) return message.error("Không tìm thấy ID trụ.");

      const updated = await stationApi.updateCharger(chargerId, editingCharger);

      setStation((prev) => ({
        ...prev,
        chargers: (prev?.chargers || []).map((c) =>
          (c.ChargerId ?? c.chargerId) === chargerId
            ? updated || editingCharger
            : c
        ),
      }));
      message.success("Cập nhật bộ sạc thành công!");
      setActiveModal(null);
    } catch (err) {
      console.error("❌ Lỗi cập nhật bộ sạc:", err);
      message.error(
        "Không thể cập nhật bộ sạc: " + (err?.message || "Không xác định")
      );
    }
  };

  // ====== TẠO CỔNG (PORT) ======
  const handleCreatePort = async () => {
    try {
      const chId = currentChargerId;
      if (!chId) return message.error("Chưa chọn trụ sạc hợp lệ.");

      const payload = {
        ...newPortData,
        chargerId: chId, // BE nhận 'chargerId'
      };
      if (!payload.Code) return message.error("Vui lòng nhập mã cổng (Code).");

      const added = await stationApi.createPort(payload);

      setStation((prev) => ({
        ...prev,
        chargers: (prev?.chargers || []).map((c) =>
          c.ChargerId === chId
            ? { ...c, ports: [...(c.ports || []), added || payload] }
            : c
        ),
      }));
      message.success("Thêm cổng sạc thành công!");
      setActiveModal(null);
    } catch (err) {
      console.error("❌ Lỗi thêm cổng sạc:", err);
      message.error(
        "Không thể thêm cổng sạc: " + (err?.message || "Không xác định")
      );
    }
  };

  // ====== LƯU SỬA CỔNG (PORT) ======
  const handleSaveEditPort = async () => {
    try {
      const portId = editingPort?.PortId ?? editingPort?.portId;
      const chId = editingPort?.ChargerId ?? editingPort?.chargerId;
      if (!portId || !chId) return message.error("Thiếu PortId/ChargerId.");

      const updated = await stationApi.updatePort(portId, editingPort);

      setStation((prev) => ({
        ...prev,
        chargers: (prev?.chargers || []).map((c) =>
          (c.ChargerId ?? c.chargerId) === chId
            ? {
                ...c,
                ports: (c.ports || []).map((p) =>
                  (p.PortId ?? p.portId) === portId ? updated || editingPort : p
                ),
              }
            : c
        ),
      }));
      message.success("Cập nhật cổng thành công!");
      setActiveModal(null);
    } catch (err) {
      console.error("❌ Lỗi cập nhật cổng:", err);
      message.error(
        "Không thể cập nhật cổng: " + (err?.message || "Không xác định")
      );
    }
  };

  // ====== open modals ======
  const openEditStationModal = (stId) => {
    if (station && station.StationId === stId) {
      setEditingStation(station);
      setActiveModal("editStation");
    }
  };
  const openAddChargerModal = (stId) => {
    setCurrentStationId(stId);
    setNewChargerData(newChargerInitialState);
    setActiveModal("addCharger");
  };
  const openEditChargerModal = (stId, chargerId) => {
    const charger = station?.chargers.find(
      (c) => Number(c.ChargerId) === Number(chargerId)
    );
    if (charger) {
      setEditingCharger({ ...charger, StationId: stId });
      setActiveModal("editCharger");
    }
  };
  const openAddPortModal = (stId, chargerId) => {
    setCurrentStationId(stId);
    setCurrentChargerId(chargerId);
    setNewPortData(newPortInitialState);
    setActiveModal("addPort");
  };
  const openEditPortModal = (portId) => {
    let portToEdit = null;
    let stId, chId;
    station?.chargers.forEach((charger) => {
      const foundPort = charger.ports.find(
        (p) => String(p.PortId) === String(portId)
      );
      if (foundPort) {
        portToEdit = foundPort;
        stId = station.StationId;
        chId = charger.ChargerId;
      }
    });
    if (portToEdit) {
      setEditingPort({ ...portToEdit, StationId: stId, ChargerId: chId });
      setActiveModal("editPort");
    }
  };
  const openDeleteModal = (id, type) => {
    setTargetId(id);
    setTargetType(type);
    setActiveModal("deleteConfirm");
  };

  // ====== Start/End ======
  const openStartSessionModal = (portId, stId, chId) => {
    setCurrentPortId(portId);
    setCurrentStationId(stId);
    setCurrentChargerId(chId);
    setStartSessionData({ userId: "", vehicleInput: "" });
    setFoundUserName(null);
    setActiveModal("startSession");
  };

  const openEndSessionModal = async (portId, stId, chId) => {
    setEndSoc("");

    const charger = station?.chargers.find((c) => c.ChargerId === chId);
    const port = charger?.ports.find((p) => p.PortId === portId);

    // Lấy phiên theo cổng
    let active = null;
    try {
      active = await stationApi.getActiveSessionByPort(portId);
    } catch (e) {
      console.warn("[UI] getActiveSessionByPort lỗi:", e?.message);
    }

    const sd = port?.sessionData ?? activeSessionsByPort?.[portId] ?? null;
    setIsManualEndRequired(!sd);
    setManualEndSessionId("");

    const now = new Date();
    const startISO = active?.startedAt || sd?.startTime || null;

    let durationHours = 0;
    if (startISO) {
      const start = new Date(startISO);
      durationHours = Math.max(0, (now - start) / (1000 * 60 * 60));
    }

    const energyKwh = Number(
      (Number(port?.MaxPowerKw || 0) * durationHours * 0.95).toFixed(3)
    );
    const costVND = energyKwh * 3500 || 0;

    const session = {
      sessionId:
        active?.chargingSessionId || active?.id || sd?.sessionId || null,
      userId: active?.user?.id ?? sd?.userId ?? null,
      userName: active?.user?.name ?? sd?.userName ?? "",
      vehicleId: active?.vehicle?.id ?? sd?.vehicleId ?? null,
      vehicleName: sd?.vehicleName ?? null,
      plate: sd?.plate ?? null,

      startTime: startISO,
      endTime: `${now.toLocaleTimeString("vi-VN")} ${now.toLocaleDateString(
        "vi-VN"
      )}`,
      duration: durationHours.toFixed(2),

      energy: energyKwh.toFixed(3),
      currentSubtotal: 0,
      currentTax: 0,
      cost: costVND,
      endSoc: null,
    };

    setEndSessionData(session);
    setCurrentPortId(portId);
    setCurrentStationId(stId);
    setCurrentChargerId(chId);
    setActiveModal("endSession");
  };

  const handleConfirmStartSession = async () => {
    const customerId = Number(startSessionData.userId) || 0;
    const vehicleId = Number(startSessionData.vehicleInput) || 0;
    const portId = Number(currentPortId) || 0;

    if (!foundUserName) {
      message.warning(
        "Vui lòng nhập và xác thực ID Người dùng trước khi bắt đầu."
      );
      return;
    }

    const payload = { customerId, vehicleId, bookingId: null, portId };
    try {
      let vehicleName = null;
      let vehiclePlate = null;
      const res = await stationApi.startSession(payload);

      const chargingSessionId =
        res?.chargingSessionId ??
        res?.sessionId ??
        res?.data?.chargingSessionId ??
        res?.data?.sessionId;

      if (!chargingSessionId || chargingSessionId <= 0) {
        message.error("Lỗi: Không nhận được ID phiên sạc từ máy chủ.");
        return;
      }

      message.success("✅ Bắt đầu phiên sạc từ xa thành công!");

      const sessionData = {
        sessionId: chargingSessionId,
        startTime: new Date().toISOString(),
        userId: customerId,
        userName: foundUserName,
        vehicleId,
        vehicleName,
        plate: vehiclePlate,
      };

      setActiveSessionsByPort((prev) => ({
        ...prev,
        [portId]: sessionData,
      }));

      setStation((prev) => ({
        ...prev,
        chargers: prev.chargers.map((ch) =>
          ch.ChargerId === currentChargerId
            ? {
                ...ch,
                ports: ch.ports.map((p) =>
                  p.PortId === currentPortId
                    ? { ...p, Status: "Busy", sessionData }
                    : p
                ),
              }
            : ch
        ),
      }));

      setActiveModal(null);
    } catch (error) {
      console.error("❌ [START] Lỗi khi bắt đầu phiên sạc:", error);
      const errorMessage =
        error?.message || "Lỗi không xác định khi bắt đầu phiên sạc.";
      message.error(`Lỗi: ${errorMessage}`);
    }
  };

  const handleConfirmEndSession = async () => {
    if (!currentPortId) return;

    try {
      setIsEnding(true);

      let res;
      if (isManualEndRequired) {
        const idNum = Number(manualEndSessionId);
        if (!idNum || idNum <= 0 || Number.isNaN(idNum)) {
          message.warning("Vui lòng nhập chargingSessionId hợp lệ (số dương).");
          setIsEnding(false);
          return;
        }
        res = await stationApi.endSession({ chargingSessionId: idNum });
      } else {
        const sessionId = endSessionData?.sessionId;
        if (sessionId && sessionId > 0) {
          res = await stationApi.endSession({ chargingSessionId: sessionId });
        } else {
          res = await stationApi.endSessionByPort(currentPortId, {});
          if (res?.success === false) {
            throw new Error(
              res?.message || "Không thể kết thúc phiên theo cổng."
            );
          }
        }
      }
      if (res?.success === false && res?.code === "SESSION_NOT_FOUND") {
        message.error(
          res.message || "Không tìm thấy phiên sạc đang chạy cho cổng này."
        );
        setIsEnding(false);
        return;
      }
      if (res?.success === false) {
        message.error(res.message || "Kết thúc phiên sạc thất bại.");
        setIsEnding(false);
        return;
      }

      const d = res?.data?.data ?? res?.data ?? res ?? {};
      const finalSummaryData = {
        sessionId: d.chargingSessionId ?? endSessionData?.sessionId ?? null,
        userId: endSessionData?.userId ?? null,
        userName: endSessionData?.userName ?? "",
        vehicleName: endSessionData?.vehicleName ?? null,
        plate: endSessionData?.plate ?? null,
        startedAt: endSessionData?.startTime ?? d.startedAt ?? null,
        endedAt: d.endedAt ?? new Date().toISOString(),
        energyKwh: d.energyKwh ?? 0,
        subtotal: d.subtotal ?? 0,
        tax: d.tax ?? 0,
        total: d.total ?? 0,
        endSoc: d.endSoc ?? (endSoc !== "" ? Number(endSoc) : null),
      };

      message.success(res?.message || "Kết thúc phiên sạc thành công!");
      setEndSessionData(finalSummaryData);
      setActiveModal("endSessionSummary");
      setEndSoc("");

      setActiveSessionsByPort((prev) => {
        const cp = { ...prev };
        delete cp[currentPortId];
        return cp;
      });
      setStation((prev) => ({
        ...prev,
        chargers: prev.chargers.map((charger) => ({
          ...charger,
          ports: charger.ports.map((port) =>
            port.PortId === currentPortId
              ? { ...port, Status: "Available", sessionData: null }
              : port
          ),
        })),
      }));
    } catch (error) {
      console.error("❌ [END] Lỗi khi kết thúc phiên sạc:", error);
      message.error(`Lỗi khi kết thúc phiên sạc: ${error.message}`);
    } finally {
      setIsEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="station-page">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 className="admin-title">Chi tiết trạm</h2>
          <Button onClick={() => navigate("/admin/stations")}>
            ← Quay lại
          </Button>
        </div>
        Đang tải…
      </div>
    );
  }

  if (!station) {
    return (
      <div className="station-page">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 className="admin-title">Chi tiết trạm</h2>
          <Button onClick={() => navigate("/admin/stations")}>
            ← Quay lại
          </Button>
        </div>
        <p>Không tìm thấy trạm.</p>
      </div>
    );
  }

  return (
    <div className="station-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className="admin-title">Chi tiết trạm</h2>
        <Button onClick={() => navigate("/admin/stations")}>← Quay lại</Button>
      </div>

      {/* ✅ BỘ LỌC DÀNH CHO TRỤ/CỔNG (connector lấy từ API bên trong component) */}
      <DetailFiltersBar
        chargerStatus={chargerStatus}
        setChargerStatus={setChargerStatus}
        portStatus={portStatus}
        setPortStatus={setPortStatus}
        connector={connector}
        setConnector={setConnector}
        powerMin={powerMin}
        setPowerMin={setPowerMin}
        powerMax={powerMax}
        setPowerMax={setPowerMax}
        searchCode={searchCode}
        setSearchCode={setSearchCode}
      />

      <div className="station-list">
        <StationList
          stations={filteredStation ? [filteredStation] : []}
          onEditStation={openEditStationModal}
          onDeleteStation={(id) => openDeleteModal(id, "station")}
          onEditCharger={openEditChargerModal}
          onDeleteCharger={(id, t) => openDeleteModal(id, t || "charger")}
          onDeletePort={(id, t) => openDeleteModal(id, t || "port")}
          onAddCharger={openAddChargerModal}
          onAddPort={openAddPortModal}
          onEditPort={openEditPortModal}
          onStart={openStartSessionModal}
          onEnd={openEndSessionModal}
        />
      </div>

      {/* ===== Modals ===== */}
      <StartSessionModal
        open={activeModal === "startSession"}
        onClose={closeModal}
        startSessionData={startSessionData}
        setStartSessionData={setStartSessionData}
        foundUserName={foundUserName}
        handleUserIdChange={handleUserIdChange}
        onConfirm={handleConfirmStartSession}
      />
      <EndSessionModal
        open={activeModal === "endSession"}
        onClose={closeModal}
        endSessionData={endSessionData}
        isEnding={isEnding}
        onConfirm={handleConfirmEndSession}
        isManualEndRequired={isManualEndRequired}
        manualEndSessionId={manualEndSessionId}
        setManualEndSessionId={setManualEndSessionId}
        ids={{
          stationId: currentStationId,
          chargerId: currentChargerId,
          portId: currentPortId,
        }}
      />
      <AddEditStationModal
        open={activeModal === "editStation"}
        onClose={closeModal}
        isEdit={true}
        data={editingStation}
        onChange={handleEditStationInputChange}
        onSubmit={handleSaveEditStation}
      />
      <AddEditChargerModal
        open={activeModal === "addCharger"}
        onClose={closeModal}
        isEdit={false}
        data={newChargerData}
        onChange={handleNewChargerInputChange}
        onSubmit={handleCreateCharger}
        currentStationId={station?.StationId}
      />
      <AddEditChargerModal
        open={activeModal === "editCharger"}
        onClose={closeModal}
        isEdit={true}
        data={editingCharger}
        onChange={handleEditChargerInputChange}
        onSubmit={handleSaveEditCharger}
        currentStationId={editingCharger?.StationId}
      />
      <AddEditPortModal
        open={activeModal === "addPort"}
        onClose={closeModal}
        isEdit={false}
        data={newPortData}
        onChange={handleNewPortInputChange}
        onSubmit={handleCreatePort}
        ids={{ stationId: station?.StationId, chargerId: currentChargerId }}
      />
      <AddEditPortModal
        open={activeModal === "editPort"}
        onClose={closeModal}
        isEdit={true}
        data={editingPort}
        onChange={handleEditPortInputChange}
        onSubmit={handleSaveEditPort}
        ids={{
          stationId: editingPort?.StationId,
          chargerId: editingPort?.ChargerId,
        }}
      />
      <DeleteConfirmModal
        open={activeModal === "deleteConfirm"}
        onClose={closeModal}
        targetId={targetId}
        targetType={targetType}
        onConfirm={handleDeleteConfirm}
      />
      <EndSessionSummaryModal
        open={activeModal === "endSessionSummary"}
        onClose={closeModal}
        endSessionData={endSessionData}
      />
    </div>
  );
}
