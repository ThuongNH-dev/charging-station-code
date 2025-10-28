import React, { useState, useEffect } from "react";

import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import "./StationManagement.css";
// Giả định stationApi và customerApi tồn tại
import { stationApi } from "../../../api/stationApi";
//import { fetchStations } from "../../../api/station";
import { userApi } from "../../../api/userApi";

// Dòng 8:
import { message, Modal, Button, Input } from "antd";

/**
 * Giả lập API tìm kiếm tên người dùng theo CustomerId (BE API)
 * @param {number} id - ID người dùng cần tìm (CustomerId)
 * @returns {string | null} Tên người dùng (FullName) hoặc null
 */

// Thay thế toàn bộ customerApi hiện tại bằng đoạn này
const customerApi = {
  // Trả object { FullName: string } để khớp cách bạn dùng customer.FullName
  getById: async (id) => {
    if (id && Number(id) > 0 && Number(id) !== 999) {
      return { FullName: `User ${id} (Đã xác minh)` };
    }
    return null;
  },
  // giữ tên getUserById nếu chỗ khác dùng - optional
  getUserById: async (id) => {
    return customerApi.getById(id);
  },
};

// Dữ liệu khởi tạo cho Modal (Giữ nguyên)
const newStationInitialState = {
  StationName: "",
  Address: "",
  City: "",
  Latitude: "",
  Longitude: "",
  Status: "Open",
};

const newChargerInitialState = {
  Code: "",
  Type: "DC",
  PowerKw: "",
  Status: "Online",
};

const newPortInitialState = {
  ConnectorType: "CCS2", // Mặc định là CCS2
  MaxPowerKw: "",
  Code: "",
  Status: "Available",
};

function StationPage() {
  const [activeModal, setActiveModal] = useState(null);
  const [newStation, setNewStation] = useState(newStationInitialState);
  const [editingStation, setEditingStation] = useState({});

  const [newChargerData, setNewChargerData] = useState(newChargerInitialState);
  const [editingCharger, setEditingCharger] = useState({});

  const [newPortData, setNewPortData] = useState(newPortInitialState);
  const [editingPort, setEditingPort] = useState({});

  const [currentStationId, setCurrentStationId] = useState(null);
  const [currentChargerId, setCurrentChargerId] = useState(null);

  const [targetId, setTargetId] = useState(null);
  const [targetType, setTargetType] = useState(null);

  // --- START: Session-related state (Replace old duplicated block) ---
  // const [isStarting, setIsStarting] = useState(false); // Trạng thái loading khi bắt đầu sạc
  // const [setIsEnding] = useState(false); // Trạng thái loading khi kết thúc sạc
  const [isEnding, setIsEnding] = useState(false); // Trạng thái loading khi kết thúc sạc

  // Cổng hiện tại được chọn

  // --- END: Session-related state ---

  // CHÚ THÍCH: Thêm State cho logic Bắt đầu phiên sạc
  const [currentPortId, setCurrentPortId] = useState(null);
  const [startSessionData, setStartSessionData] = useState({
    userId: "",
    // TRƯỜNG MỚI: Dùng để lấy ID Xe
    vehicleInput: "",
  });

  const [foundUserName, setFoundUserName] = useState(null); // Tên tìm thấy
  const [endSessionData, setEndSessionData] = useState(null); // Dữ liệu cho modal Tổng kết

  // THÊM: Logic để LỌC danh sách trạm
  const [stations, setStations] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [endSoc, setEndSoc] = useState("");
  const [activeSessionsByPort, setActiveSessionsByPort] = useState({});
  useEffect(() => {
    fetchStations();
  }, []);

  const closeModal = () => {
    setActiveModal(null);
    setStartSessionData({ userId: "", vehicleInput: "" });
    setFoundUserName(null);
    setEndSessionData(null);
  };

  const fetchStations = async () => {
    try {
      // Gọi đồng thời 3 API
      const [stationsRaw, chargersRaw, portsRaw] = await Promise.all([
        stationApi.getAllStations(),
        stationApi.getAllChargers(),
        stationApi.getAllPorts(),
      ]);

      // Chuẩn hoá và gộp dữ liệu sang PascalCase vì phần render sử dụng StationId / ChargerId / PortId
      const mapped = (stationsRaw || []).map((s) => {
        const stationId = s.stationId ?? s.StationId;
        // lấy charger thuộc station này
        const stationChargers = (chargersRaw || [])
          .filter((c) => (c.stationId ?? c.StationId) === stationId)
          .map((c) => {
            const chargerId = c.chargerId ?? c.ChargerId;
            const chargerPorts = (portsRaw || []).filter(
              (p) => (p.chargerId ?? p.ChargerId) === chargerId
            );

            return {
              ChargerId: chargerId,
              StationId: stationId,
              Code: c.code ?? c.Code,
              Type: c.type ?? c.Type,
              PowerKw: c.powerKw ?? c.PowerKw,
              InstalledAt: c.installedAt ?? c.InstalledAt,
              ImageUrl: c.imageUrl ?? c.ImageUrl,
              Status: c.status ?? c.Status,
              utilization: c.utilization ?? c.Utilization,
              totalPorts: c.totalPorts ?? c.TotalPorts,
              availablePorts: c.availablePorts ?? c.AvailablePorts,
              disabledPorts: c.disabledPorts ?? c.DisabledPorts,
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

        return {
          StationId: stationId,
          StationName: s.stationName ?? s.StationName ?? "Tên không xác định",
          Address: s.address ?? s.Address,
          City: s.city ?? s.City,
          Latitude: s.latitude ?? s.Latitude,
          Longitude: s.longitude ?? s.Longitude,
          Status: s.status ?? s.Status ?? "Closed",
          ImageUrl: s.imageUrl ?? s.ImageUrl,
          chargers: stationChargers,
        };
      });

      setStations(mapped);
    } catch (err) {
      console.error("Lỗi khi tải danh sách trạm:", err);
    }
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Logic lọc: Gộp cả trạng thái và tên
  const filteredStations = stations.filter((station) => {
    // 1. Lọc theo trạng thái
    const statusToCheck = station.Status === "Open" ? "Open" : "Closed"; // Chuẩn hóa giá trị
    const isStatusMatch =
      statusFilter === "All" || statusToCheck === statusFilter;

    // 2. Lọc theo tên
    const stationName = station.StationName || "";
    const lowerCaseStationName = stationName.toLowerCase();
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const isNameMatch = lowerCaseStationName.includes(lowerCaseSearchTerm);

    // Trả về true nếu cả hai điều kiện đều đúng
    return isStatusMatch && isNameMatch;
  });

  // CHÚ THÍCH: Logic tìm kiếm tên người dùng (giả lập debounce/API call)
  useEffect(() => {
    const fetchCustomerName = async () => {
      if (!startSessionData.userId) {
        setFoundUserName(null);
        return;
      }

      try {
        // ✅ SỬA LỖI: Gọi API thực tế
        const customer = await customerApi.getById(startSessionData.userId);
        setFoundUserName(customer?.FullName ?? null);
      } catch (error) {
        setFoundUserName(null); // Không tìm thấy
        console.error("Lỗi tìm kiếm khách hàng:", error);
      }
    };

    if (activeModal === "startSession" && startSessionData.userId) {
      const timer = setTimeout(fetchCustomerName, 300); // Thêm Debounce

      return () => clearTimeout(timer);
    } else if (activeModal !== "startSession") {
      setFoundUserName(null);
    }
  }, [startSessionData.userId, activeModal]);

  // --- HANDLER CHUNG CHO INPUT (Giữ nguyên) ---

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

  // CHÚ THÍCH: Handler input cho Modal Bắt đầu
  const handleStartSessionInputChange = (e) => {
    const { name, value } = e.target;
    setStartSessionData((prev) => ({ ...prev, [name]: value }));

    if (name === "userId") {
      if (value.trim() !== "") {
        const fetchUserName = async () => {
          try {
            const res = await userApi.getUserById(value); // Gọi API lấy thông tin user

            // 👇 Dòng này dùng để xem dữ liệu trả về trong Console (F12)
            console.log("API getUserById trả về:", res);

            // ⚙️ Tùy cấu trúc của response mà truy cập fullName
            if (res?.data?.fullName) {
              setFoundUserName(res.data.fullName);
            } else if (res?.fullName) {
              setFoundUserName(res.fullName);
            } else {
              setFoundUserName("Không tìm thấy người dùng");
            }
          } catch (error) {
            console.error("Lỗi khi tìm tên người dùng:", error);
            setFoundUserName("Lỗi khi tra người dùng");
          }
        };
        fetchUserName();
      } else {
        setFoundUserName(null);
      }
    }
  };

  // CHÚ THÍCH: Mở Modal Bắt đầu
  const openStartSessionModal = (portId, stationId, chargerId) => {
    setCurrentPortId(portId);
    setCurrentStationId(stationId);
    setCurrentChargerId(chargerId);
    setStartSessionData({ userId: "", vehicleInput: "" });
    setFoundUserName(null);
    setActiveModal("startSession");
  };

  // CHÚ THÍCH: Mở Modal Tổng kết và tìm dữ liệu session
  const openEndSessionModal = (portId, stationId, chargerId) => {
    console.log("🧭 [END] Open modal với:", { portId, stationId, chargerId });

    let session = null; // chỉ 1 biến session ở cấp hàm
    setEndSoc(""); // reset input End SoC mỗi lần mở

    const station = stations.find((s) => s.StationId === stationId);
    const charger = station?.chargers.find((c) => c.ChargerId === chargerId);
    const port = charger?.ports.find((p) => p.PortId === portId);

    console.log("🔎 [END] Port tìm được:", port);
    if (!port) {
      console.warn("⚠️ [END] Không tìm thấy port theo ID.");
    } else {
      if (!isPortBusy(port.Status)) {
        console.warn("⚠️ [END] Port không ở trạng thái Busy:", port.Status);
      }

      // Lấy sessionData từ port hoặc fallback bộ nhớ tạm
      const sd = port.sessionData ?? activeSessionsByPort?.[port.PortId];

      if (sd) {
        console.log("✅ [END] Dùng sessionData:", sd);

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
      } else {
        console.warn("⚠️ [END] Không có sessionData trên port hoặc fallback.");
      }
    }

    if (!session) {
      console.warn(
        "⚠️ [END] sessionData = null → sẽ hiện thông báo trên modal."
      );
    }

    setEndSessionData(session);
    setCurrentPortId(portId);
    setCurrentStationId(stationId);
    setCurrentChargerId(chargerId);
    setActiveModal("endSession");
  };

  // CHÚ THÍCH: Xác nhận Bắt đầu (Chuyển trạng thái cổng sang Busy)
  // ✅ Bắt đầu phiên sạc
  // StationManagement.jsx (Khoảng dòng 356)
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

    // ✅ Payload đúng chuẩn BE: bookingId = 0 (không phải null)
    const sessionData = {
      customerId,
      vehicleId,
      bookingId: null,
      portId,
    };

    console.log(
      "🚀 [START] Payload gửi lên BE:",
      JSON.stringify(sessionData, null, 2)
    );

    try {
      const res = await stationApi.startSession(sessionData);
      console.log("✅ [START] Response BE:", res);

      message.success("✅ Bắt đầu phiên sạc từ xa thành công!");

      // Lấy sessionId theo nhiều khả năng tên field
      const chargingSessionId =
        res?.chargingSessionId ??
        res?.sessionId ??
        res?.data?.chargingSessionId ??
        res?.data?.sessionId;

      if (!chargingSessionId) {
        console.warn(
          "⚠️ [START] BE không trả về chargingSessionId. UI sẽ không end được!"
        );
      } else {
        console.log("🆔 [START] chargingSessionId:", chargingSessionId);
      }
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
      // Gắn tạm vào state để có thể "Dừng" ngay
      if (chargingSessionId) {
        setStations((prev) =>
          prev.map((st) =>
            st.StationId === currentStationId
              ? {
                  ...st,
                  chargers: st.chargers.map((ch) =>
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
                                    vehicleId:
                                      Number(startSessionData.vehicleInput) ||
                                      0,
                                  },
                                }
                              : p
                          ),
                        }
                      : ch
                  ),
                }
              : st
          )
        );
      }

      setActiveModal(null);
      // // Đồng bộ lại list từ server (nếu BE cũng cập nhật trạng thái)
      // fetchStations();
    } catch (error) {
      console.error("❌ [START] Lỗi khi bắt đầu phiên sạc:", error);
      const errorMessage =
        error?.message || "Lỗi không xác định khi bắt đầu phiên sạc.";
      message.error(`Lỗi: ${errorMessage}`);
    }
  };

  // CHÚ THÍCH: Xác nhận Tổng kết (Chuyển trạng thái cổng sang Available)
  // ✅ Kết thúc phiên sạc
  const handleConfirmEndSession = async () => {
    if (!endSessionData || !currentPortId) {
      console.warn("⚠️ [END] Thiếu endSessionData hoặc currentPortId.");
      return;
    }

    try {
      setIsEnding(true);

      const chargingSessionId = endSessionData?.sessionId;
      if (!chargingSessionId) {
        message.error("Thiếu chargingSessionId. Không thể kết thúc phiên sạc.");
        console.error(
          "❌ [END] endSessionData không có sessionId:",
          endSessionData
        );
        return;
      }

      if (endSoc === "" || Number.isNaN(Number(endSoc))) {
        message.warning("Vui lòng nhập End SoC hợp lệ (0-100).");
        console.warn("⚠️ [END] endSoc không hợp lệ:", endSoc);
        return;
      }

      const payload = {
        chargingSessionId,
        endSoc: Math.max(0, Math.min(100, Number(endSoc))),
      };

      console.log("🛑 [END] Payload gửi BE:", JSON.stringify(payload, null, 2));

      // ✅ Gọi API đúng chuẩn BE: body chỉ có { chargingSessionId, endSoc }
      const res = await stationApi.endSession(payload);
      console.log("✅ [END] Response BE:", res);

      // 👉 BE của bạn trả về { message, data }, coi đó là thành công
      const ok = !!(res?.data || res?.message);

      // Nếu vẫn muốn chặt chẽ hơn, có thể thêm: || res === true

      if (!ok) {
        console.error("❌ [END] BE không trả success:", res);
        message.error(res?.message || "Không thể kết thúc phiên sạc!");
        return;
      }

      // === NHÁNH THÀNH CÔNG ===
      message.success(res?.message || "Kết thúc phiên sạc thành công!");

      const endTime = new Date();
      const totalMinutes =
        (endTime.getTime() - new Date(endSessionData.startTime).getTime()) /
        60000;
      const totalEnergy = (totalMinutes * 0.5).toFixed(2);
      const totalCost = (totalEnergy * 3000).toFixed(0);

      setEndSessionData({
        ...endSessionData,
        endTime,
        totalEnergy,
        totalCost,
      });
      setActiveModal("endSessionSummary");

      // xoá session tạm
      setActiveSessionsByPort((prev) => {
        const copy = { ...prev };
        delete copy[currentPortId];
        return copy;
      });

      // reset port về Available
      setStations((prev) =>
        prev.map((station) => ({
          ...station,
          chargers: station.chargers.map((charger) => ({
            ...charger,
            ports: charger.ports.map((port) =>
              port.PortId === currentPortId
                ? { ...port, Status: "Available", sessionData: null }
                : port
            ),
          })),
        }))
      );

      // (tuỳ chọn) đóng modal tổng kết ngay:
      setActiveModal(null);
    } catch (error) {
      console.error("❌ [END] Lỗi khi kết thúc phiên sạc:", error);
    } finally {
      setIsEnding(false);
    }
  };

  // --- MODAL HANDLERS (Giữ nguyên) ---

  const openAddPortModal = (stationId, chargerId) => {
    setCurrentStationId(stationId);
    setCurrentChargerId(chargerId);
    setNewPortData(newPortInitialState);
    setActiveModal("addPort");
  };

  const openAddStationModal = () => {
    setNewStation(newStationInitialState);
    setActiveModal("addStation");
  };

  const openAddChargerModal = (stationId) => {
    setCurrentStationId(stationId);
    setNewChargerData(newChargerInitialState);
    setActiveModal("addCharger");
  };

  const openEditStationModal = (stationId) => {
    const station = stations.find((s) => s.StationId === stationId);
    if (station) {
      setEditingStation(station);
      setActiveModal("editStation");
    }
  };

  const openEditChargerModal = (stationId, chargerId) => {
    const station = stations.find((s) => s.StationId === stationId);
    const charger = station?.chargers.find(
      (c) => Number(c.ChargerId) === Number(chargerId)
    );
    if (charger) {
      setEditingCharger({ ...charger, StationId: stationId });
      setActiveModal("editCharger");
    }
  };

  const openEditPortModal = (portId) => {
    let portToEdit = null;
    let stationId, chargerId;

    stations.forEach((station) => {
      station.chargers.forEach((charger) => {
        const foundPort = charger.ports.find(
          (p) => String(p.PortId) === String(portId)
        );
        if (foundPort) {
          portToEdit = foundPort;
          stationId = station.StationId;
          chargerId = charger.ChargerId;
        }
      });
    });

    if (portToEdit) {
      setEditingPort({
        ...portToEdit,
        StationId: stationId,
        ChargerId: chargerId,
      });
      setActiveModal("editPort");
    }
  };

  const openDeleteModal = (id, type) => {
    setTargetId(id);
    setTargetType(type);
    setActiveModal("deleteConfirm");
  };
  const updateNestedItem = (
    prevStations,
    stationId,
    itemId,
    itemType,
    updatedItem = null
  ) => {
    return prevStations.map((station) => {
      if (station.StationId === stationId) {
        if (itemType === "charger") {
          // Thao tác với Charger
          const newChargers = updatedItem
            ? station.chargers.map((c) =>
                c.ChargerId === itemId ? updatedItem : c
              )
            : station.chargers.filter((c) => c.ChargerId !== itemId); // Xóa
          return { ...station, chargers: newChargers };
        } else if (itemType === "port") {
          // Thao tác với Port
          const newChargers = station.chargers.map((charger) => {
            if (charger.ChargerId === currentChargerId) {
              // Giả định currentChargerId được set khi mở modal Port
              const newPorts = updatedItem
                ? charger.ports.map((p) =>
                    p.PortId === itemId ? updatedItem : p
                  )
                : charger.ports.filter((p) => p.PortId !== itemId); // Xóa
              return { ...charger, ports: newPorts };
            }
            return charger;
          });
          return { ...station, chargers: newChargers };
        }
      }
      return station;
    });
  };
  // --- LOGIC CẬP NHẬT TRẠNG THÁI (Giữ nguyên) ---
  // 🏗️ Thêm trạm mới
  const handleAddStation = async () => {
    try {
      const stationData = {
        StationName: newStation.StationName?.trim() || "",
        Address: newStation.Address?.trim() || "",
        City: newStation.City?.trim() || "",
        Latitude: Number(newStation.Latitude) || 0,
        Longitude: Number(newStation.Longitude) || 0,
        Status: newStation.Status || "Offline",
      };

      if (!stationData.StationName || !stationData.Address) {
        alert("Vui lòng điền đầy đủ Tên trạm và Địa chỉ!");
        return;
      }

      const addedStation = await stationApi.createStation(stationData);
      setActiveModal(null);
      // ✅ SỬA LỖI: Cập nhật state trực tiếp
      setStations((prev) => [...prev, addedStation]);
    } catch (err) {
      alert("Không thể thêm trạm mới: " + err.message);
    }
  };

  // 🛠️ Cập nhật trạm
  const handleSaveEditStation = async () => {
    try {
      // Chuẩn bị dữ liệu gửi đi - đảm bảo format đúng
      const updateData = {
        StationId: editingStation.StationId,
        StationName: editingStation.StationName,
        Address: editingStation.Address,
        City: editingStation.City,
        Latitude: Number(editingStation.Latitude) || 0,
        Longitude: Number(editingStation.Longitude) || 0,
        Status: editingStation.Status, // Đảm bảo Status được gửi đúng
        ImageUrl: editingStation.ImageUrl || "",
      };

      // Validation dữ liệu trước khi gửi
      if (!updateData.StationId) {
        alert("Lỗi: Không tìm thấy ID trạm");
        return;
      }

      if (!updateData.StationName?.trim()) {
        alert("Lỗi: Tên trạm không được để trống");
        return;
      }

      if (!updateData.Address?.trim()) {
        alert("Lỗi: Địa chỉ không được để trống");
        return;
      }

      if (!updateData.Status) {
        alert("Lỗi: Trạng thái không được để trống");
        return;
      }

      console.log("🔄 Đang cập nhật trạm:", {
        stationId: editingStation.StationId,
        originalData: editingStation,
        preparedData: updateData,
        status: updateData.Status,
      });

      const updatedStation = await stationApi.updateStation(
        editingStation.StationId,
        updateData
      );

      console.log("✅ Cập nhật thành công:", updatedStation);
      console.log("🔍 Kiểm tra dữ liệu:", {
        original: editingStation,
        response: updatedStation,
        status: updatedStation.Status,
      });

      // 🔍 Debug: Kiểm tra dữ liệu trước khi cập nhật state
      console.log("🔍 Dữ liệu từ API:", {
        StationId: updatedStation.StationId,
        StationName: updatedStation.StationName,
        Status: updatedStation.Status,
        Address: updatedStation.Address,
      });

      setActiveModal(null);

      // ✅ SỬA LỖI: Cập nhật state trực tiếp
      setStations((prev) => {
        console.log(
          "🔍 Trước khi cập nhật state:",
          prev.find((s) => s.StationId === updatedStation.StationId)
        );
        const updated = prev.map((s) =>
          s.StationId === updatedStation.StationId ? updatedStation : s
        );
        console.log(
          "🔍 Sau khi cập nhật state:",
          updated.find((s) => s.StationId === updatedStation.StationId)
        );
        return updated;
      });

      alert("Cập nhật trạm thành công!");

      // ✅ Đơn giản hóa: Không cần kiểm tra lại từ server
      // Vì backend đã cập nhật thành công (HTTP 204), UI đã được cập nhật
      console.log("✅ Cập nhật trạm hoàn tất");
    } catch (err) {
      console.error("❌ Lỗi cập nhật trạm:", err);
      alert("Cập nhật trạm thất bại: " + err.message);
    }
  };

  // ⚡ Thêm trụ sạc (charger)
  const handleCreateCharger = async () => {
    try {
      const stationId =
        currentStationId?.StationId ??
        currentStationId?.stationId ??
        currentStationId;
      if (!stationId) throw new Error("Chưa chọn trạm hợp lệ.");

      const dataToSend = { ...newChargerData, StationId: stationId };
      const addedCharger = await stationApi.createCharger(dataToSend);

      setActiveModal(null);
      // ✅ SỬA LỖI: Cập nhật state trực tiếp (Thêm bộ sạc vào đúng trạm)
      setStations((prev) =>
        prev.map((station) => {
          if (station.StationId === stationId) {
            return {
              ...station,
              chargers: [...(station.chargers || []), addedCharger],
            };
          }
          return station;
        })
      );
    } catch (err) {
      alert("Không thể thêm bộ sạc: " + err.message);
    }
  };

  // 🔧 Cập nhật trụ sạc
  const handleSaveEditCharger = async () => {
    try {
      const chargerId =
        editingCharger?.ChargerId ??
        editingCharger?.chargerId ??
        editingCharger?.id;
      const stationId = editingCharger?.StationId;

      if (!chargerId || !stationId)
        throw new Error("Thông tin Bộ sạc/Trạm không đầy đủ.");

      const updatedCharger = await stationApi.updateCharger(
        chargerId,
        editingCharger
      );

      setActiveModal(null);
      setStations((prev) =>
        updateNestedItem(prev, stationId, chargerId, "charger", updatedCharger)
      );
    } catch (err) {
      // -------------------------------------------------------------------
      // ✅ BẮT ĐẦU SỬA LỖI Ở ĐÂY: Xử lý lỗi API cụ thể

      let displayMessage = "Không thể cập nhật bộ sạc: Lỗi không xác định.";
      const rawMessage = err.message;

      // 1. Thử phân tích JSON nếu lỗi có vẻ là từ API (như: Error: { "message": "..." })
      if (
        rawMessage &&
        rawMessage.startsWith("{") &&
        rawMessage.endsWith("}")
      ) {
        try {
          const errorObj = JSON.parse(rawMessage);
          // Lấy thông báo lỗi cụ thể từ Backend
          displayMessage =
            errorObj.message ||
            "Không thể cập nhật bộ sạc: Vui lòng kiểm tra dữ liệu.";
        } catch (e) {
          // Nếu không phải JSON, sử dụng message gốc
          displayMessage = "Không thể cập nhật bộ sạc: " + rawMessage;
        }
      } else {
        // 2. Sử dụng thông báo lỗi mặc định (ví dụ: lỗi mạng, lỗi logic)
        displayMessage = "Không thể cập nhật bộ sạc: " + rawMessage;
      }

      // 3. Hiển thị thông báo (sử dụng alert hoặc tốt hơn là toast/snackbar)
      alert(displayMessage);

      // GIỮ NGUYÊN: KHÔNG ĐÓNG modal (setActiveModal(null))
      // để người dùng có thể sửa Mã Code bị trùng.
      // -------------------------------------------------------------------
    }
  };

  // ⚙️ Thêm cổng sạc
  // Cách 1: arrow function
  // ✅ StationManagement.jsx - BẢN SỬA LỖI handleCreatePort HOÀN CHỈNH

  // ✅ BẢN CHỈNH SỬA HOÀN CHỈNH CHO StationManagement.jsx

  // GIẢ ĐỊNH: Danh sách các loại kết nối có thể có (Cần được định nghĩa trước)
  const AVAILABLE_CONNECTOR_TYPES = ["CCS2", "CHAdeMO", "Type2", "GB/T"];
  // THÊM ↓↓↓
  const normalizeStatus = (status) =>
    (status ?? "").toString().trim().toLowerCase();
  const isPortBusy = (status) => {
    const s = normalizeStatus(status);
    return ["busy", "charging", "inuse", "occupied"].includes(s);
  };

  const handleCreatePort = async () => {
    try {
      const chargerId =
        currentChargerId?.ChargerId ??
        currentChargerId?.chargerId ??
        currentChargerId;
      const stationId =
        currentStationId?.StationId ??
        currentStationId?.stationId ??
        currentStationId;

      if (!chargerId || !stationId)
        throw new Error("Chưa chọn trụ sạc hợp lệ.");

      // ------------------------------------------------------------------
      // ✅ BƯỚC 1: TÌM CONNECTOR TYPE CÒN TRỐNG (LOGIC TỰ ĐỘNG ĐIỀN)

      // Tìm dữ liệu trạm và trụ sạc hiện tại từ state 'stations'
      const currentStation = stations.find((s) => s.StationId === stationId);
      const currentCharger = currentStation?.chargers.find(
        (c) => c.ChargerId === chargerId
      );

      // Lấy danh sách các loại kết nối đã có trên trụ sạc này
      const existingTypes =
        currentCharger?.ports.map((p) => p.ConnectorType) || [];

      // Tìm loại kết nối đầu tiên KHÔNG TỒN TẠI trên trụ sạc này
      const availableType = AVAILABLE_CONNECTOR_TYPES.find(
        (type) => !existingTypes.includes(type)
      );

      if (!availableType) {
        // Nếu không còn loại nào trống
        throw new Error(
          "Trụ sạc này đã sử dụng hết các loại kết nối khả dụng."
        );
      }

      // -----------------------------------------------------
      // ✅ BƯỚC 2: GỬI API VỚI DỮ LIỆU ĐÃ TỰ ĐỘNG ĐIỀN
      const dataToSend = {
        ...newPortData,
        // Tự động gán ConnectorType còn trống
        ConnectorType: availableType,
        // FIX: Gửi Charger ID với tên trường phổ biến (thường là camelCase)
        chargerId: chargerId,
      };

      const addedPort = await stationApi.createPort(dataToSend);

      setActiveModal(null);

      // ✅ BƯỚC 3: Cập nhật state với cổng sạc mới
      setStations((prev) =>
        prev.map((station) => {
          if (station.StationId === stationId) {
            return {
              ...station,
              chargers: station.chargers.map((charger) => {
                if (charger.ChargerId === chargerId) {
                  return {
                    ...charger,
                    ports: [...(charger.ports || []), addedPort],
                  };
                }
                return charger;
              }),
            };
          }
          return station;
        })
      );
    } catch (err) {
      // ✅ BƯỚC 4: LOGIC XỬ LÝ VÀ HIỂN THỊ LỖI
      let displayMessage = "Lỗi không xác định.";
      const rawMessage = err.message;

      if (
        rawMessage &&
        rawMessage.startsWith("{") &&
        rawMessage.endsWith("}")
      ) {
        try {
          const errorObj = JSON.parse(rawMessage);
          // Hiển thị lỗi cụ thể từ Backend
          displayMessage =
            errorObj.message || "Lỗi cập nhật dữ liệu. Vui lòng thử lại.";
        } catch (e) {
          displayMessage = rawMessage;
        }
      } else {
        // Lỗi từ logic front-end (ví dụ: "Trụ sạc này đã sử dụng hết...") hoặc lỗi mạng
        displayMessage = rawMessage;
      }

      alert(`Không thể thêm cổng sạc: ${displayMessage}`);
    }
  };

  // 🧩 Cập nhật cổng sạc
  const handleSaveEditPort = async () => {
    try {
      const portId = editingPort.PortId;
      const chargerId = editingPort.ChargerId; // Cần phải có ChargerId trong editingPort
      const stationId = editingPort.StationId; // Cần phải có StationId trong editingPort

      if (!portId || !chargerId || !stationId)
        throw new Error("Thông tin Cổng/Trụ/Trạm không đầy đủ.");

      const updatedPort = await stationApi.updatePort(portId, editingPort);

      setActiveModal(null);
      // ✅ SỬA LỖI: Cập nhật state trực tiếp (Thay thế cổng sạc cũ)
      setStations((prev) =>
        prev.map((station) => {
          if (station.StationId === stationId) {
            return {
              ...station,
              chargers: station.chargers.map((charger) => {
                if (charger.ChargerId === chargerId) {
                  return {
                    ...charger,
                    ports: charger.ports.map((p) =>
                      p.PortId === portId ? updatedPort : p
                    ),
                  };
                }
                return charger;
              }),
            };
          }
          return station;
        })
      );
    } catch (err) {
      alert("Không thể cập nhật cổng: " + err.message);
    }
  };

  // ❌ Xóa trạm / trụ / cổng (dùng chung)
  const handleDeleteConfirm = async () => {
    try {
      if (targetType === "station") {
        await stationApi.deleteStation(targetId);
        // ✅ SỬA LỖI: Cập nhật State: Lọc bỏ trạm
        setStations((prev) => prev.filter((s) => s.StationId !== targetId));
      } else if (targetType === "charger") {
        await stationApi.deleteCharger(targetId);
        // ✅ SỬA LỖI: Cập nhật State: Lọc bộ sạc khỏi tất cả trạm (Cần biết StationId)
        // LƯU Ý: Nếu targetId/targetType không cung cấp đủ StationId, phải tìm kiếm/tìm nạp thêm
        // Hiện tại, ta sẽ lọc bộ sạc khỏi tất cả các trạm
        setStations((prevStations) =>
          prevStations.map((station) => ({
            ...station,
            chargers: station.chargers
              ? station.chargers.filter((c) => c.ChargerId !== targetId)
              : [],
          }))
        );
      } else if (targetType === "port") {
        await stationApi.deletePort(targetId);
        // ✅ SỬA LỖI: Cập nhật State: Lọc cổng sạc khỏi tất cả bộ sạc/trạm
        setStations((prevStations) =>
          prevStations.map((station) => ({
            ...station,
            chargers: station.chargers.map((charger) => ({
              ...charger,
              ports: charger.ports
                ? charger.ports.filter((p) => p.PortId !== targetId)
                : [],
            })),
          }))
        );
      }

      setActiveModal(null);
    } catch (err) {
      alert("Không thể xoá: " + err.message);
    }
  };

  // --- HÀM RENDER ---
  const renderChargers = (station) =>
    station.chargers.map((charger) => (
      <div className="pole-section" key={String(charger.ChargerId)}>
        {charger.ImageUrl && (
          <img
            src={charger.ImageUrl}
            alt={`Hình ảnh bộ sạc ${charger.Code}`}
            style={{
              width: "60px",
              height: "60px",
              objectFit: "cover",
              marginRight: "10px",
              borderRadius: "2px",
            }}
          />
        )}
        <div className="pole-header">
          {/* HIỂN THỊ TRẠNG THÁI BỘ SẠC */}
          <h4>
            {charger.Code} ({charger.Type} - {charger.PowerKw}kW)
            <span
              className={`status-badge ${charger.Status.toLowerCase()}`}
              style={{ marginLeft: "10px" }}
            >
              {/* Logic: Online/Offline */}
              {charger.Status === "Online" ? "Online" : "Offline"}
            </span>
          </h4>
          <p style={{ fontSize: "0.8em", color: "#666" }}>
            {/* ✅ LƯU Ý: Sửa lại cách truy cập InstalledAt để tránh lỗi nếu API trả về ISO 8601 */}
            Lắp đặt:{" "}
            {charger.InstalledAt?.split("T")[0] ||
              charger.InstalledAt?.split(" ")[0] ||
              "N/A"}
          </p>
          <div className="pole-actions">
            <button
              className="icon-btn"
              onClick={() =>
                openEditChargerModal(station.StationId, charger.ChargerId)
              }
            >
              <EditOutlined />
            </button>
            <button
              className="icon-btn"
              onClick={() => openDeleteModal(charger.ChargerId, "charger")}
            >
              <DeleteOutlined />
            </button>
          </div>
        </div>
        {charger.ports.map((port) => (
          <div className="port-card" key={port.PortId}>
            <div className="port-details">
              <p>
                <strong>
                  {port.ConnectorType} ({port.Code})
                </strong>
              </p>
              <p className="port-extra-info">
                Công suất tối đa: {port.MaxPowerKw}kW
              </p>
            </div>
            <div className="status-row">
              {/* HIỂN THỊ TRẠNG THÁI CỔNG */}
              {(() => {
                const s = normalizeStatus(port.Status);
                return (
                  <>
                    <span className={`badge ${s}`}>
                      {s === "available"
                        ? "Online"
                        : s === "maintenance"
                        ? "Bảo trì"
                        : "Đang bận"}
                    </span>

                    {s === "available" && (
                      <button
                        className="btn small green"
                        onClick={() =>
                          openStartSessionModal(
                            port.PortId,
                            station.StationId,
                            charger.ChargerId
                          )
                        }
                      >
                        Bắt đầu
                      </button>
                    )}

                    {isPortBusy(port.Status) && (
                      <button
                        className="btn small red"
                        onClick={() =>
                          openEndSessionModal(
                            port.PortId,
                            station.StationId,
                            charger.ChargerId
                          )
                        }
                      >
                        Dừng
                      </button>
                    )}
                  </>
                );
              })()}

              {/* KHÔNG HIỂN THỊ GÌ nếu là "Maintenance" */}
              <button
                className="icon-btn"
                onClick={() => openEditPortModal(port.PortId)}
              >
                <EditOutlined />
              </button>
              <button
                className="icon-btn"
                onClick={() => openDeleteModal(port.PortId, "port")}
              >
                <DeleteOutlined />
              </button>
            </div>
          </div>
        ))}
        <button
          className="link-btn"
          onClick={() => openAddPortModal(station.StationId, charger.ChargerId)}
        >
          + Thêm cổng sạc
        </button>
      </div>
    ));

  // 🧩 Khi nhập ID người dùng để bắt đầu sạc
  // Giả định các state đã được khai báo ở đầu component:
  const [userInfo, setUserInfo] = useState(null);
  // const [foundUserName, setFoundUserName] = useState(null);
  // const [startSessionData, setStartSessionData] = useState({ userId: '', carPlate: '' });

  // Trích đoạn hàm handleUserIdChange (Đã có sẵn trong code của bạn):

  const handleUserIdChange = async (value) => {
    // Cập nhật startSessionData.userId ngay lập tức (Logic đã có trong onClick)
    // setStartSessionData((prev) => ({ ...prev, userId: value })); // KHÔNG CẦN, vì nó đã được gọi trong onChange

    // Reset thông tin người dùng khi bắt đầu nhập ID mới
    // KHUYẾN NGHỊ: Thêm setUserInfo(null) ở đây nếu giá trị thay đổi

    if (!value) {
      setUserInfo(null); // Reset nếu ID trống
      return;
    }

    try {
      console.log("🔍 Đang tìm user ID:", value);
      const res = await userApi.getUserById(value);
      console.log("✅ API trả về:", res);

      if (res && res.username) {
        setUserInfo(res); // ✅ Lưu toàn bộ object user vào state userInfo
        message.success(`Tìm thấy user: ${res.username}`);
      } else {
        setUserInfo(null); // ❌ Reset userInfo nếu không tìm thấy
        message.warning("Không tìm thấy người dùng này");
      }
    } catch (error) {
      setUserInfo(null); // ❌ Reset userInfo nếu có lỗi API
      console.error("❌ Lỗi khi tìm user:", error);
      message.error("Không thể tìm người dùng, kiểm tra lại ID");
    }
  };
  // Chú ý: Bạn cần đảm bảo bạn có state `const [userInfo, setUserInfo] = useState(null);`

  return (
    <div className="station-page">
      <h2 className="admin-title">Quản lý Trạm & Bộ sạc</h2>
      <div className="station-actions">
        <select
          className="input-field"
          value={statusFilter}
          onChange={handleStatusFilterChange}
          style={{ maxWidth: "150px" }}
        >
          <option value="All">Tất cả trạng thái</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
        {/* INPUT TÌM KIẾM THEO TÊN */}
        <input
          type="text"
          placeholder="Tìm kiếm trạm theo tên..."
          className="input-field"
          value={searchTerm}
          onChange={handleSearchInputChange}
        />
        <button className="btn primary" onClick={openAddStationModal}>
          <PlusOutlined /> Thêm trạm mới
        </button>
      </div>

      <div className="station-list">
        {Array.isArray(filteredStations) && filteredStations.length > 0 ? (
          filteredStations.map((station) => (
            <div className="station-card" key={station.StationId}>
              {/* Hình ảnh trạm */}
              {station.ImageUrl ? (
                <div className="station-image-container">
                  <img
                    src={station.ImageUrl}
                    alt={`Hình ảnh trạm sạc ${station.StationName}`}
                    onError={(e) => (e.target.src = "/placeholder.png")}
                    className="station-img"
                  />
                </div>
              ) : (
                <div className="station-image-container">
                  <img
                    src="/placeholder.png"
                    alt="Hình ảnh trạm mặc định"
                    className="station-img"
                  />
                </div>
              )}

              {/* Thông tin trạm */}
              <div className="station-header">
                <div>
                  <h3>{station.StationName || "Tên trạm không xác định"}</h3>
                  <p>
                    {station.Address || "Địa chỉ không xác định"} -{" "}
                    {station.City || "Thành phố không xác định"}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    className={`status-badge ${
                      // So sánh với "Open" (chữ hoa) vì đã được chuẩn hóa
                      station.Status === "Open" ? "active" : "offline"
                    }`}
                  >
                    {/* So sánh với "Open" (chữ hoa) vì đã được chuẩn hóa */}
                    {station.Status === "Open" ? "Open" : "Closed"}
                  </span>

                  <button
                    className="icon-btn"
                    onClick={() => openEditStationModal(station.StationId)}
                  >
                    <EditOutlined />
                  </button>
                </div>
              </div>

              {/* Bộ sạc */}
              {Array.isArray(station.chargers) &&
              station.chargers.length > 0 ? (
                renderChargers(station)
              ) : (
                <p className="no-chargers">Trạm này chưa có bộ sạc nào.</p>
              )}

              {/* Footer */}
              <div className="station-footer">
                <button
                  className="btn secondary"
                  onClick={() => openDeleteModal(station.StationId, "station")}
                >
                  Xóa trạm
                </button>
                <button
                  className="btn primary"
                  onClick={() => openAddChargerModal(station.StationId)}
                >
                  Thêm bộ sạc
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="no-stations">
            Không tìm thấy trạm nào khớp với bộ lọc.
          </p>
        )}
      </div>

      {/* Các Modal */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {activeModal === "startSession" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3>Bắt đầu phiên sạc (Remote)</h3>
                  <span
                    onClick={closeModal}
                    style={{
                      cursor: "pointer",
                      color: "#999",
                      fontSize: "12px",
                    }}
                  >
                    Đóng
                  </span>
                </div>

                <Modal
                  title="Bắt đầu phiên sạc (Remote)"
                  open={activeModal === "startSession"}
                  onClose={() => setActiveModal(null)}
                >
                  {/* ... Port ID Display ... */}

                  {/* TRƯỜNG MỚI: ID XE (Thay thế Biển số xe) */}
                  <div className="input-field">
                    <label>ID Xe (Tùy chọn)</label>
                    <input
                      type="text"
                      placeholder="Nhập ID xe (VD: 12345)"
                      value={startSessionData.vehicleInput}
                      onChange={(e) =>
                        setStartSessionData((prev) => ({
                          ...prev,
                          vehicleInput: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* TRƯỜNG ID NGƯỜI DÙNG (Vẫn là trường chính để xác thực) */}
                  <div className="input-field">
                    <label>ID Người dùng *</label>
                    <input
                      type="text"
                      placeholder="Nhập ID người dùng"
                      value={startSessionData.userId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStartSessionData((prev) => ({
                          ...prev,
                          userId: val,
                        }));
                        handleUserIdChange(val); // Vẫn gọi hàm xác thực người dùng
                      }}
                    />
                  </div>

                  {/* PHẦN HIỂN THỊ TÊN NGƯỜI DÙNG VÀ XÁC MINH (Giữ nguyên logic dựa trên foundUserName) */}
                  {startSessionData.userId &&
                    startSessionData.userId.trim() !== "" && (
                      <p
                        style={{
                          marginTop: "8px",
                          padding: "5px 0",
                          fontSize: "14px",
                          fontWeight: "bold",
                          color: foundUserName ? "#52c41a" : "#ff4d4f",
                        }}
                      >
                        {foundUserName
                          ? `Tên người dùng: ${foundUserName} (Đã xác minh)`
                          : `Không tìm thấy ID Người dùng`}
                      </p>
                    )}

                  <div className="modal-actions" style={{ marginTop: "20px" }}>
                    {/* ... Nút HỦY ... */}
                    <button
                      className="btn green"
                      onClick={handleConfirmStartSession}
                      // Nút BẮT ĐẦU chỉ hoạt động khi có ID Người dùng VÀ đã xác minh thành công
                      disabled={!startSessionData.userId || !foundUserName}
                    >
                      Bắt đầu
                    </button>
                  </div>
                </Modal>
              </>
            )}

            {/* -------------------------------------- */}
            {/* Modal TỔNG KẾT PHIÊN SẠC (END SESSION) */}
            {/* -------------------------------------- */}
            {activeModal === "endSession" && endSessionData && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3>Tổng kết phiên sạc</h3>
                  <div className="input-field" style={{ marginTop: 12 }}>
                    <label>End SoC (%) *</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Nhập SoC khi kết thúc (0-100)"
                      value={endSoc}
                      onChange={(e) => setEndSoc(e.target.value)}
                    />
                  </div>

                  <span
                    onClick={closeModal}
                    style={{
                      cursor: "pointer",
                      color: "#999",
                      fontSize: "12px",
                    }}
                  >
                    Đóng
                  </span>
                </div>
                {/* CHÚ THÍCH: Format hiển thị thông tin chi tiết */}
                <div
                  style={{ fontSize: "15px", lineHeight: "1.8", color: "#333" }}
                >
                  <p style={{ margin: "0", fontWeight: "bold" }}>
                    Trạm: {currentStationId} · Trụ: {currentChargerId} · Cổng:{" "}
                    {currentPortId}
                  </p>
                  <p style={{ margin: "0", fontWeight: "bold" }}>
                    Xe: {endSessionData.carPlate || "Unknown"} · Người:{" "}
                    {endSessionData.userName || "Unknown"} (ID:{" "}
                    {endSessionData.userId})
                  </p>
                  <hr
                    style={{
                      border: "none",
                      borderTop: "1px dotted #ccc",
                      margin: "10px 0",
                    }}
                  />
                  <p style={{ margin: "0" }}>
                    Bắt đầu: **
                    {new Date(endSessionData.startTime).toLocaleTimeString(
                      "vi-VN"
                    ) +
                      " " +
                      new Date(endSessionData.startTime).toLocaleDateString(
                        "vi-VN"
                      )}
                    **
                  </p>
                  <p style={{ margin: "0" }}>
                    Kết thúc: **{endSessionData.endTime}**
                  </p>
                  <p style={{ margin: "0" }}>
                    Thời lượng (giờ): **{endSessionData.duration}**
                  </p>
                  <p style={{ margin: "0" }}>
                    Năng lượng (kWh): **{endSessionData.energy}**
                  </p>
                  <h4
                    style={{
                      color: "#1677ff",
                      margin: "15px 0 0",
                      fontWeight: "bold",
                    }}
                  >
                    Chi phí (đ): {endSessionData.cost}
                  </h4>
                </div>
                <div className="modal-actions">
                  <button
                    className="btn blue"
                    onClick={handleConfirmEndSession}
                    disabled={
                      isEnding || endSoc === "" || Number.isNaN(Number(endSoc))
                    }
                  >
                    {isEnding ? "Đang kết thúc..." : "Kết thúc"}
                  </button>
                </div>
              </>
            )}
            {activeModal === "endSession" && !endSessionData && (
              <>
                <h3>Tổng kết phiên sạc</h3>
                <p style={{ color: "#ff4d4f" }}>
                  Không tìm thấy dữ liệu phiên sạc đang hoạt động cho cổng này.
                </p>
                <div className="modal-actions">
                  <button className="btn" onClick={() => setActiveModal(null)}>
                    Đóng
                  </button>
                </div>
              </>
            )}
            {activeModal === "addStation" && (
              <>
                <h3>Thêm Trạm</h3>
                <input
                  type="text"
                  placeholder="Tên trạm *"
                  name="StationName"
                  value={newStation.StationName}
                  onChange={handleNewStationInputChange}
                />
                <input
                  type="text"
                  placeholder="Địa điểm *"
                  name="Address"
                  value={newStation.Address}
                  onChange={handleNewStationInputChange}
                />
                <input
                  type="text"
                  placeholder="Thành phố *"
                  name="City"
                  value={newStation.City}
                  onChange={handleNewStationInputChange}
                />
                <input
                  type="number"
                  placeholder="Vĩ độ (Latitude) *"
                  name="Latitude"
                  value={newStation.Latitude}
                  onChange={handleNewStationInputChange}
                />
                <input
                  type="number"
                  placeholder="Kinh độ (Longitude) *"
                  name="Longitude"
                  value={newStation.Longitude}
                  onChange={handleNewStationInputChange}
                />
                <select
                  name="Status"
                  value={newStation.Status}
                  onChange={handleNewStationInputChange}
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleAddStation}>
                    Tạo
                  </button>
                </div>
              </>
            )}

            {activeModal === "editStation" && (
              <>
                <h3>Sửa Trạm (ID: {editingStation.StationId})</h3>
                <input
                  type="text"
                  placeholder="Tên trạm *"
                  name="StationName"
                  value={editingStation.StationName}
                  onChange={handleEditStationInputChange}
                />
                <input
                  type="text"
                  placeholder="Địa điểm *"
                  name="Address"
                  value={editingStation.Address}
                  onChange={handleEditStationInputChange}
                />
                <input
                  type="text"
                  placeholder="Thành phố *"
                  name="City"
                  value={editingStation.City}
                  onChange={handleEditStationInputChange}
                />
                <input
                  type="number"
                  placeholder="Vĩ độ (Latitude) *"
                  name="Latitude"
                  value={editingStation.Latitude}
                  onChange={handleEditStationInputChange}
                />
                <input
                  type="number"
                  placeholder="Kinh độ (Longitude) *"
                  name="Longitude"
                  value={editingStation.Longitude}
                  onChange={handleEditStationInputChange}
                />
                <select
                  name="Status"
                  value={editingStation.Status}
                  onChange={handleEditStationInputChange}
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleSaveEditStation}>
                    Lưu
                  </button>
                </div>
              </>
            )}

            {activeModal === "addCharger" && (
              <>
                <h3>Thêm Bộ sạc (Trạm ID: {currentStationId})</h3>
                <input
                  type="text"
                  placeholder="Mã Bộ sạc (VD: C003) *"
                  name="Code"
                  value={newChargerData.Code}
                  onChange={handleNewChargerInputChange}
                />
                <select
                  name="Type"
                  value={newChargerData.Type}
                  onChange={handleNewChargerInputChange}
                >
                  <option value="DC">DC (Sạc nhanh)</option>
                  <option value="AC">AC (Sạc chậm)</option>
                </select>
                <input
                  type="number"
                  placeholder="Công suất (PowerKw) *"
                  name="PowerKw"
                  value={newChargerData.PowerKw}
                  onChange={handleNewChargerInputChange}
                />
                <select
                  name="Status"
                  value={newChargerData.Status}
                  onChange={handleNewChargerInputChange}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleCreateCharger}>
                    Tạo
                  </button>
                </div>
              </>
            )}

            {activeModal === "editCharger" && (
              <>
                <h3>Sửa Bộ sạc (ID: {editingCharger.ChargerId})</h3>
                <input
                  type="text"
                  name="Code"
                  placeholder="Mã Bộ sạc (VD: C001)"
                  value={editingCharger.Code}
                  onChange={handleEditChargerInputChange}
                />
                <select
                  name="Type"
                  value={editingCharger.Type}
                  onChange={handleEditChargerInputChange}
                >
                  <option value="DC">DC (Sạc nhanh)</option>
                  <option value="AC">AC (Sạc chậm)</option>
                </select>
                <input
                  type="number"
                  placeholder="Công suất (PowerKw) *"
                  name="PowerKw"
                  value={editingCharger.PowerKw}
                  onChange={handleEditChargerInputChange}
                />
                <select
                  name="Status"
                  value={editingCharger.Status}
                  onChange={handleEditChargerInputChange}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleSaveEditCharger}>
                    Lưu
                  </button>
                </div>
              </>
            )}

            {activeModal === "addPort" && (
              <>
                <h3>
                  Thêm Cổng Sạc (Trạm {currentStationId} - Bộ sạc{" "}
                  {currentChargerId})
                </h3>
                <input
                  type="text"
                  placeholder="Mã Cổng (VD: P005, tùy chọn)"
                  name="Code"
                  value={newPortData.Code}
                  onChange={handleNewPortInputChange}
                />
                <select
                  name="ConnectorType"
                  value={newPortData.ConnectorType}
                  onChange={handleNewPortInputChange}
                >
                  <option value="CCS2">CCS2</option>
                  <option value="Type2">Type2</option>
                  <option value="CHAdeMO">CHAdeMO</option>
                </select>
                <input
                  type="number"
                  placeholder="Công suất Tối đa (MaxPowerKw, kW) *"
                  name="MaxPowerKw"
                  value={newPortData.MaxPowerKw}
                  onChange={handleNewPortInputChange}
                />
                <select
                  name="Status"
                  value={newPortData.Status}
                  onChange={handleNewPortInputChange}
                >
                  <option value="Available">Sẵn sàng</option>
                  <option value="Maintenance">Bảo trì</option>
                  <option value="Busy">Đang bận</option>
                </select>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleCreatePort}>
                    Tạo
                  </button>
                </div>
              </>
            )}

            {activeModal === "editPort" && (
              <>
                <h3>Sửa Cổng (ID: {editingPort.PortId})</h3>
                <select
                  name="ConnectorType"
                  value={editingPort.ConnectorType}
                  onChange={handleEditPortInputChange}
                >
                  <option value="CCS2">CCS2</option>
                  <option value="Type2">Type2</option>
                  <option value="CHAdeMO">CHAdeMO</option>
                </select>
                <input
                  type="number"
                  placeholder="Công suất Tối đa (MaxPowerKw) *"
                  name="MaxPowerKw"
                  value={editingPort.MaxPowerKw}
                  onChange={handleEditPortInputChange}
                />
                <select
                  name="Status"
                  value={editingPort.Status}
                  onChange={handleEditPortInputChange}
                >
                  <option value="Available">Sẵn sàng</option>
                  <option value="Maintenance">Bảo trì</option>
                  <option value="Busy">Đang bận</option>
                </select>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleSaveEditPort}>
                    Lưu
                  </button>
                </div>
              </>
            )}

            {/* Modal Xóa và Session (Giữ nguyên) */}
            {activeModal === "deleteConfirm" && (
              <>
                <h3>
                  Xác nhận xoá{" "}
                  {targetType === "station"
                    ? "Trạm"
                    : targetType === "charger"
                    ? "Bộ sạc"
                    : "Cổng"}
                </h3>
                <p>
                  Bạn có chắc muốn xoá {targetType} ID: {targetId} này? Hành
                  động này không thể hoàn tác.
                  {targetType === "station" &&
                    " Mọi bộ sạc và cổng bên trong sẽ bị xóa."}
                  {targetType === "charger" &&
                    " Mọi cổng sạc bên trong sẽ bị xóa."}
                </p>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="delete" onClick={handleDeleteConfirm}>
                    Xoá
                  </button>
                </div>
              </>
            )}

            {activeModal === "endSessionSummary" && endSessionData && (
              <div className="modal">
                <h3>Tổng kết phiên sạc</h3>
                <p>
                  <strong>Người dùng:</strong> {endSessionData.userName}
                </p>
                <p>
                  <strong>Xe:</strong>{" "}
                  {endSessionData.vehicleName || "Không có thông tin"}
                </p>
                <p>
                  <strong>Thời gian:</strong>{" "}
                  {new Date(endSessionData.startTime).toLocaleTimeString()} -{" "}
                  {new Date(endSessionData.endTime).toLocaleTimeString()}
                </p>
                <p>
                  <strong>Năng lượng:</strong> {endSessionData.totalEnergy} kWh
                </p>
                <p>
                  <strong>Chi phí:</strong>{" "}
                  {Number(endSessionData.totalCost).toLocaleString()} VNĐ
                </p>
                <button onClick={() => setActiveModal(null)}>Đóng</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StationPage;
