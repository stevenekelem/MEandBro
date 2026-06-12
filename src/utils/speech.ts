// Speech Synthesis Utilities for Spanglish

/**
 * Cleans text for Text-to-Speech by removing markdown formatting characters 
 * (like asterisks and underscores) and translation brackets.
 */
export const cleanTextForTTS = (text: string): string => {
  return text
    .replace(/[*_#`~]/g, '')    // Strip markdown formatting symbols
    .replace(/\[.*?\]/g, '')    // Strip bracketed translations
    .replace(/\s+/g, ' ')       // Normalize spaces
    .trim();
};

/**
 * Helper to detect if a given sentence/segment is Spanish.
 */
const isSegmentSpanish = (str: string): boolean => {
  // Check for Spanish-specific punctuation or accented letters
  if (/[áéíóúüñ¿¡ÁÉÍÓÚÜÑ]/.test(str)) {
    return true;
  }
  // Check for common Spanish function words
  const spanishWords = /\b(hola|estoy|feliz|ayudar|aprender|inglés|genial|para|empezar|vamos|practicar|saludos|básicos|repite|conmigo|cómo|sientes|hoy|intenta|responder|pregunta|tú|puedes|el|la|los|las|un|una|unos|unas|de|en|con|por|es|son|esta|este|esto|o|y|pero|si|no|sí|buenos|días|tardes|noches)\b/i;
  return spanishWords.test(str);
};

/**
 * Checks if a voice matches the desired language ('es' or 'en') using a multi-layered fallback strategy.
 */
const isVoiceLanguageMatch = (voice: SpeechSynthesisVoice, lang: 'es' | 'en'): boolean => {
  const vLang = voice.lang.toLowerCase();
  const vName = voice.name.toLowerCase();
  
  if (lang === 'es') {
    return (
      vLang.startsWith('es') ||
      vLang.startsWith('spa') ||
      vLang.includes('-es') ||
      vLang.includes('_es') ||
      vName.includes('spanish') ||
      vName.includes('español') ||
      vName.includes('castellano')
    );
  } else {
    return (
      vLang.startsWith('en') ||
      vLang.startsWith('eng') ||
      vLang.includes('-en') ||
      vLang.includes('_en') ||
      vName.includes('english') ||
      vName.includes('inglés')
    );
  }
};

/**
 * Pronounces text using the best available native voice for the target language.
 * Dynamically switches accents sentence-by-sentence for mixed bilingual responses.
 */
export const speakTextWithBestVoice = (
  text: string, 
  defaultTargetLanguage: 'en' | 'es', 
  speechRate: number
) => {
  try {
    // 1. Cancel any active speech
    window.speechSynthesis.cancel();
    
    // 2. Clean the input text of markdown and bracket translations
    const cleanedText = cleanTextForTTS(text);
    if (!cleanedText) return;

    // 3. Split the text into sentences (preserving punctuation)
    const rawSentences = cleanedText.split(/([.!?\n]+)/);
    
    // Reconstruct sentences with their delimiters
    const segments: string[] = [];
    for (let i = 0; i < rawSentences.length; i += 2) {
      const sentence = rawSentences[i];
      const delimiter = rawSentences[i + 1] || '';
      const fullSentence = (sentence + delimiter).trim();
      if (fullSentence) {
        segments.push(fullSentence);
      }
    }

    const voices = window.speechSynthesis.getVoices();
    console.log(`TTS: Found ${voices.length} voices in browser. Selecting best matches...`);

    // 4. Queue each sentence with its detected accent voice
    segments.forEach(segment => {
      // Skip empty or formatting remnants
      if (segment.replace(/[.!?\s-]/g, '').length === 0) return;

      // Detect language: Spanish or English
      const isSpanish = isSegmentSpanish(segment);
      const isNeutral = !/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(segment);
      const segmentLang: 'en' | 'es' = isNeutral ? defaultTargetLanguage : (isSpanish ? 'es' : 'en');

      const utterance = new SpeechSynthesisUtterance(segment);

      // Find best voice for this sentence's language
      let bestVoice: SpeechSynthesisVoice | null = null;
      
      // A. Google voice matching the language
      bestVoice = voices.find(v => 
        isVoiceLanguageMatch(v, segmentLang) && 
        v.name.toLowerCase().includes('google')
      ) || null;

      // B. Microsoft Natural / Neural voice matching the language
      if (!bestVoice) {
        bestVoice = voices.find(v => 
          isVoiceLanguageMatch(v, segmentLang) && 
          (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural'))
        ) || null;
      }

      // C. Fallback matching language using isVoiceLanguageMatch
      if (!bestVoice) {
        bestVoice = voices.find(v => isVoiceLanguageMatch(v, segmentLang)) || null;
      }

      // Apply settings to utterance
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
        console.log(`TTS Segment: "${segment}" -> Selected Voice: "${bestVoice.name}" (${bestVoice.lang})`);
      } else {
        utterance.lang = segmentLang === 'es' ? 'es-MX' : 'en-US';
        console.warn(`TTS Segment: "${segment}" -> No matching voice found. Using default browser fallback for: ${utterance.lang}`);
      }

      utterance.rate = speechRate;
      
      // Queue the speech
      window.speechSynthesis.speak(utterance);
    });

  } catch (error) {
    console.error('Bilingual Speech synthesis execution failed:', error);
  }
};

// Ensure voices are loaded asynchronously and triggered immediately
if (typeof window !== 'undefined' && window.speechSynthesis) {
  // Trigger loading immediately
  window.speechSynthesis.getVoices();
  
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
