"use client";

// This page is now used as a component in the main dashboard
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@saas-platform/ui";

const subscriptions = [
  {
    id: "1",
    organization: "Grand Hotel Tbilisi",
    plan: "PROFESSIONAL",
    status: "ACTIVE",
    price: 299.99,
    currency: "GEL",
    currentPeriodEnd: "2024-12-24",
    users: 12,
  },
  {
    id: "2",
    organization: "Cafe Rustaveli",
    plan: "STARTER",
    status: "ACTIVE",
    price: 99.99,
    currency: "GEL",
    currentPeriodEnd: "2024-12-20",
    users: 5,
  },
  {
    id: "3",
    organization: "Beauty Studio",
    plan: "STARTER",
    status: "TRIAL",
    price: 99.99,
    currency: "GEL",
    currentPeriodEnd: "2024-12-08",
    users: 3,
  },
  {
    id: "4",
    organization: "Shop Mart",
    plan: "ENTERPRISE",
    status: "ACTIVE",
    price: 499.99,
    currency: "GEL",
    currentPeriodEnd: "2024-12-24",
    users: 25,
  },
];

const statusLabels: Record<string, string> = {
  ACTIVE: "აქტიური",
  TRIAL: "საცდელი",
  PAST_DUE: "გადავადებული",
  CANCELLED: "გაუქმებული",
  EXPIRED: "ვადა გაუვიდა",
};

export default function SubscriptionsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">გამოწერები</h1>
          <p className="text-muted-foreground">გამოწერების მართვა და ანალიტიკა</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>MRR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₾28,809</div>
            <p className="text-sm text-muted-foreground mt-2">თვიური განმეორებადი შემოსავალი</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ARR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₾345,708</div>
            <p className="text-sm text-muted-foreground mt-2">წლიური განმეორებადი შემოსავალი</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Churn Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">3.2%</div>
            <p className="text-sm text-muted-foreground mt-2">გაუქმების მაჩვენებელი</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>LTV</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₾2,450</div>
            <p className="text-sm text-muted-foreground mt-2">მომხმარებლის სიცოცხლის ღირებულება</p>
          </CardContent>
        </Card>
      </div>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">გამოწერები</h1>
                <p className="text-muted-foreground">პლატფორმის ყველა გამოწერა</p>
              </div>
              <Button>ახალი გამოწერა</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>აქტიური</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">3</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>საცდელი</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">1</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>ყოველთვიური შემოსავალი</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">₾999.96</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>საშუალო ღირებულება</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">₾249.99</div>
                </CardContent>
              </Card>
            </div>

            {/* Subscriptions Table */}
            <Card>
              <CardHeader>
                <CardTitle>სულ {subscriptions.length} გამოწერა</CardTitle>
                <CardDescription>ყველა აქტიური და საცდელი გამოწერა</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">ორგანიზაცია</th>
                        <th className="text-left p-4">გეგმა</th>
                        <th className="text-left p-4">სტატუსი</th>
                        <th className="text-left p-4">ფასი</th>
                        <th className="text-left p-4">მომხმარებლები</th>
                        <th className="text-left p-4">ბოლო გადახდა</th>
                        <th className="text-left p-4">მოქმედებები</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((sub) => (
                        <tr key={sub.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{sub.organization}</td>
                          <td className="p-4">
                            <Badge variant="outline">{sub.plan}</Badge>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                sub.status === "ACTIVE"
                                  ? "default"
                                  : sub.status === "TRIAL"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {statusLabels[sub.status] || sub.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {sub.price} {sub.currency}
                          </td>
                          <td className="p-4">{sub.users}</td>
                          <td className="p-4 text-sm text-muted-foreground">{sub.currentPeriodEnd}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                დეტალები
                              </Button>
                              <Button variant="ghost" size="sm">
                                რედაქტირება
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
    </div>
  );
}

