interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1" suppressHydrationWarning>{value}</p>
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-copper/20 text-copper-light">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
