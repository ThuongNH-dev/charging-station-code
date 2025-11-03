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
  Tabs,
} from "antd";
import {
  EnvironmentOutlined,
  SearchOutlined,
  UserAddOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "./StationManager.css";

const API_BASE = getApiBase();

export default function StationManager() {
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [ports, setPorts] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ open: 0, closed: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [selectedPort, setSelectedPort] = useState(null);
  const [reasonForm] = Form.useForm();
  const [staffForm] = Form.useForm();
  const [reportForm] = Form.useForm();

  const currentAccountId = localStorage.getItem("accountId") || "12";

  useEffect(() => {
    loadStations();
    loadChargers();
  }, []);

  // === Load danh sách trạm ===
  async function loadStations() {
    setLoading(true);
    try {
      const res = await fetchAuthJSON(`${API_BASE}/Stations`);
      let data = res?.data ?? res?.$values ?? res ?? [];
      if (!Array.isArray(data)) data = [data];
      setStations(data);
      setStats({
        open: data.filter((s) => s.status === "Open").length,
        closed: data.filter((s) => s.status === "Closed").length,
      });
    } catch {
      message.error("Không thể tải danh sách trạm!");
    } finally {
      setLoading(false);
    }
  }

  // === Load danh sách trụ ===
  async function loadChargers() {
    try {
      const res = await fetchAuthJSON(`${API_BASE}/Chargers`);
      let data = res?.data ?? res?.$values ?? res ?? [];
      if (!Array.isArray(data)) data = [data];
      setChargers(data);
    } catch {
      console.error("Không thể tải trụ sạc!");
    }
  }

  // === Load cổng sạc theo trụ ===
  async function loadPorts(chargerId) {
    if (!chargerId) {
      setPorts([]);
      setSelectedCharger(null);
      return;
    }
    try {
      const res = await fetchAuthJSON(`${API_BASE}/Ports`);
      let data = res?.data ?? res?.$values ?? res ?? [];
      if (!Array.isArray(data)) data = [data];

      // ✅ Lọc port theo trụ sạc đã chọn
      const filtered = data.filter(
        (p) => String(p.chargerId) === String(chargerId)
      );
      setPorts(filtered);

      const charger = chargers.find((c) => c.chargerId === chargerId);
      setSelectedCharger(charger || null);
    } catch {
      console.warn("Không thể tải danh sách cổng sạc!");
      setPorts([]);
    }
  }

  // === Load nhân viên trạm ===
  async function loadStaffs(stationId) {
    try {
      const res = await fetchAuthJSON(
        `${API_BASE}/station-staffs?stationId=${stationId}`
      );
      let data = res?.data ?? res?.$values ?? res ?? [];
      if (!Array.isArray(data)) data = [data];
      setStaffs(data);
      const belongs = data.some(
        (st) => String(st.staffId) === String(currentAccountId)
      );
      setCanEdit(belongs);
    } catch {
      message.error("Không thể tải nhân viên!");
    }
  }

  // === Gửi báo cáo sự cố ===
  async function handleCreateReport(values) {
    if (!selectedStation) return;
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
          status: values.status || "Pending",
        }),
      });
      message.success("✅ Đã gửi báo cáo sự cố!");
      reportForm.resetFields();
      setSelectedCharger(null);
      setSelectedPort(null);
      setPorts([]);
    } catch {
      message.error("Không thể gửi báo cáo!");
    }
  }

  // === Đóng / Mở trạm ===
  async function toggleStationStatus(station, reason = "") {
    try {
      const newStatus = station.status === "Open" ? "Closed" : "Open";
      await fetchAuthJSON(`${API_BASE}/Stations/${station.stationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      message.success(
        `Trạm đã được ${newStatus === "Open" ? "mở" : "đóng"} thành công!`
      );
      loadStations();
      setSelectedStation({ ...station, status: newStatus });
      setReasonModalOpen(false);
      reasonForm.resetFields();
    } catch {
      message.error("Không thể thay đổi trạng thái trạm!");
    }
  }

  // === Thêm / Xóa nhân viên ===
  async function handleAddStaff(values) {
    if (!selectedStation) return;
    try {
      await fetchAuthJSON(`${API_BASE}/station-staffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: selectedStation.stationId,
          staffId: values.accountId,
        }),
      });
      message.success("Đã thêm nhân viên!");
      staffForm.resetFields();
      loadStaffs(selectedStation.stationId);
    } catch {
      message.error("Không thể thêm nhân viên!");
    }
  }

  async function handleRemoveStaff(accountId) {
    try {
      await fetchAuthJSON(
        `${API_BASE}/station-staffs/${selectedStation.stationId}/${accountId}`,
        { method: "DELETE" }
      );
      message.success("Đã xóa nhân viên!");
      loadStaffs(selectedStation.stationId);
    } catch {
      message.error("Không thể xóa nhân viên!");
    }
  }

  // === Mở modal chi tiết ===
  const openDetailModal = (station) => {
    setSelectedStation(station);
    setIsDetailModalOpen(true);
    loadStaffs(station.stationId);
  };

  const openMap = (station) => {
    if (station.latitude && station.longitude)
      window.open(
        `https://www.google.com/maps?q=${station.latitude},${station.longitude}`,
        "_blank"
      );
    else message.info("Trạm chưa có tọa độ!");
  };

  const chargersForStation = chargers.filter(
    (c) => c.stationId === selectedStation?.stationId
  );

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

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "imageUrl",
      render: (url) =>
        url ? (
          <Image
            src={url}
            width={70}
            height={50}
            style={{ borderRadius: 8, objectFit: "cover" }}
          />
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      title: "Tên trạm",
      dataIndex: "stationName",
      render: (text, record) => (
        <Button type="link" onClick={() => openDetailModal(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: "Thành phố",
      dataIndex: "city",
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      render: (addr, record) => (
        <Tooltip title="Xem trên bản đồ">
          <Button
            type="link"
            icon={<EnvironmentOutlined />}
            onClick={() => openMap(record)}
          >
            {addr}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (t) =>
        t === "Open" ? (
          <Tag color="green">Hoạt động</Tag>
        ) : (
          <Tag color="red">Đóng</Tag>
        ),
    },
  ];

  return (
    <div className="station-wrap">
      {/* === Tổng quan === */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8}>
          <Card className="sum-card">
            <h3>Trạm hoạt động</h3>
            <p style={{ color: "#389e0d", fontWeight: 700 }}>{stats.open}</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="sum-card">
            <h3>Trạm đóng</h3>
            <p style={{ color: "#cf1322", fontWeight: 700 }}>{stats.closed}</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="sum-card">
            <h3>Tổng số trạm</h3>
            <p style={{ color: "#1677ff", fontWeight: 700 }}>
              {stations.length}
            </p>
          </Card>
        </Col>
      </Row>

      {/* === Tìm kiếm + Lọc === */}
      <div className="station-search">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên trạm hoặc thành phố..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 180 }}
          options={[
            { label: "Tất cả", value: "All" },
            { label: "Đang hoạt động", value: "Open" },
            { label: "Đang đóng", value: "Closed" },
          ]}
        />
      </div>

      {/* === Bảng trạm === */}
      <Table
        columns={columns}
        dataSource={filteredStations.map((s) => ({ ...s, key: s.stationId }))}
        loading={loading}
        pagination={{ pageSize: 8 }}
        bordered
      />

      {/* === Modal chi tiết === */}
      <Modal
        title={`Chi tiết trạm - ${selectedStation?.stationName || ""}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={820}
      >
        {selectedStation && (
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: "1",
                label: "Thông tin trạm",
                children: (
                  <>
                    <Image
                      src={selectedStation.imageUrl}
                      width="100%"
                      height={220}
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
                    {canEdit && (
                      selectedStation.status === "Open" ? (
                        <Button
                          type="primary"
                          danger
                          icon={<LockOutlined />}
                          onClick={() => setReasonModalOpen(true)}
                        >
                          Đóng trạm
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          icon={<UnlockOutlined />}
                          onClick={() => toggleStationStatus(selectedStation)}
                        >
                          Mở trạm
                        </Button>
                      )
                    )}
                  </>
                ),
              },
              {
                key: "2",
                label: "Trụ sạc tại trạm",
                children: (
                  <List
                    dataSource={chargersForStation}
                    renderItem={(c) => (
                      <List.Item>
                        <strong>{c.code}</strong> —{" "}
                        <span
                          style={{
                            color:
                              c.status === "Online"
                                ? "#389e0d"
                                : c.status === "Faulted"
                                ? "#cf1322"
                                : "#595959",
                          }}
                        >
                          {c.status}
                        </span>
                      </List.Item>
                    )}
                  />
                ),
              },
              {
                key: "3",
                label: "Nhân viên phụ trách",
                children: (
                  <>
                    <List
                      dataSource={staffs}
                      renderItem={(st) => (
                        <List.Item
                          actions={
                            canEdit
                              ? [
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() =>
                                      handleRemoveStaff(st.staffId)
                                    }
                                  >
                                    Xóa
                                  </Button>,
                                ]
                              : []
                          }
                        >
                          <strong>{st.staffName}</strong>{" "}
                          <span style={{ color: "#888" }}>
                            ({st.staffEmail || "Không có email"})
                          </span>
                        </List.Item>
                      )}
                    />
                    {canEdit && (
                      <Form
                        layout="inline"
                        form={staffForm}
                        onFinish={handleAddStaff}
                        style={{ marginTop: 16 }}
                      >
                        <Form.Item
                          name="accountId"
                          label="ID nhân viên"
                          rules={[{ required: true, message: "Nhập ID!" }]}
                        >
                          <Input placeholder="Nhập ID nhân viên..." />
                        </Form.Item>
                        <Form.Item>
                          <Button
                            type="primary"
                            htmlType="submit"
                            icon={<UserAddOutlined />}
                          >
                            Thêm nhân viên
                          </Button>
                        </Form.Item>
                      </Form>
                    )}
                  </>
                ),
              },
              {
                key: "4",
                label: "Báo cáo sự cố",
                children: (
                  <>
                    {canEdit ? (
                      <>
                        <h4>Tạo báo cáo mới</h4>
                        <Form
                          form={reportForm}
                          layout="vertical"
                          onFinish={handleCreateReport}
                        >
                          <Form.Item
                            name="title"
                            label="Tiêu đề"
                            rules={[{ required: true, message: "Nhập tiêu đề!" }]}
                          >
                            <Input placeholder="VD: Trụ sạc không phản hồi..." />
                          </Form.Item>

                          <Form.Item
                            name="description"
                            label="Mô tả chi tiết"
                            rules={[{ required: true, message: "Nhập mô tả!" }]}
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
                            name="status"
                            label="Trạng thái ban đầu"
                            initialValue="Pending"
                            rules={[{ required: true, message: "Chọn trạng thái!" }]}
                          >
                            <Select
                              options={[
                                { label: "Pending", value: "Pending" },
                                { label: "In Progress", value: "InProgress" },
                                { label: "Resolved", value: "Resolved" },
                                { label: "Closed", value: "Closed" },
                              ]}
                            />
                          </Form.Item>

                          {/* ✅ Trụ sạc */}
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
                                const charger = chargersForStation.find(
                                  (c) => c.chargerId === v
                                );
                                setSelectedCharger(charger || null);
                              }}
                              options={chargersForStation.map((c) => ({
                                label: `${c.code || c.chargerName} (${c.type || "Không rõ"})`,
                                value: c.chargerId,
                              }))}
                            />
                          </Form.Item>

                          {/* ✅ Cổng sạc */}
                          <Form.Item
                            name="portId"
                            label="Cổng sạc"
                            rules={[{ required: true, message: "Chọn cổng sạc!" }]}
                          >
                            <Select
                              placeholder="Chọn cổng sạc..."
                              onChange={(v) => {
                                const port = ports.find((p) => p.portId === v);
                                setSelectedPort(port || null);
                              }}
                              options={ports.map((p) => ({
                                label: `${p.connectorType || "Port"} — ${p.status}`,
                                value: p.portId,
                              }))}
                            />
                          </Form.Item>

                          {/* ✅ Hiển thị trụ & cổng được chọn */}
                          {(selectedCharger || selectedPort) && (
                            <div
                              style={{
                                background: "#fafafa",
                                borderRadius: 8,
                                padding: "8px 12px",
                                marginBottom: 16,
                                border: "1px solid #eee",
                              }}
                            >
                              {selectedCharger && (
                                <p style={{ margin: 0 }}>
                                  <strong>Trụ đang chọn:</strong>{" "}
                                  {selectedCharger.code || selectedCharger.chargerName}
                                </p>
                              )}
                              {selectedPort && (
                                <p style={{ margin: 0 }}>
                                  <strong>Cổng đang chọn:</strong>{" "}
                                  {selectedPort.connectorType} (
                                  {selectedPort.status})
                                </p>
                              )}
                            </div>
                          )}

                          <Form.Item>
                            <Button
                              type="primary"
                              htmlType="submit"
                              icon={<InfoCircleOutlined />}
                            >
                              Gửi báo cáo
                            </Button>
                          </Form.Item>
                        </Form>
                      </>
                    ) : (
                      <p className="muted center">
                        Bạn không có quyền báo cáo sự cố cho trạm này.
                      </p>
                    )}
                  </>
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* === Modal lý do đóng trạm === */}
      <Modal
        title="Lý do đóng trạm"
        open={reasonModalOpen}
        onCancel={() => setReasonModalOpen(false)}
        okText="Xác nhận đóng"
        onOk={() => {
          reasonForm
            .validateFields()
            .then((values) =>
              toggleStationStatus(selectedStation, values.reason)
            )
            .catch(() => {});
        }}
      >
        <Form layout="vertical" form={reasonForm}>
          <Form.Item
            name="reason"
            label="Nhập lý do đóng trạm:"
            rules={[{ required: true, message: "Vui lòng nhập lý do!" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
