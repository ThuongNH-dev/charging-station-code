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
  InfoCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  UserAddOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "./StationManager.css";

const API_BASE = getApiBase();

export default function StationManager() {
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ open: 0, closed: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [reasonForm] = Form.useForm();
  const [staffForm] = Form.useForm();

  // ✅ Giả lập accountId hiện tại (sau này bạn có thể thay bằng AuthContext)
  const currentAccountId = localStorage.getItem("accountId") || "12";

  useEffect(() => {
    loadStations();
    loadChargers();
  }, []);

  // ✅ Load danh sách trạm
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
    } catch (err) {
      message.error("Không thể tải danh sách trạm!");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Load danh sách trụ
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

  // ✅ Load nhân viên trạm + kiểm tra quyền
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
      message.error("Không thể tải danh sách nhân viên!");
    }
  }

  // ✅ Đóng/Mở trạm
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

  // ✅ Thêm nhân viên
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

  // ✅ Xóa nhân viên
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

  const openMap = (station) => {
    if (station.latitude && station.longitude) {
      window.open(
        `https://www.google.com/maps?q=${station.latitude},${station.longitude}`,
        "_blank"
      );
    } else message.info("Trạm chưa có tọa độ GPS!");
  };

  const openDetailModal = (station) => {
    setSelectedStation(station);
    setIsDetailModalOpen(true);
    loadStaffs(station.stationId);
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
      key: "imageUrl",
      width: 100,
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
          >
            {addr}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
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

      {/* === Bảng === */}
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

                    {/* ✅ Nút Đóng/Mở trạm chỉ cho nhân viên thuộc trạm */}
                    {canEdit && (
                      <>
                        {selectedStation.status === "Open" ? (
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
                        )}
                      </>
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
                          rules={[
                            { required: true, message: "Nhập accountId!" },
                          ]}
                        >
                          <Input
                            placeholder="Nhập ID nhân viên..."
                            style={{ width: 220 }}
                          />
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
            ]}
          />
        )}
      </Modal>

      {/* === Modal nhập lý do đóng trạm === */}
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
            label="Vui lòng nhập lý do đóng trạm:"
            rules={[{ required: true, message: "Vui lòng nhập lý do!" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="VD: Bảo trì, mất điện, sự cố kỹ thuật..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
