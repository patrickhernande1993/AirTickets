
import { GoogleGenAI, Type } from "@google/genai";
import { TicketPriority } from "../types";

// Inicializa o cliente usando a variável de ambiente (injetada automaticamente no ambiente AIStudio/Vite)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Categorias disponíveis no sistema para garantir que a IA escolha uma válida
const SYSTEM_CATEGORIES = [
  'ERP MEGA',
  'Microgestão',
  'Power BI',
  'Acessos',
  'Outro'
];

/**
 * Analisa o título e descrição para sugerir Categoria e Prioridade.
 */
export const classifyTicket = async (title: string, description: string) => {
  try {
    const prompt = `
      Analise este chamado de TI e classifique-o.
      Título: "${title}"
      Descrição: "${description}"

      Categorias permitidas: ${SYSTEM_CATEGORIES.join(', ')}.
      Prioridades permitidas: LOW, MEDIUM, HIGH, CRITICAL.

      Regras:
      - ERP MEGA: Erros de sistema, lentidão no ERP.
      - Acessos: Reset de senha, criação de usuário, permissões.
      - Power BI: Relatórios, dados incorretos.
      - Microgestão: Problemas administrativos específicos.
      - CRITICAL: Sistema parado, ninguém consegue trabalhar.
      - HIGH: Setor parado ou erro bloqueante.
      - MEDIUM: Erro que atrapalha mas tem contorno.
      - LOW: Dúvidas, solicitações estéticas.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: SYSTEM_CATEGORIES },
            priority: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
            reasoning: { type: Type.STRING, description: "Breve motivo da classificação" }
          },
          required: ["category", "priority"]
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) return null;
    
    return JSON.parse(jsonStr) as { category: string, priority: TicketPriority, reasoning: string };
  } catch (error) {
    console.error("Erro na classificação IA:", error);
    return null;
  }
};

/**
 * Gera uma sugestão técnica de solução para o chamado.
 */
export const getGeminiInsights = async (title: string, description: string) => {
  try {
    const prompt = `
      Você é um especialista em suporte de TI Nível 3.
      Forneça um guia passo a passo conciso para resolver o seguinte problema:
      
      Título: ${title}
      Problema: ${description}
      
      Formate a resposta em Markdown leve (use tópicos). Seja direto e técnico.
      Se faltarem informações, sugira quais perguntas fazer ao usuário.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Erro nos insights IA:", error);
    return null;
  }
};
