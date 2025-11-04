import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthlyComparisonLineChartProps {
  thisMonth: number;
  lastMonth: number;
  currencySymbol: string;
}

const MonthlyComparisonLineChart: React.FC<MonthlyComparisonLineChartProps> = ({ thisMonth, lastMonth, currencySymbol }) => {
  const data = [
    { name: 'Last Month', spend: lastMonth },
    { name: 'This Month', spend: thisMonth }
  ];

  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis unit={currencySymbol} />
          <Tooltip
            formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
            cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Line
            type="monotone"
            dataKey="spend"
            stroke="#6366F1"
            strokeWidth={2}
            activeDot={{ r: 8 }}
            dot={{ r: 4, fill: '#6366F1' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyComparisonLineChart;
