"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@saas-platform/ui";
import {
  BarChart,
  Bar,
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

const revenueByModule = [
  { module: "სასტუმრო", revenue: 45000 },
  { module: "რესტორნი", revenue: 28000 },
  { module: "სილამაზე", revenue: 15000 },
  { module: "მაღაზია", revenue: 12000 },
  { module: "სახლეულო", revenue: 8000 },
  { module: "ღვინო", revenue: 5000 },
  { module: "დისტილერია", revenue: 3000 },
];

const revenueByPlan = [
  { name: "STARTER", value: 45, revenue: 4455, color: "#8884d8" },
  { name: "PROFESSIONAL", value: 30, revenue: 29700, color: "#82ca9d" },
  { name: "ENTERPRISE", value: 25, revenue: 37250, color: "#ffc658" },
];

const paymentMethods = [
  { method: "ბარათი", count: 245, percentage: 65 },
  { method: "ბანკის გადარიცხვა", count: 98, percentage: 26 },
  { method: "PayPal", count: 32, percentage: 9 },
];

const transactions = [
  {
    id: "TXN-001",
    organization: "Hotel Tbilisi",
    amount: 299.99,
    method: "ბარათი",
    date: "2024-11-24",
    status: "success",
  },
  {
    id: "TXN-002",
    organization: "Beauty House",
    amount: 499.99,
    method: "ბანკის გადარიცხვა",
    date: "2024-11-23",
    status: "success",
  },
  {
    id: "TXN-003",
    organization: "Restaurant Plaza",
    amount: 99.99,
    method: "ბარათი",
    date: "2024-11-23",
    status: "pending",
  },
  {
    id: "TXN-004",
    organization: "Shop Mart",
    amount: 299.99,
    method: "PayPal",
    date: "2024-11-22",
    status: "success",
  },
];

export function FinancialSection() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">ფინანსები</h1>
          <p className="text-muted-foreground">ფინანსური ანალიტიკა და ტრანზაქციები</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>სულ შემოსავალი</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₾115,000</div>
            <p className="text-sm text-muted-foreground mt-2">+12% წინა თვესთან შედარებით</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ამ თვეში</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₾28,450</div>
            <p className="text-sm text-muted-foreground mt-2">375 ტრანზაქცია</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>საშუალო ტრანზაქცია</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₾249</div>
            <p className="text-sm text-muted-foreground mt-2">საშუალო ღირებულება</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>გადახდილი ინვოისები</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">98%</div>
            <p className="text-sm text-muted-foreground mt-2">375 / 382</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>შემოსავალი მოდულების მიხედვით</CardTitle>
            <CardDescription>ბოლო თვის მონაცემები</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByModule}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="module" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" name="შემოსავალი (₾)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>შემოსავალი გეგმების მიხედვით</CardTitle>
            <CardDescription>განაწილება პროცენტულად</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByPlan}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueByPlan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>გადახდის მეთოდები</CardTitle>
          <CardDescription>ტრანზაქციების განაწილება</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.method} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{method.method}</span>
                    <span className="text-sm text-muted-foreground">{method.count} ტრანზაქცია</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${method.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <span className="text-sm font-medium">{method.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>ტრანზაქციები</CardTitle>
          <CardDescription>ბოლო ტრანზაქციების სია</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">ID</th>
                  <th className="text-left p-4">ორგანიზაცია</th>
                  <th className="text-left p-4">თანხა</th>
                  <th className="text-left p-4">მეთოდი</th>
                  <th className="text-left p-4">თარიღი</th>
                  <th className="text-left p-4">სტატუსი</th>
                  <th className="text-left p-4">მოქმედებები</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-mono text-sm">{txn.id}</td>
                    <td className="p-4">{txn.organization}</td>
                    <td className="p-4 font-medium">₾{txn.amount.toFixed(2)}</td>
                    <td className="p-4">{txn.method}</td>
                    <td className="p-4 text-sm text-muted-foreground">{txn.date}</td>
                    <td className="p-4">
                      <Badge variant={txn.status === "success" ? "default" : "secondary"}>
                        {txn.status === "success" ? "წარმატებული" : "მოლოდინში"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">
                        დეტალები
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

