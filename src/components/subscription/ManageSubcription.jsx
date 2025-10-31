import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Table, Card, Space, Tag, Button, Switch, Typography, App, Divider, Empty, Spin, Tooltip } from "antd";
import { ReloadOutlined, StopOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import { useAuth } from "../../context/AuthContext";
import { getApiBase, getToken as getStoredToken } from "../../utils/api";
import "./ManageSubcription.css";

const { Title, Text } = Typography;
const API_BASE = (getApiBase() || "").replace(/\/+$/, "");

/** Utils **/
function getAuthTokenAndIds(authUser) {
  const token = authUser?.token || getStoredToken();
  let customerId = authUser?.customerId;
  let companyId = authUser?.companyId;
  try {
    if (!customerId) {
      const s = localStorage.getItem("customerId") || sessionStorage.getItem("customerId");
      if (s) customerId = Number(s);
    }
    if (!companyId) {
      const s = localStorage.getItem("companyId") || sessionStorage.getItem("companyId");
      if (s) companyId = Number(s);
    }
  } catch {}
  return { token, customerId, companyId };
}

function statusColor(s) {
  switch ((s || "").toLowerCase()) {
    case "active":
      return "green";
    case "pending":
      return "gold";
    case "canceled":
    case "cancelled":
      return "red";
    default:
      return "default";
  }
}

export default function ManageSubscriptions() {
  const { user } = useAuth();
  const { message } = App.useApp?.() || { message: { success: alert, error: alert } };

  const [{ loading, rows }, setState] = useState({ loading: true, rows: [] });

  const { token, customerId, companyId } = useMemo(() => getAuthTokenAndIds(user), [user]);
  const role = (user?.role || "Customer").toString();

  const headers = useMemo(
    () => ({
      accept: "application/json",
      "Content-Type": "application/json",
      authorization: token ? `Bearer ${token}` : undefined,
    }),
    [token]
  );

  const scopeInfo = useMemo(() => {
    const isCompanySide = /admin|host|company/i.test(role);
    return {
      isCompanySide,
      label: isCompanySide ? `Company #${companyId ?? "?"}` : `Customer #${customerId ?? "?"}`,
    };
  }, [role, customerId, companyId]);

  const fetchRows = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const r = await fetch(`${API_BASE}/Subscriptions`, { headers: { accept: "*/*", authorization: headers.authorization } });
      if (!r.ok) throw new Error(`GET /Subscriptions failed: ${r.status}`);
      const data = await r.json();
      let list = Array.isArray(data) ? data : data?.items || [];

      list = list.filter((x) => {
        if (scopeInfo.isCompanySide) {
          return companyId ? (x.companyId === companyId || x.companyId === Number(companyId)) : true;
        }
        return customerId ? (x.customerId === customerId || x.customerId === Number(customerId)) : true;
      });

      list.sort((a, b) => (new Date(b.startDate || 0) - new Date(a.startDate || 0)));
      setState({ loading: false, rows: list });
    } catch (e) {
      console.error(e);
      setState({ loading: false, rows: [] });
    }
  }, [headers, scopeInfo.isCompanySide, customerId, companyId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  async function putUpdate(sub, patch) {
    const id = sub.subscriptionId;
    const payload = {
      subscriptionPlanId: Number(sub.subscriptionPlanId), // không cho đổi gói
      customerId: sub.customerId ?? null,
      companyId: sub.companyId ?? null,
      billingCycle: String(sub.billingCycle ?? "Monthly"), // không cho đổi chu kỳ
      autoRenew: Boolean(patch.autoRenew ?? sub.autoRenew ?? false),
      startDate: sub.startDate ?? new Date().toISOString(),
      status: String(patch.status ?? sub.status ?? "Active"),
      ...(patch.hasOwnProperty("endDate") ? { endDate: patch.endDate } : {}),
    };

    const res = await fetch(`${API_BASE}/Subscriptions/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`PUT failed (${res.status}) ${t}`);
    }
    return await res.json();
  }

  const handleToggleAutoRenew = async (sub, checked) => {
    try {
      const updated = await putUpdate(sub, { autoRenew: checked });
      message.success(`Đã ${checked ? "bật" : "tắt"} tự gia hạn cho gói #${sub.subscriptionId}`);
      setState((s) => ({ ...s, rows: s.rows.map((r) => (r.subscriptionId === sub.subscriptionId ? updated : r)) }));
    } catch (e) {
      console.error(e);
      message.error("Không thể cập nhật auto-renew.");
    }
  };

  const handleCancel = async (sub) => {
    try {
      const updated = await putUpdate(sub, { status: "Canceled", endDate: new Date().toISOString() });
      message.success("Đã hủy gói");
      setState((s) => ({ ...s, rows: s.rows.map((r) => (r.subscriptionId === sub.subscriptionId ? updated : r)) }));
    } catch (e) {
      console.error(e);
      message.error("Không thể hủy gói");
    }
  };

  const columns = [
    {
      title: "ID Gói",
      dataIndex: "subscriptionId",
      className: "ms-col-id",
      width: 100,
      sorter: (a, b) => a.subscriptionId - b.subscriptionId,
      render: (v) => <a className="ms-id-link">S{String(v).padStart(4, "0")}</a>,
    },
    {
      title: "Gói dịch vụ",
      dataIndex: "planName",
      className: "ms-col-plan",
      render: (text, r) => <span className="ms-plan">{text || `#${r.subscriptionPlanId}`}</span>,
    },
    {
      title: "Chủ sở hữu",
      key: "owner",
      className: "ms-col-owner",
      render: (_, r) => (
        <span className="ms-owner">{r.companyId ? `Company #${r.companyId}` : `Người dùng #${r.customerId}`}</span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      className: "ms-col-status",
      render: (s) => <Tag color={statusColor(s)} className="ms-status-tag">{String(s).toUpperCase()}</Tag>,
    },
    {
      title: "Tự gia hạn",
      dataIndex: "autoRenew",
      align: "center",
      width: 140,
      className: "ms-col-renew",
      render: (checked, record) => (
        <Switch checked={!!checked} onChange={(v) => handleToggleAutoRenew(record, v)} />
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 160,
      className: "ms-col-actions",
      render: (_, r) => (
        <Space>
          <Tooltip title={String(r.status).toLowerCase() === "canceled" ? "Đã hủy" : "Hủy gói này"}>
            <Button
              danger
              icon={<StopOutlined />}
              disabled={String(r.status).toLowerCase() === "canceled"}
              onClick={() => handleCancel(r)}
            >
              Hủy gói
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="ms-wrap">
        <Card className="ms-card">
          <div className="ms-card-head">
            <div>
              <Title level={3} className="ms-title">Quản lý gói dịch vụ</Title>
              <Text type="secondary" className="ms-sub">Phạm vi: {scopeInfo.label} · Vai trò: {role}</Text>
            </div>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchRows}>Làm mới</Button>
            </Space>
          </div>
          <Divider className="ms-divider" />
          {loading ? (
            <div className="ms-center"><Spin /></div>
          ) : rows.length === 0 ? (
            <Empty description="Không có subscription nào trong phạm vi" />
          ) : (
            <Table
              className="ms-table"
              rowKey={(r) => r.subscriptionId}
              dataSource={rows}
              columns={columns}
              pagination={{ pageSize: 10, showSizeChanger: true }}
            />
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
