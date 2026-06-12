// Deno Edge Function: tutor-chat
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// System prompt builder
function getSystemPrompt(nativeLang: string, targetLang: string, level: string): string {
  const nativeName = nativeLang === 'es' ? 'Spanish' : 'English';
  const targetName = targetLang === 'es' ? 'Spanish' : 'English';
  
  let levelInstructions = '';
  if (level === 'basic') {
    levelInstructions = `
- Speak primarily in ${nativeName} when explaining rules.
- Keep sentences in ${targetName} extremely simple, short, and clear.
- Provide direct translations in brackets for all ${targetName} text. e.g., "Hello [Hola]".
- Focus on basic vocabulary and simple present-tense grammar.
- Correct user errors immediately and explain the correction in ${nativeName}.
`;
  } else if (level === 'intermediate') {
    levelInstructions = `
- Speak 70% in ${targetName} and 30% in ${nativeName}.
- Use intermediate vocabulary and introduce common idioms.
- Explain grammatical concepts in ${targetName} first, then summarize in ${nativeName} if complex.
- Highlight minor mistakes and suggest more natural phrasing.
`;
  } else {
    levelInstructions = `
- Speak 98% in ${targetName}. Only use ${nativeName} for highly technical translation terms.
- Use native speed, advanced vocabulary, complex grammatical structures, and cultural idioms.
- Prompt the user to discuss abstract topics.
- Fine-tune their phrasing for native-like fluency.
`;
  }

  return `You are a warm, supportive, and expert language tutor named "Spanglish Tutor". 
Your job is to help a native ${nativeName} speaker learn ${targetName}.
Currently, the student is at a ${level.toUpperCase()} level.

Your response instructions:
${levelInstructions}
- Always be encouraging and positive.
- Keep responses relatively brief (max 2-3 short paragraphs) to fit on a mobile screen.
- Use Markdown formatting (bolding, bullet points) to make explanations easy to scan.
- If the user says something incorrect in ${targetName}, kindly correct it first before answering.`;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history = [], nativeLanguage = 'en', level = 'intermediate' } = await req.json();
    const targetLanguage = nativeLanguage === 'en' ? 'es' : 'en';

    if (!message) {
      return new Response(JSON.stringify({ error: "Message content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured in Supabase environment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = getSystemPrompt(nativeLanguage, targetLanguage, level);

    // Call Gemini API using fetch directly
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // Convert client-provided history format to Gemini API format
    // Clients pass history: Array of { role: 'user'|'model', content: string }
    const contents = history.map((item: any) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content || item.parts?.[0]?.text || "" }]
    }));

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        }
      })
    });

    const geminiData = await response.json();
    
    if (geminiData.candidates && geminiData.candidates[0]?.content?.parts?.[0]?.text) {
      const replyText = geminiData.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ text: replyText }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      console.error("Gemini raw error:", geminiData);
      return new Response(JSON.stringify({ error: "Failed to generate text from Gemini API", raw: geminiData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
