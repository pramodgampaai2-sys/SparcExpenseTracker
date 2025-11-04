import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CategoryChartProps {
  data: { name: string; value: number }[];
  currencySymbol: string;
  allCategoryColors: Record<string, string>;
}

const CategoryChart: React.FC<CategoryChartProps> = ({ data, currencySymbol, allCategoryColors }) => {
  const chartData = data.map(item => ({
    ...item, 
    // Provide a fallback color to prevent crashes from unexpected data
    fill: allCategoryColors[item.name] || allCategoryColors['Other']
  }));
  
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryChart;