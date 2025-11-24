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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@saas-platform/ui";
import { Plus, Mail, Send } from "lucide-react";
import { toast } from "sonner";

const campaigns = [
  {
    id: "1",
    name: "Black Friday Sale",
    discount: "50% off",
    used: 45,
    total: 100,
    daysLeft: 5,
    status: "active",
  },
  {
    id: "2",
    name: "New Year Special",
    discount: "3 months free",
    startDate: "2025-01-01",
    status: "scheduled",
  },
];

const promoCodes = [
  {
    code: "BLACKFRIDAY50",
    discount: "50%",
    usage: 45,
    maxUsage: 100,
    expiry: "2024-11-30",
    status: "active",
  },
  {
    code: "NEWYEAR2025",
    discount: "3 months free",
    usage: 12,
    maxUsage: 50,
    expiry: "2025-01-31",
    status: "active",
  },
  {
    code: "SUMMER2024",
    discount: "25%",
    usage: 100,
    maxUsage: 100,
    expiry: "2024-08-31",
    status: "expired",
  },
];

export function MarketingSection() {
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">მარკეტინგი</h1>
          <p className="text-muted-foreground">კამპანიების და პრომო კოდების მართვა</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowPromoModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            პრომო კოდი
          </Button>
          <Button onClick={() => setShowCampaignModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            ახალი კამპანია
          </Button>
        </div>
      </div>

      {/* Active Campaigns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className={campaign.status === "active" ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{campaign.name}</CardTitle>
                <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                  {campaign.status === "active" ? "აქტიური" : "დაგეგმილი"}
                </Badge>
              </div>
              <CardDescription>{campaign.discount}</CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.used !== undefined && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>გამოყენებული:</span>
                    <span>
                      {campaign.used} / {campaign.total}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(campaign.used / campaign.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {campaign.daysLeft && (
                <p className="text-sm text-muted-foreground">
                  დარჩენილია: {campaign.daysLeft} დღე
                </p>
              )}
              {campaign.startDate && (
                <p className="text-sm text-muted-foreground">
                  იწყება: {campaign.startDate}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Promo Codes */}
      <Card>
        <CardHeader>
          <CardTitle>პრომო კოდები</CardTitle>
          <CardDescription>აქტიური და გაუქმებული პრომო კოდები</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">კოდი</th>
                  <th className="text-left p-4">ფასდაკლება</th>
                  <th className="text-left p-4">გამოყენება</th>
                  <th className="text-left p-4">ვადა</th>
                  <th className="text-left p-4">სტატუსი</th>
                  <th className="text-left p-4">მოქმედებები</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((promo) => (
                  <tr key={promo.code} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <code className="px-2 py-1 bg-muted rounded font-mono">{promo.code}</code>
                    </td>
                    <td className="p-4 font-medium">{promo.discount}</td>
                    <td className="p-4">
                      {promo.usage} / {promo.maxUsage}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{promo.expiry}</td>
                    <td className="p-4">
                      <Badge
                        variant={
                          promo.status === "active"
                            ? "default"
                            : promo.status === "expired"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {promo.status === "active" ? "აქტიური" : "ვადა გაუვიდა"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          რედაქტირება
                        </Button>
                        <Button variant="ghost" size="sm">
                          კოპირება
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

      {/* Email Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Email კამპანიები</CardTitle>
          <CardDescription>Email-ის გაგზავნა მომხმარებლებს</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">სათაური</Label>
              <Input id="email-subject" placeholder="Email-ის სათაური" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-content">კონტენტი</Label>
              <textarea
                id="email-content"
                rows={6}
                className="w-full p-3 border rounded-md"
                placeholder="Email-ის კონტენტი..."
              />
            </div>
            <div className="flex gap-3">
              <Button>
                <Send className="h-4 w-4 mr-2" />
                გაგზავნა
              </Button>
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

