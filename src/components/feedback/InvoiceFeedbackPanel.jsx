// src/components/feedback/InvoiceFeedbackPanel.jsx
import React from "react";
import "./InvoiceFeedbackPanel.css";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function renderStarsEmoji(n) {
    const v = clamp(Number(n) || 0, 0, 5);
    return "⭐️".repeat(v) + "☆".repeat(5 - v);
}

function getStoredUser() {
    try {
        const s = sessionStorage.getItem("user") || localStorage.getItem("user");
        return s ? JSON.parse(s) : null;
    } catch {
        return null;
    }
}

function getTokenFromStorage() {
    const u = getStoredUser();
    return u?.token || null;
}

function getCustomerIdFromStorage() {
    try {
        const s1 = sessionStorage.getItem("customerId");
        const s2 = localStorage.getItem("customerId");
        const u = getStoredUser();
        const fromUser = u?.customerId;
        const n = Number(fromUser ?? s1 ?? s2 ?? u?.userId ?? u?.id ?? NaN);
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    }
}

export default function InvoiceFeedbackPanel({ apiBase, endData, orderId }) {
    const base = String(apiBase || "").replace(/\/+$/, "");
    const [rating, setRating] = React.useState(0);
    const [comment, setComment] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [done, setDone] = React.useState(false);
    const [error, setError] = React.useState("");
    const [resolving, setResolving] = React.useState(false);
    const [stationId, setStationId] = React.useState(null);

    // Điều kiện chỉ hiển thị khi đã kết thúc phiên sạc:
    const endedAt = endData?.endedAt ? new Date(endData.endedAt) : null;
    const canRate = Boolean(endedAt);

    // Id liên quan (thô từ endData)
    const rawStationId = Number(
        endData?.stationId ?? endData?.StationId ?? endData?.port?.stationId
    );
    const chargerId = Number(
        endData?.chargerId ?? endData?.ChargerId ?? endData?.charger?.chargerId
    );
    const portId = Number(
        endData?.portId ?? endData?.PortId ?? endData?.port?.portId
    );

    // Khóa chống gửi trùng trên phiên
    const dedupKey = React.useMemo(() => {
        const oid =
            orderId ?? endData?.orderId ?? endData?.OrderId ?? endData?.id;
        return oid ? `feedback:done:${oid}` : null;
    }, [orderId, endData]);

    React.useEffect(() => {
        if (dedupKey) {
            const flag = sessionStorage.getItem(dedupKey);
            if (flag === "1") setDone(true);
        }
    }, [dedupKey]);

    // Resolve stationId:
    React.useEffect(() => {
        if (!canRate) return;
        setError("");
        // 1) Nếu hóa đơn đã có stationId hợp lệ -> dùng luôn
        if (Number.isFinite(rawStationId) && rawStationId > 0) {
            setStationId(rawStationId);
            return;
        }
        // 2) Thử resolve từ portId / chargerId qua API (nếu có)
        const token = getTokenFromStorage();
        const headers = { accept: "application/json" };
        if (token) headers.authorization = `Bearer ${token}`;
        const tryFetch = async () => {
            if (!base) return;
            setResolving(true);
            try {
                // Ưu tiên port -> station
                if (Number.isFinite(portId) && portId > 0) {
                    const r = await fetch(
                        `${base}/Ports/${encodeURIComponent(String(portId))}`,
                        { headers }
                    );
                    if (r.ok) {
                        const j = await r.json().catch(() => null);
                        const sid = Number(
                            j?.stationId ??
                                j?.StationId ??
                                j?.station?.stationId ??
                                j?.station?.id
                        );
                        if (Number.isFinite(sid) && sid > 0) {
                            setStationId(sid);
                            return;
                        }
                    }
                }
                // Fallback: charger -> station
                if (Number.isFinite(chargerId) && chargerId > 0) {
                    const r = await fetch(
                        `${base}/Chargers/${encodeURIComponent(String(chargerId))}`,
                        { headers }
                    );
                    if (r.ok) {
                        const j = await r.json().catch(() => null);
                        const sid = Number(
                            j?.stationId ??
                                j?.StationId ??
                                j?.station?.stationId ??
                                j?.station?.id
                        );
                        if (Number.isFinite(sid) && sid > 0) {
                            setStationId(sid);
                            return;
                        }
                    }
                }
                // Không resolve được
                setStationId(null);
            } catch (e) {
                // im lặng, chỉ set trạng thái
                setStationId(null);
            } finally {
                setResolving(false);
            }
        };
        tryFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canRate, rawStationId, portId, chargerId, base]);

    if (!canRate) return null; // Chỉ hiện khi đã có endedAt

    const handlePick = (n) => {
        setRating(n);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Không bắt buộc trước đây, nhưng BE đang require Comment => validate rõ ràng phía client
        if (!rating || rating < 1) {
            setError("Hãy chọn số sao bạn muốn đánh giá.");
            return;
        }

        const trimmedComment = comment.trim();
        if (!trimmedComment) {
            setError("Vui lòng nhập nhận xét (ít nhất 1 ký tự).");
            return;
        }

        // Chắn chắn: không có stationId thì không gửi để tránh 500
        if (!Number.isFinite(stationId) || stationId <= 0) {
            setError(
                "Không xác định được trạm sạc từ dữ liệu hóa đơn, nên chưa thể gửi đánh giá. Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
            );
            return;
        }

        // Chuẩn bị payload
        const payload = {
            customerId: getCustomerIdFromStorage() || 0,
            stationId: stationId,
            chargerId: Number.isFinite(chargerId) ? chargerId : 0,
            portId: Number.isFinite(portId) ? portId : 0,
            rating: rating,
            comment: trimmedComment,
        };

        const token = getTokenFromStorage();
        const headers = {
            accept: "*/*",
            "Content-Type": "application/json",
        };
        if (token) headers.authorization = `Bearer ${token}`;

        setLoading(true);
        try {
            const res = await fetch(`${base}/feedbacks`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let userMessage = "";
                let rawText = "";
                let data = null;

                const contentType = res.headers.get("content-type") || "";

                // Thử parse JSON trước
                if (contentType.includes("application/json")) {
                    data = await res.json().catch(() => null);
                } else {
                    rawText = await res.text().catch(() => "");
                }

                // Ưu tiên các lỗi validation (400)
                if (res.status === 400 && data?.errors) {
                    // Lỗi comment (trùng case bạn thấy ở trên)
                    if (data.errors.Comment) {
                        userMessage =
                            "Nhận xét chưa hợp lệ. Vui lòng nhập nhận xét (ít nhất 1 ký tự).";
                    } else {
                        userMessage =
                            "Thông tin đánh giá chưa hợp lệ. Vui lòng kiểm tra lại và thử gửi lại.";
                    }
                } else if (
                    (rawText && /Station/i.test(rawText)) ||
                    (data?.title && /Station/i.test(data.title))
                ) {
                    // Case lỗi Station không tồn tại, map lại message cho dễ hiểu
                    userMessage =
                        "Không tìm thấy trạm sạc tương ứng. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.";
                } else if (res.status === 401 || res.status === 403) {
                    userMessage =
                        "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại rồi gửi đánh giá.";
                } else if (res.status >= 500) {
                    userMessage =
                        "Hệ thống đang gặp sự cố, vui lòng thử lại sau.";
                } else {
                    // Fallback chung (không show raw JSON nữa)
                    userMessage =
                        "Không gửi được đánh giá. Vui lòng thử lại sau.";
                }

                throw new Error(userMessage);
            }

            setDone(true);
            if (dedupKey) sessionStorage.setItem(dedupKey, "1");
        } catch (err) {
            setError(err?.message || "Không gửi được đánh giá. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="bp-panel" style={{ marginTop: 16 }}>
            <div className="bp-title">Đánh giá trải nghiệm</div>

            {done ? (
                <div className="bp-hint">
                    Cảm ơn bạn! Đánh giá của bạn đã được ghi nhận.
                </div>
            ) : (
                <>
                    {!Number.isFinite(stationId) || stationId <= 0 ? (
                        <div
                            className="bp-hint"
                            style={{ marginBottom: 8 }}
                        >
                            {resolving
                                ? "Đang xác định trạm từ dữ liệu phiên sạc…"
                                : "Không xác định được trạm từ dữ liệu hóa đơn, chưa thể gửi đánh giá."}
                        </div>
                    ) : null}
                    <form onSubmit={handleSubmit}>
                        {/* Hàng chọn sao */}
                        <div
                            className="bp-review"
                            style={{ alignItems: "center" }}
                        >
                            <div>
                                <div
                                    className="bp-review-head"
                                    style={{ gap: 8 }}
                                >
                                    <b>Chọn số sao</b>
                                    <span>{renderStarsEmoji(rating)}</span>
                                </div>

                                <div
                                    className="bp-star-row"
                                    style={{ marginTop: 6 }}
                                >
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            className={`bp-btn-secondary ${
                                                n === rating ? "is-active" : ""
                                            }`}
                                            onClick={() => handlePick(n)}
                                            aria-pressed={n === rating}
                                        >
                                            {"⭐️"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Ghi chú */}
                        <div style={{ marginTop: 12 }}>
                            <label
                                className="bp-subtle"
                                style={{
                                    display: "block",
                                    marginBottom: 6,
                                }}
                            >
                                Nhận xét
                                <span style={{ color: "red" }}> *</span>
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                                className="fb-textarea"
                                placeholder="Chia sẻ nhanh về phiên sạc của bạn…"
                                style={{ width: "100%" }}
                            />
                        </div>

                        {error && (
                            <div
                                className="error-text"
                                style={{ marginTop: 8 }}
                            >
                                {error}
                            </div>
                        )}

                        {/* Action */}
                        <div
                            style={{
                                marginTop: 10,
                                display: "flex",
                                gap: 8,
                            }}
                        >
                            <button
                                className="bp-btn-secondary"
                                type="button"
                                onClick={() => setDone(true)}
                            >
                                Bỏ qua
                            </button>
                            <button
                                className="bp-btn-secondary"
                                type="submit"
                                disabled={
                                    loading ||
                                    !Number.isFinite(stationId) ||
                                    stationId <= 0
                                }
                                aria-busy={loading}
                            >
                                {loading ? "Đang gửi…" : "Gửi đánh giá"}
                            </button>
                        </div>
                    </form>

                    {(endData?.chargerCode || endData?.portCode) && (
                        <div
                            className="bp-subtle"
                            style={{ marginTop: 8 }}
                        >
                            {endData?.chargerCode
                                ? `Trụ: ${endData.chargerCode}`
                                : ""}
                            {endData?.portCode
                                ? ` • Cổng: ${endData.portCode}`
                                : ""}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
