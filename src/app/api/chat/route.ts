import { getGeminiResponse, type MessageHistory } from "@/app/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

// Request body type
interface ChatRequestBody {
  message: string;
  history?: MessageHistory[];
  systemPrompt?: string;
}

// Response type
interface ChatResponse {
  reply: string;
}

interface ErrorResponse {
  error: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse | ErrorResponse>> {
  try {
    const body: ChatRequestBody = await req.json();
    const { message, history = [], systemPrompt } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: "Message is required and must be a string" }, 
        { status: 400 }
      );
    }

    // Validate history format if provided
    if (history && !Array.isArray(history)) {
      return NextResponse.json(
        { error: "History must be an array" }, 
        { status: 400 }
      );
    }

    // Validate each history item
    if (history && history.length > 0) {
      const isValidHistory = history.every(
        (item) => 
          typeof item === 'object' &&
          item !== null &&
          typeof item.role === 'string' &&
          (item.role === 'user' || item.role === 'assistant') &&
          typeof item.content === 'string'
      );

      if (!isValidHistory) {
        return NextResponse.json(
          { error: "Invalid history format" }, 
          { status: 400 }
        );
      }
    }

    // Get response from Gemini
    const reply: string = await getGeminiResponse(message, history, systemPrompt);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("API route error:", error);
    
    // Handle different error types
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "An unexpected error occurred" }, 
      { status: 500 }
    );
  }
}