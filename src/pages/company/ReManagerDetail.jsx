import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  Table, Tag, Space, Button, DatePicker, Pagination, Spin, Empty
} from "antd";
import dayjs from "dayjs";
import { getApiBase } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import MainLayout from "../../layouts/MainLayout";

const { RangePicker } = DatePicker;
const API_BASE = (getApiBase() || "").replace(/\/+$/, "");

function useAuthToken() {
  const { user } = useAuth();
  let token =
    user?.token ||
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
  return token;
}

function fmtMoneyVND(x) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "-";
  try {
    return Number(x).toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  } catch {
    return `${x}`;
  }
}

function fmtTime(s) {
  if (!s) return "-";
  const d = dayjs(s);
  return d.isValid() ? d.format("HH:mm:ss DD/MM/YYYY") : s;
}

function StatusTag({ status }) {
  const st = String(status || "").toLowerCase();
  const map = {
    completed: { color: "green", text: "Thành công" },
    pending: { color: "processing", text: "Đang xử lý" },
    failed: { color: "red", text: "Thất bại" },
    canceled: { color: "default", text: "Hủy" },
  };
  const v = map[st] || { color: "blue", text: status || "—" };
  return <Tag color={v.color}>{v.text}</Tag>;
}

export default function ReManagerDetail() {
  const token = useAuthToken();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { vehicleId: vehicleIdParam } = useParams();
  const vehicleId = Number(vehicleIdParam);

  const fromVehicle = state?.vehicle || null; // licensePlate, maker, model nếu có

  const [range, setRange] = useState([
    dayjs().subtract(30, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);

  const [loading, setLoading] = useState(false);
  const [rawItems, setRawItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function fetchSessions() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      // nếu BE hỗ trợ filter theo thời gian/vehicle, gửi luôn
      if (range?.[0]) qs.set("from", range[0].toISOString());
      if (range?.[1]) qs.set("to", range[1].toISOString());
      qs.set("vehicleId", String(vehicleId));

      const url = `${API_BASE}/ChargingSessions?${qs.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GET /ChargingSessions ${res.status}: ${text}`);
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      // Trường hợp BE chưa filter vehicleId: lọc client-side
      const filtered = items.filter((s) => Number(s?.vehicleId) === vehicleId);

      // Trường hợp BE không có filter thời gian: lọc client-side lần nữa
      const [start, end] = range || [];
      const filteredByTime = (start && end)
        ? filtered.filter((s) => {
            const t = dayjs(s?.endedAt || s?.startedAt);
            return t.isValid() ? (t.isAfter(start) && t.isBefore(end)) : true;
          })
        : filtered;

      // Sắp xếp mới nhất trước
      filteredByTime.sort((a, b) => dayjs(b?.endedAt || b?.startedAt) - dayjs(a?.endedAt || a?.startedAt));

      setRawItems(filteredByTime);
    } catch (e) {
      console.error(e);
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(vehicleId)) return;
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]); // fetch lần đầu

  const paged = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    return rawItems.slice(startIdx, startIdx + pageSize);
  }, [rawItems, page, pageSize]);

  const columns = [
    {
      title: "STT",
      dataIndex: "idx",
      width: 70,
      render: (_, __, i) => (page - 1) * pageSize + i + 1,
    },
    {
      title: "Ngày giao dịch",
      dataIndex: "endedAt",
      render: (_, r) => fmtTime(r?.endedAt || r?.startedAt),
      width: 190,
    },
    {
      title: "Số tiền",
      dataIndex: "total",
      align: "right",
      width: 140,
      render: (v) => <span style={{ color: "#d4380d" }}>{fmtMoneyVND(v)}</span>,
    },
    {
      title: "kWh",
      dataIndex: "kwh",
      align: "right",
      width: 90,
      // API chưa trả kWh -> hiển thị "-" (nếu sau này BE có, đổi ở đây)
      render: () => "-",
    },
    {
      title: "Nội dung",
      dataIndex: "content",
      ellipsis: true,
      render: (_, r) => `Sạc tại cổng #${r?.portId || "-"}`,
    },
    {
      title: "Địa điểm",
      dataIndex: "location",
      width: 110,
      // Nếu sau này có mapping port -> station -> city thì set ở đây
      render: () => "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (s) => <StatusTag status={s} />,
    },
    {
      title: "ID xe",
      dataIndex: "vehicleId",
      width: 90,
      render: (id) => <span>EV{id?.toString().padStart(3, "0")}</span>,
    },
    {
      title: "Biển số",
      dataIndex: "licensePlate",
      width: 130,
      render: () => fromVehicle?.licensePlate || "-",
    },
    {
      title: "Hãng xe",
      dataIndex: "brand",
      width: 150,
      render: () =>
        fromVehicle
          ? `${fromVehicle.carMaker || ""} ${fromVehicle.model || ""}`.trim()
          : "-",
    },
  ];

  if (!Number.isFinite(vehicleId)) {
    return (
      <MainLayout>
        <Empty description="Thiếu vehicleId" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="page vehicles" style={{ gap: 12 }}>
        <h2 style={{ marginBottom: 8 }}>Báo cáo sử dụng trụ sạc</h2>

        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <span style={{ fontWeight: 600 }}>Tìm Kiếm</span>
            <RangePicker
              value={range}
              onChange={(v) => setRange(v)}
              allowClear={false}
              format="DD/MM/YYYY"
            />
            <Button type="primary" onClick={() => { setPage(1); fetchSessions(); }}>
              Truy Vấn
            </Button>

            <span style={{ flex: 1 }} />

            <Button onClick={() => navigate(-1)}>Quay lại</Button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Spin />
            </div>
          ) : (
            <>
              <Table
                rowKey="chargingSessionId"
                dataSource={paged}
                columns={columns}
                pagination={false}
                scroll={{ x: 900 }}
              />
              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={rawItems.length}
                  onChange={(p, ps) => {
                    setPage(p);
                    setPageSize(ps);
                  }}
                  showSizeChanger
                  pageSizeOptions={["5", "10", "20", "50"]}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
