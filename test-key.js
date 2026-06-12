import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;

if (!key || key === 'your_gemini_api_key_here') {
  console.error('❌ Error: GEMINI_API_KEY in .env is missing or still set to the placeholder.');
  process.exit(1);
}

console.log(`🔍 Testing Google API Key ending in: ...${key.slice(-6)}`);

async function checkKey() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (res.ok) {
      console.log('\n✅ Success! Your API key is valid and has access to the following models:');
      if (data.models && data.models.length > 0) {
        data.models.forEach(m => {
          console.log(`   - ${m.name.replace('models/', '')}`);
        });
      } else {
        console.log('   (No models returned. This key might be restricted to specific services)');
      }
    } else {
      console.error('\n❌ Google API returned an error response:');
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('\n❌ Network error while attempting to connect to Google API:', err.message);
  }
}

checkKey();
