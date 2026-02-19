'use client';

export type FoodCostRow = {
  name: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  foodCostPerUnit: number;
  foodCostTotal: number;
  foodCostPercent: number;
  profit: number;
};

export function FoodCostTable({
  items,
  sortBy,
  onSort,
}: {
  items: FoodCostRow[];
  sortBy: string;
  onSort: (key: string) => void;
}) {
  const sorted = [...items].sort((a, b) => {
    if (sortBy === 'foodCostPercent') return b.foodCostPercent - a.foodCostPercent;
    if (sortBy === 'profit') return b.profit - a.profit;
    return b.quantitySold - a.quantitySold;
  });

  const cellClass = (p: number) => {
    if (p < 30) return 'text-emerald-400';
    if (p <= 35) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="p-3 font-medium text-slate-400">კერძი</th>
            <th className="p-3 font-medium text-slate-400">კატეგორია</th>
            <th className="p-3 font-medium text-slate-400">გაყიდული</th>
            <th className="p-3 font-medium text-slate-400">გაყიდვა (₾)</th>
            <th className="p-3 font-medium text-slate-400">food cost/ერთ.</th>
            <th className="p-3 font-medium text-slate-400">food cost ჯამი</th>
            <th
              className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
              onClick={() => onSort('foodCostPercent')}
            >
              FC % {sortBy === 'foodCostPercent' && '▾'}
            </th>
            <th
              className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
              onClick={() => onSort('profit')}
            >
              მოგება {sortBy === 'profit' && '▾'}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.name} className="border-b border-white/5 hover:bg-white/5">
              <td className="p-3 font-medium text-white">{row.name}</td>
              <td className="p-3 text-slate-400">{row.categoryName}</td>
              <td className="p-3 text-slate-300">{row.quantitySold}</td>
              <td className="p-3 text-slate-300">₾{row.revenue.toFixed(2)}</td>
              <td className="p-3 text-slate-400">₾{row.foodCostPerUnit.toFixed(2)}</td>
              <td className="p-3 text-slate-400">₾{row.foodCostTotal.toFixed(2)}</td>
              <td className={`p-3 font-medium ${cellClass(row.foodCostPercent)}`}>{row.foodCostPercent}%</td>
              <td className="p-3 text-emerald-400">₾{row.profit.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
