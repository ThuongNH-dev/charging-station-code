// src/components/station/StationList.jsx
import React from "react";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { normalizeStatus, isPortBusy } from "../../../../utils/stationUtils";

function ChargerBlock({
  station,
  charger,
  onEditCharger,
  onDeleteCharger,
  onDeletePort,
  onStart,
  onEnd,
  onEditPort,
  onAddPort,
}) {
  return (
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
        <h4>
          {charger.Code} ({charger.Type} - {charger.PowerKw}kW)
          <span
            className={`status-badge ${String(
              charger.Status || ""
            ).toLowerCase()}`}
            style={{ marginLeft: "10px" }}
          >
            {charger.Status === "Online"
              ? "🟢 Online"
              : charger.Status === "Maintenance"
              ? "🟠 Maintenance"
              : "⚫ Offline"}
          </span>
        </h4>
        <p style={{ fontSize: "0.8em", color: "#666" }}>
          Lắp đặt:{" "}
          {charger.InstalledAt?.split("T")[0] ||
            charger.InstalledAt?.split(" ")[0] ||
            "N/A"}
        </p>
        <div className="pole-actions">
          <button
            className="icon-btn"
            onClick={() => onEditCharger(station.StationId, charger.ChargerId)}
          >
            <EditOutlined />
          </button>
          <button
            className="icon-btn"
            onClick={() => onDeleteCharger(charger.ChargerId)}
          >
            <DeleteOutlined />
          </button>
        </div>
      </div>

      {charger.ports.map((port) => {
        // Chuẩn hoá cục bộ: gộp InUse/Charging/Busy => occupied
        const raw = normalizeStatus(port.Status); // "available" | "inuse" | "charging" | ...
        const s =
          raw === "inuse" || raw === "busy" || raw === "charging"
            ? "occupied"
            : raw; // giữ nguyên "available" | "reserved" | "disabled" | "occupied"

        const portLabel =
          s === "available"
            ? "🟢 AVAILABLE"
            : s === "reserved"
            ? "🟡 RESERVED"
            : s === "occupied"
            ? "🔴 OCCUPIED"
            : s === "disabled"
            ? "⚫ DISABLED"
            : (s || "UNKNOWN").toUpperCase();

        return (
          <div className="port-card" key={port.PortId}>
            <div className="port-details">
              <p>
                <strong>
                  {(port.ConnectorType || "").trim() || "N/A"} ({port.Code})
                </strong>
              </p>
              <p className="port-extra-info">
                Công suất tối đa: {port.MaxPowerKw}kW
              </p>
            </div>

            <div className="status-row">
              <span className={`badge ${s}`}>{portLabel}</span>

              {/* Chỉ AVAILABLE mới cho phép bắt đầu */}
              {s === "available" && (
                <button
                  className="btn small green"
                  onClick={() =>
                    onStart(port.PortId, station.StationId, charger.ChargerId)
                  }
                >
                  Bắt đầu
                </button>
              )}

              {/* Chỉ OCCUPIED mới cho phép dừng */}
              {s === "occupied" && (
                <button
                  className="btn small red"
                  onClick={() =>
                    onEnd(port.PortId, station.StationId, charger.ChargerId)
                  }
                >
                  Dừng
                </button>
              )}

              <button
                className="icon-btn"
                onClick={() => onEditPort(port.PortId)}
                title="Sửa cổng"
              >
                <EditOutlined />
              </button>
              <button
                className="icon-btn"
                onClick={() => onDeletePort(port.PortId)}
                title="Xóa cổng"
              >
                <DeleteOutlined />
              </button>
            </div>
          </div>
        );
      })}

      <button
        className="link-btn"
        onClick={() => onAddPort(station.StationId, charger.ChargerId)}
      >
        + Thêm cổng sạc
      </button>
    </div>
  );
}

export default function StationList({
  stations,
  onEditStation,
  onDeleteStation,
  onEditCharger,
  onDeleteCharger,
  onDeletePort,
  onAddCharger,
  onAddPort,
  onEditPort,
  onStart,
  onEnd,
}) {
  if (!Array.isArray(stations) || stations.length === 0) {
    return (
      <p className="no-stations">Không tìm thấy trạm nào khớp với bộ lọc.</p>
    );
  }

  return stations.map((station) => (
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

      {/* Header trạm */}
      <div className="station-header">
        <div>
          <h3>{station.StationName || "Tên trạm không xác định"}</h3>
          <p>
            {station.Address || "Địa chỉ không xác định"} -{" "}
            {station.City || "Thành phố không xác định"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className={`status-badge ${station.Status.toLowerCase()}`}>
            {station.Status === "Open"
              ? "🟢 Open"
              : station.Status === "Maintenance"
              ? "🟠 Maintenance"
              : "⚫ Closed"}
          </span>

          <button
            className="icon-btn"
            onClick={() => onEditStation(station.StationId)}
          >
            <EditOutlined />
          </button>
        </div>
      </div>

      {/* Bộ sạc */}
      {Array.isArray(station.chargers) && station.chargers.length > 0 ? (
        station.chargers.map((charger) => (
          <ChargerBlock
            key={String(charger.ChargerId)}
            station={station}
            charger={charger}
            onEditCharger={onEditCharger}
            onDeleteCharger={(id) => onDeleteCharger(id, "charger")}
            onDeletePort={(id) => onDeletePort(id, "port")}
            onStart={onStart}
            onEnd={onEnd}
            onEditPort={onEditPort}
            onAddPort={onAddPort}
          />
        ))
      ) : (
        <p className="no-chargers">Trạm này chưa có bộ sạc nào.</p>
      )}

      {/* Footer */}
      <div className="station-footer">
        <button
          className="btn secondary"
          onClick={() => onDeleteStation(station.StationId)}
        >
          Xóa trạm
        </button>
        <button
          className="btn primary"
          onClick={() => onAddCharger(station.StationId)}
        >
          Thêm bộ sạc
        </button>
      </div>
    </div>
  ));
}
