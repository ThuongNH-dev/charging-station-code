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

// 1. CẬP NHẬT IMPORT TỪ RECHARTS
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart, // Mới
  Pie, // Mới
  Cell, // Mới
  Legend, // Mới
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

// 2. KHAI BÁO MÀU SẮC CHO BIỂU ĐỒ TRÒN
// Tương ứng: [Xanh dương, Xanh lá, Cam]
const COLORS = ["#234C6A", "#6DC3BB", "#F2AEBB"];

// ======================= Tổng quan tháng Analytics =======================
const AdminMonthlyOverview = ({ summary, revenueSources, kpisSnapshot, subscriptionRevenue = 0 }) => {
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

  // Tính tổng doanh thu bao gồm cả subscription
  const chargingRevenue = total - subscriptionRevenue;
  const totalRevenue = total; // Đã được cộng subscription revenue trong API

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

      {/* KPI Cards giữ nguyên */}
      <div className="db-kpi-grid db-kpi-grid-small">
        <Card
          title="Tổng doanh thu"
          value={formatCurrency(totalRevenue)}
          sub={`Sạc điện: ${formatCurrency(chargingRevenue)} – Subscription: ${formatCurrency(subscriptionRevenue)}`}
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

      {/* 3. THAY THẾ KHỐI BIỂU ĐỒ CỘT BẰNG BIỂU ĐỒ DONUT */}
      <div style={{ marginTop: 14, marginBottom: 10 }}>
        <h4 style={{ marginBottom: 6 }}>
          Biểu đồ cơ cấu nguồn doanh thu (tháng)
        </h4>
        <div style={{ width: "100%", height: 300 }}>
          {" "}
          {/* Tăng chiều cao xíu cho đẹp */}
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50} // Tạo lỗ tròn ở giữa (Donut)
                outerRadius={85}
                paddingAngle={5} // Khoảng cách giữa các miếng
                dataKey="value"
                nameKey="source"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  `${Number(value).toLocaleString("vi-VN")} ₫`
                }
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => {
                  // Tùy chọn: hiển thị thêm % trong legend nếu muốn
                  const item = chartData.find((d) => d.source === value);
                  const percent = ((item.value / sumRev) * 100).toFixed(1);
                  return (
                    <span style={{ color: "#334155" }}>
                      {value} ({percent}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bảng dữ liệu nguồn doanh thu sạc điện */}
      <div style={{ marginTop: 14 }}>
        <h4 style={{ marginBottom: 6 }}>Cơ cấu doanh thu sạc điện (tháng)</h4>
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

      {/* Bảng tổng hợp doanh thu */}
      <div style={{ marginTop: 20 }}>
        <h4 style={{ marginBottom: 6 }}>Tổng hợp doanh thu (tháng)</h4>
        <table className="db-table">
          <thead>
            <tr>
              <th>Loại doanh thu</th>
              <th>Số tiền (₫)</th>
              <th>Tỷ lệ (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Doanh thu sạc điện</td>
              <td>{chargingRevenue.toLocaleString("vi-VN")}</td>
              <td>{((chargingRevenue / totalRevenue) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>Doanh thu Subscription Plans</td>
              <td>{subscriptionRevenue.toLocaleString("vi-VN")}</td>
              <td>{((subscriptionRevenue / totalRevenue) * 100).toFixed(1)}%</td>
            </tr>
            <tr style={{ fontWeight: 'bold', borderTop: '2px solid #ddd' }}>
              <td>Tổng doanh thu</td>
              <td>{totalRevenue.toLocaleString("vi-VN")}</td>
              <td>100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

// ... Phần còn lại của file (Dashboard component chính) giữ nguyên ...
export default function Dashboard() {
  // ... code cũ của bạn
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
            subscriptionRevenue={adminOverview.subscriptionRevenue || 0}
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
