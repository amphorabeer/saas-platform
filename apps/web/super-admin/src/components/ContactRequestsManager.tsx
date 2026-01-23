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
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@saas-platform/ui";
import { toast } from "sonner";
import { Mail, Eye, Trash2, MessageSquare, RefreshCw } from "lucide-react";

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  module: string | null;
  status: string;
  notes: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  NEW: "bg-red-500",
  READ: "bg-yellow-500",
  REPLIED: "bg-green-500",
  ARCHIVED: "bg-gray-500",
};

const statusLabels: Record<string, string> = {
  NEW: "ახალი",
  READ: "წაკითხული",
  REPLIED: "პასუხგაცემული",
  ARCHIVED: "არქივი",
};

const moduleLabels: Record<string, string> = {
  hotel: "🏨 სასტუმრო",
  restaurant: "🍽️ რესტორანი",
  beauty: "💅 სილამაზის სალონი",
  shop: "🛍️ მაღაზია",
  brewery: "🍺 ლუდსახარში",
  winery: "🍷 ღვინის მარანი",
  distillery: "🥃 დისტილერია",
};

export function ContactRequestsManager() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [notes, setNotes] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = filter === "ALL" ? "/api/contact-requests" : `/api/contact-requests?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("შეცდომა მონაცემების ჩატვირთვისას");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/contact-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        toast.success(`სტატუსი შეიცვალა: ${statusLabels[status]}`);
        fetchRequests();
        if (selectedRequest?.id === id) {
          setSelectedRequest({ ...selectedRequest, status });
        }
      }
    } catch (error) {
      toast.error("შეცდომა სტატუსის შეცვლისას");
    }
  };

  const saveNotes = async () => {
    if (!selectedRequest) return;
    
    try {
      const res = await fetch(`/api/contact-requests/${selectedRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      
      if (res.ok) {
        toast.success("შენიშვნა შენახულია");
        fetchRequests();
        setSelectedRequest({ ...selectedRequest, notes });
      }
    } catch (error) {
      toast.error("შეცდომა შენიშვნის შენახვისას");
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) return;
    
    try {
      const res = await fetch(`/api/contact-requests/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        toast.success("მოთხოვნა წაიშალა");
        fetchRequests();
        setShowDetailModal(false);
      }
    } catch (error) {
      toast.error("შეცდომა წაშლისას");
    }
  };

  const openDetail = (request: ContactRequest) => {
    setSelectedRequest(request);
    setNotes(request.notes || "");
    setShowDetailModal(true);
    
    // Mark as READ if NEW
    if (request.status === "NEW") {
      updateStatus(request.id, "READ");
    }
  };

  const sendEmail = (email: string, subject: string = "", requestId?: string) => {
    window.open(`https://mail.google.com/mail/?view=cm&to=${email}&su=${encodeURIComponent(subject)}`, "_blank");
    if (requestId) {
      updateStatus(requestId, "REPLIED");
    }
  };

  const newCount = requests.filter(r => r.status === "NEW").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            📬 Contact Requests
            {newCount > 0 && (
              <Badge className="ml-3 bg-red-500 text-white">{newCount} ახალი</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Landing Page-დან შემოსული მოთხოვნები</p>
        </div>
        <Button variant="outline" onClick={fetchRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          განახლება
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "NEW", "READ", "REPLIED", "ARCHIVED"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === "ALL" ? "ყველა" : statusLabels[status]}
            {status === "NEW" && newCount > 0 && (
              <Badge className="ml-2 bg-red-600 text-white text-xs">{newCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>მოთხოვნების სია</CardTitle>
          <CardDescription>სულ: {requests.length} მოთხოვნა</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">იტვირთება...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              მოთხოვნები არ მოიძებნა
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                    request.status === "NEW" ? "border-red-300 bg-red-50" : ""
                  }`}
                  onClick={() => openDetail(request)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-3 h-3 rounded-full ${statusColors[request.status]}`} />
                        <span className="font-semibold">{request.name}</span>
                        <span className="text-muted-foreground">{request.email}</span>
                        {request.module && (
                          <Badge variant="outline">
                            {moduleLabels[request.module] || request.module}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(request.createdAt).toLocaleDateString("ka-GE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {request.phone && <span>📞 {request.phone}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendEmail(request.email, `Re: ${request.module || "საკონტაქტო ფორმა"}`, request.id);
                        }}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${statusColors[selectedRequest.status]}`} />
                {selectedRequest.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ელფოსტა</Label>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">ტელეფონი</Label>
                  <p className="font-medium">{selectedRequest.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">მოდული</Label>
                  <p className="font-medium">
                    {selectedRequest.module
                      ? moduleLabels[selectedRequest.module] || selectedRequest.module
                      : "ზოგადი"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">თარიღი</Label>
                  <p className="font-medium">
                    {new Date(selectedRequest.createdAt).toLocaleDateString("ka-GE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Message */}
              <div>
                <Label className="text-muted-foreground">შეტყობინება</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedRequest.message}
                </div>
              </div>

              {/* Status */}
              <div>
                <Label className="text-muted-foreground mb-2 block">სტატუსი</Label>
                <div className="flex gap-2">
                  {["NEW", "READ", "REPLIED", "ARCHIVED"].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedRequest.status === status ? "default" : "outline"}
                      onClick={() => updateStatus(selectedRequest.id, status)}
                    >
                      <span className={`w-2 h-2 rounded-full mr-2 ${statusColors[status]}`} />
                      {statusLabels[status]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-muted-foreground">შენიშვნა</Label>
                <textarea
                  className="w-full mt-1 p-3 border rounded-lg min-h-[100px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="დაამატეთ შენიშვნა..."
                />
                <Button size="sm" className="mt-2" onClick={saveNotes}>
                  შენიშვნის შენახვა
                </Button>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button
                variant="destructive"
                onClick={() => deleteRequest(selectedRequest.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                წაშლა
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    sendEmail(
                      selectedRequest.email,
                      `Re: ${selectedRequest.module || "საკონტაქტო ფორმა"}`,
                      selectedRequest.id
                    )
                  }
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email გაგზავნა
                </Button>
                <Button onClick={() => setShowDetailModal(false)}>დახურვა</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
