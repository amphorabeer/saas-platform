"use client";

import { formatDate, formatDateTime } from "@/lib/format";

interface FormattedDateProps {
  date: Date | string;
  /** Show time (HH:mm). Default: false — only DD/MM/YYYY */
  showTime?: boolean;
  className?: string;
}

/** Fixed format to avoid hydration mismatch. Uses formatDate/formatDateTime from lib */
export function FormattedDate({
  date,
  showTime = false,
  className,
}: FormattedDateProps) {
  const formatted = showTime ? formatDateTime(date) : formatDate(date);

  return (
    <span className={className} suppressHydrationWarning>
      {formatted}
    </span>
  );
}
