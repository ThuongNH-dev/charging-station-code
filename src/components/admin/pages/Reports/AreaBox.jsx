// src/components/AreaBox.jsx
import React from "react";

const DEBUG_MODE = true;

export default function AreaBox({ name, data = {} }) {
  const revenue = Number(data.revenue ?? 0);
  const sessions = Number(data.totalSessions ?? 0);
  const avgUsage = Number(data.usagePercent ?? 0);

  if (DEBUG_MODE)
    console.log(`[AreaBox] region=${name}`, { revenue, sessions, avgUsage });

  return (
    <div className="area-box">
      <h5 className="area-name">{name}</h5>
      <div className="area-revenue">{revenue.toLocaleString()} đ</div>
      <div className="area-sessions-usage">
        {sessions} phiên - Sử dụng TB {avgUsage.toFixed(1)}%
      </div>
    </div>
  );
}
