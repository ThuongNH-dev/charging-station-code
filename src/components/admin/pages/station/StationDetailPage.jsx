import React, { useEffect, useState } from "react";
import "../StationManagement.css";
import { message, Button } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { stationApi } from "../../../../api/stationApi";
import { userApi } from "../../../../api/userApi";

import FiltersBar from "./FiltersBar";
import StationList from "./StationList";

import StartSessionModal from "./modals/StartSessionModal";
import EndSessionModal from "./modals/EndSessionModal";
import AddEditStationModal from "./modals/AddEditStationModal";
import AddEditChargerModal from "./modals/AddEditChargerModal";
import AddEditPortModal from "./modals/AddEditPortModal";
import DeleteConfirmModal from "./modals/DeleteConfirmModal";
import EndSessionSummaryModal from "./modals/EndSessionSummaryModal";

import { isPortBusy } from "../../../../utils/stationUtils";

// === Stub customerApi (giống bản bạn dùng) ===
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

  const [activeModal, setActiveModal] = useState(null); // dữ liệu 1 trạm

  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true); // filter (nội bộ trang chi tiết vẫn cho lọc theo tên cục bộ nếu muốn)

  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState(""); // buffer tạo/sửa

  const newStationInitialState = {
    StationName: "",
    Address: "",
    City: "",
    Latitude: "",
    Longitude: "",
    Status: "Open",
  };
  const [newStation, setNewStation] = useState(newStationInitialState);
  const [editingStation, setEditingStation] = useState({});

  const newChargerInitialState = {
    Code: "",
    Type: "DC",
    PowerKw: "",
    Status: "Online",
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
  const [editingPort, setEditingPort] = useState({}); // context id

  const [currentStationId, setCurrentStationId] = useState(null);
  const [currentChargerId, setCurrentChargerId] = useState(null);
  const [currentPortId, setCurrentPortId] = useState(null); // delete target

  const [targetId, setTargetId] = useState(null);
  const [targetType, setTargetType] = useState(null); // session

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
  const [userInfo, setUserInfo] = useState(null); // Load 1 trạm theo id

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); // NOTE: Việc load tất cả station/charger/port rồi filter ở frontend là KHÔNG HIỆU QUẢ. // Nếu có thể, nên gọi API: stationApi.getStationDetail(stationId)
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

  const filtered = station
    ? [
        {
          ...station, // (nếu muốn cho phép search theo tên trạm ngay trong chi tiết)
          hidden:
            (statusFilter !== "All" &&
              (station.Status === "Open" ? "Open" : "Closed") !==
                statusFilter) ||
            !(station.StationName || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase()),
        },
      ].filter((x) => !x.hidden)
    : []; // handlers chung

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
    handleInputChange(e, editingPort, setEditingPort); // user lookup // Helper lấy tên user từ mọi kiểu payload phổ biến

  const pickUserName = (res) => {
    return (
      res?.customers?.[0]?.fullName || // tên trong danh sách khách hàng (chuẩn)
      res?.data?.customers?.[0]?.fullName || // nếu trả về trong res.data
      res?.fullName || // fallback cấp 1
      res?.data?.fullName || // fallback cấp 2
      res?.username || // username (nếu không có fullName)
      res?.userName || // một số API viết hoa N
      null // không fallback "User ${id}" nữa
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
        setFoundUserName(null); // đừng đặt chuỗi; để nút Bắt đầu bị disable đúng
        message.warning("Không tìm thấy người dùng này");
      }
    } catch (error) {
      setUserInfo(null);
      setFoundUserName(null);
      console.error("❌ Lỗi khi tìm user:", error);
      message.error("Không thể tìm người dùng, kiểm tra lại ID");
    }
  }; // open modals

  const openAddStationModal = () => {
    setNewStation(newStationInitialState);
    setActiveModal("addStation");
  };
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
  }; // start/end

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

    // Lấy phiên theo cổng (không phân biệt ai bắt đầu)
    let active = null;
    try {
      active = await stationApi.getActiveSessionByPort(portId);
    } catch (e) {
      console.warn("[UI] getActiveSessionByPort lỗi:", e?.message);
    }

    // Ưu tiên dữ liệu từ BE; fallback sang sessionData ở state (nếu có)
    const sd = port?.sessionData ?? activeSessionsByPort?.[portId] ?? null;
    // 👉 Nếu không có sessionData do admin tạo trong UI, bắt buộc admin nhập ID khi dừng
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
      currentSubtotal: 0, // tạm tính
      currentTax: 0, // tạm tính
      cost: costVND,
      endSoc: null,
    };

    setEndSessionData(session);
    setCurrentPortId(portId);
    setCurrentStationId(stId);
    setCurrentChargerId(chId);
    setActiveModal("endSession"); // <-- LUÔN mở modal #2
  };

  const handleAddStation = async () => {
    try {
      const data = {
        StationName: newStation.StationName?.trim() || "",
        Address: newStation.Address?.trim() || "",
        City: newStation.City?.trim() || "",
        Latitude: Number(newStation.Latitude) || 0,
        Longitude: Number(newStation.Longitude) || 0,
        Status: newStation.Status || "Offline",
      };
      if (!data.StationName || !data.Address) {
        message.error("Vui lòng điền đầy đủ Tên trạm và Địa chỉ!");
        return;
      }
      const added = await stationApi.createStation(data);
      setActiveModal(null);
      setStation(added);
    } catch (err) {
      console.error("❌ Lỗi thêm trạm:", err);
      message.error("Không thể thêm trạm mới: " + err.message);
    }
  };

  const handleSaveEditStation = async () => {
    try {
      const updateData = {
        StationId: editingStation.StationId,
        StationName: editingStation.StationName,
        Address: editingStation.Address,
        City: editingStation.City,
        Latitude: Number(editingStation.Latitude) || 0,
        Longitude: Number(editingStation.Longitude) || 0,
        Status: editingStation.Status,
        ImageUrl: editingStation.ImageUrl || "",
      };
      if (!updateData.StationId)
        return message.error("Lỗi: Không tìm thấy ID trạm");
      if (!updateData.StationName?.trim())
        return message.error("Lỗi: Tên trạm không được để trống");
      if (!updateData.Address?.trim())
        return message.error("Lỗi: Địa chỉ không được để trống");
      if (!updateData.Status)
        return message.error("Lỗi: Trạng thái không được để trống");

      const updated = await stationApi.updateStation(
        editingStation.StationId,
        updateData
      );
      setActiveModal(null);
      setStation(updated);
      message.success("Cập nhật trạm thành công!");
    } catch (err) {
      console.error("❌ Lỗi cập nhật trạm:", err);
      message.error("Cập nhật trạm thất bại: " + err.message);
    }
  }; // helpers update nested

  const replaceChargerOnStation = (s, chargerId, updatedCharger) => ({
    ...s,
    chargers: s.chargers.map((c) =>
      c.ChargerId === chargerId ? updatedCharger : c
    ),
  }); // charger

  const handleCreateCharger = async () => {
    try {
      const stId = station?.StationId;
      if (!stId) throw new Error("Chưa chọn trạm hợp lệ.");

      const dataToSend = { ...newChargerData, StationId: stId };
      const added = await stationApi.createCharger(dataToSend);

      setActiveModal(null);
      setStation((prev) => ({
        ...prev,
        chargers: [...(prev?.chargers || []), added],
      }));
      message.success("Thêm bộ sạc thành công!");
    } catch (err) {
      console.error("❌ Lỗi thêm bộ sạc:", err);
      message.error("Không thể thêm bộ sạc: " + err.message);
    }
  };

  const handleSaveEditCharger = async () => {
    try {
      const chargerId =
        editingCharger?.ChargerId ??
        editingCharger?.chargerId ??
        editingCharger?.id;
      const stId = station?.StationId;
      if (!chargerId || !stId)
        throw new Error("Thông tin Bộ sạc/Trạm không đầy đủ.");

      const updated = await stationApi.updateCharger(chargerId, editingCharger);
      setActiveModal(null);
      setStation((prev) => replaceChargerOnStation(prev, chargerId, updated));
      message.success("Cập nhật bộ sạc thành công!");
    } catch (err) {
      console.error("❌ Lỗi cập nhật bộ sạc:", err);
      let displayMessage = "Không thể cập nhật bộ sạc: Lỗi không xác định.";
      const rawMessage = err.message;
      if (
        rawMessage &&
        rawMessage.startsWith("{") &&
        rawMessage.endsWith("}")
      ) {
        try {
          const errorObj = JSON.parse(rawMessage);
          displayMessage =
            errorObj.message ||
            "Không thể cập nhật bộ sạc: Vui lòng kiểm tra dữ liệu.";
        } catch {
          displayMessage = "Không thể cập nhật bộ sạc: " + rawMessage;
        }
      } else displayMessage = "Không thể cập nhật bộ sạc: " + rawMessage;
      message.error(displayMessage);
    }
  }; // port

  const handleCreatePort = async () => {
    try {
      const chId = currentChargerId;
      const stId = station?.StationId;
      if (!chId || !stId) throw new Error("Chưa chọn trụ sạc hợp lệ.");

      const currentCharger = station?.chargers.find(
        (c) => c.ChargerId === chId
      ); // Loại bỏ logic check availableType vì nó không phù hợp với thực tế 1 trụ sạc có nhiều cổng cùng loại // và dùng hardcoded ConnectorType: "CCS2" trong newPortInitialState
      const dataToSend = {
        ...newPortData,
        chargerId: chId,
      };
      const addedPort = await stationApi.createPort(dataToSend);

      setActiveModal(null);
      setStation((prev) => ({
        ...prev,
        chargers: prev.chargers.map((c) =>
          c.ChargerId === chId
            ? { ...c, ports: [...(c.ports || []), addedPort] }
            : c
        ),
      }));
      message.success("Thêm cổng sạc thành công!");
    } catch (err) {
      console.error("❌ Lỗi thêm cổng sạc:", err);
      let displayMessage = "Lỗi không xác định.";
      const rawMessage = err.message;
      if (
        rawMessage &&
        rawMessage.startsWith("{") &&
        rawMessage.endsWith("}")
      ) {
        try {
          const errorObj = JSON.parse(rawMessage);
          displayMessage =
            errorObj.message || "Lỗi cập nhật dữ liệu. Vui lòng thử lại.";
        } catch {
          displayMessage = rawMessage;
        }
      } else displayMessage = rawMessage;
      message.error(`Không thể thêm cổng sạc: ${displayMessage}`);
    }
  };

  const handleSaveEditPort = async () => {
    try {
      const portId = editingPort.PortId;
      const chId = editingPort.ChargerId;
      const stId = station?.StationId;
      if (!portId || !chId || !stId)
        throw new Error("Thông tin Cổng/Trụ/Trạm không đầy đủ.");

      const updatedPort = await stationApi.updatePort(portId, editingPort);
      setActiveModal(null);
      setStation((prev) => ({
        ...prev,
        chargers: prev.chargers.map((c) =>
          c.ChargerId === chId
            ? {
                ...c,
                ports: c.ports.map((p) =>
                  p.PortId === portId ? updatedPort : p
                ),
              }
            : c
        ),
      }));
      message.success("Cập nhật cổng thành công!");
    } catch (err) {
      console.error("❌ Lỗi cập nhật cổng:", err);
      message.error("Không thể cập nhật cổng: " + err.message);
    }
  }; // delete

  const handleDeleteConfirm = async () => {
    try {
      if (targetType === "station") {
        await stationApi.deleteStation(targetId);
        setActiveModal(null);
        message.success("Xoá trạm thành công!");
        navigate("/admin/stations");
        return;
      } else if (targetType === "charger") {
        await stationApi.deleteCharger(targetId);
        setStation((prev) => ({
          ...prev,
          chargers: prev.chargers.filter((c) => c.ChargerId !== targetId),
        }));
        message.success("Xoá bộ sạc thành công!");
      } else if (targetType === "port") {
        await stationApi.deletePort(targetId);
        setStation((prev) => ({
          ...prev,
          chargers: prev.chargers.map((c) => ({
            ...c,
            ports: c.ports ? c.ports.filter((p) => p.PortId !== targetId) : [],
          })),
        }));
        message.success("Xoá cổng sạc thành công!");
      }
      setActiveModal(null);
    } catch (err) {
      console.error("❌ Lỗi xoá:", err);
      message.error("Không thể xoá: " + err.message);
    }
  }; // start confirm

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
    console.log("➡️ Payload START Session gửi đi:", payload); // LOG SẼ GIÚP DEBUG

    try {
      let vehicleName = null;
      let vehiclePlate = null; // TODO: nếu có vehicleApi thì map ở đây
      const res = await stationApi.startSession(payload);
      console.log("⬅️ Response START Session nhận được:", res); // LOG SẼ GIÚP DEBUG

      const chargingSessionId =
        res?.chargingSessionId ??
        res?.sessionId ??
        res?.data?.chargingSessionId ??
        res?.data?.sessionId;
      if (!chargingSessionId || chargingSessionId <= 0) {
        console.error(
          "❌ API START Session không trả về ID phiên sạc hợp lệ.",
          res
        );
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
        vehicleName, // ← đã lấy từ vehicleApi
        plate: vehiclePlate, // ← đã lấy từ vehicleApi
      };

      setActiveSessionsByPort((prev) => ({
        ...prev,
        [portId]: sessionData,
      })); // Cập nhật trạng thái cổng sạc

      setStation((prev) => ({
        ...prev,
        chargers: prev.chargers.map((ch) =>
          ch.ChargerId === currentChargerId
            ? {
                ...ch,
                ports: ch.ports.map((p) =>
                  p.PortId === currentPortId
                    ? {
                        ...p,
                        Status: "Busy",
                        sessionData: sessionData, // Lưu session data vào port
                      }
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
  }; // end confirm

  const handleConfirmEndSession = async () => {
    if (!currentPortId) return;

    try {
      setIsEnding(true);

      let res;
      if (isManualEndRequired) {
        // ❗ Trường hợp dừng phiên NGẪU NHIÊN: bắt buộc có chargingSessionId
        const idNum = Number(manualEndSessionId);
        if (!idNum || idNum <= 0 || Number.isNaN(idNum)) {
          message.warning("Vui lòng nhập chargingSessionId hợp lệ (số dương).");
          setIsEnding(false);
          return;
        }
        res = await stationApi.endSession({ chargingSessionId: idNum });
      } else {
        // ✅ Trường hợp phiên do admin bắt đầu trong UI: dùng sessionId đã lưu;
        // nếu vì lý do nào đó thiếu, cho phép fallback theo portId.
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

      // Map dữ liệu BE -> Summary
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

      // Reset UI
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
      {/* filter nhẹ (áp dụng cho tên trạm nếu bạn muốn) */}
      <FiltersBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onAddStation={openAddStationModal}
      />
      <div className="station-list">
        <StationList
          stations={filtered}
          onEditStation={openEditStationModal}
          onDeleteStation={(id) => openDeleteModal(id, "station")}
          onEditCharger={openEditChargerModal}
          onDeleteCharger={(id, t) => openDeleteModal(id, t || "charger")}
          onAddCharger={openAddChargerModal}
          onAddPort={openAddPortModal}
          onEditPort={openEditPortModal}
          onStart={openStartSessionModal}
          onEnd={openEndSessionModal}
        />
      </div>
      {/* Modals */}
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
        open={activeModal === "addStation"}
        onClose={closeModal}
        isEdit={false}
        data={newStation}
        onChange={handleNewStationInputChange}
        onSubmit={handleAddStation}
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
