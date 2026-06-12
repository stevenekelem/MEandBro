import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

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

app.listen(PORT, () => {
  console.log(`Spanglish Backend Proxy running on port ${PORT}`);
});
