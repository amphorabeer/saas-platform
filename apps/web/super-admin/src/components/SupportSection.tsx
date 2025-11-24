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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@saas-platform/ui";
import { MessageSquare, User, Clock, AlertCircle } from "lucide-react";

const tickets = [
  {
    id: "TKT-001",
    subject: "სისტემაში შესვლის პრობლემა",
    user: "გიორგი ბერიძე",
    organization: "Hotel Tbilisi",
    priority: "critical",
    status: "open",
    createdAt: "2024-11-24 10:30",
  },
  {
    id: "TKT-002",
    subject: "ფასების კონფიგურაცია",
    user: "ანა მელაძე",
    organization: "Beauty House",
    priority: "medium",
    status: "in-progress",
    createdAt: "2024-11-24 09:15",
  },
  {
    id: "TKT-003",
    subject: "რეპორტის ექსპორტი",
    user: "დავით კვარაცხელია",
    organization: "Restaurant Plaza",
    priority: "low",
    status: "resolved",
    createdAt: "2024-11-23 16:45",
  },
];

const quickReplies = [
  "გმადლობთ თქვენი შეტყობინებისთვის. ჩვენი გუნდი განიხილავს თქვენს მოთხოვნას.",
  "პრობლემა გადაწყვეტილია. თუ კიდევ გაქვთ შეკითხვები, დაგვიკავშირდით.",
  "ჩვენ ვმუშაობთ თქვენს მოთხოვნაზე. განახლებას მიიღებთ 24 საათის განმავლობაში.",
];

export function SupportSection() {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const priorityLabels: Record<string, string> = {
    critical: "კრიტიკული",
    medium: "საშუალო",
    low: "დაბალი",
  };

  const statusLabels: Record<string, string> = {
    open: "ღია",
    "in-progress": "მუშაობა",
    resolved: "გადაწყვეტილი",
    closed: "დახურული",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Support</h1>
          <p className="text-muted-foreground">მხარდაჭერის ბილეთების მართვა</p>
        </div>
      </div>

      {/* Ticket Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              კრიტიკული
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">5</div>
            <p className="text-sm text-muted-foreground mt-2">ღია ბილეთი</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              საშუალო
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">12</div>
            <p className="text-sm text-muted-foreground mt-2">მუშაობაში</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              დაბალი
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">23</div>
            <p className="text-sm text-muted-foreground mt-2">გადაწყვეტილი</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>ბილეთები</CardTitle>
          <CardDescription>მხარდაჭერის ბილეთების სია</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">ID</th>
                  <th className="text-left p-4">სათაური</th>
                  <th className="text-left p-4">მომხმარებელი</th>
                  <th className="text-left p-4">პრიორიტეტი</th>
                  <th className="text-left p-4">სტატუსი</th>
                  <th className="text-left p-4">თარიღი</th>
                  <th className="text-left p-4">მოქმედებები</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedTicket(ticket.id)}
                  >
                    <td className="p-4 font-mono text-sm">{ticket.id}</td>
                    <td className="p-4 font-medium">{ticket.subject}</td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{ticket.user}</div>
                        <div className="text-sm text-muted-foreground">{ticket.organization}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          ticket.priority === "critical"
                            ? "destructive"
                            : ticket.priority === "medium"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {priorityLabels[ticket.priority]}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{statusLabels[ticket.status]}</Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{ticket.createdAt}</td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">
                        ნახვა
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reply Templates */}
      {selectedTicket && (
        <Card>
          <CardHeader>
            <CardTitle>სწრაფი პასუხი</CardTitle>
            <CardDescription>ბილეთი: {selectedTicket}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>სწრაფი პასუხები</Label>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setReplyText(reply)}
                  >
                    პასუხი {index + 1}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply">პასუხი</Label>
              <textarea
                id="reply"
                rows={6}
                className="w-full p-3 border rounded-md"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="შეიყვანეთ პასუხი..."
              />
            </div>
            <div className="flex gap-3">
              <Button>გაგზავნა</Button>
              <Button variant="outline">დავალება გუნდის წევრს</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

