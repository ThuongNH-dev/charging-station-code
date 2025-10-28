import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const HeatmapChart = ({ data = [] }) => {
  if (!data.length) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#666',
        fontSize: '16px'
      }}>
        Không có dữ liệu biểu đồ theo giờ
      </div>
    );
  }

  // Chuyển đổi dữ liệu heatmap thành format phù hợp với BarChart
  const processHeatmapData = (rawData) => {
    const days = [...new Set(rawData.map(d => d.date))];
    const hours = [...Array(24).keys()];
    
    return hours.map(hour => {
      const hourData = { hour: `${hour}:00` };
      days.forEach(day => {
        const entry = rawData.find(d => d.date === day && d.hour === hour);
        hourData[day] = entry?.value || 0;
      });
      return hourData;
    });
  };

  const chartData = processHeatmapData(data);
  const days = [...new Set(data.map(d => d.date))];

  const getColorIntensity = (value) => {
    const maxValue = Math.max(...data.map(d => d.value || 0));
    const intensity = Math.min(value / maxValue, 1);
    return `rgba(66, 133, 244, ${intensity})`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            Giờ: {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ 
              color: entry.color, 
              margin: '2px 0',
              fontSize: '14px'
            }}>
              {entry.dataKey}: {entry.value?.toFixed(1)}%
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
        Biểu đồ sử dụng theo giờ
      </h4>
      
      <div style={{ overflowX: 'auto' }}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="hour" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#ddd' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#ddd' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {days.map((day, index) => (
              <Bar
                key={day}
                dataKey={day}
                stackId="a"
                fill={`hsl(${index * 60}, 70%, 50%)`}
                name={day}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '15px',
        flexWrap: 'wrap'
      }}>
        {days.map((day, index) => (
          <div key={day} style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
              borderRadius: '2px',
              marginRight: '8px'
            }} />
            <span>{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeatmapChart;
