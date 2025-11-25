



// FIX: Removed 'Schema' which is not an exported member of @google/genai.
import { GoogleGenAI, Type } from "@google/genai";
import { TicketPriority, GeminiInsightData } from "../types";

// FIX: Initialize with process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: Removed 'Schema' type annotation which is not exported from @google/genai.
const ticketAnalysisSchema = {
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

const geminiInsightsSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "Um resumo conciso do problema do ticket em uma ou duas frases. Responda em Português.",
        },
        sentimentScore: {
            type: Type.NUMBER,
            description: "Uma pontuação de sentimento do cliente de 0 a 100, onde 0 é muito negativo e 100 é muito positivo.",
        },
        urgency: {
            type: Type.STRING,
            enum: ["Baixa", "Média", "Alta", "Crítica"],
            description: "O nível de urgência percebido com base no texto. Responda em Português.",
        },
        suggestedResponse: {
            type: Type.STRING,
            description: "Uma sugestão de primeira resposta amigável para o cliente, pedindo mais informações se necessário ou confirmando o recebimento. Responda em Português.",
        },
    },
    required: ["summary", "sentimentScore", "urgency", "suggestedResponse"],
};

export const getGeminiInsights = async (title: string, description: string): Promise<GeminiInsightData | null> => {
    try {
        const prompt = `
            Analise o seguinte chamado de suporte de TI e forneça insights.

            Título: "${title}"
            Descrição: "${description}"

            Gere um JSON com as seguintes informações:
            - summary: Um resumo conciso do problema.
            - sentimentScore: Uma pontuação de sentimento do cliente de 0 a 100.
            - urgency: O nível de urgência (Baixa, Média, Alta, Crítica).
            - suggestedResponse: Uma sugestão de primeira resposta para o cliente.

            Todas as respostas em texto devem ser em Português do Brasil.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: geminiInsightsSchema,
            },
        });

        const jsonText = response.text;
        if (!jsonText) return null;

        return JSON.parse(jsonText) as GeminiInsightData;
    } catch (error) {
        console.error("Error getting Gemini insights:", error);
        return null;
    }
};

export const analyzeTicketContent = async (title: string, description: string) => {
  // FIX: Removed apiKey check, as per guidelines API_KEY is assumed to be present.
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