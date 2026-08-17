import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Supabase URL or Key is missing in .env file.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY is missing in .env file.');
  process.exit(1);
}
const ai = new GoogleGenerativeAI(apiKey);

// We try models in order of capability/availability
const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

async function runGeminiJSON(systemPrompt, promptText) {
  let lastError = null;
  for (const modelName of modelsToTry) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        }
      });
      const text = result.response.text();
      return JSON.parse(text);
    } catch (err) {
      console.warn(`[Gemini JSON] Model ${modelName} failed: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError;
}

const LITERATURE_DIR = './literature_pdfs';

async function splitIntoChapters(text) {
  const cleanText = text.replace(/\r\n/g, '\n');
  
  // 1. AI Stage: Analyze TOC and book structure
  console.log('Analyzing book structure and Table of Contents with Gemini...');
  const structureSystemPrompt = `You are a literary structure analyst. Analyze text and output JSON.`;
  const structurePrompt = `Analyze the beginning of this book text (which may contain front-matter, prefaces, or a Table of Contents).
  Identify:
  1. The primary structural term used for divisions (e.g., "Book", "Libro", "Chapter", "Capítulo", "Canto", "Jornada", "Act", "Acto", "Section", "Parte").
  2. Whether a Table of Contents or Preface is present.
  3. A short unique sentence or phrase (10-25 characters) from the text where the actual main story narrative begins (after any TOC, preface, or publisher notes).
  
  Return a JSON object:
  {
    "structural_term": "string (e.g. Book, Chapter, Canto, Jornada)",
    "has_toc": true,
    "narrative_start_phrase": "exact short text snippet where main story begins"
  }

  Only return JSON.

  Text snippet:
  ${cleanText.slice(0, 12000)}`;

  let structureInfo = null;
  try {
    structureInfo = await runGeminiJSON(structureSystemPrompt, structurePrompt);
    console.log(`Detected structural term: "${structureInfo.structural_term || 'Chapter'}", Has TOC: ${structureInfo.has_toc}`);
  } catch (err) {
    console.warn('AI structure analysis fallback:', err.message);
  }

  // Bypass front-matter / preface if start phrase is detected
  let textToProcess = cleanText;
  if (structureInfo && structureInfo.narrative_start_phrase) {
    const startIdx = cleanText.indexOf(structureInfo.narrative_start_phrase);
    if (startIdx > 0 && startIdx < 20000) {
      console.log(`Bypassing front-matter/preface at character index ${startIdx}.`);
      textToProcess = cleanText.slice(startIdx);
    }
  }

  const lines = textToProcess.split('\n');
  const chapters = [];
  let currentChapterTitle = `${structureInfo?.structural_term || 'Chapter'} 1`;
  let currentChapterText = '';

  // 2. Expanded pattern matching Book, Libro, Chapter, Capítulo, Canto, Jornada, Act, Acto, Section, Sección, Part, Parte
  const chapterPattern = /^\s*(?:Book|Libro|Chapter|Capítulo|Canto|Jornada|Act|Acto|Section|Sección|Part|Parte)\s+([IVXLCDM\d]+|[a-zA-Záéíóúñ\s]+)/i;
  const romanPattern = /^\s*([IVXLCDM]+)\s*$/i;
  const prefacePattern = /^\s*(?:Preface|Prólogo|Introduction|Introducción|Foreword|Table of Contents|Tabla de Contenidos|Índice|Copyright|Publisher)/i;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip preface or TOC lines if they appear at the start of processing
    if (prefacePattern.test(trimmed) && trimmed.length < 60 && currentChapterText.length < 500) {
      continue;
    }

    const isChapterLine = trimmed.match(chapterPattern) || trimmed.match(romanPattern);
    
    if (isChapterLine && trimmed.length < 60) {
      if (currentChapterText.trim().length > 300) {
        chapters.push({
          title: currentChapterTitle,
          text: currentChapterText.trim()
        });
      }
      currentChapterTitle = trimmed;
      currentChapterText = '';
    } else {
      currentChapterText += line + '\n';
    }
  }

  // Add the last chapter
  if (currentChapterText.trim().length > 300) {
    chapters.push({
      title: currentChapterTitle,
      text: currentChapterText.trim()
    });
  }

  // Fallback: chunk by 15000 characters if no chapters detected
  if (chapters.length <= 1) {
    console.log('No distinct chapter markers detected. Chunking text by characters (fallback)...');
    const chunkSize = 15000;
    const fallbackChapters = [];
    let index = 0;
    let chapterNum = 1;
    while (index < textToProcess.length) {
      fallbackChapters.push({
        title: `${structureInfo?.structural_term || 'Chapter'} ${chapterNum++}`,
        text: textToProcess.slice(index, index + chunkSize).trim()
      });
      index += chunkSize;
    }
    return fallbackChapters;
  }

  return chapters;
}

async function processLiteraturePdf(filePath) {
  console.log(`\nReading novel PDF: ${filePath}`);
  const dataBuffer = fs.readFileSync(filePath);
  
  const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
  await parser.load();
  const pdfData = await parser.getText();
  await parser.destroy();
  
  console.log(`Successfully read PDF. Text length: ${pdfData.text.length} chars.`);
  
  // 1. Detect Metadata (Dual Language Synopses)
  console.log('Analyzing book metadata with Gemini...');
  const metadataSystemPrompt = `You are a book cataloger. Analyze the text and output book metadata in JSON format.`;
  const metadataPrompt = `Analyze the following text from the start of a book and return a JSON object with:
  {
    "title": "Title of the book",
    "author": "Author of the book",
    "source_lang": "es" or "en" (the language of the text),
    "synopsis_en": "A general synopsis of the whole book (3-4 sentences) written in English.",
    "synopsis_es": "Una sinopsis general de todo el libro (3-4 frases) escrita en español."
  }
  
  Only return JSON.
  
  Text:
  ${pdfData.text.slice(0, 4000)}`;

  const metadata = await runGeminiJSON(metadataSystemPrompt, metadataPrompt);
  console.log(`Detected Book: "${metadata.title}" by ${metadata.author} (Language: ${metadata.source_lang})`);

  // Check if book already exists in DB
  const { data: existingBook, error: fetchErr } = await supabase
    .from('literature_books')
    .select('id')
    .eq('title', metadata.title)
    .eq('author', metadata.author)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  let bookId;
  if (existingBook) {
    console.log(`Book "${metadata.title}" already exists in DB. Skipping book creation.`);
    bookId = existingBook.id;
  } else {
    console.log('Inserting book into database...');
    const { data: newBook, error: insertErr } = await supabase
      .from('literature_books')
      .insert({
        title: metadata.title,
        author: metadata.author,
        source_lang: metadata.source_lang,
        synopsis: metadata.synopsis_en || metadata.synopsis_es || '',
        synopsis_en: metadata.synopsis_en || '',
        synopsis_es: metadata.synopsis_es || ''
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;
    bookId = newBook.id;
  }

  // 2. Segment into Chapters
  console.log('Segmenting book into chapters...');
  const chapters = await splitIntoChapters(pdfData.text);
  console.log(`Found ${chapters.length} chapters.`);

  // 3. Process each chapter
  for (let i = 0; i < chapters.length; i++) {
    const chapterNum = i + 1;
    const chapter = chapters[i];
    console.log(`Processing Chapter ${chapterNum}/${chapters.length}: "${chapter.title}"...`);

    // Check if chapter already exists
    const { data: existingChapter, error: chapFetchErr } = await supabase
      .from('literature_chapters')
      .select('id')
      .eq('book_id', bookId)
      .eq('chapter_number', chapterNum)
      .maybeSingle();

    if (chapFetchErr) throw chapFetchErr;
    if (existingChapter) {
      console.log(`Chapter ${chapterNum} already exists. Skipping.`);
      continue;
    }

    // Call Gemini to generate level-adapted dual-track details for both Spanish and English learners
    const chapterSystemPrompt = `You are an expert bilingual literature professor and language teacher. Analyze the chapter text and output complete dual-track pedagogical JSON for both Spanish learners and English learners.`;
    const chapterPrompt = `You are given text from a chapter of a book (Original Source Language: "${metadata.source_lang}").
    
    Generate a JSON object matching this EXACT schema:
    {
      "title_es": "Chapter title translated into Spanish (e.g. Capítulo ${chapterNum} / Título)",
      "title_en": "Chapter title in English (e.g. Chapter ${chapterNum} / Title)",
      
      "synopsis_en": "Concise chapter plot summary (max 4 sentences) written in English for English native speakers.",
      "synopsis_es": "Sinopsis concisa del argumento del capítulo (máx 4 frases) escrita en español para hispanohablantes.",
      
      "for_spanish_learners": {
        "summary_basic": "Simple chapter summary (3-4 sentences) written in SPANISH using basic (A1-A2) vocabulary.",
        "summary_intermediate": "Chapter summary (4-6 sentences) written in SPANISH using intermediate (B1-B2) vocabulary.",
        "summary_advanced": "Rich chapter summary (5-8 sentences) written in SPANISH using advanced (C1-C2) literary vocabulary.",
        "lines": [
          {
            "target": "Key sentence or phrase extracted/translated in SPANISH for student to read & listen to.",
            "native": "Natural translation of this phrase in ENGLISH for student to understand."
          }
        ]
      },

      "for_english_learners": {
        "summary_basic": "Simple chapter summary (3-4 sentences) written in ENGLISH using basic (A1-A2) vocabulary.",
        "summary_intermediate": "Chapter summary (4-6 sentences) written in ENGLISH using intermediate (B1-B2) vocabulary.",
        "summary_advanced": "Rich chapter summary (5-8 sentences) written in ENGLISH using advanced (C1-C2) literary vocabulary.",
        "lines": [
          {
            "target": "Key sentence or phrase extracted/translated in ENGLISH for student to read & listen to.",
            "native": "Natural translation of this phrase in SPANISH for student to understand."
          }
        ]
      }
    }
    
    Make sure you extract between 5 to 8 distinct sentences for BOTH "lines" arrays.
    Only return JSON.
    
    Chapter Text Excerpt:
    ${chapter.text.slice(0, 10000)}`;

    try {
      const chapterData = await runGeminiJSON(chapterSystemPrompt, chapterPrompt);
      
      const linesEs = chapterData.for_spanish_learners?.lines || [];
      const linesEn = chapterData.for_english_learners?.lines || [];
      const dualLinesObj = { es: linesEs, en: linesEn };

      const insertPayload = {
        book_id: bookId,
        chapter_number: chapterNum,
        title: chapter.title || chapterData.title_en || `Chapter ${chapterNum}`,
        title_es: chapterData.title_es || chapter.title,
        title_en: chapterData.title_en || chapter.title,
        synopsis: chapterData.synopsis_en || chapterData.synopsis_es || '',
        synopsis_es: chapterData.synopsis_es || '',
        synopsis_en: chapterData.synopsis_en || '',
        summary_basic: chapterData.for_spanish_learners?.summary_basic || '',
        summary_basic_es: chapterData.for_spanish_learners?.summary_basic || '',
        summary_basic_en: chapterData.for_english_learners?.summary_basic || '',
        summary_intermediate: chapterData.for_spanish_learners?.summary_intermediate || '',
        summary_intermediate_es: chapterData.for_spanish_learners?.summary_intermediate || '',
        summary_intermediate_en: chapterData.for_english_learners?.summary_intermediate || '',
        summary_advanced: chapterData.for_spanish_learners?.summary_advanced || '',
        summary_advanced_es: chapterData.for_spanish_learners?.summary_advanced || '',
        summary_advanced_en: chapterData.for_english_learners?.summary_advanced || '',
        lines: dualLinesObj,
        lines_es: linesEs,
        lines_en: linesEn
      };

      const { error: insertChapErr } = await supabase
        .from('literature_chapters')
        .insert(insertPayload);

      if (insertChapErr) {
        // If column error occurs (due to missing optional columns), fallback to core insert payload
        console.warn(`[Insert Notice] Full dual column insert had notice, trying core payload: ${insertChapErr.message}`);
        const corePayload = {
          book_id: bookId,
          chapter_number: chapterNum,
          title: chapter.title || chapterData.title_en || `Chapter ${chapterNum}`,
          synopsis: chapterData.synopsis_en || chapterData.synopsis_es || '',
          summary_basic: chapterData.for_spanish_learners?.summary_basic || '',
          summary_intermediate: chapterData.for_spanish_learners?.summary_intermediate || '',
          summary_advanced: chapterData.for_spanish_learners?.summary_advanced || '',
          lines: dualLinesObj
        };
        const { error: fallbackErr } = await supabase.from('literature_chapters').insert(corePayload);
        if (fallbackErr) throw fallbackErr;
      }
      console.log(`Successfully ingested Chapter ${chapterNum}: "${chapter.title}" with dual-language tracks.`);
    } catch (err) {
      console.error(`Error processing Chapter ${chapterNum}:`, err.message);
      // Wait a moment and retry to handle potential rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      i--; // retry current index
    }
  }

  console.log(`\nSuccessfully completed ingestion for book: "${metadata.title}"`);
}

async function main() {
  if (!fs.existsSync(LITERATURE_DIR)) {
    console.log(`Directory ${LITERATURE_DIR} does not exist. Creating it.`);
    fs.mkdirSync(LITERATURE_DIR);
  }

  const files = fs.readdirSync(LITERATURE_DIR).filter(file => file.endsWith('.pdf'));

  if (files.length === 0) {
    console.log('No PDF files found in literature_pdfs/. Please drop your novel PDFs there.');
    return;
  }

  console.log(`Found ${files.length} novel PDF files to ingest.`);

  for (const file of files) {
    const filePath = path.join(LITERATURE_DIR, file);
    await processLiteraturePdf(filePath);
  }

  console.log('\nAll literature documents ingested successfully!');
}

main().catch(err => {
  console.error('Fatal error during literature ingestion:', err);
});
