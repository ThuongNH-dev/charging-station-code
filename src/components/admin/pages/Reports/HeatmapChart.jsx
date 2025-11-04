import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/**
 * props.data = [{ date: '2025-10-28', hour: 13, value: 8.5 }, ...]
 * → sẽ chuyển thành dataset 24 hàng (0..23h), mỗi ngày là một series (stack)
 */
export default function HeatmapChart({ data = [] }) {
  const { chartData, days, maxVal } = useMemo(() => {
    if (!Array.isArray(data)) return { chartData: [], days: [], maxVal: 0 };

    const dayKeys = [...new Set(data.map((d) => d.date))].sort();
    const rows = Array.from({ length: 24 }, (_, h) => {
      const row = { hour: `${h}:00` };
      dayKeys.forEach((day) => {
        const hit = data.find((d) => d.date === day && Number(d.hour) === h);
        row[day] = Number(hit?.value || 0);
      });
      return row;
    });

    const max = Math.max(1, ...data.map((d) => Number(d.value || 0)));
    return { chartData: rows, days: dayKeys, maxVal: max };
  }, [data]);

  if (!chartData.length) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
        Không có dữ liệu biểu đồ theo giờ
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        border: "1px solid #e0e0e0",
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        marginBottom: 20,
      }}
    >
      <h4
        style={{
          color: "#4285F4",
          fontWeight: 600,
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        Biểu đồ sử dụng theo giờ (7×24)
      </h4>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis domain={[0, maxVal]} />
          <Tooltip />
          <Legend />
          {days.map((day, i) => (
            <Bar
              key={day}
              dataKey={day}
              stackId="heat"
              fill={`hsl(${(i * 360) / Math.max(1, days.length)}, 70%, 50%)`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
