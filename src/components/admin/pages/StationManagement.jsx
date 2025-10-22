import React, { useState } from "react";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import "./StationManagement.css";
// --- DỮ LIỆU MÔ PHỎNG (KHỚP CHÍNH XÁC VỚI DB) ---
const initialStations = [
  {
    StationId: 1,
    StationName: "VinFast Station Hanoi",
    Address: "123 Nguy?n V?n C?, Long Biên",
    City: "Hà Nội",
    Latitude: 21.037,
    Longitude: 105.836,
    Status: "Active", // Khớp: Status
    chargers: [
      // Cấp độ 2: Charger
      {
        ChargerId: 1, // Khớp: ChargerId
        StationId: 1, // Khớp: StationId
        Code: "C001", // Khớp: Code
        Type: "AC", // Khớp: Type
        PowerKw: 120.0, // Khớp: PowerKw (Tổng công suất trụ)
        InstalledAt: "2023-05-01 08:00:00.000",
        Status: "Online", // Khớp: Status
        ports: [
          // Cấp độ 3: Port
          {
            PortId: 1, // Khớp: PortId
            ChargerId: 1, // Khớp: ChargerId
            ConnectorType: "CCS2", // Khớp: ConnectorType
            MaxPowerKw: 120.0, // Khớp: MaxPowerKw (Công suất tối đa cổng)
            Code: "P001", // Khớp: Code
            Status: "Available", // Khớp: Status
            activeSession: false, // Giữ lại cho chức năng UI (Start/End Session)
          },
          {
            PortId: 2,
            ChargerId: 1,
            ConnectorType: "Type2",
            MaxPowerKw: 90.0,
            Code: "P002",
            Status: "Available",
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
        Status: "Online",
        ports: [
          {
            PortId: 3,
            ChargerId: 2,
            ConnectorType: "CCS2",
            MaxPowerKw: 60.0,
            Code: "P003",
            Status: "Available",
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
    Status: "Active",
    chargers: [],
  },
];

// Dữ liệu khởi tạo cho Modal (tối giản)
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
  PowerKw: "", // Bắt buộc phải có
  Status: "Online",
};

const newPortInitialState = {
  ConnectorType: "CCS2",
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

  // --- MODAL HANDLERS (Giữ nguyên logic mở modal) ---

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

  // --- LOGIC CẬP NHẬT TRẠNG THÁI (Đã chuẩn hóa ID và thuộc tính) ---

  // 1. Logic Thêm Trạm
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

  // 2. Logic Lưu Sửa Trạm
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

  // 3. Logic Thêm Bộ sạc
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

  // 4. Logic Lưu Sửa Bộ sạc
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

  // 5. Logic Thêm Cổng
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

  // 6. Logic Lưu Sửa Cổng
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

  // 7. Logic Xóa Chung
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
        <div className="pole-header">
          {/* Code, Type và PowerKw */}
          <h4>
            {charger.Code} ({charger.Type} - {charger.PowerKw}kW)
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
              {/* ConnectorType, Code và MaxPowerKw */}
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
              <span className={`badge ${port.Status.toLowerCase()}`}>
                {port.Status.toLowerCase() === "available"
                  ? "Sẵn sàng"
                  : port.Status.toLowerCase() === "maintenance"
                  ? "Bảo trì"
                  : "Đang bận"}
              </span>
              {/* Nút Session giữ lại cho chức năng UI */}
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
        {/* Nút và input tìm kiếm giữ nguyên */}
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

      <div className="station-list">
        {stations.map((station) => (
          <div className="station-card" key={station.StationId}>
            <div className="station-header">
              <div>
                <h3>{station.StationName}</h3>
                <p>
                  {station.Address} - {station.City}
                </p>
                <p style={{ fontSize: "0.8em", color: "#666" }}>
                  Lat: {station.Latitude} | Long: {station.Longitude}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  className={`status-badge ${station.Status.toLowerCase()}`}
                >
                  {station.Status === "Active" ? "Đang hoạt động" : "Offline"}
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
        ))}
      </div>
      {/* Modal hiển thị (Đã chuẩn hóa tên thuộc tính trong input) */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
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
                <input
                  type="text"
                  placeholder="Kiểu đầu sạc (CCS2, Type2) *"
                  name="ConnectorType"
                  value={newPortData.ConnectorType}
                  onChange={handleNewPortInputChange}
                />
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
                <input
                  type="text"
                  placeholder="Kiểu đầu sạc (CCS2, Type2) *"
                  name="ConnectorType"
                  value={editingPort.ConnectorType}
                  onChange={handleEditPortInputChange}
                />
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

            {/* Modal Xóa và Session giữ nguyên */}
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
            {activeModal === "startSession" && (
              <>
                <h3>Bắt đầu phiên sạc (Remote)</h3>
                <input type="text" placeholder="Biển số xe (VD: 51A-123.45)" />
                <input type="text" placeholder="Tên người dùng (tuỳ chọn)" />
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button
                    className="save green"
                    onClick={() => setActiveModal("endSession")}
                  >
                    Bắt đầu
                  </button>
                </div>
              </>
            )}
            {activeModal === "endSession" && (
              <>
                <h3>Tổng kết phiên sạc</h3>
                <p>Thông tin phiên sạc...</p>
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
