
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  prefix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, prefix }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-1 text-2xl font-semibold text-gray-900">
        {prefix}{value}
      </p>
    </div>
  );
};

export default StatCard;
