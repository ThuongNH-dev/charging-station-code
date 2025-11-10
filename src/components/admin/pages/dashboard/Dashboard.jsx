// ✅ src/pages/admin/dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchDashboard } from "../../../../api/dashboardApi";
import {
  buildDashboardDataMonthly,
  formatCurrency,
} from "../../../../utils/dashboardProcessing";
import "./Dashboard.css";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const Card = ({ title, value, sub }) => (
  <div className="db-card">
    <div className="db-card-title">{title}</div>
    <div className="db-card-value">{value}</div>
    {sub && <div className="db-card-sub">{sub}</div>}
  </div>
);

function getMonthRange(ym) {
  // ym = "2025-11"
  const [y, m] = ym.split("-").map((x) => Number(x));
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0).toISOString();
  const end = new Date(y, m, 0, 23, 59, 59, 999).toISOString(); // last day of month
  return { start, end };
}

export default function Dashboard() {
  // mặc định: tháng hiện tại
  const defaultYm = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }, []);

  const [loading, setLoading] = useState(true);
  const [ym, setYm] = useState(defaultYm); // YYYY-MM
  const [stationId, setStationId] = useState("all"); // lọc trạm
  const [kpis, setKpis] = useState(null);
  const [series, setSeries] = useState([]);
  const [stations, setStations] = useState([]);

  const load = async (curYm, curStation) => {
    const { start, end } = getMonthRange(curYm);
    try {
      setLoading(true);
      const raw = await fetchDashboard({
        startDate: start,
        endDate: end,
        stationId: curStation,
      });
      const processed = buildDashboardDataMonthly(raw, start, end);
      setKpis(processed.kpis);
      setSeries(processed.series);
      setStations(processed.stations);
    } catch (e) {
      console.error("⚠️ Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(ym, stationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym, stationId]);

  if (loading || !kpis) {
    return (
      <div className="db-page">
        <h2 className="db-title">Dashboard</h2>
        <div className="db-loading">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="db-page">
      <h2 className="db-title">Dashboard</h2>

      {/* === Bộ lọc === */}
      <div className="db-filters">
        <div className="db-filter">
          <label>Tháng</label>
          <input
            type="month"
            value={ym}
            onChange={(e) => setYm(e.target.value)}
          />
        </div>

        <div className="db-filter">
          <label>Trạm</label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
          >
            <option value="all">Tất cả trạm</option>
            {stations.map((s) => (
              <option
                key={s.stationId ?? s.StationId ?? s.id}
                value={s.stationId ?? s.StationId ?? s.id}
              >
                {s.name ??
                  s.Name ??
                  `Station #${s.stationId ?? s.StationId ?? s.id}`}
              </option>
            ))}
          </select>
        </div>

        <button
          className="db-refresh-btn"
          onClick={() => load(ym, stationId)}
          title="Tải lại"
        >
          Làm mới
        </button>
      </div>

      {/* === KPIs theo tháng === */}
      <div className="db-kpi-grid">
        <Card
          title="Phiên sạc trong tháng"
          value={kpis.sessionsMonth.toLocaleString("vi-VN")}
          sub="Hoàn tất"
        />
        <Card
          title="Doanh thu trong tháng"
          value={formatCurrency(kpis.revenueMonth)}
          sub="Tổng tiền đã thu"
        />
        <Card
          title="Tỷ lệ trạm mở"
          value={`${kpis.usagePercent}%`}
          sub="Open/Total (snapshot)"
        />
        <Card
          title="Số trạm online"
          value={kpis.stationsOnline.toLocaleString("vi-VN")}
          sub="Trạng thái Open"
        />
      </div>

      {/* === Biểu đồ theo ngày trong tháng === */}
      <div className="db-section">
        <h3>Hoạt động sạc theo ngày trong tháng</h3>
        <div className="db-chart">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(v) => `${Number(v)} phiên`} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4285F4"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
