import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { speakTextWithBestVoice } from '../utils/speech';
import { lookupLocalDictionary } from '../utils/localDictionary';
import { Capacitor } from '@capacitor/core';
import { 
  Languages, Mic, MicOff, Volume2, Send, 
  Trash2, ArrowRightLeft 
} from 'lucide-react';

const ENGLISH_TRIGGERS = ['the', 'and', 'of', 'to', 'is', 'you', 'that', 'it', 'are', 'have', 'with', 'for', 'this', 'they'];
const SPANISH_TRIGGERS = ['el', 'la', 'los', 'las', 'de', 'que', 'en', 'un', 'una', 'y', 'es', 'son', 'con', 'por', 'para', 'este', 'esta'];

// Simple bilingual stop-word detection helper
function autoDetectLanguage(text: string): 'en' | 'es' {
  const words = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g,"").split(/\s+/);
  let enCount = 0;
  let esCount = 0;
  for (const w of words) {
    if (ENGLISH_TRIGGERS.includes(w)) enCount++;
    if (SPANISH_TRIGGERS.includes(w)) esCount++;
  }
  if (enCount > esCount) return 'en';
  if (esCount > enCount) return 'es';
  // Default to Spanish if ambiguous, or check general settings
  return 'es';
}

interface TranslationHistoryItem {
  id: string;
  originalText: string;
  translatedText: string;
  fromLang: 'en' | 'es';
  toLang: 'en' | 'es';
  timestamp: number;
}

export const TranslatorModule: React.FC = () => {
  const { nativeLanguage, speechRate } = useApp();

  const [inputText, setInputText] = useState('');
  const [fromLanguage, setFromLanguage] = useState<'en' | 'es'>('es');
  const [toLanguage, setToLanguage] = useState<'en' | 'es'>('en');
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice input states
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Translation history list
  const [history, setHistory] = useState<TranslationHistoryItem[]>(() => {
    const data = localStorage.getItem('spanglish_translate_history');
    return data ? JSON.parse(data) : [];
  });

  const recognitionRef = useRef<any>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Check speech recognition support
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor-community/speech-recognition')
        .then(({ SpeechRecognition }) => {
          SpeechRecognition.available().then(result => {
            setSpeechSupported(result.available);
          }).catch(() => setSpeechSupported(false));
        })
        .catch(() => setSpeechSupported(false));
    } else {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Swaps languages manually
  const handleSwapLanguages = () => {
    const temp = fromLanguage;
    setFromLanguage(toLanguage);
    setToLanguage(temp);
  };

  // Perform MyMemory Translation with Email Param
  const handleTranslate = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    
    const textToTranslate = (customText || inputText).trim();
    if (!textToTranslate) return;

    setIsLoading(true);

    // 1. Auto detect language if it's longer than a few characters
    let detectedFrom = fromLanguage;
    if (!customText) { // only autodetect on typing
      detectedFrom = autoDetectLanguage(textToTranslate);
      setFromLanguage(detectedFrom);
      setToLanguage(detectedFrom === 'es' ? 'en' : 'es');
    }
    const detectedTo = detectedFrom === 'es' ? 'en' : 'es';

    // 2. Offline lookup check first
    const queryWord = textToTranslate.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g,"").trim();
    const localMatch = lookupLocalDictionary(queryWord);

    if (localMatch) {
      const newHistoryItem: TranslationHistoryItem = {
        id: crypto.randomUUID(),
        originalText: textToTranslate,
        translatedText: localMatch,
        fromLang: detectedFrom,
        toLang: detectedTo,
        timestamp: Date.now()
      };
      
      setHistory(prev => {
        const updated = [...prev, newHistoryItem];
        localStorage.setItem('spanglish_translate_history', JSON.stringify(updated));
        return updated;
      });
      setInputText('');
      setIsLoading(false);
      
      // Auto-play translation
      speakTextWithBestVoice(localMatch, detectedTo, speechRate);
      return;
    }

    // 3. Fallback to MyMemory translation API
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${detectedFrom}|${detectedTo}&de=19515@gmail.com`;
      const response = await fetch(myMemoryUrl);
      if (!response.ok) throw new Error('Network response error');

      const data = await response.json();
      const translation = data?.responseData?.translatedText;

      if (translation && !translation.toLowerCase().includes('mymemory warning')) {
        const newHistoryItem: TranslationHistoryItem = {
          id: crypto.randomUUID(),
          originalText: textToTranslate,
          translatedText: translation,
          fromLang: detectedFrom,
          toLang: detectedTo,
          timestamp: Date.now()
        };

        setHistory(prev => {
          const updated = [...prev, newHistoryItem];
          localStorage.setItem('spanglish_translate_history', JSON.stringify(updated));
          return updated;
        });
        setInputText('');

        // Auto-play translation
        speakTextWithBestVoice(translation, detectedTo, speechRate);
      } else {
        throw new Error('Invalid translation value');
      }
    } catch (err) {
      console.error('Translator failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Dictation input triggers
  const toggleSpeech = async () => {
    if (listening) {
      stopListening();
      return;
    }

    setListening(true);
    const langCode = fromLanguage === 'es' ? 'es-MX' : 'en-US';

    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const check = await SpeechRecognition.checkPermissions();
        if (check.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
        }

        SpeechRecognition.start({
          language: langCode,
          maxResults: 1,
          prompt: "Habla ahora / Speak now",
          partialResults: false,
          popup: true
        });

        SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0) {
            handleSpeechTranscript(data.matches[0]);
          }
        });
      } catch (error) {
        console.error('Capacitor speech recognition error:', error);
        setListening(false);
      }
    } else {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) return;

      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = langCode;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSpeechTranscript(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Web speech recognition error:', event.error);
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
    }
  };

  const stopListening = () => {
    setListening(false);
    if (!Capacitor.isNativePlatform() && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleSpeechTranscript = (transcript: string) => {
    setListening(false);
    setInputText(transcript);
    // Auto translate recorded voice right away
    handleTranslate(undefined, transcript);
  };

  const handleSpeakText = (text: string, lang: 'en' | 'es') => {
    speakTextWithBestVoice(text, lang, speechRate);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('spanglish_translate_history');
  };

  return (
    <div className="animate-slide-up" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Languages style={{ color: 'var(--primary)' }} />
            <span>{nativeLanguage === 'es' ? 'Traductor de Amigos' : 'Friend Translator'}</span>
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {nativeLanguage === 'es' ? 'Habla con tus amigos cara a cara' : 'Translate chats with friends instantly'}
          </p>
        </div>
      </div>

      {/* Language Selector Bar */}
      <div className="glass-card" style={{ 
        padding: '10px 14px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
            {nativeLanguage === 'es' ? 'Desde' : 'From'}
          </span>
          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
            {fromLanguage === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
          </span>
        </div>

        <button 
          onClick={handleSwapLanguages}
          className="icon-button"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '8px',
            borderRadius: '50%',
            color: 'var(--primary)',
            cursor: 'pointer'
          }}
        >
          <ArrowRightLeft size={16} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
            {nativeLanguage === 'es' ? 'Hacia' : 'To'}
          </span>
          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
            {toLanguage === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
          </span>
        </div>
      </div>

      {/* History Chat Logs */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        padding: '4px',
        marginBottom: '16px'
      }}>
        {history.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'var(--text-muted)',
            gap: '12px',
            padding: '24px'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              💬
            </div>
            <div>
              <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '700' }}>
                {nativeLanguage === 'es' ? 'Traductor de Conversaciones' : 'Conversation Translator'}
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4', maxWidth: '280px' }}>
                {nativeLanguage === 'es'
                  ? 'Escribe o presiona el micrófono para hablar. El traductor detecta automáticamente tu idioma.'
                  : 'Type or tap the mic to speak. The app automatically detects which language you used.'}
              </p>
            </div>
          </div>
        ) : (
          history.map(item => (
            <div 
              key={item.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: item.fromLang === 'es' ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                gap: '4px'
              }}
            >
              {/* Bubble */}
              <div style={{
                background: item.fromLang === 'es' ? 'var(--surface)' : 'var(--primary-gradient)',
                border: item.fromLang === 'es' ? '1px solid var(--border)' : 'none',
                color: 'white',
                padding: '10px 14px',
                borderRadius: item.fromLang === 'es' ? '16px 16px 16px 2px' : '16px 16px 2px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {/* Original phrase */}
                <div style={{ 
                  fontSize: '12px', 
                  color: item.fromLang === 'es' ? 'var(--text-secondary)' : 'rgba(255,255,255,0.7)',
                  borderBottom: `1px solid ${item.fromLang === 'es' ? 'var(--border)' : 'rgba(255,255,255,0.15)'}`,
                  paddingBottom: '4px',
                  marginBottom: '4px'
                }}>
                  {item.originalText}
                </div>
                
                {/* Translation phrase */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.translatedText}</span>
                  <button 
                    onClick={() => handleSpeakText(item.translatedText, item.toLang)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: 'var(--primary)',
                      padding: '4px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Volume2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', background: 'var(--surface)', padding: '10px 14px', borderRadius: '16px 16px 16px 2px', border: '1px solid var(--border)' }}>
            <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 1s infinite alternate' }}></span>
            <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 1s infinite alternate', animationDelay: '0.2s' }}></span>
            <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 1s infinite alternate', animationDelay: '0.4s' }}></span>
          </div>
        )}
        <div ref={historyEndRef} />
      </div>

      {/* Input panel */}
      <form onSubmit={(e) => handleTranslate(e)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {history.length > 0 && (
          <button 
            type="button" 
            onClick={clearHistory}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '12px',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={15} />
          </button>
        )}
        
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              fromLanguage === 'es' 
                ? (nativeLanguage === 'es' ? 'Escribe o habla en español...' : 'Type or speak in Spanish...')
                : (nativeLanguage === 'es' ? 'Escribe o habla en inglés...' : 'Type or speak in English...')
            }
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '12px 42px 12px 14px',
              color: 'var(--text-primary)',
              fontSize: '13.5px',
              outline: 'none'
            }}
          />
          
          {/* Mic */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleSpeech}
              style={{
                position: 'absolute',
                right: '8px',
                background: listening ? 'var(--primary)' : 'transparent',
                border: 'none',
                borderRadius: '50%',
                color: listening ? 'white' : 'var(--primary)',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className={listening ? 'pulse-recording' : ''}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!inputText.trim()}
          style={{
            background: 'var(--primary-gradient)',
            border: 'none',
            color: 'white',
            padding: '12px',
            borderRadius: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send size={16} />
        </button>
      </form>

    </div>
  );
};
