interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-text-muted text-sm">
        {description || "ეს გვერდი მალე დაემატება."}
      </p>
    </div>
  );
}
