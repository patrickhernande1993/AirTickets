
import React from 'react';
import { Sparkles, Check, BrainCircuit, Activity, AlertTriangle, Thermometer } from 'lucide-react';
import { GeminiInsightData } from '../types';

interface GeminiInsightsProps {
  insights: GeminiInsightData | null;
  loading: boolean;
  onUseSuggestion: (suggestion: string) => void;
}

const InsightSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5 animate-pulse">
        <div className="flex items-center mb-4 space-x-2">
            <div className="h-6 w-6 bg-indigo-200 rounded"></div>
            <div className="h-5 bg-indigo-200 rounded w-1/3"></div>
        </div>
        <div className="bg-gray-100 h-16 rounded-lg w-full mb-4"></div>
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="h-3 bg-indigo-100 rounded w-1/3 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="h-3 bg-indigo-100 rounded w-1/3 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>
        <div>
            <div className="h-3 bg-indigo-100 rounded w-1/4 mb-2"></div>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
        </div>
    </div>
);


export const GeminiInsights: React.FC<GeminiInsightsProps> = ({ insights, loading, onUseSuggestion }) => {

    if (loading) {
        return <InsightSkeleton />;
    }

    if (!insights) {
        return null;
    }

    const getSentimentDetails = (score: number): { label: string; color: string; bgColor: string; borderColor: string } => {
        if (score > 65) return { label: 'Positivo', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' };
        if (score < 35) return { label: 'Negativo', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-100' };
        return { label: 'Neutro', color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-100' };
    };

    const getUrgencyDetails = (urgency: string) => {
        const u = urgency.toLowerCase();
        if (u.includes('alta') || u.includes('crítica')) return { color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-100' };
        if (u.includes('média')) return { color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-100' };
        return { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' };
    };

    const sentiment = getSentimentDetails(insights.sentimentScore);
    const urgencyStyle = getUrgencyDetails(insights.urgency);

    return (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
            {/* Header com estilo Gemini */}
            <div className="px-5 py-4 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-white flex items-center space-x-2">
                <Sparkles className="text-indigo-600" size={18} />
                <h3 className="font-bold text-indigo-950 text-base">Insights Gemini</h3>
            </div>
            
            <div className="p-5 space-y-6">
                {/* Resumo */}
                <div>
                    <h4 className="text-xs font-bold uppercase text-indigo-500 mb-2 tracking-wide">RESUMO</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                        {insights.summary}
                    </p>
                </div>

                {/* Grid Sentimento e Urgência */}
                {/* gap-3 em vez de gap-4 para ganhar espaço */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Card Sentimento */}
                    {/* p-3 em vez de p-4 para ganhar espaço */}
                    <div className={`p-3 rounded-xl border ${sentiment.bgColor} ${sentiment.borderColor} flex flex-col justify-center`}>
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-wider flex items-center">
                            SENTIMENTO
                        </h4>
                        {/* flex-wrap para permitir quebra de linha se necessário */}
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className={`text-base font-bold ${sentiment.color}`}>{sentiment.label}</span>
                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">({insights.sentimentScore}/100)</span>
                        </div>
                    </div>

                     {/* Card Urgência */}
                     <div className={`p-3 rounded-xl border ${urgencyStyle.bgColor} ${urgencyStyle.borderColor} flex flex-col justify-center`}>
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-wider flex items-center">
                            URGÊNCIA
                        </h4>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className={`text-base font-bold ${urgencyStyle.color}`}>{insights.urgency}</span>
                        </div>
                    </div>
                </div>

                {/* Sugestão de Resposta */}
                <div className="pt-2">
                     <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold uppercase text-indigo-500 tracking-wide">SUGESTÃO DE RESPOSTA</h4>
                        <button 
                            onClick={() => onUseSuggestion(insights.suggestedResponse)}
                            className="flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100 whitespace-nowrap ml-2"
                        >
                            <Check size={14} className="mr-1.5" />
                            Usar esta
                        </button>
                     </div>
                    <div className="relative">
                        <div className="text-gray-600 text-sm p-4 bg-indigo-50/30 rounded-lg border border-indigo-50 leading-relaxed italic">
                            "{insights.suggestedResponse}"
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
