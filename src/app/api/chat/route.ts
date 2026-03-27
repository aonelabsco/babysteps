import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!apiKey) {
    return NextResponse.json({ error: 'LLM not configured' }, { status: 501 });
  }

  try {
    const { question, eventsSummary, babyName } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are a helpful baby care assistant. A parent is asking about their baby${babyName ? ` ${babyName}` : ''}.

Here is a summary of recent activity data:
${eventsSummary || 'No data available yet.'}

Parent's question: "${question}"

Answer concisely and helpfully in 1-3 sentences. Use the data above to give specific answers when possible. If the data doesn't contain the answer, say so briefly. Be warm but concise. Do not use markdown formatting.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
    }

    return NextResponse.json({ answer: content.text });
  } catch (err: unknown) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Failed to answer' }, { status: 500 });
  }
}
