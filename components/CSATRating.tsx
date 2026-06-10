
import React, { useState } from 'react';
import { Ticket, TicketStatus, User } from '../types';
import { CheckCircle } from 'lucide-react';

interface CSATRatingProps {
  ticket: Ticket;
  currentUser: User;
  onRate: (ticketId: string, rating: 1 | 2 | 3) => Promise<void>;
}

const ratings: { value: 1 | 2 | 3; emoji: string; label: string; color: string; bg: string; border: string }[] = [
  { value: 1, emoji: '😞', label: 'Ruim', color: 'text-red-600', bg: 'bg-red-50 hover:bg-red-100', border: 'border-red-200 hover:border-red-400' },
  { value: 2, emoji: '😐', label: 'Regular', color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100', border: 'border-amber-200 hover:border-amber-400' },
  { value: 3, emoji: '😊', label: 'Ótimo', color: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100', border: 'border-green-200 hover:border-green-400' },
];

const ratingLabels: Record<number, string> = { 1: 'Ruim', 2: 'Regular', 3: 'Ótimo' };
const ratingEmojis: Record<number, string> = { 1: '😞', 2: '😐', 3: '😊' };

export const CSATRating: React.FC<CSATRatingProps> = ({ ticket, currentUser, onRate }) => {
  const [loading, setLoading] = useState(false);

  if (ticket.status !== TicketStatus.RESOLVED) return null;
  if (ticket.requesterId !== currentUser.id) return null;

  if (ticket.csatRating) {
    return (
      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3">
        <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Você avaliou este atendimento</p>
          <p className="text-sm font-bold text-green-900 mt-0.5">
            {ratingEmojis[ticket.csatRating]} {ratingLabels[ticket.csatRating]}
          </p>
        </div>
      </div>
    );
  }

  const handleRate = async (rating: 1 | 2 | 3) => {
    setLoading(true);
    try {
      await onRate(ticket.id, rating);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
        Como você avalia este atendimento?
      </p>
      <div className="flex gap-3">
        {ratings.map((r) => (
          <button
            key={r.value}
            onClick={() => handleRate(r.value)}
            disabled={loading}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border-2 font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${r.bg} ${r.border}`}
          >
            <span className="text-2xl leading-none">{r.emoji}</span>
            <span className={`text-[10px] uppercase tracking-widest font-bold ${r.color}`}>{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
