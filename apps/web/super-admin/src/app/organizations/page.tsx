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
import { Plus, Edit, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  email: string;
  slug: string;
  hotelCode: string;
  status: string;
  plan: string;
  users: number;
  modules: string[];
  revenue: number;
  createdAt: string;
}

const moduleLabels: Record<string, string> = {
  HOTEL: "სასტუმრო",
  RESTAURANT: "რესტორანი",
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    slug: "",
    module: "HOTEL",
    plan: "STARTER",
    status: "trial",
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      if (editingOrg) {
        setFormData({
          name: editingOrg.name,
          email: editingOrg.email,
          slug: editingOrg.slug,
          module: editingOrg.modules[0] || "HOTEL",
          plan: editingOrg.plan,
          status: editingOrg.status,
        });
      } else {
        setFormData({
          name: "",
          email: "",
          slug: "",
          module: "HOTEL",
          plan: "STARTER",
          status: "trial",
        });
      }
    }
  }, [isModalOpen, editingOrg]);

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

  const handleCreate = () => {
    setEditingOrg(null);
    setIsModalOpen(true);
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setIsModalOpen(true);
  };

  const handleDelete = async (org: Organization) => {
    if (!confirm(`ნამდვილად გსურთ წაშალოთ "${org.name}"?`)) return;

    try {
      const response = await fetch(`/api/organizations/${org.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("ორგანიზაცია წაიშალა");
        loadOrganizations();
      } else {
        toast.error("ვერ წაიშალა ორგანიზაცია");
      }
    } catch (error) {
      console.error("Failed to delete organization:", error);
      toast.error("შეცდომა წაშლისას");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("კოდი დაკოპირდა!");
  };

  const handleSave = async () => {
    try {
      const url = editingOrg
        ? `/api/organizations/${editingOrg.id}`
        : "/api/organizations";
      const method = editingOrg ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          slug: formData.slug,
          plan: formData.plan,
          status: formData.status,
          modules: [formData.module],
        }),
      });

      if (response.ok) {
        toast.success(editingOrg ? "განახლდა" : "შეიქმნა");
        setIsModalOpen(false);
        setEditingOrg(null);
        loadOrganizations();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || "შეცდომა");
      }
    } catch (error) {
      console.error("Failed to save organization:", error);
      toast.error("შეცდომა");
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.hotelCode && org.hotelCode.includes(searchQuery));
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
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          ახალი ორგანიზაცია
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="ძიება (სახელი, ელ-ფოსტა, კოდი)..."
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
                <SelectItem value="RESTAURANT">რესტორანი</SelectItem>
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
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-semibold">კოდი</th>
                    <th className="text-left p-4 font-semibold">ორგანიზაცია</th>
                    <th className="text-left p-4 font-semibold">მოდული</th>
                    <th className="text-left p-4 font-semibold">გეგმა</th>
                    <th className="text-left p-4 font-semibold">მომხმარებლები</th>
                    <th className="text-left p-4 font-semibold">შემოსავალი</th>
                    <th className="text-left p-4 font-semibold">სტატუსი</th>
                    <th className="text-left p-4 font-semibold">მოქმედებები</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganizations.map((org) => (
                    <tr key={org.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono font-bold text-lg">
                            {org.hotelCode || '----'}
                          </code>
                          {org.hotelCode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopyCode(org.hotelCode)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
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
                      <td className="p-4">{org.users}</td>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(org)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(org)}
                          >
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

      {/* Organization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <Card className="w-full max-w-lg mx-4 bg-white dark:bg-gray-900 shadow-xl">
            <CardHeader>
              <CardTitle>
                {editingOrg ? "რედაქტირება" : "ახალი ორგანიზაცია"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editingOrg && editingOrg.hotelCode && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium mb-1 text-blue-700">
                      ორგანიზაციის კოდი
                    </label>
                    <code className="text-2xl font-mono font-bold text-blue-700">
                      {editingOrg.hotelCode}
                    </code>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    სახელი
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    ელ-ფოსტა
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    მოდული
                  </label>
                  <Select
                    value={formData.module}
                    onValueChange={(value) => setFormData({ ...formData, module: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-white dark:bg-gray-900 border shadow-xl z-[9999]"
                      position="popper"
                      sideOffset={4}
                    >
                      <SelectItem value="HOTEL" className="cursor-pointer hover:bg-gray-100 py-2">სასტუმრო</SelectItem>
                      <SelectItem value="RESTAURANT" className="cursor-pointer hover:bg-gray-100 py-2">რესტორანი</SelectItem>
                      <SelectItem value="BEAUTY" className="cursor-pointer hover:bg-gray-100 py-2">სილამაზე</SelectItem>
                      <SelectItem value="SHOP" className="cursor-pointer hover:bg-gray-100 py-2">მაღაზია</SelectItem>
                      <SelectItem value="BREWERY" className="cursor-pointer hover:bg-gray-100 py-2">ლუდსახარში</SelectItem>
                      <SelectItem value="WINERY" className="cursor-pointer hover:bg-gray-100 py-2">ღვინის მარანი</SelectItem>
                      <SelectItem value="DISTILLERY" className="cursor-pointer hover:bg-gray-100 py-2">დისტილერია</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    გეგმა
                  </label>
                  <Select
                    value={formData.plan}
                    onValueChange={(value) => setFormData({ ...formData, plan: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-white dark:bg-gray-900 border shadow-xl z-[9999]"
                      position="popper"
                      sideOffset={4}
                    >
                      <SelectItem value="STARTER" className="cursor-pointer hover:bg-gray-100 py-2">STARTER</SelectItem>
                      <SelectItem value="PROFESSIONAL" className="cursor-pointer hover:bg-gray-100 py-2">PROFESSIONAL</SelectItem>
                      <SelectItem value="ENTERPRISE" className="cursor-pointer hover:bg-gray-100 py-2">ENTERPRISE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    სტატუსი
                  </label>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${formData.status === 'trial' ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                      საცდელი
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        status: formData.status === 'active' ? 'trial' : 'active' 
                      })}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        formData.status === 'active' 
                          ? 'bg-green-500 focus:ring-green-500' 
                          : 'bg-orange-400 focus:ring-orange-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                          formData.status === 'active' ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm ${formData.status === 'active' ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      აქტიური
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingOrg(null);
                    }}
                  >
                    გაუქმება
                  </Button>
                  <Button onClick={handleSave}>
                    {editingOrg ? "განახლება" : "შექმნა"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
