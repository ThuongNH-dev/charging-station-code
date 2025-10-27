import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Image,
  Tooltip,
  Card,
  Row,
  Col,
  Tag,
  Divider,
  List,
  Select,
} from "antd";
import {
  EnvironmentOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "./StationManager.css";

const API_BASE = getApiBase();

export default function StationManager() {
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ open: 0, closed: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // ✅ lọc trạng thái
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadStations();
    loadChargers();
  }, []);

  // ✅ Lấy danh sách trạm
  async function loadStations() {
    setLoading(true);
    try {
      const res = await fetchAuthJSON(`${API_BASE}/Stations`);
      let data = res?.data ?? res?.$values ?? res ?? [];
      if (!Array.isArray(data)) data = [data];
      setStations(data);

      // Tính tổng quan
      const openCount = data.filter((s) => s.status === "Open").length;
      const closedCount = data.filter((s) => s.status === "Closed").length;
      setStats({ open: openCount, closed: closedCount });
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách trạm sạc!");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Lấy danh sách trụ
  async function loadChargers() {
    try {
      const res = await fetchAuthJSON(`${API_BASE}/Chargers`);
      let data = res?.data ?? res?.$values ?? res ?? [];
      if (!Array.isArray(data)) data = [data];
      setChargers(data);
    } catch (err) {
      console.error(err);
    }
  }

  // ✅ Tính số trụ hoạt động
  const countChargers = (stationId) => {
    const related = chargers.filter((c) => c.stationId === stationId);
    if (related.length === 0) return "—";
    const active = related.filter(
      (c) => c.status === "Active" || c.status === "Available"
    );
    return `${active.length}/${related.length} hoạt động`;
  };

  // ✅ Mở Google Maps
  const openMap = (station) => {
    if (station.latitude && station.longitude) {
      window.open(
        `https://www.google.com/maps?q=${station.latitude},${station.longitude}`,
        "_blank"
      );
    } else {
      message.info("Trạm chưa có tọa độ GPS!");
    }
  };

  // ✅ Mở modal chi tiết
  const openDetailModal = (station) => {
    setSelectedStation(station);
    setIsDetailModalOpen(true);
  };

  // ✅ Mở modal báo cáo sự cố
  const openReportModal = (station) => {
    setSelectedStation(station);
    form.resetFields();
    setIsReportModalOpen(true);
  };

  // ✅ Gửi báo cáo sự cố
  const handleReport = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedStation) return;

      const report = {
        stationId: selectedStation.stationId,
        title: values.title,
        description: values.description,
        reportedAt: new Date().toISOString(),
      };

      await fetchAuthJSON(`${API_BASE}/Incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });

      message.success("✅ Đã gửi báo cáo sự cố!");
      setIsReportModalOpen(false);
    } catch (err) {
      console.error(err);
      message.error("❌ Gửi báo cáo thất bại!");
    }
  };

  // ✅ Lọc trạm theo tìm kiếm và trạng thái
  const filteredStations = stations.filter((s) => {
    const matchText =
      s.stationName?.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "All" ||
      (statusFilter === "Open" && s.status === "Open") ||
      (statusFilter === "Closed" && s.status === "Closed");
    return matchText && matchStatus;
  });

  // ✅ Cấu hình bảng
  const columns = [
    {
      title: "Ảnh",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 100,
      render: (url) =>
        url ? (
          <Image
            src={url}
            width={70}
            height={50}
            preview={{ mask: "Xem ảnh" }}
            style={{ borderRadius: 8, objectFit: "cover" }}
          />
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      title: "Tên trạm",
      dataIndex: "stationName",
      key: "stationName",
      render: (text, record) => (
        <Button type="link" onClick={() => openDetailModal(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: "Thành phố",
      dataIndex: "city",
      key: "city",
      width: 120,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      render: (addr, record) => (
        <Tooltip title="Xem trên bản đồ">
          <Button
            type="link"
            icon={<EnvironmentOutlined />}
            onClick={() => openMap(record)}
            style={{ padding: 0 }}
          >
            {addr}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Trụ sạc",
      key: "chargers",
      width: 140,
      render: (_, record) => countChargers(record.stationId),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (t) =>
        t === "Open" ? (
          <Tag color="green">Hoạt động</Tag>
        ) : (
          <Tag color="red">Đóng</Tag>
        ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      render: (_, record) => (
        <div className="actions">
          <Button
            type="link"
            icon={<InfoCircleOutlined />}
            onClick={() => openDetailModal(record)}
          >
            Chi tiết
          </Button>
          <Button
            type="link"
            icon={<WarningOutlined />}
            onClick={() => openReportModal(record)}
            style={{ color: "#fa8c16" }}
          >
            Báo cáo
          </Button>
        </div>
      ),
    },
  ];

  // ✅ Lấy danh sách trụ trong modal chi tiết
  const chargersForStation = chargers.filter(
    (c) => c.stationId === selectedStation?.stationId
  );

  return (
    <div className="station-wrap">
      {/* === Tổng quan === */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8}>
          <Card bordered className="sum-card">
            <h3>Trạm hoạt động</h3>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#389e0d" }}>
              {stats.open}
            </p>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered className="sum-card">
            <h3>Trạm đóng</h3>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#cf1322" }}>
              {stats.closed}
            </p>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered className="sum-card">
            <h3>Tổng số trạm</h3>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#1677ff" }}>
              {stations.length}
            </p>
          </Card>
        </Col>
      </Row>

      {/* === Thanh tìm kiếm + lọc === */}
      <div
        className="station-search"
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên trạm hoặc thành phố..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 300, borderRadius: 8 }}
        />

        <Select
          prefix={<FilterOutlined />}
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 180 }}
          options={[
            { label: "Tất cả trạng thái", value: "All" },
            { label: "Đang hoạt động", value: "Open" },
            { label: "Đang đóng", value: "Closed" },
          ]}
        />
      </div>

      {/* === Bảng danh sách === */}
      <Table
        columns={columns}
        dataSource={filteredStations.map((s) => ({ ...s, key: s.stationId }))}
        loading={loading}
        pagination={{ pageSize: 8 }}
        bordered
      />

      {/* === Modal Chi tiết === */}
      <Modal
        title={`Chi tiết trạm - ${selectedStation?.stationName || ""}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={700}
      >
        {selectedStation ? (
          <>
            <Image
              src={selectedStation.imageUrl}
              width="100%"
              height={200}
              style={{ borderRadius: 10, objectFit: "cover" }}
            />
            <Divider />
            <p>
              <strong>Thành phố:</strong> {selectedStation.city}
            </p>
            <p>
              <strong>Địa chỉ:</strong> {selectedStation.address}
            </p>
            <p>
              <strong>Trạng thái:</strong>{" "}
              {selectedStation.status === "Open" ? (
                <Tag color="green">Hoạt động</Tag>
              ) : (
                <Tag color="red">Đóng</Tag>
              )}
            </p>

            <Divider orientation="left">Trụ sạc tại trạm</Divider>
            {chargersForStation.length > 0 ? (
              <List
                dataSource={chargersForStation}
                renderItem={(c) => (
                  <List.Item>
                    <div>
                      <strong>{c.chargerName}</strong> —{" "}
                      <span
                        style={{
                          color:
                            c.status === "Available"
                              ? "#389e0d"
                              : c.status === "Faulted"
                              ? "#cf1322"
                              : "#595959",
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <p className="muted">Không có trụ sạc nào trong trạm này.</p>
            )}
          </>
        ) : (
          <p>Đang tải thông tin...</p>
        )}
      </Modal>

      {/* === Modal Báo cáo === */}
      <Modal
        title={`Báo cáo sự cố - ${selectedStation?.stationName || ""}`}
        open={isReportModalOpen}
        onOk={handleReport}
        onCancel={() => setIsReportModalOpen(false)}
        okText="Gửi báo cáo"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            name="title"
            label="Tiêu đề sự cố"
            rules={[{ required: true, message: "Nhập tiêu đề sự cố!" }]}
          >
            <Input placeholder="VD: Trạm mất điện, bị ngắt kết nối..." />
          </Form.Item>

          <Form.Item
            name="description"
            label="Chi tiết sự cố"
            rules={[{ required: true, message: "Nhập mô tả chi tiết!" }]}
          >
            <Input.TextArea rows={4} placeholder="Mô tả vấn đề gặp phải..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
