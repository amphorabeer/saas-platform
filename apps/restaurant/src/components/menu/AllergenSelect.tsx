'use client';

const ALLERGENS = [
  'გლუტენი',
  'რძე',
  'თხილი',
  'კვერცხი',
  'სოია',
  'თევზი',
  'ნიგოზი',
];

type AllergenSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
};

export function AllergenSelect({ value, onChange, disabled }: AllergenSelectProps) {
  const toggle = (allergen: string) => {
    if (value.includes(allergen)) {
      onChange(value.filter((a) => a !== allergen));
    } else {
      onChange([...value, allergen]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALLERGENS.map((a) => (
        <button
          key={a}
          type="button"
          disabled={disabled}
          onClick={() => toggle(a)}
          className={`rounded-lg border px-3 py-1.5 text-sm transition ${
            value.includes(a)
              ? 'border-orange-500/50 bg-orange-500/20 text-orange-400'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
