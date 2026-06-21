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
// Use service role key to bypass RLS for inserting admin data
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Supabase URL or Key is missing in .env file.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini API Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY is missing in .env file.');
  process.exit(1);
}
const ai = new GoogleGenerativeAI(apiKey);
const embeddingModel = ai.getGenerativeModel({ model: 'gemini-embedding-2' });

const CURRICULUM_DIR = './curriculum_pdfs';

function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let currentIndex = 0;

  // Clean extra whitespace
  const cleanedText = text.replace(/\s+/g, ' ');

  while (currentIndex < cleanedText.length) {
    let endIndex = currentIndex + chunkSize;
    
    // Attempt to split at a word boundary
    if (endIndex < cleanedText.length) {
      const lastSpace = cleanedText.lastIndexOf(' ', endIndex);
      if (lastSpace > currentIndex + chunkSize - 200) {
        endIndex = lastSpace;
      }
    }

    const chunk = cleanedText.slice(currentIndex, endIndex).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    currentIndex = endIndex - overlap;
    // Prevent infinite loop or overlapping too close to the end
    if (currentIndex >= cleanedText.length - overlap) {
      break;
    }
  }
  return chunks;
}

async function getEmbedding(text) {
  try {
    const result = await embeddingModel.embedContent({
      content: { parts: [{ text: text }] },
      outputDimensionality: 768
    });
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding for text segment:', error.message);
    throw error;
  }
}

async function processPdf(filePath) {
  console.log(`\nProcessing PDF: ${filePath}`);
  const dataBuffer = fs.readFileSync(filePath);
  
  const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
  await parser.load();
  const pdfData = await parser.getText();
  await parser.destroy();
  
  console.log(`Parsed text successfully. Character count: ${pdfData.text.length}`);
  
  const chunks = chunkText(pdfData.text);
  console.log(`Split text into ${chunks.length} chunks.`);

  const documentName = path.basename(filePath);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[${documentName}] Embedding chunk ${i + 1}/${chunks.length}...`);
    
    try {
      const embedding = await getEmbedding(chunk);
      
      const { error } = await supabase.from('curriculum_chunks').insert({
        document_name: documentName,
        content: chunk,
        embedding: embedding,
        metadata: {
          chunk_index: i,
          total_chunks: chunks.length,
          source: 'textbook'
        }
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error(`Failed to ingest chunk ${i}:`, err.message);
      // Wait a moment and retry to handle potential rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      i--; // retry current index
    }
  }
  
  console.log(`Successfully completed ingestion for: ${documentName}`);
}

async function main() {
  if (!fs.existsSync(CURRICULUM_DIR)) {
    console.log(`Directory ${CURRICULUM_DIR} does not exist. Creating it.`);
    fs.mkdirSync(CURRICULUM_DIR);
  }

  const files = fs.readdirSync(CURRICULUM_DIR).filter(file => file.endsWith('.pdf'));

  if (files.length === 0) {
    console.log('No PDF files found in curriculum_pdfs/. Please drop your curriculum textbooks there.');
    return;
  }

  console.log(`Found ${files.length} PDF files to ingest.`);

  for (const file of files) {
    const filePath = path.join(CURRICULUM_DIR, file);
    await processPdf(filePath);
  }

  console.log('\nAll curriculum documents ingested successfully!');
}

main().catch(err => {
  console.error('Fatal error during curriculum ingestion:', err);
});
