"use client";

import { formatDate } from "@/lib/format";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#b87333",
  "#d4945a",
  "#8b5a2b",
  "#c4a574",
  "#a67c52",
  "#6b4423",
];

interface SalesTrendProps {
  data: { date: string; total: number }[];
}

export function SalesTrendChart({ data }: SalesTrendProps) {
  const formatted = data.map((d) => ({
    ...d,
    display: formatDate(d.date),
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b87333" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#b87333" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey="display" stroke="#737373" fontSize={12} />
          <YAxis stroke="#737373" fontSize={12} tickFormatter={(v) => `${v} ₾`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #262626",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [
              `${value.toFixed(2)} ₾`,
              "გაყიდვები",
            ]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.date
                ? formatDate(payload[0].payload.date)
                : ""
            }
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#b87333"
            fill="url(#salesGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TopProductsProps {
  data: { productId: string; name: string; nameKa: string | null; totalRev: number }[];
}

export function TopProductsChart({ data }: TopProductsProps) {
  const formatted = data.map((d) => ({
    name: (d.nameKa || d.name).slice(0, 20),
    value: d.totalRev,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis type="number" stroke="#737373" fontSize={12} tickFormatter={(v) => `${v} ₾`} />
          <YAxis type="category" dataKey="name" stroke="#737373" fontSize={11} width={75} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #262626",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value.toFixed(2)} ₾`, "შემოსავალი"]}
          />
          <Bar dataKey="value" fill="#b87333" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CategoryPieProps {
  data: { categoryId: string; name: string; nameKa: string | null; total: number }[];
}

export function CategoryPieChart({ data }: CategoryPieProps) {
  const formatted = data.map((d) => ({
    name: d.nameKa || d.name,
    value: d.total,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formatted}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {formatted.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #262626",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value.toFixed(2)} ₾`, ""]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface HourlySalesProps {
  data: { hour: number; total: number }[];
}

export function HourlySalesChart({ data }: HourlySalesProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: `${d.hour}:00`,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey="label" stroke="#737373" fontSize={11} />
          <YAxis stroke="#737373" fontSize={12} tickFormatter={(v) => `${v} ₾`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #262626",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value.toFixed(2)} ₾`, "გაყიდვები"]}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#b87333"
            strokeWidth={2}
            dot={{ fill: "#b87333" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
