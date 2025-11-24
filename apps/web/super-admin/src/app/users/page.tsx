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
  Avatar,
  AvatarFallback,
  Input,
} from "@saas-platform/ui";

const users = [
  {
    id: "1",
    name: "გიორგი ბერიძე",
    email: "giorgi@example.ge",
    role: "ORGANIZATION_OWNER",
    organization: "Grand Hotel Tbilisi",
    status: "active",
    lastLogin: "2024-11-24",
  },
  {
    id: "2",
    name: "ანა მელაძე",
    email: "ana@example.ge",
    role: "MANAGER",
    organization: "Cafe Rustaveli",
    status: "active",
    lastLogin: "2024-11-23",
  },
  {
    id: "3",
    name: "დავით კვარაცხელია",
    email: "davit@example.ge",
    role: "USER",
    organization: "Beauty Studio",
    status: "active",
    lastLogin: "2024-11-22",
  },
];

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "სუპერ ადმინი",
  ORGANIZATION_OWNER: "ორგანიზაციის მფლობელი",
  MODULE_ADMIN: "მოდულის ადმინი",
  MANAGER: "მენეჯერი",
  USER: "მომხმარებელი",
};

export default function UsersPage() {
  return (
    <div className="max-w-7xl mx-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">მომხმარებლები</h1>
                <p className="text-muted-foreground">პლატფორმის ყველა მომხმარებელი</p>
              </div>
              <Button>ახალი მომხმარებელი</Button>
            </div>

            {/* Search */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <Input placeholder="ძიება მომხმარებლების მიხედვით..." />
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>სულ {users.length} მომხმარებელი</CardTitle>
                <CardDescription>ყველა რეგისტრირებული მომხმარებელი</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">მომხმარებელი</th>
                        <th className="text-left p-4">როლი</th>
                        <th className="text-left p-4">ორგანიზაცია</th>
                        <th className="text-left p-4">სტატუსი</th>
                        <th className="text-left p-4">ბოლო შესვლა</th>
                        <th className="text-left p-4">მოქმედებები</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{roleLabels[user.role] || user.role}</Badge>
                          </td>
                          <td className="p-4">{user.organization}</td>
                          <td className="p-4">
                            <Badge variant={user.status === "active" ? "default" : "secondary"}>
                              {user.status === "active" ? "აქტიური" : "არააქტიური"}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{user.lastLogin}</td>
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

