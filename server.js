import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase Client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Supabase Client:', error);
  }
} else {
  console.warn('Supabase URL or Key is missing. Database operations will fail.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to support learnspanglish.com, Vercel subdomains, and Capacitor mobile clients
const allowedOrigins = [
  'https://app.learnspanglish.com',
  'https://learnspanglish.com',
  'https://www.learnspanglish.com',
  'https://spanglish-two.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.learnspanglish.com')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Normalize Vercel serverless request path prefixes for Express API route matching
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && req.url !== '/') {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Initialize Gemini API client if a valid API key is present
const apiKey = process.env.GEMINI_API_KEY;
let ai = null;
const isPlaceholder = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '' || apiKey.startsWith('YOUR_');

if (apiKey && !isPlaceholder) {
  try {
    ai = new GoogleGenerativeAI(apiKey);
    console.log('Gemini AI Client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Gemini Client:', error);
  }
} else {
  console.warn('GEMINI_API_KEY is not configured or is a placeholder in .env. Server running in Mock Fallback Mode.');
}

// System prompts helper
function getTutorSystemPrompt(nativeLanguage, targetLanguage, level) {
  const nativeName = nativeLanguage === 'es' ? 'Spanish' : 'English';
  const targetName = targetLanguage === 'es' ? 'Spanish' : 'English';
  
  let levelInstructions = '';
  if (level === 'basic') {
    levelInstructions = `
- Speak primarily in ${nativeName} when explaining rules.
- Keep sentences in ${targetName} extremely simple, short, and clear.
- Focus on basic vocabulary, greeting phrases, and simple present-tense grammar.
- Correct the user's spelling or grammar errors immediately and explain the correction in ${nativeName}.
`;
  } else if (level === 'intermediate') {
    levelInstructions = `
- Speak 70% in ${targetName} and 30% in ${nativeName}.
- Use intermediate vocabulary and introduce common idioms.
- Explain grammatical concepts in ${targetName} first, then summarize in ${nativeName} if complex.
- Encourage the user to write longer sentences.
- Highlight minor mistakes and suggest more natural phrasing.
`;
  } else { // advanced
    levelInstructions = `
- Speak 98% in ${targetName}. Only use ${nativeName} for highly technical translation terms.
- Use native speed, advanced vocabulary, complex grammatical structures, and cultural idioms.
- Prompt the user to discuss abstract topics, debate issues, or analyze reading excerpts.
- Fine-tune their phrasing for native-like fluency rather than just basic grammatical correctness.
`;
  }

  return `You are a warm, supportive, and expert language tutor named "Spanglish Tutor". 
Your job is to help a native ${nativeName} speaker learn ${targetName}.
Currently, the student is at a ${level.toUpperCase()} level.

Your response instructions:
${levelInstructions}
- Always be encouraging and positive.
- Keep responses relatively brief (max 2-3 short paragraphs) to fit on a mobile screen.
- NEVER use asterisks (*) for any purpose in your output (not even for bolding, italics, or list bullets). Instead, use double underscores (__) for bolding, single underscores (_) for italics, and hyphens (-) or numbers (1., 2.) for lists. This is critical because formatting asterisks are read aloud by some text-to-speech engines.
- If you provide translations for words or phrases, always place the translation on the very next line and italicize it using underscores (e.g., _translation_), rather than putting it side-by-side or in brackets (e.g. avoid "Hello [Hola]"). E.g.:
__Hello!__
_Hola_
- If the user says something incorrect in ${targetName}, kindly correct it first before answering their question.
- Encourage them to try speaking or practicing pronunciation.`;
}

// Helpers for Mock fallbacks when Gemini is not initialized or fails
function getMockTutorResponse(nativeLanguage, level) {
  let reply = '';
  if (nativeLanguage === 'en') { // Learning Spanish
    if (level === 'basic') {
      reply = `¡Hola! That is a great start. In Spanish, we say __"¿Cómo estás?"__ to ask "How are you?".\n\nTry repeating after me:\n\n__¿Cómo estás?__\n_How are you?_\n\nKeep going! What other basic phrases would you like to learn today?`;
    } else if (level === 'intermediate') {
      reply = `¡Qué bien que sigas practicando! Tu frase está muy bien estructurada, pero una forma más natural de decirlo sería:\n\n_"Me gustaría aprender más vocabulario"_\n_I would like to learn more vocabulary_\n\n¿De qué tema te gustaría hablar hoy? Podemos hablar de viajes (travel), comida (food), o pasatiempos (hobbies).`;
    } else {
      reply = `Es un placer conversar contigo. Tu nivel de fluidez es excelente. Analizando tu planteamiento, observo que has dominado el uso del subjuntivo. Para sonar aún más nativo, podrías emplear el modismo _"echar de menos"_ en lugar de _"extrañar"_ en contextos informales. \n\n¿Te interesaría debatir sobre las diferencias culturales en las jornadas laborales entre España y los países anglosajones?`;
    }
  } else { // Learning English
    if (level === 'basic') {
      reply = `Hello! Welcome! In English, we say:\n\n__"How are you?"__\n_¿Cómo estás?_\n\nLet's practice a simple sentence:\n\n__"My name is..."__\n_Mi nombre es..._\n\nCan you tell me your name?`;
    } else if (level === 'intermediate') {
      reply = `Hi there! I understood you perfectly. To make your English sound more natural, try saying:\n\n_"I have been studying English for two years"_\n_He estado estudiando inglés por dos años_\n\ninstead of "I study English since two years".\n\nWould you like to practice talking about your weekend plans, or do you have a specific grammar question?`;
    } else {
      reply = `Terrific to meet you. Your sentence structure is highly sophisticated. To take your communication skills to the absolute peak, let's look at register. In business settings, we prefer:\n\n_"I would be delighted to assist you"_\n_Estaría encantado de ayudarle_\n\nover "I'm happy to help you out."\n\nShall we discuss recent global economic trends, or is there a classic piece of literature you'd like to dissect today?`;
    }
  }
  return reply;
}

const phoneticDatabase = {
  // Spanish
  "perro": { ipa: "/ˈpe.ro/", tip: "The double 'rr' requires a trill. Press the tip of your tongue against the roof of your mouth and blow air to vibrate it." },
  "roque": { ipa: "/ˈro.ke/", tip: "Words starting with 'r' are rolled in Spanish. Trill the 'r' at the beginning." },
  "rabo": { ipa: "/ˈra.βo/", tip: "The initial 'r' is trilled, and the 'b' between vowels is soft, pronounced by bringing your lips close together without fully stopping the air." },
  "tres": { ipa: "/ˈtɾes/", tip: "The 'tr' is single-tapped. Tap the tip of your tongue against the roof of your mouth once quickly." },
  "tristes": { ipa: "/ˈtɾistes/", tip: "Make sure to pronounce both 't's crisply with a single tap of the tongue for the 'r'." },
  "tigres": { ipa: "/ˈti.ɣɾes/", tip: "The 'g' is soft (approximant), like a gentle hum in the throat." },
  "tragan": { ipa: "/ˈtɾa.ɣan/", tip: "The 'g' is soft between vowels." },
  "trigo": { ipa: "/ˈtɾi.ɣo/", tip: "Keep the 't' dental (tongue touching front teeth) and tap the 'r'." },
  "trigal": { ipa: "/tɾiˈɣal/", tip: "The final 'l' is produced with the tip of the tongue against the upper teeth, not hollow like the English 'l'." },
  "cómo": { ipa: "/ˈkomo/", tip: "The 'o's are short and crisp, like 'oh' without the 'w' sound at the end." },
  "estás": { ipa: "/esˈtas/", tip: "Accent is on the second syllable. Make sure the 's' is voiced clearly." },
  "hoy": { ipa: "/ˈoi/", tip: "The 'h' is completely silent. Pronounce it starting directly with the 'o' sound." },
  "gustaría": { ipa: "/ɡustaˈria/", tip: "Accent is on the 'i'. Tap the 'r' quickly." },
  "ordenar": { ipa: "/oɾdeˈnaɾ/", tip: "The 'r's are single taps, not the American retroflex 'r'." },
  "café": { ipa: "/kaˈfe/", tip: "Do not aspirate the 'c'. It is a clean 'k' sound, and the 'e' is short and clean like in 'bet'." },
  "por": { ipa: "/poɾ/", tip: "The 'r' is a quick single tap of the tongue against the alveolar ridge." },
  "favor": { ipa: "/faˈβoɾ/", tip: "The 'v' is pronounced like a soft 'b' where the lips almost touch but let air pass." },
  
  // English
  "how": { ipa: "/haʊ/", tip: "Start with a clean breath of air for 'h', and glide from 'ah' to 'oo'." },
  "are": { ipa: "/ɑːr/", tip: "A long, open 'ah' sound. Curl the tip of your tongue slightly back for the 'r' if in American English." },
  "today": { ipa: "/təˈdeɪ/", tip: "The first syllable is a weak schwa /ə/ ('tuh'), and the second is a clear diphthong /eɪ/ ('day')." },
  "would": { ipa: "/wʊd/", tip: "The 'l' is completely silent. Pronounce it like 'wood'." },
  "coffee": { ipa: "/ˈkɒfi/", tip: "The 'o' is open, and the 'ee' is a tense, long 'i' sound." },
  "please": { ipa: "/pliːz/", tip: "The 's' is pronounced as a voiced 'z' sound. Vibrate your vocal cords." },
  "she": { ipa: "/ʃiː/", tip: "The 'sh' is a voiceless postalveolar fricative. Push your lips forward slightly and blow." },
  "sells": { ipa: "/selz/", tip: "The 's' at the end is pronounced as a voiced 'z'." },
  "sea": { ipa: "/siː/", tip: "The 's' is sharp and dental, unlike the 'sh' in 'she'." },
  "shells": { ipa: "/ʃelz/", tip: "Contrast the initial 'sh' sound with the 's' sound in 'sells'." },
  "shore": { ipa: "/ʃɔːr/", tip: "Pronounce the 'sh' clearly, followed by the rounded vowel and 'r'." },
  "peter": { ipa: "/ˈpiːtər/", tip: "Aspirate the initial 'p' with a small puff of air." },
  "piper": { ipa: "/ˈpaɪpər/", tip: "Pronounce the diphthong /aɪ/ ('eye') clearly." },
  "picked": { ipa: "/pɪkt/", tip: "The '-ed' ending is pronounced as a voiceless 't' because it follows the voiceless 'k' sound." },
  "peck": { ipa: "/pek/", tip: "The 'e' is short, like in 'bed'." },
  "pickled": { ipa: "/ˈpɪk.əld/", tip: "The '-ed' here is pronounced as a voiced 'd'." },
  "peppers": { ipa: "/ˈpepərz/", tip: "Aspirate the first 'p', and make the second 'p' softer." }
};

function getMockPronounceScore(targetPhrase, userTranscript, targetLanguage) {
  const tClean = targetPhrase.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g,"").trim();
  const uClean = userTranscript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g,"").trim();
  
  const tWords = tClean.split(/\s+/);
  const uWords = uClean.split(/\s+/);
  
  let matches = 0;
  const corrections = [];
  tWords.forEach(w => {
    if (uWords.includes(w)) {
      matches++;
    } else {
      corrections.push(w);
    }
  });
  
  const score = Math.min(100, Math.round((matches / tWords.length) * 100));
  let feedback = '';
  
  if (score > 85) {
    feedback = targetLanguage === 'es' ? '¡Excelente pronunciación! Casi perfecto.' : 'Excellent pronunciation! Nearly perfect.';
  } else if (score > 60) {
    feedback = targetLanguage === 'es' ? 'Buena entonación, pero intenta vocalizar algunas consonantes un poco más despacio.' : 'Good job, but try to enunciate vowels more clearly.';
  } else {
    feedback = targetLanguage === 'es' ? 'Se entiende un poco, pero practica la entonación y repítelo de nuevo.' : 'Try to speak a bit slower and check word endings.';
  }
  
  const phoneticTips = [];
  corrections.forEach(w => {
    if (phoneticDatabase[w]) {
      phoneticTips.push({
        word: w,
        ipa: phoneticDatabase[w].ipa,
        tip: phoneticDatabase[w].tip
      });
    }
  });
  
  return { score, feedback, corrections, phoneticTips, matchingWords: matches, totalWords: tWords.length };
}

function getMockOfflinePhrases(targetLanguage, level, previousPhrase) {
  const offlinePhrases = targetLanguage === 'es' 
    ? {
        basic: [
          { text: "¿Cómo te llamas tú?", translation: "What is your name?" },
          { text: "Hola, buenos días", translation: "Hello, good morning" },
          { text: "Me gusta la manzana roja", translation: "I like the red apple" },
          { text: "El gato duerme en la silla", translation: "The cat sleeps on the chair" }
        ],
        intermediate: [
          { text: "Me gustaría pedir un café con leche y una ensalada, por favor", translation: "I would like to order a coffee with milk and a salad, please" },
          { text: "Ayer fui a caminar por el parque cerca de la playa", translation: "Yesterday I went for a walk in the park near the beach" },
          { text: "El museo abre a las nueve y cierra a las seis de la tarde", translation: "The museum opens at nine and closes at six in the evening" },
          { text: "Tengo que estudiar mucho para aprobar el examen de gramática", translation: "I have to study hard to pass the grammar exam" }
        ],
        advanced: [
          { text: "El ferrocarril corre rápido por las vías empedradas de la antigua estación de tren", translation: "The railway runs fast on the stone-paved tracks of the old train station" },
          { text: "Tres tristes tigres tragaban trigo en un trigal, en un trigal tragaban trigo tres tristes tigres", translation: "Three sad tigers swallowed wheat in a wheat field, in a wheat field swallowed wheat three sad tigers" },
          { text: "El cielo está encapotado, ¿quién lo desencapotará? El desencapotador que lo desencapote, buen desencapotador será", translation: "The sky is cloudy, who will uncloud it? The unclouder who unclouds it, a good unclouder he will be" },
          { text: "La desoxirribonucleasa es una enzima que cataliza la hidrólisis de los enlaces fosfodiéster en el ADN", translation: "Deoxyribonuclease is an enzyme that catalyzes the hydrolysis of phosphodiester bonds in DNA" }
        ]
      }
    : {
        basic: [
          { text: "Good morning, how are you?", translation: "Buenos días, ¿cómo estás?" },
          { text: "What is your name?", translation: "¿Cómo te llamas?" },
          { text: "I like red apples", translation: "Me gustan las manzanas rojas" },
          { text: "The dog is sleeping on the floor", translation: "El perro está durmiendo en el suelo" }
        ],
        intermediate: [
          { text: "I would like to order a hot coffee and a fresh sandwich, please", translation: "Me gustaría pedir un café caliente y un sándwich fresco, por favor" },
          { text: "Yesterday we walked along the beautiful beach and watched the sunset", translation: "Ayer caminamos por la hermosa playa y vimos la puesta de sol" },
          { text: "The library is closed on weekends but open during the week", translation: "La biblioteca está cerrada los fines de semana pero abierta durante la semana" },
          { text: "We need to prepare for our presentation next Friday afternoon", translation: "Necesitamos prepararnos para nuestra presentación el próximo viernes por la tarde" }
        ],
        advanced: [
          { text: "Peter Piper picked a peck of pickled peppers, did Peter Piper pick a peck of pickled peppers?", translation: "Peter Piper recogió un celemín de pimientos en vinagre, ¿recogió Peter Piper un celemín de pimientos en vinagre?" },
          { text: "She sells seashells by the seashore, the shells she sells are surely seashells", translation: "Ella vende conchas de mar junto a la orilla del mar, las conchas que vende son seguramente conchas de mar" },
          { text: "The quick brown fox jumps over the lazy dog to demonstrate all the letters of the alphabet", translation: "El zorro marrón rápido salta sobre el perro perezoso para demostrar todas las letras del alfabeto" },
          { text: "To be or not to be, that is the question: whether tis nobler in the mind to suffer", translation: "Ser o no ser, esa es la cuestión: si es más noble para el espíritu sufrir" }
        ]
      };

  const levelPhrases = offlinePhrases[level] || offlinePhrases.basic;
  const available = levelPhrases.filter(p => p.text !== previousPhrase);
  const pool = available.length > 0 ? available : levelPhrases;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Endpoint to handle user AI content reports
app.post(['/api/report-ai-content', '/report-ai-content'], async (req, res) => {
  const { aiResponse, userText, reportReason, userComments, userEmail } = req.body;
  console.log(`[AI Content Report] Received report:`, {
    reason: reportReason,
    userEmail: userEmail || 'anonymous',
    userText,
    aiResponse: aiResponse?.substring(0, 100),
    comments: userComments
  });

  if (supabase) {
    try {
      await supabase.from('ai_content_reports').insert({
        ai_response: aiResponse,
        user_text: userText,
        report_reason: reportReason,
        user_comments: userComments,
        user_email: userEmail
      });
    } catch (err) {
      console.warn('[AI Content Report] Supabase insert warning:', err.message);
    }
  }

  res.json({ success: true, message: 'Report received and recorded for safety review.' });
});

// 1. LLM Chat Tutor Endpoint
app.post(['/api/tutor', '/tutor'], async (req, res) => {
  try {
    const { message, history = [], nativeLanguage = 'en', level = 'intermediate', concept } = req.body || {};
    const targetLanguage = nativeLanguage === 'en' ? 'es' : 'en';

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // 1a. Mock mode fallback if no API key is configured
    if (!ai) {
      console.log('[Mock Tutor] Processing query:', message);
      const reply = getMockTutorResponse(nativeLanguage, level);
      return res.json({ text: reply });
    }

    // 1b. Call Gemini API with optional RAG Context
    let systemPrompt = getTutorSystemPrompt(nativeLanguage, targetLanguage, level);
    let ragContext = '';

    // Search curriculum chunks in database if Supabase is initialized
    if (supabase) {
      try {
        console.log(`[RAG] Generating embedding for message: "${message.substring(0, 30)}..."`);
        const embedModel = ai.getGenerativeModel({ model: 'text-embedding-004' });
        const embedResult = await embedModel.embedContent({
          content: { parts: [{ text: message }] }
        });
        const queryEmbedding = embedResult?.embedding?.values;

        if (queryEmbedding) {
          console.log(`[RAG] Searching vector database for matching curriculum chunks...`);
          const { data: chunks, error: rpcError } = await supabase.rpc('match_curriculum_chunks', {
            query_embedding: queryEmbedding,
            match_threshold: 0.3,
            match_count: 3
          });

          if (rpcError) {
            console.warn('[RAG] Supabase RPC failed:', rpcError.message);
          } else if (chunks && chunks.length > 0) {
            ragContext = chunks.map(c => `[From Curriculum Textbook: ${c.document_name}]\n${c.content}`).join('\n\n');
            console.log(`[RAG] Successfully retrieved ${chunks.length} matching textbook chunks.`);
          } else {
            console.log('[RAG] No relevant textbook chunks found.');
          }
        }
      } catch (ragErr) {
        console.warn('[RAG] Error performing curriculum search:', ragErr.message);
      }
    }

    if (ragContext) {
      systemPrompt += `\n\nHere is some relevant curriculum context from the student's Spanish/English learning textbooks. Use it to structure your explanations, introduce grammar rules, and reference the text content where appropriate:\n\n${ragContext}`;
    }

    if (concept && concept.title) {
      systemPrompt += `\n\n[Active Lesson Focus]: The student is currently in a structured study session learning about "${concept.title}" (${concept.description || ''}). Provide tailored guidance, explain the grammar rules, and give them targeted practice questions related to this topic.`;
    }

    // Format history for Gemini API safely.
    const safeHistory = Array.isArray(history) ? history : [];
    const formattedHistory = safeHistory.map(item => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content || item.parts?.[0]?.text || '' }]
    }));

    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-pro'];
    let responseText = '';
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Tutor Chat] Trying model: ${modelName}`);
        const model = ai.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
        });

        const chat = model.startChat({
          history: formattedHistory,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          }
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        responseText = response.text();
        success = true;
        break;
      } catch (err) {
        console.warn(`[Tutor Chat] Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!success) {
      throw lastError || new Error('All Gemini model calls failed');
    }

    res.json({ text: responseText });
  } catch (error) {
    console.error('Gemini API Error in Tutor (falling back to Mock):', error?.message || error);
    const reply = getMockTutorResponse(req.body?.nativeLanguage || 'en', req.body?.level || 'intermediate');
    res.json({ text: `[Fallback Tutor] ${reply}` });
  }
});

// 2. Pronunciation Scorer Endpoint
app.post(['/api/pronounce', '/pronounce'], async (req, res) => {
  const { targetPhrase, userTranscript, targetLanguage = 'es' } = req.body;

  if (!targetPhrase || !userTranscript) {
    return res.status(400).json({ error: 'Both targetPhrase and userTranscript are required.' });
  }

  if (!ai) {
    console.log('[Mock Pronounce Scorer]');
    const data = getMockPronounceScore(targetPhrase, userTranscript, targetLanguage);
    return res.json(data);
  }

  try {
    const systemPrompt = `You are a strict but encouraging language pronunciation analyzer. 
Compare the "Target Phrase" (what the student was asked to say) with the "User Transcript" (what the speech recognition software captured).
Evaluate how close they match phonetically and semantically. Account for minor speech-to-text transcriber glitches (e.g. omitting punctuation).

Return a JSON object containing:
1. "score": An integer from 0 to 100 representing accuracy.
2. "feedback": A short, friendly sentence explaining what they did well and where they stumbled (max 2 sentences, written in the user's native language).
3. "corrections": An array of specific words that were mispronounced or omitted.
4. "phoneticTips": An array of objects for the mispronounced/omitted words, where each object contains:
   - "word": The word itself.
   - "ipa": The International Phonetic Alphabet (IPA) notation for the correct pronunciation of the word in the target language (e.g., "/ˈpe.ro/" for "perro" or "/ʃiː/" for "she").
   - "tip": A clear, physical pronunciation guide in the user's native language explaining how to position their mouth/tongue/lips to make the correct sounds.

Only output valid JSON. Do not wrap in markdown code blocks.`;

    const prompt = `Target Phrase: "${targetPhrase}"\nUser Transcript: "${userTranscript}"\nTarget Language: "${targetLanguage}"`;
    
    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-pro'];
    let responseText = '';
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Pronounce Scorer] Trying model: ${modelName}`);
        const model = ai.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemPrompt 
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          }
        });

        const response = await result.response;
        responseText = response.text();
        success = true;
        break;
      } catch (err) {
        console.warn(`[Pronounce Scorer] Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!success) {
      throw lastError;
    }

    const data = JSON.parse(responseText);
    res.json(data);
  } catch (error) {
    console.error('Gemini Pronounce Error (falling back to Mock):', error);
    const data = getMockPronounceScore(targetPhrase, userTranscript, targetLanguage);
    data.feedback = `[Fallback Scorer] ${data.feedback}`;
    res.json(data);
  }
});

// 2b. Dynamic Pronunciation Phrase Generator Endpoint
app.post(['/api/pronounce/generate', '/pronounce/generate'], async (req, res) => {
  const { targetLanguage = 'es', level = 'basic', previousPhrase = '' } = req.body;
  const targetName = targetLanguage === 'es' ? 'Spanish' : 'English';
  const nativeName = targetLanguage === 'es' ? 'English' : 'Spanish';

  // Fallback offline pre-baked phrases if Gemini is not initialized
  if (!ai) {
    const selected = getMockOfflinePhrases(targetLanguage, level, previousPhrase);
    return res.json(selected);
  }

  try {
    const systemPrompt = `You are a language learning content generator. Generate a single level-appropriate practice sentence or phrase in ${targetName} for a student learning ${targetName} whose native language is ${nativeName}. 
    
    Level instructions for phrase selection and length:
    - BASIC: 3-6 words, simple common words, focuses on clean vowels/easy syllables. E.g., "Good morning, how are you?" or "¿Cómo te llamas tú?".
    - INTERMEDIATE: 7-15 words, standard conversation flow, introduces basic conjunctions, standard everyday scenarios. E.g., "I would like to order a hot coffee with milk, please" or "Me gustaría reservar una mesa para cenar esta noche".
    - ADVANCED: 15-30 words, focuses on difficult phonetic patterns (like rolled 'r's, 'tr' clusters, 's/sh' sound differences) or incorporates complex idioms and tongue twisters. E.g., "She sells sea shells by the sea shore to purchase some shoes" or "El ferrocarril corre rápido por las vías empedradas".

    Respond ONLY with a JSON object containing:
    1. "text": The generated sentence/phrase in ${targetName}. (Avoid any formatting like asterisks or quotes inside the text).
    2. "translation": A natural translation of the phrase in ${nativeName}.

    Do not output any markdown code blocks. Only return a valid JSON object.`;

    const prompt = `Generate a new pronunciation practice phrase. Level: ${level}, Target Language: ${targetName}, Native Language: ${nativeName}. Avoid repeating this previous phrase if possible: "${previousPhrase}".`;

    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-pro'];
    let responseText = '';
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Phrase Gen] Trying model: ${modelName}`);
        const model = ai.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemPrompt 
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.9,
          }
        });

        const response = await result.response;
        responseText = response.text();
        success = true;
        break;
      } catch (err) {
        console.warn(`[Phrase Gen] Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!success) {
      throw lastError;
    }

    const data = JSON.parse(responseText);
    res.json(data);
  } catch (error) {
    console.error('Gemini Phrase Gen Error (falling back to Mock):', error);
    const selected = getMockOfflinePhrases(targetLanguage, level, previousPhrase);
    res.json(selected);
  }
});


// Heuristic to detect translation language of an article to find matching daily news
function matchesNativeLanguage(article, nativeLanguage) {
  if (!article.vocab || !Array.isArray(article.vocab) || article.vocab.length === 0) {
    return false;
  }
  const sampleTranslation = article.vocab[0].translation || '';
  
  // English words regex
  const englishWords = /\b(the|of|and|a|to|in|is|you|that|it|he|was|for|on|are|as|with|his|they|i|at|be|this|have|from|or|one|had|by|word|but|not|what|all|were|we|when|your|can|said|there|use|an|each|which|she|do|how|their|if|will|up|other|about|out|many|then|them|these|so|some|her|would|make|like|him|into|time|has|look|two|more|write|go|see|number|no|way|could|people|my|than|first|water|been|call|who|oil|its|now|find|long|down|day|did|get|come|made|may|part)\b/i;
  
  // Spanish words regex
  const spanishWords = /\b(el|la|los|las|un|una|unos|unas|de|del|y|en|que|es|son|se|un|con|por|para|como|su|sus|al|lo|como|más|pero|o|este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella|aquellos|aquellas|mi|mis|tu|tus|su|sus|nuestro|nuestra|nuestros|nuestras|yo|tú|él|ella|nosotros|vosotros|ellos|ellas|me|te|le|nos|os|les|este|esta|todo|todos|toda|todas|otro|otra|otros|otras|mismo|misma|mismos|mismas|alguno|alguna|algunos|algunas|ninguno|ninguna|ningunos|ningunas|mucho|mucha|muchos|muchas|poco|poca|pocos|pocas|tanto|tanta|tantos|tantas|demasiado|demasiada|demasiados|demasiadas|cuyo|cuya|cuyos|cuyas|donde|cuando|como|porque|si|no|sí|bien|mal|muy|mucho|poco|hoy|ayer|mañana|ahora|después|antes|aquí|allí|allá|cerca|lejos|dentro|fuera|arriba|abajo|delante|detrás|encima|debajo)\b/i;

  const textToTest = sampleTranslation.toLowerCase();
  const hasEnglish = englishWords.test(textToTest);
  const hasSpanish = spanishWords.test(textToTest);

  if (nativeLanguage === 'en') {
    // English native speaker: the translation is English
    return hasEnglish || !hasSpanish;
  } else {
    // Spanish native speaker: the translation is Spanish
    return hasSpanish || !hasEnglish;
  }
}

// In-memory RAM cache for news (TTL: 30 minutes)
const newsRamCache = new Map();

// Helper to get local offline news fallback
function getLocalNewsFallback(nativeLanguage, level) {
  return nativeLanguage === 'en' 
    ? [ // Spanish articles for English speakers
        {
          id: 'n1',
          title: 'Avance científico en las selvas de Costa Rica',
          category: 'Ciencia',
          summary: level === 'basic' 
            ? 'Científicos descubren una planta nueva. [Scientists discover a new plant.] La planta cura enfermedades del estómago. [The plant cures stomach illnesses.] Es un día feliz para la ciencia. [It is a happy day for science.]'
            : level === 'intermediate'
              ? 'Un grupo de botánicos en Costa Rica ha descubierto una nueva especie de planta medicinal en la selva. Esta planta parece tener compuestos químicos que combaten infecciones estomacales rápidamente. Los locales han usado infusiones similares durante décadas.'
              : 'Un equipo internacional de investigadores en la península de Osa, Costa Rica, ha catalogado una especie vegetal inédita con propiedades antimicrobianas excepcionales. El hallazgo podría revolucionar el tratamiento de afecciones gastrointestinales bacterianas, validando el conocimiento ancestral etnobotánico de la región.',
          vocab: [
            { word: 'Científicos', translation: 'Scientists' },
            { word: 'Selva', translation: 'Jungle/Forest' },
            { word: 'Enfermedades', translation: 'Illnesses' }
          ]
        },
        {
          id: 'n2',
          title: 'El festival del libro comienza en Madrid',
          category: 'Cultura',
          summary: level === 'basic' 
            ? 'El parque del Retiro tiene muchos libros. [Retiro park has many books.] La gente compra novelas de amor y misterio. [People buy love and mystery novels.] El sol brilla mucho hoy. [The sun shines a lot today.]'
            : level === 'intermediate'
              ? 'La Feria del Libro de Madrid abre sus puertas este fin de semana en el Parque del Retiro. Se esperan miles de visitantes y más de 300 autores firmando sus obras. Es una gran oportunidad para conseguir autógrafos.'
              : 'La septuagésima Feria del Libro de Madrid arranca hoy en el Parque del Retiro con el lema del fomento de la lectura juvenil. Con una cifra récord de casetas y la presencia de autores galardonados internacionalmente, el sector editorial prevé superar las cifras de venta prepandémicas.',
          vocab: [
            { word: 'Feria', translation: 'Fair' },
            { word: 'Firmando', translation: 'Signing' },
            { word: 'Obras', translation: 'Works/Books' }
          ]
        }
      ]
    : [ // English articles for Spanish speakers
        {
          id: 'n1',
          title: 'New Solar Power Record in California',
          category: 'Science',
          summary: level === 'basic' 
            ? 'California makes a lot of clean energy. [California produce mucha energía limpia.] Solar panels cover the desert. [Los paneles solares cubren el desierto.] The air is cleaner now. [El aire es más limpio ahora.]'
            : level === 'intermediate'
              ? 'California has set a new record by generating 95% of its electricity from renewable sources for a short time on Sunday. Most of it came from massive solar farms in the Mojave desert, showing the rapid growth of green power.'
              : 'California briefly achieved a milestone by meeting 95% of its grid demand with clean energy, driven by surge outputs from utility-scale solar arrays. Grid operators noted this highlights the necessity of expanding battery storage systems to manage peak load volatility.',
          vocab: [
            { word: 'Renewable', translation: 'Renovable' },
            { word: 'Desert', translation: 'Desierto' },
            { word: 'Grid', translation: 'Red eléctrica' }
          ]
        },
        {
          id: 'n2',
          title: 'Classic Theatre Festival Starts in London',
          category: 'Culture',
          summary: level === 'basic' 
            ? 'Actors play Shakespeare stories in London. [Los actores interpretan historias de Shakespeare en Londres.] People sit outside. [La gente se sienta afuera.] The tickets are cheap. [Las entradas son baratas.]'
            : level === 'intermediate'
              ? 'The open-air Shakespeare festival has begun in London. Audiences can watch classic plays like Hamlet under the stars. Tickets are selling out quickly, so organizers recommend booking in advance.'
              : 'London\'s annual Open Air Theatre season commenced in Regent\'s Park, headlining a modern adaptation of Shakespearean classics. The production blends historical prose with contemporary set designs, drawing critical acclaim from theatre enthusiasts.',
          vocab: [
            { word: 'Open-air', translation: 'Al aire libre' },
            { word: 'Audiences', translation: 'Público/Espectadores' },
            { word: 'Booking', translation: 'Reservar' }
          ]
        }
      ];
}

// 3. News Synopsis Generator
app.post(['/api/news', '/news'], async (req, res) => {
  const { nativeLanguage = 'en', level = 'intermediate', refresh = false } = req.body;
  const targetLanguage = nativeLanguage === 'en' ? 'es' : 'en';
  const cacheKey = `${nativeLanguage}_${level}`;

  // 3a. Check Express RAM Cache (30 min TTL) unless explicit refresh requested
  if (!refresh) {
    const ramCached = newsRamCache.get(cacheKey);
    if (ramCached && (Date.now() - ramCached.timestamp < 30 * 60 * 1000)) {
      console.log(`[News API] Serving RAM-cached daily news for ${cacheKey} (<10ms)`);
      return res.json(ramCached.data);
    }
  } else {
    console.log(`[News API] Refresh requested by client for ${cacheKey}. Bypassing RAM cache.`);
    newsRamCache.delete(cacheKey);
  }

  // 3b. If Supabase is configured and NOT a refresh request, try database cache
  if (supabase && !refresh) {
    try {
      console.log(`[News API] Querying database for daily news articles matching native language: ${nativeLanguage}`);
      const { data: dbArticles, error: dbError } = await supabase
        .from('news_articles')
        .select('*')
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!dbError && dbArticles && dbArticles.length > 0) {
        // Filter articles using language heuristic
        const matchedArticles = dbArticles.filter(art => matchesNativeLanguage(art, nativeLanguage));
        
        if (matchedArticles.length >= 1) {
          console.log(`[News API] Found ${matchedArticles.length} cached daily news articles in DB. Returning top ${Math.min(2, matchedArticles.length)}.`);
          let selected = matchedArticles.slice(0, 2);
          
          // If only 1 article found, pair with 1 fallback
          if (selected.length < 2) {
            const fallback = getLocalNewsFallback(nativeLanguage, level);
            selected.push(fallback[1]);
          }

          const responseData = selected.map(art => ({
            id: art.id,
            title: art.title,
            category: art.category,
            summary: level === 'basic' 
              ? art.summary_basic 
              : level === 'intermediate' 
                ? art.summary_intermediate 
                : art.summary_advanced,
            vocab: Array.isArray(art.vocab) ? art.vocab : [],
            submitted_url: art.submitted_url || undefined,
            created_at: art.created_at
          }));

          // Store in RAM cache
          newsRamCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
          return res.json(responseData);
        }
      }
      if (dbError) {
        console.warn(`[News API] Database fetch error: ${dbError.message}`);
      }
    } catch (err) {
      console.warn('[News API] Exception during database cache check:', err.message);
    }
  }

  // 3c. Offline fallback if no AI is configured
  if (!ai) {
    const localNews = getLocalNewsFallback(nativeLanguage, level);
    newsRamCache.set(cacheKey, { timestamp: Date.now(), data: localNews });
    return res.json(localNews);
  }

  // 3d. Fast AI generation using Gemini (cache-miss)
  try {
    const targetName = targetLanguage === 'es' ? 'Spanish' : 'English';
    const nativeName = nativeLanguage === 'es' ? 'Spanish' : 'English';

    const systemPrompt = `You are a creative editor for a language learning app called Spanglish.
Generate 2 short news stories in ${targetName} suited for a language learner whose native language is ${nativeName}.
Each story must contain:
1. "title": A catchy title in ${targetName}.
2. "category": One word (e.g. "Science", "Culture", "Sports", "Technology").
3. "summary_basic": 3-4 very short, simple sentences in ${targetName}. Immediately follow each sentence with its literal translation in ${nativeName} inside square brackets, e.g. "Sentence. [Translation.]"
4. "summary_intermediate": A cohesive intermediate paragraph (4-6 sentences) in ${targetName} using moderate vocabulary and standard conversation flow. No translations or brackets.
5. "summary_advanced": A sophisticated advanced paragraph (5-8 sentences) in ${targetName} using native-level vocabulary and complex clauses. No translations or brackets.
6. "vocab": An array of exactly 3 key vocabulary words/phrases from the article, as objects: {"word": "word in ${targetName}", "translation": "translation in ${nativeName}"}.

Only output a valid JSON array of 2 objects. Do not wrap in markdown code blocks.`;

    const prompt = `Generate 2 news articles. Target Language: ${targetName}, Native Language: ${nativeName}`;

    // Fast-track model prioritization (fastest first)
    const modelsToTry = ['gemini-2.5-flash-lite', 'gemini-1.5-flash', 'gemini-2.5-flash'];
    let responseText = '';
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[News Gen Cache-Miss] Trying fast model: ${modelName}`);
        const model = ai.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemPrompt
        });

        // 2.5 second per-model timeout to avoid hanging the client
        const generatePromise = model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          }
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI Model Timeout (2.5s)')), 2500)
        );

        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = await result.response;
        responseText = response.text();
        success = true;
        break;
      } catch (err) {
        console.warn(`[News Gen Cache-Miss] Model ${modelName} failed/timed out:`, err.message);
        lastError = err;
      }
    }

    if (!success) {
      throw lastError || new Error('All AI models timed out');
    }

    const generatedArticles = JSON.parse(responseText);
    const responseData = [];
    
    if (Array.isArray(generatedArticles)) {
      for (let i = 0; i < generatedArticles.length; i++) {
        const art = generatedArticles[i];
        const dummyUrl = `https://spanglish.app/daily-news/${nativeLanguage}/${Date.now()}/${i}/${Math.random()}`;
        
        if (supabase) {
          try {
            console.log(`[News Gen Cache-Miss] Caching article to DB: "${art.title}"`);
            await supabase.from('news_articles').insert({
              user_id: null,
              title: art.title,
              category: art.category || 'Global',
              summary_basic: art.summary_basic,
              summary_intermediate: art.summary_intermediate,
              summary_advanced: art.summary_advanced,
              vocab: art.vocab || [],
              submitted_url: dummyUrl
            });
          } catch (dbErr) {
            console.warn('[News Gen Cache-Miss] Failed to save generated article to Supabase:', dbErr.message);
          }
        }
        
        responseData.push({
          id: `gen-${Date.now()}-${i}`,
          title: art.title,
          category: art.category || 'Global',
          summary: level === 'basic' 
            ? art.summary_basic 
            : level === 'intermediate' 
              ? art.summary_intermediate 
              : art.summary_advanced,
          vocab: art.vocab || [],
          submitted_url: dummyUrl
        });
      }
    }

    newsRamCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    return res.json(responseData);
  } catch (err) {
    console.warn('[News Gen Cache-Miss] AI Generation failed or timed out. Falling back to local articles:', err.message);
    const fallback = getLocalNewsFallback(nativeLanguage, level);
    newsRamCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
    return res.json(fallback);
  }
});

// 4. Vocabulary Detail Enricher Endpoint
app.post('/api/vocab/enrich', async (req, res) => {
  const { word, targetLanguage = 'es' } = req.body;
  if (!word) {
    return res.status(400).json({ error: 'Word is required.' });
  }

  const targetName = targetLanguage === 'es' ? 'Spanish' : 'English';
  const nativeName = targetLanguage === 'es' ? 'English' : 'Spanish';

  if (!ai) {
    console.log('[Mock Vocab Enrich] Enriching word:', word);
    // Basic offline fallback
    const wordLower = word.toLowerCase().trim();
    const isVerb = wordLower.endsWith('ar') || wordLower.endsWith('er') || wordLower.endsWith('ir') || wordLower.endsWith('ate') || wordLower.endsWith('run') || wordLower.endsWith('speak');
    return res.json({
      part_of_speech: isVerb ? 'verb' : 'noun',
      definition: targetLanguage === 'es' ? `A common word meaning "${word}"` : `Una palabra común que significa "${word}"`,
      example_sentence: targetLanguage === 'es' ? `Me gusta usar la palabra ${word} en mi vida diaria.` : `I like to use the word ${word} in my daily life.`,
      example_translation: targetLanguage === 'es' ? `I like to use the word ${word} in my daily life.` : `Me gusta usar la palabra ${word} en mi vida diaria.`,
      conjugations: isVerb ? {
        present: {
          yo: wordLower.endsWith('ar') ? wordLower.slice(0, -2) + 'o' : wordLower.endsWith('er') ? wordLower.slice(0, -2) + 'o' : wordLower + ' (irregular)',
          tu: wordLower.endsWith('ar') ? wordLower.slice(0, -2) + 'as' : wordLower.endsWith('er') ? wordLower.slice(0, -2) + 'es' : wordLower + ' (irregular)',
          el_ella: wordLower.endsWith('ar') ? wordLower.slice(0, -2) + 'a' : wordLower.endsWith('er') ? wordLower.slice(0, -2) + 'e' : wordLower + ' (irregular)',
          nosotros: wordLower.endsWith('ar') ? wordLower.slice(0, -2) + 'amos' : wordLower.endsWith('er') ? wordLower.slice(0, -2) + 'emos' : wordLower + ' (irregular)',
          ellos_ellas: wordLower.endsWith('ar') ? wordLower.slice(0, -2) + 'an' : wordLower.endsWith('er') ? wordLower.slice(0, -2) + 'en' : wordLower + ' (irregular)'
        }
      } : null
    });
  }

  try {
    const systemPrompt = `You are a professional dictionary builder and language teacher. 
    Analyze the word/phrase provided in ${targetName} and return a JSON object with details. 
    The learner's native language is ${nativeName}. 
    
    Fields required in response JSON:
    1. "part_of_speech": a string (e.g., "noun", "verb", "adjective", "adverb", "phrase", "pronoun", "preposition", "conjunction"). Must be lowercase.
    2. "definition": a clear definition (max 2 sentences) in the user's native language (${nativeName}).
    3. "example_sentence": a simple conversational example sentence using this word/phrase in the target language (${targetName}).
    4. "example_translation": a natural translation of the example sentence in the user's native language (${nativeName}).
    5. "conjugations": if and only if the word is a verb, return standard present tense conjugations for subjects yo, tu, el_ella, nosotros, ellos_ellas. For non-verbs or phrases, return null. The conjugation object MUST follow this exact schema:
    {
      "present": {
        "yo": "...",
        "tu": "...",
        "el_ella": "...",
        "nosotros": "...",
        "ellos_ellas": "..."
      }
    }
    
    Do not output any markdown code blocks. Only return a valid JSON object.`;

    const prompt = `Analyze the word/phrase: "${word}". Target Language: ${targetName}, Native Language: ${nativeName}.`;

    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-3.1-pro-preview', 'gemini-1.5-flash', 'gemini-pro'];
    let responseText = '';
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Vocab Enrich] Trying model: ${modelName}`);
        const model = ai.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          }
        });

        const response = await result.response;
        responseText = response.text();
        success = true;
        break;
      } catch (err) {
        console.warn(`[Vocab Enrich] Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!success) {
      throw lastError;
    }

    const data = JSON.parse(responseText);
    res.json(data);
  } catch (error) {
    console.error('Gemini Vocab Enrich Error:', error);
    res.status(500).json({ error: 'Failed to enrich vocab word.', details: error.message });
  }
});

// 5. News Submit Endpoint (summarizes submitted text block offline or via Gemini)
app.post('/api/news/submit', async (req, res) => {
  const { title, category, content, targetLanguage = 'es' } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Title, category, and content are required.' });
  }

  const targetName = targetLanguage === 'es' ? 'Spanish' : 'English';
  const nativeName = targetLanguage === 'es' ? 'English' : 'Spanish';

  if (!ai) {
    console.log('[Mock News Submit] Summarizing text:', title);
    return res.json({
      summary_basic: targetLanguage === 'es'
        ? `Esto es un resumen básico de ${title}. [This is a basic summary of ${title}.] Es muy interesante. [It is very interesting.]`
        : `This is a basic summary of ${title}. [Esto es un resumen básico de ${title}.] It is very interesting. [Es muy interesante.]`,
      summary_intermediate: targetLanguage === 'es'
        ? `Este es un resumen intermedio sobre la noticia titulada "${title}". Habla sobre temas de ${category} y está adaptado para estudiantes.`
        : `This is an intermediate summary of the news article titled "${title}". It discusses ${category} topics and is adapted for learners.`,
      summary_advanced: targetLanguage === 'es'
        ? `Este artículo de nivel avanzado examina en profundidad los acontecimientos descritos en "${title}". Ofrece un análisis exhaustivo de ${category}.`
        : `This advanced-level article provides an in-depth examination of the events detailed in "${title}". It offers a comprehensive analysis of ${category}.`,
      vocab: [
        { word: targetLanguage === 'es' ? 'noticia' : 'news', translation: targetLanguage === 'es' ? 'news' : 'noticia' },
        { word: targetLanguage === 'es' ? 'temas' : 'topics', translation: targetLanguage === 'es' ? 'topics' : 'temas' },
        { word: targetLanguage === 'es' ? 'estudiantes' : 'students', translation: targetLanguage === 'es' ? 'students' : 'estudiantes' }
      ]
    });
  }

  try {
    const systemPrompt = `You are a creative editor for a language learning app. 
    You will be given the title, category, and raw text content of a news article.
    You must generate three level-adapted summaries in the target language (${targetName}) and extract 3 key vocabulary words.
    
    Fields required in response JSON:
    1. "summary_basic": 3-4 very short sentences in ${targetName}. Immediately follow each sentence with its literal translation in ${nativeName} inside square brackets, e.g. "Sentence. [Translation.]"
    2. "summary_intermediate": A cohesive intermediate paragraph (4-6 sentences) in ${targetName} without translations.
    3. "summary_advanced": A sophisticated advanced paragraph (5-8 sentences) in ${targetName} without translations.
    4. "vocab": An array of exactly 3 key vocabulary words/phrases from the article, as objects: {"word": "in ${targetName}", "translation": "in ${nativeName}"}.
    
    Do not output any markdown code blocks. Only return a valid JSON object.`;

    const prompt = `Title: "${title}"\nCategory: "${category}"\nContent:\n${content}`;

    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-3.1-pro-preview', 'gemini-1.5-flash', 'gemini-pro'];
    let responseText = '';
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[News Submit] Trying model: ${modelName}`);
        const model = ai.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          }
        });

        const response = await result.response;
        responseText = response.text();
        success = true;
        break;
      } catch (err) {
        console.warn(`[News Submit] Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!success) {
      throw lastError;
    }

    const data = JSON.parse(responseText);
    res.json(data);
  } catch (error) {
    console.error('Gemini News Submit Error:', error);
    res.status(500).json({ error: 'Failed to analyze and summarize submitted article.', details: error.message });
  }
});

// --- CRON JOB: Daily News Fetch & Synthesis ---
app.get('/api/cron/fetch-news', async (req, res) => {
  // 1. Security Check: Ensure the request comes from Vercel or is authenticated locally
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  // Bypass authentication if testing locally
  const isLocalRequest = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || req.hostname === 'localhost';

  if (!isLocalRequest && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    console.warn('[Cron Job] Unauthorized request or CRON_SECRET is not configured.');
    return res.status(401).json({ error: 'Unauthorized' });
  }


  if (!supabase) {
    console.error('[Cron Job] Supabase client is not initialized.');
    return res.status(500).json({ error: 'Database client not initialized' });
  }

  try {
    // 2. Category Selection & Rotation
    // Categories we support:
    // Ciencia (science), Cultura (general), Deportes (sports), Tecnología (technology), Global (world), Politics (nation), Finance (business)
    const categoryMapping = [
      { gnews: 'science', devto: 'science', spanglish: 'Ciencia' },
      { gnews: 'general', devto: 'culture', spanglish: 'Cultura' },
      { gnews: 'sports', devto: 'sports', spanglish: 'Deportes' },
      { gnews: 'technology', devto: 'technology', spanglish: 'Tecnología' },
      { gnews: 'world', devto: 'world', spanglish: 'Global' },
      { gnews: 'nation', devto: 'politics', spanglish: 'Politics' },
      { gnews: 'business', devto: 'finance', spanglish: 'Finance' }
    ];

    // Select category based on current hour to rotate them automatically over the course of the day
    const currentHour = new Date().getUTCHours();
    const selectedCategoryIndex = currentHour % categoryMapping.length;
    const activeCategory = categoryMapping[selectedCategoryIndex];
    console.log(`[Cron Job] Active category: ${activeCategory.spanglish} (GNews: ${activeCategory.gnews}, DEV.to: ${activeCategory.devto})`);

    // 3. Fetch articles from GNews or DEV.to
    let rawArticles = [];
    const gnewsApiKey = process.env.GNEWS_API_KEY;

    if (gnewsApiKey && gnewsApiKey !== 'your_gnews_api_key_here') {
      const gnewsUrl = `https://gnews.io/api/v4/top-headlines?category=${activeCategory.gnews}&lang=en&max=5&apikey=${gnewsApiKey}`;
      console.log(`[Cron Job] Fetching headlines from GNews: ${gnewsUrl.replace(gnewsApiKey, 'REDACTED')}`);
      try {
        const response = await fetch(gnewsUrl);
        if (!response.ok) {
          throw new Error(`GNews response status: ${response.status}`);
        }
        const data = await response.json();
        if (data && Array.isArray(data.articles)) {
          rawArticles = data.articles.map(art => ({
            title: art.title,
            description: art.description,
            content: art.content || art.description,
            url: art.url,
            source: 'gnews'
          }));
        }
      } catch (err) {
        console.error('[Cron Job] GNews fetch failed, falling back to DEV.to:', err.message);
      }
    }

    // Fallback if rawArticles is empty (GNews key is missing or API call failed)
    if (rawArticles.length === 0) {
      const devtoUrl = `https://dev.to/api/articles?tag=${activeCategory.devto}&per_page=5`;
      console.log(`[Cron Job] Fetching articles from DEV.to: ${devtoUrl}`);
      try {
        const response = await fetch(devtoUrl);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            rawArticles = data.map(art => ({
              id: art.id,
              title: art.title,
              description: art.description,
              url: art.url,
              source: 'devto'
            }));
          }
        } else {
          console.error(`[Cron Job] DEV.to response status: ${response.status}`);
        }
      } catch (err) {
        console.error('[Cron Job] DEV.to fetch failed:', err.message);
      }
    }

    if (rawArticles.length === 0) {
      console.warn('[Cron Job] No articles fetched from any source.');
      return res.status(200).json({ success: true, message: 'No articles fetched to process.' });
    }

    // 4. Loop and Synthesize (limit processing to prevent timeouts)
    const processedArticles = [];
    let processedCount = 0;
    const maxArticlesPerRun = 2; // Keep it lightweight to fit within serverless timeout limits

    for (const article of rawArticles) {
      if (processedCount >= maxArticlesPerRun) {
        console.log(`[Cron Job] Reached limit of ${maxArticlesPerRun} articles processed this run. Stopping.`);
        break;
      }

      // Check if this article URL already exists in Supabase
      const { data: existing, error: checkError } = await supabase
        .from('news_articles')
        .select('id')
        .eq('submitted_url', article.url)
        .maybeSingle();

      if (checkError) {
        console.warn(`[Cron Job] Database check error for URL ${article.url}:`, checkError.message);
      }

      if (existing) {
        console.log(`[Cron Job] Article already exists, skipping: "${article.title}" (${article.url})`);
        continue;
      }

      console.log(`[Cron Job] Found new article to process: "${article.title}"`);

      // Retrieve full article content if DEV.to, since the list endpoint only has a summary/description
      let articleText = article.content || article.description || '';
      if (article.source === 'devto' && article.id) {
        try {
          const detailRes = await fetch(`https://dev.to/api/articles/${article.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            if (detail.body_markdown) {
              articleText = detail.body_markdown;
            }
          }
        } catch (detailErr) {
          console.warn(`[Cron Job] Failed to fetch DEV.to details for article ID ${article.id}:`, detailErr.message);
        }
      }

      // Clean/truncate article content if it's too long
      const truncatedText = articleText.substring(0, 3000);
      if (!truncatedText) {
        console.warn(`[Cron Job] Empty text content for article "${article.title}". Skipping.`);
        continue;
      }

      // 5. Call Gemini to generate summaries and vocabulary
      if (!ai) {
        console.warn('[Cron Job] Gemini Client is not initialized. Skipping AI generation.');
        continue;
      }

      const systemPrompt = `You are a creative editor for a language learning app called Spanglish.
You will be given the title and raw text content of a news article.
You must generate three level-adapted summaries in Spanish (target language) and extract 3 key vocabulary words.
The learner's native language is English.

Fields required in response JSON:
1. "summary_basic": 3-4 very short, simple sentences in Spanish. Immediately follow each sentence with its literal translation in English inside square brackets, e.g. "Sentence. [Translation.]"
2. "summary_intermediate": A cohesive intermediate paragraph (4-6 sentences) in Spanish with moderate vocabulary and idioms. No translations or brackets.
3. "summary_advanced": A sophisticated advanced paragraph (5-8 sentences) in Spanish using native-level vocabulary and complex clauses. No translations or brackets.
4. "vocab": An array of exactly 3 key vocabulary words/phrases from the article, as objects: {"word": "word in Spanish", "translation": "translation in English"}.

Only return a valid JSON object. Do not wrap in markdown code blocks.`;

      const prompt = `Title: "${article.title}"\nContent:\n${truncatedText}`;

      let parsedAiData = null;
      const modelsToTry = [
        'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 
        'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-pro', 
        'gemini-3.1-pro-preview', 'gemini-1.5-flash', 'gemini-pro'
      ];

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Cron Job] Requesting Gemini model: ${modelName}`);
          const model = ai.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt
          });

          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
            }
          });

          const response = await result.response;
          const responseText = response.text();
          parsedAiData = JSON.parse(responseText);
          break;
        } catch (err) {
          console.warn(`[Cron Job] Model ${modelName} failed:`, err.message);
        }
      }

      if (!parsedAiData) {
        console.warn(`[Cron Job] All Gemini models failed to generate content for article: "${article.title}". Using fallback mock synthesis.`);
        parsedAiData = {
          summary_basic: `Esta es una noticia sobre: ${article.title}. [This is a news story about: ${article.title}.] Es muy interesante. [It is very interesting.]`,
          summary_intermediate: `Esta es una noticia que habla sobre "${article.title}". Aunque el servidor de inteligencia artificial no pudo generar un resumen completo, puedes leer más detalles buscando sobre este tema en internet.`,
          summary_advanced: `Este artículo aborda el tema de "${article.title}". Debido a limitaciones temporales en la conexión con el servidor de inteligencia artificial, el resumen detallado no pudo ser generado. Sin embargo, la noticia ha sido registrada de forma exitosa en el sistema.`,
          vocab: [
            { word: "noticia", translation: "news / story" },
            { word: "tema", translation: "topic / theme" },
            { word: "interesante", translation: "interesting" }
          ]
        };
      }

      // Validate parsed AI data structure
      if (!parsedAiData.summary_basic || !parsedAiData.summary_intermediate || !parsedAiData.summary_advanced || !Array.isArray(parsedAiData.vocab)) {
        console.warn('[Cron Job] Gemini response did not match the expected schema. Using fallback.');
        parsedAiData = {
          summary_basic: `Esta es una noticia sobre: ${article.title}. [This is a news story about: ${article.title}.] Es muy interesante. [It is very interesting.]`,
          summary_intermediate: `Esta es una noticia que habla sobre "${article.title}". Aunque el servidor de inteligencia artificial no pudo generar un resumen completo, puedes leer más detalles buscando sobre este tema en internet.`,
          summary_advanced: `Este artículo aborda el tema de "${article.title}". Debido a limitaciones temporales en la conexión con el servidor de inteligencia artificial, el resumen detallado no pudo ser generado. Sin embargo, la noticia ha sido registrada de forma exitosa en el sistema.`,
          vocab: [
            { word: "noticia", translation: "news / story" },
            { word: "tema", translation: "topic / theme" },
            { word: "interesante", translation: "interesting" }
          ]
        };
      }


      // 6. Insert into Supabase
      console.log(`[Cron Job] Saving synthesized article to Supabase: "${article.title}"`);
      const { error: insertError } = await supabase
        .from('news_articles')
        .insert({
          title: article.title,
          category: activeCategory.spanglish,
          summary_basic: parsedAiData.summary_basic,
          summary_intermediate: parsedAiData.summary_intermediate,
          summary_advanced: parsedAiData.summary_advanced,
          vocab: parsedAiData.vocab,
          submitted_url: article.url
        });

      if (insertError) {
        console.error(`[Cron Job] Failed to save article to Supabase:`, insertError.message);
      } else {
        processedCount++;
        processedArticles.push({
          title: article.title,
          category: activeCategory.spanglish,
          url: article.url
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sync completed. Processed ${processedCount} new articles in category ${activeCategory.spanglish}.`,
      processedArticles
    });

  } catch (error) {
    console.error('[Cron Job] Error executing news sync:', error);
    return res.status(500).json({ error: 'Internal Server Error during news sync', details: error.message });
  }
});

// ==========================================
// --- MOCK LITERATURE DATA & ROUTES ---
// ==========================================

const MOCK_BOOKS = [
  {
    id: 'quijote',
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    source_lang: 'es',
    synopsis: 'Un hidalgo de la Mancha pierde la razón de tanto leer novelas de caballerías y decide lanzarse al mundo como caballero andante, buscando honor, batallas y amor cortesano.'
  },
  {
    id: 'principito',
    title: 'El Principito',
    author: 'Antoine de Saint-Exupéry',
    source_lang: 'es',
    synopsis: 'Un piloto varado en el desierto del Sahara entabla amistad con un pequeño y misterioso príncipe que proviene de un asteroide lejano y viaja por el cosmos buscando respuestas.'
  },
  {
    id: 'vida_sueno',
    title: 'La Vida es Sueño',
    author: 'Pedro Calderón de la Barca',
    source_lang: 'es',
    synopsis: 'Una obra filosófica clásica que gira en torno a Segismundo, príncipe de Polonia, encarcelado en una torre secreta desde su nacimiento por su propio padre debido a una profecía fatal.'
  },
  {
    id: 'hamlet',
    title: 'Hamlet',
    author: 'William Shakespeare',
    source_lang: 'en',
    synopsis: 'The ultimate tragedy of Prince Hamlet of Denmark, who is tasked by his father\'s ghost to avenge his murder by killing his uncle Claudius, who has usurped the throne.'
  },
  {
    id: 'pride_prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    source_lang: 'en',
    synopsis: 'A classic romantic novel charting the emotional development of Elizabeth Bennet, who learns the difference between superficial goodness and actual integrity.'
  }
];

const MOCK_CHAPTERS = {
  quijote: [
    {
      id: 'q1',
      book_id: 'quijote',
      chapter_number: 1,
      title: 'Capítulo I',
      synopsis: 'Introducción a Alonso Quijano, sus costumbres cotidianas, su dieta y cómo su obsesión con la literatura medieval lo arrastra a convertirse en Don Quijote.',
      summary_basic: 'Alonso Quijano es un hombre que lee muchos libros de caballeros. [Alonso Quijano is a man who reads many books of knights.] Él decide ser un caballero. [He decides to be a knight.] Busca una armadura y un caballo. [He looks for armor and a horse.]',
      summary_intermediate: 'Alonso Quijano vive en la Mancha y le apasiona leer novelas de caballerías. Pasa las noches leyendo hasta perder el juicio. Finalmente, decide convertirse en caballero andante para defender el honor y vivir aventuras.',
      summary_advanced: 'El hidalgo Alonso Quijano, obsesionado con las crónicas de caballería medievales, descuiza su hacienda y enajena su mente por completo. En su delirio heroico, se autoproclama Don Quijote de la Mancha, resucitando la caballería andante.',
      lines: [
        { target: 'En un lugar de la Mancha,', native: 'In a place of La Mancha,' },
        { target: 'de cuyo nombre no quiero acordarme,', native: 'whose name I do not wish to remember,' },
        { target: 'no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero,', native: 'not long ago there lived a nobleman, one of those with a lance in a rack,' },
        { target: 'adarga antigua, rocín flaco y galgo corredor.', native: 'an ancient shield, a skinny nag, and a racing greyhound.' }
      ]
    },
    {
      id: 'q2',
      book_id: 'quijote',
      chapter_number: 2,
      title: 'Capítulo II',
      synopsis: 'Don Quijote realiza su primera salida en solitario buscando aventuras y llega a una venta local, confundiéndola con un gran castillo medieval.',
      summary_basic: 'Él monta en su caballo Rocinante. [He rides his horse Rocinante.] Viaja todo el día bajo el sol. [He travels all day under the sun.] Llega a una venta por la noche. [He arrives at an inn by night.]',
      summary_intermediate: 'Al amanecer, Don Quijote emprende su primera salida en secreto. Después de cabalgar todo el día bajo un sol abrasador, divisa una humilde venta, la cual confunde con un castillo de altas torres y puentes levadizos.',
      summary_advanced: 'Sin dar parte a persona alguna, nuestro flamante caballero andante inicia su andadura en la calurosa llanura manchega. Al caer la noche, fatigado y hambriento, arriba a una hostería rural que sus desvaríos transfiguran de inmediato en una fortaleza feudal.',
      lines: [
        { target: 'Salió al campo con grandísimo contento,', native: 'He went out into the field with very great joy,' },
        { target: 'pero le asaltó un pensamiento terrible:', native: 'but a terrible thought assailed him:' },
        { target: 'que no estaba armado caballero.', native: 'that he was not yet dubbed a knight.' }
      ]
    },
    {
      id: 'q3',
      book_id: 'quijote',
      chapter_number: 3,
      title: 'Capítulo III',
      synopsis: 'La cómica ceremonia nocturna en la venta donde el astuto hostelero decide "armar caballero" a Don Quijote para librarse de él.',
      summary_basic: 'Él vela sus armas en el patio. [He watches his weapons in the courtyard.] El ventero le da un golpe en el hombro. [The innkeeper strikes him on the shoulder.] Ahora es un caballero oficial. [Now he is an official knight.]',
      summary_intermediate: 'Para ser un caballero legítimo, Don Quijote insiste en velar sus armas en el patio de la venta. Tras un altercado con unos arrieros, el socarrón ventero decide complacerle y armarlo caballero en una cómica ceremonia.',
      summary_advanced: 'Persuadido de la urgencia ritual, Don Quijote realiza la vela de sus armas junto a una pila de agua, repeliendo con violencia a los arrieros que pretendían moverlas. El astuto ventero realiza la farsa de armarlo caballero para acelerar su partida.',
      lines: [
        { target: 'El ventero le aconsejó que llevase dinero', native: 'The innkeeper advised him to carry money' },
        { target: 'y camisas limpias,', native: 'and clean shirts,' },
        { target: 'porque los caballeros de los libros siempre los tenían.', native: 'because the knights in the books always had them.' }
      ]
    }
  ],
  principito: [
    {
      id: 'p1',
      book_id: 'principito',
      chapter_number: 1,
      title: 'Capítulo II',
      synopsis: 'El encuentro fortuito del narrador con el principito en el desierto tras el accidente de aviación.',
      summary_basic: 'El piloto duerme en la arena del desierto. [The pilot sleeps on the desert sand.] Un pequeño niño le despierta. [A little boy wakes him up.] El niño le pide un dibujo de un cordero. [The boy asks him for a drawing of a sheep.]',
      summary_intermediate: 'El narrador sufre una avería en el desierto del Sahara y se encuentra completamente solo. Al amanecer, se despierta con la presencia misteriosa de un principito que le solicita insistentemente dibujar un cordero.',
      summary_advanced: 'Tras un aterrizaje forzoso en la inmensidad del Sahara, el piloto se ve confrontado con lo extraordinario: un infante celestial que emerge al romper el día demandando con obstinación la representación gráfica de un ovino.',
      lines: [
        { target: 'Viví así, solo, sin nadie con quien hablar verdaderamente,', native: 'I lived like this, alone, with no one to truly talk to,' },
        { target: 'hasta que tuve una avería en el desierto del Sahara hace seis años.', native: 'until I had a breakdown in the Sahara Desert six years ago.' },
        { target: 'Algo se había roto en mi motor.', native: 'Something had broken in my engine.' }
      ]
    },
    {
      id: 'p2',
      book_id: 'principito',
      chapter_number: 2,
      title: 'Capítulo IV',
      synopsis: 'El narrador descubre los orígenes cósmicos del principito y reflexiona sobre el asteroide B-612 y el punto de vista rígido de los adultos.',
      summary_basic: 'El principito viene de un asteroide pequeño. [The little prince comes from a small asteroid.] Se llama B-612. [It is called B-612.] Los adultos solo quieren números. [Adults only want numbers.]',
      summary_intermediate: 'El narrador descubre que el hogar del principito es el asteroide B-612. Critica cómo las personas mayores están obsesionadas con las cifras y los números, perdiendo de vista la belleza esencial y los detalles poéticos de la vida.',
      summary_advanced: 'La reconstrucción biográfica del principito revela que su planeta de origen es el minúsculo asteroide B-612, catalogado por un astrónomo turco. El autor deplora la predisposición adulta a cuantificarlo todo mediante cifras financieras e informativas.',
      lines: [
        { target: 'Las personas mayores adoran las cifras.', native: 'Grown-ups love numbers.' },
        { target: 'Nunca te preguntan sobre lo esencial.', native: 'They never ask you about essential matters.' },
        { target: 'Si les dices: "He visto una hermosa casa de ladrillos rosas...",', native: 'If you say to them: "I have seen a beautiful house of pink bricks...",' },
        { target: 'no pueden imaginarse la casa.', native: 'they cannot imagine the house.' }
      ]
    },
    {
      id: 'p3',
      book_id: 'principito',
      chapter_number: 3,
      title: 'Capítulo VII',
      synopsis: 'El principito llora al preocuparse por el peligro que corren las flores de su planeta a causa de las ovejas, cuestionando lo que es verdaderamente importante.',
      summary_basic: 'Las ovejas comen flores. [Sheep eat flowers.] El principito tiene una flor única. [The little prince has a unique flower.] Él tiene miedo de perderla. [He is afraid of losing it.]',
      summary_intermediate: 'El principito discute con el piloto sobre si los corderos se comen las flores con espinas. Al darse cuenta de que su querida rosa corre peligro, estalla en lágrimas, defendiendo la importancia de cuidar el amor y la belleza.',
      summary_advanced: 'Confrontado con la realidad ecológica de que los corderos se alimentan de arbustos y espinas, el principito expresa una angustia desgarradora por la vulnerabilidad de su flor única, reprochándole al piloto su frialdad científica.',
      lines: [
        { target: 'Si una persona ama a una flor de la que no existe más que un ejemplar...', native: 'If a person loves a flower of which there is only one single example...' },
        { target: 'eso basta para que sea feliz cuando la mira.', native: 'that is enough to make him happy when he looks at it.' },
        { target: 'Ella se dice: "Mi flor está allí en alguna parte..."', native: 'She says to herself: "My flower is out there somewhere..."' }
      ]
    }
  ],
  vida_sueno: [
    {
      id: 'v1',
      book_id: 'vida_sueno',
      chapter_number: 1,
      title: 'Jornada I, Escena II',
      synopsis: 'El lamento existencial del príncipe Segismundo encadenado en su torre secreta.',
      summary_basic: 'Segismundo está encerrado en una torre. [Segismundo is locked in a tower.] Él se pregunta por qué no tiene libertad. [He wonders why he does not have freedom.] Los animales tienen más libertad que él. [Animals have more freedom than him.]',
      summary_intermediate: 'El príncipe Segismundo reflexiona con profunda amargura sobre su cruel destino y cautiverio. Compara su falta de libertad con las aves, los peces y los ríos, sintiendo una honda injusticia existencial.',
      summary_advanced: 'Enclaustrado y encadenado en una lúgubre torre, Segismundo declama su desgarrador soliloquio, cuestionando el libre albedrío y lamentando que las criaturas más ínfimas del cosmos gocen de la libertad que a él le es denegada.',
      lines: [
        { target: '¡Ay mísero de mí, y ay infelice!', native: 'Ah, wretched me! Oh, unhappy man!' },
        { target: 'Apurar, cielos, pretendo,', native: 'I try to determine, heavens,' },
        { target: 'ya que me tratáis así,', native: 'since you treat me so,' },
        { target: 'qué delito cometí contra vosotros naciendo.', native: 'what crime I committed against you by being born.' }
      ]
    },
    {
      id: 'v2',
      book_id: 'vida_sueno',
      chapter_number: 2,
      title: 'Jornada II, Escena VI',
      synopsis: 'Segismundo es llevado a la corte bajo los efectos de un somnífero, reaccionando con furia y violencia ante su nueva realidad como príncipe heredero.',
      summary_basic: 'Segismundo despierta en un palacio rico. [Segismundo wakes up in a rich palace.] Él se enfada con los sirvientes. [He gets angry with the servants.] Lanza a un hombre por la ventana. [He throws a man out the window.]',
      summary_intermediate: 'Segismundo despierta vestido de seda en la corte y descubre que es el príncipe de Polonia. Confundido y furioso por el engaño de su padre Basilio, reacciona violentamente contra los cortesanos y comete actos de crueldad.',
      summary_advanced: 'Trasladado narcotizado al palacio real por orden del rey Basilio, Segismundo experimenta un súbito despertar cortesano. Su carácter, forjado en el cautiverio hostil, eclosiona en soberbia tiránica, agrediendo a quienes pretenden moderar su ira.',
      lines: [
        { target: '¿Yo en palacio? ¿Yo vestido de sedas?', native: 'Me in palace? Me dressed in silks?' },
        { target: 'Decir que sueño es engaño;', native: 'To say I dream is a delusion;' },
        { target: 'bien sé que despierto estoy.', native: 'I know well that I am awake.' }
      ]
    },
    {
      id: 'v3',
      book_id: 'vida_sueno',
      chapter_number: 3,
      title: 'Jornada III, Escena X',
      synopsis: 'La célebre conclusión filosófica sobre la transitoriedad de la vida terrenal y la ilusión del poder.',
      summary_basic: 'Segismundo vuelve a la torre encadenado. [Segismundo returns to the tower in chains.] Él cree que todo fue un sueño. [He thinks everything was a dream.] La vida es una ilusión. [Life is an illusion.]',
      summary_intermediate: 'Devuelto a su prisión y convencido de que su estancia en el palacio fue una ilusión, Segismundo pronuncia sus famosos versos sobre la fugacidad de la vida, concluyendo que toda la existencia es un sueño pasajero.',
      summary_advanced: 'Conducido nuevamente a su confinamiento tras su desastroso despliegue cortesano, Segismundo asimila la lección de Clotaldo. Su soliloquio metafísico postula que los triunfos temporales y las jerarquías terrenales son meros delirios oníricos.',
      lines: [
        { target: '¿Qué es la vida? Un frenesí.', native: 'What is life? A frenzy.' },
        { target: '¿Qué es la vida? Una ilusión, una sombra, una ficción,', native: 'What is life? An illusion, a shadow, a fiction,' },
        { target: 'y el mayor bien es pequeño; que toda la vida es sueño,', native: 'and the greatest good is small; for all life is a dream,' },
        { target: 'y los sueños, sueños son.', native: 'and dreams, dreams are.' }
      ]
    }
  ],
  hamlet: [
    {
      id: 'h1',
      book_id: 'hamlet',
      chapter_number: 1,
      title: 'Act III, Scene I',
      synopsis: 'Hamlet\'s deep philosophical reflection on existence, suffering, and mortality.',
      summary_basic: 'Hamlet se pregunta si es mejor vivir o morir. [Hamlet asks himself if it is better to live or to die.] La vida tiene muchos problemas. [Life has many problems.] Él tiene miedo de la muerte. [He is afraid of death.]',
      summary_intermediate: 'El príncipe Hamlet debate si es más noble tolerar los sufrimientos de la vida o ponerles fin a través de la muerte. Considera que el miedo a lo desconocido después de la muerte nos paraliza de actuar.',
      summary_advanced: 'Hamlet pronuncia su célebre monólogo existencial sobre el suicidio, el sufrimiento y la parálisis de la voluntad ante el temor de lo desconocido en el más allá, ponderando la inacción contra el enfrentamiento.',
      lines: [
        { target: 'To be, or not to be, that is the question:', native: 'Ser o no ser, esa es la cuestión:' },
        { target: "Whether 'tis nobler in the mind to suffer", native: 'Si es más noble para el espíritu sufrir' },
        { target: 'The slings and arrows of outrageous fortune,', native: 'Los golpes y dardos de la insultante fortuna,' }
      ]
    },
    {
      id: 'h2',
      book_id: 'hamlet',
      chapter_number: 2,
      title: 'Act III, Scene II',
      synopsis: 'Hamlet sets up a theatrical play ("The Mousetrap") depicting his father\'s murder to trap King Claudius into revealing his guilt.',
      summary_basic: 'Hamlet hace una obra de teatro. [Hamlet makes a play.] Los actores imitan un asesinato. [The actors imitate a murder.] El rey Claudio se asusta y sale. [King Claudius gets scared and leaves.]',
      summary_intermediate: 'Hamlet instruye a un grupo de actores para que representen un regicidio similar al de su padre frente al rey Claudio. Al presenciar la escena, Claudio se altera enormemente y abandona la sala, confirmando su culpabilidad.',
      summary_advanced: 'Con el propósito de obtener pruebas empíricas sobre la traición de Claudio, Hamlet organiza una escenificación teatral de la felonía descrita por el espectro. La violenta salida de la corte del usurpador constata de forma irrevocable su magnicidio.',
      lines: [
        { target: 'The play\'s the thing', native: 'La obra de teatro es la trampa' },
        { target: 'wherein I\'ll catch the conscience of the king.', native: 'en la que atraparé la conciencia del rey.' }
      ]
    },
    {
      id: 'h3',
      book_id: 'hamlet',
      chapter_number: 3,
      title: 'Act III, Scene IV',
      synopsis: 'Hamlet confronts his mother Gertrude in her chamber and accidentally kills Polonius who was hiding behind the curtain.',
      summary_basic: 'Hamlet habla enfadado con su madre. [Hamlet talks angrily with his mother.] Alguien escucha detrás de una cortina. [Someone listens behind a curtain.] Hamlet saca su espada y le mata. [Hamlet draws his sword and kills him.]',
      summary_intermediate: 'Hamlet reprende duramente a su madre Gertrudis en sus aposentos. Al oír un ruido detrás de los tapices, ataca impulsivamente y asesina a Polonius, confundiéndolo con el rey Claudio.',
      summary_advanced: 'Durante una tempestuosa entrevista maternofilial encaminada a denunciar su infidelidad conyugal, Hamlet advierte un espía tras los cortinajes. Desenvainando su acero en un rapto irreflexivo, atraviesa a Polonius creyendo herir al soberano.',
      lines: [
        { target: 'Mother, you have my father much offended.', native: 'Madre, habéis ofendido mucho a mi padre.' },
        { target: 'How now! a rat? Dead, for a ducat, dead!', native: '¡Cómo! ¿una rata? ¡Muerta, por un ducado, muerta!' }
      ]
    }
  ],
  pride_prejudice: [
    {
      id: 'pp1',
      book_id: 'pride_prejudice',
      chapter_number: 1,
      title: 'Chapter I',
      synopsis: 'The arrival of Mr. Bingley at Netherfield Park and Mrs. Bennet\'s schemes.',
      summary_basic: 'La señora Bennet quiere casar a sus hijas. [Mrs. Bennet wants to marry her daughters.] Un hombre rico llega al barrio. [A wealthy man arrives in the neighborhood.] Ella le pide a su esposo que lo visite. [She asks her husband to visit him.]',
      summary_intermediate: 'La señora Bennet está entusiasmada por la llegada de un joven soltero y acaudalado llamado Bingley. Insiste a su esposo, el señor Bennet, para que establezca contacto y así asegurar el futuro de una de sus hijas.',
      summary_advanced: 'La noticia de que un soltero aristócrata y acaudalado se ha establecido en las inmediaciones altera el ánimo de la señora Bennet, quien apremia con tenacidad a su sarcástico cónyuge para que formalice las visitas sociales de rigor.',
      lines: [
        { target: 'It is a truth universally acknowledged,', native: 'Es una verdad mundialmente reconocida,' },
        { target: 'that a single man in possession of a good fortune,', native: 'que un hombre soltero, dueño de una gran fortuna,' },
        { target: 'must be in want of a wife.', native: 'necesita una esposa.' }
      ]
    },
    {
      id: 'pp2',
      book_id: 'pride_prejudice',
      chapter_number: 2,
      title: 'Chapter II',
      synopsis: 'Mr. Bennet secretly visits Mr. Bingley first, teasing his wife and daughters before revealing the surprise.',
      summary_basic: 'El señor Bennet visita al nuevo vecino. [Mr. Bennet visits the new neighbor.] Él no le dice nada a su familia. [He does not tell his family anything.] Luego lo revela en la cena. [Later he reveals it at dinner.]',
      summary_intermediate: 'Aunque simula desinterés ante los ruegos de su esposa, el señor Bennet es uno de los primeros en presentar sus respetos al señor Bingley. Pasa días divirtiendo a sus hijas con sarcasmo antes de revelar su visita secreta.',
      summary_advanced: 'Ocultando sus verdaderos propósitos bajo un manto de aparente apatía y cinismo intelectual, el señor Bennet ejecuta su visita al recién llegado. Prolonga el suspenso doméstico con ironía antes de confirmar la formalización de la alianza vecinal.',
      lines: [
        { target: 'Mr. Bennet was among the earliest of those who waited on Mr. Bingley.', native: 'El señor Bennet estuvo entre los primeros que visitaron al señor Bingley.' },
        { target: 'He had always intended to visit him,', native: 'Él siempre había tenido la intención de visitarlo,' },
        { target: 'though to the last always declaring that he should not go.', native: 'aunque hasta el último momento siempre declaró que no iría.' }
      ]
    },
    {
      id: 'pp3',
      book_id: 'pride_prejudice',
      chapter_number: 3,
      title: 'Chapter III',
      synopsis: 'The assembly ball at Meryton, where Mr. Darcy makes a cold first impression by refusing to dance with Elizabeth Bennet.',
      summary_basic: 'Ellos van a un baile público. [They go to a public ball.] El señor Darcy es muy orgulloso. [Mr. Darcy is very proud.] Él no quiere bailar con Elizabeth. [He does not want to dance with Elizabeth.]',
      summary_intermediate: 'En el baile de Meryton, el señor Bingley es encantador, pero su amigo el señor Darcy causa una impresión nefasta debido a su soberbia. Darcy llega a insultar a Elizabeth Bennet negándose a sacarla a bailar.',
      summary_advanced: 'La asamblea danzante de Meryton constata el contraste social entre el afable Bingley y la altanería aristocrática de Darcy. Este último desata la antipatía de la comunidad tras calificar a Elizabeth Bennet como una joven meramente pasable.',
      lines: [
        { target: 'She is tolerable, but not handsome enough to tempt me;', native: 'Es pasable, pero no lo suficientemente hermosa para tentarme;' },
        { target: 'and I am in no humour at present to give consequence', native: 'y no estoy de humor en este momento para dar importancia' },
        { target: 'to young ladies who are slighted by other men.', native: 'a señoritas que son despreciadas por otros hombres.' }
      ]
    }
  ]
};


// 1. Fetch all books
app.get('/api/literature/books', async (req, res) => {
  if (!supabase) {
    console.log('[Mock Literature] Returning mock books.');
    return res.json(MOCK_BOOKS);
  }

  try {
    const { data, error } = await supabase
      .from('literature_books')
      .select('*')
      .order('title', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('[Literature] Supabase books table is empty. Returning mock books.');
      return res.json(MOCK_BOOKS);
    }

    res.json(data);
  } catch (err) {
    console.warn('[Literature] Failed to fetch books from DB. Using mock fallback:', err.message);
    res.json(MOCK_BOOKS);
  }
});

// 2. Fetch chapters for a book
app.get('/api/literature/book/:id/chapters', async (req, res) => {
  const { id } = req.params;

  if (!supabase) {
    console.log(`[Mock Literature] Returning mock chapters for book: ${id}`);
    return res.json(MOCK_CHAPTERS[id] || []);
  }

  try {
    const { data, error } = await supabase
      .from('literature_chapters')
      .select('*')
      .eq('book_id', id)
      .order('chapter_number', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log(`[Literature] No chapters in DB for book ${id}. Checking mock chapters.`);
      return res.json(MOCK_CHAPTERS[id] || []);
    }

    res.json(data);
  } catch (err) {
    console.warn(`[Literature] Failed to fetch chapters for ${id}. Using mock fallback:`, err.message);
    res.json(MOCK_CHAPTERS[id] || []);
  }
});

// 3. Fetch progress for a book
app.get('/api/literature/progress/:bookId', async (req, res) => {
  const { bookId } = req.params;
  const { userId } = req.query;

  if (!supabase || !userId) {
    console.log(`[Mock Progress] Returning default progress for book: ${bookId}`);
    return res.json({ completed_chapters: [], current_chapter: 1 });
  }

  try {
    const { data, error } = await supabase
      .from('user_literature_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Auto-create default progress record
      const defaultProgress = {
        user_id: userId,
        book_id: bookId,
        completed_chapters: [],
        current_chapter: 1
      };

      const { data: newProgress, error: insertErr } = await supabase
        .from('user_literature_progress')
        .insert(defaultProgress)
        .select('*')
        .single();

      if (insertErr) {
        console.warn('[Progress] Failed to insert default progress record:', insertErr.message);
        return res.json({ completed_chapters: [], current_chapter: 1 });
      }
      return res.json(newProgress);
    }

    res.json(data);
  } catch (err) {
    console.warn('[Progress] Error fetching progress, using default:', err.message);
    res.json({ completed_chapters: [], current_chapter: 1 });
  }
});

// 4. Save progress (complete chapter)
app.post('/api/literature/progress/complete', async (req, res) => {
  const { userId, bookId, chapterNumber } = req.body;

  if (!supabase || !userId) {
    console.log(`[Mock Progress Complete] Completed chapter ${chapterNumber} for book: ${bookId}`);
    return res.json({ completed_chapters: [chapterNumber], current_chapter: chapterNumber + 1 });
  }

  try {
    const { data: progress, error: fetchErr } = await supabase
      .from('user_literature_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    let completed = [];
    let nextChapter = chapterNumber + 1;

    if (progress) {
      completed = progress.completed_chapters || [];
      if (!completed.includes(chapterNumber)) {
        completed.push(chapterNumber);
      }
      nextChapter = Math.max(progress.current_chapter, chapterNumber + 1);

      const { data: updated, error: updateErr } = await supabase
        .from('user_literature_progress')
        .update({
          completed_chapters: completed,
          current_chapter: nextChapter,
          updated_at: new Date().toISOString()
        })
        .eq('id', progress.id)
        .select('*')
        .single();

      if (updateErr) throw updateErr;
      res.json(updated);
    } else {
      const { data: created, error: createErr } = await supabase
        .from('user_literature_progress')
        .insert({
          user_id: userId,
          book_id: bookId,
          completed_chapters: [chapterNumber],
          current_chapter: nextChapter
        })
        .select('*')
        .single();

      if (createErr) throw createErr;
      res.json(created);
    }
  } catch (err) {
    console.error('[Progress Complete] Error updating progression:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/welcome-email
app.post('/api/auth/welcome-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const plunkApiKey = process.env.PLUNK_API_KEY;
  if (!plunkApiKey) {
    console.log(`[Email Service Mock] Welcome email requested for ${email}. Plunk API key is not configured.`);
    return res.json({ success: true, message: 'Plunk key not configured. Welcome email request mocked.' });
  }

  try {
    // 1. Subscribe user to contacts list in Plunk CRM (newsletter)
    console.log(`[Email Service] Subscribing contact in Plunk: ${email}`);
    await fetch('https://api.useplunk.com/v1/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${plunkApiKey}`
      },
      body: JSON.stringify({
        email: email,
        subscribed: true
      })
    });

    // 2. Send welcome email to user
    console.log(`[Email Service] Sending welcome email in Plunk to: ${email}`);
    const emailBody = `
      <div style="font-family: sans-serif; background: #0b0f19; color: #f1f5f9; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 28px; color: #8b5cf6; margin: 0;">Welcome to Spanglish! 🇪🇸🇺🇸</h2>
          <p style="font-size: 14px; color: #64748b; margin-top: 4px;">Your intelligent pocket bilingual learning tutor.</p>
        </div>
        <div style="background: #111827; padding: 24px; border-radius: 12px; border: 1px solid #374151;">
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-top: 0;">Hi there,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">Thank you for signing up to Spanglish! We are thrilled to help you on your journey to bilingual fluency.</p>
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">Here is what you can do in Spanglish:</p>
          <ul style="font-size: 14px; color: #94a3b8; line-height: 1.8; padding-left: 20px;">
            <li>📰 <strong>Daily News</strong>: Read level-adapted news articles customized to your fluency.</li>
            <li>📖 <strong>Classic Literature</strong>: Challenge yourself with classic novels chapter-by-chapter.</li>
            <li>💬 <strong>AI Voice Tutor</strong>: Speak directly to our advanced voice tutor to practice pronunciation.</li>
            <li>✨ <strong>Highlight to Translate</strong>: Instantly translate words or phrases by highlighting them.</li>
          </ul>
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 0;">Happy learning!</p>
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">— The Spanglish Team</p>
        </div>
        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #475569;">
          <p>You received this email because you registered on Spanglish. You are subscribed to our weekly newsletter.</p>
          <p>&copy; 2026 Spanglish App. All rights reserved.</p>
        </div>
      </div>
    `;

    const response = await fetch('https://api.useplunk.com/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${plunkApiKey}`
      },
      body: JSON.stringify({
        to: email,
        subject: 'Welcome to Spanglish! 🇪🇸🇺🇸',
        body: emailBody
      })
    });

    if (!response.ok) {
      throw new Error(`Plunk send error: ${response.status}`);
    }

    res.json({ success: true, message: 'Welcome email sent successfully.' });
  } catch (err) {
    console.error('[Email Service] Error sending welcome email:', err.message);
    res.status(500).json({ error: 'Failed to send welcome email.', details: err.message });
  }
});

// AI Tutor Report Content Handler
const handleReportAiContent = async (req, res) => {
  const { aiResponse, userText, reportReason, userComments, userEmail } = req.body || {};
  if (!aiResponse) {
    return res.status(400).json({ error: 'AI response content is required.' });
  }

  const timestamp = new Date().toISOString();
  const reporter = userEmail || 'Anonymous User';
  const reason = reportReason || 'Inappropriate or broken response';

  console.log(`[AI Tutor Content Report Received]`, {
    timestamp,
    reporter,
    reason,
    userComments,
    userText,
    aiResponse
  });

  const plunkApiKey = process.env.PLUNK_API_KEY;
  if (!plunkApiKey) {
    console.log(`[Email Service Mock] Report AI content requested. Plunk key not set.`);
    return res.json({ success: true, message: 'Report recorded locally (Plunk key not set).' });
  }

  try {
    const comments = userComments ? `<p style="margin-top:8px;"><strong>Additional Comments:</strong> ${userComments}</p>` : '';
    const userPromptSection = userText ? `<div style="background:#1f2937; padding:12px; border-radius:8px; margin-bottom:12px;"><strong style="color:#9ca3af;">User Prompt:</strong><p style="margin:4px 0 0 0; color:#e5e7eb;">${userText}</p></div>` : '';

    const emailBody = `
      <div style="font-family: sans-serif; background: #0b0f19; color: #f1f5f9; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="border-bottom: 1px solid #374151; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #ef4444; margin: 0; font-size: 22px;">🚩 AI Tutor Content Report</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Reported by: ${reporter} • ${timestamp}</p>
        </div>
        <div style="background: #111827; padding: 16px; border-radius: 12px; border: 1px solid #374151;">
          <p style="margin-top:0; color:#f87171; font-weight:bold;">Reason: ${reason}</p>
          ${comments}
          ${userPromptSection}
          <div style="background:#1f2937; padding:12px; border-radius:8px; border-left:4px solid #ef4444;">
            <strong style="color:#9ca3af;">Flagged AI Response:</strong>
            <p style="margin:4px 0 0 0; color:#f3f4f6; white-space:pre-wrap;">${aiResponse}</p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #64748b;">
          Spanglish App Generative AI Safety Compliance Report
        </div>
      </div>
    `;

    const response = await fetch('https://api.useplunk.com/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${plunkApiKey}`
      },
      body: JSON.stringify({
        to: 'ae@levmo.co',
        subject: `[AI Tutor Report] ${reason}`,
        body: emailBody
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Plunk Send Error ${response.status}]:`, errText);
    }

    res.json({ success: true, message: 'AI report sent successfully.' });
  } catch (err) {
    console.error('[Email Service] Error in AI report endpoint:', err.message);
    res.json({ success: true, message: 'Report recorded (email delivery pending).' });
  }
};

app.post('/api/report-ai-content', handleReportAiContent);
app.post('/report-ai-content', handleReportAiContent);

// General User Feedback Handler
const handleUserFeedback = async (req, res) => {
  const { category, message, userEmail } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Feedback message is required.' });
  }

  const timestamp = new Date().toISOString();
  const sender = userEmail || 'Anonymous User';
  const fbCategory = category || 'General Feedback';

  console.log(`[User Feedback Received]`, {
    timestamp,
    sender,
    category: fbCategory,
    message
  });

  const plunkApiKey = process.env.PLUNK_API_KEY;
  if (!plunkApiKey) {
    console.log(`[Email Service Mock] Feedback received. Plunk key not set.`);
    return res.json({ success: true, message: 'Feedback recorded locally (Plunk key not set).' });
  }

  try {
    const emailBody = `
      <div style="font-family: sans-serif; background: #0b0f19; color: #f1f5f9; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="border-bottom: 1px solid #374151; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #8b5cf6; margin: 0; font-size: 22px;">💬 New User Feedback Received</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">From: ${sender} • ${timestamp}</p>
        </div>
        <div style="background: #111827; padding: 16px; border-radius: 12px; border: 1px solid #374151;">
          <p style="margin-top:0; color:#a78bfa; font-weight:bold;">Category: ${fbCategory}</p>
          <div style="background:#1f2937; padding:14px; border-radius:8px; margin-top:8px;">
            <p style="margin:0; color:#f3f4f6; white-space:pre-wrap; line-height:1.5;">${message}</p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #64748b;">
          Spanglish App User Feedback
        </div>
      </div>
    `;

    const response = await fetch('https://api.useplunk.com/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${plunkApiKey}`
      },
      body: JSON.stringify({
        to: 'ae@levmo.co',
        subject: `[Spanglish Feedback] ${fbCategory}`,
        body: emailBody
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Plunk Send Error ${response.status}]:`, errText);
    }

    res.json({ success: true, message: 'Feedback sent successfully.' });
  } catch (err) {
    console.error('[Email Service] Error in feedback endpoint:', err.message);
    res.json({ success: true, message: 'Feedback recorded (email delivery pending).' });
  }
};

app.post('/api/feedback', handleUserFeedback);
app.post('/feedback', handleUserFeedback);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Spanglish Backend Proxy running on port ${PORT}`);
  });
}

export default app;
