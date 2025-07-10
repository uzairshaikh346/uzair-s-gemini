import { GoogleGenerativeAI } from "@google/generative-ai";

// Type definitions
interface MessageHistory {
  role: "user" | "assistant";
  content: string;
}

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);

export async function getGeminiResponse(
  message: string,
  history: MessageHistory[] = [],
  systemPrompt: string | null = null
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // If there's conversation history, start a chat session
    if (history && history.length > 0) {
      // Convert history to Gemini format
      const chatHistory: GeminiMessage[] = history.slice(0, -1).map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      // Add system prompt if provided
      let initialHistory: GeminiMessage[] = chatHistory;
      if (systemPrompt) {
        initialHistory = [
          {
            role: "user",
            parts: [{ text: systemPrompt }]
          },
          {
            role: "model",
            parts: [{ text: "I understand. I'll maintain context from our conversation and provide helpful responses." }]
          },
          ...chatHistory
        ];
      }

      // Generation configuration
      const generationConfig: GenerationConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      };

      // Start chat with history
      const chat = model.startChat({
        history: initialHistory,
        generationConfig,
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    } else {
      // For first message or when no history
      let prompt: string = message;
      if (systemPrompt) {
        prompt = `${systemPrompt}\n\nUser: ${message}`;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to get response from Gemini");
  }
}

// Alternative approach using conversation context as a single prompt
export async function getGeminiResponseWithContext(
  message: string,
  history: MessageHistory[] = [],
  systemPrompt: string | null = null
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Build conversation context
    let contextPrompt: string = "";
    
    if (systemPrompt) {
      contextPrompt += `${systemPrompt}\n\n`;
    }
    
    if (history && history.length > 0) {
      contextPrompt += "Previous conversation:\n";
      history.forEach((msg) => {
        const role: string = msg.role === "assistant" ? "Assistant" : "User";
        contextPrompt += `${role}: ${msg.content}\n`;
      });
      contextPrompt += "\n";
    }
    
    contextPrompt += `User: ${message}\nAssistant:`;

    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to get response from Gemini");
  }
}

// Export types for use in other files
export type { MessageHistory, GeminiMessage, GenerationConfig };