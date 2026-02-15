/** Fixed format helpers to avoid hydration mismatch between server/client */

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTS,
  hour: "2-digit",
  minute: "2-digit",
};

/** Format date as DD/MM/YYYY (ka-GE) */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ka-GE", DATE_OPTS);
}

/** Format date with time as DD/MM/YYYY, HH:mm (ka-GE) */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("ka-GE", DATETIME_OPTS);
}

/** Format amount as "X.XX ₾" - works with number or Prisma Decimal */
export function formatCurrency(amount: number | unknown): string {
  return `${Number(amount).toFixed(2)} ₾`;
}
