import { GoogleGenAI } from "@google/genai";

declare var process: { env: { API_KEY?: string } };

// Safely access the key, handling cases where process might be undefined in strict browser environments
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';

// Safely initialize the client. If no key, we will handle errors gracefully in the UI.
const ai = new GoogleGenAI({ apiKey });

export const generateAIResponse = async (prompt: string, context?: string): Promise<string> => {
  if (!apiKey) {
    return "AI service is not configured. Please ensure API_KEY is set in the environment variables.";
  }

  try {
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
    return "I'm having trouble connecting to the AI service right now. Please try again later.";
  }
};