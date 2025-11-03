// src/pages/staff/ReportPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { fetchAuthJSON } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./ReportPage.css";

export default function ReportPage() {
  const { user } = useAuth();
  const [stations, setStations] = useState([]);
  const [myStations, setMyStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [report, setReport] = useState({
    chargers: 0,
    active: 0,
    revenue: 0,
    incidents: 0,
    runningSessions: 0,
  });
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [timeFilter, setTimeFilter] = useState("7d");
  const [loading, setLoading] = useState(true);

  const currentAccountId = user?.accountId || localStorage.getItem("accountId");

  function toArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.items)) return raw.items;
    return [];
  }

  // === Lấy danh sách trạm nhân viên thuộc ===
  useEffect(() => {
    const loadStations = async () => {
      try {
        setLoading(true);
        const allStations = await fetchAuthJSON("/Stations");
        const stationsArr = toArray(allStations);
        const myStationIds = [];

        for (const st of stationsArr) {
          try {
            const res = await fetchAuthJSON(
              `/station-staffs?stationId=${st.stationId}`
            );
            const staffs = toArray(res);
            const found = staffs.some(
              (s) => String(s.staffId) === String(currentAccountId)
            );
            if (found) myStationIds.push(st.stationId);
          } catch {
            console.warn("Không lấy được staff của trạm:", st.stationId);
          }
        }

        const mine = stationsArr.filter((s) =>
          myStationIds.includes(s.stationId)
        );
        setStations(stationsArr);
        setMyStations(mine);
        if (mine.length > 0) setSelectedStationId(mine[0].stationId);
      } catch (err) {
        console.error("Lỗi khi tải danh sách trạm:", err);
      } finally {
        setLoading(false);
      }
    };
    loadStations();
  }, [currentAccountId]);

  // === Tải báo cáo chi tiết ===
  useEffect(() => {
    if (!selectedStationId) return;
    const loadReport = async () => {
      try {
        setLoading(true);
        const [chargersRes, sessionsRes, invoicesRes] = await Promise.all([
          fetchAuthJSON("/Chargers"),
          fetchAuthJSON("/ChargingSessions"),
          fetchAuthJSON("/Invoices"),
        ]);

        const chargers = toArray(chargersRes);
        const sessions = toArray(sessionsRes);
        const invoices = toArray(invoicesRes);

        const myChargers = chargers.filter(
          (c) => c.stationId === selectedStationId
        );
        const myChargerIds = myChargers.map((c) => c.chargerId || c.portId);

        const now = new Date();

        // === Lọc invoices theo trạm và thời gian ===
        const filteredInvoices = invoices.filter((inv) => {
          const invPorts =
            inv.chargingSessions?.map((s) => s.portId) || [inv.portId];
          const inStation = invPorts.some((id) =>
            myChargerIds.includes(id)
          );
          if (!inStation) return false;

          const d = new Date(inv.createdAt);
          if (timeFilter === "7d")
            return now - d <= 7 * 24 * 60 * 60 * 1000;
          if (timeFilter === "month")
            return (
              d.getMonth() === now.getMonth() &&
              d.getFullYear() === now.getFullYear()
            );
          return true;
        });

        // === Tổng doanh thu ===
        const totalRevenue = filteredInvoices.reduce(
          (sum, inv) => sum + (inv.total || 0),
          0
        );

        const runningSessions = sessions.filter(
          (s) =>
            ["charging", "running", "active"].includes(
              s.status?.toLowerCase?.() || ""
            ) && myChargerIds.includes(s.portId)
        ).length;

        const completedSessions = sessions.filter(
          (s) =>
            ["completed", "done"].includes(s.status?.toLowerCase?.() || "") &&
            myChargerIds.includes(s.portId)
        );

        // === Tính thời lượng (endedAt - startedAt) ===
        const formatDuration = (start, end) => {
          if (!start || !end) return "—";
          const diff = new Date(end) - new Date(start);
          if (diff <= 0) return "—";
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          return `${h}h ${m}m`;
        };

        // === Chuẩn bị lịch sử ===
        const sessionRows = completedSessions.map((s, i) => {
          const inv =
            invoices.find((x) => x.invoiceId === s.invoiceId) ||
            filteredInvoices.find((x) =>
              x.chargingSessions?.some(
                (cs) => cs.chargingSessionId === s.chargingSessionId
              )
            );
          return {
            session: `S-${s.chargingSessionId}`,
            charger: s.portId,
            customer: s.customerId || "—",
            duration: formatDuration(s.startedAt, s.endedAt),
            kWh: s.energyKwh || 0,
            cost: s.total || 0,
            invoice: inv
              ? inv.invoiceCode || `INV-${inv.invoiceId}`
              : s.invoiceId || "—",
          };
        });

        // === Biểu đồ doanh thu ===
        const daily = {};
        filteredInvoices.forEach((inv) => {
          const d = new Date(inv.createdAt);
          const key = d.toISOString().split("T")[0];
          daily[key] = (daily[key] || 0) + (inv.total || 0);
        });
        const chartArr = Object.entries(daily)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([date, revenue]) => ({ date, revenue }));

        // === Cập nhật state ===
        setReport({
          chargers: myChargers.length,
          active: myChargers.filter(
            (c) => ["online"].includes(c.status?.toLowerCase())
          ).length,
          revenue: totalRevenue,
          incidents: 0,
          runningSessions,
        });
        setChartData(chartArr);
        setHistory(sessionRows);
      } catch (err) {
        console.error("Lỗi khi tải báo cáo:", err);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [selectedStationId, timeFilter]);

  const currentStation = useMemo(
    () => myStations.find((s) => s.stationId === selectedStationId),
    [myStations, selectedStationId]
  );

  const exportCSV = () => {
    const header = "Phiên,Trụ,Khách,Thời lượng,kWh,Chi phí,Hóa đơn\n";
    const rows = history.map(
      (h) =>
        `${h.session},${h.charger},${h.customer},${h.duration},${h.kWh},${h.cost},${h.invoice}`
    );
    const blob = new Blob([header + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
  };

  if (loading)
    return (
      <div className="rep-wrap">
        <p>Đang tải dữ liệu...</p>
      </div>
    );

  return (
    <div className="rep-wrap">
      <h3>Báo cáo theo trạm</h3>

      {/* Bộ lọc */}
      <div className="rep-filters">
        {myStations.length > 1 && (
          <select
            value={selectedStationId || ""}
            onChange={(e) => setSelectedStationId(Number(e.target.value))}
          >
            {myStations.map((st) => (
              <option key={st.stationId} value={st.stationId}>
                {st.stationName}
              </option>
            ))}
          </select>
        )}
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="7d">7 ngày qua</option>
          <option value="month">Tháng này</option>
          <option value="all">Toàn thời gian</option>
        </select>
      </div>

      {currentStation && (
        <p className="rep-current-station">
          Trạm: <strong>{currentStation.stationName}</strong>
        </p>
      )}

      {/* Tổng quan */}
      <div className="rep-summary">
        <div className="rep-box">
          <p>Tổng trụ</p>
          <h2>{report.chargers}</h2>
        </div>
        <div className="rep-box">
          <p>Trụ hoạt động</p>
          <h2>{report.active}</h2>
        </div>
        <div className="rep-box">
          <p>Phiên đang chạy</p>
          <h2>{report.runningSessions}</h2>
        </div>
        <div className="rep-box">
          <p>Doanh thu</p>
          <h2>{report.revenue.toLocaleString("vi-VN")} đ</h2>
        </div>
      </div>

      {/* Biểu đồ */}
      <h3>Biểu đồ doanh thu theo thời gian</h3>
      {chartData.length === 0 ? (
        <p className="muted">Không có dữ liệu doanh thu trong giai đoạn này.</p>
      ) : (
        <div className="rep-chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(v) => `${v.toLocaleString("vi-VN")} đ`}
              />
              <Legend />
              <Bar dataKey="revenue" name="Doanh thu (VNĐ)" fill="#1677ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lịch sử */}
      <h3>Lịch sử phiên đã thanh toán</h3>
      <div className="rep-table">
        <table>
          <thead>
            <tr>
              <th>Phiên</th>
              <th>Trụ</th>
              <th>Khách</th>
              <th>Thời lượng</th>
              {/*<th>kWh</th>*/}
              <th>Chi phí</th>
              <th>Hóa đơn</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} className="center muted">
                  Chưa có phiên thanh toán.
                </td>
              </tr>
            ) : (
              history.map((h, i) => (
                <tr key={i}>
                  <td>{h.session}</td>
                  <td>{h.charger}</td>
                  <td>{h.customer}</td>
                  <td>{h.duration}</td>
                  {/*<td>{h.kWh}</tdt*/}
                  <td>{h.cost.toLocaleString("vi-VN")} đ</td>
                  <td>{h.invoice}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <button className="export" onClick={exportCSV}>
          ⭳ Xuất CSV
        </button>
      </div>
    </div>
  );
}
