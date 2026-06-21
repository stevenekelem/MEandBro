import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL/Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log("Querying literature_books...");
    const { data: books, error: booksErr } = await supabase.from('literature_books').select('id, title, author');
    if (booksErr) throw booksErr;
    console.log("Books in Database:", books);

    for (const book of books || []) {
      const { count, error: countErr } = await supabase
        .from('literature_chapters')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', book.id);
      if (countErr) throw countErr;
      console.log(`Book "${book.title}" has ${count} chapters in the database.`);
    }
  } catch (err) {
    console.error(err);
  }
}

main();
