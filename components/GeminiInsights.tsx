
import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { GeminiInsightData } from '../types';

interface GeminiInsightsProps {
  insights: GeminiInsightData | null;
  loading: boolean;
  onUseSuggestion: (suggestion: string) => void;
}

const InsightSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 animate-pulse">
        <div className="flex items-center mb-4">
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 ml-2"></div>
        </div>
        <div className="bg-gray-200 h-8 rounded w-full mb-4"></div>
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-100 p-3 rounded-lg">
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>
        <div>
            <div className="h-3 bg-gray-200 rounded w-1/4 mb-3"></div>
            <div className="bg-gray-100 p-4 rounded-lg space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
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

    const getSentimentDetails = (score: number): { label: string; color: string; bgColor: string; } => {
        if (score > 65) return { label: 'Positivo', color: 'text-green-800', bgColor: 'bg-green-100' };
        if (score < 35) return { label: 'Negativo', color: 'text-red-800', bgColor: 'bg-red-100' };
        return { label: 'Neutro', color: 'text-gray-800', bgColor: 'bg-gray-100' };
    };

    const sentiment = getSentimentDetails(insights.sentimentScore);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center space-x-2 bg-gray-50/50">
                <Sparkles className="text-purple-600" size={20} />
                <h3 className="font-bold text-gray-800">Insights Gemini</h3>
            </div>
            <div className="p-5 space-y-4">
                <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Resumo</h4>
                    <p className="text-gray-800 text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                        {insights.summary}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-lg ${sentiment.bgColor}`}>
                        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Sentimento</h4>
                        <p className={`text-sm font-bold ${sentiment.color}`}>
                            {sentiment.label} ({insights.sentimentScore}/100)
                        </p>
                    </div>
                     <div className="bg-gray-100 p-3 rounded-lg">
                        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Urgência</h4>
                        <p className="text-sm font-bold text-gray-800">{insights.urgency}</p>
                    </div>
                </div>

                <div>
                     <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-semibold uppercase text-gray-500">Sugestão de Resposta</h4>
                        <button 
                            onClick={() => onUseSuggestion(insights.suggestedResponse)}
                            className="flex items-center text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-md transition-colors"
                        >
                            <Check size={14} className="mr-1" />
                            Usar esta
                        </button>
                     </div>
                    <blockquote className="text-gray-600 text-sm p-3 bg-gray-50 rounded-lg border-l-4 border-primary-300 italic">
                        "{insights.suggestedResponse}"
                    </blockquote>
                </div>

            </div>
        </div>
    );
};
