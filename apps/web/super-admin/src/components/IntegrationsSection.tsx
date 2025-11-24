"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Label,
} from "@saas-platform/ui";
import { toast } from "sonner";

const paymentGateways = [
  { id: "stripe", name: "Stripe", status: true, icon: "💳" },
  { id: "tbc", name: "TBC Bank", status: true, icon: "🏦" },
  { id: "bog", name: "Bank of Georgia", status: false, icon: "🏦" },
];

const emailServices = [
  { id: "sendgrid", name: "SendGrid", status: true },
  { id: "mailgun", name: "Mailgun", status: false },
];

const analyticsServices = [
  { id: "google-analytics", name: "Google Analytics", status: true },
  { id: "mixpanel", name: "Mixpanel", status: false },
];

export function IntegrationsSection() {
  const [integrations, setIntegrations] = useState({
    paymentGateways,
    emailServices,
    analyticsServices,
  });

  const [apiKeys, setApiKeys] = useState({
    stripe: "",
    tbc: "",
    sendgrid: "",
  });

  const toggleIntegration = (category: string, id: string) => {
    setIntegrations((prev) => ({
      ...prev,
      [category]: prev[category as keyof typeof prev].map((item: any) =>
        item.id === id ? { ...item, status: !item.status } : item
      ),
    }));
    toast.success("ინტეგრაცია განახლებულია");
  };

  const saveApiKey = (service: string, key: string) => {
    setApiKeys((prev) => ({ ...prev, [service]: key }));
    toast.success("API გასაღები შენახულია");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">ინტეგრაციები</h1>
          <p className="text-muted-foreground">გადახდის, Email და Analytics სერვისების კონფიგურაცია</p>
        </div>
      </div>

      {/* Payment Gateways */}
      <Card>
        <CardHeader>
          <CardTitle>გადახდის სისტემები</CardTitle>
          <CardDescription>გადახდის გეითვეების კონფიგურაცია</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.paymentGateways.map((gateway) => (
            <div
              key={gateway.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{gateway.icon}</span>
                <div>
                  <div className="font-medium">{gateway.name}</div>
                  <Badge variant={gateway.status ? "default" : "secondary"} className="mt-1">
                    {gateway.status ? "ON" : "OFF"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {gateway.status && (
                  <div className="space-y-2">
                    <Label htmlFor={`${gateway.id}-key`}>API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`${gateway.id}-key`}
                        type="password"
                        placeholder="API Key"
                        value={apiKeys[gateway.id as keyof typeof apiKeys] || ""}
                        onChange={(e) => saveApiKey(gateway.id, e.target.value)}
                        className="w-64"
                      />
                      <Button variant="outline" size="sm">
                        შენახვა
                      </Button>
                    </div>
                  </div>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gateway.status}
                    onChange={() => toggleIntegration("paymentGateways", gateway.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Email Services */}
      <Card>
        <CardHeader>
          <CardTitle>Email სერვისები</CardTitle>
          <CardDescription>Email გაგზავნის სერვისების კონფიგურაცია</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.emailServices.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-medium">{service.name}</div>
                  <Badge variant={service.status ? "default" : "secondary"} className="mt-1">
                    {service.status ? "ON" : "OFF"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {service.status && service.id === "sendgrid" && (
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="API Key"
                      value={apiKeys.sendgrid}
                      onChange={(e) => saveApiKey("sendgrid", e.target.value)}
                      className="w-64"
                    />
                    <Button variant="outline" size="sm">
                      შენახვა
                    </Button>
                  </div>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={service.status}
                    onChange={() => toggleIntegration("emailServices", service.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Analytics Services */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics სერვისები</CardTitle>
          <CardDescription>ანალიტიკის სერვისების კონფიგურაცია</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.analyticsServices.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-medium">{service.name}</div>
                  <Badge variant={service.status ? "default" : "secondary"} className="mt-1">
                    {service.status ? "ON" : "OFF"}
                  </Badge>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={service.status}
                  onChange={() => toggleIntegration("analyticsServices", service.id)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>Webhook URL-ების მართვა</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                placeholder="https://example.com/webhook"
                className="flex-1"
              />
              <Button>დამატება</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>აქტიური Webhooks</Label>
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Webhooks არ არის კონფიგურირებული</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

