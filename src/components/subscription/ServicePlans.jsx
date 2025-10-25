import React, { useEffect, useMemo, useState } from "react";
import { CheckCircleFilled, ArrowUpOutlined } from "@ant-design/icons";
import { message, Modal, Switch } from "antd";
import "./ServicePlans.css";
import MainLayout from "../../layouts/MainLayout";
import { getApiBase, fetchAuthJSON } from "../../utils/api";
import { useNavigate } from "react-router-dom";

// ==================== Helpers ====================
function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";
const CREATE_SUBS_API = `${API_ABS}/Subscriptions`;

function vnd(n) {
  return (Number(n) || 0).toLocaleString("vi-VN") + " ₫";
}
function normalizeMonthlyPriceVND(priceMonthly) {
  if (priceMonthly < 10000) return priceMonthly * 1000;
  return priceMonthly;
}

// ===== Date utils (FE tự tính) =====
function addMonths(d, months) {
  const dt = new Date(d.getTime());
  const targetMonth = dt.getMonth() + months;
  const day = dt.getDate();
  dt.setDate(1);
  dt.setMonth(targetMonth);
  const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(day, lastDay));
  return dt;
}
function toIsoLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds())
  );
}
function toDisplay(d) {
  return d.toLocaleString("vi-VN", { hour12: false });
}

// ===== JWT helpers =====
function getToken() {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload || "{}");
  } catch {
    return {};
  }
}

// ===== Actor/Plan audience helpers =====
function rolesFromToken(p) {
  const r1 = p?.role;
  const r2 = p?.roles;
  if (Array.isArray(r1)) return r1.map(String);
  if (typeof r1 === "string") return [r1];
  if (Array.isArray(r2)) return r2.map(String);
  return [];
}

function planAudience(plan) {
  const cate = String(plan?.category || "").toLowerCase();
  if (plan?.isForCompany === true || cate === "business") return "company";
  return "customer";
}

/** Trả về "company" | "customer" | null */
async function resolveActorType() {
  // 1) /Auth
  try {
    const me = await fetchAuthJSON(`${API_ABS}/Auth`, { method: "GET" });
    const d = me?.data || me;
    if (safeNum(d?.companyId) != null || d?.isCompany === true) return "company";
    if (safeNum(d?.customerId) != null) return "customer";

    const t = getToken();
    if (t) {
      const p = decodeJwtPayload(t);
      const roles = rolesFromToken(p).map((s) => s.toLowerCase());
      if (roles.some((r) => ["company", "business", "enterprise", "admincompany"].includes(r))) return "company";
      if (roles.some((r) => ["customer", "user", "member"].includes(r))) return "customer";
      if (safeNum(p?.companyId) != null) return "company";
      if (safeNum(p?.customerId) != null) return "customer";
    }
  } catch {}

  // 2) /Companies/me
  try {
    const cm = await fetchAuthJSON(`${API_ABS}/Companies/me`, { method: "GET" });
    if (safeNum((cm?.data || cm)?.companyId) != null) return "company";
  } catch {}

  // 3) /Customers/me
  try {
    const cs = await fetchAuthJSON(`${API_ABS}/Customers/me`, { method: "GET" });
    if (safeNum((cs?.data || cs)?.customerId) != null) return "customer";
  } catch {}

  // 4) Token fallback
  try {
    const t = getToken();
    if (t) {
      const p = decodeJwtPayload(t);
      if (safeNum(p?.companyId) != null) return "company";
      if (safeNum(p?.customerId) != null) return "customer";
    }
  } catch {}

  return null;
}

/** Kiểm tra có được đăng ký gói này không; trả về true/false */
async function ensurePlanAllowed(plan, msgApi) {
  const actor = await resolveActorType();
  const audience = planAudience(plan);

  if (!actor) {
    msgApi.warning("Không xác định được loại tài khoản. Sẽ kiểm tra lại khi xác nhận.");
    return true; // cho qua bước mở modal; sẽ chặn thêm ở confirm
  }

  if (actor === "customer" && audience === "company") {
    msgApi.error("Tài khoản cá nhân không thể đăng ký gói dành cho doanh nghiệp.");
    return false;
  }
  if (actor === "company" && audience === "customer") {
    msgApi.error("Tài khoản doanh nghiệp không thể đăng ký gói dành cho cá nhân.");
    return false;
  }
  return true;
}


// ====== Robust CustomerId Resolver (đã chuẩn hoá) ======
function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function pickCustomerIdFrom(obj) {
  if (!obj || typeof obj !== "object") return null;
  const keys = [
    "customerId",
    "CustomerId",
    "custId",
    "custID",
    "customer_id",
    "cust_id",
    "id",
    "userId",
    "sub",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
  ];
  for (const k of keys) {
    const v = obj[k];
    const n = safeNum(v);
    if (n != null) return n;
  }
  return null;
}

/**
 * Cố gắng xác định customerId theo nhiều nguồn:
 * - /Auth
 * - Token (customerId/sub)
 * - /Customers/by-account/{accountId}
 * - /Customers/me
 * - local/session storage
 */
async function resolveCustomerIdSmart() {
  // 1) /Auth
  try {
    const meRes = await fetchAuthJSON(`${API_ABS}/Auth`, { method: "GET" });
    const try1 = pickCustomerIdFrom(meRes?.data) ?? pickCustomerIdFrom(meRes);
    if (try1 != null) return try1;
  } catch {}

  // 2) Token
  try {
    const t = getToken();
    if (t) {
      const p = decodeJwtPayload(t);

      // Nếu token có customerId trực tiếp
      const fromTokenCust = pickCustomerIdFrom(p);
      if (fromTokenCust != null) return fromTokenCust;

      // Nếu token chỉ có accountId (sub) → gọi by-account
      const accountId = safeNum(
        p?.sub ??
          p?.[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
          ]
      );
      if (accountId != null) {
        try {
          const r1 = await fetchAuthJSON(
            `${API_ABS}/Customers/by-account/${accountId}`,
            { method: "GET" }
          );
          const tryByAcc = pickCustomerIdFrom(r1?.data) ?? pickCustomerIdFrom(r1);
          if (tryByAcc != null) return tryByAcc;
        } catch {}
      }
    }
  } catch {}

  // 3) /Customers/me
  try {
    const me = await fetchAuthJSON(`${API_ABS}/Customers/me`, { method: "GET" });
    const id1 = pickCustomerIdFrom(me?.data) ?? pickCustomerIdFrom(me);
    if (id1 != null) return id1;
  } catch {}

  // 4) Lưu tạm
  const stored =
    sessionStorage.getItem("customerId") || localStorage.getItem("customerId");
  if (stored && safeNum(stored) != null) return safeNum(stored);

  return null;
}

// ==================== Component ====================
const ServicePlans = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  const [businessPlans, setBusinessPlans] = useState([]);
  const [personalPlans, setPersonalPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== Modal state =====
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [startDateStr, setStartDateStr] = useState(""); // "YYYY-MM-DDTHH:mm"
  const [autoRenew, setAutoRenew] = useState(true);
  const billingCycle = "Monthly"; // hiện tại chỉ Monthly

  // Tự tính ngày dựa trên startDateStr
  const startDate = useMemo(() => {
    if (!startDateStr) return null;
    return new Date(startDateStr);
  }, [startDateStr]);

  const endDate = useMemo(() => {
    if (!startDate) return null;
    return addMonths(startDate, 1);
  }, [startDate]);

  const nextBillingDate = endDate; // Với Monthly, next = end

  // ===== Gọi API SubscriptionPlans =====
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const url = `${API_ABS}/SubscriptionPlans`;
        const data = await fetchAuthJSON(url, { method: "GET" });

        if (!alive) return;
        const biz = (data || []).filter(
          (p) =>
            p.isForCompany === true ||
            (p.category || "").toLowerCase() === "business"
        );
        const per = (data || []).filter(
          (p) =>
            p.isForCompany === false ||
            (p.category || "").toLowerCase() === "personal"
        );

        setBusinessPlans(biz);
        setPersonalPlans(per);
      } catch (e) {
        console.error("Fetch SubscriptionPlans error:", e);
        setError("Không tải được gói dịch vụ. Vui lòng thử lại.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ===== Handlers =====
  const handleYearClick = () => {
    msgApi.info("⚙️ Chức năng thanh toán theo năm đang được cập nhật!");
  };

  const subtitleOf = (plan) => plan.description || "";
  const benefitOf = (plan) => plan.benefits || plan.description || "";

  // ✅ Mở modal trực tiếp khi bấm "Nâng cấp"
  const handleUpgradeOpen = (plan) => {
    setSelectedPlan(plan);
    const now = new Date();
    const toLocalInput = (d) => {
      const pad = (n) => String(n).padStart(2, "0");
      return (
        d.getFullYear() +
        "-" +
        pad(d.getMonth() + 1) +
        "-" +
        pad(d.getDate()) +
        "T" +
        pad(d.getHours()) +
        ":" +
        pad(d.getMinutes())
      );
    };
    setStartDateStr(toLocalInput(now));
    setAutoRenew(true);
    setOpen(true);
  };

  // ===== Tạo subscription rồi chuyển Payment khi bấm "Xác nhận" =====
  const createSubscription = async (plan) => {
    const jwt =
      (typeof getToken === "function" && getToken()) ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!jwt) throw new Error("Bạn chưa đăng nhập (không có token).");

    const customerId = await resolveCustomerIdSmart();
    if (!customerId) throw new Error("Không tìm thấy Customer cho tài khoản hiện tại.");

    const body = {
      customerId,
      subscriptionPlanId: plan.subscriptionPlanId,
    };

    const res = await fetchAuthJSON(`${API_ABS}/Subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return res; // kỳ vọng có res.subscriptionId
  };

  const handleConfirmCreate = async () => {
    try {
      if (!selectedPlan || !startDate) {
        msgApi.error("Thiếu thông tin gói hoặc ngày bắt đầu.");
        return;
      }

      // 1) Tạo subscription “chuẩn”
      const sub = await createSubscription(selectedPlan);

      // 2) Đóng modal + báo thành công
      setOpen(false);
      msgApi.success("Đã tạo thuê bao. Chuyển sang trang thanh toán…");

      // 3) Điều hướng sang trang thanh toán
      if (sub?.subscriptionId) {
        navigate("/payment", {
          state: {
            plan: selectedPlan,
            subscriptionId: sub.subscriptionId,
            // Gửi theo thời gian để PaymentPage có thể hiển thị
            startDate: toIsoLocal(startDate),
            autoRenew: !!autoRenew,
            billingCycle,
          },
        });
      } else {
        // fallback nếu BE chưa trả id
        navigate("/payment", {
          state: {
            plan: selectedPlan,
            startDate: toIsoLocal(startDate),
            autoRenew: !!autoRenew,
            billingCycle,
          },
        });
      }
    } catch (e) {
      console.error("Create subscription error:", e);
      msgApi.error(e?.message || "Tạo thuê bao thất bại. Vui lòng thử lại.");
    }
  };

  // ==================== Render ====================
  return (
    <MainLayout>
      {contextHolder}

      <div className="service-page">
        {/* Header */}
        <h2 className="title">Sạc thoải mái – Chi phí nhẹ nhàng</h2>
        <p className="subtitle">Gói sạc linh hoạt, ưu đãi giá tốt cho mọi chuyến đi</p>

        {/* Toggle thanh toán */}
        <div className="section">
          <div className="toggle">
            <button className="toggle-btn active">Tháng</button>
            <button className="toggle-btn" onClick={handleYearClick}>
              Năm
            </button>
          </div>
        </div>

        {/* Gói doanh nghiệp */}
        <section className="section">
          <h3 className="section-title">Gói Thuê Bao Dành Cho Doanh Nghiệp</h3>
          {loading ? (
            <p>Đang tải gói doanh nghiệp...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
            <div className="card-container">
              {businessPlans.length > 0 ? (
                businessPlans.map((plan) => (
                  <div className="card" key={plan.subscriptionPlanId}>
                    <p className="name">{plan.planName}</p>
                    <p className="price">
                      {vnd(normalizeMonthlyPriceVND(plan.priceMonthly))}/tháng
                    </p>
                    <p className="muted">{subtitleOf(plan)}</p>
                    <p>{benefitOf(plan)}</p>
                    <button className="upgrade-btn" onClick={() => handleUpgradeOpen(plan)}>
                      <ArrowUpOutlined /> Nâng cấp
                    </button>
                  </div>
                ))
              ) : (
                <p>Chưa có gói doanh nghiệp.</p>
              )}
            </div>
          )}
        </section>

        {/* Gói cá nhân */}
        <section className="section">
          <h3 className="section-title">Gói Cước Dành Cho Cá Nhân</h3>
          {loading ? (
            <p>Đang tải gói cá nhân...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
            <div className="card-container">
              {personalPlans.length > 0 ? (
                personalPlans.map((plan) => (
                  <div className="card" key={plan.subscriptionPlanId}>
                    <h4>{plan.planName}</h4>
                    <p className="price">
                      {vnd(normalizeMonthlyPriceVND(plan.priceMonthly))}/tháng
                    </p>
                    <p className="muted">{subtitleOf(plan)}</p>
                    <p>{benefitOf(plan)}</p>
                    <button className="upgrade-btn" onClick={() => handleUpgradeOpen(plan)}>
                      <CheckCircleFilled /> Nâng cấp
                    </button>
                  </div>
                ))
              ) : (
                <p>Chưa có gói cá nhân.</p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ===== Modal Xem Trước / Xác Nhận ===== */}
      <Modal
        centered
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleConfirmCreate}
        okText="Xác nhận"
        cancelText="Hủy"
        title="Xác nhận đăng ký gói"
      >
        {!selectedPlan ? (
          <p>Không có dữ liệu gói.</p>
        ) : (
          <div className="subs-preview">
            <div className="row">
              <span>Gói:</span>
              <strong>{selectedPlan.planName}</strong>
            </div>
            <div className="row">
              <span>Giá / tháng:</span>
              <strong>{vnd(normalizeMonthlyPriceVND(selectedPlan.priceMonthly))}</strong>
            </div>

            <div className="row">
              <span>Chu kỳ:</span>
              <strong>{billingCycle}</strong>
            </div>

            <div className="row">
              <span>Bắt đầu từ:</span>
              <input
                type="datetime-local"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div className="row">
              <span>Ngày kết thúc (FE tính):</span>
              <strong>{endDate ? toDisplay(endDate) : "—"}</strong>
            </div>

            <div className="row">
              <span>Ngày gia hạn tiếp theo (FE tính):</span>
              <strong>{nextBillingDate ? toDisplay(nextBillingDate) : "—"}</strong>
            </div>

            <div className="row">
              <span>Tự động gia hạn:</span>
              <Switch checked={autoRenew} onChange={setAutoRenew} />
              <span style={{ marginLeft: 8 }}>{autoRenew ? "Bật" : "Tắt"}</span>
            </div>

            <p className="muted" style={{ marginTop: 12 }}>
              * Lưu ý: Các mốc thời gian trên do FE tự tính dựa trên ngày bắt đầu và chu kỳ
              <b> Monthly</b>. Khi xác nhận, hệ thống sẽ tạo đăng ký và chuyển sang thanh toán.
            </p>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
};

export default ServicePlans;
