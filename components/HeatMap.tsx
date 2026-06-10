
import React, { useMemo, useState } from 'react';
import { Ticket } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HeatMapProps {
  tickets: Ticket[];
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOUR_GROUPS = [
  '00-02', '02-04', '04-06', '06-08', '08-10', '10-12',
  '12-14', '14-16', '16-18', '18-20', '20-22', '22-24'
];

export const HeatMap: React.FC<HeatMapProps> = ({ tickets }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; count: number } | null>(null);

  // Build heatmap grid: [day][hourGroup] = count
  const heatGrid = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
    tickets.forEach(t => {
      const d = t.createdAt;
      if (!d) return;
      const day = d.getDay(); // 0=Sun
      const hour = d.getHours();
      const group = Math.floor(hour / 2);
      grid[day][group]++;
    });
    return grid;
  }, [tickets]);

  const maxVal = useMemo(() => Math.max(...heatGrid.flat(), 1), [heatGrid]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    const intensity = Math.ceil((count / maxVal) * 5);
    switch (intensity) {
      case 1: return 'bg-blue-100';
      case 2: return 'bg-blue-200';
      case 3: return 'bg-blue-400';
      case 4: return 'bg-blue-600';
      default: return 'bg-blue-800';
    }
  };

  // Top 5 categories
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [tickets]);

  const maxCategory = categoryData[0]?.value || 1;

  // Top 5 requesters
  const requesterData = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      const key = t.requester || 'Desconhecido';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [tickets]);

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-1">
          Volume por Dia da Semana × Hora
        </h3>
        <p className="text-xs text-slate-500 mb-4">Concentração de chamados abertos por período</p>
        <div className="overflow-x-auto">
          <div className="min-w-[540px]">
            {/* Hour headers */}
            <div className="flex ml-10 mb-1">
              {HOUR_GROUPS.map(h => (
                <div key={h} className="flex-1 text-[9px] font-bold text-slate-400 uppercase text-center">{h}</div>
              ))}
            </div>
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center mb-1">
                <span className="w-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-shrink-0">{day}</span>
                {heatGrid[dayIdx].map((count, hourIdx) => (
                  <div
                    key={hourIdx}
                    className={`flex-1 h-7 mx-0.5 rounded-none cursor-default transition-opacity ${getColor(count)} relative`}
                    onMouseEnter={e => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({ x: rect.left, y: rect.top, count });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    title={`${count} chamado${count !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Menos</span>
              {['bg-slate-100', 'bg-blue-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-blue-800'].map((c, i) => (
                <div key={i} className={`h-4 w-6 rounded-none ${c} border border-slate-200`} />
              ))}
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mais</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 5 Categories */}
        <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-1">Top 5 Categorias</h3>
          <p className="text-xs text-slate-500 mb-4">Chamados por categoria</p>
          <div className="space-y-3">
            {categoryData.length === 0 && <p className="text-xs text-slate-400">Sem dados</p>}
            {categoryData.map(({ name, value }) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 truncate max-w-[160px]">{name}</span>
                  <span className="font-bold text-slate-900">{value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-none overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-none transition-all"
                    style={{ width: `${(value / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Requesters */}
        <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-1">Top 5 Solicitantes</h3>
          <p className="text-xs text-slate-500 mb-4">Chamados por solicitante</p>
          {requesterData.length === 0 ? (
            <p className="text-xs text-slate-400">Sem dados</p>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={requesterData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="0" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '0px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value: number) => [`${value} chamados`, '']}
                  />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[0, 0, 0, 0]} maxBarSize={24} name="Chamados" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
