import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ModelType } from "../types";
import { DEFAULT_SYSTEM_INSTRUCTION } from "../constants";

// The API key must be obtained exclusively from process.env.API_KEY
// The user is responsible for ensuring this environment variable is set in Vercel or their environment.
const apiKey = process.env.API_KEY || ''; 

// We initialize the client inside functions or lazily to avoid issues if the key is missing at import time (though it should be there).
// However, for best practice per system prompt:
const ai = new GoogleGenAI({ apiKey });

export const createChatSession = (model: ModelType): Chat => {
  return ai.chats.create({
    model: model,
    config: {
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

export const sendMessageStream = async (
  chat: Chat, 
  message: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    const resultStream = await chat.sendMessageStream({ message });
    let fullText = "";
    
    for await (const chunk of resultStream) {
      const responseChunk = chunk as GenerateContentResponse;
      const text = responseChunk.text || "";
      fullText += text;
      onChunk(text);
    }
    
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};