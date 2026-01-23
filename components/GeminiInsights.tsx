
import React, { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';
import { getGeminiInsights } from '../services/geminiService';

interface GeminiInsightsProps {
    title: string;
    description: string;
}

// Fix: Implement standard Gemini insights display component.
export const GeminiInsights: React.FC<GeminiInsightsProps> = ({ title, description }) => {
    const [insights, setInsights] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleGetInsights = async () => {
        setLoading(true);
        const result = await getGeminiInsights(title, description);
        setInsights(result || "Nenhum insight disponível.");
        setLoading(false);
        setIsExpanded(true);
    };

    return (
        <div className="mt-6 border border-primary-100 rounded-xl overflow-hidden bg-gradient-to-br from-white to-primary-50/20 shadow-sm">
            <div className="p-4 flex items-center justify-between border-b border-primary-50/50">
                <div className="flex items-center space-x-2">
                    <div className="bg-primary-100 p-1.5 rounded-lg text-primary-600">
                        <BrainCircuit size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Análise Inteligente (Gemini AI)</h3>
                </div>
                
                {!insights ? (
                    <button 
                        onClick={handleGetInsights}
                        disabled={loading}
                        className="text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-all flex items-center shadow-sm disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Sparkles size={14} className="mr-2" />}
                        Gerar Sugestões
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-400 hover:text-gray-600 p-1 bg-white border border-gray-100 rounded-full transition-colors"
                    >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                )}
            </div>

            {insights && isExpanded && (
                <div className="p-4 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="bg-white rounded-lg border border-primary-50 p-4 shadow-inner">
                        <div className="text-sm text-gray-700 leading-relaxed space-y-3 whitespace-pre-wrap">
                            {insights}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
