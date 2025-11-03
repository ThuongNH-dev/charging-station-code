// src/components/admin/pages/station/DetailFiltersBar.jsx
import React, { useEffect, useState, memo } from "react";
import { stationApi } from "../../../../api/stationApi";

function DetailFiltersBar({
  chargerStatus,
  setChargerStatus,
  portStatus,
  setPortStatus,
  connector,
  setConnector,
  powerMin,
  setPowerMin,
  powerMax,
  setPowerMax,
  searchCode,
  setSearchCode,
}) {
  const [connectorTypes, setConnectorTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [typesError, setTypesError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingTypes(true);
      setTypesError("");
      try {
        const list = await stationApi.getConnectorTypes();
        if (mounted) setConnectorTypes(Array.isArray(list) ? list : []);
      } catch (e) {
        if (mounted) {
          setConnectorTypes([]);
          setTypesError("Không tải được loại đầu nối");
        }
        console.warn("[DetailFiltersBar] getConnectorTypes failed:", e);
      } finally {
        if (mounted) setLoadingTypes(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="station-actions">
      {/* Trạng thái Trụ */}
      <select
        className="input-field"
        value={chargerStatus}
        onChange={(e) => setChargerStatus(e.target.value)}
        style={{ maxWidth: 180 }}
      >
        <option value="All">Tất cả trụ</option>
        <option value="Online">🟢 Online</option>
        <option value="Offline">⚫ Offline</option>
        <option value="Maintenance">🟠 Maintenance</option>
      </select>

      {/* Trạng thái Cổng */}
      <select
        className="input-field"
        value={portStatus}
        onChange={(e) => setPortStatus(e.target.value)}
        style={{ maxWidth: 190 }}
      >
        <option value="All">Tất cả cổng</option>
        <option value="available">🟢 Available</option>
        <option value="occupied">🔴 Occupied</option>
        <option value="reserved">🟡 Reserved</option>
        <option value="disabled">⚫ Disabled</option>
      </select>

      {/* Loại đầu nối (load từ BE) */}
      <select
        className="input-field"
        value={connector}
        onChange={(e) => setConnector(e.target.value)}
        style={{ maxWidth: 220 }}
        disabled={loadingTypes}
        title={typesError || (loadingTypes ? "Đang tải loại đầu nối..." : "")}
      >
        <option value="All">
          {loadingTypes ? "Đang tải loại đầu nối..." : "Mọi loại đầu nối"}
        </option>
        {connectorTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Công suất */}
      <input
        className="input-field"
        type="number"
        placeholder="kW từ…"
        value={powerMin}
        onChange={(e) => setPowerMin(e.target.value)}
        style={{ maxWidth: 120 }}
      />
      <input
        className="input-field"
        type="number"
        placeholder="đến…"
        value={powerMax}
        onChange={(e) => setPowerMax(e.target.value)}
        style={{ maxWidth: 120 }}
      />

      {/* Tìm theo mã trụ/cổng */}
      <input
        className="input-field"
        placeholder="Tìm theo mã (C001 / P01)..."
        value={searchCode}
        onChange={(e) => setSearchCode(e.target.value)}
      />
    </div>
  );
}

export default memo(DetailFiltersBar);
