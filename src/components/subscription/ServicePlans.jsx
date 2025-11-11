import React, { useEffect, useMemo, useState } from "react";
import { CheckCircleFilled, ArrowUpOutlined } from "@ant-design/icons";
import { message, Modal, Switch } from "antd";
import "./ServicePlans.css";
import MainLayout from "../../layouts/MainLayout";
import { getApiBase, fetchAuthJSON } from "../../utils/api";
import { useNavigate } from "react-router-dom";

/* ==================== API base ==================== */
function getApiBaseAbs() {
  const raw = (getApiBase() || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
  if (raw.startsWith("/")) return "https://localhost:7268/api";
  return "https://localhost:7268/api";
}
const API_ABS = getApiBaseAbs();

/* ==================== Money / date helpers ==================== */
function vnd(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("vi-VN") + " ₫";
}
function normalizeMonthlyPriceVND(priceMonthly) {
  const p = Number(priceMonthly) || 0;
  if (p > 0 && p < 10000) return p * 1000; // BE có thể trả theo nghìn
  return p;
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
function getStoredCustomerId() { return getStoredNumber("customerId"); }
function getStoredCompanyId() { return getStoredNumber("companyId"); }
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
/** 'company' | 'customer' (chỉ theo role) */
function resolveActorTypeSync() {
  const role = (getRoleFromStorage() || "Customer").toString().toLowerCase();
  return role === "company" ? "company" : "customer";
}
async function resolveActorType() { return resolveActorTypeSync(); }
async function resolveCustomerIdSmart() {
  const role = (getRoleFromStorage() || "").toString().toLowerCase();
  if (role === "company") return null;
  return getStoredCustomerId() ?? getCustomerIdFromToken() ?? null;
}
async function resolveCompanyIdSmart() {
  const role = (getRoleFromStorage() || "").toString().toLowerCase();
  return role === "company"
    ? getStoredCompanyId() ?? getCompanyIdFromToken() ?? null
    : null;
}

/* ==================== Audience helpers ==================== */
function planAudience(plan) {
  const cate = String(plan?.category || "").toLowerCase();
  if (plan?.isForCompany === true || cate === "business") return "company";
  return "customer";
}
async function ensurePlanAllowed(plan, msgApi) {
  const actor = await resolveActorType();
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

/* ==================== Helpers: định dạng quyền lợi ==================== */
function cleanText(s) {
  const t = (s || "").toString().trim();
  if (!t) return "";
  const low = t.toLowerCase();
  if (low === "string" || t === "-" || t === "•" || t === ".") return "";
  return t.replace(/\s+/g, " ");
}

function splitLines(raw) {
  if (!raw) return [];
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\|/g, "\n")
    .split("\n")
    .map(cleanText)
    .filter(Boolean);
}

function uniqSoft(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const key = s.toLowerCase().replace(/\s+/g, " ").trim();
    if (!seen.has(key)) { seen.add(key); out.push(s); }
  }
  return out;
}

/** Build bullet lines từ benefits + các field khác của plan (nối chuỗi) */
function benefitLines(plan) {
  const lines = [];

  // 1) Tách từ benefits (nếu có)
  lines.push(...splitLines(plan?.benefits));

  // 2) Nếu benefits rỗng, có thể lấy mô tả làm 1 dòng “gợi ý”
  const desc = cleanText(plan?.description);
  if (!lines.length && desc) lines.push(desc);

  // 3) Nối chuỗi từ các field khác trong DB (ví dụ giảm giá, phút chờ…)
  const freeIdle = Number(plan?.freeIdleMinutes ?? 0);
  if (Number.isFinite(freeIdle) && freeIdle > 0) {
    lines.push(`Miễn phí chờ ${freeIdle} phút mỗi phiên`);
  }

  const discount = Number(plan?.discountPercent ?? 0);
  if (Number.isFinite(discount) && discount > 0) {
    // ví dụ bạn yêu cầu: “giảm giá x% là x lấy từ DB”
    lines.push(`Giảm ${discount}% khi thanh toán đủ điều kiện`);
  }

  // 4) (Tuỳ chọn) Nối thêm rule cho nhóm đối tượng
  const cate = String(plan?.category || "").toLowerCase();
  if (plan?.isForCompany === true || cate === "business") {
    // có thể thêm thông tin dành riêng cho doanh nghiệp nếu muốn
    // lines.push("Ưu tiên hỗ trợ doanh nghiệp");
  }

  // 5) Loại trùng “mềm”
  return uniqSoft(lines);
}

function subtitleOf(plan) {
  return cleanText(plan?.description);
}

/* ==================== Component ==================== */
const ServicePlans = () => {
  const [msgApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  const [businessPlans, setBusinessPlans] = useState([]);
  const [personalPlans, setPersonalPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [startDateStr, setStartDateStr] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const billingCycle = "Monthly";

  const startDate = useMemo(() => (startDateStr ? new Date(startDateStr) : null), [startDateStr]);
  const endDate = useMemo(() => (startDate ? addMonths(startDate, 1) : null), [startDate]);
  const nextBillingDate = endDate;

  // Fetch plans
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const url = `${API_ABS}/SubscriptionPlans`;
        const data = await fetchAuthJSON(url, { method: "GET" });
        if (!alive) return;

        const arr = Array.isArray(data) ? data : [];
        const biz = arr.filter(
          (p) =>
            p.isForCompany === true ||
            String(p.category || "").toLowerCase() === "business"
        );
        const per = arr.filter(
          (p) =>
            p.isForCompany === false ||
            ["personal", "individual"].includes(String(p.category || "").toLowerCase())
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
    return () => { alive = false; };
  }, []);

  const handleYearClick = () => {
    msgApi.info("⚙️ Chức năng thanh toán theo năm đang được cập nhật!");
  };

  const handleUpgradeOpen = async (plan) => {
    try {
      const ok = await ensurePlanAllowed(plan, msgApi);
      if (!ok) return;

      setSelectedPlan(plan);
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const toLocalInput = (d) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`;
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
    if (!jwt) throw new Error("Bạn chưa đăng nhập (không có token).");

    const actor = await resolveActorType();
    const customerId = await resolveCustomerIdSmart();
    const companyId = await resolveCompanyIdSmart();

    const body = { subscriptionPlanId: plan.subscriptionPlanId ?? plan.id };
    if (actor === "company") {
      if (!companyId) throw new Error("Thiếu companyId để đăng ký gói doanh nghiệp.");
      body.companyId = companyId;
    } else {
      if (!customerId) throw new Error("Thiếu customerId để đăng ký gói cá nhân.");
      body.customerId = customerId;
    }

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
      notes: `Invoice for subscription #${subscriptionId} - plan ${plan.planName || plan.id}`,
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
      const sub = await createSubscription(selectedPlan);
      const subscriptionId = Number(sub?.subscriptionId ?? sub?.id ?? 0);
      if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
        throw new Error("Tạo thuê bao thất bại: không nhận được subscriptionId.");
      }

      const created = await createInvoiceForSubscription({
        subscriptionId,
        plan: selectedPlan,
        startDate,
      });

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

  /* ==================== UI ==================== */
  const renderBenefits = (plan) => {
    const lines = benefitLines(plan);
    if (lines.length === 0) return null; // ❗ Không có dữ liệu thì không hiện chấm

    return (
      <ul className="benefit-list">
        {lines.map((text, idx) => (
          <li key={idx}>
            <span className="benefit-dot" aria-hidden="true" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <MainLayout>
      {contextHolder}

      <div className="service-page">
        <h2 className="title">Sạc thoải mái – Chi phí nhẹ nhàng</h2>
        <p className="subtitle">Gói sạc linh hoạt, ưu đãi giá tốt cho mọi chuyến đi</p>

        <div className="section">
          <div className="toggle">
            <button className="toggle-btn active">Tháng</button>
            <button className="toggle-btn" onClick={handleYearClick}>Năm</button>
          </div>
        </div>

        {/* Doanh nghiệp */}
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
                  <div className="card" key={plan.subscriptionPlanId ?? plan.id}>
                    <p className="name">{plan.planName}</p>
                    <p className="price-service">
                      {vnd(normalizeMonthlyPriceVND(plan.priceMonthly))}/tháng
                    </p>

                    {subtitleOf(plan) && (
                      <p className="muted">{subtitleOf(plan)}</p>
                    )}

                    {renderBenefits(plan)}

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

        {/* Cá nhân */}
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
                  <div className="card" key={plan.subscriptionPlanId ?? plan.id}>
                    <h4>{plan.planName}</h4>
                    <p className="price-service">
                      {vnd(normalizeMonthlyPriceVND(plan.priceMonthly))}/tháng
                    </p>

                    {subtitleOf(plan) && (
                      <p className="muted">{subtitleOf(plan)}</p>
                    )}

                    {renderBenefits(plan)}

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

      {/* Modal */}
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
            <div className="row"><span>Gói:</span><strong>{selectedPlan.planName}</strong></div>
            <div className="row">
              <span>Giá / tháng:</span>
              <strong>{vnd(normalizeMonthlyPriceVND(selectedPlan.priceMonthly))}</strong>
            </div>
            <div className="row"><span>Chu kỳ:</span><strong>{billingCycle}</strong></div>
            <div className="row">
              <span>Bắt đầu từ:</span>
              <input
                type="datetime-local"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
              />
            </div>
            <div className="row"><span>Ngày kết thúc (FE tính):</span><strong>{endDate ? toDisplay(endDate) : "—"}</strong></div>
            <div className="row"><span>Ngày gia hạn tiếp theo (FE tính):</span><strong>{nextBillingDate ? toDisplay(nextBillingDate) : "—"}</strong></div>
            <div className="row">
              <span>Tự động gia hạn:</span>
              <Switch checked={autoRenew} onChange={setAutoRenew} />
              <span style={{ marginLeft: 8 }}>{autoRenew ? "Bật" : "Tắt"}</span>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              * Lưu ý: Các mốc thời gian trên do FE tự tính dựa trên ngày bắt đầu và chu kỳ <b>Monthly</b>.
            </p>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
};

export default ServicePlans;
