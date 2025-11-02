import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  message,
  Table,
  Tag,
  Radio,
  Spin,
} from "antd";
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
  const [invoices, setInvoices] = useState([]);
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
      // 🔹 Lấy tất cả phiên sạc
      const resSess = await fetchAuthJSON(`${API_BASE}/ChargingSessions`);
      let sessions =
        resSess?.data ?? resSess?.$values ?? resSess?.items ?? resSess ?? [];
      if (!Array.isArray(sessions)) sessions = [sessions];

      // 🔹 Lấy danh sách xe để lấy biển số
      const resVeh = await fetchAuthJSON(`${API_BASE}/Vehicles`);
      let vehicles =
        resVeh?.data ?? resVeh?.$values ?? resVeh?.items ?? resVeh ?? [];
      if (!Array.isArray(vehicles)) vehicles = [vehicles];
      const vehicleMap = {};
      vehicles.forEach((v) => {
        vehicleMap[v.vehicleId || v.VehicleId] = v;
      });

      // 🔧 Lấy chi tiết từng phiên
      const sessionDetailed = await Promise.all(
        sessions.map(async (s) => {
          let full = s;
          try {
            const detail = await fetchAuthJSON(
              `${API_BASE}/ChargingSessions/${s.chargingSessionId || s.id}`
            );
            if (detail && typeof detail === "object") full = { ...s, ...detail };
          } catch {
            /* bỏ qua nếu lỗi */
          }
          return full;
        })
      );

      // 🔍 Lọc khách vãng lai (ko có customerId & companyId)
      const guest = sessionDetailed
        .map((s) => {
          const vid =
            s.vehicleId || s.VehicleId || s.vehicle?.vehicleId || null;
          const vehicle = vehicleMap[vid] || {};
          return {
            chargingSessionId:
              s.chargingSessionId || s.id || s.sessionId || null,
            status: s.status || "Unknown",
            energyKwh:
              s.energyKwh ?? s.EnergyKwh ?? s.measuredEnergy ?? 0,
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

      setGuestSessions(guest);

      // 🔹 Lấy hóa đơn khách vãng lai
      const resInv = await fetchAuthJSON(`${API_BASE}/Invoices`);
      let inv = resInv?.data ?? resInv?.$values ?? resInv?.items ?? resInv ?? [];
      if (!Array.isArray(inv)) inv = [inv];

      const guestInv = inv
        .filter(
          (i) =>
            (!i.customerId || i.customerId === 0) &&
            (!i.companyId || i.companyId === 0)
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );

      setInvoices(guestInv);
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
      // ✅ Return URL riêng cho Staff
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
      window.location.href = data.paymentUrl;

      // 🧾 Thêm bản ghi tạm vào danh sách hóa đơn đã thanh toán
      setInvoices((prev) => [
        {
          invoiceId: `TEMP-${Date.now()}`,
          sessionId: s.chargingSessionId,
          total: s.total ?? 0,
          method,
          createdAt: new Date().toISOString(),
          status: "PAID",
        },
        ...prev,
      ]);
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

  /* ======================= CỘT PHẢI ======================= */
  const invoiceCols = [
    {
      title: "Hóa đơn",
      dataIndex: "invoiceId",
      key: "invoiceId",
      render: (id) => (
        <strong>{id?.toString().startsWith("TEMP") ? "—" : `INV-${id}`}</strong>
      ),
    },
    {
      title: "Phiên",
      dataIndex: "sessionId",
      key: "sessionId",
      render: (id) => (id ? `S-${id}` : "—"),
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

      <div className="pay-right">
        <Card
          title="💰 Hóa đơn khách vãng lai đã thanh toán"
          bordered={false}
          className="pay-card"
        >
          <Table
            columns={invoiceCols}
            dataSource={invoices.map((i, idx) => ({
              ...i,
              key: i.invoiceId || idx,
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
