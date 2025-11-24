
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TicketPriority } from "../types";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const ticketAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    priority: {
      type: Type.STRING,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], // Keep values in English for code compatibility
      description: "A prioridade estimada do chamado de TI com base na urgência e impacto.",
    },
    category: {
      type: Type.STRING,
      description: "Uma categoria curta para o problema (ex: Hardware, Software, Rede, Acesso). Responda em Português.",
    },
    summary: {
      type: Type.STRING,
      description: "Um resumo técnico de uma frase sobre o problema. Responda em Português.",
    },
  },
  required: ["priority", "category", "summary"],
};

export const analyzeTicketContent = async (title: string, description: string) => {
  if (!apiKey) {
    console.error("API Key is missing in geminiService. Make sure API_KEY is set in .env and server restarted.");
    return null;
  }

  try {
    const prompt = `
      Analise a seguinte solicitação de suporte de TI. 
      Determine o nível de prioridade (LOW, MEDIUM, HIGH, CRITICAL) e atribua uma categoria.
      
      Título do Chamado: ${title}
      Descrição do Chamado: ${description}

      IMPORTANTE: O resumo e a categoria devem ser em Português do Brasil.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: ticketAnalysisSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) return null;

    return JSON.parse(jsonText) as { priority: TicketPriority; category: string; summary: string };
  } catch (error) {
    console.error("Error analyzing ticket with Gemini:", error);
    return null;
  }
};

export const generateSolutionSuggestion = async (title: string, description: string, category: string) => {
    if (!apiKey) return "Serviço de IA Indisponível (Falta API Key)";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                Você é um Engenheiro de Suporte de TI Sênior. Forneça um guia de solução passo a passo conciso para o seguinte problema.
                Responda inteiramente em Português do Brasil.
                Formate a saída como Markdown.
                
                Categoria do Problema: ${category}
                Título: ${title}
                Descrição: ${description}
            `,
            config: {
                thinkingConfig: { thinkingBudget: 1024 }
            }
        });
        
        return response.text || "Nenhuma solução sugerida.";
    } catch (error) {
        console.error("Error generating solution:", error);
        return "Falha ao gerar solução.";
    }
}
