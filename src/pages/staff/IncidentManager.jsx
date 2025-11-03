import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Modal,
  Button,
  Select,
  message,
  Input,
  Card,
  Row,
  Col,
  Space,
} from "antd";
import {
  EyeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "./IncidentManager.css";

const API_BASE = getApiBase();

export default function IncidentManager() {
  const [reports, setReports] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  });

  const currentAccountId = localStorage.getItem("accountId") || "12";

  useEffect(() => {
    loadStaffStations();
  }, []);

  useEffect(() => {
    if (selectedStation) loadReports(selectedStation.stationId);
  }, [selectedStation]);

  // === Lấy danh sách trạm mà nhân viên phụ trách ===
  async function loadStaffStations() {
    try {
      const res = await fetchAuthJSON(
        `${API_BASE}/station-staffs?staffId=${currentAccountId}`
      );
      let data = res?.data ?? res?.$values ?? res ?? [];
      if (!Array.isArray(data)) data = [data];
      setStations(data);
      if (data.length === 1) setSelectedStation(data[0]); // Tự chọn nếu chỉ có 1 trạm
    } catch {
      message.error("Không thể tải danh sách trạm của bạn!");
    }
  }

  // === Lấy danh sách sự cố theo trạm ===
  async function loadReports(stationId) {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await fetchAuthJSON(
        `${API_BASE}/reports?stationId=${stationId}`
      );
      let data = res?.data ?? res?.$values ?? res ?? [];
      if (!Array.isArray(data)) data = [data];
      setReports(data);

      // Tính thống kê trạng thái
      const countByStatus = (st) =>
        data.filter((r) => r.status === st).length;
      setStats({
        pending: countByStatus("Pending"),
        inProgress: countByStatus("InProgress"),
        resolved: countByStatus("Resolved"),
        closed: countByStatus("Closed"),
      });
    } catch {
      message.error("Không thể tải danh sách sự cố!");
    } finally {
      setLoading(false);
    }
  }

  // === Cập nhật trạng thái ===
  async function updateStatus(reportId, newStatus) {
    try {
      await fetchAuthJSON(`${API_BASE}/reports/${reportId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      message.success("✅ Cập nhật trạng thái thành công!");
      loadReports(selectedStation?.stationId);
      setDetailOpen(false);
    } catch {
      message.error("Không thể cập nhật trạng thái!");
    }
  }

  // === Lọc và tìm kiếm ===
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity =
      severityFilter === "All" || r.severity === severityFilter;
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const severityColor = {
    Low: "green",
    Medium: "gold",
    High: "orange",
    Critical: "red",
  };

  const statusColor = {
    Pending: "default",
    InProgress: "processing",
    Resolved: "success",
    Closed: "error",
  };

  const columns = [
    { title: "ID", dataIndex: "reportId", key: "reportId", width: 70 },
    { title: "Tiêu đề", dataIndex: "title", key: "title" },
    {
      title: "Mức độ",
      dataIndex: "severity",
      render: (sev) => <Tag color={severityColor[sev]}>{sev}</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (st) => <Tag color={statusColor[st]}>{st}</Tag>,
    },
    { title: "Trụ sạc", dataIndex: "chargerCode" },
    { title: "Cổng", dataIndex: "portName" },
    { title: "Người báo cáo", dataIndex: "staffName" },
    {
      title: "Ngày báo cáo",
      dataIndex: "createdAt",
      render: (t) => (t ? new Date(t).toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedReport(record);
            setDetailOpen(true);
          }}
        >
          Xem
        </Button>
      ),
    },
  ];

  return (
    <div className="incident-wrap">
      <h2 style={{ marginBottom: 20 }}>
        <ExclamationCircleOutlined style={{ color: "#faad14" }} /> Quản lý sự cố
      </h2>

      {/* === Thống kê tổng quan === */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="sum-card" style={{ borderLeft: "5px solid #fa8c16" }}>
            <h4>Chờ xử lý</h4>
            <p style={{ color: "#fa8c16", fontWeight: 700 }}>{stats.pending}</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="sum-card" style={{ borderLeft: "5px solid #1677ff" }}>
            <h4>Đang xử lý</h4>
            <p style={{ color: "#1677ff", fontWeight: 700 }}>{stats.inProgress}</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="sum-card" style={{ borderLeft: "5px solid #52c41a" }}>
            <h4>Đã giải quyết</h4>
            <p style={{ color: "#52c41a", fontWeight: 700 }}>{stats.resolved}</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="sum-card" style={{ borderLeft: "5px solid #cf1322" }}>
            <h4>Đã đóng</h4>
            <p style={{ color: "#cf1322", fontWeight: 700 }}>{stats.closed}</p>
          </Card>
        </Col>
      </Row>

      {/* === Bộ lọc === */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {stations.length > 1 && (
          <Col xs={24} sm={12} md={6}>
            <Select
              value={selectedStation?.stationId || null}
              placeholder="Chọn trạm để xem sự cố..."
              onChange={(id) => {
                const st = stations.find((s) => s.stationId === id);
                setSelectedStation(st);
              }}
              style={{ width: "100%" }}
              options={stations.map((s) => ({
                label: s.stationName,
                value: s.stationId,
              }))}
            />
          </Col>
        )}
        <Col xs={24} sm={12} md={6}>
          <Input
            placeholder="Tìm kiếm sự cố..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Select
            value={severityFilter}
            onChange={setSeverityFilter}
            style={{ width: "100%" }}
            options={[
              { label: "Tất cả mức độ", value: "All" },
              { label: "Low", value: "Low" },
              { label: "Medium", value: "Medium" },
              { label: "High", value: "High" },
              { label: "Critical", value: "Critical" },
            ]}
          />
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: "100%" }}
            options={[
              { label: "Tất cả trạng thái", value: "All" },
              { label: "Pending", value: "Pending" },
              { label: "In Progress", value: "InProgress" },
              { label: "Resolved", value: "Resolved" },
              { label: "Closed", value: "Closed" },
            ]}
          />
        </Col>
        <Col xs={24} sm={12} md={2}>
          <Button icon={<ReloadOutlined />} onClick={() => loadReports(selectedStation?.stationId)}>
            Làm mới
          </Button>
        </Col>
      </Row>

      {/* === Bảng sự cố === */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredReports.map((r) => ({ ...r, key: r.reportId }))}
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
        />
      </Card>

      {/* === Modal chi tiết === */}
      <Modal
        title={`Chi tiết sự cố #${selectedReport?.reportId || ""}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
      >
        {selectedReport && (
          <>
            <p><strong>Tiêu đề:</strong> {selectedReport.title}</p>
            <p><strong>Mức độ:</strong> <Tag color={severityColor[selectedReport.severity]}>{selectedReport.severity}</Tag></p>
            <p><strong>Trạng thái:</strong> <Tag color={statusColor[selectedReport.status]}>{selectedReport.status}</Tag></p>
            <p><strong>Mô tả:</strong> {selectedReport.description || "—"}</p>
            <p><strong>Trụ sạc:</strong> {selectedReport.chargerCode || "—"}</p>
            <p><strong>Cổng sạc:</strong> {selectedReport.portName || "—"}</p>
            <p><strong>Người báo cáo:</strong> {selectedReport.staffName || "—"}</p>
            <p><strong>Ngày tạo:</strong> {new Date(selectedReport.createdAt).toLocaleString("vi-VN")}</p>

            <Select
              defaultValue={selectedReport.status}
              style={{ width: 180, marginTop: 12 }}
              onChange={(v) => updateStatus(selectedReport.reportId, v)}
              options={[
                { label: "Pending", value: "Pending" },
                { label: "In Progress", value: "InProgress" },
                { label: "Resolved", value: "Resolved" },
                { label: "Closed", value: "Closed" },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
