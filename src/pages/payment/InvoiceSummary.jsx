// src/pages/invoice/InvoiceSummary.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase, getToken } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import "./style/InvoiceSummary.css";

// ===== Helpers =====
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const fmt = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

function normalizeApiBase(s) {
  const raw = (s || "").trim();
  if (!raw) return "https://localhost:7268/api";
  return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";

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

/** ========= HÀM Y HỆT BÊN InvoiceDetail =========
 *  Ưu tiên Charging nếu có sessions; nếu không, nhận diện Subscription theo các dấu hiệu.
 */
function pickInvoiceType(inv) {
  const hasSessions = Array.isArray(inv?.chargingSessions) && inv.chargingSessions.length > 0;
  if (hasSessions) return "charging";

  const sub = inv?.subscription;
  const hasSub =
    !!(inv?.subscriptionId || inv?.isMonthlyInvoice) ||
    !!(sub && (
      sub.subscriptionId ||
      sub.subscriptionPlanId ||
      sub.planName ||
      sub?.plan?.planName
    ));

  return hasSub ? "subscription" : "charging";
}

// ---- Helpers chung ----
async function runLimited(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0, running = 0;
  return await new Promise((resolve) => {
    const next = () => {
      if (i >= items.length && running === 0) return resolve(results);
      while (running < limit && i < items.length) {
        const idx = i++;
        running++;
        Promise.resolve(worker(items[idx], idx))
          .then((v) => { results[idx] = v; })
          .catch(() => { results[idx] = null; })
          .finally(() => { running--; next(); });
      }
    };
    next();
  });
}

// Endpoint chi tiết 1 hóa đơn (y như Detail dùng)
async function fetchInvoiceDetail(invoiceId) {
  try {
    const res = await fetchAuthJSON(`${API_ABS}/Invoices/${invoiceId}`, { method: "GET" });
    return res?.data || res || null;
  } catch {
    return null;
  }
}

/** Hydrate ngày tạo/cập nhật nếu thiếu (giữ nguyên code hiện tại) */
async function hydrateInvoiceDates(list) {
  if (!Array.isArray(list) || list.length === 0) return list;

  const need = list.filter((it) => !(it?.createdAt) || !(it?.updatedAt));
  if (need.length === 0) return list;

  const details = await runLimited(need, 4, async (it) => {
    const d = await fetchInvoiceDetail(it.invoiceId);
    if (!d) return null;
    return {
      invoiceId: d.invoiceId ?? it.invoiceId,
      createdAt: d.createdAt || d.CreatedAt || null,
      updatedAt: d.updatedAt || d.UpdatedAt || null,
    };
  });

  const byId = new Map();
  for (const r of details) {
    if (r?.invoiceId) byId.set(r.invoiceId, r);
  }

  return list.map((it) => {
    if (it.createdAt && it.updatedAt) return it;
    const a = byId.get(it.invoiceId);
    if (!a) return it;
    return {
      ...it,
      createdAt: it.createdAt ?? a.createdAt ?? null,
      updatedAt: it.updatedAt ?? a.updatedAt ?? null,
    };
  });
}

/** ========= HYDRATE LOẠI HÓA ĐƠN Y HỆT DETAIL ========= */
async function hydrateInvoiceTypes(list) {
  if (!Array.isArray(list) || list.length === 0) return list;

  const details = await runLimited(list, 6, async (it) => {
    const d = await fetchInvoiceDetail(it.invoiceId);
    if (!d) {
      return {
        invoiceId: it.invoiceId,
        invoiceType: "charging",
        subscription: null,
        chargingSessions: [],
        isMonthlyInvoice: false,
        subscriptionId: null,
      };
    }
    const invoiceType = pickInvoiceType(d); // dùng đúng logic Detail
    return {
      invoiceId: d.invoiceId ?? it.invoiceId,
      invoiceType,
      subscription: d.subscription ?? null,
      chargingSessions: Array.isArray(d.chargingSessions) ? d.chargingSessions : [],
      isMonthlyInvoice: !!d.isMonthlyInvoice,
      subscriptionId:
        d.subscription?.subscriptionId ??
        d.subscriptionId ??
        it.subscription?.subscriptionId ??
        it.subscriptionId ??
        null,
    };
  });

  const byId = new Map();
  for (const r of details) {
    if (r?.invoiceId != null) byId.set(r.invoiceId, r);
  }

  return list.map((it) => {
    const patch = byId.get(it.invoiceId);
    if (!patch) return it;
    return {
      ...it,
      invoiceType: patch.invoiceType,
      subscription: it.subscription ?? patch.subscription ?? null,
      chargingSessions: it.chargingSessions?.length ? it.chargingSessions : (patch.chargingSessions ?? []),
      isMonthlyInvoice: it.isMonthlyInvoice ?? patch.isMonthlyInvoice ?? false,
      subscriptionId: it.subscriptionId ?? patch.subscriptionId ?? null,
    };
  });
}

// date helpers cho filter
const parseDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// build pagination window with ellipses
function buildPages(total, current, window = 2) {
  if (total <= 1) return [1];
  const pages = new Set([1, total]);
  for (let i = current - window; i <= current + window; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const arr = Array.from(pages).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) out.push("...");
  }
  return out;
}

export default function InvoiceSummary() {
  const { user: authUser } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [useCompany, setUseCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rawInvoices, setRawInvoices] = useState([]);

  // filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // lọc loại
  const [dateField, setDateField] = useState("createdAt");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // ====== COMBO MODE (BẬT SAU KHI BẤM NÚT) ======
  const [comboMode, setComboMode] = useState(false);                  // đang ở chế độ chọn combo?
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);   // chỉ cho Charging
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null); // chỉ cho Subscription
  const [comboErr, setComboErr] = useState("");
  const [comboLoading, setComboLoading] = useState(false);

  const startCombo = () => {
    setComboErr("");
    setSelectedInvoiceId(null);
    setSelectedSubscriptionId(null);
    setComboMode(true);
  };
  const cancelCombo = () => {
    setComboMode(false);
    setSelectedInvoiceId(null);
    setSelectedSubscriptionId(null);
    setComboErr("");
  };

  function pickIdFromCtxOrStorage(key, authUser) {
    const fromCtx =
      authUser?.[key] ?? authUser?.[key.charAt(0).toUpperCase() + key.slice(1)];
    if (Number.isFinite(Number(fromCtx)) && Number(fromCtx) > 0)
      return Number(fromCtx);

    const ls = localStorage.getItem(key);
    const ss = sessionStorage.getItem(key);
    const cand = Number(ls ?? ss);
    return Number.isFinite(cand) && cand > 0 ? cand : null;
  }

  // Quyết định phạm vi (Company/Customer) theo role & id khả dụng
  useEffect(() => {
    let alive = true;
    (async () => {
      const roleRaw = String(authUser?.role || "").toLowerCase();
      const roleSuggestCompany = /company/.test(roleRaw);
      const roleSuggestCustomer = /customer|khach|client|user/.test(roleRaw);

      const co0 = pickIdFromCtxOrStorage("companyId", authUser);
      const cu0 = pickIdFromCtxOrStorage("customerId", authUser);

      if (roleSuggestCompany) {
        if (co0) { if (!alive) return; setCompanyId(co0); setUseCompany(true); return; }
        const co = await resolveCompanyIdSmart(authUser); if (!alive) return;
        if (co) { setCompanyId(co); setUseCompany(true); return; }
        const cu = cu0 || (await resolveCustomerIdSmart(authUser)); if (!alive) return;
        setCustomerId(cu ?? null); setUseCompany(false); return;
      }

      if (roleSuggestCustomer) {
        if (cu0) { if (!alive) return; setCustomerId(cu0); setUseCompany(false); return; }
        const cu = await resolveCustomerIdSmart(authUser); if (!alive) return;
        if (cu) { setCustomerId(cu); setUseCompany(false); return; }
        const co = co0 || (await resolveCompanyIdSmart(authUser)); if (!alive) return;
        setCompanyId(co ?? null); setUseCompany(Boolean(co)); return;
      }

      if (co0) { if (!alive) return; setCompanyId(co0); setUseCompany(true); return; }
      if (cu0) { if (!alive) return; setCustomerId(cu0); setUseCompany(false); return; }

      const [co, cu] = await Promise.all([
        resolveCompanyIdSmart(authUser),
        resolveCustomerIdSmart(authUser),
      ]);
      if (!alive) return;
      if (co) { setCompanyId(co); setUseCompany(true); }
      else if (cu) { setCustomerId(cu); setUseCompany(false); }
      else { setUseCompany(false); }
    })();
    return () => { alive = false; };
  }, [authUser]);

  // fetch danh sách + hydrate ngày + hydrate loại (bằng cách gọi /Invoices/{id} như Detail)
  useEffect(() => {
    let m = true;
    (async () => {
      if (useCompany === null) return;

      if (useCompany && companyId == null) {
        setLoading(false); setErr("Không xác định được công ty của tài khoản."); return;
      }
      if (!useCompany && customerId == null) {
        setLoading(false); setErr("Không xác định được khách hàng của tài khoản."); return;
      }

      try {
        setLoading(true); setErr("");

        let list = [];
        if (useCompany) {
          const res = await fetchAuthJSON(`${API_ABS}/Invoices/by-company/${companyId}`, { method: "GET" });
          list = Array.isArray(res?.data) ? res.data : [];
        } else {
          const res = await fetchAuthJSON(`${API_ABS}/Invoices/by-customer/${customerId}`, { method: "GET" });
          list = Array.isArray(res?.data) ? res.data : [];
        }

        // 1) Hydrate ngày tạo/cập nhật
        const withDates = await hydrateInvoiceDates(list);

        // 2) Hydrate loại (gọi /Invoices/{id} cho từng hóa đơn)
        const withTypes = await hydrateInvoiceTypes(withDates);

        if (!m) return;
        setRawInvoices(withTypes);

        try {
          sessionStorage.setItem("charge:billing:list", JSON.stringify(withTypes));
        } catch { }
      } catch (e) {
        if (m) setErr(e?.message || "Không tải được danh sách hóa đơn.");
      } finally {
        if (m) setLoading(false);
      }
    })();
    return () => { m = false; };
  }, [useCompany, companyId, customerId]);

  // normalize (đã có invoiceType + subscriptionId)
  const normalized = useMemo(() => {
    return (rawInvoices || [])
      .filter(Boolean)
      .map((it, idx) => {
        const isSub = String(it.invoiceType || "").toLowerCase() === "subscription";
        const subId =
          it?.subscription?.subscriptionId ??
          it?.subscriptionId ??
          null;
        const invId = it?.invoiceId ?? null;

        // ID theo yêu cầu: charging -> invoiceId; subscription -> subscriptionId
        const derivedId = isSub ? subId : invId;
        const derivedIdType = isSub ? "subscription" : "invoice";

        return {
          id:
            it.invoiceId?.toString?.() ||
            `${it.billingYear}-${it.billingMonth}-${idx}`,
          keyForDedupe:
            it.invoiceId?.toString?.() ||
            `${it.billingYear}-${it.billingMonth}`,
          invoiceId: invId,
          billingMonth: it.billingMonth,
          billingYear: it.billingYear,
          total: it.total,
          status: it.status,
          createdAt: it.createdAt,
          updatedAt: it.updatedAt,

          // đồng bộ với Detail:
          invoiceType: it.invoiceType,
          subscription: it.subscription ?? null,
          chargingSessions: it.chargingSessions || [],
          isMonthlyInvoice: it.isMonthlyInvoice ?? false,
          subscriptionId: subId,

          // mới thêm:
          derivedId,
          derivedIdType,

          customer: it.customer || null,
        };
      });
  }, [rawInvoices]);

  // dedupe by keyForDedupe (keep latest createdAt)
  const unique = useMemo(() => {
    const map = new Map();
    for (const it of normalized) {
      const k = it.keyForDedupe;
      if (!map.has(k)) map.set(k, it);
      else {
        const cur = map.get(k);
        const a = new Date(cur.createdAt || 0).getTime();
        const b = new Date(it.createdAt || 0).getTime();
        if (b > a) map.set(k, it);
      }
    }
    return Array.from(map.values());
  }, [normalized]);

  useEffect(() => {
    try {
      sessionStorage.setItem("charge:billing:list", JSON.stringify(unique));
    } catch { }
  }, [unique]);

  // filter + sort
  const filtered = useMemo(() => {
    let arr = unique.slice();

    if (typeFilter !== "all") {
      const key = String(typeFilter).toLowerCase();
      arr = arr.filter((inv) => String(inv.invoiceType).toLowerCase() === key);
    }

    if (statusFilter !== "all") {
      const key = statusFilter.toLowerCase();
      arr = arr.filter((inv) => {
        const s = String(inv.status || "").toLowerCase();
        if (key === "paid") return s.includes("paid");
        if (key === "unpaid") return s.includes("unpaid");
        if (key === "overdue") return s.includes("overdue");
        return true;
      });
    }

    const dFrom = parseDate(from);
    const dTo = to ? endOfDay(parseDate(to)) : null;
    if (dFrom || dTo) {
      arr = arr.filter((inv) => {
        const v = inv[dateField];
        if (!v) return false;
        const d = new Date(v);
        if (dFrom && d < dFrom) return false;
        if (dTo && d > dTo) return false;
        return true;
      });
    }

    // sort theo thời điểm tạo
    return arr.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [unique, statusFilter, typeFilter, dateField, from, to]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, dateField, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const clearDate = () => { setFrom(""); setTo(""); };

  const pillClass = (status) => {
    const s = String(status || "").toLowerCase().trim();
    if (/(^|[^a-z])overdue([^a-z]|$)/.test(s)) return "pill danger";
    if (/(^|[^a-z])unpaid([^a-z]|$)/.test(s)) return "pill warn";
    if (/(^|[^a-z])paid([^a-z]|$)/.test(s)) return "pill ok";
    return "pill neutral";
  };

  const pageList = buildPages(totalPages, page, 2);

  // ==== COMBO: chỉ cho chọn khi chưa thanh toán ====
  const isUnpaidLike = (inv) => {
    const s = String(inv?.status || "").toLowerCase();
    return s.includes("unpaid") || s.includes("overdue");
  };

  // Gọi API xác nhận combo
  const canConfirmCombo = selectedInvoiceId && selectedSubscriptionId;
  const confirmCombo = async () => {
    if (!canConfirmCombo) {
      setComboErr("Hãy chọn 1 hóa đơn Charging và 1 hóa đơn Subscription.");
      return;
    }
    setComboErr("");
    setComboLoading(true);
    try {
      const invId = Number(selectedInvoiceId);
      const subId = Number(selectedSubscriptionId);

      // (tuỳ chọn) Lưu context cho bước sau (PaymentPage / quay về)
      try {
        sessionStorage.setItem("__pay_ctx", JSON.stringify({
          invoiceId: invId,
          subscriptionId: subId,
        }));
      } catch { }

      // Điều hướng sang PaymentPage. Ở đó sẽ gọi /Payment/create với { invoiceId, subscriptionId }.
      navigate("/payment", {
        state: {
          from: "invoice-summary",
          invoiceId: Number(invId),
          subscriptionId: Number(subId),
          // có thể truyền thêm: companyId nếu cần
          companyId,
          // presetAmount: ... (nếu bạn muốn hiển thị số tiền sớm, không bắt buộc)
        },
        replace: false,
      });
    } finally {
      setComboLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="sum-root">
        {/* Topbar + Filters */}
        <div className="sum-topbar">
          <h2>Hóa Đơn</h2>
          <div className="sum-actions">
            {/* Bộ lọc loại hóa đơn */}
            <select
              className="sum-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="all">Tất cả loại</option>
              <option value="charging">Charging</option>
              <option value="subscription">Subscription</option>
            </select>

            <select
              className="sum-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="paid">Đã thanh toán</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="overdue">Quá hạn</option>
            </select>

            <div className="sum-datefilter">
              <select
                className="df-field"
                value={dateField}
                onChange={(e) => setDateField(e.target.value)}
              >
                <option value="createdAt">Tạo lúc</option>
                <option value="updatedAt">Cập nhật</option>
              </select>
              <input
                className="df-date"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="df-sep">—</span>
              <input
                className="df-date"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
              {(from || to) && (
                <button className="df-clear" title="Xóa lọc ngày" onClick={clearDate}>
                  ✕
                </button>
              )}
            </div>

            {/* ===== NÚT BẬT CHẾ ĐỘ COMBO ===== */}
            {!comboMode ? (
              <button
                className="btn-combo"
                onClick={startCombo}
                title="Chọn 1 Charging + 1 Subscription để thanh toán cùng lúc"
              >
                Thanh toán combo
              </button>
            ) : (
              <span className="combo-hint">Đang ở chế độ chọn combo</span>
            )}
          </div>
        </div>
        {/* Banner hướng dẫn khi ở chế độ combo */}
        {comboMode && (
          <div className="combo-banner" role="status" aria-live="polite" style={{ lineHeight: 1.5 }}>
            <strong>Hướng dẫn:</strong>{" "}
            Chọn <b>1</b> hóa đơn <em>Charging (Hoá đơn phiên sạc)</em> và <b>1</b> hóa đơn <em>Subscription (Hoá đơn gói dịch vụ)</em>.
            Bấm vào thẻ hóa đơn để chọn/bỏ chọn (thẻ có viền nổi khi có thể chọn).
            Sau khi chọn đủ 2 hóa đơn, cuộn xuống cuối trang và nhấn <b>Xác nhận</b> để tạo liên kết thanh toán combo.
          </div>
        )}


        {loading && <div className="sum-empty">Đang tải…</div>}
        {!loading && err && <div className="sum-error">{err}</div>}
        {!loading && !err && comboErr && <div className="sum-error" style={{ marginTop: 8 }}>{comboErr}</div>}

        {!loading && !err && filtered.length === 0 && (
          <div className="sum-empty">Không có hóa đơn phù hợp.</div>
        )}

        {!loading && !err && pageItems.length > 0 && (
          <div className="sum-list">
            {pageItems.map((inv, idx) => {
              const id =
                inv.invoiceId ||
                inv.id ||
                `${inv.billingYear}-${inv.billingMonth}-${idx}`;

              const typePill =
                inv.invoiceType === "subscription"
                  ? <span className="pill">Subscription</span>
                  : <span className="pill">Charging</span>;

              const idLabel =
                inv.derivedIdType === "subscription" ? "SubscriptionId" : "InvoiceId";

              const isSelected =
                isUnpaidLike(inv) && (
                  inv.invoiceType === "subscription"
                    ? inv.subscriptionId && inv.subscriptionId === selectedSubscriptionId
                    : inv.invoiceId && inv.invoiceId === selectedInvoiceId
                );

              const toggleSelect = () => {
                if (!comboMode) return;
                setComboErr("");
                if (!isUnpaidLike(inv)) {
                  setComboErr("Chỉ có thể chọn hóa đơn chưa thanh toán.");
                  return;
                }
                if (String(inv.invoiceType).toLowerCase() === "subscription") {
                  setSelectedSubscriptionId((cur) => (cur === inv.subscriptionId ? null : inv.subscriptionId));
                } else {
                  setSelectedInvoiceId((cur) => (cur === inv.invoiceId ? null : inv.invoiceId));
                }
              };

              return (
                <div
                  key={id}
                  className={`sum-card ${isSelected ? "is-selected" : ""} ${comboMode && isUnpaidLike(inv) ? "is-pickable" : ""}`}
                >
                  <button
                    className="sum-card-body"
                    onClick={() => {
                      if (comboMode) {
                        toggleSelect();
                      } else {
                        navigate(
                          `/invoiceDetail/${encodeURIComponent(inv.invoiceId || id)}`,
                          {
                            state: {
                              invoiceId: inv.invoiceId || id,
                              subscriptionId: inv.subscriptionId || null,
                              idForAction: inv.derivedId || null,
                              idForActionType: inv.derivedIdType,
                              invoice: inv,
                              period: { month: inv.billingMonth, year: inv.billingYear },
                            },
                          }
                        );
                      }
                    }}
                  >
                    {/* Top row: title + pills */}
                    <div className="sum-row top">
                      <div className="sum-title">
                        Hóa đơn kỳ {inv.billingMonth}/{inv.billingYear}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {typePill}
                        <span className={pillClass(inv.status)}>
                          {inv.status || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom row: meta + total */}
                    <div className="sum-row bottom">
                      <div className="sum-meta">
                        <div className="kv">
                          <span className="k">{idLabel}:</span>
                          <span className="v light">{inv.derivedId ?? "—"}</span>
                        </div>

                        <div className="kv">
                          <span className="k">Tạo lúc:</span>
                          <span className="v light">{fmt(inv.createdAt)}</span>
                        </div>
                        <div className="kv">
                          <span className="k">Cập nhật:</span>
                          <span className="v light">{fmt(inv.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="sum-total">
                        <div className="label">Tổng hóa đơn</div>
                        <div className="num">{vnd(inv.total || 0)}</div>
                      </div>
                    </div>
                  </button>

                  {/* Khu vực chọn chỉ hiện khi comboMode **và** hóa đơn chưa thanh toán */}
                  {comboMode && isUnpaidLike(inv) && (
                    <div className="sum-card-actions">
                      <label className="combo-check">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          disabled={
                            (inv.invoiceType === "subscription"
                              ? (selectedSubscriptionId && selectedSubscriptionId !== inv.subscriptionId)
                              : (selectedInvoiceId && selectedInvoiceId !== inv.invoiceId))
                          }
                          onChange={toggleSelect}
                        />
                        <span>Chọn vào combo</span>
                      </label>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* Breadcrumb pagination */}
        {!loading && !err && filtered.length > 0 && (
          <>
            <div className="bp-hint">
              Đang hiển thị {Math.min(filtered.length, start + 1)}–
              {Math.min(filtered.length, start + pageItems.length)} / {filtered.length} hóa đơn
            </div>
            <nav className="bp-nav" aria-label="Phân trang">
              <button
                className="bp-item nav"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Trước
              </button>
              {pageList.map((p, i) =>
                p === "..." ? (
                  <span key={`e${i}`} className="bp-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`bp-item ${p === page ? "active" : ""}`}
                    onClick={() => setPage(p)}
                    disabled={p === page}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                className="bp-item nav"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau →
              </button>
            </nav>
          </>
        )}

        {/* ===== Footer xác nhận combo: chỉ hiển thị khi comboMode ===== */}
        {comboMode && !loading && !err && (
          <div className="combo-footer">
            <div className="combo-summary">
              <strong>Đã chọn:</strong>{" "}
              <span>InvoiceId: {selectedInvoiceId ?? "—"}</span>{" "}
              <span style={{ marginLeft: 12 }}>SubscriptionId: {selectedSubscriptionId ?? "—"}</span>
              {comboErr && <div className="sum-error" style={{ marginTop: 6 }}>{comboErr}</div>}
            </div>
            <div className="combo-actions">
              <button className="combo-cancel-btn" onClick={cancelCombo} disabled={comboLoading}>
                Hủy
              </button>
              <button
                className="combo-pay-btn"
                disabled={!canConfirmCombo || comboLoading}
                onClick={confirmCombo}
                title={!canConfirmCombo
                  ? "Chọn 1 Charging + 1 Subscription chưa thanh toán"
                  : "Chuyển sang trang thanh toán để tiếp tục"}
              >
                {comboLoading ? "Đang chuyển…" : "Xác nhận"}
              </button>

            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// ====== Smart resolvers (giữ nguyên như trước) ======
async function resolveCompanyIdSmart(authUser) {
  if (authUser?.companyId != null) return Number(authUser.companyId);
  try {
    const meRes = await fetchAuthJSON("/Auth", { method: "GET" });
    let cid =
      meRes?.companyId ??
      meRes?.CompanyId ??
      meRes?.id ??
      meRes?.userId ??
      meRes?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
    if (cid != null) return Number(cid);
  } catch { }
  try {
    const token =
      getToken?.() ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      "";
    if (token) {
      const p = decodeJwtPayload(token);
      const claimCompany =
        p.companyId ??
        p.CompanyId ??
        p.compId ??
        p["company_id"] ??
        p["comp_id"] ??
        null;
      if (claimCompany != null && !Number.isNaN(Number(claimCompany)))
        return Number(claimCompany);
    }
  } catch { }
  try {
    const me = await fetchAuthJSON(`${API_ABS}/Companies/me`, { method: "GET" });
    const id1 = me?.data?.companyId ?? me?.companyId ?? null;
    if (id1 != null) return Number(id1);
  } catch { }
  const stored =
    sessionStorage.getItem("companyId") || localStorage.getItem("companyId");
  if (stored) return Number(stored);
  return null;
}

async function resolveCustomerIdSmart(authUser) {
  if (authUser?.customerId != null) return Number(authUser.customerId);
  try {
    const meRes = await fetchAuthJSON("/Auth", { method: "GET" });
    let cid =
      meRes?.customerId ??
      meRes?.id ??
      meRes?.userId ??
      meRes?.[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ];
    if (!cid) {
      const t = getToken?.() || "";
      const p = t ? decodeJwtPayload(t) : {};
      cid =
        p?.customerId ??
        p?.sub ??
        p?.[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ];
    }
    if (cid != null) return Number(cid);
  } catch { }
  const token =
    getToken?.() ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    "";
  if (token) {
    const p = decodeJwtPayload(token);
    const claimCust =
      p.customerId ??
      p.CustomerId ??
      p.custId ??
      p.custID ??
      p["customer_id"] ??
      p["cust_id"] ??
      p.sub ??
      p[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ];
    if (claimCust != null && !Number.isNaN(Number(claimCust)))
      return Number(claimCust);
    try {
      const me = await fetchAuthJSON(`${API_ABS}/Customers/me`, { method: "GET" });
      const id1 = me?.data?.customerId ?? me?.customerId ?? null;
      if (id1 != null) return Number(id1);
    } catch { }
  }
  const stored =
    sessionStorage.getItem("customerId") || localStorage.getItem("customerId");
  if (stored) return Number(stored);
  return null;
}
