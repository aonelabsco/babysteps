import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ParsedInput } from '@/lib/types';

const apiKey = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!apiKey) {
    return NextResponse.json({ error: 'LLM not configured' }, { status: 501 });
  }

  try {
    const { text, babyNames } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const babyNamesStr = babyNames?.length
      ? `Known baby names: ${babyNames.join(', ')}.`
      : '';

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `You are a baby activity parser. Extract structured data from the parent's input about their baby.

${babyNamesStr}

Parse this input: "${text}"

Respond with ONLY a JSON object (no markdown, no explanation) with these fields:
- type: "feed" | "poop" | "pee"
- quantity: number (only for feed, in ml or oz)
- unit: "ml" | "oz" (only for feed)
- size: "big" | "medium" | "small" (only for poop)
- babyName: string (only if a specific baby is mentioned)

If you cannot parse the input, respond with: {"error": "cannot parse"}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
    }

    const parsed: ParsedInput = JSON.parse(content.text);
    if ('error' in parsed) {
      return NextResponse.json({ error: 'Cannot parse input' }, { status: 422 });
    }

    return NextResponse.json({ result: parsed });
  } catch (err: any) {
    console.error('Parse API error:', err);
    return NextResponse.json({ error: 'Failed to parse' }, { status: 500 });
  }
}
