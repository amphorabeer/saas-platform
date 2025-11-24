"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from "@saas-platform/ui";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    platformName: "SaaS Platform",
    supportEmail: "support@saasplatform.ge",
    maxOrganizations: 1000,
    trialDays: 14,
    maintenanceMode: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle settings save
    console.log("Settings saved:", settings);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">პარამეტრები</h1>
        <p className="text-muted-foreground">პლატფორმის ზოგადი პარამეტრების მართვა</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>ზოგადი პარამეტრები</CardTitle>
            <CardDescription>პლატფორმის ძირითადი ინფორმაცია</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platformName">პლატფორმის სახელი</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">მხარდაჭერის ელფოსტა</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <CardTitle>ლიმიტები</CardTitle>
            <CardDescription>სისტემის ლიმიტების კონფიგურაცია</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxOrganizations">მაქსიმალური ორგანიზაციების რაოდენობა</Label>
              <Input
                id="maxOrganizations"
                type="number"
                value={settings.maxOrganizations}
                onChange={(e) =>
                  setSettings({ ...settings, maxOrganizations: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trialDays">საცდელი პერიოდი (დღეები)</Label>
              <Input
                id="trialDays"
                type="number"
                value={settings.trialDays}
                onChange={(e) => setSettings({ ...settings, trialDays: parseInt(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* System */}
        <Card>
          <CardHeader>
            <CardTitle>სისტემა</CardTitle>
            <CardDescription>სისტემური პარამეტრები</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenanceMode">მოვლის რეჟიმი</Label>
                <p className="text-sm text-muted-foreground">
                  პლატფორმა იქნება დროებით недоступна მომხმარებლებისთვის
                </p>
              </div>
              <input
                id="maintenanceMode"
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            გაუქმება
          </Button>
          <Button type="submit">შენახვა</Button>
        </div>
      </form>
    </div>
  );
}
