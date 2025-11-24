"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  AvatarFallback,
} from "@saas-platform/ui";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const statsData = [
  { label: "ორგანიზაციები", value: "436", description: "აქტიური ორგანიზაციები", icon: "🏢" },
  { label: "გამოწერები", value: "291", description: "აქტიური გამოწერები", icon: "💳" },
  { label: "შემოსავალი", value: "₾72,450", description: "ამ თვეში", icon: "💰" },
  { label: "მომხმარებლები", value: "12,847", description: "სულ რეგისტრირებული", icon: "👥" },
];

const revenueData = [
  { month: "იან", revenue: 12000, subscriptions: 15 },
  { month: "თებ", revenue: 19000, subscriptions: 18 },
  { month: "მარ", revenue: 15000, subscriptions: 16 },
  { month: "აპრ", revenue: 25000, subscriptions: 20 },
  { month: "მაი", revenue: 30000, subscriptions: 22 },
  { month: "ივნ", revenue: 45230, subscriptions: 24 },
];

const moduleUsageData = [
  { module: "სასტუმრო", users: 8, revenue: 12000 },
  { module: "რესტორნი", users: 6, revenue: 8500 },
  { module: "სილამაზე", users: 4, revenue: 6200 },
  { module: "მაღაზია", users: 3, revenue: 4800 },
  { module: "სახლეულო", users: 2, revenue: 3500 },
  { module: "ღვინო", users: 1, revenue: 2230 },
];

const organizations = [
  {
    id: "1",
    name: "Grand Hotel Tbilisi",
    email: "info@grandhotel.ge",
    slug: "grand-hotel",
    status: "active",
    plan: "PROFESSIONAL",
    users: 12,
    modules: ["სასტუმრო"],
  },
  {
    id: "2",
    name: "Cafe Rustaveli",
    email: "hello@caferustaveli.ge",
    slug: "cafe-rustaveli",
    status: "active",
    plan: "STARTER",
    users: 5,
    modules: ["რესტორნი"],
  },
  {
    id: "3",
    name: "Beauty Studio",
    email: "contact@beautystudio.ge",
    slug: "beauty-studio",
    status: "trial",
    plan: "STARTER",
    users: 3,
    modules: ["სილამაზე"],
  },
];

export function DashboardContent() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">დეშბორდი</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsData.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <span className="text-2xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>შემოსავალი და გამოწერები</CardTitle>
            <CardDescription>ბოლო 6 თვის მონაცემები</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="შემოსავალი (₾)" />
                <Line type="monotone" dataKey="subscriptions" stroke="#82ca9d" name="გამოწერები" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>მოდულების გამოყენება</CardTitle>
            <CardDescription>მომხმარებლები და შემოსავალი</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={moduleUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="module" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="users" fill="#8884d8" name="მომხმარებლები" />
                <Bar dataKey="revenue" fill="#82ca9d" name="შემოსავალი (₾)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Module Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>მოდულების განაწილება</CardTitle>
          <CardDescription>ორგანიზაციების რაოდენობა მოდულების მიხედვით</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: "სასტუმრო", value: 124 },
                  { name: "რესტორნი", value: 89 },
                  { name: "სილამაზე", value: 67 },
                  { name: "მაღაზია", value: 45 },
                  { name: "სახლეულო", value: 23 },
                  { name: "ღვინო", value: 18 },
                  { name: "დისტილერია", value: 12 },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#8dd1e1", "#d084d0", "#ffb347"].map(
                  (color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  )
                )}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>ბოლო აქტივობა</CardTitle>
          <CardDescription>ბოლო მოქმედებები პლატფორმაზე</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: "ახალი ორგანიზაცია", org: "Hotel Tbilisi", time: "2 წუთის წინ" },
              { action: "გამოწერა განახლდა", org: "Beauty House", time: "15 წუთის წინ" },
              { action: "მომხმარებელი დაემატა", org: "Restaurant Plaza", time: "1 საათის წინ" },
              { action: "გადახდა მიღებულია", org: "Shop Mart", time: "2 საათის წინ" },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-sm text-muted-foreground">{activity.org}</div>
                </div>
                <div className="text-sm text-muted-foreground">{activity.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

