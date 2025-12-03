import { GoogleGenAI } from "@google/genai";

// In Vite, process.env.API_KEY is replaced by the actual key string during build via define in vite.config.ts.
// We assign it to a variable to ensure the replacement happens on the identifier.
// @ts-ignore
const apiKey = process.env.API_KEY || '';

let ai: GoogleGenAI | null = null;

export const generateAIResponse = async (prompt: string, context?: string): Promise<string> => {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length === 0) {
    return "AI service is not configured. Please ensure API_KEY is set in the environment variables.";
  }

  try {
    // Lazy initialization: Create client only when needed
    if (!ai) {
      ai = new GoogleGenAI({ apiKey });
    }

    const fullPrompt = `
      You are an expert Salon Manager AI Assistant for 'The London Salon'.
      Your tone is professional, helpful, and creative.
      
      Context from the current salon state:
      ${context || 'No specific context provided.'}

      User Query: ${prompt}

      Provide a concise and actionable response. Use Markdown for formatting.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Reset client on error in case it's in a bad state
    ai = null;
    return "I'm having trouble connecting to the AI service right now. Please try again later.";
  }
};