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
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@saas-platform/ui";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import { toast } from "sonner";

const reportTypes = ["ფინანსური", "მომხმარებლები", "გამოყენება", "მორგებული"];

const recentReports = [
  {
    id: "RPT-001",
    type: "ფინანსური",
    period: "2024-11-01 - 2024-11-30",
    created: "2024-11-24 10:30",
    size: "2.4 MB",
    format: "PDF",
  },
  {
    id: "RPT-002",
    type: "მომხმარებლები",
    period: "2024-11-01 - 2024-11-30",
    created: "2024-11-23 14:20",
    size: "1.8 MB",
    format: "Excel",
  },
  {
    id: "RPT-003",
    type: "გამოყენება",
    period: "2024-10-01 - 2024-10-31",
    created: "2024-11-01 09:15",
    size: "3.2 MB",
    format: "CSV",
  },
];

export function ReportsSection() {
  const [reportType, setReportType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleExport = (format: string) => {
    if (!reportType || !dateFrom || !dateTo) {
      toast.error("გთხოვთ შეავსოთ ყველა ველი");
      return;
    }
    toast.success(`${format} ფორმატში ექსპორტი დაიწყო`, {
      description: `რეპორტი: ${reportType}, პერიოდი: ${dateFrom} - ${dateTo}`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">რეპორტები</h1>
          <p className="text-muted-foreground">რეპორტების შექმნა და ექსპორტი</p>
        </div>
      </div>

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle>ახალი რეპორტის შექმნა</CardTitle>
          <CardDescription>აირჩიეთ რეპორტის ტიპი და პერიოდი</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">რეპორტის ტიპი</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="აირჩიეთ ტიპი" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-from">დაწყების თარიღი</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">დასრულების თარიღი</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={() => handleExport("PDF")} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              PDF ექსპორტი
            </Button>
            <Button onClick={() => handleExport("Excel")} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel ექსპორტი
            </Button>
            <Button onClick={() => handleExport("CSV")} variant="outline">
              <File className="h-4 w-4 mr-2" />
              CSV ექსპორტი
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>ბოლო რეპორტები</CardTitle>
          <CardDescription>შექმნილი რეპორტების ისტორია</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{report.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {report.type} • {report.period}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      შექმნილია: {report.created} • {report.size}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{report.format}</Badge>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

