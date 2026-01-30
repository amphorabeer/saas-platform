"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from "@saas-platform/ui";
import {
  Smartphone,
  Monitor,
  Tablet,
  Search,
  Clock,
  Key,
  MapPin,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Entitlement {
  id: string;
  tourId: string;
  tour: {
    id: string;
    name: string;
    museum: {
      id: string;
      name: string;
    };
  };
  activationCode: {
    id: string;
    code: string;
    durationDays: number;
  } | null;
  activatedAt: string;
  expiresAt: string;
  isActive: boolean;
}

interface Device {
  id: string;
  deviceId: string;
  platform: string | null;
  deviceName: string | null;
  appVersion: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  entitlements: Entitlement[];
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/geoguide/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string | null) => {
    switch (platform?.toLowerCase()) {
      case "ios":
      case "android":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getPlatformLabel = (platform: string | null) => {
    switch (platform?.toLowerCase()) {
      case "ios":
        return "iOS";
      case "android":
        return "Android";
      case "web":
        return "Web Browser";
      default:
        return platform || "უცნობი";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("ka-GE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "ახლახანს";
    if (diffMins < 60) return `${diffMins} წუთის წინ`;
    if (diffHours < 24) return `${diffHours} საათის წინ`;
    if (diffDays < 30) return `${diffDays} დღის წინ`;
    return formatDate(dateString);
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const filteredDevices = devices.filter((device) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      device.deviceId.toLowerCase().includes(searchLower) ||
      device.platform?.toLowerCase().includes(searchLower) ||
      device.entitlements.some(
        (e) =>
          e.activationCode?.code.toLowerCase().includes(searchLower) ||
          e.tour.name.toLowerCase().includes(searchLower) ||
          e.tour.museum.name.toLowerCase().includes(searchLower)
      )
    );
  });

  const stats = {
    total: devices.length,
    active: devices.filter(
      (d) => d.lastActiveAt && new Date(d.lastActiveAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
    withEntitlements: devices.filter((d) => d.entitlements.length > 0).length,
    totalEntitlements: devices.reduce((sum, d) => sum + d.entitlements.length, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            📱 მოწყობილობები
          </h1>
          <p className="text-muted-foreground mt-1">
            რეგისტრირებული მოწყობილობები და მათი აქტივაციები
          </p>
        </div>
        <Button variant="outline" onClick={fetchDevices}>
          <RefreshCw className="h-4 w-4 mr-2" />
          განახლება
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">სულ მოწყობილობები</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-sm text-muted-foreground">აქტიური (7 დღე)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.withEntitlements}</div>
            <p className="text-sm text-muted-foreground">კოდით აქტივირებული</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{stats.totalEntitlements}</div>
            <p className="text-sm text-muted-foreground">სულ აქტივაციები</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ძიება მოწყობილობის ID, კოდის ან მუზეუმის მიხედვით..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Devices List */}
      <div className="space-y-4">
        {filteredDevices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              მოწყობილობები არ მოიძებნა
            </CardContent>
          </Card>
        ) : (
          filteredDevices.map((device) => (
            <Card key={device.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                onClick={() =>
                  setExpandedDevice(expandedDevice === device.id ? null : device.id)
                }
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-full text-amber-600">
                    {getPlatformIcon(device.platform)}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {getPlatformLabel(device.platform)}
                      {device.entitlements.length > 0 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          {device.entitlements.length} აქტივაცია
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {device.deviceId.substring(0, 8)}...{device.deviceId.substring(device.deviceId.length - 4)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getTimeAgo(device.lastActiveAt)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      რეგისტრაცია: {formatDate(device.createdAt)}
                    </div>
                  </div>
                  {expandedDevice === device.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Content - Entitlements */}
              {expandedDevice === device.id && (
                <div className="border-t bg-muted/30 p-4">
                  {device.entitlements.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      ამ მოწყობილობას კოდი არ გაუაქტიურებია
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm mb-3">აქტივაციების ისტორია</h4>
                      {device.entitlements.map((entitlement) => (
                        <div
                          key={entitlement.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isExpired(entitlement.expiresAt)
                              ? "bg-gray-100 dark:bg-gray-800"
                              : "bg-white dark:bg-gray-900"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-full ${
                                isExpired(entitlement.expiresAt)
                                  ? "bg-gray-200 text-gray-500"
                                  : "bg-green-100 text-green-600"
                              }`}
                            >
                              <Key className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-mono text-sm">
                                {entitlement.activationCode?.code || "—"}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {entitlement.tour.museum.name} • {entitlement.tour.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-xs px-2 py-1 rounded-full ${
                                isExpired(entitlement.expiresAt)
                                  ? "bg-gray-200 text-gray-600"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {isExpired(entitlement.expiresAt) ? "ვადაგასული" : "აქტიური"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDate(entitlement.activatedAt)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ვადა: {formatDate(entitlement.expiresAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Device Details */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">მოწყობილობის დეტალები</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">სრული ID:</div>
                      <div className="font-mono text-xs break-all">{device.deviceId}</div>
                      <div className="text-muted-foreground">პლატფორმა:</div>
                      <div>{getPlatformLabel(device.platform)}</div>
                      {device.appVersion && (
                        <>
                          <div className="text-muted-foreground">ვერსია:</div>
                          <div>{device.appVersion}</div>
                        </>
                      )}
                      <div className="text-muted-foreground">ბოლო აქტივობა:</div>
                      <div>{formatDate(device.lastActiveAt)}</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
