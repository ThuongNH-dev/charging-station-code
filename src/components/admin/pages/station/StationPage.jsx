import React, { useEffect, useMemo, useState } from "react";
import "../StationManagement.css";
import { Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import { stationApi } from "../../../../api/stationApi";
import FiltersBar from "./FiltersBar";
import AddEditStationModal from "./modals/AddEditStationModal";

function normalizeStation(s) {
  return {
    StationId: s.StationId ?? s.stationId,
    StationName: s.StationName ?? s.stationName ?? "Tên trạm",
    Address: s.Address ?? s.address ?? "Địa chỉ",
    City: s.City ?? s.city ?? "Thành phố",
    Status: s.Status ?? s.status ?? "Closed",
    ImageUrl: s.ImageUrl ?? s.imageUrl ?? "",
  };
}

export default function StationPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStation, setNewStation] = useState({
    StationName: "",
    Address: "",
    City: "",
    Latitude: "",
    Longitude: "",
    Status: "Open",
    ImageUrl: "",
  });
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const list = await stationApi.getAllStations();
      const safe = Array.isArray(list) ? list.map(normalizeStation) : [];
      setStations(safe);
    } catch (e) {
      console.error(e);
      message.error("Không tải được danh sách trạm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return stations.filter((s) => {
      const status = (s.Status ?? "").toString();
      const matchStatus =
        statusFilter === "All" ? true : status === statusFilter;
      const name = (s.StationName ?? "").toLowerCase();
      return matchStatus && name.includes(q);
    });
  }, [stations, statusFilter, searchTerm]);

  const openAdd = () => {
    setNewStation({
      StationName: "",
      Address: "",
      City: "",
      Latitude: "",
      Longitude: "",
      Status: "Open",
      ImageUrl: "",
    });
    setIsAddOpen(true);
  };

  const handleNewChange = (e) => {
    const { name, value } = e.target;
    setNewStation((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async () => {
    // ✅ Map sang camelCase đúng spec BE
    const payload = {
      stationName: newStation.StationName?.trim() || "",
      address: newStation.Address?.trim() || "",
      city: newStation.City?.trim() || "",
      latitude: Number(newStation.Latitude) || 0,
      longitude: Number(newStation.Longitude) || 0,
      status: newStation.Status || "Open",
      imageUrl: newStation.ImageUrl?.trim() || "",
    };

    if (!payload.stationName || !payload.address) {
      message.error("Vui lòng nhập Tên trạm và Địa chỉ");
      return;
    }
    try {
      await stationApi.createStation(payload);
      message.success("Đã thêm trạm!");
      setIsAddOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      message.error("Thêm trạm thất bại: " + e.message);
    }
  };

  return (
    <div className="station-page">
      <h2 className="admin-title">Trạm sạc</h2>

      <FiltersBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onAddStation={openAdd}
      />

      {loading ? (
        <div>Đang tải…</div>
      ) : (
        <div className="station-list">
          {filtered.length === 0 ? (
            <p className="no-stations">Không có trạm phù hợp.</p>
          ) : (
            filtered.map((s) => (
              <div
                className="station-card"
                key={s.StationId ?? String(Math.random())}
              >
                <div className="station-image-container">
                  <img
                    src={s.ImageUrl || "/placeholder.png"}
                    alt="Hình trạm"
                    className="station-img"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/placeholder.png";
                    }}
                  />
                </div>

                <div className="station-header">
                  <div>
                    <h3>{s.StationName}</h3>
                    <p>
                      {s.Address} - {s.City}
                    </p>
                  </div>
                  <span
                    className={`status-badge ${String(
                      s.Status || ""
                    ).toLowerCase()}`}
                  >
                    {s.Status === "Open"
                      ? "🟢 OPEN"
                      : s.Status === "Maintenance"
                      ? "🟠 MAINTENANCE"
                      : "⚫ CLOSED"}
                  </span>
                </div>

                <div
                  className="station-footer"
                  style={{ justifyContent: "flex-end" }}
                >
                  <Button
                    type="primary"
                    onClick={() => navigate(`/admin/stations/${s.StationId}`)}
                    disabled={!s.StationId}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AddEditStationModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        isEdit={false}
        data={newStation}
        onChange={handleNewChange}
        onSubmit={handleCreate}
      />
    </div>
  );
}
