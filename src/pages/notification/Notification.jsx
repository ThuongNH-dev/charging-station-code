import React, { useEffect, useState, useMemo } from "react";
import { List, Spin, Empty, Breadcrumb, Pagination } from "antd";
import MainLayout from "../../layouts/MainLayout";
import { getApiBase } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import "./Notification.css";

dayjs.extend(relativeTime);
dayjs.locale("vi");

export default function Notification() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 5;

    const RAW_BASE = (getApiBase() || "").replace(/\/+$/, "");
    const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;


    useEffect(() => {
        if (!user?.token) return;

        const role = (user?.role || "").toLowerCase();
        const customerId = user?.customerId || localStorage.getItem("customerId");
        const companyId = user?.companyId || localStorage.getItem("companyId");

        let url = null;
        if (role === "customer" && customerId) {
            url = `${API_BASE}/Notification/customer/${customerId}?includeArchived=false`;
        } else if (role === "company" && companyId) {
            url = `${API_BASE}/Notification/company/${companyId}?includeArchived=false`;
        } else {
            setError("Không tìm thấy thông tin người dùng hoặc vai trò không hợp lệ");
            setLoading(false);
            return;
        }

        fetch(url, {
            headers: { accept: "application/json", authorization: `Bearer ${user.token}` },
        })
            .then(async (r) => {
                if (!r.ok) throw new Error(`Lỗi khi tải thông báo: ${r.status}`);
                const data = await r.json();
                setNotifications(Array.isArray(data) ? data : [data]);
            })
            .catch((err) => {
                console.error("[Notification] error:", err);
                setError(err.message || "Không thể tải thông báo");
            })
            .finally(() => setLoading(false));
    }, [user, API_BASE]);

    const sorted = useMemo(
        () => [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        [notifications]
    );

    const total = sorted.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const currentData = sorted.slice(startIndex, endIndex);

    const openItem = (item) => {
        const url = item?.actionUrl;
        if (!url) return;
        if (url.startsWith("/")) navigate(url);
        else window.location.href = url;
    };

    return (
        <MainLayout>
            <div className="page notifications">
                <div className="breadcrumb-wrap">
                    <Breadcrumb items={[{ title: <a href="/">Trang chủ</a> }, { title: "Thông báo" }]} />
                </div>

                <div className="noti-container">
                    <h2 className="noti-title">Thông báo của bạn</h2>

                    {loading ? (
                        <div className="center-loading"><Spin size="large" /></div>
                    ) : error ? (
                        <div className="noti-error">⚠️ {error}</div>
                    ) : total === 0 ? (
                        <Empty description="Không có thông báo nào" className="noti-empty" />
                    ) : (
                        <>
                            <List
                                className="noti-list"
                                itemLayout="vertical"
                                dataSource={currentData}
                                renderItem={(item) => {
                                    const readClass = item.isRead ? "read" : "unread";
                                    const priorityClass =
                                        (item.priority || "").toLowerCase() === "high" ? "pri-high" : "";

                                    const badge =
                                        (item.type || "").toLowerCase() === "invoice"
                                            ? "📄"
                                            : (item.type || "").toLowerCase() === "booking"
                                                ? "⚡"
                                                : "🔔";

                                    return (
                                        <button
                                            type="button"
                                            onClick={() => openItem(item)}
                                            className={`noti-row ${readClass} ${priorityClass}`}
                                        >
                                            <div className="noti-thumb" aria-hidden>{badge}</div>

                                            <div className="noti-main">
                                                <div className="noti-title-line">
                                                    <span className="noti-title-text">{item.title}</span>
                                                </div>
                                                <div className="noti-message">{item.message}</div>
                                            </div>

                                            <div className="noti-side">
                                                <span className="noti-time">
                                                    {dayjs(item.createdAt || item.createdDate || item.createdOn || item.time || item.date || item.timestamp).fromNow()}
                                                </span>
                                                <span className="noti-type">{item.type}</span>
                                            </div>
                                        </button>
                                    );
                                }}
                            />

                            <div className="pagination-wrap rounded-pagination">
                                <span className="pagination-info">
                                    Đang hiển thị {startIndex + 1}–{endIndex} / {total} thông báo
                                </span>
                                <Pagination
                                    current={page}
                                    total={total}
                                    pageSize={pageSize}
                                    onChange={setPage}
                                    showSizeChanger={false}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
