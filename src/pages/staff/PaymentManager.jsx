import React, { useEffect, useState } from "react";
import { Card, Button, message, Table, Tag, Radio, Spin } from "antd";
import {
  QrcodeOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "./PaymentManager.css";

const API_BASE = getApiBase();
const vnd = (n) =>
  !n && n !== 0 ? "—" : (Number(n) || 0).toLocaleString("vi-VN") + " ₫";

export default function PaymentManager() {
  const [guestSessions, setGuestSessions] = useState([]);
  const [paidSessions, setPaidSessions] = useState([]); // ✅ Chỉ chứa phiên đã thanh toán
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [method, setMethod] = useState("VNPAY");

  useEffect(() => {
    loadData();
  }, []);

  /* ======================= LOAD DỮ LIỆU ======================= */
  async function loadData() {
    setLoading(true);
    try {
      const resSess = await fetchAuthJSON(`${API_BASE}/ChargingSessions`);
      let sessions =
        resSess?.data ?? resSess?.$values ?? resSess?.items ?? resSess ?? [];
      if (!Array.isArray(sessions)) sessions = [sessions];

      const resVeh = await fetchAuthJSON(`${API_BASE}/Vehicles`);
      let vehicles =
        resVeh?.data ?? resVeh?.$values ?? resVeh?.items ?? resVeh ?? [];
      if (!Array.isArray(vehicles)) vehicles = [vehicles];
      const vehicleMap = {};
      vehicles.forEach((v) => {
        vehicleMap[v.vehicleId || v.VehicleId] = v;
      });

      const sessionDetailed = await Promise.all(
        sessions.map(async (s) => {
          let full = s;
          try {
            const detail = await fetchAuthJSON(
              `${API_BASE}/ChargingSessions/${s.chargingSessionId || s.id}`
            );
            if (detail && typeof detail === "object") full = { ...s, ...detail };
          } catch {}
          return full;
        })
      );

      // 🔍 Lọc khách vãng lai (ko có customerId & companyId)
      const guestAll = sessionDetailed
        .map((s) => {
          const vid =
            s.vehicleId || s.VehicleId || s.vehicle?.vehicleId || null;
          const vehicle = vehicleMap[vid] || {};
          return {
            chargingSessionId:
              s.chargingSessionId || s.id || s.sessionId || null,
            status: s.status || "Unknown",
            energyKwh: s.energyKwh ?? s.EnergyKwh ?? s.measuredEnergy ?? 0,
            total: s.total ?? s.Total ?? 0,
            portId: s.portId ?? s.PortId ?? null,
            customerId: s.customerId ?? s.CustomerId ?? 0,
            companyId: s.companyId ?? s.CompanyId ?? 0,
            licensePlate:
              s.licensePlate ??
              s.LicensePlate ??
              vehicle.licensePlate ??
              vehicle.LicensePlate ??
              "—",
            startedAt: s.startedAt ?? s.StartedAt ?? null,
            endedAt: s.endedAt ?? s.EndedAt ?? null,
          };
        })
        .filter(
          (x) =>
            (!x.customerId || x.customerId === 0) &&
            (!x.companyId || x.companyId === 0)
        )
        .sort(
          (a, b) =>
            new Date(b.startedAt || 0).getTime() -
            new Date(a.startedAt || 0).getTime()
        );

      // 🔹 Lấy các phiên đã thanh toán tạm (localStorage)
      const paidLocal =
        JSON.parse(localStorage.getItem("staff_paid_sessions") || "[]") || [];

      // 🔸 Loại bỏ các session đã thanh toán khỏi danh sách bên trái
      const unpaid = guestAll.filter(
        (s) => !paidLocal.some((p) => p.sessionId === s.chargingSessionId)
      );

      setGuestSessions(unpaid);
      setPaidSessions(paidLocal);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  }

  /* ======================= THANH TOÁN CHO GUEST ======================= */
  async function handlePay(s) {
    setPayingId(s.chargingSessionId);
    try {
      const returnUrl = `${window.location.origin}/staff/payment-success`;

      const res = await fetchAuthJSON(
        `${API_BASE}/Payment/create-for-guest-session?sessionId=${s.chargingSessionId}&returnUrl=${encodeURIComponent(
          returnUrl
        )}`,
        { method: "POST" }
      );

      const data = res?.data || res;
      if (!data?.paymentUrl)
        throw new Error("Không nhận được đường dẫn thanh toán!");

      message.success(`Đang mở thanh toán cho phiên #${s.chargingSessionId}`);
      window.open(data.paymentUrl, "_blank");

      // ✅ Thêm bản ghi tạm (đã thanh toán)
      const newPaid = {
        sessionId: s.chargingSessionId,
        total: s.total ?? 0,
        method,
        createdAt: new Date().toISOString(),
        status: "PAID",
      };

      // 🔹 Cập nhật localStorage
      const stored =
        JSON.parse(localStorage.getItem("staff_paid_sessions") || "[]") || [];
      stored.unshift(newPaid);
      localStorage.setItem("staff_paid_sessions", JSON.stringify(stored));

      // 🔄 Cập nhật UI
      setPaidSessions((prev) => [newPaid, ...prev]);
      setGuestSessions((prev) =>
        prev.filter((x) => x.chargingSessionId !== s.chargingSessionId)
      );
    } catch (err) {
      console.error(err);
      message.error(`❌ Lỗi khi tạo thanh toán: ${err.message}`);
    } finally {
      setPayingId(null);
    }
  }

  /* ======================= CỘT TRÁI ======================= */
  const sessionCols = [
    {
      title: "Phiên",
      dataIndex: "chargingSessionId",
      key: "id",
      render: (id) => <strong>{id ? `S-${id}` : "—"}</strong>,
    },
    {
      title: "Biển số",
      dataIndex: "licensePlate",
      render: (plate) => (
        <span>
          <CarOutlined /> {plate || "—"}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (st) =>
        (st || "").toLowerCase() === "charging" ? (
          <Tag color="blue">Đang sạc</Tag>
        ) : (
          <Tag color="green">Đã dừng</Tag>
        ),
    },
    {
      title: "kWh",
      dataIndex: "energyKwh",
      render: (k) => (k ? `${k.toFixed(2)}` : "—"),
    },
    {
      title: "Chi phí",
      dataIndex: "total",
      render: vnd,
    },
    {
      title: "Thao tác",
      key: "action",
      render: (record) => (
        <Button
          type="primary"
          size="small"
          loading={payingId === record.chargingSessionId}
          onClick={() => handlePay(record)}
        >
          Thanh toán
        </Button>
      ),
    },
  ];

  /* ======================= CỘT PHẢI (CHỈ PHIÊN ĐÃ THANH TOÁN) ======================= */
  const paidCols = [
    {
      title: "Phiên sạc",
      dataIndex: "sessionId",
      key: "sessionId",
      render: (id) => <strong>{id ? `S-${id}` : "—"}</strong>,
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      render: vnd,
    },
    {
      title: "Phương thức",
      dataIndex: "method",
      render: (m) => m || "VNPAY",
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      render: (t) =>
        t ? new Date(t).toLocaleString("vi-VN") : new Date().toLocaleString(),
    },
    {
      title: "TT",
      dataIndex: "status",
      render: (st) => (
        <Tag color={st === "PAID" ? "green" : "orange"}>
          {st === "PAID" ? "Đã thanh toán" : "Chưa"}
        </Tag>
      ),
    },
  ];

  /* ======================= HIỂN THỊ ======================= */
  return (
    <div className="pay-wrap two-column">
      {/* CỘT TRÁI - CHƯA THANH TOÁN */}
      <div className="pay-left">
        <Card
          title={
            <span>
              <ThunderboltOutlined /> Phiên sạc khách vãng lai
            </span>
          }
          bordered={false}
          className="pay-card"
        >
          <div style={{ marginBottom: 10 }}>
            <span>Phương thức thanh toán: </span>
            <Radio.Group
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <Radio.Button value="VNPAY">
                <QrcodeOutlined /> VNPay
              </Radio.Button>
              <Radio.Button value="CASH">
                <CreditCardOutlined /> Tiền mặt
              </Radio.Button>
            </Radio.Group>
          </div>

          {loading ? (
            <div className="center muted">
              <Spin /> Đang tải danh sách phiên...
            </div>
          ) : (
            <Table
              columns={sessionCols}
              dataSource={guestSessions.map((s) => ({
                ...s,
                key: s.chargingSessionId,
              }))}
              pagination={{ pageSize: 7 }}
              size="small"
              bordered
            />
          )}
        </Card>
      </div>

      {/* CỘT PHẢI - ĐÃ THANH TOÁN */}
      <div className="pay-right">
        <Card
          title="💰 Các phiên sạc đã thanh toán"
          bordered={false}
          className="pay-card"
        >
          <Table
            columns={paidCols}
            dataSource={paidSessions.map((i, idx) => ({
              ...i,
              key: i.sessionId || idx,
            }))}
            pagination={{ pageSize: 7 }}
            size="small"
            bordered
          />
        </Card>
      </div>
    </div>
  );
}
