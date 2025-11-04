import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CATEGORY_COLORS } from '../constants';
import type { Category } from '../types';

interface CategoryBarChartProps {
  data: { name: string; value: number }[];
  currencySymbol: string;
}

const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data, currencySymbol }) => {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: 20,
            bottom: 5,
          }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" unit={currencySymbol} />
          <YAxis
            dataKey="name"
            type="category"
            width={80}
            tick={{ fontSize: 12 }}
            interval={0}
          />
          <Tooltip
            formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
            cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }}
          />
          <Bar dataKey="value" barSize={20}>
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={CATEGORY_COLORS[entry.name as Category] || CATEGORY_COLORS['Other']} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryBarChart;
