import { GoogleGenAI, Type } from "@google/genai";
import { TicketPriority, GeminiInsightData } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const apiKey = process.env.API_KEY || '';

// É seguro inicializar o cliente. O erro ocorrerá na chamada da API, que é protegida.
const ai = new GoogleGenAI({ apiKey });

// Validação para garantir que a chave parece uma chave do Google (começa com AIza)
const isValidApiKey = apiKey.startsWith('AIza');

const ticketAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    priority: {
      type: Type.STRING,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
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
      description: "Um resumo conciso de uma frase sobre o problema do usuário, em Português. Se o ticket não tiver informações suficientes, informe que o ticket não contém informações suficientes para identificar o problema.",
    },
    sentimentScore: {
      type: Type.INTEGER,
      description: "Um score de sentimento de 0 (muito negativo) a 100 (muito positivo) com base na linguagem do usuário.",
    },
    urgency: {
      type: Type.STRING,
      enum: ["Baixa", "Média", "Alta", "Crítica"],
      description: "O nível de urgência percebido com base no impacto e no tom do usuário. Responda em Português.",
    },
    suggestedResponse: {
      type: Type.STRING,
      description: "Uma sugestão de primeira resposta completa e empática para o cliente, em tom profissional e prestativo, em Português do Brasil. Se o ticket não tiver informações suficientes, peça mais detalhes ao usuário.",
    },
  },
  required: ["summary", "sentimentScore", "urgency", "suggestedResponse"],
};

export const analyzeTicketContent = async (title: string, description: string) => {
  if (!isValidApiKey) {
    console.error("API Key inválida ou ausente. A IA não será utilizada. Verifique se a variável API_KEY está configurada no .env e se o servidor foi reiniciado.");
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

export const getGeminiInsights = async (title: string, description: string): Promise<GeminiInsightData | null> => {
  if (!isValidApiKey) {
    console.error("API Key inválida ou ausente. Insights não disponíveis. Verifique se a variável API_KEY está configurada no .env e se o servidor foi reiniciado.");
    return null;
  }

  try {
    const prompt = `
      Você é um analista de suporte de TI especialista em triagem de chamados. 
      Analise o seguinte ticket e forneça insights em formato JSON.
      
      Título do Chamado: "${title}"
      Descrição do Chamado: "${description}"

      IMPORTANTE: Todas as respostas de texto (summary, urgency, suggestedResponse) devem ser em Português do Brasil.
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