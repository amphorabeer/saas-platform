"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
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
import {
  Plus,
  Search,
  Download,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Building2,
  QrCode,
  X,
  Edit,
  RotateCcw,
} from "lucide-react";

interface Museum {
  id: string;
  name: string;
  slug: string;
  tours: { id: string; name: string; isPublished: boolean }[];
}

interface ActivationCode {
  id: string;
  code: string;
  durationDays: number;
  status: "AVAILABLE" | "REDEEMED" | "EXPIRED" | "REVOKED";
  batchName: string | null;
  museumIds: string[];
  tourIds: string[];
  redeemedAt: string | null;
  redeemedBy: string | null;
  createdAt: string;
}

export default function ActivationCodesPage() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [museumFilter, setMuseumFilter] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Generate Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    count: 10,
    durationDays: 30,
    batchName: "",
    museumId: "",
    tourIds: [] as string[],
  });
  const [generating, setGenerating] = useState(false);

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<ActivationCode | null>(null);

  // Status Change Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusChangeCode, setStatusChangeCode] = useState<ActivationCode | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    fetchCodes();
    fetchMuseums();
  }, []);

  const fetchMuseums = async () => {
    try {
      const res = await fetch("/api/geoguide/museums");
      if (res.ok) {
        const data = await res.json();
        setMuseums(data);
      }
    } catch (error) {
      console.error("Error fetching museums:", error);
    }
  };

  const fetchCodes = async () => {
    try {
      const res = await fetch("/api/geoguide/codes");
      if (res.ok) {
        const data = await res.json();
        setCodes(data);
      }
    } catch (error) {
      console.error("Error fetching codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!generateForm.museumId) {
      alert("აირჩიეთ მუზეუმი");
      return;
    }
    
    setGenerating(true);

    try {
      const res = await fetch("/api/geoguide/codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: generateForm.count,
          durationDays: generateForm.durationDays,
          batchName: generateForm.batchName,
          museumIds: [generateForm.museumId],
          tourIds: generateForm.tourIds,
        }),
      });

      if (res.ok) {
        const newCodes = await res.json();
        setCodes([...newCodes, ...codes]);
        setShowGenerateModal(false);
        setGenerateForm({ count: 10, durationDays: 30, batchName: "", museumId: "", tourIds: [] });
      } else {
        const error = await res.json();
        alert(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error generating codes:", error);
      alert("შეცდომა მოხდა");
    } finally {
      setGenerating(false);
    }
  };

  const updateCodeStatus = async () => {
    if (!statusChangeCode || !newStatus) return;

    try {
      const res = await fetch(`/api/geoguide/codes/${statusChangeCode.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setCodes(codes.map(c => 
          c.id === statusChangeCode.id ? { ...c, status: newStatus as any } : c
        ));
        setShowStatusModal(false);
        setStatusChangeCode(null);
        setNewStatus("");
      } else {
        const error = await res.json();
        alert(error.message || "შეცდომა მოხდა");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("შეცდომა მოხდა");
    }
  };

  const revokeCode = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გინდათ კოდის გაუქმება?")) return;

    try {
      const res = await fetch(`/api/geoguide/codes/${id}/revoke`, {
        method: "POST",
      });
      if (res.ok) {
        setCodes(codes.map(c => (c.id === id ? { ...c, status: "REVOKED" } : c)));
      }
    } catch (error) {
      console.error("Error revoking code:", error);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const showQr = (code: ActivationCode) => {
    setSelectedCode(code);
    setShowQrModal(true);
  };

  const openStatusModal = (code: ActivationCode) => {
    setStatusChangeCode(code);
    setNewStatus(code.status);
    setShowStatusModal(true);
  };

  const downloadQr = () => {
    if (!selectedCode) return;
    
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 350;
      ctx!.fillStyle = "white";
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 25, 25, 250, 250);
      
      // Add code text
      ctx!.fillStyle = "black";
      ctx!.font = "bold 18px monospace";
      ctx!.textAlign = "center";
      ctx!.fillText(selectedCode.code, 150, 310);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${selectedCode.code}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const exportCodes = (format: "csv" | "txt") => {
    const filteredCodes = codes.filter(c => c.status === "AVAILABLE");
    let content = "";

    if (format === "csv") {
      content = "კოდი,ვადა (დღე),Batch,მუზეუმი,შექმნის თარიღი\n";
      content += filteredCodes.map(c => {
        const museumName = museums.find(m => c.museumIds?.includes(m.id))?.name || "";
        return `${c.code},${c.durationDays},${c.batchName || ""},${museumName},${new Date(c.createdAt).toLocaleDateString("ka-GE")}`;
      }).join("\n");
    } else {
      content = filteredCodes.map(c => c.code).join("\n");
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geoguide-codes-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
  };

  const getMuseumName = (code: ActivationCode) => {
    if (!code.museumIds || code.museumIds.length === 0) return "ყველა";
    const museum = museums.find(m => code.museumIds.includes(m.id));
    return museum?.name || "—";
  };

  const filteredCodes = codes.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesMuseum = museumFilter === "all" || (c.museumIds && c.museumIds.includes(museumFilter));
    return matchesSearch && matchesStatus && matchesMuseum;
  });

  const selectedMuseum = museums.find(m => m.id === generateForm.museumId);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      REDEEMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      EXPIRED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
      REVOKED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    };
    const labels: Record<string, string> = {
      AVAILABLE: "ხელმისაწვდომი",
      REDEEMED: "გამოყენებული",
      EXPIRED: "ვადაგასული",
      REVOKED: "გაუქმებული",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const stats = {
    total: codes.length,
    available: codes.filter(c => c.status === "AVAILABLE").length,
    redeemed: codes.filter(c => c.status === "REDEEMED").length,
    expired: codes.filter(c => c.status === "EXPIRED").length,
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
            🔑 აქტივაციის კოდები
          </h1>
          <p className="text-muted-foreground mt-1">
            კოდების გენერაცია და მართვა
          </p>
        </div>
        <Button
          onClick={() => setShowGenerateModal(true)}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          კოდების გენერაცია
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">სულ კოდები</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <p className="text-sm text-muted-foreground">ხელმისაწვდომი</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.redeemed}</div>
            <p className="text-sm text-muted-foreground">გამოყენებული</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{stats.expired}</div>
            <p className="text-sm text-muted-foreground">ვადაგასული</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ძიება კოდით..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={museumFilter}
              onChange={(e) => setMuseumFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">ყველა მუზეუმი</option>
              {museums.map((museum) => (
                <option key={museum.id} value={museum.id}>
                  {museum.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">ყველა სტატუსი</option>
              <option value="AVAILABLE">ხელმისაწვდომი</option>
              <option value="REDEEMED">გამოყენებული</option>
              <option value="EXPIRED">ვადაგასული</option>
              <option value="REVOKED">გაუქმებული</option>
            </select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportCodes("csv")}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" onClick={() => exportCodes("txt")}>
                <Download className="h-4 w-4 mr-2" />
                TXT
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Codes Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">კოდი</th>
                  <th className="text-left p-4 font-medium">QR</th>
                  <th className="text-left p-4 font-medium">მუზეუმი</th>
                  <th className="text-left p-4 font-medium">ვადა</th>
                  <th className="text-left p-4 font-medium">სტატუსი</th>
                  <th className="text-left p-4 font-medium">Batch</th>
                  <th className="text-left p-4 font-medium">შექმნილი</th>
                  <th className="text-left p-4 font-medium">მოქმედებები</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      კოდები არ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((code) => (
                    <tr key={code.id} className="hover:bg-muted/50">
                      <td className="p-4 font-mono">
                        <div className="flex items-center gap-2">
                          {code.code}
                          <button
                            onClick={() => copyCode(code.code)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {copiedCode === code.code ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => showQr(code)}
                          className="p-2 hover:bg-muted rounded-md"
                          title="QR კოდის ნახვა"
                        >
                          <QrCode className="h-5 w-5 text-amber-600" />
                        </button>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3" />
                          {getMuseumName(code)}
                        </span>
                      </td>
                      <td className="p-4">{code.durationDays} დღე</td>
                      <td className="p-4">
                        <button onClick={() => openStatusModal(code)}>
                          {getStatusBadge(code.status)}
                        </button>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {code.batchName || "—"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(code.createdAt).toLocaleDateString("ka-GE")}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openStatusModal(code)}
                            className="p-2 hover:bg-muted rounded-md text-blue-500"
                            title="სტატუსის შეცვლა"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {code.status === "AVAILABLE" && (
                            <button
                              onClick={() => revokeCode(code.id)}
                              className="p-2 hover:bg-muted rounded-md text-red-500"
                              title="გაუქმება"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          {code.status === "REVOKED" && (
                            <button
                              onClick={() => {
                                setStatusChangeCode(code);
                                setNewStatus("AVAILABLE");
                                updateCodeStatus();
                              }}
                              className="p-2 hover:bg-muted rounded-md text-green-500"
                              title="აღდგენა"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle>კოდების გენერაცია</CardTitle>
              <CardDescription>ახალი აქტივაციის კოდების შექმნა</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generateCodes} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="museumId">მუზეუმი *</Label>
                  <select
                    id="museumId"
                    value={generateForm.museumId}
                    onChange={(e) =>
                      setGenerateForm({
                        ...generateForm,
                        museumId: e.target.value,
                        tourIds: [],
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    required
                  >
                    <option value="">აირჩიეთ მუზეუმი</option>
                    {museums.map((museum) => (
                      <option key={museum.id} value={museum.id}>
                        {museum.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMuseum && selectedMuseum.tours.length > 0 && (
                  <div className="space-y-2">
                    <Label>ტურები (არასავალდებულო)</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {selectedMuseum.tours
                        .filter(t => t.isPublished)
                        .map((tour) => (
                          <label key={tour.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={generateForm.tourIds.includes(tour.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setGenerateForm({
                                    ...generateForm,
                                    tourIds: [...generateForm.tourIds, tour.id],
                                  });
                                } else {
                                  setGenerateForm({
                                    ...generateForm,
                                    tourIds: generateForm.tourIds.filter(id => id !== tour.id),
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{tour.name}</span>
                          </label>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      თუ არცერთი არ აირჩევთ, კოდი ყველა ტურზე იმუშავებს
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="count">რაოდენობა</Label>
                  <Input
                    id="count"
                    type="number"
                    min={1}
                    max={1000}
                    value={generateForm.count}
                    onChange={(e) =>
                      setGenerateForm({
                        ...generateForm,
                        count: parseInt(e.target.value) || 1,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationDays">მოქმედების ვადა (დღე)</Label>
                  <select
                    id="durationDays"
                    value={generateForm.durationDays}
                    onChange={(e) =>
                      setGenerateForm({
                        ...generateForm,
                        durationDays: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value={1}>1 დღე</option>
                    <option value={7}>7 დღე</option>
                    <option value={30}>30 დღე</option>
                    <option value={90}>90 დღე</option>
                    <option value={365}>1 წელი</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchName">Batch სახელი (არასავალდებულო)</Label>
                  <Input
                    id="batchName"
                    value={generateForm.batchName}
                    onChange={(e) =>
                      setGenerateForm({
                        ...generateForm,
                        batchName: e.target.value,
                      })
                    }
                    placeholder="მაგ: იანვარი 2026"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowGenerateModal(false)}
                  >
                    გაუქმება
                  </Button>
                  <Button
                    type="submit"
                    disabled={generating || !generateForm.museumId}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        გენერაცია...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        გენერაცია
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && selectedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>QR კოდი</CardTitle>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCode
                  id="qr-code-svg"
                  value={`https://geoguide.ge/activate/${selectedCode.code}`}
                  size={200}
                  level="H"
                />
              </div>
              <p className="font-mono text-xl font-bold">{selectedCode.code}</p>
              <p className="text-sm text-muted-foreground">
                {getMuseumName(selectedCode)} • {selectedCode.durationDays} დღე
              </p>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyCode(selectedCode.code)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  კოპირება
                </Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                  onClick={downloadQr}
                >
                  <Download className="h-4 w-4 mr-2" />
                  ჩამოტვირთვა
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && statusChangeCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>სტატუსის შეცვლა</CardTitle>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-center">{statusChangeCode.code}</p>
              
              <div className="space-y-2">
                <Label>ახალი სტატუსი</Label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="AVAILABLE">ხელმისაწვდომი</option>
                  <option value="REDEEMED">გამოყენებული</option>
                  <option value="EXPIRED">ვადაგასული</option>
                  <option value="REVOKED">გაუქმებული</option>
                </select>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowStatusModal(false)}
                >
                  გაუქმება
                </Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                  onClick={updateCodeStatus}
                >
                  შენახვა
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
