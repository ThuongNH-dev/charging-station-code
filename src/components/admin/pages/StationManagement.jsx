import React, { useState, useEffect } from "react";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons"; // Giả định dùng Ant Design Icons
import "./StationManagement.css";

// Dữ liệu mô phỏng để khởi tạo state (đã chuẩn hóa theo DB)
const initialStations = [
  {
    id: 1,
    StationName: "VinFast Station Ha Noi",
    Address: "123 Nguy?n V?n Linh, C? Long Biên",
    City: "Hà Nội",
    Latitude: 21.037,
    Longitude: 105.836,
    total_power_kw: 150, // Giữ lại từ code cũ
    operating_hours: "06:00 - 23:00", // Giữ lại từ code cũ
    price_kwh: 3500, // Giữ lại từ code cũ
    Status: "Active",
    chargers: [
      // Đổi tên 'poles' thành 'chargers'
      {
        id: 1,
        Code: "C001", // Đổi pole_name -> Code
        Type: "AC",
        InstalledAt: "2023-05-01 08:00:00.000",
        ports: [
          {
            id: 1,
            description: "CCS2 - 120kW", // Giữ lại description
            ConnectorType: "CCS2",
            MaxPowerKw: 120, // Đổi peak_power_kw -> MaxPowerKw
            allocated_power_kw: 120, // Giữ lại
            Status: "Available", // Đổi port_status -> Status
            Code: "P001",
            activeSession: false,
          },
          {
            id: 2,
            description: "Type2 - 90kW",
            ConnectorType: "Type2",
            MaxPowerKw: 90,
            allocated_power_kw: 90,
            Status: "Available",
            Code: "P002",
            activeSession: true,
          },
        ],
      },
      {
        id: 2,
        Code: "C002",
        Type: "DC",
        InstalledAt: "2023-06-15 08:00:00.000",
        ports: [
          {
            id: 3,
            description: "CCS2 - 60kW",
            ConnectorType: "CCS2",
            MaxPowerKw: 60,
            allocated_power_kw: 60,
            Status: "Available",
            Code: "P003",
            activeSession: false,
          },
        ],
      },
    ],
  },
  {
    id: 2,
    StationName: "Tesla Station HCM",
    Address: "45 Lê Lợi, Quận 1",
    City: "TP.HCM",
    Latitude: 10.775,
    Longitude: 106.7,
    total_power_kw: 300,
    operating_hours: "24/7",
    price_kwh: 4000,
    Status: "Active",
    chargers: [],
  },
];

// Dữ liệu khởi tạo cho Modal (đã chuẩn hóa)
const newStationInitialState = {
  StationName: "",
  Address: "",
  City: "",
  total_power_kw: "",
  operating_hours: "",
  price_kwh: "",
  Status: "Active",
  Latitude: "",
  Longitude: "",
};

const newChargerInitialState = {
  Code: "", // Đổi pole_name -> Code
  Type: "DC", // Thêm Type
};

const newPortInitialState = {
  description: "",
  MaxPowerKw: "", // Đổi peak_power_kw -> MaxPowerKw
  allocated_power_kw: "",
  Status: "Available", // Đổi port_status -> Status
  ConnectorType: "CCS2",
  Code: "", // Thêm Code
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
  const [currentChargerId, setCurrentChargerId] = useState(null); // Đổi currentPoleId -> currentChargerId

  const [targetId, setTargetId] = useState(null);
  const [targetType, setTargetType] = useState(null); // station, charger, port

  // --- HANDLER CHUNG CHO INPUT ---

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

  // --- MODAL HANDLERS ---

  // Mở modal Thêm Cổng
  const openAddPortModal = (stationId, chargerId) => {
    setCurrentStationId(stationId);
    setCurrentChargerId(chargerId);
    setNewPortData(newPortInitialState);
    setActiveModal("addPort");
  };

  // Mở modal Thêm Trạm
  const openAddStationModal = () => {
    setNewStation(newStationInitialState);
    setActiveModal("addStation");
  };

  // Mở modal Thêm Trụ/Bộ sạc
  const openAddChargerModal = (stationId) => {
    // Đổi openAddPoleModal -> openAddChargerModal
    setCurrentStationId(stationId);
    setNewChargerData(newChargerInitialState);
    setActiveModal("addCharger");
  };

  // Mở modal Sửa Trạm
  const openEditStationModal = (stationId) => {
    const station = stations.find((s) => s.id === stationId);
    if (station) {
      setEditingStation(station);
      setActiveModal("editStation");
    }
  };

  // Mở modal Sửa Trụ/Bộ sạc
  const openEditChargerModal = (stationId, chargerId) => {
    // Đổi openEditPoleModal -> openEditChargerModal
    const station = stations.find((s) => s.id === stationId);
    const charger = station?.chargers.find(
      (c) => String(c.id) === String(chargerId)
    );
    if (charger) {
      setEditingCharger({ ...charger, stationId: stationId });
      setActiveModal("editCharger");
    }
  };

  // Mở modal Sửa Cổng
  const openEditPortModal = (portId) => {
    let portToEdit = null;
    let stationId, chargerId;

    // Tìm cổng sạc cần sửa (tìm lồng nhau)
    stations.forEach((station) => {
      station.chargers.forEach((charger) => {
        const foundPort = charger.ports.find(
          (p) => String(p.id) === String(portId)
        );
        if (foundPort) {
          portToEdit = foundPort;
          stationId = station.id;
          chargerId = charger.id;
        }
      });
    });

    if (portToEdit) {
      setEditingPort({ ...portToEdit, stationId, chargerId });
      setActiveModal("editPort");
    }
  };

  // Mở modal Xóa
  const openDeleteModal = (id, type) => {
    setTargetId(id);
    setTargetType(type);
    setActiveModal("deleteConfirm");
  };

  // --- LOGIC CẬP NHẬT TRẠNG THÁI ---

  // 1. Logic Thêm Trạm
  const handleAddStation = () => {
    if (!newStation.StationName || !newStation.Address) return;

    setStations((prevStations) => {
      const newStationId =
        prevStations.length > 0
          ? Math.max(...prevStations.map((s) => s.id)) + 1
          : 1;
      const newStationObj = {
        ...newStation,
        id: newStationId,
        total_power_kw: parseFloat(newStation.total_power_kw) || 0,
        price_kwh: parseFloat(newStation.price_kwh) || 0,
        Latitude: parseFloat(newStation.Latitude) || 0,
        Longitude: parseFloat(newStation.Longitude) || 0,
        chargers: [], // Khởi tạo mảng chargers rỗng
      };
      return [...prevStations, newStationObj];
    });

    setActiveModal(null);
  };

  // 2. Logic Lưu Sửa Trạm
  const handleSaveEditStation = () => {
    if (!editingStation.StationName || !editingStation.id) return;

    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.id === editingStation.id) {
          return {
            ...station,
            ...editingStation,
            total_power_kw: parseFloat(editingStation.total_power_kw) || 0,
            price_kwh: parseFloat(editingStation.price_kwh) || 0,
            Latitude: parseFloat(editingStation.Latitude) || 0,
            Longitude: parseFloat(editingStation.Longitude) || 0,
          };
        }
        return station;
      })
    );
    setActiveModal(null);
  };

  // 3. Logic Thêm Trụ/Bộ sạc
  const handleCreateCharger = () => {
    // Đổi handleCreatePole -> handleCreateCharger
    if (!newChargerData.Code || currentStationId === null) return;

    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.id === currentStationId) {
          const newChargerId =
            station.chargers.length > 0
              ? Math.max(...station.chargers.map((c) => c.id)) + 1
              : 1;

          const newCharger = {
            id: newChargerId,
            Code: newChargerData.Code,
            Type: newChargerData.Type,
            InstalledAt: new Date().toISOString().split("T")[0],
            ports: [],
          };
          return { ...station, chargers: [...station.chargers, newCharger] };
        }
        return station;
      })
    );
    setActiveModal(null);
  };

  // 4. Logic Lưu Sửa Trụ/Bộ sạc
  const handleSaveEditCharger = () => {
    // Đổi handleSaveEditPole -> handleSaveEditCharger
    if (!editingCharger.Code || !editingCharger.id) return;

    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.id === editingCharger.stationId) {
          const updatedChargers = station.chargers.map((charger) => {
            if (String(charger.id) === String(editingCharger.id)) {
              return {
                ...charger,
                Code: editingCharger.Code,
                Type: editingCharger.Type,
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

  // 5. Logic Thêm Cổng
  const handleCreatePort = () => {
    if (
      !newPortData.description ||
      !newPortData.MaxPowerKw ||
      currentStationId === null ||
      currentChargerId === null // Đổi currentPoleId -> currentChargerId
    )
      return;

    setStations((prevStations) =>
      prevStations.map((station) => {
        if (station.id === currentStationId) {
          const updatedChargers = station.chargers.map((charger) => {
            // Đổi poles -> chargers
            if (charger.id === currentChargerId) {
              // Đổi poleId -> chargerId
              const newPortId =
                charger.ports.length > 0
                  ? Math.max(...charger.ports.map((p) => p.id)) + 1
                  : 1;
              const newPort = {
                id: newPortId,
                description: newPortData.description,
                ConnectorType: newPortData.ConnectorType,
                Code: newPortData.Code || `P${newPortId}`,
                MaxPowerKw: parseFloat(newPortData.MaxPowerKw) || 0,
                allocated_power_kw:
                  parseFloat(newPortData.allocated_power_kw) ||
                  parseFloat(newPortData.MaxPowerKw) ||
                  0,
                Status: newPortData.Status, // Đổi port_status -> Status
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

  // 6. Logic Lưu Sửa Cổng
  const handleSaveEditPort = () => {
    if (!editingPort.description || !editingPort.id) return;

    setStations((prevStations) => {
      return prevStations.map((station) => {
        if (station.id === editingPort.stationId) {
          const updatedChargers = station.chargers.map((charger) => {
            // Đổi poles -> chargers
            if (charger.id === editingPort.chargerId) {
              // Đổi poleId -> chargerId
              const updatedPorts = charger.ports.map((port) => {
                if (String(port.id) === String(editingPort.id)) {
                  return {
                    ...port,
                    description: editingPort.description,
                    ConnectorType: editingPort.ConnectorType,
                    allocated_power_kw:
                      parseFloat(editingPort.allocated_power_kw) || 0,
                    Status: editingPort.Status, // Đổi port_status -> Status
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

  // 7. Logic Xóa Chung
  const handleDeleteConfirm = () => {
    if (!targetId || !targetType) return;

    setStations((prevStations) => {
      if (targetType === "station") {
        return prevStations.filter((s) => s.id !== targetId);
      } else if (targetType === "charger") {
        // Đổi "pole" -> "charger"
        return prevStations.map((station) => {
          if (station.chargers.some((c) => String(c.id) === String(targetId))) {
            return {
              ...station,
              chargers: station.chargers.filter(
                (c) => String(c.id) !== String(targetId)
              ),
            };
          }
          return station;
        });
      } else if (targetType === "port") {
        return prevStations.map((station) => {
          const updatedChargers = station.chargers.map((charger) => {
            // Đổi poles -> chargers
            if (charger.ports.some((p) => String(p.id) === String(targetId))) {
              return {
                ...charger,
                ports: charger.ports.filter(
                  (p) => String(p.id) !== String(targetId)
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

  // --- HÀM RENDER TRỤ/BỘ SẠC VÀ CỔNG SẠC ---
  const renderChargers = (
    station // Đổi renderPoles -> renderChargers
  ) =>
    station.chargers.map(
      (
        charger // Đổi station.poles -> station.chargers
      ) => (
        <div className="pole-section" key={String(charger.id)}>
          <div className="pole-header">
            {/* Hiển thị Code thay vì pole_name */}
            <h4>
              {charger.Code ? charger.Code : `Bộ sạc ${charger.id}`} (
              {charger.Type})
            </h4>
            <div className="pole-actions">
              <button
                className="icon-btn"
                onClick={() => openEditChargerModal(station.id, charger.id)} // Đổi openEditPoleModal -> openEditChargerModal
              >
                <EditOutlined />
              </button>
              <button
                className="icon-btn"
                onClick={() => openDeleteModal(charger.id, "charger")} // Đổi "pole" -> "charger"
              >
                <DeleteOutlined />
              </button>
            </div>
          </div>
          {charger.ports.map((port) => (
            <div className="port-card" key={port.id}>
              <div className="port-details">
                <p>
                  <strong>
                    {port.description} ({port.ConnectorType} - {port.Code})
                  </strong>
                </p>
                <p className="port-extra-info">
                  {/* Đổi peak_power_kw -> MaxPowerKw */}
                  Công suất tối đa: {port.MaxPowerKw}kW | Cấp phát:{" "}
                  {port.allocated_power_kw}kW
                </p>
              </div>
              <div className="status-row">
                {/* Đổi port_status -> Status */}
                <span className={`badge ${port.Status.toLowerCase()}`}>
                  {port.Status.toLowerCase() === "available"
                    ? "Sẵn sàng"
                    : port.Status.toLowerCase() === "maintenance"
                    ? "Bảo trì"
                    : "Đang bận"}
                </span>
                {port.activeSession ? (
                  <button
                    className="btn small red"
                    onClick={() => setActiveModal("endSession")}
                  >
                    Tổng kết
                  </button>
                ) : (
                  <button
                    className="btn small green"
                    onClick={() => setActiveModal("startSession")}
                  >
                    Bắt đầu
                  </button>
                )}
                <button
                  className="icon-btn"
                  onClick={() => openEditPortModal(port.id)}
                >
                  <EditOutlined />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => openDeleteModal(port.id, "port")}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
          ))}
          <button
            className="link-btn"
            onClick={() => openAddPortModal(station.id, charger.id)}
          >
            + Thêm cổng sạc
          </button>
        </div>
      )
    );

  return (
    <div className="station-page">
      <h2 className="admin-title">Quản lý Trạm & Bộ sạc</h2>
      <div className="station-actions">
        <select className="input-field">
          <option>Tất cả trạm</option>
        </select>
        <input
          type="text"
          placeholder="Tìm kiếm trạm..."
          className="input-field"
        />
        <button className="btn primary" onClick={openAddStationModal}>
          <PlusOutlined /> Thêm trạm mới
        </button>
      </div>
      {/* RENDER DANH SÁCH TRẠM */}
      <div className="station-list">
        {stations.map((station) => (
          <div className="station-card" key={station.id}>
            <div className="station-header">
              <div>
                {/* Đổi station.name -> station.StationName */}
                <h3>{station.StationName}</h3>
                <p>
                  {station.Address} - {station.City}
                </p>{" "}
                {/* Thêm City */}
                <p>
                  Công suất: {station.total_power_kw}kW | Giờ hoạt động:{" "}
                  {station.operating_hours} | Giá: {station.price_kwh}đ/kWh
                </p>
                <p style={{ fontSize: "0.8em", color: "#666" }}>
                  Lat: {station.Latitude} | Long: {station.Longitude}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                {/* Đổi station.status -> station.Status */}
                <span
                  className={`status-badge ${station.Status.toLowerCase()}`}
                >
                  {station.Status.toLowerCase() === "active"
                    ? "Đang hoạt động"
                    : station.Status.toLowerCase() === "offline"
                    ? "Offline"
                    : "Bảo trì"}
                </span>
                <button
                  className="icon-btn"
                  onClick={() => openEditStationModal(station.id)}
                >
                  <EditOutlined />
                </button>
              </div>
            </div>
            {station.chargers.length > 0 ? ( // Đổi poles -> chargers
              renderChargers(station) // Đổi renderPoles -> renderChargers
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
                onClick={() => openDeleteModal(station.id, "station")}
              >
                Xóa trạm
              </button>
              <button
                className="btn primary"
                onClick={() => openAddChargerModal(station.id)} // Đổi openAddPoleModal -> openAddChargerModal
              >
                Thêm bộ sạc
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Modal hiển thị */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Thêm Trạm */}
            {activeModal === "addStation" && (
              <>
                <h3>Thêm Trạm</h3>
                <input
                  type="text"
                  placeholder="Tên trạm *"
                  name="StationName" // Đã đổi
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
                  name="City" // Đã thêm
                  value={newStation.City}
                  onChange={handleNewStationInputChange}
                />
                <input
                  type="text"
                  placeholder="Tổng công suất (kW, tùy chọn)"
                  name="total_power_kw"
                  value={newStation.total_power_kw}
                  onChange={handleNewStationInputChange}
                />
                <input
                  type="text"
                  placeholder="Giờ hoạt động (vd: 06:00 - 23:00)"
                  name="operating_hours"
                  value={newStation.operating_hours}
                  onChange={handleNewStationInputChange}
                />
                <select
                  name="Status" // Đã đổi
                  value={newStation.Status}
                  onChange={handleNewStationInputChange}
                >
                  <option value="Active">Đang hoạt động</option>
                  <option value="Offline">Offline</option>
                  <option value="Maintenance">Bảo trì</option>
                </select>
                <input
                  type="number"
                  placeholder="Giá/kWh (vd: 3500)"
                  name="price_kwh"
                  value={newStation.price_kwh}
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
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleAddStation}>
                    Tạo
                  </button>
                </div>
              </>
            )}
            {/* Modal Sửa Trạm */}
            {activeModal === "editStation" && (
              <>
                <h3>Sửa Trạm (ID: {editingStation.id})</h3>
                <input
                  type="text"
                  placeholder="Tên trạm *"
                  name="StationName" // Đã đổi
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
                  name="City" // Đã thêm
                  value={editingStation.City}
                  onChange={handleEditStationInputChange}
                />
                <input
                  type="text"
                  placeholder="Tổng công suất (kW)"
                  name="total_power_kw"
                  value={editingStation.total_power_kw}
                  onChange={handleEditStationInputChange}
                />
                <input
                  type="text"
                  placeholder="Giờ hoạt động"
                  name="operating_hours"
                  value={editingStation.operating_hours}
                  onChange={handleEditStationInputChange}
                />
                <select
                  name="Status" // Đã đổi
                  value={editingStation.Status}
                  onChange={handleEditStationInputChange}
                >
                  <option value="Active">Đang hoạt động</option>
                  <option value="Offline">Offline</option>
                  <option value="Maintenance">Bảo trì</option>
                </select>
                <input
                  type="number"
                  placeholder="Giá/kWh"
                  name="price_kwh"
                  value={editingStation.price_kwh}
                  onChange={handleEditStationInputChange}
                />
                <input
                  type="number"
                  placeholder="Vĩ độ (Latitude)"
                  name="Latitude"
                  value={editingStation.Latitude}
                  onChange={handleEditStationInputChange}
                />
                <input
                  type="number"
                  placeholder="Kinh độ (Longitude)"
                  name="Longitude"
                  value={editingStation.Longitude}
                  onChange={handleEditStationInputChange}
                />
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleSaveEditStation}>
                    Lưu
                  </button>
                </div>
              </>
            )}
            {/* Modal Sửa Cổng (EDIT PORT) */}
            {activeModal === "editPort" && (
              <>
                <h3>Sửa Cổng (ID: {editingPort.id})</h3>
                <input
                  type="text"
                  placeholder="Mô tả cổng (vd: CCS - 50kW)"
                  name="description"
                  value={editingPort.description}
                  onChange={handleEditPortInputChange}
                />
                <input
                  type="text"
                  placeholder="Kiểu đầu sạc (CCS2, Type2, ...)"
                  name="ConnectorType"
                  value={editingPort.ConnectorType}
                  onChange={handleEditPortInputChange}
                />
                <p className="read-only-info">
                  **Công suất Tối đa (Peak): {editingPort.MaxPowerKw}kW** (Không
                  thể sửa)
                </p>
                <input
                  type="number"
                  placeholder="Công suất Cấp phát (kW, tùy chọn)"
                  name="allocated_power_kw"
                  value={editingPort.allocated_power_kw}
                  onChange={handleEditPortInputChange}
                />
                <select
                  name="Status" // Đã đổi
                  value={editingPort.Status} // Đã đổi
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
            {/* Modal Thêm Cổng Sạc */}
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
                <input
                  type="text"
                  placeholder="Mô tả (vd: CCS - 50kW) *"
                  name="description"
                  value={newPortData.description}
                  onChange={handleNewPortInputChange}
                />
                <input
                  type="text"
                  placeholder="Kiểu đầu sạc (CCS2, Type2, ...) *"
                  name="ConnectorType"
                  value={newPortData.ConnectorType}
                  onChange={handleNewPortInputChange}
                />
                <input
                  type="number"
                  placeholder="Công suất Tối đa (MaxPowerKw, kW) *"
                  name="MaxPowerKw" // Đã đổi
                  value={newPortData.MaxPowerKw}
                  onChange={handleNewPortInputChange}
                />
                <input
                  type="number"
                  placeholder="Công suất Cấp phát (kW, tùy chọn)"
                  name="allocated_power_kw"
                  value={newPortData.allocated_power_kw}
                  onChange={handleNewPortInputChange}
                />
                <select
                  name="Status" // Đã đổi
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
            {/* Modal Thêm Trụ/Bộ sạc */}
            {activeModal === "addCharger" && ( // Đổi "addPole" -> "addCharger"
              <>
                <h3>Thêm Bộ sạc (Trạm ID: {currentStationId})</h3>
                <input
                  type="text"
                  placeholder="Mã Bộ sạc (VD: C003) *"
                  name="Code" // Đổi pole_name -> Code
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
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleCreateCharger}>
                    Tạo
                  </button>
                </div>
              </>
            )}
            {/* Modal Xác nhận xoá (Chung) */}
            {activeModal === "deleteConfirm" && (
              <>
                <h3>
                  Xác nhận xoá{" "}
                  {targetType === "station"
                    ? "Trạm"
                    : targetType === "charger" // Đổi "pole" -> "charger"
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
            {/* Modal Sửa Trụ/Bộ sạc */}
            {activeModal === "editCharger" && ( // Đổi "editPole" -> "editCharger"
              <>
                <h3>Sửa Bộ sạc (ID: {editingCharger.id})</h3>
                <input
                  type="text"
                  name="Code" // Đổi pole_name -> Code
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
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save" onClick={handleSaveEditCharger}>
                    Lưu
                  </button>
                </div>
              </>
            )}
            {/* Các Modal khác (Start/End Session giữ nguyên) */}
            {activeModal === "startSession" && (
              <>
                <h3>Bắt đầu phiên sạc (Remote)</h3>
                <input type="text" placeholder="Biển số xe (VD: 51A-123.45)" />
                <input type="text" placeholder="Tên người dùng (tuỳ chọn)" />
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button
                    className="save green"
                    onClick={() =>
                      console.log("Bắt đầu phiên sạc") ||
                      setActiveModal("endSession")
                    }
                  >
                    Bắt đầu
                  </button>
                </div>
              </>
            )}
            {activeModal === "endSession" && (
              <>
                <h3>Tổng kết phiên sạc</h3>
                <p>Trạm: Q1-01 · Bộ sạc: C001 · Cổng: CCS2 - 22kW</p>
                <p>
                  Thời lượng: 5 phút | Năng lượng: 0.047 kWh | Chi phí: 329đ
                </p>
                <div className="modal-actions">
                  <button
                    className="save blue"
                    onClick={() => setActiveModal(null)}
                  >
                    Đóng
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
