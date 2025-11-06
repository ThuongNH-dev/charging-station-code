// src/pages/service/ServicePlans.jsx
import React, { useEffect, useMemo, useState } from "react";
import { CheckCircleFilled, ArrowUpOutlined } from "@ant-design/icons";
import { message, Modal, Switch } from "antd";
import "./ServicePlans.css";
import MainLayout from "../../layouts/MainLayout";
import { getApiBase, fetchAuthJSON } from "../../utils/api";
import { useNavigate } from "react-router-dom";

/* ==================== API base ==================== */
function normalizeApiBase(raw) {
  const s = (raw || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  if (/\/api$/i.test(s)) return s;
  return s + "/api";
}
function getApiBaseAbs() {
  const raw = (getApiBase() || "").trim();
  if (!raw) return "https://localhost:7268/api";
  if (/^https?:\/\//i.test(raw)) return normalizeApiBase(raw);
  if (raw.startsWith("/")) return "https://localhost:7268/api";
  return "https://localhost:7268/api";
}
const API_ABS = getApiBaseAbs();

/* ==================== Money / date helpers ==================== */
function vnd(n) {
  return (Number(n) || 0).toLocaleString("vi-VN") + " ₫";
}
function normalizeMonthlyPriceVND(priceMonthly) {
  if (priceMonthly < 10000) return priceMonthly * 1000;
  return priceMonthly;
}
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
function toDisplay(d) {
  return d.toLocaleString("vi-VN", { hour12: false });
}

/* ==================== Identity helpers (no network) ==================== */
function getStoredNumber(key) {
  try {
    const v = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
function getStoredCustomerId() {
  return getStoredNumber("customerId");
}
function getStoredCompanyId() {
  return getStoredNumber("companyId");
}
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
function getStoredUser() {
  try {
    const raw =
      localStorage.getItem("user") || sessionStorage.getItem("user") || "";
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function getRoleFromStorage() {
  const u = getStoredUser();
  return (u?.role || "").toString() || "Customer";
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
function getCustomerIdFromToken() {
  const p = decodeJwtPayload(getToken());
  const n = Number(p?.customerId ?? p?.CustomerId ?? p?.customer_id);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function getCompanyIdFromToken() {
  const p = decodeJwtPayload(getToken());
  const n = Number(
    p?.companyId ??
    p?.CompanyId ??
    p?.tenantId ??
    p?.company?.companyId ??
    p?.company?.id
  );
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Vai actor = 'company' | 'customer' (CHỈ theo role) */
function resolveActorTypeSync() {
  const role = (getRoleFromStorage() || "Customer").toString().toLowerCase();
  return role === "company" ? "company" : "customer";
}
async function resolveActorType() {
  return resolveActorTypeSync();
}
async function resolveCustomerIdSmart() {
  const role = (getRoleFromStorage() || "").toString().toLowerCase();
  if (role === "company") return null;
  return getStoredCustomerId() ?? null;
}
async function resolveCompanyIdSmart() {
  const role = (getRoleFromStorage() || "").toString().toLowerCase();
  return role === "company" ? getStoredCompanyId() ?? null : null;
}

/* ==================== Audience helpers ==================== */
function planAudience(plan) {
  const cate = String(plan?.category || "").toLowerCase();
  if (plan?.isForCompany === true || cate === "business") return "company";
  return "customer";
}
async function ensurePlanAllowed(plan, msgApi) {
  const actor = await resolveActorType(); // 'company' | 'customer'
  const audience = planAudience(plan);
  if (actor === "customer" && audience === "company") {
    msgApi.error("Tài khoản cá nhân không thể đăng ký gói dành cho doanh nghiệp.");
    return false;
  }
  if (actor === "company" && audience === "customer") {
    msgApi.error("Tài khoản doanh nghiệp không thể đăng ký gói cá nhân.");
    return false;
  }
  return true;
}

/* ==================== Clean/format helpers for UI ==================== */
function cleanText(x) {
  const s = String(x ?? "").trim();
  if (!s) return "";
  // Dữ liệu seed BE đôi khi trả "string" -> coi như trống
  if (s.toLowerCase() === "string") return "";
  return s;
}

/** Trả về mảng lợi ích hiển thị (lọc trống) */
function featureListOf(plan) {
  const items = [];

  const desc = cleanText(plan?.description);
  const bene = cleanText(plan?.benefits);

  // Tách lợi ích theo ngắt dòng / ; / •
  const splitToList = (s) =>
    s
      .split(/\r?\n|;|•/g)
      .map((x) => cleanText(x))
      .filter(Boolean);

  if (desc) items.push(...splitToList(desc));
  if (bene) items.push(...splitToList(bene));

  // Gộp thêm ưu đãi có cấu trúc từ số liệu
  const freeIdle = Number(plan?.freeIdleMinutes);
  if (Number.isFinite(freeIdle) && freeIdle > 0) {
    items.push(`Miễn phí chờ ${freeIdle} phút mỗi phiên`);
  }
  const discount = Number(plan?.discountPercent);
  if (Number.isFinite(discount) && discount > 0) {
    items.push(`Giảm ${discount}% khi thanh toán đủ điều kiện`);
  }

  // Loại trùng (case-insensitive)
  const seen = new Set();
  const uniq = [];
  for (const it of items) {
    const k = it.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(it);
    }
  }
  return uniq;
}

/* ==================== Component ==================== */
const ServicePlans = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  const [businessPlans, setBusinessPlans] = useState([]);
  const [personalPlans, setPersonalPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [startDateStr, setStartDateStr] = useState(""); // "YYYY-MM-DDTHH:mm"
  const [autoRenew, setAutoRenew] = useState(true);
  const billingCycle = "Monthly";

  const startDate = useMemo(() => {
    if (!startDateStr) return null;
    return new Date(startDateStr);
  }, [startDateStr]);

  const endDate = useMemo(() => {
    if (!startDate) return null;
    return addMonths(startDate, 1);
  }, [startDate]);

  const nextBillingDate = endDate;

  // ===== Fetch plans
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const url = `${API_ABS}/SubscriptionPlans`;
        console.debug("[ServicePlans] GET plans url =", url);
        const data = await fetchAuthJSON(url, { method: "GET" });

        if (!alive) return;

        const list = Array.isArray(data) ? data : (data?.data ?? []);
        const biz = (list || []).filter(
          (p) =>
            p.isForCompany === true ||
            String(p.category || "").toLowerCase() === "business"
        );
        const per = (list || []).filter(
          (p) =>
            p.isForCompany === false ||
            ["individual", "personal"].includes(
              String(p.category || "").toLowerCase()
            )
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

  const handleYearClick = () => {
    msgApi.info("⚙️ Chức năng thanh toán theo năm đang được cập nhật!");
  };

  // ===== Open modal
  const handleUpgradeOpen = async (plan) => {
    try {
      const ok = await ensurePlanAllowed(plan, msgApi);
      if (!ok) return;

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
    } catch (e) {
      console.error("handleUpgradeOpen error:", e);
      msgApi.error(e?.message || "Không thể kiểm tra quyền đăng ký gói.");
    }
  };

  /* ==================== Create subscription ==================== */
  const createSubscription = async (plan) => {
    const jwt =
      (typeof getToken === "function" && getToken()) ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");
    if (!jwt) throw new Error("Bạn chưa đăng nhập hoặc token đã hết hạn.");

    const actor = await resolveActorType();
    const customerId = await resolveCustomerIdSmart();
    const companyId = await resolveCompanyIdSmart();

    const body = { subscriptionPlanId: plan.subscriptionPlanId };
    if (actor === "company") {
      if (!companyId) throw new Error("Thiếu companyId để đăng ký gói doanh nghiệp.");
      body.companyId = companyId;
    } else {
      if (!customerId) throw new Error("Thiếu customerId để đăng ký gói cá nhân.");
      body.customerId = customerId;
    }

    console.debug("[ServicePlans] createSubscription BODY =", body);

    const res = await fetchAuthJSON(`${API_ABS}/Subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return res; // kỳ vọng có subscriptionId
  };

  /* ==================== Create invoice for subscription ==================== */
  async function createInvoiceForSubscription({ subscriptionId, plan, startDate }) {
    if (!subscriptionId) throw new Error("Thiếu subscriptionId để tạo hóa đơn.");

    const actor = await resolveActorType();
    const custId = await resolveCustomerIdSmart();
    const compId = await resolveCompanyIdSmart();

    let finalCustomerId = null;
    let finalCompanyId = null;
    if (actor === "company") finalCompanyId = compId;
    else finalCustomerId = custId;

    if (!finalCustomerId && !finalCompanyId) {
      throw new Error("Thiếu customerId/companyId: cần ít nhất 1 trong 2.");
    }

    const subtotal = normalizeMonthlyPriceVND(plan.priceMonthly);
    const tax = 0;
    const total = subtotal + tax;

    const baseDate = startDate instanceof Date ? startDate : new Date();
    const billMonth = baseDate.getMonth() + 1;
    const billYear = baseDate.getFullYear();

    const payload = {
      subscriptionId: Number(subscriptionId),
      billingMonth: billMonth,
      billingYear: billYear,
      subtotal,
      tax,
      total,
      notes: `Invoice for subscription #${subscriptionId} - plan ${plan.planName}`,
    };
    if (finalCustomerId) payload.customerId = finalCustomerId;
    if (finalCompanyId) payload.companyId = finalCompanyId;

    const res = await fetchAuthJSON(`${API_ABS}/Invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const resData = res?.data ?? res;
    const invoiceId = Number(resData?.invoiceId ?? resData?.InvoiceId ?? NaN);
    if (!Number.isFinite(invoiceId)) {
      throw new Error("Tạo hoá đơn thất bại: BE không trả về invoiceId.");
    }
    return { invoiceId, companyId: resData?.companyId ?? finalCompanyId ?? null };
  }

  /* ==================== Confirm flow ==================== */
  const handleConfirmCreate = async () => {
    try {
      if (!selectedPlan || !startDate) {
        msgApi.error("Thiếu thông tin gói hoặc ngày bắt đầu.");
        return;
      }

      // 1) tạo subscription
      const sub = await createSubscription(selectedPlan);
      console.debug("[ServicePlans] createSubscription RESPONSE =", sub);
      const subData = sub?.data ?? sub ?? {};
      const subscriptionId = Number(subData?.subscriptionId ?? subData?.id ?? 0);
      if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
        throw new Error("Tạo thuê bao thất bại: không nhận được subscriptionId.");
      }

      // 2) tạo invoice
      const created = await createInvoiceForSubscription({
        subscriptionId,
        plan: selectedPlan,
        startDate,
      });

      // 3) sang trang payment
      setOpen(false);
      msgApi.success("Đã tạo hoá đơn. Chuyển sang xác nhận thanh toán…");

      navigate("/payment", {
        state: {
          from: "service-plans",
          invoiceId: created.invoiceId,
          subscriptionId,
          companyId: created.companyId ?? null,
          presetAmount: normalizeMonthlyPriceVND(selectedPlan.priceMonthly),
        },
      });
    } catch (e) {
      console.error("Create subscription error:", e);
      msgApi.error(e?.message || "Tạo thuê bao/hoá đơn thất bại. Vui lòng thử lại.");
    }
  };

  /* ==================== Render ==================== */
  const PlanCard = ({ plan, business }) => {
    const price = vnd(normalizeMonthlyPriceVND(plan.priceMonthly));
    const feats = featureListOf(plan);

    return (
      <div className="card" key={plan.subscriptionPlanId}>
        {business ? <p className="name">{plan.planName}</p> : <h4>{plan.planName}</h4>}
        <p className="price">{price}/tháng</p>

        {/* LUÔN dùng danh sách, không dùng <p> rời */}
        <ul className="features" aria-label="Ưu đãi trong gói">
          {feats.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>

        <button className="upgrade-btn" onClick={() => handleUpgradeOpen(plan)}>
          {business ? <ArrowUpOutlined /> : <CheckCircleFilled />} Nâng cấp
        </button>
      </div>
    );
  };


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
                  <PlanCard key={plan.subscriptionPlanId} plan={plan} business />
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
                  <PlanCard key={plan.subscriptionPlanId} plan={plan} />
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
              * Lưu ý: Các mốc thời gian trên do FE tự tính dựa trên ngày bắt đầu và
              chu kỳ <b>Monthly</b>. Khi xác nhận, hệ thống sẽ tạo đăng ký và chuyển
              sang thanh toán.
            </p>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
};

export default ServicePlans;
