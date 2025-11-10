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
  DatePicker,
  Form,
} from "antd";
import {
  EyeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "./IncidentManager.css";

const API_BASE = getApiBase();
const { RangePicker } = DatePicker;

export default function IncidentManager() {
  const [reports, setReports] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const currentAccountId = localStorage.getItem("accountId") || "12";
  // === Báo cáo sự cố nhanh ===
const [reportModalOpen, setReportModalOpen] = useState(false);
const [reportForm] = Form.useForm();
const [chargers, setChargers] = useState([]);
const [ports, setPorts] = useState([]);


  /* ---------------- Load dữ liệu ---------------- */
  useEffect(() => {
    loadStaffStations();
  }, []);

  useEffect(() => {
    if (selectedStation) loadReports(selectedStation.stationId);
  }, [selectedStation, dateRange]);

  // === Lấy danh sách trạm mà nhân viên phụ trách ===
  async function loadStaffStations() {
    try {
      setLoading(true);
      const allStations = await fetchAuthJSON(`${API_BASE}/Stations`);
      let stationsArr =
        allStations?.data ?? allStations?.$values ?? allStations ?? [];
      if (!Array.isArray(stationsArr)) stationsArr = [stationsArr];

      const myStationIds = [];
      for (const st of stationsArr) {
        const res = await fetchAuthJSON(
          `${API_BASE}/station-staffs?stationId=${st.stationId}`
        );
        let staffs = res?.data ?? res?.$values ?? res ?? [];
        if (!Array.isArray(staffs)) staffs = [staffs];
        const found = staffs.some(
          (s) => String(s.staffId) === String(currentAccountId)
        );
        if (found) myStationIds.push(st.stationId);
      }

      const myStations = stationsArr.filter((s) =>
        myStationIds.includes(s.stationId)
      );
      setStations(myStations);
      if (myStations.length > 0) setSelectedStation(myStations[0]);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách trạm!");
    } finally {
      setLoading(false);
    }
  }

  // === Lấy danh sách sự cố ===
  async function loadReports(stationId) {
    if (!stationId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: 1,
        pageSize: 999,
        stationId,
      });
      if (dateRange.length === 2) {
        params.append("from", dateRange[0].toISOString());
        params.append("to", dateRange[1].toISOString());
      }

      const res = await fetchAuthJSON(`${API_BASE}/reports?${params.toString()}`);
      let data = res?.items ?? res?.data?.items ?? [];
      if (!Array.isArray(data)) data = [data];
      setReports(data);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách sự cố!");
    } finally {
      setLoading(false);
    }
  }

  // === Load trụ sạc & cổng sạc ===
async function loadChargers(stationId) {
  try {
    const res = await fetchAuthJSON(`${API_BASE}/Chargers`);
    let data = res?.data ?? res?.$values ?? res ?? [];
    if (!Array.isArray(data)) data = [data];
    const filtered = data.filter(
      (c) => String(c.stationId) === String(stationId)
    );
    setChargers(filtered);
  } catch {
    console.warn("Không thể tải trụ sạc!");
    setChargers([]);
  }
}

async function loadPorts(chargerId) {
  try {
    const res = await fetchAuthJSON(`${API_BASE}/Ports`);
    let data = res?.data ?? res?.$values ?? res ?? [];
    if (!Array.isArray(data)) data = [data];
    const filtered = data.filter(
      (p) => String(p.chargerId) === String(chargerId)
    );
    setPorts(filtered);
  } catch {
    console.warn("Không thể tải cổng sạc!");
    setPorts([]);
  }
}


  // === Cập nhật trạng thái sự cố ===
  async function updateStatus(reportId, newStatus) {
    try {
      const report = reports.find((r) => r.reportId === reportId);
      if (!report) return message.error("Không tìm thấy sự cố!");

      await fetchAuthJSON(`${API_BASE}/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: report.title || "No title",
          description: report.description || "No description",
          severity: report.severity || "Low",
          status: newStatus,
          resolvedAt:
            newStatus === "Closed" || newStatus === "Resolved"
              ? new Date().toISOString()
              : null,
        }),
      });

      setReports((prev) =>
        prev.map((r) =>
          r.reportId === reportId ? { ...r, status: newStatus } : r
        )
      );

      message.success("✅ Cập nhật trạng thái thành công!");
      setDetailOpen(false);
    } catch (err) {
      console.error(err);
      message.error("Không thể cập nhật trạng thái!");
    }
  }

  // === Gửi báo cáo sự cố ===
async function handleCreateReport(values) {
  if (!selectedStation) {
    message.warning("Vui lòng chọn trạm trước khi gửi báo cáo!");
    return;
  }
  try {
    await fetchAuthJSON(`${API_BASE}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: Number(currentAccountId),
        stationId: selectedStation.stationId,
        chargerId: values.chargerId || null,
        portId: values.portId || null,
        title: values.title,
        description: values.description,
        severity: values.severity,
        status: "Pending",
      }),
    });
    message.success("✅ Báo cáo sự cố đã được gửi!");
    reportForm.resetFields();
    setReportModalOpen(false);
    setPorts([]);
  } catch {
    message.error("Không thể gửi báo cáo!");
  }
}


  /* ---------------- Bộ lọc ---------------- */
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
    { title: "ID", dataIndex: "reportId", width: 70 },
    { title: "Tiêu đề", dataIndex: "title" },
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
    { title: "Cổng", dataIndex: "portCode" },
    { title: "Người báo cáo", dataIndex: "staffName" },
    {
      title: "Ngày báo cáo",
      dataIndex: "createdAt",
      render: (t) => (t ? new Date(t).toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Thao tác",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
  <h2 style={{ margin: 0 }}>
    <ExclamationCircleOutlined style={{ color: "#faad14" }} /> Quản lý sự cố
  </h2>

  {selectedStation && (
    <Button
      type="primary"
      icon={<InfoCircleOutlined />}
      onClick={() => {
        loadChargers(selectedStation.stationId);
        setReportModalOpen(true);
      }}
    >
      Báo cáo sự cố
    </Button>
  )}
</div>


      {/* === Bộ lọc === */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {stations.length > 1 && (
          <Col xs={24} sm={12} md={4}>
            <Select
              value={selectedStation?.stationId || null}
              placeholder="Chọn trạm..."
              onChange={(id) => {
                const st = stations.find((s) => s.stationId === id);
                setSelectedStation(st);
              }}
              options={stations.map((s) => ({
                label: s.stationName,
                value: s.stationId,
              }))}
              style={{ width: "100%" }}
            />
          </Col>
        )}
        <Col xs={24} sm={12} md={4}>
          <Input
            placeholder="Tìm kiếm sự cố..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={5}>
          <RangePicker
            style={{ width: "100%" }}
            onChange={(dates) => setDateRange(dates || [])}
            placeholder={["Từ ngày", "Đến ngày"]}
          />
        </Col>
        <Col xs={24} sm={12} md={3}>
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
        <Col xs={24} sm={12} md={3}>
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
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadReports(selectedStation?.stationId)}
            disabled={!selectedStation}
          >
            Làm mới
          </Button>
        </Col>
      </Row>

      {/* === Bảng sự cố === */}
      <Card variant="bordered">
        <Table
          columns={columns}
          dataSource={filteredReports.map((r) => ({ ...r, key: r.reportId }))}
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
          locale={{
            emptyText: selectedStation
              ? "Không có sự cố nào"
              : "Vui lòng chọn trạm để xem sự cố",
          }}
        />
      </Card>

      {/* === Modal xem chi tiết === */}
      <Modal
        title={`Chi tiết sự cố #${selectedReport?.reportId || ""}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
      >
        {selectedReport && (
          <>
            <p>
              <strong>Tiêu đề:</strong> {selectedReport.title}
            </p>
            <p>
              <strong>Mức độ:</strong>{" "}
              <Tag color={severityColor[selectedReport.severity]}>
                {selectedReport.severity}
              </Tag>
            </p>
            <p>
              <strong>Trạng thái:</strong>{" "}
              <Tag color={statusColor[selectedReport.status]}>
                {selectedReport.status}
              </Tag>
            </p>
            <p>
              <strong>Mô tả:</strong> {selectedReport.description || "—"}
            </p>
            <p>
              <strong>Trụ sạc:</strong> {selectedReport.chargerCode || "—"}
            </p>
            <p>
              <strong>Cổng sạc:</strong> {selectedReport.portCode || "—"}
            </p>
            <p>
              <strong>Người báo cáo:</strong>{" "}
              {selectedReport.staffName || "—"}
            </p>
            <p>
              <strong>Ngày tạo:</strong>{" "}
              {new Date(selectedReport.createdAt).toLocaleString("vi-VN")}
            </p>

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
      {/* === Modal báo cáo sự cố === */}
<Modal
  title={`Báo cáo sự cố - ${selectedStation?.stationName || "Chưa chọn trạm"}`}
  open={reportModalOpen}
  onCancel={() => setReportModalOpen(false)}
  footer={null}
  width={600}
>
  {selectedStation ? (
    <Form form={reportForm} layout="vertical" onFinish={handleCreateReport}>
      <Form.Item
        name="title"
        label="Tiêu đề"
        rules={[{ required: true, message: "Vui lòng nhập tiêu đề!" }]}
      >
        <Input placeholder="VD: Trụ sạc không phản hồi..." />
      </Form.Item>

      <Form.Item
        name="description"
        label="Mô tả chi tiết"
        rules={[{ required: true, message: "Nhập mô tả chi tiết!" }]}
      >
        <Input.TextArea rows={3} placeholder="Mô tả sự cố..." />
      </Form.Item>

      <Form.Item
        name="severity"
        label="Mức độ nghiêm trọng"
        rules={[{ required: true, message: "Chọn mức độ!" }]}
      >
        <Select
          options={[
            { label: "Low", value: "Low" },
            { label: "Medium", value: "Medium" },
            { label: "High", value: "High" },
            { label: "Critical", value: "Critical" },
          ]}
        />
      </Form.Item>

      <Form.Item
        name="chargerId"
        label="Trụ sạc"
        rules={[{ required: true, message: "Chọn trụ sạc!" }]}
      >
        <Select
          placeholder="Chọn trụ sạc..."
          onChange={(v) => {
            loadPorts(v);
            reportForm.setFieldValue("portId", null);
          }}
          options={chargers.map((c) => ({
            label: `${c.code || c.chargerName} (${c.type || "Không rõ"})`,
            value: c.chargerId,
          }))}
        />
      </Form.Item>

      <Form.Item
        name="portId"
        label="Cổng sạc"
        rules={[{ required: true, message: "Chọn cổng sạc!" }]}
      >
        <Select
          placeholder="Chọn cổng sạc..."
          options={ports.map((p) => ({
            label: `${p.connectorType || "Port"} — ${p.status}`,
            value: p.portId,
          }))}
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" block>
          Gửi báo cáo
        </Button>
      </Form.Item>
    </Form>
  ) : (
    <p className="muted center">⚠️ Vui lòng chọn trạm trước khi báo cáo!</p>
  )}
</Modal>

    </div>
  );
}
