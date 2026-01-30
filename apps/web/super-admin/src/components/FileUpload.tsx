"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@saas-platform/ui";
import { Upload, X, Loader2, Play, Pause, Image as ImageIcon, RefreshCw } from "lucide-react";

interface FileUploadProps {
  accept: string;
  folder: string;
  onUpload: (url: string) => void;
  currentUrl?: string;
  label?: string;
  type?: "audio" | "image";
}

export function FileUpload({
  accept,
  folder,
  onUpload,
  currentUrl,
  label = "ფაილის ატვირთვა",
  type = "image",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setPreviewUrl(currentUrl || null);
  }, [currentUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const res = await fetch("/api/geoguide/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder,
        }),
      });

      if (!res.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, publicUrl } = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file");

      setPreviewUrl(publicUrl);
      onUpload(publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      alert("ატვირთვა ვერ მოხერხდა");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUpload("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReplace = () => {
    fileInputRef.current?.click();
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Preview */}
      {previewUrl && type === "image" && (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReplace}
              disabled={uploading}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              შეცვლა
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              წაშლა
            </Button>
          </div>
        </div>
      )}

      {/* Audio Preview */}
      {previewUrl && type === "audio" && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleAudio}
              disabled={uploading}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <audio
              ref={audioRef}
              src={previewUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="flex-1 truncate text-sm text-muted-foreground">
              {previewUrl.split("/").pop()}
            </div>
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReplace}
              disabled={uploading}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              შეცვლა
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              წაშლა
            </Button>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {!previewUrl && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">იტვირთება...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {type === "audio" ? (
                <Upload className="h-6 w-6" />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
              <span className="text-sm">{label}</span>
            </div>
          )}
        </Button>
      )}
    </div>
  );
}
