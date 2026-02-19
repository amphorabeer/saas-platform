'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#F97316', '#10B981', '#3B82F6'];

const LABEL: Record<string, string> = {
  DINE_IN: 'Dine In',
  TAKEAWAY: 'Take Away',
  DELIVERY: 'Delivery',
};

export function OrderTypePieChart({ data }: { data: Array<{ orderType: string; total: number }> }) {
  const chartData = data.map((d, i) => ({ name: LABEL[d.orderType] ?? d.orderType, value: d.total, color: COLORS[i % COLORS.length] }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`₾${value.toFixed(2)}`, '']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
