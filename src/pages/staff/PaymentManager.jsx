import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  message,
  Input,
  Select,
  Tag,
  Card,
  Modal,
  Descriptions,
  Divider,
} from "antd";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import {
  SearchOutlined,
  CheckOutlined,
  DownloadOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import "./PaymentManager.css";

const API_BASE = getApiBase();
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " ₫";

export default function PaymentManager() {
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [paidTransactions, setPaidTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Unpaid");

  // Modal hiển thị chi tiết hóa đơn
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  // 🔹 Lấy danh sách hóa đơn
  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await fetchAuthJSON(`${API_BASE}/Invoices`);
      let data = res?.data ?? res?.$values ?? res ?? [];
      if (!Array.isArray(data)) data = [data];
      data = data.filter((inv) => inv && inv.invoiceId);

      // sắp xếp theo thời gian mới nhất
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setInvoices(data);
      setFiltered(data);

      // Tạo danh sách giao dịch đã thanh toán
      const paidList = data
        .filter((inv) => (inv.status || "").toLowerCase() === "paid")
        .map((inv) => ({
          invoiceId: inv.invoiceId,
          customerId: inv.customerId,
          companyId: inv.companyId,
          total: inv.total,
          method: "BANK_TRANSFER",
          time:
            inv.updatedAt ||
            inv.paidAt ||
            new Date().toISOString(),
          status: "PAID",
        }));
      setPaidTransactions(paidList);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải danh sách hóa đơn!");
    } finally {
      setLoading(false);
    }
  }

  // 🔍 Lọc hóa đơn theo tìm kiếm + trạng thái
  useEffect(() => {
    const list = invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceId?.toString().includes(search) ||
        inv.customerId?.toString().includes(search) ||
        inv.companyId?.toString().includes(search);
      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Paid" &&
          (inv.status || "").toLowerCase() === "paid") ||
        (statusFilter === "Unpaid" &&
          (inv.status || "").toLowerCase() !== "paid");
      return matchSearch && matchStatus;
    });
    setFiltered(list);
  }, [search, statusFilter, invoices]);

  // ✅ Đánh dấu nhiều hóa đơn là “Đã thanh toán”
  async function handleMarkPaid() {
    if (selectedRowKeys.length === 0)
      return message.warning("Vui lòng chọn ít nhất 1 hóa đơn!");

    try {
      const promises = selectedRowKeys.map((id) =>
        fetchAuthJSON(`${API_BASE}/Invoices/status`, {
          method: "PUT",
          body: JSON.stringify({ invoiceId: id, status: "Paid" }),
        })
      );
      await Promise.all(promises);

      const newPaid = selectedRowKeys.map((id) => {
        const inv = invoices.find(
          (i) => i.invoiceId === id || i.id === id
        );
        return {
          invoiceId: inv.invoiceId,
          customerId: inv.customerId,
          companyId: inv.companyId,
          total: inv.total,
          method: "BULK_SETTLEMENT",
          time: new Date().toISOString(),
          status: "PAID",
        };
      });

      setPaidTransactions((prev) => [...prev, ...newPaid]);
      message.success(
        `Đã ghi nhận thanh toán cho ${selectedRowKeys.length} hóa đơn.`
      );
      setSelectedRowKeys([]);
      await loadInvoices();
    } catch (err) {
      console.error(err);
      message.error("Không thể cập nhật trạng thái hóa đơn!");
    }
  }

  // 💾 Xuất file CSV tổng hợp
  function exportCSV() {
    const header =
      "Mã HĐ,Khách hàng,Công ty,Tổng tiền,Trạng thái,Ngày tạo\n";
    const rows = filtered.map(
      (inv) =>
        `${inv.invoiceId},${inv.customerId || "N/A"},${inv.companyId || "N/A"},${
          inv.total || 0
        },${inv.status || "UNPAID"},${new Date(inv.createdAt).toLocaleString("vi-VN")}`
    );
    const blob = new Blob([header + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  // 🔎 Xem chi tiết hóa đơn
  async function handleViewDetail(invoiceId) {
    try {
      const res = await fetchAuthJSON(`${API_BASE}/Invoices/${invoiceId}`);
      const data = res?.data || res;
      setModalData(data);
      setModalOpen(true);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải chi tiết hóa đơn!");
    }
  }

  // ⚙️ Cấu hình bảng hóa đơn
  const columns = [
    {
      title: "Mã HĐ",
      dataIndex: "invoiceId",
      key: "invoiceId",
      render: (id) => <strong>INV-{id}</strong>,
    },
    {
      title: "Khách hàng / Công ty",
      render: (t) =>
        t.companyId ? (
          <span>🏢 Company #{t.companyId}</span>
        ) : (
          <span>👤 Customer #{t.customerId}</span>
        ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      render: vnd,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (t) => (t ? new Date(t).toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (st) =>
        (st || "").toLowerCase() === "paid" ? (
          <Tag color="green">Đã thanh toán</Tag>
        ) : (
          <Tag color="orange">Chưa thanh toán</Tag>
        ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Button
          size="small"
          icon={<FileSearchOutlined />}
          onClick={() => handleViewDetail(record.invoiceId)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  const rowSelection = { selectedRowKeys, onChange: setSelectedRowKeys };

  return (
    <div className="pay-wrap two-column">
      {/* BÊN TRÁI - Danh sách hóa đơn */}
      <div className="pay-left">
        <Card
          title="📋 Hóa đơn trả sau"
          bordered={false}
          className="pay-card"
        >
          <div className="filters">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm mã HĐ hoặc khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 240 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 160 }}
              options={[
                { label: "Tất cả", value: "All" },
                { label: "Chưa thanh toán", value: "Unpaid" },
                { label: "Đã thanh toán", value: "Paid" },
              ]}
            />
          </div>

          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={filtered.map((inv) => ({
              ...inv,
              key: inv.invoiceId,
            }))}
            loading={loading}
            pagination={{ pageSize: 8 }}
            bordered
            size="middle"
          />

          <div className="action-row">
            <Button
              type="primary"
              icon={<CheckOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={handleMarkPaid}
            >
              Ghi nhận thanh toán
            </Button>
            <Button icon={<DownloadOutlined />} onClick={exportCSV}>
              Xuất CSV
            </Button>
          </div>
        </Card>
      </div>

      {/* BÊN PHẢI - Danh sách giao dịch */}
      <div className="pay-right">
        <Card
          title="💰 Giao dịch đã thanh toán"
          bordered={false}
          className="pay-card"
        >
          <Table
            columns={[
              { title: "HĐ", dataIndex: "invoiceId", key: "invoiceId", render: (id) => `INV-${id}` },
              { title: "Khách", dataIndex: "customerId", key: "customerId", render: (id) => `CUST-${id || "N/A"}` },
              { title: "Công ty", dataIndex: "companyId", key: "companyId", render: (id) => id ? `CMP-${id}` : "—" },
              { title: "Số tiền", dataIndex: "total", key: "total", render: vnd },
              { title: "PTTT", dataIndex: "method", key: "method" },
              { title: "Thời gian", dataIndex: "time", key: "time", render: (t) => new Date(t).toLocaleString("vi-VN") },
              { title: "TT", dataIndex: "status", key: "status", render: () => <Tag color="green">PAID</Tag> },
            ]}
            dataSource={paidTransactions.map((t, i) => ({ ...t, key: i }))}
            pagination={{ pageSize: 6 }}
            size="small"
          />
        </Card>
      </div>

      {/* 🧾 Modal Chi Tiết Hóa Đơn */}
      <Modal
        title={`Chi tiết hóa đơn #INV-${modalData?.invoiceId || ""}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
      >
        {modalData ? (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Khách hàng">
                {modalData.customerId ? `CUST-${modalData.customerId}` : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Công ty">
                {modalData.companyId ? `CMP-${modalData.companyId}` : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {(modalData.status || "").toUpperCase()}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {new Date(modalData.createdAt).toLocaleString("vi-VN")}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền" span={2}>
                <strong>{vnd(modalData.total)}</strong>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <h4>Danh sách phiên sạc</h4>
            <Table
              columns={[
                { title: "Phiên", dataIndex: "chargingSessionId", key: "chargingSessionId", render: (id) => `S-${id}` },
                { title: "kWh", dataIndex: "energyKwh", key: "energyKwh" },
                { title: "Chi phí", dataIndex: "total", key: "total", render: vnd },
                { title: "Bắt đầu", dataIndex: "startedAt", key: "startedAt", render: (t) => new Date(t).toLocaleString("vi-VN") },
                { title: "Kết thúc", dataIndex: "endedAt", key: "endedAt", render: (t) => new Date(t).toLocaleString("vi-VN") },
              ]}
              dataSource={
                modalData.chargingSessions?.$values || modalData.chargingSessions || []
              }
              pagination={false}
              size="small"
            />
          </>
        ) : (
          <p>Đang tải chi tiết...</p>
        )}
      </Modal>
    </div>
  );
}
