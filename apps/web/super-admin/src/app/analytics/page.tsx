"use client";

// This page is now used as a component in the main dashboard
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

const planDistribution = [
  { name: "STARTER", value: 12, color: "#8884d8" },
  { name: "PROFESSIONAL", value: 8, color: "#82ca9d" },
  { name: "ENTERPRISE", value: 4, color: "#ffc658" },
];

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">ანალიტიკა</h1>
              <p className="text-muted-foreground">პლატფორმის დეტალური ანალიტიკა და სტატისტიკა</p>
            </div>

            {/* Revenue Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>შემოსავალი და გამოწერები</CardTitle>
                <CardDescription>ბოლო 6 თვის მონაცემები</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Module Usage */}
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

              {/* Plan Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>გეგმების განაწილება</CardTitle>
                  <CardDescription>გამოწერების განაწილება გეგმების მიხედვით</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>სულ შემოსავალი</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">₾146,230</div>
                  <p className="text-sm text-muted-foreground mt-2">+12% წინა თვესთან შედარებით</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>აქტიური ორგანიზაციები</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">24</div>
                  <p className="text-sm text-muted-foreground mt-2">+3 ახალი ამ თვეში</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>საშუალო MRR</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">₾24,372</div>
                  <p className="text-sm text-muted-foreground mt-2">ყოველთვიური განმეორებადი შემოსავალი</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Churn Rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">2.1%</div>
                  <p className="text-sm text-muted-foreground mt-2">-0.5% წინა თვესთან შედარებით</p>
                </CardContent>
              </Card>
            </div>
          </div>
    </div>
  );
}

