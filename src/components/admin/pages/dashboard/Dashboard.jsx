import React, { useEffect, useState } from "react";
import { fetchDashboardToday } from "../../../../api/dashboardApi";
import {
  buildDashboardData,
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

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const raw = await fetchDashboardToday(); // <-- lấy từ DB qua BE
        const processed = buildDashboardData(raw); // <-- xử lý dữ liệu
        if (!alive) return;
        setKpis(processed.kpis);
        setSeries(processed.powerSeries);
      } catch (e) {
        console.error("⚠️ Dashboard load error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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

      <div className="db-kpi-grid">
        <Card
          title="Phiên sạc hôm nay"
          value={kpis.sessionsToday.toLocaleString("vi-VN")}
          sub="Hoàn tất"
        />
        <Card
          title="Doanh thu hôm nay"
          value={formatCurrency(kpis.revenueToday)}
          sub="Tổng tiền đã thu"
        />
        <Card
          title="Tỷ lệ sử dụng trạm"
          value={`${kpis.usagePercent}%`}
          sub="Ước lượng trung bình"
        />
        <Card
          title="Số trạm online"
          value={kpis.stationsOnline.toLocaleString("vi-VN")}
          sub="Trạng thái Open"
        />
      </div>

      <div className="db-section">
        <h3>Hoạt động sạc theo giờ trong ngày</h3>
        <div className="db-chart">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
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
