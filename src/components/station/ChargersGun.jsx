import React, { useEffect } from "react";

/**
 * ChargeraGun
 * - Hiển thị danh sách súng cho 1 trụ sạc và cho phép chọn
 * - Tự động chọn theo quy tắc:
 *   1) Nếu value (lựa chọn cũ) vẫn còn "available" -> giữ nguyên
 *   2) Nếu có >=1 "available" -> chọn súng available đầu tiên
 *   3) Nếu không có available -> onChange(null)
 *
 * Props:
 * - guns: Array<{ id: string, name?: string, status: "available" | "busy" | "maintenance" }>
 * - value: object | null        // súng đang chọn
 * - onChange: (gunOrNull) => void
 * - autoSelect?: boolean        // default: true
 * - className?: string
 */
export default function ChargersGun({
  guns = [],
  value = null,
  onChange,
  autoSelect = true,
  className = "",
}) {
  const isAvailable = (g) => g?.status === "available";

  // Auto-select khi danh sách guns đổi hoặc khi value mất hiệu lực
  useEffect(() => {
    if (!autoSelect) return;

    if (!guns.length) {
      if (value) onChange?.(null);
      return;
    }

    // Nếu lựa chọn cũ còn available -> giữ nguyên
    if (value && guns.some((g) => g.id === value.id && isAvailable(g))) {
      return;
    }

    // Chọn available đầu tiên nếu có
    const firstAvail = guns.find(isAvailable) || null;
    onChange?.(firstAvail);
  }, [guns, value, autoSelect, onChange]);

  return (
    <div className={`gun-list ${className}`}>
      {guns.map((gun) => {
        const available = isAvailable(gun);
        const selected = value?.id === gun.id;

        return (
          <div
            key={gun.id}
            className={`gun-card ${available ? "available" : "busy"} ${selected ? "selected" : ""}`}
            onClick={() => available && onChange?.(gun)}
            title={available ? "Có thể chọn" : "Đang sử dụng"}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" && available) onChange?.(gun);
            }}
          >
            <div className="gun-icon">🔌</div>
            <div className="gun-name">{gun.name || `Súng ${gun.id}`}</div>
            <div className={`gun-dot ${available ? "green" : "red"}`} />
          </div>
        );
      })}
    </div>
  );
}
