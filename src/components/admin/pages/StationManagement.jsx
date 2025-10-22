import React, { useState, useEffect } from "react";

import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import "./StationManagement.css";

// CHÚ THÍCH: Giả lập dữ liệu Customer để tìm kiếm Tên theo ID
const mockCustomers = [
  { CustomerId: 1, FullName: "Nguyễn Quang Huy" },
  { CustomerId: 2, FullName: "Nguyễn Quang Huy" },
  { CustomerId: 3, FullName: "Anna Is" },
  { CustomerId: 4, FullName: "YNhi" },
  { CustomerId: 5, FullName: "Nguyễn Quang Huy" },
  { CustomerId: 100, FullName: "Nguyễn Văn A" },
  { CustomerId: 821, FullName: "Khách VIP 821" },
];

/**
 * Giả lập API tìm kiếm tên người dùng theo CustomerId (BE API)
 * @param {number} id - ID người dùng cần tìm (CustomerId)
 * @returns {string | null} Tên người dùng (FullName) hoặc null
 */
const findCustomerNameById = (id) => {
  if (!id) return null;
  const customer = mockCustomers.find(
    (c) => String(c.CustomerId) === String(id)
  );
  return customer ? customer.FullName : null;
};

// --- DỮ LIỆU MÔ PHỎNG (Giữ nguyên) ---
const initialStations = [
  {
    StationId: 1,
    StationName: "VinFast Station Hanoi",
    Address: "123 Nguy?n V?n C?, Long Biên",
    City: "Hà Nội",
    Latitude: 21.037,
    Longitude: 105.836,
    Status: "Active",
    chargers: [
      {
        ChargerId: 1,
        StationId: 1,
        Code: "C001",
        Type: "AC",
        PowerKw: 120.0,
        InstalledAt: "2023-05-01 08:00:00.000",
        Status: "Online",
        ports: [
          {
            PortId: 1,
            ChargerId: 1,
            ConnectorType: "CCS2",
            MaxPowerKw: 120.0,
            Code: "P001",
            Status: "Available", // Online: Hiện nút BẮT ĐẦU
            activeSession: false,
          },
          {
            PortId: 2,
            ChargerId: 1,
            ConnectorType: "Type2",
            MaxPowerKw: 90.0,
            Code: "P002",
            Status: "Busy", // Đang bận: Hiện nút TỔNG KẾT
            activeSession: true,
          },
        ],
      },
      {
        ChargerId: 2,
        StationId: 1,
        Code: "C002",
        Type: "DC",
        PowerKw: 60.0,
        InstalledAt: "2023-06-15 08:00:00.000",
        Status: "Offline",
        ports: [
          {
            PortId: 3,
            ChargerId: 2,
            ConnectorType: "CCS2",
            MaxPowerKw: 60.0,
            Code: "P003",
            Status: "Maintenance", // Bảo trì: KHÔNG hiện nút
            activeSession: false,
          },
        ],
      },
    ],
  },
  {
    StationId: 2,
    StationName: "Tesla Station HCM",
    Address: "45 Lê Lợi, Qun 1",
    City: "TP HCM",
    Latitude: 10.775,
    Longitude: 106.7,
    Status: "Offline",
    chargers: [],
  },
];

// Dữ liệu khởi tạo cho Modal (Giữ nguyên)
const newStationInitialState = {
  StationName: "",
  Address: "",
  City: "",
  Latitude: "",
  Longitude: "",
  Status: "Active",
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
  const [stations, setStations] = useState(initialStations);
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

  // CHÚ THÍCH: Thêm State cho logic Bắt đầu phiên sạc
  const [currentPortId, setCurrentPortId] = useState(null);
  const [startSessionData, setStartSessionData] = useState({
    carPlate: "",
    userId: "", // Dùng để nhập và tìm kiếm
  });
  const [foundUserName, setFoundUserName] = useState(null); // Tên tìm thấy
  const [endSessionData, setEndSessionData] = useState(null); // Dữ liệu cho modal Tổng kết

  // THÊM: Logic để LỌC danh sách trạm
  // ✨ BƯỚC 1: THÊM STATE VÀ HÀM XỬ LÝ
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Logic lọc: Gộp cả trạng thái và tên
  const filteredStations = stations.filter((station) => {
    // 1. Lọc theo trạng thái
    const isStatusMatch =
      statusFilter === "All" || station.Status === statusFilter;

    // 2. Lọc theo tên (Không phân biệt chữ hoa/thường)
    const isNameMatch = station.StationName.toLowerCase().includes(
      searchTerm.toLowerCase()
    );

    // Trả về true nếu cả hai điều kiện đều đúng
    return isStatusMatch && isNameMatch;
  });

  // CHÚ THÍCH: Logic tìm kiếm tên người dùng (giả lập debounce/API call)
  useEffect(() => {
    if (activeModal === "startSession" && startSessionData.userId) {
      const timer = setTimeout(() => {
        const name = findCustomerNameById(startSessionData.userId);
        setFoundUserName(name);
      }, 300);

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
  };

  // CHÚ THÍCH: Mở Modal Bắt đầu
  const openStartSessionModal = (portId, stationId, chargerId) => {
    setCurrentPortId(portId);
    setCurrentStationId(stationId);
    setCurrentChargerId(chargerId);
    setStartSessionData({ carPlate: "", userId: "" });
    setFoundUserName(null);
    setActiveModal("startSession");
  };

  // CHÚ THÍCH: Mở Modal Tổng kết và tìm dữ liệu session
  const openEndSessionModal = (portId, stationId, chargerId) => {
    let session = null;
    stations.forEach((s) => {
      if (s.StationId === stationId) {
        s.chargers.forEach((c) => {
          if (c.ChargerId === chargerId) {
            const port = c.ports.find((p) => p.PortId === portId);
            if (port) session = port.sessionData;
          }
        });
      }
    });

    setEndSessionData(session);
    setCurrentPortId(portId);
    setCurrentStationId(stationId);
    setCurrentChargerId(chargerId);
    setActiveModal("endSession");
  };

  // CHÚ THÍCH: Xác nhận Bắt đầu (Chuyển trạng thái cổng sang Busy)
  const handleConfirmStartSession = () => {
    if (!startSessionData.userId || !foundUserName) {
      alert("Vui lòng nhập ID người dùng hợp lệ.");
      return;
    }

    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.StationId === currentStationId) {
          const updatedChargers = station.chargers.map((charger) => {
            if (charger.ChargerId === currentChargerId) {
              const updatedPorts = charger.ports.map((port) => {
                if (port.PortId === currentPortId) {
                  return {
                    ...port,
                    Status: "Busy", // Chuyển sang bận
                    activeSession: true,
                    sessionData: {
                      carPlate: startSessionData.carPlate || "Unknown",
                      userName: foundUserName,
                      userId: startSessionData.userId,
                      startTime:
                        new Date().toLocaleTimeString("vi-VN") +
                        " " +
                        new Date().toLocaleDateString("vi-VN"),
                      // Dữ liệu giả lập cho session đang chạy
                      endTime: "Đang sạc", // Placeholder
                      duration: "N/A", // Placeholder
                      energy: "0.000", // Placeholder
                      cost: "0", // Placeholder
                    },
                  };
                }
                return port;
              });
              return { ...charger, ports: updatedPorts };
            }
            return charger;
          });
          return { ...station, chargers: updatedChargers };
        }
        return station;
      })
    );

    setActiveModal(null);
  };

  // CHÚ THÍCH: Xác nhận Tổng kết (Chuyển trạng thái cổng sang Available)
  const handleConfirmEndSession = () => {
    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.StationId === currentStationId) {
          const updatedChargers = station.chargers.map((charger) => {
            if (charger.ChargerId === currentChargerId) {
              const updatedPorts = charger.ports.map((port) => {
                if (port.PortId === currentPortId) {
                  return {
                    ...port,
                    Status: "Available", // Chuyển sang sẵn sàng
                    activeSession: false,
                  };
                }
                return port;
              });
              return { ...charger, ports: updatedPorts };
            }
            return charger;
          });
          return { ...station, chargers: updatedChargers };
        }
        return station;
      })
    );
    setActiveModal(null);
    setEndSessionData(null);
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
      (c) => String(c.ChargerId) === String(chargerId)
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

  // --- LOGIC CẬP NHẬT TRẠNG THÁI (Giữ nguyên) ---

  const handleAddStation = () => {
    if (!newStation.StationName || !newStation.Address) return;

    setStations((prevStations) => {
      const newStationId =
        prevStations.length > 0
          ? Math.max(...prevStations.map((s) => s.StationId)) + 1
          : 1;
      const newStationObj = {
        ...newStation,
        StationId: newStationId,
        Latitude: parseFloat(newStation.Latitude) || 0,
        Longitude: parseFloat(newStation.Longitude) || 0,
        chargers: [],
      };
      return [...prevStations, newStationObj];
    });

    setActiveModal(null);
  };

  const handleSaveEditStation = () => {
    if (!editingStation.StationName || !editingStation.StationId) return;

    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.StationId === editingStation.StationId) {
          return {
            ...station,
            ...editingStation,
            Latitude: parseFloat(editingStation.Latitude) || 0,
            Longitude: parseFloat(editingStation.Longitude) || 0,
          };
        }
        return station;
      })
    );
    setActiveModal(null);
  };

  const handleCreateCharger = () => {
    if (
      !newChargerData.Code ||
      !newChargerData.PowerKw ||
      currentStationId === null
    )
      return;

    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.StationId === currentStationId) {
          const newChargerId =
            station.chargers.length > 0
              ? Math.max(...station.chargers.map((c) => c.ChargerId)) + 1
              : 1;

          const newCharger = {
            ChargerId: newChargerId,
            StationId: currentStationId,
            Code: newChargerData.Code,
            Type: newChargerData.Type,
            PowerKw: parseFloat(newChargerData.PowerKw) || 0,
            InstalledAt: new Date().toISOString().split("T")[0],
            Status: newChargerData.Status,
            ports: [],
          };
          return { ...station, chargers: [...station.chargers, newCharger] };
        }
        return station;
      })
    );
    setActiveModal(null);
  };

  const handleSaveEditCharger = () => {
    if (!editingCharger.Code || !editingCharger.ChargerId) return;

    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.StationId === editingCharger.StationId) {
          const updatedChargers = station.chargers.map((charger) => {
            if (
              String(charger.ChargerId) === String(editingCharger.ChargerId)
            ) {
              return {
                ...charger,
                Code: editingCharger.Code,
                Type: editingCharger.Type,
                PowerKw: parseFloat(editingCharger.PowerKw) || 0,
                Status: editingCharger.Status,
              };
            }
            return charger;
          });
          return { ...station, chargers: updatedChargers };
        }
        return station;
      })
    );
    setActiveModal(null);
  };

  const handleCreatePort = () => {
    if (
      !newPortData.ConnectorType ||
      !newPortData.MaxPowerKw ||
      currentStationId === null ||
      currentChargerId === null
    )
      return;

    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.StationId === currentStationId) {
          const updatedChargers = station.chargers.map((charger) => {
            if (charger.ChargerId === currentChargerId) {
              const newPortId =
                charger.ports.length > 0
                  ? Math.max(...charger.ports.map((p) => p.PortId)) + 1
                  : 1;
              const newPort = {
                PortId: newPortId,
                ChargerId: currentChargerId,
                ConnectorType: newPortData.ConnectorType,
                Code: newPortData.Code || `P${newPortId}`,
                MaxPowerKw: parseFloat(newPortData.MaxPowerKw) || 0,
                Status: newPortData.Status,
                activeSession: false,
              };
              return { ...charger, ports: [...charger.ports, newPort] };
            }
            return charger;
          });
          return { ...station, chargers: updatedChargers };
        }
        return station;
      })
    );
    setActiveModal(null);
  };

  const handleSaveEditPort = () => {
    if (!editingPort.ConnectorType || !editingPort.PortId) return;

    setStations((prevStations) => {
      return prevStations.map((station) => {
        if (station.StationId === editingPort.StationId) {
          const updatedChargers = station.chargers.map((charger) => {
            if (charger.ChargerId === editingPort.ChargerId) {
              const updatedPorts = charger.ports.map((port) => {
                if (String(port.PortId) === String(editingPort.PortId)) {
                  return {
                    ...port,
                    ConnectorType: editingPort.ConnectorType,
                    MaxPowerKw: parseFloat(editingPort.MaxPowerKw) || 0,
                    Status: editingPort.Status,
                  };
                }
                return port;
              });
              return { ...charger, ports: updatedPorts };
            }
            return charger;
          });
          return { ...station, chargers: updatedChargers };
        }
        return station;
      });
    });
    setActiveModal(null);
  };

  const handleDeleteConfirm = () => {
    if (!targetId || !targetType) return;

    setStations((prevStations) => {
      if (targetType === "station") {
        return prevStations.filter((s) => s.StationId !== targetId);
      } else if (targetType === "charger") {
        return prevStations.map((station) => {
          if (
            station.chargers.some(
              (c) => String(c.ChargerId) === String(targetId)
            )
          ) {
            return {
              ...station,
              chargers: station.chargers.filter(
                (c) => String(c.ChargerId) !== String(targetId)
              ),
            };
          }
          return station;
        });
      } else if (targetType === "port") {
        return prevStations.map((station) => {
          const updatedChargers = station.chargers.map((charger) => {
            if (
              charger.ports.some((p) => String(p.PortId) === String(targetId))
            ) {
              return {
                ...charger,
                ports: charger.ports.filter(
                  (p) => String(p.PortId) !== String(targetId)
                ),
              };
            }
            return charger;
          });
          return { ...station, chargers: updatedChargers };
        });
      }
      return prevStations;
    });

    setActiveModal(null);
    setTargetId(null);
    setTargetType(null);
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
            Lắp đặt: {charger.InstalledAt.split(" ")[0]}
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
              <span className={`badge ${port.Status.toLowerCase()}`}>
                {/* Nếu Status là Available, hiển thị là "Online" */}
                {port.Status.toLowerCase() === "available"
                  ? "Online"
                  : port.Status.toLowerCase() === "maintenance"
                  ? "Bảo trì"
                  : "Đang bận"}
              </span>

              {/* LOGIC CẬP NHẬT CHO NÚT BẮT ĐẦU VÀ TỔNG KẾT */}
              {port.Status.toLowerCase() === "available" && (
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
              {port.Status.toLowerCase() === "busy" && (
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

  return (
    <div className="station-page">
      <h2 className="admin-title">Quản lý Trạm & Bộ sạc</h2>
      <div className="station-actions">
        <select
          className="input-field"
          value={statusFilter} // Liên kết với state
          onChange={handleStatusFilterChange} // Kích hoạt logic filter
          style={{ maxWidth: "150px" }}
        >
          <option value="All">Tất cả trạng thái</option>
          <option value="Active">Online</option>
          <option value="Offline">Offline</option>
        </select>
        {/* INPUT TÌM KIẾM THEO TÊN */}
        <input
          type="text"
          placeholder="Tìm kiếm trạm theo tên..."
          className="input-field"
          value={searchTerm} // Liên kết với state
          onChange={handleSearchInputChange} // Kích hoạt filter tên
        />
        <button className="btn primary" onClick={openAddStationModal}>
          <PlusOutlined /> Thêm trạm mới
        </button>
      </div>

      <div className="station-list">
        {filteredStations.map(
          (
            station // 👈 Đã thay thế 'stations' bằng 'filteredStations'
          ) => (
            <div className="station-card" key={station.StationId}>
              {station.ImageUrl && (
                <div className="station-image-container">
                  <img
                    src={station.ImageUrl}
                    alt={`Hình ảnh trạm sạc ${station.StationName}`}
                    style={{
                      width: "100%",
                      height: "200px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              )}
              <div className="station-header">
                <div>
                  <h3>{station.StationName}</h3>
                  <p>
                    {station.Address} - {station.City}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {/* HIỂN THỊ TRẠNG THÁI TRẠM */}
                  <span
                    className={`status-badge ${station.Status.toLowerCase()}`}
                  >
                    {/* Logic: Active hiển thị là "Online" */}
                    {station.Status === "Active" ? "Online" : "Offline"}
                  </span>
                  <button
                    className="icon-btn"
                    onClick={() => openEditStationModal(station.StationId)}
                  >
                    <EditOutlined />
                  </button>
                </div>
              </div>
              {station.chargers.length > 0 ? (
                renderChargers(station)
              ) : (
                <p
                  style={{
                    fontStyle: "italic",
                    color: "#888",
                    marginBottom: "16px",
                  }}
                >
                  Trạm này chưa có bộ sạc nào.
                </p>
              )}
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
          )
        )}

        {/* THÊM THÔNG BÁO NẾU KHÔNG CÓ KẾT QUẢ */}
        {filteredStations.length === 0 && (
          <p style={{ margin: "20px", color: "#888", fontStyle: "italic" }}>
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
                    onClick={() => setActiveModal(null)}
                    style={{
                      cursor: "pointer",
                      color: "#999",
                      fontSize: "12px",
                    }}
                  >
                    Đóng
                  </span>
                </div>
                <p style={{ marginBottom: "20px", color: "#ccc" }}>
                  Port ID: {currentPortId}
                </p>
                <input
                  type="text"
                  placeholder="Biển số xe (VD: 51A-123.45)"
                  name="carPlate"
                  value={startSessionData.carPlate}
                  onChange={handleStartSessionInputChange}
                  style={{ marginBottom: "10px" }}
                />

                {/* CHÚ THÍCH: Trường nhập ID người dùng */}
                <input
                  type="number"
                  placeholder="ID người dùng *"
                  name="userId"
                  value={startSessionData.userId}
                  onChange={handleStartSessionInputChange}
                  style={{ marginBottom: "10px" }}
                />

                {/* CHÚ THÍCH: Hiển thị tên người dùng tìm được */}
                {(foundUserName ||
                  (startSessionData.userId && !foundUserName)) && (
                  <p
                    style={{
                      color: foundUserName ? "#52c41a" : "#ff4d4f",
                      fontWeight: "bold",
                      padding: "5px 0",
                      borderBottom: "1px dotted #ccc",
                      fontSize: "14px",
                    }}
                  >
                    {foundUserName
                      ? `Tên người dùng: ${foundUserName}`
                      : "Không tìm thấy người dùng"}
                  </p>
                )}

                <div className="modal-actions" style={{ marginTop: "20px" }}>
                  <button className="btn" onClick={() => setActiveModal(null)}>
                    Hủy
                  </button>
                  <button
                    className="btn green"
                    onClick={handleConfirmStartSession}
                    // CHÚ THÍCH: Vô hiệu hóa nút nếu chưa tìm thấy tên hoặc chưa nhập ID
                    disabled={!startSessionData.userId || !foundUserName}
                  >
                    Bắt đầu
                  </button>
                </div>
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
                  <span
                    onClick={() => setActiveModal(null)}
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
                    Bắt đầu: **{endSessionData.startTime}**
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
                  >
                    Đóng
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
                  <option value="Active">Đang hoạt động</option>
                  <option value="Offline">Offline</option>
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
                  <option value="Active">Đang hoạt động</option>
                  <option value="Offline">Offline</option>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default StationPage;
