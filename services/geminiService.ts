import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ModelType } from "../types";
import { DEFAULT_SYSTEM_INSTRUCTION } from "../constants";

// Safely access process.env.API_KEY to avoid ReferenceError in some browser environments
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    console.warn("process.env.API_KEY is not accessible.");
    return '';
  }
};

const apiKey = getApiKey();

// Initialize the client. The key is required.
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