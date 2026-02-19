'use client';

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

export function NumPad({
  value,
  onChange,
  onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm?: () => void;
}) {
  const handleKey = (k: string) => {
    if (k === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (k === '.' && value.includes('.')) return;
    if (value.split('.')[1]?.length >= 2 && k !== '⌫') return;
    onChange(value + k);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((row, i) =>
        row.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleKey(k)}
            className="flex h-12 items-center justify-center rounded-xl bg-white/10 text-lg font-medium text-white hover:bg-white/20 active:scale-95 transition touch-manipulation"
          >
            {k}
          </button>
        ))
      )}
      {onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          className="col-span-3 mt-2 h-12 rounded-xl bg-orange-500 font-semibold text-white hover:bg-orange-600 touch-manipulation"
        >
          დადასტურება
        </button>
      )}
    </div>
  );
}
