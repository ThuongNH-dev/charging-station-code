import React, { useEffect, useState } from "react";
import { Card, Button, message, Table, Tag, Radio, Spin, Select } from "antd";
import {
  QrcodeOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import "./PaymentManager.css";

const API_BASE = getApiBase();
const vnd = (n) =>
  !n && n !== 0 ? "—" : (Number(n) || 0).toLocaleString("vi-VN") + " ₫";

function toArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.$values)) return raw.$values;
  if (typeof raw === "object") return [raw];
  try {
    return toArray(JSON.parse(raw));
  } catch {
    return [];
  }
}

export default function PaymentManager() {
  const { user } = useAuth();
  const currentAccountId = user?.accountId || localStorage.getItem("accountId");

  const [guestSessions, setGuestSessions] = useState([]);
  const [paidSessions, setPaidSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [method, setMethod] = useState("VNPAY");

  // ✅ Trạm Staff phụ trách
  const [stations, setStations] = useState([]);
  const [myStations, setMyStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);

  useEffect(() => {
    loadStations();
  }, []);

  async function loadStations() {
    try {
      const allStations = await fetchAuthJSON(`${API_BASE}/Stations`);
      const stationsArr = toArray(allStations);
      const myStationIds = [];

      for (const st of stationsArr) {
        try {
          const res = await fetchAuthJSON(`${API_BASE}/station-staffs?stationId=${st.stationId}`);
          const staffs = toArray(res);
          const found = staffs.some((s) => String(s.staffId) === String(currentAccountId));
          if (found) myStationIds.push(st.stationId);
        } catch {
          console.warn("Không lấy được staff của trạm:", st.stationId);
        }
      }

      const mine = stationsArr.filter((s) => myStationIds.includes(s.stationId));
      setStations(stationsArr);
      setMyStations(mine);
      if (mine.length > 0) setSelectedStationId(mine[0].stationId);
    } catch (err) {
      console.error("Lỗi khi tải danh sách trạm:", err);
    }
  }

  /* ======================= LOAD DỮ LIỆU ======================= */
  useEffect(() => {
    if (!selectedStationId) return;
    loadData();
  }, [selectedStationId]);

  async function loadData() {
    setLoading(true);
    try {
      const resSess = await fetchAuthJSON(`${API_BASE}/ChargingSessions`);
      let sessions =
        resSess?.data ?? resSess?.$values ?? resSess?.items ?? resSess ?? [];
      if (!Array.isArray(sessions)) sessions = [sessions];

      const resVeh = await fetchAuthJSON(`${API_BASE}/Vehicles`);
      const vehicles = toArray(resVeh);
      const vehicleMap = {};
      vehicles.forEach((v) => {
        vehicleMap[v.vehicleId || v.VehicleId] = v;
      });

      // ✅ Load Ports và Chargers để lọc theo station
      const ports = toArray(await fetchAuthJSON(`${API_BASE}/Ports`));
      const chargers = toArray(await fetchAuthJSON(`${API_BASE}/Chargers`));

      const portToCharger = {};
      const chargerToStation = {};
      ports.forEach((p) => (portToCharger[p.portId] = p.chargerId));
      chargers.forEach((c) => (chargerToStation[c.chargerId] = c.stationId));

      // 🔍 Lọc session chỉ thuộc trạm staff đang chọn
      sessions = sessions.filter((s) => {
        const portId = s.portId ?? s.PortId;
        const chargerId = portToCharger[portId];
        const stationId = chargerToStation[chargerId];
        return String(stationId) === String(selectedStationId);
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

      // 🔍 Lọc khách vãng lai
      const guestAll = sessionDetailed
        .map((s) => {
          const vid =
            s.vehicleId || s.VehicleId || s.vehicle?.vehicleId || null;
          const vehicle = vehicleMap[vid] || {};
          return {
            chargingSessionId: s.chargingSessionId || s.id || s.sessionId || null,
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
// 🔹 Lấy thông tin thanh toán thật từ API (chỉ cho các phiên vãng lai)
const paidSessionsArr = [];

for (const s of guestAll) {
  try {
    const res = await fetchAuthJSON(
      `${API_BASE}/PaymentCrud/by-session/${s.chargingSessionId}`
    );
    const payments = toArray(res?.data || res);
    if (payments.length > 0) {
      paidSessionsArr.push({
        ...payments[0], // dữ liệu thanh toán
        licensePlate: s.licensePlate, // thêm thông tin để hiển thị
      });
    }
  } catch (err) {
    console.warn("Không lấy được thanh toán cho session", s.chargingSessionId, err);
  }
}

// 🔸 Loại bỏ các session đã thanh toán khỏi danh sách chưa thanh toán
const unpaid = guestAll.filter(
  (s) => !paidSessionsArr.some((p) => String(p.chargingSessionId) === String(s.chargingSessionId))
);

setGuestSessions(unpaid);

// 🔹 Sắp xếp các phiên đã thanh toán theo thời gian mới nhất (paidAt giảm dần)
const sortedPaid = [...paidSessionsArr].sort(
  (a, b) =>
    new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime()
);

setPaidSessions(sortedPaid);


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
      const returnUrl = `${window.location.origin}/staff/payment-success?sessionId=${encodeURIComponent(
        s.chargingSessionId
      )}`;

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

      // Không thêm vào danh sách đã thanh toán ngay lập tức.
      // Chỉ khi trang /staff/payment-success xác nhận thành công mới ghi vào localStorage.
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
const paidCols = [
  {
    title: "Phiên sạc",
    dataIndex: "chargingSessionId",
    key: "chargingSessionId",
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
    title: "Tổng tiền",
    dataIndex: "amount",
    render: vnd,
  },
  {
    title: "Phương thức",
    dataIndex: "method",
  },
  {
    title: "Thời gian",
    dataIndex: "paidAt",
    render: (t) => (t ? new Date(t).toLocaleString("vi-VN") : "—"),
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    render: (st) => (
      <Tag color={st?.toLowerCase() === "success" ? "green" : "orange"}>
        {st?.toLowerCase() === "success" ? "Đã thanh toán" : st}
      </Tag>
    ),
  },
];


  /* ======================= HIỂN THỊ ======================= */
  return (
    <div className="pay-wrap two-column">
      <div className="station-header">
        <h3>Quản lý thanh toán khách vãng lai</h3>
        {myStations.length > 1 && (
          <Select
            value={selectedStationId}
            onChange={(v) => setSelectedStationId(v)}
            options={myStations.map((s) => ({
              value: s.stationId,
              label: s.stationName,
            }))}
            style={{ width: 240 }}
          />
        )}
      </div>

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
