
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MonthlyComparisonChartProps {
  data: { name: string; spend: number }[];
  currencySymbol: string;
}

const COLORS = ['#C7D2FE', '#A5B4FC', '#6366F1']; // Indigo-200, Indigo-300, Indigo-500

const MonthlyComparisonChart: React.FC<MonthlyComparisonChartProps> = ({ data, currencySymbol }) => {
  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis unit={currencySymbol} />
          <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} cursor={{fill: 'rgba(239, 246, 255, 0.5)'}}/>
          <Bar dataKey="spend" barSize={50}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyComparisonChart;
