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

app.use(cors());
app.use(express.json());

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

// 1. LLM Chat Tutor Endpoint
app.post('/api/tutor', async (req, res) => {
  const { message, history = [], nativeLanguage = 'en', level = 'intermediate' } = req.body;
  const targetLanguage = nativeLanguage === 'en' ? 'es' : 'en';

  if (!message) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  // 1a. Mock mode fallback if no API key is configured
  if (!ai) {
    console.log('[Mock Tutor] Processing query:', message);
    return setTimeout(() => {
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
      res.json({ text: reply });
    }, 800);
  }

  // 1b. Call Gemini API
  try {
    const systemPrompt = getTutorSystemPrompt(nativeLanguage, targetLanguage, level);
    
    // Format history for Gemini API.
    const formattedHistory = history.map(item => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content || item.parts?.[0]?.text || '' }]
    }));

    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-3.1-pro-preview', 'gemini-1.5-flash', 'gemini-pro'];
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
      throw lastError;
    }

    res.json({ text: responseText });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to generate tutor response.', details: error.message });
  }
});

// 2. Pronunciation Scorer Endpoint
app.post('/api/pronounce', async (req, res) => {
  const { targetPhrase, userTranscript, targetLanguage = 'es' } = req.body;

  if (!targetPhrase || !userTranscript) {
    return res.status(400).json({ error: 'Both targetPhrase and userTranscript are required.' });
  }

  if (!ai) {
    console.log('[Mock Pronounce Scorer]');
    // Simple text matching coefficient for offline mock
    const tClean = targetPhrase.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g,"").trim();
    const uClean = userTranscript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g,"").trim();
    
    const tWords = tClean.split(/\s+/);
    const uWords = uClean.split(/\s+/);
    
    let matches = 0;
    tWords.forEach(w => {
      if (uWords.includes(w)) matches++;
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
    
    return res.json({ score, feedback, matchingWords: matches, totalWords: tWords.length });
  }

  try {
    const systemPrompt = `You are a strict but encouraging language pronunciation analyzer. 
Compare the "Target Phrase" (what the student was asked to say) with the "User Transcript" (what the speech recognition software captured).
Evaluate how close they match phonetically and semantically. Account for minor speech-to-text transcriber glitches (e.g. omitting punctuation).

Return a JSON object containing:
1. "score": An integer from 0 to 100 representing accuracy.
2. "feedback": A short, friendly sentence explaining what they did well and where they stumbled (max 2 sentences, written in the user's native language).
3. "corrections": An array of specific words that were mispronounced or omitted.

Only output valid JSON. Do not wrap in markdown code blocks.`;

    const prompt = `Target Phrase: "${targetPhrase}"\nUser Transcript: "${userTranscript}"\nTarget Language: "${targetLanguage}"`;
    
    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-3.1-pro-preview', 'gemini-1.5-flash', 'gemini-pro'];
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
    console.error('Gemini Pronounce Error:', error);
    res.status(500).json({ error: 'Failed to score pronunciation.', details: error.message });
  }
});

// 2b. Dynamic Pronunciation Phrase Generator Endpoint
app.post('/api/pronounce/generate', async (req, res) => {
  const { targetLanguage = 'es', level = 'basic', previousPhrase = '' } = req.body;
  const targetName = targetLanguage === 'es' ? 'Spanish' : 'English';
  const nativeName = targetLanguage === 'es' ? 'English' : 'Spanish';

  // Fallback offline pre-baked phrases if Gemini is not initialized
  if (!ai) {
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
    const selected = pool[Math.floor(Math.random() * pool.length)];
    return res.json(selected);
  }

  try {
    const systemPrompt = `You are a language learning content generator. Generate a single level-appropriate practice sentence or phrase in \${targetName} for a student learning \${targetName} whose native language is \${nativeName}. 
    
    Level instructions for phrase selection and length:
    - BASIC: 3-6 words, simple common words, focuses on clean vowels/easy syllables. E.g., "Good morning, how are you?" or "¿Cómo te llamas tú?".
    - INTERMEDIATE: 7-15 words, standard conversation flow, introduces basic conjunctions, standard everyday scenarios. E.g., "I would like to order a hot coffee with milk, please" or "Me gustaría reservar una mesa para cenar esta noche".
    - ADVANCED: 15-30 words, focuses on difficult phonetic patterns (like rolled 'r's, 'tr' clusters, 's/sh' sound differences) or incorporates complex idioms and tongue twisters. E.g., "She sells sea shells by the sea shore to purchase some shoes" or "El ferrocarril corre rápido por las vías empedradas".

    Respond ONLY with a JSON object containing:
    1. "text": The generated sentence/phrase in \${targetName}. (Avoid any formatting like asterisks or quotes inside the text).
    2. "translation": A natural translation of the phrase in \${nativeName}.

    Do not output any markdown code blocks. Only return a valid JSON object.`;

    const prompt = `Generate a new pronunciation practice phrase. Level: \${level}, Target Language: \${targetName}, Native Language: \${nativeName}. Avoid repeating this previous phrase if possible: "\${previousPhrase}".`;

    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-3.1-pro-preview', 'gemini-1.5-flash', 'gemini-pro'];
    let responseText = '';
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Phrase Gen] Trying model: \${modelName}`);
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
        console.warn(`[Phrase Gen] Model \${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!success) {
      throw lastError;
    }

    const data = JSON.parse(responseText);
    res.json(data);
  } catch (error) {
    console.error('Gemini Phrase Gen Error:', error);
    res.status(500).json({ error: 'Failed to generate pronunciation phrase.', details: error.message });
  }
});

// 3. News Synopsis Generator
app.post('/api/news', async (req, res) => {
  const { nativeLanguage = 'en', level = 'intermediate' } = req.body;
  const targetLanguage = nativeLanguage === 'en' ? 'es' : 'en';

  if (!ai) {
    // Return high-quality pre-baked local news data
    const localNews = nativeLanguage === 'en' 
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
    return res.json(localNews);
  }

  try {
    const targetName = targetLanguage === 'es' ? 'Spanish' : 'English';
    const nativeName = nativeLanguage === 'es' ? 'Spanish' : 'English';

    const systemPrompt = `You are a creative content generator for a language learning app. 
Generate 2 short news stories in ${targetName} suited for a ${level.toUpperCase()} language learner.
Each story must contain:
1. "id": A unique string like "n1", "n2".
2. "title": A catchy title in ${targetName}.
3. "category": One word (e.g. "Science", "Culture", "Sports", "Technology").
4. "summary": The article text in ${targetName}.
   - For BASIC: 3-4 very short sentences. Immediately follow each sentence with its literal translation in ${nativeName} inside square brackets. E.g., "The weather is hot. [El clima está caluroso.]"
   - For INTERMEDIATE: A cohesive paragraph (4-6 sentences) using moderate-level vocabulary and natural sentence structures. No translation brackets.
   - For ADVANCED: A native-like paragraph (5-8 sentences) using sophisticated terms, business or formal register, and complex clauses. No translation brackets.
5. "vocab": An array of 3 key vocabulary words from the article, represented as objects: {"word": "${targetName} word", "translation": "${nativeName} translation"}.

Only output a valid JSON array. Do not wrap in markdown code blocks.`;

    const prompt = `Generate 2 news articles. Target Language: ${targetName}, Learner Level: ${level}, Native Language: ${nativeName}`;

    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-3.1-pro-preview', 'gemini-1.5-flash', 'gemini-pro'];
    let responseText = '';
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[News Gen] Trying model: ${modelName}`);
        const model = ai.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.8,
          }
        });

        const response = await result.response;
        responseText = response.text();
        success = true;
        break;
      } catch (err) {
        console.warn(`[News Gen] Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!success) {
      throw lastError;
    }

    const data = JSON.parse(responseText);
    res.json(data);
  } catch (error) {
    console.error('Gemini News Error:', error);
    // Silent fallback if API key errors
    res.status(500).json({ error: 'Failed to generate news.', details: error.message });
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

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
        console.error(`[Cron Job] All Gemini models failed to generate content for article: "${article.title}"`);
        continue;
      }

      // Validate parsed AI data structure
      if (!parsedAiData.summary_basic || !parsedAiData.summary_intermediate || !parsedAiData.summary_advanced || !Array.isArray(parsedAiData.vocab)) {
        console.error('[Cron Job] Gemini response did not match the expected schema:', parsedAiData);
        continue;
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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Spanglish Backend Proxy running on port ${PORT}`);
  });
}

export default app;
