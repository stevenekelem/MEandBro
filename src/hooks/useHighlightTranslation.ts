import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { speakTextWithBestVoice } from '../utils/speech';
import { lookupLocalDictionary } from '../utils/localDictionary';
import { getApiUrl } from '../utils/api';

const ENGLISH_TRIGGERS = ['the', 'and', 'of', 'to', 'is', 'you', 'that', 'it', 'are', 'have', 'with', 'for', 'this', 'they'];
const SPANISH_TRIGGERS = ['el', 'la', 'los', 'las', 'de', 'que', 'en', 'un', 'una', 'y', 'es', 'son', 'con', 'por', 'para', 'este', 'esta'];

function detectLanguage(text: string, targetLanguage: string): { from: string, to: string } {
  const words = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g,"").split(/\s+/);
  let enCount = 0;
  let esCount = 0;
  for (const w of words) {
    if (ENGLISH_TRIGGERS.includes(w)) enCount++;
    if (SPANISH_TRIGGERS.includes(w)) esCount++;
  }
  if (enCount > esCount) {
    return { from: 'en', to: 'es' };
  } else if (esCount > enCount) {
    return { from: 'es', to: 'en' };
  }
  return targetLanguage === 'es' ? { from: 'es', to: 'en' } : { from: 'en', to: 'es' };
}


// High-speed local dictionary for instant lookup of words in our pre-baked stories
const LOCAL_DICTIONARY: Record<string, string> = {
  // Spanish to English
  'selva': 'jungle / forest',
  'selvas': 'jungles / forests',
  'científicos': 'scientists',
  'enfermedades': 'illnesses / diseases',
  'estómago': 'stomach',
  'comienza': 'starts / begins',
  'libro': 'book',
  'libros': 'books',
  'gente': 'people',
  'parque': 'park',
  'feria': 'fair',
  'firmando': 'signing',
  'obras': 'works (literary)',
  'quijote': 'quixote',
  'lugar': 'place',
  'mancha': 'stain / spot (also a region in Spain)',
  'nombre': 'name',
  'acordarme': 'to remember',
  'vivido': 'lived',
  'hidalgo': 'nobleman / squire',
  'lanza': 'lance / spear',
  'astillero': 'shipyard / rack',
  'adarga': 'leather shield',
  'antigua': 'ancient / old',
  'rocín': 'nag / work horse',
  'flaco': 'skinny / thin',
  'galgo': 'greyhound',
  'corredor': 'runner / hunter',

  // English to Spanish
  'renewable': 'renovable',
  'desert': 'desierto',
  'grid': 'red eléctrica',
  'open-air': 'al aire libre',
  'audiences': 'espectadores / público',
  'booking': 'reservar / reserva',
  'hamlet': 'hamlet',
  'question': 'pregunta / cuestión',
  'noble': 'noble',
  'mind': 'mente',
  'suffer': 'sufrir',
  'slings': 'hondas / pedradas',
  'arrows': 'flechas',
  'outrageous': 'ultrajante / escandaloso',
  'fortune': 'fortuna / destino',
  'troubles': 'problemas / dificultades',
  'sleep': 'dormir / sueño',
  'dream': 'soñar / sueño',
  'shuffled': 'desprendido / barajado',
  'mortal': 'mortal',
  'coil': 'espiral / lazo (cuerpo mortal)',
  'respect': 'respeto / consideración',
  'calamity': 'calamidad',
  'life': 'vida'
};

export interface TranslationResult {
  text: string;
  translation: string;
  x: number;
  y: number;
  isOpen: boolean;
  isLoading: boolean;
}

export const useHighlightTranslation = () => {
  const { targetLanguage, speechRate, saveWord, incrementWordsTranslated } = useApp();
  const [result, setResult] = useState<TranslationResult>({
    text: '',
    translation: '',
    x: 0,
    y: 0,
    isOpen: false,
    isLoading: false,
  });

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // Don't close immediately to allow clicking inside bubble
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length > 150) {
      // Ignore long selections
      return;
    }

    // Find bounding rectangle of selection
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Calculate float bubble coords (centered above the selection)
      // Check if we are in simulator wrapper
      const simulator = document.querySelector('.screen-content');
      let x = rect.left + rect.width / 2;
      let y = rect.top - 10; // 10px above selection

      if (simulator) {
        const simRect = simulator.getBoundingClientRect();
        // Shift coords relative to simulator content window
        x = x - simRect.left;
        y = y - simRect.top + simulator.scrollTop;
      }

      setResult({
        text,
        translation: '',
        x,
        y,
        isOpen: true,
        isLoading: false,
      });
    } catch (e) {
      console.error('Error calculating selection range rect:', e);
    }
  }, []);

  const closeBubble = useCallback(() => {
    setResult(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Listen to selection changes
  useEffect(() => {
    document.addEventListener('mouseup', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
    };
  }, [handleSelection]);

  // Perform translation
  const translateText = async () => {
    if (!result.text) return;
    
    const queryWord = result.text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g,"").trim();
    
    // 1. Check local lookup dictionary first (both the large compiled map and module-specific words)
    const localMatch = lookupLocalDictionary(queryWord) || LOCAL_DICTIONARY[queryWord];
    if (localMatch) {
      setResult(prev => ({
        ...prev,
        translation: localMatch,
        isLoading: false
      }));
      saveWord(result.text, localMatch, 'Dictionary');
      incrementWordsTranslated();
      return;
    }

    setResult(prev => ({ ...prev, isLoading: true }));

    // 2. Fetch from MyMemory translation API (elevated free tier using email param)
    const { from, to } = detectLanguage(result.text, targetLanguage);
    const langpair = `${from}|${to}`;
    
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(result.text)}&langpair=${langpair}&de=19515@gmail.com`;
      const myMemoryResponse = await fetch(myMemoryUrl);
      if (!myMemoryResponse.ok) throw new Error('MyMemory API error');
      
      const myMemoryData = await myMemoryResponse.json();
      const translatedText = myMemoryData?.responseData?.translatedText;
      
      if (translatedText && !translatedText.toLowerCase().includes('mymemory warning')) {
        setResult(prev => ({
          ...prev,
          translation: translatedText,
          isLoading: false
        }));
        saveWord(result.text, translatedText, 'MyMemory');
        incrementWordsTranslated();
        return;
      }
      throw new Error('Invalid translation from MyMemory');
    } catch (myMemoryError) {
      console.warn('MyMemory fallback failed, trying Gemini...', myMemoryError);
      
      // 3. Fallback to Express backend proxy (Gemini API)
      try {
        const prompt = `Translate this phrase/word precisely from ${from === 'es' ? 'Spanish to English' : 'English to Spanish'}. Return ONLY the direct translation, no extra descriptions or sentences: "${result.text}"`;
        
        const response = await fetch(getApiUrl('/api/tutor'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            history: [],
            level: 'advanced',
            nativeLanguage: targetLanguage === 'es' ? 'es' : 'en'
          })
        });

        const data = await response.json();
        if (data.text) {
          const cleanTranslation = data.text.replace(/^["]|["]$/g, '').trim();
          setResult(prev => ({
            ...prev,
            translation: cleanTranslation,
            isLoading: false
          }));
          saveWord(result.text, cleanTranslation, 'Gemini');
          incrementWordsTranslated();
        } else {
          throw new Error('No translation text returned from Gemini');
        }
      } catch (geminiError) {
        console.error('Gemini translation fallback error:', geminiError);
        // Final fallback display
        setResult(prev => ({
          ...prev,
          translation: targetLanguage === 'es' ? '[Traducción no disponible]' : '[Translation unavailable]',
          isLoading: false
        }));
      }
    }
  };

  // Text-To-Speech
  const speakText = () => {
    if (!result.text) return;
    speakTextWithBestVoice(result.text, targetLanguage, speechRate);
  };

  return {
    result,
    translateText,
    speakText,
    closeBubble,
  };
};
