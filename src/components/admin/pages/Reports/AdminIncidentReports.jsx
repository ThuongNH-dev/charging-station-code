import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  Tag,
  Space,
  Button,
  Row,
  Col,
  Input,
  DatePicker,
  Tooltip,
  Drawer,
  Descriptions,
  message,
  Popconfirm,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  SyncOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../../../../context/AuthContext";
import { getApiBase } from "../../../../utils/api";

const { RangePicker } = DatePicker;

/** ========= API base ========= */
const RAW_BASE = (getApiBase() || "").replace(/\/+$/, "");
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
const API_URL = `${API_BASE}/reports`;

/** ========= Tag colors ========= */
const severityColors = {
  Low: "green",
  Medium: "gold",
  High: "volcano",
  Critical: "red",
};

const statusColors = {
  Pending: "blue",
  InProgress: "cyan",
  Resolved: "green",
  Rejected: "red",
};

export default function AdminIncidentReports() {
  const { user } = useAuth();
  const token = useMemo(() => user?.token, [user]);

  // table state
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // filters
  const [filters, setFilters] = useState({
    stationId: "",
    chargerId: "",
    status: "",
    severity: "",
    from: null,
    to: null,
    text: "",
  });

  // detail drawer
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  /** ========= Fetch list ========= */
  const fetchList = useCallback(
    async (page, pageSize) => {
      if (!token) {
        message.error("Thiếu token đăng nhập.");
        return;
      }
      setLoading(true);
      try {
        const q = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (filters.stationId) q.append("stationId", String(filters.stationId));
        if (filters.chargerId) q.append("chargerId", String(filters.chargerId));
        if (filters.status) q.append("status", filters.status);
        if (filters.severity) q.append("severity", filters.severity);
        if (filters.from) q.append("from", dayjs(filters.from).toISOString());
        if (filters.to) q.append("to", dayjs(filters.to).toISOString());

        const res = await fetch(`${API_URL}?${q.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json(); // { total, items }

        let items = data?.items || [];
        if (filters.text) {
          const t = filters.text.toLowerCase();
          items = items.filter(
            (r) =>
              (r.title || "").toLowerCase().includes(t) ||
              (r.description || "").toLowerCase().includes(t) ||
              (r.stationName || "").toLowerCase().includes(t)
          );
        }
        setRows(items);
        setTotal(data?.total ?? items.length ?? 0);
      } catch (e) {
        message.error(e?.message || "Lỗi tải danh sách báo cáo");
      } finally {
        setLoading(false);
      }
    },
    [token, filters]
  );

  useEffect(() => {
    fetchList(pagination.current, pagination.pageSize);
  }, [fetchList, pagination.current, pagination.pageSize]);

  /** ========= Actions ========= */
  const handleOpen = (row) => {
    setSelected(row);
    setOpen(true);
  };

  const updateStatus = async (id, next) => {
    if (!token) return message.error("Thiếu token đăng nhập.");
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      message.success("Cập nhật trạng thái thành công");
      setOpen(false);
      fetchList(pagination.current, pagination.pageSize);
    } catch (e) {
      message.error(e?.message || "Cập nhật thất bại");
    }
  };

  /** ========= Table ========= */
  const columns = [
    { title: "ID", dataIndex: "reportId", width: 80 },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      ellipsis: true,
      render: (t) => (
        <Tooltip title={t}>
          <span>{t}</span>
        </Tooltip>
      ),
    },
    { title: "Trạm", dataIndex: "stationName" },
    {
      title: "Trụ/Cổng",
      key: "chargerPort",
      render: (_, r) => (
        <span>
          {r.chargerCode || r.chargerId} / {r.portCode || r.portId}
        </span>
      ),
    },
    {
      title: "Mức độ",
      dataIndex: "severity",
      filters: Object.keys(severityColors).map((s) => ({ text: s, value: s })),
      filterMultiple: false,
      render: (s) => <Tag color={severityColors[s]}>{s}</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      filters: Object.keys(statusColors).map((s) => ({ text: s, value: s })),
      filterMultiple: false,
      render: (s) => <Tag color={statusColors[s]}>{s}</Tag>,
    },
    {
      title: "Nhân viên",
      dataIndex: "staffName",
      render: (n) => n || <Tag>Chưa PC</Tag>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      defaultSortOrder: "descend",
      sorter: (a, b) =>
        dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      render: (d) => dayjs(d).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Hành động",
      key: "action",
      fixed: "right",
      width: 120,
      render: (_, r) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button icon={<EyeOutlined />} onClick={() => handleOpen(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const onTableChange = (pager, tableFilters) => {
    setPagination({ current: pager.current, pageSize: pager.pageSize });
    setFilters((prev) => ({
      ...prev,
      severity: tableFilters.severity?.[0] || "",
      status: tableFilters.status?.[0] || "",
    }));
  };

  const onReset = () => {
    setFilters({
      stationId: "",
      chargerId: "",
      status: "",
      severity: "",
      from: null,
      to: null,
      text: "",
    });
    setPagination({ current: 1, pageSize: 10 });
  };

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>
        <FileTextOutlined /> Quản lý Báo cáo Sự cố (Admin)
        <Button
          size="small"
          style={{ marginLeft: 8 }}
          icon={<ReloadOutlined />}
          onClick={() => fetchList(pagination.current, pagination.pageSize)}
        >
          Tải lại
        </Button>
      </h2>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col span={5}>
          <Input
            placeholder="Tìm tiêu đề/mô tả/trạm"
            prefix={<SearchOutlined />}
            value={filters.text}
            onChange={(e) =>
              setFilters((p) => ({ ...p, text: e.target.value }))
            }
            allowClear
          />
        </Col>
        <Col span={4}>
          <Input
            placeholder="Station ID"
            type="number"
            value={filters.stationId}
            onChange={(e) =>
              setFilters((p) => ({ ...p, stationId: e.target.value }))
            }
            allowClear
          />
        </Col>
        <Col span={4}>
          <Input
            placeholder="Charger ID"
            type="number"
            value={filters.chargerId}
            onChange={(e) =>
              setFilters((p) => ({ ...p, chargerId: e.target.value }))
            }
            allowClear
          />
        </Col>
        <Col span={7}>
          <RangePicker
            style={{ width: "100%" }}
            value={[
              filters.from ? dayjs(filters.from) : null,
              filters.to ? dayjs(filters.to) : null,
            ]}
            onChange={(dates) =>
              setFilters((p) => ({
                ...p,
                from: dates?.[0] || null,
                to: dates?.[1] || null,
              }))
            }
          />
        </Col>
        <Col span={4} style={{ textAlign: "right" }}>
          <Button icon={<SyncOutlined />} onClick={onReset}>
            Làm mới
          </Button>
        </Col>
      </Row>

      <Table
        rowKey={(r) => String(r.reportId)}
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{
          ...pagination,
          total,
          showSizeChanger: true,
          showTotal: (t) => `Tổng ${t} báo cáo`,
        }}
        onChange={onTableChange}
        scroll={{ x: 1100 }}
      />

      <Drawer
        title={`Báo cáo #${selected?.reportId || ""}`}
        open={open}
        width={560}
        onClose={() => setOpen(false)}
        destroyOnClose
      >
        {selected && (
          <>
            <Descriptions column={1} size="middle" bordered>
              <Descriptions.Item label="Tiêu đề">
                {selected.title}
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả">
                {selected.description || "(Không có)"}
              </Descriptions.Item>
              <Descriptions.Item label="Trạm">
                {selected.stationName} (ID: {selected.stationId})
              </Descriptions.Item>
              <Descriptions.Item label="Trụ/Cổng">
                {selected.chargerCode || selected.chargerId} /{" "}
                {selected.portCode || selected.portId}
              </Descriptions.Item>
              <Descriptions.Item label="Mức độ">
                <Tag color={severityColors[selected.severity]}>
                  {selected.severity}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={statusColors[selected.status]}>
                  {selected.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Nhân viên">
                {selected.staffName || "Chưa phân công"}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {dayjs(selected.createdAt).format("DD/MM/YYYY HH:mm")}
              </Descriptions.Item>
            </Descriptions>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Popconfirm
                title="Chuyển trạng thái InProgress?"
                onConfirm={() => updateStatus(selected.reportId, "InProgress")}
              >
                <Button>Đánh dấu Đang xử lý</Button>
              </Popconfirm>
              <Popconfirm
                title="Đánh dấu đã xử lý?"
                onConfirm={() => updateStatus(selected.reportId, "Resolved")}
              >
                <Button type="primary">Đánh dấu Đã xử lý</Button>
              </Popconfirm>
              <Popconfirm
                title="Từ chối báo cáo này?"
                onConfirm={() => updateStatus(selected.reportId, "Rejected")}
              >
                <Button danger>Từ chối</Button>
              </Popconfirm>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
