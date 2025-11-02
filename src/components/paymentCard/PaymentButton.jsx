import React, { useState } from "react";
import { message } from "antd";
import {
  createSinglePaymentUrl,
  createComboPaymentUrl,
  createSubscriptionRenewUrl,
  goToPayment,
} from "../../api/payment";

/**
 * mode: "single" | "combo" | "renew"
 * props cho từng mode:
 * - single: { bookingId?, invoiceId?, companyId?, subscriptionId?, chargingSessionId?, description? }
 * - combo:  { invoiceId, subscriptionId }
 * - renew:  { subscriptionId }
 */
export default function PaymentButton({ mode = "single", label = "Thanh toán", ...props }) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    try {
      setLoading(true);
      let res;
      if (mode === "combo") {
        if (!props.invoiceId || !props.subscriptionId) {
          throw new Error("Thiếu invoiceId hoặc subscriptionId cho thanh toán combo.");
        }
        res = await createComboPaymentUrl(props.invoiceId, props.subscriptionId);
      } else if (mode === "renew") {
        if (!props.subscriptionId) throw new Error("Thiếu subscriptionId để gia hạn.");
        res = await createSubscriptionRenewUrl(props.subscriptionId);
      } else {
        // single
        res = await createSinglePaymentUrl(props);
      }

      const paymentUrl = res.paymentUrl;
      if (!paymentUrl) throw new Error("API không trả về paymentUrl.");
      goToPayment(paymentUrl);
    } catch (e) {
      console.error(e);
      message.error(e.message || "Không tạo được URL thanh toán");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="inv-btn" onClick={onClick} disabled={loading}>
      {loading ? "Đang mở cổng thanh toán..." : label}
    </button>
  );
}
