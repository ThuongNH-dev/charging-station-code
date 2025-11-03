import React, { useEffect, useMemo, useState } from "react";
import "../StationManagement.css";
import { Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import { stationApi } from "../../../../api/stationApi";

function normalizeStation(s) {
  return {
    StationId: s.StationId ?? s.stationId,
    StationName: s.StationName ?? s.stationName ?? "Tên trạm",
    Address: s.Address ?? s.address ?? "Địa chỉ",
    City: s.City ?? s.city ?? "Thành phố",
    Status: s.Status ?? s.status ?? "Closed",
    ImageUrl: s.ImageUrl ?? s.imageUrl ?? null,
  };
}

export default function StationPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All"); // All | Open | Closed
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const list = await stationApi.getAllStations();
        const safe = Array.isArray(list) ? list.map(normalizeStation) : [];
        setStations(safe);
      } catch (e) {
        console.error(e);
        message.error("Không tải được danh sách trạm");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return stations.filter((s) => {
      const status = (s.Status ?? "").toString();
      // chỉ lọc Open/Closed nếu người dùng chọn, còn lại giữ nguyên
      const matchStatus =
        statusFilter === "All" ? true : status === statusFilter;
      const name = (s.StationName ?? "").toLowerCase();
      return matchStatus && name.includes(q);
    });
  }, [stations, statusFilter, searchTerm]);

  return (
    <div className="station-page">
      <h2 className="admin-title">Trạm sạc</h2>

      {/* thanh filter đơn giản */}
      <div className="station-actions">
        <select
          className="input-field"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: 160 }}
        >
          <option value="All">Tất cả trạng thái</option>
          <option value="Open">🟢 Open</option>
          <option value="Closed">⚫ Closed</option>
          <option value="Maintenance">🟠 Maintenance</option>
        </select>

        <input
          type="text"
          className="input-field"
          placeholder="Tìm theo tên trạm…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

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
                {/* Ảnh */}
                <div className="station-image-container">
                  <img
                    src={s.ImageUrl || "/placeholder.png"}
                    alt="Hình trạm"
                    className="station-img"
                    onError={(e) => {
                      e.currentTarget.onerror = null; // tránh loop
                      e.currentTarget.src = "/placeholder.png";
                    }}
                  />
                </div>

                {/* Header */}
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

                {/* Footer: chỉ có Xem chi tiết */}
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
    </div>
  );
}
