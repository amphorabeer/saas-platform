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
  nameEn?: string | null;
  nameRu?: string | null;
  nameUk?: string | null;
  nameDe?: string | null;
  nameFr?: string | null;
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

// Language flag mapping
const LANG_FLAGS: Record<string, string> = {
  ka: "🇬🇪",
  en: "🇬🇧",
  ru: "🇷🇺",
  uk: "🇺🇦",
  de: "🇩🇪",
  fr: "🇫🇷",
};

function getMuseumLanguages(museum: Museum): string[] {
  const langs = ["ka"];
  if (museum.nameEn) langs.push("en");
  if (museum.nameRu) langs.push("ru");
  if (museum.nameUk) langs.push("uk");
  if (museum.nameDe) langs.push("de");
  if (museum.nameFr) langs.push("fr");
  return langs;
}

// Ticket drawing constants - Credit card 85x55mm @ 300DPI
const TICKET_W = 1004;
const TICKET_H = 650;
// Internal drawing at A6 scale, then rendered down
const DRAW_W = 1748;
const DRAW_H = 1240;
const LOGO_URL = "/geoguide-logo.png"; // Place logo in public folder

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTicketBackground(ctx: CanvasRenderingContext2D) {
  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, DRAW_W, DRAW_H);

  // Gold accent bars
  const goldGrad = ctx.createLinearGradient(0, 0, DRAW_W, 0);
  goldGrad.addColorStop(0, "#d97706");
  goldGrad.addColorStop(0.5, "#f59e0b");
  goldGrad.addColorStop(1, "#d97706");
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, 0, DRAW_W, 10);
  ctx.fillRect(0, DRAW_H - 10, DRAW_W, 10);

  // Decorative corners
  ctx.strokeStyle = "rgba(30, 58, 95, 0.2)";
  ctx.lineWidth = 3;
  [[28, 55, 28, 28, 55, 28], [DRAW_W - 28, 55, DRAW_W - 28, 28, DRAW_W - 55, 28],
   [28, DRAW_H - 55, 28, DRAW_H - 28, 55, DRAW_H - 28],
   [DRAW_W - 28, DRAW_H - 55, DRAW_W - 28, DRAW_H - 28, DRAW_W - 55, DRAW_H - 28]
  ].forEach(([mx, my, lx1, ly1, lx2, ly2]) => {
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(lx1, ly1);
    ctx.lineTo(lx2, ly2);
    ctx.stroke();
  });

  // Vertical dashed separator
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(1070, 30);
  ctx.lineTo(1070, DRAW_H - 30);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTicketContent(
  ctx: CanvasRenderingContext2D,
  code: string,
  museum: Museum,
  durationDays: number,
  logoImg: HTMLImageElement | null,
  qrImg: HTMLImageElement | null
) {
  const langs = getMuseumLanguages(museum);
  const flags = langs.map((l) => LANG_FLAGS[l]).join("  ");

  // === LEFT SECTION ===

  // Logo
  const logoSize = 90;
  const logoX = 70;
  const logoY = 40;
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // GeoGuide text
  ctx.fillStyle = "#1e3a5f";
  ctx.font = "bold 64px 'Georgia', serif";
  ctx.textAlign = "left";
  ctx.fillText("GeoGuide", logoX + logoSize + 24, logoY + 58);

  // Subtitle
  ctx.fillStyle = "#6b7280";
  ctx.font = "24px 'Georgia', serif";
  ctx.fillText("აუდიო გიდი  •  Audio Guide", logoX + logoSize + 26, logoY + 88);

  // Divider
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, 165);
  ctx.lineTo(1020, 165);
  ctx.stroke();

  // Museum name - Georgian - LARGE with word wrap
  ctx.fillStyle = "#111827";
  ctx.font = "bold 62px 'Georgia', serif";
  const maxNameWidth = 920;
  let museumNameY = 250;

  if (ctx.measureText(museum.name).width > maxNameWidth) {
    const words = museum.name.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      if (ctx.measureText(testLine).width > maxNameWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 70, museumNameY + i * 72);
    }
    museumNameY += (lines.length - 1) * 72;
  } else {
    ctx.fillText(museum.name, 70, museumNameY);
  }

  // Museum name - English
  const engNameY = museumNameY + 52;
  if (museum.nameEn) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "italic 38px 'Georgia', serif";
    let nameEn = museum.nameEn;
    if (ctx.measureText(nameEn).width > 920) {
      while (ctx.measureText(nameEn + "...").width > 920) nameEn = nameEn.slice(0, -1);
      nameEn += "...";
    }
    ctx.fillText(nameEn, 70, engNameY);
  }

  // Dynamic Y offset for everything below museum name
  const offsetY = engNameY + 33;

  // Duration badge
  const badgeText = `${durationDays} დღე / ${durationDays} days`;
  ctx.font = "bold 30px 'Georgia', serif";
  const badgeW = ctx.measureText(badgeText).width + 50;
  ctx.fillStyle = "#fef3c7";
  roundRect(ctx, 70, offsetY, badgeW, 58, 29);
  ctx.fill();
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 2;
  roundRect(ctx, 70, offsetY, badgeW, 58, 29);
  ctx.stroke();
  ctx.fillStyle = "#92400e";
  ctx.font = "bold 30px 'Georgia', serif";
  ctx.fillText(badgeText, 95, offsetY + 39);

  // Code label
  ctx.fillStyle = "#9ca3af";
  ctx.font = "24px 'Courier New', monospace";
  ctx.fillText("ACTIVATION CODE / აქტივაციის კოდი", 70, offsetY + 115);

  // Code - LARGE
  ctx.fillStyle = "#111827";
  ctx.font = "bold 60px 'Courier New', monospace";
  ctx.fillText(code, 70, offsetY + 190);

  // Instructions
  ctx.fillStyle = "#6b7280";
  ctx.font = "22px 'Georgia', serif";
  ctx.fillText("დაასკანერეთ QR კოდი ან შეიყვანეთ კოდი აპლიკაციაში", 70, offsetY + 242);
  ctx.fillText("Scan QR code or enter the code in the app", 70, offsetY + 272);

  // Divider
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, offsetY + 305);
  ctx.lineTo(1020, offsetY + 305);
  ctx.stroke();

  // Language flags - LARGE
  ctx.font = "72px sans-serif";
  ctx.fillText(flags, 70, offsetY + 395);

  // Available languages text
  ctx.fillStyle = "#6b7280";
  ctx.font = "22px 'Georgia', serif";
  ctx.fillText(`Available in ${langs.length} languages / ხელმისაწვდომია ${langs.length} ენაზე`, 70, offsetY + 440);

  // Contact
  ctx.fillStyle = "#9ca3af";
  ctx.font = "20px 'Georgia', serif";
  ctx.fillText("If you have any technical problems, please contact us", 70, 1090);
  ctx.fillStyle = "#1e3a5f";
  ctx.font = "bold 24px 'Georgia', serif";
  ctx.fillText("info@geoguide.ge", 70, 1125);

  ctx.fillStyle = "#1e3a5f";
  ctx.font = "22px 'Georgia', serif";
  ctx.fillText("geoguide.ge", 70, 1195);

  // === RIGHT SECTION - QR ===
  const qrBoxX = 1120;
  const qrBoxY = 80;
  const qrBoxSize = 560;

  // QR background with border
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
  ctx.fill();
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
  ctx.stroke();

  // Draw actual QR code
  if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
    const padding = 40;
    ctx.drawImage(qrImg, qrBoxX + padding, qrBoxY + padding, qrBoxSize - padding * 2, qrBoxSize - padding * 2);
  }

  // Scan to Listen
  ctx.fillStyle = "#d97706";
  ctx.font = "bold 42px 'Georgia', serif";
  ctx.textAlign = "center";
  ctx.fillText("🎧 Scan to Listen", qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 80);

  // Georgian subtitle
  ctx.fillStyle = "#6b7280";
  ctx.font = "26px 'Georgia', serif";
  ctx.fillText("მოუსმინეთ აუდიო გიდს", qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 120);

  // www.geoguide.ge
  ctx.fillStyle = "#dc2626";
  ctx.font = "bold 40px 'Georgia', serif";
  ctx.fillText("www.geoguide.ge", qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 185);

  ctx.textAlign = "left";
}

export default function ActivationCodesPage() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [museumFilter, setMuseumFilter] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selection
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

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
        setCodes(codes.map((c) => (c.id === statusChangeCode.id ? { ...c, status: newStatus as any } : c)));
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
        setCodes(codes.map((c) => (c.id === id ? { ...c, status: "REVOKED" } : c)));
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
    const exportData = filteredCodes;
    let content = "";

    if (format === "csv") {
      content = "კოდი,ვადა (დღე),Batch,მუზეუმი,შექმნის თარიღი\n";
      content += exportData
        .map((c) => {
          const museumName = museums.find((m) => c.museumIds?.includes(m.id))?.name || "";
          return `${c.code},${c.durationDays},${c.batchName || ""},${museumName},${new Date(c.createdAt).toLocaleDateString("ka-GE")}`;
        })
        .join("\n");
    } else {
      content = exportData.map((c) => c.code).join("\n");
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geoguide-codes-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
  };

  // === Selection helpers ===
  const toggleSelectCode = (id: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCodes.size === filteredCodes.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(filteredCodes.map((c) => c.id)));
    }
  };

  // === QR Ticket Export ===
  const exportQrTickets = async () => {
    const selectedList = filteredCodes.filter((c) => selectedCodes.has(c.id));
    if (selectedList.length === 0) {
      alert("აირჩიეთ კოდები ექსპორტისთვის");
      return;
    }

    setExporting(true);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Load logo
      const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = LOGO_URL;
      });

      for (const code of selectedList) {
        const museum = museums.find((m) => code.museumIds?.includes(m.id));
        if (!museum) continue;

        // Generate QR as SVG then convert to image
        const qrImg = await new Promise<HTMLImageElement | null>((resolve) => {
          const tempDiv = document.createElement("div");
          tempDiv.style.position = "absolute";
          tempDiv.style.left = "-9999px";
          document.body.appendChild(tempDiv);

          import("react-dom/client").then(({ createRoot }) => {
            import("react").then((React) => {
              import("react-qr-code").then((QRCodeModule) => {
                const QRCodeComp = QRCodeModule.default;
                const root = createRoot(tempDiv);
                root.render(
                  React.createElement(QRCodeComp, {
                    value: `https://geoguide.ge/activate/${code.code}`,
                    size: 460,
                    level: "H",
                  })
                );
                setTimeout(() => {
                  const svg = tempDiv.querySelector("svg");
                  if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const img = new Image();
                    img.onload = () => {
                      root.unmount();
                      document.body.removeChild(tempDiv);
                      resolve(img);
                    };
                    img.onerror = () => {
                      root.unmount();
                      document.body.removeChild(tempDiv);
                      resolve(null);
                    };
                    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                  } else {
                    root.unmount();
                    document.body.removeChild(tempDiv);
                    resolve(null);
                  }
                }, 150);
              });
            });
          });
        });

        // Draw ticket - render at credit card size with scale
        const canvas = document.createElement("canvas");
        canvas.width = TICKET_W;
        canvas.height = TICKET_H;
        const ctx = canvas.getContext("2d")!;
        const scaleX = TICKET_W / DRAW_W;
        const scaleY = TICKET_H / DRAW_H;
        ctx.scale(scaleX, scaleY);

        drawTicketBackground(ctx);
        drawTicketContent(ctx, code.code, museum, code.durationDays, logoImg, qrImg);

        // Add to ZIP
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        zip.file(`${code.code}.png`, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `geoguide-tickets-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting tickets:", error);
      alert("ექსპორტის შეცდომა");
    } finally {
      setExporting(false);
    }
  };

  const getMuseumName = (code: ActivationCode) => {
    if (!code.museumIds || code.museumIds.length === 0) return "ყველა";
    const museum = museums.find((m) => code.museumIds.includes(m.id));
    return museum?.name || "—";
  };

  const filteredCodes = codes.filter((c) => {
    const matchesSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesMuseum = museumFilter === "all" || (c.museumIds && c.museumIds.includes(museumFilter));
    return matchesSearch && matchesStatus && matchesMuseum;
  });

  const selectedMuseum = museums.find((m) => m.id === generateForm.museumId);

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
    available: codes.filter((c) => c.status === "AVAILABLE").length,
    redeemed: codes.filter((c) => c.status === "REDEEMED").length,
    expired: codes.filter((c) => c.status === "EXPIRED").length,
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
          <h1 className="text-3xl font-bold flex items-center gap-3">🔑 აქტივაციის კოდები</h1>
          <p className="text-muted-foreground mt-1">კოდების გენერაცია და მართვა</p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)} className="bg-amber-500 hover:bg-amber-600">
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
              {selectedCodes.size > 0 && (
                <Button
                  onClick={exportQrTickets}
                  disabled={exporting}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {selectedCodes.size} ექსპორტი...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      {selectedCodes.size} QR ბილეთი
                    </>
                  )}
                </Button>
              )}
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
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedCodes.size === filteredCodes.length && filteredCodes.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded cursor-pointer"
                    />
                  </th>
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
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      კოდები არ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((code) => (
                    <tr
                      key={code.id}
                      className={`hover:bg-muted/50 ${selectedCodes.has(code.id) ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedCodes.has(code.id)}
                          onChange={() => toggleSelectCode(code.id)}
                          className="rounded cursor-pointer"
                        />
                      </td>
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
                        <button onClick={() => openStatusModal(code)}>{getStatusBadge(code.status)}</button>
                      </td>
                      <td className="p-4 text-muted-foreground">{code.batchName || "—"}</td>
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
                          {(code.status === "AVAILABLE" || code.status === "REDEEMED") && (
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
                        .filter((t) => t.isPublished)
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
                                    tourIds: generateForm.tourIds.filter((id) => id !== tour.id),
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
                  <Button type="button" variant="outline" onClick={() => setShowGenerateModal(false)}>
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
              <button onClick={() => setShowQrModal(false)} className="p-1 hover:bg-muted rounded">
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
                <Button variant="outline" className="flex-1" onClick={() => copyCode(selectedCode.code)}>
                  <Copy className="h-4 w-4 mr-2" />
                  კოპირება
                </Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={downloadQr}>
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
              <button onClick={() => setShowStatusModal(false)} className="p-1 hover:bg-muted rounded">
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
                <Button variant="outline" className="flex-1" onClick={() => setShowStatusModal(false)}>
                  გაუქმება
                </Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={updateCodeStatus}>
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