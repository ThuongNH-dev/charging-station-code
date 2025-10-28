import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const StackedBarChart = ({ data = [] }) => {
  if (!data.length) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#666',
        fontSize: '16px'
      }}>
        Không có dữ liệu doanh thu theo gói
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            {label}
          </p>
          <p style={{ marginBottom: '4px', color: '#333' }}>
            Tổng: {total.toLocaleString()} đ
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ 
              color: entry.color, 
              margin: '2px 0',
              fontSize: '14px'
            }}>
              {entry.name}: {entry.value?.toLocaleString()} đ
            </p>
          ))}
        </div>
      );
    }
    return null;
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
        Doanh thu theo gói dịch vụ
      </h4>
      
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#ddd' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#ddd' }}
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {Object.keys(colorMap).map((planName) => (
            <Bar
              key={planName}
              dataKey={planName}
              stackId="a"
              fill={colorMap[planName]}
              name={planName}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StackedBarChart;
