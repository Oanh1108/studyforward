import { NextResponse } from 'next/server';

const MODELS = [
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

const SCENARIO_ROLES: Record<string, { role: string; userRole: string; setting: string }> = {
  'coffee-shop': {
    role: 'A friendly barista at a specialty coffee shop',
    userRole: 'A customer ordering a beverage and pastry',
    setting: 'Coffee shop counter with espresso machines and menu board',
  },
  airport: {
    role: 'An airline check-in and customer service agent',
    userRole: 'A passenger checking in luggage and asking about flights',
    setting: 'Airport departures check-in counter',
  },
  hotel: {
    role: 'A front desk receptionist at a modern hotel',
    userRole: 'A guest checking in or asking about hotel amenities',
    setting: 'Hotel lobby reception desk',
  },
  interview: {
    role: 'A professional HR manager conducting a job interview',
    userRole: 'A job applicant introducing themselves and answering questions',
    setting: 'Interview room at a company office',
  },
  shopping: {
    role: 'A helpful sales associate at a clothing store',
    userRole: 'A shopper looking for sizes, colors, and prices',
    setting: 'Fashion retail shop floor and fitting rooms',
  },
  meeting: {
    role: 'A friendly international student/attendee at a networking event',
    userRole: 'Someone introducing themselves and making small talk',
    setting: 'Social meetup or university lounge',
  },
  restaurant: {
    role: 'An attentive server at a casual dining restaurant',
    userRole: 'A diner ordering meals, asking for recommendations, and the check',
    setting: 'Dining table with menu',
  },
  directions: {
    role: 'A kind local resident on a city street',
    userRole: 'A visitor asking how to get to a nearby landmark or station',
    setting: 'City sidewalk near a subway station',
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scenarioId, scenarioTag, scenarioTitle, messages, userMessage, userLevel } = body;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ message: 'GEMINI_API_KEY chưa được cấu hình trên máy chủ.' }, { status: 503 });
    }

    const scenarioInfo = SCENARIO_ROLES[scenarioId] || {
      role: 'A native English conversation partner',
      userRole: 'An English learner practicing communication',
      setting: scenarioTag || 'Realistic daily situation',
    };

    const level = userLevel || 'A2 - Intermediate';

    const systemPrompt = `You are an interactive conversational English tutor roleplaying in a realistic scenario.
Scenario: "${scenarioTag}" (${scenarioTitle || scenarioId})
Your Role: ${scenarioInfo.role}
Learner's Role: ${scenarioInfo.userRole}
Setting: ${scenarioInfo.setting}
Learner's CEFR Level: ${level}

Guidelines:
1. Stay in character at all times. Be welcoming, natural, and helpful.
2. Speak in natural spoken English appropriate for daily conversation.
3. Keep your reply concise (1-3 sentences) so the conversation flows interactively.
4. If the learner sent a message, respond directly to what they said, answer their request/question, or ask a natural follow-up question.
5. If the learner's message has unnatural phrasing or errors, provide a polite "correction" and helpful "tip" in the feedback field without breaking character in your actual reply.
6. Provide 2-3 natural suggestions for what the learner could say next, with Vietnamese translations.
7. Provide 2-3 relevant vocabulary items (with IPA phonetic transcription and Vietnamese meaning).

You must respond ONLY with a valid JSON object matching this schema:
{
  "reply": "string (in-character English response)",
  "replyVi": "string (accurate Vietnamese translation of your reply)",
  "suggestions": [
    {"en": "English sentence 1", "vi": "Vietnamese meaning 1"},
    {"en": "English sentence 2", "vi": "Vietnamese meaning 2"}
  ],
  "vocabulary": [
    {"word": "vocabulary word or phrase", "ipa": "/phonetics/", "meaning": "Vietnamese definition"}
  ],
  "feedback": {
    "correction": "More natural phrasing if the learner made a mistake, otherwise empty string",
    "tip": "Brief grammar/usage advice in Vietnamese, otherwise empty string"
  }
}`;

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // System prompt
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\n[Session Start]` }],
    });

    // History turns
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        });
      }
    }

    // Latest user message
    if (userMessage && typeof userMessage === 'string' && userMessage.trim()) {
      contents.push({
        role: 'user',
        parts: [{ text: userMessage.trim() }],
      });
    } else if (contents.length === 1) {
      // First turn greeting trigger
      contents.push({
        role: 'user',
        parts: [{ text: 'Start the conversation now. Greet me in character and ask how you can help.' }],
      });
    }

    let lastError: any = null;

    for (const model of MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return NextResponse.json({
              reply: parsed.reply || 'Hello! How can I help you today?',
              replyVi: parsed.replyVi || 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
              suggestions: parsed.suggestions || [],
              vocabulary: parsed.vocabulary || [],
              feedback: parsed.feedback || { correction: '', tip: '' },
              modelUsed: model,
            });
          }
        } else {
          lastError = await res.text();
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    return NextResponse.json(
      { error: 'Could not connect to Gemini service. ' + (lastError || '') },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

