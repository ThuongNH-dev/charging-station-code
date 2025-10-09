import React, { useState } from "react";
import { Form, Checkbox, Button, Typography, Divider } from "antd";

const { Title } = Typography;

const PLANS = [
  { key: "small",  label: "Quy mô nhỏ", price: 99000,  note: "2–9 thành viên" },
  { key: "medium", label: "Quy mô vừa", price: 399000, note: "10–50 thành viên" },
  { key: "large",  label: "Quy mô lớn", price: 799000, note: "10–100 thành viên" },
];

const formatVND = (n) =>
  n.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(160px, 1fr))",
    gap: 12,
  },
  square: (selected) => ({
    aspectRatio: "1 / 1",
    height: 100,
    width: 180,
    border: `2px solid ${selected ? "#009e44" : "#e5e7eb"}`,
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gridTemplateRows: "auto auto 1fr", // header, price, note
    alignItems: "start",
    rowGap: 6,                         // khoảng cách gọn lại
    cursor: "pointer",
    transition: "border-color .15s ease",
    outline: selected ? "2px solid rgba(22,119,255,.2)" : "none",
    background: "#fff",
  }),
  planTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  planTitle: { fontWeight: 700 },
  price: { fontWeight: 700, fontSize: 16, lineHeight: 1.2 },
  radioDot: (selected) => ({
    width: 14, height: 14, borderRadius: "50%",
    border: `2px solid ${selected ? "#006d32" : "#9ca3af"}`,
    background: selected ? "#006d32" : "transparent",
  }),
  hint: { fontSize: 12, color: "#64748b" },
  toggle: {
    marginTop: 8,
    background: "none",
    border: 0,
    padding: 0,
    color: "#ffffffff",
    cursor: "pointer",
  },
};

function PlanSquare({ plan, selected, onSelect }) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => onSelect(plan.key)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(plan.key)}
      style={styles.square(selected)}
    >
      <div style={styles.planTop}>
        <div style={styles.planTitle}>{plan.label}</div>
        <div style={styles.radioDot(selected)} />
      </div>
      <div style={styles.price}>{formatVND(plan.price)}</div>
      <div style={styles.hint}>{plan.note}</div>
    </div>
  );
}

export default function EnterprisePaymentField() {
  const [form] = Form.useForm();
  const [selected, setSelected] = useState("small"); // mặc định gói nhỏ
  const [showAll, setShowAll] = useState(false);     // ẩn/hiện 2 gói còn lại

  const visiblePlans = showAll ? PLANS : PLANS.filter((p) => p.key === "small");
  const price = PLANS.find((p) => p.key === selected)?.price ?? 0;

  return (
    <>
      <Title level={5} style={{ marginBottom: 12 }}>
        Thanh toán
      </Title>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ plan: selected, agree: false }}
        onValuesChange={(changed) => {
          if (changed.plan) setSelected(changed.plan);
        }}
      >
        {/* Trường ẩn để form giữ giá trị plan */}
        <Form.Item name="plan" hidden initialValue={selected}>
          <input />
        </Form.Item>

        {/* Khối vuông chọn gói */}
        <div role="radiogroup" style={styles.grid}>
          {visiblePlans.map((p) => (
            <PlanSquare
              key={p.key}
              plan={p}
              selected={selected === p.key}
              onSelect={(key) => {
                setSelected(key);
                form.setFieldsValue({ plan: key });
              }}
            />
          ))}
        </div>

        {/* Nút mở rộng/thu gọn */}
        <button
          type="button"
          style={styles.toggle}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Thu gọn gói" : "Xem thêm gói"}
        </button>

        {/* Tạm tính */}
        <Typography style={{ marginTop: 12 }}>
          <strong>Tạm tính: {formatVND(price)}</strong>
        </Typography>

        {/* <Divider /> */}
      </Form>
    </>
  );
}
