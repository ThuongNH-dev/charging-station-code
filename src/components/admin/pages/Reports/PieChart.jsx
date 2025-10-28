import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

const PieChart = ({ data = [] }) => {
  if (!data.length) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#666',
        fontSize: '16px'
      }}>
        Không có dữ liệu cơ cấu gói dịch vụ
      </div>
    );
  }

  const colorMap = {
    "Tieu chuan": "#4285F4",
    "Cao cap": "#34A853",
    "Bac": "#FBBC05", 
    "Doanh nghiep": "#EA4335",
    "Vang": "#9b59b6",
    "Kim cuong": "#1abc9c",
  };

  const COLORS = data.map(item => colorMap[item.name] || "#7f8c8d");

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = data.payload.total || 0;
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {data.name}
          </p>
          <p style={{ color: '#333', margin: '2px 0' }}>
            Giá trị: {data.value?.toLocaleString()} đ
          </p>
          <p style={{ color: '#666', margin: '2px 0' }}>
            Tỷ lệ: {percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => {
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '20px'
      }}>
        {payload.map((entry, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: entry.color,
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      marginBottom: '20px'
    }}>
      <h4 style={{
        color: '#4285F4',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: '20px',
        fontSize: '1.2rem'
      }}>
        Cơ cấu gói dịch vụ
      </h4>
      
      <ResponsiveContainer width="100%" height={350}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;
