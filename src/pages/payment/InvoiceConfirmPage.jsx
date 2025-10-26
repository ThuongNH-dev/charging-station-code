// import React, { useEffect, useState, useMemo } from "react";
// import { useParams, useNavigate, useLocation } from "react-router-dom";
// import MainLayout from "../../layouts/MainLayout";
// import { ArrowLeftOutlined } from "@ant-design/icons";
// import { fetchAuthJSON, getApiBase } from "../../utils/api";
// import "./style/PaymentPage.css"; // tái dùng style

// function getApiBaseAbs() {
//     const raw = (getApiBase() || "").trim();
//     if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
//     if (raw.startsWith("/")) return "https://localhost:7268/api";
//     return "https://localhost:7268/api";
// }
// const API_BASE = getApiBaseAbs();


// const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

// export default function InvoiceConfirmPage() {
//     const { id: idParam } = useParams();
//     const navigate = useNavigate();
//     const { state } = useLocation();           // có thể nhận companyId, baseline...
//     const id = useMemo(() => {
//         const fromParam = Number(idParam);
//         if (Number.isFinite(fromParam)) return fromParam;
//         const fromState = Number(state?.invoiceId);
//         return Number.isFinite(fromState) ? fromState : undefined;
//     }, [idParam, state?.invoiceId]);
//     const [loading, setLoading] = useState(true);
//     const [err, setErr] = useState("");
//     const [invoice, setInvoice] = useState(null);

//     useEffect(() => {
//         let alive = true;
//         (async () => {
//             setLoading(true); setErr("");
//             try {
//                 // BE: luôn dùng /Invoices/{id} và unwrap .data
//                 const res = await fetchAuthJSON(`${API_BASE}/Invoices/${id}`, { method: "GET" });
//                 const inv = res?.data ?? res;
//                 if (!inv) throw new Error("Không tải được dữ liệu hoá đơn.");
//                 if (alive) setInvoice(inv); // LƯU inv (đã unwrap) vào state
//             } catch (e) {
//                 if (alive) setErr(e?.message || "Lỗi tải hoá đơn.");
//             } finally {
//                 if (alive) setLoading(false);
//             }
//         })();
//         return () => { alive = false; };
//     }, [id]);


//     const amount = useMemo(() => {
//         if (!invoice) return null;
//         const total = Number(
//             invoice.total ?? invoice.Total ??
//             invoice.amount ?? invoice.Amount ??
//             invoice.grandTotal ?? invoice.GrandTotal ?? 0
//         );
//         return total > 0 ? total : null;
//     }, [invoice]);


//     const proceedToPay = () => {
//         // Điều hướng vào PaymentPage, KHÔNG truyền bookingId — chỉ truyền invoiceId
//         navigate("/payment", {
//             state: {
//                 invoiceId: Number(id),
//                 companyId: state?.companyId ?? invoice?.companyId ?? undefined,
//                 baseline: state?.baseline,
//                 station: state?.station,
//                 charger: state?.charger,
//                 gun: state?.gun,
//                 presetAmount: amount ?? undefined,
//             },
//         });
//     };

//     return (
//         <MainLayout>
//             <div className="payment-page">
//                 <div className="payment-container">
//                     <div className="left-col">
//                         <div className="left-panel">
//                             <h2 className="os-title">Xác nhận hóa đơn</h2>
//                             {loading && <p>Đang tải hóa đơn...</p>}
//                             {!loading && err && <p className="os-error">{err}</p>}
//                             {!loading && invoice && (
//                                 <>
//                                     <div className="os-block">
//                                         <h3>1. Thông tin hóa đơn</h3>
//                                         <ul className="os-station-list">
//                                             <li>Mã hóa đơn: <b>{invoice.invoiceId ?? invoice.InvoiceId ?? id}</b></li>
//                                             <li>Công ty: {invoice.company?.companyName ?? invoice.companyName ?? "—"}</li>
//                                             <li>Khách hàng: {invoice.customer?.fullName ?? invoice.customerName ?? "—"}</li>
//                                             <li>Trạng thái: {invoice.status ?? "—"}</li>
//                                         </ul>
//                                     </div>

//                                     <div className="os-block">
//                                         <h3>2. Số tiền cần thanh toán</h3>
//                                         {amount == null ? (
//                                             <p className="os-warning">Không xác định được tổng tiền.</p>
//                                         ) : (
//                                             <table className="os-table">
//                                                 <tbody>
//                                                     <tr>
//                                                         <td>Tổng tiền hoá đơn</td>
//                                                         <td className="os-right">{vnd(amount)}</td>
//                                                     </tr>
//                                                     <tr className="os-total">
//                                                         <td><b>Tổng</b></td>
//                                                         <td className="os-right"><b>{vnd(amount)}</b></td>
//                                                     </tr>
//                                                 </tbody>
//                                             </table>
//                                         )}
//                                     </div>

//                                     <div className="os-actions">
//                                         <button
//                                             type="button"
//                                             className={`primary-btn ${amount == null ? "disabled" : ""}`}
//                                             disabled={amount == null}
//                                             onClick={proceedToPay}
//                                         >
//                                             Tiếp tục thanh toán
//                                         </button>
//                                         <button className="secondary-btn" onClick={() => navigate(-1)}>
//                                             <ArrowLeftOutlined /> Quay về
//                                         </button>
//                                     </div>
//                                 </>
//                             )}
//                         </div>
//                     </div>

//                     {/* Cột phải tái dùng layout nếu cần */}
//                     <div className="right-panel">
//                         <h2 className="os-title">Ghi chú</h2>
//                         <div className="os-block">
//                             <p>Trang này chỉ dùng để xác nhận thông tin hoá đơn. Nhấn “Tiếp tục thanh toán” để sang trang thanh toán.</p>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </MainLayout>
//     );
// }
