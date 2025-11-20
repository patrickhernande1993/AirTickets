import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TicketPriority } from "../types";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const ticketAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    priority: {
      type: Type.STRING,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      description: "The estimated priority of the IT ticket based on urgency and impact.",
    },
    category: {
      type: Type.STRING,
      description: "A short category tag for the issue (e.g., Hardware, Software, Network, Access).",
    },
    summary: {
      type: Type.STRING,
      description: "A one-sentence technical summary of the issue.",
    },
  },
  required: ["priority", "category", "summary"],
};

export const analyzeTicketContent = async (title: string, description: string) => {
  if (!apiKey) {
    console.warn("API Key is missing. Skipping AI analysis.");
    return null;
  }

  try {
    const prompt = `
      Analyze the following IT support ticket request. 
      Determine the priority level (LOW, MEDIUM, HIGH, CRITICAL) and assign a category.
      
      Ticket Title: ${title}
      Ticket Description: ${description}
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
    if (!apiKey) return "AI Service Unavailable (Missing API Key)";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                You are a senior IT Support Engineer. Provide a concise, step-by-step troubleshooting guide for the following issue.
                Format the output as Markdown.
                
                Issue Category: ${category}
                Title: ${title}
                Description: ${description}
            `,
            config: {
                thinkingConfig: { thinkingBudget: 1024 } // Enable some thinking for better troubleshooting steps
            }
        });
        
        return response.text || "No solution suggested.";
    } catch (error) {
        console.error("Error generating solution:", error);
        return "Failed to generate solution.";
    }
}