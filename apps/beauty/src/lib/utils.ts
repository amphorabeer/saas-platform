import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} ₾`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatTime(time: string): string {
  return time; // Already in HH:mm format
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BS-${date}-${rand}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: 'კვირა' },
  { value: 1, label: 'ორშაბათი' },
  { value: 2, label: 'სამშაბათი' },
  { value: 3, label: 'ოთხშაბათი' },
  { value: 4, label: 'ხუთშაბათი' },
  { value: 5, label: 'პარასკევი' },
  { value: 6, label: 'შაბათი' },
];

export const STAFF_ROLES = {
  OWNER: 'მფლობელი',
  ADMIN: 'ადმინისტრატორი',
  SPECIALIST: 'სპეციალისტი',
  RECEPTIONIST: 'მიმღები',
} as const;

export const APPOINTMENT_STATUSES = {
  SCHEDULED: { label: 'დაგეგმილი', color: 'bg-blue-500' },
  CONFIRMED: { label: 'დადასტურებული', color: 'bg-green-500' },
  IN_PROGRESS: { label: 'მიმდინარე', color: 'bg-yellow-500' },
  COMPLETED: { label: 'დასრულებული', color: 'bg-emerald-500' },
  CANCELLED: { label: 'გაუქმებული', color: 'bg-red-500' },
  NO_SHOW: { label: 'არ გამოცხადდა', color: 'bg-gray-500' },
} as const;
