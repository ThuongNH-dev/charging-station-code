import React, { useState, useMemo } from "react";

export default function SelectPlanModal({
  open,
  onClose,
  onSelect,
  plans = [],
}) {
  const [planId, setPlanId] = useState("");
  const options = useMemo(
    () =>
      (plans || []).map((p) => ({
        id: p.subscriptionPlanId ?? p.id ?? p.packageId,
        name: p.planName,
      })),
    [plans]
  );

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: 420 }}>
        <h3>Chọn gói để xem người dùng đăng ký</h3>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Gói dịch vụ:</label>
          <select
            className="filter-dropdown"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="">-- Chọn gói --</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} (#{o.id})
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button
            className="btn primary"
            disabled={!planId}
            onClick={() => onSelect(planId)}
          >
            Xem danh sách
          </button>
          <button className="btn secondary" onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
