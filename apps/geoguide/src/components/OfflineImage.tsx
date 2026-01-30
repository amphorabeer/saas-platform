"use client";

import { useState, useEffect } from "react";

interface OfflineImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function OfflineImage({ src, alt, className }: OfflineImageProps) {
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const { getImageOffline } = await import("@/lib/offline-manager");
        const offlineUrl = await getImageOffline(src);
        if (offlineUrl) {
          console.log("Using offline image:", src);
          setImageSrc(offlineUrl);
        } else {
          setImageSrc(src);
        }
      } catch (error) {
        console.log("Offline check failed, using online URL");
        setImageSrc(src);
      }
    };

    if (src) {
      loadImage();
    }
  }, [src]);

  if (!src) return null;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
    />
  );
}
