import { NextResponse, NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  console.log(`GET ${req.nextUrl.pathname}`);
  return NextResponse.json({ status: "Chat API is active. Use POST to send messages." });
}

export async function POST(req: NextRequest) {
  console.log(`POST ${req.nextUrl.pathname}`);
  try {
    const { messages } = await req.json();
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-68be7759cb7746dbb0b90edba8e78fe0";
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a Replit Agent replica. You can write code, create files, and debug. When asked to create an app, provide the file structure and contents in a JSON-parsable format: {\"files\": [{\"path\": \"filename\", \"content\": \"...\"}]}."
          },
          ...messages
        ]
      })
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 });
  }
}
