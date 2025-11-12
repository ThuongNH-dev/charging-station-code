// src/pages/me/MyFeedbacks.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Rate,
  Tag,
  Empty,
  Space,
  Typography,
  message,
  Button,
  Modal,
  Input,
  Popconfirm,
} from "antd";
import MainLayout from "../../layouts/MainLayout";
import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../utils/api";
import "./MyFeedbacks.css";

const { Text } = Typography;
const { TextArea } = Input;

/* ==================== API base ==================== */
function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase());

/* ==================== Auth helpers ==================== */
function readStoredUser() {
  try {
    const s1 = localStorage.getItem("user");
    const s2 = sessionStorage.getItem("user");
    const obj = s1 ? JSON.parse(s1) : (s2 ? JSON.parse(s2) : null);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}
function readToken() {
  const u = readStoredUser();
  return u?.token || null;
}
function readCustomerIdFromStorage() {
  const v1 = Number(localStorage.getItem("customerId"));
  const v2 = Number(sessionStorage.getItem("customerId"));
  const n = Number.isFinite(v1) ? v1 : (Number.isFinite(v2) ? v2 : null);
  return Number.isFinite(n) ? n : null;
}

/* ==================== UI helpers ==================== */
const fmtDateTime = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
function getId(row) {
  return row?.feedbackId ?? row?.id ?? row?.feedbackID ?? row?.ID ?? null;
}

/* ==================== Main Page ==================== */
export default function MyFeedbacks() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const token = useMemo(() => user?.token || readToken(), [user]);
  const customerId = useMemo(() => {
    const cid = user?.customerId ?? readCustomerIdFromStorage();
    return Number.isFinite(Number(cid)) ? Number(cid) : null;
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  // ====== Edit modal state ======
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");

  // ====== Fetch mine ======
  const fetchMine = async () => {
    if (!token || !customerId) return;
    setLoading(true);
    let acc = [];
    let page = 1;
    const pageSize = 50;
    let stopped = false;
    try {
      while (!stopped) {
        const url = `${API_ABS}/feedbacks?page=${page}&pageSize=${pageSize}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (page === 1) {
            const url2 = `${API_ABS}/feedbacks?customerId=${customerId}&page=1&pageSize=${pageSize}`;
            const res2 = await fetch(url2, {
              method: "GET",
              headers: {
                accept: "application/json",
                authorization: `Bearer ${token}`,
              },
            });
            if (!res2.ok) {
              const t = await res2.text();
              throw new Error(`Không tải được danh sách đánh giá: ${res2.status} ${t || ""}`);
            }
            const data2 = await res2.json().catch(() => null);
            const arr2 = Array.isArray(data2?.items) ? data2.items : (Array.isArray(data2) ? data2 : []);
            acc = acc.concat(arr2);
            break;
          }
          const t = await res.text();
          throw new Error(`Không tải được danh sách đánh giá: ${res.status} ${t || ""}`);
        }

        const data = await res.json().catch(() => null);
        const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        acc = acc.concat(arr);
        if (!arr.length || arr.length < pageSize) break;
        page += 1;
        if (page > 50) break;
      }
    } catch (e) {
      console.error(e);
      message.error(e.message || "Lỗi tải dữ liệu đánh giá");
    } finally {
      const mine = acc
        .filter((x) => Number(x?.customerId) === Number(customerId))
        .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
      setItems(mine);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      message.warning("Vui lòng đăng nhập để xem đánh giá của bạn.");
      navigate("/login", { replace: true });
      return;
    }
    if (!customerId) {
      message.error("Không xác định được Customer ID của tài khoản đang đăng nhập.");
      return;
    }
    fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, customerId, navigate]);

  /* ============ Edit actions ============ */
  const openEdit = (row) => {
    const id = getId(row);
    if (!id) {
      message.error("Không xác định được ID đánh giá để sửa.");
      return;
    }
    setEditRow(row);
    setEditRating(Number(row?.rating) || 0);
    setEditComment(row?.comment || "");
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editRow) return;
    const id = getId(editRow);
    if (!id) {
      message.error("Không xác định được ID đánh giá để sửa.");
      return;
    }
    const body = {
      rating: Number(editRating) || 0,
      comment: String(editComment || "").trim(),
    };
    if (body.rating < 1 || body.rating > 5) {
      message.warning("Điểm đánh giá phải trong khoảng 1–5.");
      return;
    }

    setEditSubmitting(true);
    const prevItems = items.slice();
    const nextItems = items.map((it) =>
      getId(it) === id ? { ...it, rating: body.rating, comment: body.comment } : it
    );
    setItems(nextItems);

    try {
      const res = await fetch(`${API_ABS}/feedbacks/${id}`, {
        method: "PUT",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Sửa đánh giá thất bại: ${res.status} ${t || ""}`);
      }

      message.success("Đã cập nhật đánh giá.");
      setEditOpen(false);
      setEditRow(null);
    } catch (e) {
      console.error(e);
      setItems(prevItems);
      message.error(e.message || "Không thể cập nhật đánh giá.");
    } finally {
      setEditSubmitting(false);
    }
  };

  /* ============ Delete ============ */
  const deleteFeedback = async (row) => {
    const id = getId(row);
    if (!id) {
      message.error("Không xác định được ID đánh giá để xoá.");
      return;
    }
    const prev = items.slice();
    setItems((curr) => curr.filter((x) => getId(x) !== id));
    try {
      const res = await fetch(`${API_ABS}/feedbacks/${id}`, {
        method: "DELETE",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Xoá đánh giá thất bại: ${res.status} ${t || ""}`);
      }
      message.success("Đã xoá đánh giá.");
    } catch (e) {
      console.error(e);
      setItems(prev);
      message.error(e.message || "Không thể xoá đánh giá.");
    }
  };

  const columns = [
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 200,
      render: (v) => <Text>{fmtDateTime(v)}</Text>,
      sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      defaultSortOrder: "descend",
    },
    {
      title: "Đánh giá",
      dataIndex: "rating",
      key: "rating",
      width: 180,
      render: (v) => <Rate disabled value={Number(v) || 0} allowHalf={false} />,
      sorter: (a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0),
    },
    {
      title: "Nhận xét",
      dataIndex: "comment",
      key: "comment",
      width: 520,
      render: (v) => <Text>{v || ""}</Text>,
    },
    {
      title: "Trạm / Thiết bị",
      key: "station",
      render: (_, rec) => (
        <div className="myfb-station">
          <Tag>{rec.stationName || `Station #${rec.stationId ?? "?"}`}</Tag>
          <Tag>{rec.chargerCode ? `Charger ${rec.chargerCode}` : (rec.chargerId ? `Charger #${rec.chargerId}` : "Charger ?")}</Tag>
          <Tag>{rec.portCode ? `Port ${rec.portCode}` : (rec.portId ? `Port #${rec.portId}` : "Port ?")}</Tag>
        </div>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 200,
      align: "center",
      render: (_, rec) => {
        const mine = Number(rec?.customerId) === Number(customerId);
        if (!mine) return null;
        return (
          <Space size={8}>
            <Button size="small" className="myfb-btn-outline" onClick={() => openEdit(rec)}>
              Sửa
            </Button>
            <Popconfirm
              title="Xoá đánh giá?"
              description="Hành động này không thể hoàn tác. Bạn có chắc chắn?"
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true, className: "myfb-btn-danger" }}
              onConfirm={() => deleteFeedback(rec)}
            >
              <Button size="small" className="myfb-btn-danger">Xoá</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <MainLayout>
      <div className="myfb-page">
        <div className="myfb-hero">
          <div className="myfb-hero-shine" />
          <div className="myfb-hero-grid" />
          <div className="myfb-hero-inner">
            <Typography.Title level={2} className="myfb-title">
              Đánh giá của tôi
            </Typography.Title>
            <Space>
              <Button className="myfb-btn" onClick={fetchMine} loading={loading}>
                Làm mới
              </Button>
            </Space>
          </div>
        </div>

        <div className="myfb-card anidrop">
          {!loading && items.length === 0 ? (
            <div className="myfb-empty">
              <Empty description="Bạn chưa có đánh giá nào" />
            </div>
          ) : (
            <Table
              className="myfb-table"
              rowClassName={() => "myfb-row"}
              rowKey={(r) => getId(r) ?? `${r.customerId}-${r.createdAt}`}
              loading={loading}
              columns={columns}
              dataSource={items}
              // CENTER pagination + size changer
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                position: ["bottomCenter"],
              }}
              scroll={{ x: true }}
            />
          )}
        </div>
      </div>

      {/* ======= Edit Modal ======= */}
      <Modal
        open={editOpen}
        onCancel={() => !editSubmitting && setEditOpen(false)}
        onOk={submitEdit}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={editSubmitting}
        title="Sửa đánh giá"
        destroyOnClose
      >
        <div className="myfb-edit">
          <div style={{ marginBottom: 12 }}>
            <Text style={{ display: "block", marginBottom: 6 }}>Điểm đánh giá (1–5):</Text>
            <Rate value={editRating} onChange={setEditRating} />
          </div>
          <div>
            <Text style={{ display: "block", marginBottom: 6 }}>Nhận xét:</Text>
            <TextArea
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              autoSize={{ minRows: 3, maxRows: 6 }}
              maxLength={1000}
              showCount
              placeholder="Chia sẻ trải nghiệm của bạn…"
            />
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
