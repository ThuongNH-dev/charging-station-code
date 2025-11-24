// ✅ src/pages/admin/dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchDashboard,
  fetchAdminMonthlyOverview,
} from "../../../../api/dashboardApi";

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
  BarChart,
  Bar,
} from "recharts";

const Card = ({ title, value, sub }) => (
  <div className="db-card">
    <div className="db-card-title">{title}</div>
    <div className="db-card-value">{value}</div>
    {sub && <div className="db-card-sub">{sub}</div>}
  </div>
);

function getMonthRange(ym) {
  const [y, m] = ym.split("-").map((x) => Number(x));
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0).toISOString();
  const end = new Date(y, m, 0, 23, 59, 59, 999).toISOString();
  return { start, end };
}

// ======================= Tổng quan tháng Analytics =======================
const AdminMonthlyOverview = ({ summary, revenueSources, kpisSnapshot }) => {
  if (!summary) {
    return (
      <div style={{ padding: 16, color: "#6b7280", fontStyle: "italic" }}>
        Không có dữ liệu tổng quan tháng.
      </div>
    );
  }

  const {
    month,
    year,
    sessionCount = 0,
    energyKwh = 0,
    subtotal = 0,
    tax = 0,
    total = 0,
    durationMin = 0,
    idleMin = 0,
    avgPricePerKwh = 0,
  } = summary;

  // lấy snapshot KPI để hiển thị cùng hàng
  const openRate = kpisSnapshot?.usagePercent ?? 0;
  const stationsOnline = kpisSnapshot?.stationsOnline ?? 0;

  const customer = revenueSources?.customerTotal ?? 0;
  const company = revenueSources?.companyTotal ?? 0;
  const guest = revenueSources?.guestTotal ?? 0;
  const sumRev = customer + company + guest || 1;

  const mixRows = [
    { label: "Khách cá nhân", value: customer },
    { label: "Xe công ty", value: company },
    { label: "Khách vãng lai", value: guest },
  ];

  const chartData = [
    { source: "Khách cá nhân", value: customer },
    { source: "Xe công ty", value: company },
    { source: "Khách vãng lai", value: guest },
  ];

  return (
    <>
      <p style={{ marginBottom: 10, color: "#4b5563" }}>
        Tổng quan theo Analytics – Tháng{" "}
        <strong>
          {month}/{year}
        </strong>
      </p>

      {/* Hàng KPI chính – gộp luôn tỷ lệ mở trạm & số trạm online */}
      <div className="db-kpi-grid db-kpi-grid-small">
        <Card
          title="Doanh thu sau thuế"
          value={formatCurrency(total)}
          sub={`Trước thuế: ${formatCurrency(
            subtotal
          )} – Thuế: ${formatCurrency(tax)}`}
        />
        <Card
          title="Điện năng tiêu thụ"
          value={`${energyKwh.toLocaleString("vi-VN")} kWh`}
          sub={`Giá TB: ${avgPricePerKwh.toLocaleString("vi-VN")} ₫/kWh`}
        />
        <Card
          title="Số phiên sạc"
          value={sessionCount.toLocaleString("vi-VN")}
          sub={`Thời gian sạc: ${durationMin.toLocaleString(
            "vi-VN"
          )} phút – Idle: ${idleMin.toLocaleString("vi-VN")} phút`}
        />
        <Card
          title="Tỷ lệ trạm mở"
          value={`${openRate}%`}
          sub="Open/Total (snapshot)"
        />
        <Card
          title="Số trạm online"
          value={stationsOnline.toLocaleString("vi-VN")}
          sub="Trạng thái Open"
        />
      </div>

      {/* Biểu đồ cơ cấu nguồn doanh thu */}
      <div style={{ marginTop: 14, marginBottom: 10 }}>
        <h4 style={{ marginBottom: 6 }}>
          Biểu đồ cơ cấu nguồn doanh thu (tháng)
        </h4>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="source" />
              <YAxis />
              <Tooltip
                formatter={(v) => `${Number(v).toLocaleString("vi-VN")} ₫`}
                labelFormatter={(label) => `Nguồn: ${label}`}
              />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bảng cơ cấu nguồn doanh thu */}
      <div style={{ marginTop: 14 }}>
        <h4 style={{ marginBottom: 6 }}>Cơ cấu nguồn doanh thu (tháng)</h4>
        <table className="db-table">
          <thead>
            <tr>
              <th>Nguồn</th>
              <th>Doanh thu (₫)</th>
              <th>Tỷ lệ (%)</th>
            </tr>
          </thead>
          <tbody>
            {mixRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value.toLocaleString("vi-VN")}</td>
                <td>{((row.value / sumRev) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ======================= COMPONENT CHÍNH =======================
export default function Dashboard() {
  const defaultYm = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }, []);

  const [loading, setLoading] = useState(true);
  const [ym, setYm] = useState(defaultYm);
  const [kpis, setKpis] = useState(null);
  const [series, setSeries] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);

  // tải dữ liệu theo tháng
  const load = async (curYm) => {
    const { start, end } = getMonthRange(curYm);
    const [yearStr, monthStr] = curYm.split("-");
    const month = Number(monthStr);
    const year = Number(yearStr);

    try {
      setLoading(true);

      // gọi song song dashboard + analytics
      const [raw, overview] = await Promise.all([
        fetchDashboard({
          startDate: start,
          endDate: end,
        }),
        fetchAdminMonthlyOverview({ month, year }),
      ]);

      const processed = buildDashboardDataMonthly(raw, start, end);

      setKpis(processed.kpis);
      setSeries(processed.series);
      setAdminOverview(overview);
    } catch (e) {
      console.error("⚠️ Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(ym);
  }, [ym]);

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

      {/* === Bộ lọc (đồng nhất cho toàn bộ số liệu bên dưới) === */}
      <div className="db-filters">
        <div className="db-filter">
          <label>Tháng</label>
          <input
            type="month"
            value={ym}
            onChange={(e) => setYm(e.target.value)}
          />
        </div>

        <button
          className="db-refresh-btn"
          onClick={() => load(ym)}
          title="Tải lại"
        >
          Làm mới
        </button>
      </div>

      {/* === Tổng quan tháng (Analytics + KPI snapshot) === */}
      {adminOverview && (
        <div className="db-section" style={{ marginBottom: 20 }}>
          <AdminMonthlyOverview
            summary={adminOverview.summary}
            revenueSources={adminOverview.revenueSources}
            kpisSnapshot={kpis}
          />
        </div>
      )}

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
