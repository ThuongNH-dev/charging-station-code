import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { DatePicker, Card, Statistic, Space, Tag, Spin, Empty, Button, message } from "antd";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../utils/api";
// import { buildMonthlyStats } from "../../utils/billingStats";
import MainLayout from "../../layouts/MainLayout";
import "./MonthlyStats.css";
import { Cell } from "recharts";

const API_BASE = (getApiBase() || "").replace(/\/+$/, "");

// ===== Helpers =====
// 🔥 ADD: Analytics API for Company
async function apiSummary(token, month, year) {
  const params = new URLSearchParams({ month, year });
  const res = await fetch(`${API_BASE}/Analytics/summary?${params}`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Lỗi summary");
  return res.json();
}

async function apiRevenueSources(token, month, year) {
  const params = new URLSearchParams({ month, year });
  const res = await fetch(`${API_BASE}/Analytics/revenue-sources?${params}`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Lỗi revenue sources");
  return res.json();
}

async function apiBreakdownVehicle(token, month, year) {
  const params = new URLSearchParams({ month, year });
  const res = await fetch(`${API_BASE}/Analytics/breakdown/vehicle?${params}`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Lỗi breakdown vehicle");
  return res.json();
}

function getAuthTokenAndIds(authUser) {
  let token =
    authUser?.token ||
    (() => {
      try {
        const u = JSON.parse(
          localStorage.getItem("user") ||
          sessionStorage.getItem("user") ||
          "null"
        );
        return u?.token || null;
      } catch {
        return null;
      }
    })();
  // lấy role từ context hoặc storage
  const role =
    authUser?.role ||
    (() => {
      try {
        const u = JSON.parse(
          localStorage.getItem("user") ||
          sessionStorage.getItem("user") ||
          "null"
        );
        return u?.role || null;
      } catch {
        return null;
      }
    })();

  let companyId =
    authUser?.companyId ??
    Number(localStorage.getItem("companyId")) ??
    Number(sessionStorage.getItem("companyId")) ??
    null;

  let customerId =
    authUser?.customerId ??
    Number(localStorage.getItem("customerId")) ??
    Number(sessionStorage.getItem("customerId")) ??
    null;

  return {
    token,
    companyId: Number.isFinite(companyId) ? companyId : null,
    customerId: Number.isFinite(customerId) ? customerId : null,
    role,
  };
}

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const fmtKwh = (n) => `${(Number(n) || 0).toLocaleString("vi-VN")} kWh`;
const monthsLabel = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

function num(n) { return Number.isFinite(Number(n)) ? Number(n) : 0; }
function monthLabel(m, y) { return `Tháng ${String(m).padStart(2, "0")}/${y}`; }

function pickLatestInvoice(list = []) {
  if (!Array.isArray(list) || list.length === 0) return null;

  // Lấy hóa đơn mới nhất theo updatedAt -> createdAt -> (year,month) -> id
  const cmp = (a, b) => {
    const tuA = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tuB = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (tuA !== tuB) return tuB - tuA;

    const tcA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tcB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (tcA !== tcB) return tcB - tcA;

    const ymA = num(a?.billingYear) * 100 + num(a?.billingMonth);
    const ymB = num(b?.billingYear) * 100 + num(b?.billingMonth);
    if (ymA !== ymB) return ymB - ymA;

    const idA = num(a?.invoiceId);
    const idB = num(b?.invoiceId);
    return idB - idA;
  };

  let best = list[0];
  for (let i = 1; i < list.length; i++) {
    if (cmp(best, list[i]) > 0) best = list[i];
  }
  return best;
}

function normalizeInvoiceStatus(s) {
  const v = String(s || "").trim();
  if (v === "Paid") return "Paid";
  if (v === "Unpaid") return "Unpaid";
  if (v === "Pending") return "Pending";
  return v || "—";
}

export default function MonthlyStats() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { token, companyId, customerId, role } = getAuthTokenAndIds(authUser);

  // Tự xác định scope theo đăng nhập: role === 'Customer' -> là customer
  const isCustomer = String(role || "").toLowerCase() === "customer";
  // Chỉ có kWh khi thống kê theo công ty
  const hasKwh = !isCustomer;

  // ===== State report =====
// 🔥 ADD new states for Analytics
const [revenueSources, setRevenueSources] = useState(null);
const [vehicleBreakdown, setVehicleBreakdown] = useState([]);

  const [when, setWhen] = useState(dayjs());           // <-- tháng+năm đang chọn
  const [statsLoading, setStatsLoading] = useState(false);
  const [spendByMonth, setSpendByMonth] = useState(Array(12).fill(0));
  const [kwhByMonth, setKwhByMonth] = useState(Array(12).fill(0));

  // ===== Invoices (kì tới) =====
  const [allInvoices, setAllInvoices] = useState([]);  // giữ toàn bộ để lọc theo tháng/năm
  const [invLoading, setInvLoading] = useState(false);

  // Tháng/năm chọn
  const selectedYear = when.year();
  const selectedMonthIndex = when.month(); // 0-11

  // KPI theo đúng tháng được chọn
  const totalSpendSelected = spendByMonth[selectedMonthIndex] || 0;
  const totalKwhSelected = kwhByMonth[selectedMonthIndex] || 0;

  const colors = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc949",
  "#af7aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ab",
];

  // Dữ liệu biểu đồ (giữ 12 tháng của năm — nếu cần có thể thay đổi theo yêu cầu)
  const chartData = useMemo(() => {
    return monthsLabel.map((label, i) => {
      const base = {
        name: label,
        spend: Number(spendByMonth[i] || 0),
      };
      if (hasKwh) base.kwh = Number(kwhByMonth[i] || 0);
      return base;
    });
  }, [kwhByMonth, spendByMonth, hasKwh]);

  // Dữ liệu biểu đồ thay thế khi là Customer: đếm số hóa đơn theo trạng thái trong NĂM đang chọn
  const statusChartData = useMemo(() => {
    const agg = { Paid: 0, Unpaid: 0, Pending: 0, Other: 0 };
    for (const inv of allInvoices) {
      if (num(inv?.billingYear) !== selectedYear) continue;
      const st = normalizeInvoiceStatus(inv?.status);
      if (st === "Paid" || st === "Unpaid" || st === "Pending") agg[st] += 1;
      else agg.Other += 1;
    }
    return Object.entries(agg)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k, count: v }));
  }, [allInvoices, selectedYear]);


  // Gom spend theo tháng từ danh sách invoices (client-side)
  function buildSpendByMonthFromInvoices(invoices, year) {
    const out = Array(12).fill(0);
    if (!Array.isArray(invoices)) return out;
    for (const inv of invoices) {
      const y = num(inv?.billingYear);
      const m = num(inv?.billingMonth);
      const total = num(inv?.total);
      if (y === year && m >= 1 && m <= 12) {
        out[m - 1] += total;
      }
    }
    return out;
  }

  async function fetchInvoicesByCustomer(cid) {
    setInvLoading(true);
    try {
      if (!Number.isFinite(cid)) throw new Error("customerId không hợp lệ");
      const url = `${API_BASE}/Invoices/by-customer/${encodeURIComponent(cid)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GET /Invoices/by-customer ${res.status}: ${text}`);
      }
      const data = await res.json();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setAllInvoices(list);
      // Vì API customer không trả kWh → tự build spend theo tháng từ invoices
      const sbm = buildSpendByMonthFromInvoices(list, selectedYear);
      setSpendByMonth(sbm);
      setKwhByMonth(Array(12).fill(0)); // reset kWh
    } catch (e) {
      console.error("[Invoices by customer] fetch error:", e);
      message.error(e?.message || "Lỗi tải hoá đơn khách hàng");
      setAllInvoices([]);
      setSpendByMonth(Array(12).fill(0));
      setKwhByMonth(Array(12).fill(0));
    } finally {
      setInvLoading(false);
    }
  }


  // async function fetchMonthlyStats() {
  //   if (!Number.isFinite(companyId)) return;
  //   setStatsLoading(true);
  //   try {
  //     // buildMonthlyStats trả về đủ 12 tháng; nếu backend hỗ trợ lọc theo năm,
  //     // bạn có thể truyền selectedYear tại đây (tùy API của bạn).
  //     const { spendByMonth, kwhByMonth } = await buildMonthlyStats(companyId);
  //     setSpendByMonth(spendByMonth);
  //     setKwhByMonth(kwhByMonth);
  //   } catch (e) {
  //     console.error("[MonthlyStats] error:", e);
  //     setSpendByMonth(Array(12).fill(0));
  //     setKwhByMonth(Array(12).fill(0));
  //   } finally {
  //     setStatsLoading(false);
  //   }
  // }

  async function fetchInvoicesByCompany() {
    if (!Number.isFinite(companyId)) return;
    setInvLoading(true);
    try {
      const url = `${API_BASE}/Invoices/by-company/${encodeURIComponent(companyId)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GET /Invoices/by-company ${res.status}: ${text}`);
      }
      const data = await res.json();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setAllInvoices(list);
    } catch (e) {
      console.error("[Invoices] fetch error:", e);
      setAllInvoices([]);
    } finally {
      setInvLoading(false);
    }
  }

  // Tính danh sách invoice hiển thị theo tháng+năm đang chọn (fallback mới nhất)
  const invoices = useMemo(() => {
    if (!allInvoices.length) return [];
    const matched = allInvoices.filter(
      (inv) =>
        num(inv?.billingYear) === selectedYear &&
        num(inv?.billingMonth) === selectedMonthIndex + 1
    );
    if (matched.length) {
      const latestInSelected = pickLatestInvoice(matched);
      return latestInSelected ? [latestInSelected] : [];
    }
    // Không có hóa đơn đúng tháng/năm -> fallback invoice mới nhất toàn bộ
    const latestOverall = pickLatestInvoice(allInvoices);
    return latestOverall ? [latestOverall] : [];
  }, [allInvoices, selectedYear, selectedMonthIndex]);

  // Invoices trong THÁNG đang chọn (áp dụng cho KPI Customer)
  const invoicesInSelectedMonth = useMemo(() => {
    return allInvoices.filter(
      (inv) =>
        num(inv?.billingYear) === selectedYear &&
        num(inv?.billingMonth) === selectedMonthIndex + 1
    );
  }, [allInvoices, selectedYear, selectedMonthIndex]);

  const invoiceCountSelected = invoicesInSelectedMonth.length;
  const unpaidCountSelected = useMemo(
    () => invoicesInSelectedMonth.filter(
      (inv) => normalizeInvoiceStatus(inv?.status) === "Unpaid"
    ).length,
    [invoicesInSelectedMonth]
  );

async function fetchFullYearStats(token, year) {
  const spendArr = Array(12).fill(0);
  const kwhArr = Array(12).fill(0);

  // Gọi đủ 12 tháng
  for (let m = 1; m <= 12; m++) {
    try {
      const summary = await apiSummary(token, m, year);
      spendArr[m - 1] = summary.total ?? 0;
      kwhArr[m - 1] = summary.energyKwh ?? 0;
    } catch (err) {
      console.warn(`Không có dữ liệu tháng ${m}/${year}`);
    }
  }

  setSpendByMonth(spendArr);
  setKwhByMonth(kwhArr);
}

  useEffect(() => {
    if (isCustomer) {
      // Thống kê theo chính customer đang đăng nhập
      if (Number.isFinite(customerId)) {
        fetchInvoicesByCustomer(customerId); // build spendByMonth từ invoices
      } else {
        setAllInvoices([]);
        setSpendByMonth(Array(12).fill(0));
        setKwhByMonth(Array(12).fill(0));
      }
// 🔥 REPLACE THIS BLOCK for COMPANY analytics
} else {
  if (Number.isFinite(companyId)) {

    const m = selectedMonthIndex + 1;
    const y = selectedYear;

setStatsLoading(true);

Promise.all([
  apiRevenueSources(token, m, y),
  apiBreakdownVehicle(token, m, y)
])
.then(async ([sources, vehicles]) => {

  // 🔥 Load FULL YEAR data cho 2 biểu đồ
  await fetchFullYearStats(token, selectedYear);

  setRevenueSources(
    sources?.data ?? sources?.items ?? sources ?? null
  );

  setVehicleBreakdown(
    vehicles?.data ?? vehicles?.items ?? vehicles ?? []
  );
})
.catch(err => {
  console.error(err);
  message.error("Lỗi tải thống kê công ty");
})
.finally(() => {
  setStatsLoading(false);
});

// giữ invoice
fetchInvoicesByCompany();
  } else {
    setAllInvoices([]);
    setSpendByMonth(Array(12).fill(0));
    setKwhByMonth(Array(12).fill(0));
  }
}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, customerId, isCustomer, selectedYear, selectedMonthIndex]);

  return (
    <MainLayout>
      <div className="page monthly">
        <div className="monthly-head">
          <h2>Thống kê theo tháng</h2>
          <div className="monthly-toolbar">
            <DatePicker
              picker="month"                   // <-- đổi sang chọn THÁNG + NĂM
              value={when}
              onChange={(d) => {
                setWhen(d || dayjs());
                // Nếu API hỗ trợ lọc theo năm khi build stats, có thể gọi lại fetch kèm tham số ở đây.
              }}
            />
          </div>
        </div>

        {(isCustomer && !Number.isFinite(customerId)) ? (
          <Empty description="Không tìm thấy customerId. Vui lòng đăng nhập lại." />
        ) : (!isCustomer && !Number.isFinite(companyId)) ? (
          <Empty description="Không tìm thấy companyId. Vui lòng đăng nhập lại." />

        ) : (
          <>
            {/* KPI 2 ô cùng hàng theo tháng đang chọn */}
            <div className="kpi-grid">
              <Card className="kpi-card" bodyStyle={{ padding: 16 }}>
                <div className="kpi-row">
                  <div>
                    <div className="kpi-label">Tổng giá trị chi tiêu</div>
                    <div className="kpi-value">{fmtMoney(totalSpendSelected)}</div>
                  </div>
                  <Tag>
                    {monthLabel(selectedMonthIndex + 1, selectedYear)}
                  </Tag>
                </div>
              </Card>

              {!hasKwh && (
                <Card className="kpi-card" bodyStyle={{ padding: 16 }}>
                  <div className="kpi-row">
                    <div>
                      <div className="kpi-label">Số hóa đơn trong tháng</div>
                      <div className="kpi-value">{invoiceCountSelected.toLocaleString("vi-VN")}</div>
                    </div>
                    <Tag>
                      {monthLabel(selectedMonthIndex + 1, selectedYear)}
                    </Tag>
                  </div>
                  {/* dòng phụ: Unpaid trong tháng */}
                  <div style={{ marginTop: 8 }}>
                    <Tag color="red">Unpaid: {unpaidCountSelected}</Tag>
                  </div>
                </Card>
              )}
              {hasKwh && (
                <Card className="kpi-card" bodyStyle={{ padding: 16 }}>
                  <div className="kpi-row">
                    <div>
                      <div className="kpi-label">Tổng chỉ số sử dụng</div>
                      <div className="kpi-value">{fmtKwh(totalKwhSelected)}</div>
                    </div>
                    <Tag>
                      {monthLabel(selectedMonthIndex + 1, selectedYear)}
                    </Tag>
                  </div>
                </Card>
              )}
            </div>

            {/* Hoá đơn kì tới (ưu tiên tháng+năm đang chọn; nếu không có -> mới nhất) */}
            <div className="invoice-panel">
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <h3 className="section-title">
                  {isCustomer ? "Hoá đơn của khách hàng" : "Hoá đơn kì tới"}
                </h3>
              </Space>

              {invLoading ? (
                <div className="center-pad"><Spin /></div>
              ) : invoices.length === 0 ? (
                <Empty description="Chưa có hoá đơn" />
              ) : (
                <div className="invoice-grid">
                  {invoices.map((inv) => {
                    const st = normalizeInvoiceStatus(inv.status);
                    const tag =
                      st === "Paid" ? { color: "green", label: "Paid" }
                        : st === "Unpaid" ? { color: "red", label: "Unpaid" }
                          : { color: "orange", label: st.toUpperCase() };

                    return (
                      <Card
                        key={inv.invoiceId}
                        hoverable
                        onClick={() => navigate(`/invoiceDetail/${inv.invoiceId}`)}
                        className="invoice-card"
                        bodyStyle={{ padding: 16 }}
                      >
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                          <strong>{monthLabel(inv.billingMonth, inv.billingYear)}</strong>
                          <Space>
                            {inv?.subscriptionPlan && (
                              <Tag>{inv.subscriptionPlan}</Tag>
                            )}
                            <Tag color={tag.color}>{tag.label}</Tag>
                          </Space>
                        </Space>
                        <div style={{ marginTop: 8 }}>
                          <Statistic title="Tổng tiền" value={fmtMoney(inv.total)} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Button
                            type="link"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoiceDetail/${inv.invoiceId}`);
                            }}
                          >
                            Xem chi tiết
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Charts (12 tháng trong năm đang dùng stats) */}
            <div className="charts-grid">
              {hasKwh && (
                <Card>
                  <div className="chart-title">Biểu đồ năng lượng sử dụng</div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RTooltip formatter={(v) => fmtKwh(v)} />
                        <Legend />
                        <Bar dataKey="kwh" name="kWh" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {!hasKwh && (
                <Card>
                  <div className="chart-title">Hóa đơn theo trạng thái (năm {selectedYear})</div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <RTooltip formatter={(v) => `${v} hóa đơn`} />
                        <Legend />
                        <Bar dataKey="count" name="Số hóa đơn" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              <Card>
                <div className="chart-title">Biểu đồ khoản chi</div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RTooltip formatter={(v) => fmtMoney(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="spend" name="Khoản chi" dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* ================= VEHICLE BREAKDOWN SECTION ================= */}
              <div className="vehicle-section">
                <Card>
                  <div className="chart-title">Thống kê theo phương tiện (Tháng)</div>

                  {/* Biểu đồ tổng tiền theo xe */}
                  <div className="chart-wrap" style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vehicleBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="licensePlate" />
                        <YAxis />
                        <RTooltip formatter={(v) => fmtMoney(v)} />
                        <Legend />
                        <Bar dataKey="total" name="Tổng chi tiêu">
                          {vehicleBreakdown.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={colors[index % colors.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bảng chi tiết xe */}
                  <h4 style={{ marginTop: 24, marginBottom: 12 }}>Chi tiết theo xe</h4>

                  <table className="vehicle-table">
                    <thead>
                      <tr>
                        <th>Biển số</th>
                        <th>Loại xe</th>
                        <th>Số phiên</th>
                        <th>kWh</th>
                        <th>Tổng tiền</th>
                        <th>Phút sạc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!vehicleBreakdown || vehicleBreakdown.length === 0) && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center" }}>Không có dữ liệu</td>
                        </tr>
                      )}

                      {vehicleBreakdown?.map((v) => (
                        <tr key={v.vehicleId}>
                          <td>{v.licensePlate}</td>
                          <td>{v.vehicleType}</td>
                          <td>{v.sessionCount}</td>
                          <td>{v.energyKwh.toLocaleString("vi-VN")}</td>
                          <td>{fmtMoney(v.total)}</td>
                          <td>{v.durationMin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            </div>

            {statsLoading && <div className="center-pad"><Spin /></div>}
          </>
        )}
      </div>
    </MainLayout>
  );
}
