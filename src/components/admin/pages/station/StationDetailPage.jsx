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

import {
  AVAILABLE_CONNECTOR_TYPES,
  isPortBusy,
} from "../../../../utils/stationUtils";

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

  const [activeModal, setActiveModal] = useState(null);

  // dữ liệu 1 trạm
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);

  // filter (nội bộ trang chi tiết vẫn cho lọc theo tên cục bộ nếu muốn)
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // buffer tạo/sửa
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
    ConnectorType: "CCS2",
    MaxPowerKw: "",
    Code: "",
    Status: "Available",
  };
  const [newPortData, setNewPortData] = useState(newPortInitialState);
  const [editingPort, setEditingPort] = useState({});

  // context id
  const [currentStationId, setCurrentStationId] = useState(null);
  const [currentChargerId, setCurrentChargerId] = useState(null);
  const [currentPortId, setCurrentPortId] = useState(null);

  // delete target
  const [targetId, setTargetId] = useState(null);
  const [targetType, setTargetType] = useState(null);

  // session
  const [isEnding, setIsEnding] = useState(false);
  const [startSessionData, setStartSessionData] = useState({
    userId: "",
    vehicleInput: "",
  });
  const [foundUserName, setFoundUserName] = useState(null);
  const [endSessionData, setEndSessionData] = useState(null);
  const [endSoc, setEndSoc] = useState("");
  const [activeSessionsByPort, setActiveSessionsByPort] = useState({});
  const [userInfo, setUserInfo] = useState(null);

  // Load 1 trạm theo id
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
        console.error(e);
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
          ...station,
          // (nếu muốn cho phép search theo tên trạm ngay trong chi tiết)
          hidden:
            (statusFilter !== "All" &&
              (station.Status === "Open" ? "Open" : "Closed") !==
                statusFilter) ||
            !(station.StationName || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase()),
        },
      ].filter((x) => !x.hidden)
    : [];

  // handlers chung
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
  // Helper lấy tên user từ mọi kiểu payload phổ biến
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
  };

  // open modals
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
  };

  // start/end
  const openStartSessionModal = (portId, stId, chId) => {
    setCurrentPortId(portId);
    setCurrentStationId(stId);
    setCurrentChargerId(chId);
    setStartSessionData({ userId: "", vehicleInput: "" });
    setFoundUserName(null);
    setActiveModal("startSession");
  };

  const openEndSessionModal = (portId, stId, chId) => {
    let session = null;
    setEndSoc("");

    const charger = station?.chargers.find((c) => c.ChargerId === chId);
    const port = charger?.ports.find((p) => p.PortId === portId);

    if (port && isPortBusy(port.Status)) {
      const sd = port.sessionData ?? activeSessionsByPort?.[port.PortId];
      if (sd) {
        const now = new Date();
        const startTime = new Date(sd.startTime);
        const durationMs = now - startTime;
        const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
        const energyKwh = (
          parseFloat(port.MaxPowerKw) *
          durationHours *
          0.95
        ).toFixed(3);
        const costVND = (parseFloat(energyKwh) * 3500).toLocaleString("vi-VN");
        session = {
          ...sd,
          endTime:
            now.toLocaleTimeString("vi-VN") +
            " " +
            now.toLocaleDateString("vi-VN"),
          duration: durationHours,
          energy: energyKwh,
          cost: costVND,
        };
      }
    }
    setEndSessionData(session);
    setCurrentPortId(portId);
    setCurrentStationId(stId);
    setCurrentChargerId(chId);
    setActiveModal("endSession");
  };

  // CRUD station
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
        alert("Vui lòng điền đầy đủ Tên trạm và Địa chỉ!");
        return;
      }
      const added = await stationApi.createStation(data);
      setActiveModal(null);
      setStation(added);
    } catch (err) {
      alert("Không thể thêm trạm mới: " + err.message);
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
      if (!updateData.StationId) return alert("Lỗi: Không tìm thấy ID trạm");
      if (!updateData.StationName?.trim())
        return alert("Lỗi: Tên trạm không được để trống");
      if (!updateData.Address?.trim())
        return alert("Lỗi: Địa chỉ không được để trống");
      if (!updateData.Status)
        return alert("Lỗi: Trạng thái không được để trống");

      const updated = await stationApi.updateStation(
        editingStation.StationId,
        updateData
      );
      setActiveModal(null);
      setStation(updated);
      alert("Cập nhật trạm thành công!");
    } catch (err) {
      console.error("❌ Lỗi cập nhật trạm:", err);
      alert("Cập nhật trạm thất bại: " + err.message);
    }
  };

  // helpers update nested
  const replaceChargerOnStation = (s, chargerId, updatedCharger) => ({
    ...s,
    chargers: s.chargers.map((c) =>
      c.ChargerId === chargerId ? updatedCharger : c
    ),
  });

  // charger
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
    } catch (err) {
      alert("Không thể thêm bộ sạc: " + err.message);
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
    } catch (err) {
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
      alert(displayMessage);
    }
  };

  // port
  const handleCreatePort = async () => {
    try {
      const chId = currentChargerId;
      const stId = station?.StationId;
      if (!chId || !stId) throw new Error("Chưa chọn trụ sạc hợp lệ.");

      const currentCharger = station?.chargers.find(
        (c) => c.ChargerId === chId
      );
      const existingTypes =
        currentCharger?.ports.map((p) => p.ConnectorType) || [];
      const availableType = AVAILABLE_CONNECTOR_TYPES.find(
        (t) => !existingTypes.includes(t)
      );
      if (!availableType)
        throw new Error(
          "Trụ sạc này đã sử dụng hết các loại kết nối khả dụng."
        );

      const dataToSend = {
        ...newPortData,
        ConnectorType: availableType,
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
    } catch (err) {
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
      alert(`Không thể thêm cổng sạc: ${displayMessage}`);
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
    } catch (err) {
      alert("Không thể cập nhật cổng: " + err.message);
    }
  };

  // delete
  const handleDeleteConfirm = async () => {
    try {
      if (targetType === "station") {
        await stationApi.deleteStation(targetId);
        setActiveModal(null);
        navigate("/admin/stations");
        return;
      } else if (targetType === "charger") {
        await stationApi.deleteCharger(targetId);
        setStation((prev) => ({
          ...prev,
          chargers: prev.chargers.filter((c) => c.ChargerId !== targetId),
        }));
      } else if (targetType === "port") {
        await stationApi.deletePort(targetId);
        setStation((prev) => ({
          ...prev,
          chargers: prev.chargers.map((c) => ({
            ...c,
            ports: c.ports ? c.ports.filter((p) => p.PortId !== targetId) : [],
          })),
        }));
      }
      setActiveModal(null);
    } catch (err) {
      alert("Không thể xoá: " + err.message);
    }
  };

  // start confirm
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
      // 🔹 Khai báo và lấy thông tin xe từ vehicleApi trước khi gọi API startSession
      let vehicleName = null;
      let vehiclePlate = null;
      if (vehicleId > 0) {
        try {
          const v = await stationApi.getById(vehicleId);
          vehicleName = v?.model || v?.name || null;
          vehiclePlate = v?.plate || v?.licensePlate || null;
        } catch (err) {
          console.warn("Không lấy được thông tin xe:", err);
        }
      }
      const res = await stationApi.startSession(payload);
      message.success("✅ Bắt đầu phiên sạc từ xa thành công!");

      const chargingSessionId =
        res?.chargingSessionId ??
        res?.sessionId ??
        res?.data?.chargingSessionId ??
        res?.data?.sessionId;

      setActiveSessionsByPort((prev) => ({
        ...prev,
        [portId]: {
          sessionId: chargingSessionId,
          startTime: new Date().toISOString(),
          userId: Number(startSessionData.userId),
          userName: foundUserName,
          vehicleId: Number(startSessionData.vehicleInput) || 0,
        },
      }));

      if (chargingSessionId) {
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
                          sessionData: {
                            sessionId: chargingSessionId,
                            startTime: new Date().toISOString(),
                            userId: Number(startSessionData.userId),
                            userName: foundUserName,
                            vehicleId,
                            vehicleName, // ← đã lấy từ vehicleApi
                            plate: vehiclePlate, // ← đã lấy từ vehicleApi
                          },
                        }
                      : p
                  ),
                }
              : ch
          ),
        }));
      }

      setActiveModal(null);
    } catch (error) {
      console.error("❌ [START] Lỗi khi bắt đầu phiên sạc:", error);
      const errorMessage =
        error?.message || "Lỗi không xác định khi bắt đầu phiên sạc.";
      message.error(`Lỗi: ${errorMessage}`);
    }
  };

  // end confirm
  const handleConfirmEndSession = async () => {
    if (!endSessionData || !currentPortId) return;
    try {
      setIsEnding(true);

      const chargingSessionId = endSessionData?.sessionId;
      if (!chargingSessionId) {
        message.error("Thiếu chargingSessionId. Không thể kết thúc phiên sạc.");
        return;
      }
      if (endSoc === "" || Number.isNaN(Number(endSoc))) {
        message.warning("Vui lòng nhập End SoC hợp lệ (0-100).");
        return;
      }

      const payload = {
        chargingSessionId,
        endSoc: Math.max(0, Math.min(100, Number(endSoc))),
      };
      const res = await stationApi.endSession(payload);
      const ok = !!(res?.data || res?.message);
      if (!ok) {
        message.error(res?.message || "Không thể kết thúc phiên sạc!");
        return;
      }

      message.success(res?.message || "Kết thúc phiên sạc thành công!");
      const endTime = new Date();
      const totalMinutes =
        (endTime.getTime() - new Date(endSessionData.startTime).getTime()) /
        60000;
      const totalEnergy = (totalMinutes * 0.5).toFixed(2);
      const totalCost = (totalEnergy * 3000).toFixed(0);

      setEndSessionData({ ...endSessionData, endTime, totalEnergy, totalCost });
      setActiveModal("endSessionSummary");

      setActiveSessionsByPort((prev) => {
        const copy = { ...prev };
        delete copy[currentPortId];
        return copy;
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
        endSoc={endSoc}
        setEndSoc={setEndSoc}
        isEnding={isEnding}
        onConfirm={handleConfirmEndSession}
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
