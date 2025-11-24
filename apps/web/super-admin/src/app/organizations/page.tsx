"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@saas-platform/ui";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  email: string;
  slug: string;
  status: string;
  plan: string;
  users: number;
  modules: string[];
  revenue: number;
  createdAt: string;
}

const moduleLabels: Record<string, string> = {
  HOTEL: "სასტუმრო",
  RESTAURANT: "რესტორნი",
  BEAUTY: "სილამაზე",
  SHOP: "მაღაზია",
  BREWERY: "ლუდსახარში",
  WINERY: "ღვინის მარანი",
  DISTILLERY: "დისტილერია",
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      } else {
        toast.error("ვერ ჩაიტვირთა ორგანიზაციები");
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
      toast.error("შეცდომა მონაცემების ჩატვირთვისას");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule =
      moduleFilter === "all" ||
      org.modules.some((m) => m === moduleFilter);
    const matchesPlan = planFilter === "all" || org.plan === planFilter;
    const matchesStatus = statusFilter === "all" || org.status === statusFilter;
    return matchesSearch && matchesModule && matchesPlan && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">ორგანიზაციები</h1>
          <p className="text-muted-foreground">
            პლატფორმაზე რეგისტრირებული ორგანიზაციების მართვა
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          ახალი ორგანიზაცია
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="ძიება..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="მოდული" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა მოდული</SelectItem>
                <SelectItem value="HOTEL">სასტუმრო</SelectItem>
                <SelectItem value="RESTAURANT">რესტორნი</SelectItem>
                <SelectItem value="BEAUTY">სილამაზე</SelectItem>
                <SelectItem value="SHOP">მაღაზია</SelectItem>
                <SelectItem value="BREWERY">ლუდსახარში</SelectItem>
                <SelectItem value="WINERY">ღვინის მარანი</SelectItem>
                <SelectItem value="DISTILLERY">დისტილერია</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="გეგმა" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა გეგმა</SelectItem>
                <SelectItem value="STARTER">STARTER</SelectItem>
                <SelectItem value="PROFESSIONAL">PROFESSIONAL</SelectItem>
                <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="სტატუსი" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა სტატუსი</SelectItem>
                <SelectItem value="active">აქტიური</SelectItem>
                <SelectItem value="trial">საცდელი</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>სულ {filteredOrganizations.length} ორგანიზაცია</CardTitle>
          <CardDescription>ყველა რეგისტრირებული ორგანიზაცია</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrganizations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              ორგანიზაციები არ მოიძებნა
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">ორგანიზაცია</th>
                    <th className="text-left p-4">მოდული</th>
                    <th className="text-left p-4">გეგმა</th>
                    <th className="text-left p-4">მომხმარებლები</th>
                    <th className="text-left p-4">შემოსავალი</th>
                    <th className="text-left p-4">სტატუსი</th>
                    <th className="text-left p-4">მოქმედებები</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganizations.map((org) => (
                    <tr key={org.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{org.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-sm text-muted-foreground">{org.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {org.modules.map((module) => (
                            <Badge key={module} variant="outline">
                              {moduleLabels[module] || module}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{org.plan}</Badge>
                      </td>
                      <td className="p-4">{org.users} მომხმარებელი</td>
                      <td className="p-4 font-medium">₾{org.revenue.toLocaleString()}</td>
                      <td className="p-4">
                        <Badge
                          variant={org.status === "active" ? "default" : "secondary"}
                        >
                          {org.status === "active" ? "აქტიური" : "საცდელი"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
