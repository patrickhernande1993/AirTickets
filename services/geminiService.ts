
/**
 * Implementação do serviço Gemini para análise inteligente de chamados.
 * Segue as diretrizes do SDK @google/genai.
 */
import { GoogleGenAI, Type } from "@google/genai";

// Inicialização centralizada do cliente Gemini usando a variável de ambiente process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analisa o conteúdo do chamado para sugerir prioridade e categoria via Gemini 3 Flash.
 */
export const analyzeTicketContent = async (title: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise este chamado de suporte e sugira a prioridade e a categoria correta.
      Título: ${title}
      Descrição: ${description}
      
      Categorias possíveis: ERP MEGA, Microgestão, Power BI, Acessos, Outro.
      Prioridades possíveis: LOW, MEDIUM, HIGH, CRITICAL.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedPriority: {
              type: Type.STRING,
              description: 'Prioridade sugerida para o chamado.',
            },
            suggestedCategory: {
              type: Type.STRING,
              description: 'Categoria sugerida entre as opções disponíveis.',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Breve explicação do porquê desta sugestão.',
            },
          },
          required: ["suggestedPriority", "suggestedCategory", "reasoning"],
          propertyOrdering: ["suggestedPriority", "suggestedCategory", "reasoning"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    return null;
  }
};

/**
 * Gera insights e passos de resolução para um chamado específico usando Gemini 3 Flash.
 */
export const getGeminiInsights = async (title: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Como um especialista em TI, forneça insights detalhados e passos sugeridos para resolver este problema:
      Título: ${title}
      Descrição: ${description}
      
      Formate a resposta em Markdown amigável.`,
    });

    return response.text;
  } catch (error) {
    console.error("Erro ao obter insights do Gemini:", error);
    return "Desculpe, não foi possível gerar insights automáticos no momento.";
  }
};
