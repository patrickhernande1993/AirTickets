import React from 'react';
import { Building2 } from 'lucide-react';

interface SectorFilterProps {
  sectors: string[];
  value: string;
  onChange: (sector: string) => void;
}

export const SectorFilter: React.FC<SectorFilterProps> = ({ sectors, value, onChange }) => {
  if (sectors.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 size={14} className="text-slate-500 flex-shrink-0" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-none text-xs text-slate-600 outline-none bg-white focus:border-primary-500 font-medium"
      >
        <option value="ALL">TODOS SETORES</option>
        {sectors.map(s => (
          <option key={s} value={s}>{s.toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
};
