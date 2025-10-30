import React, { useEffect, useMemo, useState } from "react";
import { Layout, Button, Tooltip, Dropdown, Badge, List, Avatar } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AccountMenu from "../others/Menu";
import {
  FileSearchOutlined,
  FileTextOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { getApiBase } from "../../utils/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import "./Header.css";

dayjs.extend(relativeTime);
dayjs.locale("vi");

const { Header } = Layout;
const RAW_BASE = (getApiBase() || "").replace(/\/+$/, "");
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;

/* ===== Helpers ===== */
function getTokenFromAnywhere(authUser) {
  if (authUser?.token) return authUser.token;
  try {
    const u = JSON.parse(
      localStorage.getItem("user") ||
      sessionStorage.getItem("user") ||
      "null"
    );
    return u?.token || null;
  } catch {
    return null;
  }
}
function getCustomerId(user) {
  return (
    user?.id || user?.userId || user?.customerId || user?.accountId || null
  );
}
function getCompanyId(user) {
  return user?.companyId || user?.company?.id || null;
}
function getNotiTime(n) {
  const t =
    n?.createdAt ||
    n?.createdDate ||
    n?.createdOn ||
    n?.createTime ||
    n?.timestamp ||
    n?.updatedAt ||
    n?.time ||
    n?.date;
  if (t) {
    const d = new Date(t);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  try {
    for (const k of Object.keys(n || {})) {
      if (/(date|time|at)$/i.test(k)) {
        const d2 = new Date(n[k]);
        if (!isNaN(d2.getTime())) return d2.getTime();
      }
    }
  } catch { }
  if (typeof n?.id === "number") return n.id;
  return 0;
}

/* ===== Component ===== */
export default function Head() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, userRole: ctxRole, userName: ctxName } =
    useAuth();

  const role = (user?.role || ctxRole || "").toLowerCase();
  const isStaff = role === "staff";
  const isAdmin = role === "admin";
  const isCustomer = role === "customer";
  const isCompany = role === "company";
  const userName = user?.name || user?.userName || ctxName || "User";

  const showBell = isAuthenticated && !isAdmin && !isStaff;

  const [hasNew, setHasNew] = useState(false);
  const [latestMark, setLatestMark] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const token = useMemo(() => getTokenFromAnywhere(user), [user]);

  /* ---- Load/poll notifications ---- */
  useEffect(() => {
    if (!showBell || !token) return;

    let timerId;

    const loadHasNew = async () => {
      try {
        let url = "";
        let storageKey = "";

        if (isCustomer) {
          const cid = getCustomerId(user);
          if (!cid) return;
          url = `${API_BASE}/Notification/customer/${cid}?includeArchived=false`;
          storageKey = `NOTI_LAST_SEEN_CUSTOMER_${cid}`;
        } else if (isCompany) {
          const compId = getCompanyId(user);
          if (!compId) return;
          url = `${API_BASE}/Notification/company/${compId}?includeArchived=false`;
          storageKey = `NOTI_LAST_SEEN_COMPANY_${compId}`;
        } else {
          return;
        }

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const list = Array.isArray(data) ? data : data?.items || [];
        setNotifications(list);

        if (!list.length) {
          setHasNew(false);
          setLatestMark(0);
          return;
        }

        const latest = list.reduce((m, n) => Math.max(m, getNotiTime(n)), 0);
        setLatestMark(latest);

        const raw = localStorage.getItem(storageKey);
        const lastSeen = raw ? Number(raw) : 0;

        setHasNew(!raw || latest > lastSeen);
      } catch (e) {
        // console.error(e);
      }
    };

    loadHasNew();
    timerId = setInterval(loadHasNew, 45000);
    return () => clearInterval(timerId);
  }, [showBell, token, isCustomer, isCompany, user]);

  /* ===== NAV items ===== */
  const items = isStaff
    ? [
      { key: "s1", label: "Quản lý trụ sạc", path: "/staff/stations" },
      { key: "s2", label: "Phiên sạc", path: "/staff/sessions" },
      { key: "s3", label: "Thanh toán", path: "/staff/payments" },
      { key: "s4", label: "Báo cáo", path: "/staff/reports" },
    ]
    : isCompany
      ? [
        { key: "c1", label: "Quản lý nguồn lực", path: "/company" },
        { key: "3", label: "Dịch vụ", path: "/services" },
        { key: "4", label: "Liên hệ", path: "/contact" },
      ]
      : [
        { key: "1", label: "Trang chủ", path: "/" },
        { key: "2", label: "Danh mục", path: "/stations" },
        { key: "3", label: "Dịch vụ", path: "/services" },
        { key: "4", label: "Liên hệ", path: "/contact" },
      ];

  const path = location.pathname;
  let activeKey = "1";
  if (isStaff) {
    if (path.startsWith("/staff/stations")) activeKey = "s1";
    else if (path.startsWith("/staff/sessions")) activeKey = "s2";
    else if (path.startsWith("/staff/payments")) activeKey = "s3";
    else if (path.startsWith("/staff/reports")) activeKey = "s4";
  } else if (isCompany) {
    if (path.startsWith("/company")) activeKey = "c1";
    else if (path.startsWith("/services")) activeKey = "3";
    else if (path.startsWith("/contact")) activeKey = "4";
    else if (path === "/") activeKey = "1";
  } else {
    if (/^\/(stations|booking|payment|charging)/.test(path)) activeKey = "2";
    else if (path.startsWith("/services")) activeKey = "3";
    else if (path.startsWith("/contact")) activeKey = "4";
    else if (path === "/") activeKey = "1";
  }

  const danhMucMenuItems = [
    { key: "dm-1", label: "Tìm trạm sạc", onClick: () => navigate("/stations") },
    { key: "dm-2", label: "Phiên sạc", onClick: () => navigate("/charging/start") },
  ];
  const quanLyNguonLucItems = [
    { key: "rl-1", label: "Quản lý xe", onClick: () => navigate("/company") },
    { key: "rl-2", label: "Thống kê theo tháng", onClick: () => navigate("/company/reports") },
  ];

  /* ===== Right cluster ===== */
  const renderRight = () => {
    if (!isAuthenticated) {
      return (
        <>
          <Button className="btn-outline" type="text" onClick={() => navigate("/login")}>
            Đăng nhập
          </Button>
          <Button className="btn-outline" type="text" onClick={() => navigate("/register/select")}>
            Đăng ký
          </Button>
        </>
      );
    }

    return (
      <div className="header-right">
        {isCustomer && (
          <Tooltip title="Phiên đặt chỗ">
            <FileSearchOutlined
              className="history-icon"
              onClick={() => navigate("/user/history")}
            />
          </Tooltip>
        )}

        {(isCustomer || isCompany) && (
          <Tooltip title="Hóa đơn phiên sạc">
            <FileTextOutlined
              className="invoice-icon"
              onClick={() => navigate("/invoiceSummary")}
            />
          </Tooltip>
        )}

        {showBell && (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            overlayClassName="noti-dropdown"
            dropdownRender={() => (
              <div className="noti-panel">
                <div className="noti-header">Thông báo</div>

                {notifications.length === 0 ? (
                  <div className="noti-empty">Không có thông báo mới</div>
                ) : (
                  <List
                    // hiển thị đúng 4 tin, không cuộn
                    dataSource={notifications.slice(0, 4)}
                    renderItem={(item, idx) => (
                      <List.Item className={`noti-item ${idx === 0 ? "first" : ""}`}>
                        <div className="noti-content">
                          <div className="noti-title">
                            {item.title || item.message || "Thông báo"}
                          </div>
                          <div className="noti-time">
                            {dayjs(item.createdAt || item.timestamp || item.date).fromNow()}
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}

                <div
                  className="noti-footer"
                  onClick={() => {
                    navigate("/notifications");
                    try {
                      if (isCustomer) {
                        const cid = getCustomerId(user);
                        if (cid)
                          localStorage.setItem(
                            `NOTI_LAST_SEEN_CUSTOMER_${cid}`,
                            String(latestMark || Date.now())
                          );
                      } else if (isCompany) {
                        const compId = getCompanyId(user);
                        if (compId)
                          localStorage.setItem(
                            `NOTI_LAST_SEEN_COMPANY_${compId}`,
                            String(latestMark || Date.now())
                          );
                      }
                    } catch { }
                    setHasNew(false);
                  }}
                >
                  Xem tất cả
                </div>
              </div>
            )}
          >
            <Badge dot={hasNew} offset={[-2, 2]}>
              <BellOutlined className="bell-icon" />
            </Badge>
          </Dropdown>

        )}

        <AccountMenu />
      </div>
    );
  };

  return (
    <Layout>
      <Header className="app-header">
        <div className="left">
          <img src="/logoV2.png" alt="logo" className="logo" />

          {!isAdmin && (
            <ul className="nav">
              {items.map((item) => {
                const isDanhMuc = item.key === "2" && !isStaff && !isCompany;
                const isQLNguonLuc = item.key === "c1" && isCompany;

                if (isDanhMuc) {
                  return (
                    <li key={item.key}>
                      <Dropdown
                        trigger={["hover", "click"]}
                        placement="bottom"
                        menu={{
                          items: danhMucMenuItems,
                          onClick: ({ domEvent }) => domEvent.stopPropagation(),
                        }}
                      >
                        <div
                          className={`nav-item ${activeKey === item.key ? "active" : ""
                            } nav-dropdown`}
                          onClick={(e) => e.preventDefault()}
                        >
                          {item.label} <span className="caret">▾</span>
                        </div>
                      </Dropdown>
                    </li>
                  );
                }

                if (isQLNguonLuc) {
                  return (
                    <li key={item.key}>
                      <Dropdown
                        trigger={["hover", "click"]}
                        placement="bottom"
                        menu={{
                          items: quanLyNguonLucItems,
                          onClick: ({ domEvent }) => domEvent.stopPropagation(),
                        }}
                      >
                        <div
                          className={`nav-item ${activeKey === item.key ? "active" : ""
                            } nav-dropdown`}
                          onClick={(e) => e.preventDefault()}
                        >
                          {item.label} <span className="caret">▾</span>
                        </div>
                      </Dropdown>
                    </li>
                  );
                }

                return (
                  <li key={item.key}>
                    <div
                      className={`nav-item ${activeKey === item.key ? "active" : ""
                        }`}
                      onClick={() => navigate(item.path)}
                    >
                      {item.label}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="actions">{renderRight()}</div>
      </Header>
    </Layout>
  );
}
