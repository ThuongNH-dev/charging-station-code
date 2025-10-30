import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { DatePicker, Card, Statistic, Space, Tag, Spin, Empty, Button } from "antd";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../utils/api";
import { buildMonthlyStats } from "../../utils/billingStats";
import MainLayout from "../../layouts/MainLayout";
import "./MonthlyStats.css";

const API_BASE = (getApiBase() || "").replace(/\/+$/, "");

// ===== Helpers =====
function getAuthTokenAndCompanyId(authUser) {
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

  let companyId =
    authUser?.companyId ||
    Number(localStorage.getItem("companyId")) ||
    Number(sessionStorage.getItem("companyId")) ||
    null;

  return { token, companyId: Number.isFinite(companyId) ? companyId : null };
}

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const fmtKwh = (n) => `${(Number(n) || 0).toLocaleString("vi-VN")} kWh`;
const monthsLabel = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

function num(n){ return Number.isFinite(Number(n)) ? Number(n) : 0; }
function monthLabel(m, y){ return `Tháng ${String(m).padStart(2,"0")}/${y}`; }

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

function normalizeInvoiceStatus(s){
  const v = String(s || "").trim();
  if (v === "Paid") return "Paid";
  if (v === "Unpaid") return "Unpaid";
  if (v === "Pending") return "Pending";
  return v || "—";
}

export default function MonthlyStats() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { token, companyId } = getAuthTokenAndCompanyId(authUser);

  // ===== State report =====
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

  // Dữ liệu biểu đồ (giữ 12 tháng của năm — nếu cần có thể thay đổi theo yêu cầu)
  const chartData = useMemo(() => {
    return monthsLabel.map((label, i) => ({
      name: label,
      kwh: Number(kwhByMonth[i] || 0),
      spend: Number(spendByMonth[i] || 0),
    }));
  }, [kwhByMonth, spendByMonth]);

  async function fetchMonthlyStats() {
    if (!Number.isFinite(companyId)) return;
    setStatsLoading(true);
    try {
      // buildMonthlyStats trả về đủ 12 tháng; nếu backend hỗ trợ lọc theo năm,
      // bạn có thể truyền selectedYear tại đây (tùy API của bạn).
      const { spendByMonth, kwhByMonth } = await buildMonthlyStats(companyId);
      setSpendByMonth(spendByMonth);
      setKwhByMonth(kwhByMonth);
    } catch (e) {
      console.error("[MonthlyStats] error:", e);
      setSpendByMonth(Array(12).fill(0));
      setKwhByMonth(Array(12).fill(0));
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchInvoices() {
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

  useEffect(() => {
    fetchMonthlyStats();
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

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

        {!Number.isFinite(companyId) ? (
          <Empty description="Không tìm thấy companyId. Hãy đăng nhập lại." />
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
            </div>

            {/* Hoá đơn kì tới (ưu tiên tháng+năm đang chọn; nếu không có -> mới nhất) */}
            <div className="invoice-panel">
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <h3 className="section-title">Hoá đơn kì tới</h3>
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
                          <Tag color={tag.color}>{tag.label}</Tag>
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
              <Card>
                <div className="chart-title">kWh theo tháng</div>
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
            </div>

            {statsLoading && <div className="center-pad"><Spin /></div>}
          </>
        )}
      </div>
    </MainLayout>
  );
}
