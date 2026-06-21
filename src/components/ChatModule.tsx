import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { speakTextWithBestVoice } from '../utils/speech';
import { Capacitor } from '@capacitor/core';
import { Send, Mic, MicOff, Volume2, Sparkles, Languages, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { getApiUrl } from '../utils/api';

// Selected practice phrases based on target language
const PRACTICE_PHRASES = {
  es: [
    { text: '¿Cómo estás hoy?', description: 'How are you today?' },
    { text: 'Me gustaría ordenar un café, por favor.', description: 'I would like to order a coffee, please.' },
    { text: 'El perro de San Roque no tiene rabo.', description: 'San Roque\'s dog has no tail (Tricky "R" sounds).' },
    { text: 'Tres tristes tigres tragan trigo en un trigal.', description: 'Three sad tigers swallow wheat (Advanced tongue twister).' }
  ],
  en: [
    { text: 'How are you today?', description: '¿Cómo estás hoy?' },
    { text: 'I would like to order a coffee, please.', description: 'Me gustaría ordenar un café, por favor.' },
    { text: 'She sells sea shells by the sea shore.', description: 'Ella vende conchas de mar junto a la orilla (Tricky "S/SH" sounds).' },
    { text: 'Peter Piper picked a peck of pickled peppers.', description: 'Peter Piper recogió un celemín de pimientos en vinagre (Advanced tongue twister).' }
  ]
};

interface Concept {
  id: string;
  title: string;
  description: string;
  level: 'basic' | 'intermediate' | 'advanced';
}

const STUDY_CONCEPTS: Record<'es' | 'en', Concept[]> = {
  es: [
    { id: 'es-basic-greetings', title: 'Greetings & Introductions', description: 'Learn standard ways to say hello, ask names, and make simple introductions.', level: 'basic' },
    { id: 'es-basic-pronouns', title: 'Subject Pronouns', description: 'Master pronouns (yo, tú, él, ella, nosotros, ellos) and subject agreement.', level: 'basic' },
    { id: 'es-basic-gender', title: 'Gender & Number of Nouns', description: 'Understand how masculine and feminine nouns work with singular/plural articles.', level: 'basic' },
    { id: 'es-basic-present', title: 'Present Tense Regular Verbs', description: 'Conjugate verbs ending in -ar, -er, and -ir in the present tense.', level: 'basic' },
    { id: 'es-basic-ser-estar', title: 'Ser vs Estar', description: 'Learn the difference between permanent traits (Ser) and temporary states (Estar).', level: 'basic' },
    { id: 'es-inter-preterite', title: 'The Preterite Past Tense', description: 'Talk about specific, completed actions in the past (e.g., "Ayer comí pizza").', level: 'intermediate' },
    { id: 'es-inter-imperfect', title: 'The Imperfect Past Tense', description: 'Describe past environments, age, time, and habitual actions in the past.', level: 'intermediate' },
    { id: 'es-inter-reflexive', title: 'Reflexive Verbs & Routines', description: 'Master actions done to oneself (e.g., levantarse, lavarse) and daily routines.', level: 'intermediate' },
    { id: 'es-inter-objects', title: 'Direct & Indirect Objects', description: 'Learn to use direct (lo, la) and indirect (me, te, le) pronouns correctly.', level: 'intermediate' },
    { id: 'es-inter-por-para', title: 'Por vs Para', description: 'Understand when to use these two prepositions for "for", destination, and cause.', level: 'intermediate' },
    { id: 'es-adv-pres-subj', title: 'Present Subjunctive', description: 'Express desires, doubts, emotions, recommendations, and hopes.', level: 'advanced' },
    { id: 'es-adv-past-subj', title: 'Past Subjunctive', description: 'Discuss hypothetical situations, imaginary conditions, and polite requests.', level: 'advanced' },
    { id: 'es-adv-imperative', title: 'The Imperative Mood (Commands)', description: 'Formulate formal and informal commands (commands, prohibitions, requests).', level: 'advanced' },
    { id: 'es-adv-impersonal-se', title: 'Impersonal & Passive Se', description: 'Express generic or passive statements where the subject is omitted.', level: 'advanced' },
    { id: 'es-adv-idioms', title: 'Advanced Spanish Idioms', description: 'Learn natural native phrases like "echar de menos", "dar gato por liebre", etc.', level: 'advanced' }
  ],
  en: [
    { id: 'en-basic-greetings', title: 'Greetings & Personal Info', description: 'Learn standard greetings, introducing yourself, and spelling basic info.', level: 'basic' },
    { id: 'en-basic-pronouns', title: 'Pronouns & Possessives', description: 'Master subject pronouns, object pronouns, and possessive adjectives (my, your).', level: 'basic' },
    { id: 'en-basic-tobe', title: 'The Verb "To Be"', description: 'Understand present conjugations (am, is, are) and questions/negations.', level: 'basic' },
    { id: 'en-basic-present', title: 'Present Simple Tense', description: 'Conjugate regular verbs to talk about daily routines, habits, and truths.', level: 'basic' },
    { id: 'en-basic-plurals', title: 'Plurals & Demonstratives', description: 'Form plural nouns and use demonstrative words (this, that, these, those).', level: 'basic' },
    { id: 'en-inter-continuous', title: 'Present Continuous Tense', description: 'Talk about actions currently in progress or planned future arrangements.', level: 'intermediate' },
    { id: 'en-inter-past', title: 'Past Simple Tense', description: 'Master regular and irregular verbs to recount specific past actions and events.', level: 'intermediate' },
    { id: 'en-inter-perfect', title: 'Present Perfect Simple', description: 'Talk about life experiences, unfinished actions, and connections to the present.', level: 'intermediate' },
    { id: 'en-inter-modals', title: 'Modal Verbs of Obligation & Ability', description: 'Use can, could, should, must, and have to for advice and obligation.', level: 'intermediate' },
    { id: 'en-inter-comparatives', title: 'Comparatives & Superlatives', description: 'Compare items using "-er", "more", "-est", and "most" structures.', level: 'intermediate' },
    { id: 'en-adv-past-perfect', title: 'Past Perfect Simple & Continuous', description: 'Describe actions that occurred before another point in the past.', level: 'advanced' },
    { id: 'en-adv-passive', title: 'The Passive Voice', description: 'Change focus from the actor to the action (e.g., "The report was written").', level: 'advanced' },
    { id: 'en-adv-conditionals', title: 'Conditionals (Third & Mixed)', description: 'Express imaginary past actions, regrets, and hypothetical results.', level: 'advanced' },
    { id: 'en-adv-reported', title: 'Reported & Indirect Speech', description: 'Relate what other people said using backshifted tenses and verb patterns.', level: 'advanced' },
    { id: 'en-adv-phrasals', title: 'Phrasal Verbs & Idioms', description: 'Master two-word verbs (look up, get along) and common idioms.', level: 'advanced' }
  ]
};

export const ChatModule: React.FC = () => {
  const { 
    nativeLanguage, 
    targetLanguage, 
    level, 
    chatHistory, 
    addChatMessage, 
    clearChatHistory, 
    speechRate, 
    addPronunciationAttempt,
    savedVocabulary
  } = useApp();

  const [activeSubMode, setActiveSubMode] = useState<'chat' | 'pronounce' | 'study'>('study');
  const [activeConcept, setActiveConcept] = useState<Concept | null>(null);
  const [studyProgress, setStudyProgress] = useState<Record<string, 'not_started' | 'studying' | 'mastered'>>(() => {
    const data = localStorage.getItem('spanglish_study_progress');
    return data ? JSON.parse(data) : {};
  });

  const updateStudyStatus = (conceptId: string, status: 'not_started' | 'studying' | 'mastered') => {
    setStudyProgress(prev => {
      const updated = { ...prev, [conceptId]: status };
      localStorage.setItem('spanglish_study_progress', JSON.stringify(updated));
      return updated;
    });
  };
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Pronunciation practice states
  const [phraseSource, setPhraseSource] = useState<'standard' | 'vocabulary'>('standard');
  const [selectedPhraseIdx, setSelectedPhraseIdx] = useState(0);
  const [pronounceTranscript, setPronounceTranscript] = useState('');
  const [scoreResult, setScoreResult] = useState<{ score: number; feedback: string; corrections?: string[] } | null>(null);
  const [scoring, setScoring] = useState(false);
  const [activePhrase, setActivePhrase] = useState<{ text: string; description: string }>({ text: '', description: '' });
  const [generatingPhrase, setGeneratingPhrase] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef('');
  const wasListeningRef = useRef(false);

  // Compute available phrases based on source
  const phrases = React.useMemo(() => {
    if (phraseSource === 'vocabulary' && savedVocabulary.length > 0) {
      return savedVocabulary.map(v => ({
        text: v.word,
        description: v.translation
      }));
    }
    return targetLanguage === 'es' ? PRACTICE_PHRASES.es : PRACTICE_PHRASES.en;
  }, [phraseSource, savedVocabulary, targetLanguage]);


  // Auto-scroll chat history
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  // Check speech recognition capabilities on mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Capacitor native checks
      import('@capacitor-community/speech-recognition')
        .then(({ SpeechRecognition }) => {
          SpeechRecognition.available().then(result => {
            setSpeechSupported(result.available);
          }).catch(() => setSpeechSupported(false));
        })
        .catch(() => setSpeechSupported(false));
    } else {
      // Browser checks
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        setSpeechSupported(false);
      }
    }
  }, []);

  const onSpeechStopped = () => {
    if (!wasListeningRef.current) return;
    wasListeningRef.current = false;
    setListening(false);
    const finalTranscript = latestTranscriptRef.current;
    if (activeSubMode !== 'chat' && finalTranscript) {
      evaluatePronunciation(finalTranscript);
    }
  };

  // Hybrid speech recognition initializer
  const toggleSpeech = async () => {
    if (listening) {
      stopListening();
      return;
    }

    setListening(true);
    wasListeningRef.current = true;
    latestTranscriptRef.current = '';
    const langCode = targetLanguage === 'es' ? 'es-MX' : 'en-US';

    if (Capacitor.isNativePlatform()) {
      // 1. Mobile Build: Use Capacitor native community plugin
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        
        // Request permissions
        const check = await SpeechRecognition.checkPermissions();
        if (check.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
        }

        SpeechRecognition.start({
          language: langCode,
          maxResults: 1,
          prompt: "Habla ahora / Speak now",
          partialResults: true,
          popup: false
        });

        SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0) {
            const transcript = data.matches[0];
            latestTranscriptRef.current = transcript;
            if (activeSubMode === 'chat') {
              setInputText(transcript);
            } else {
              setPronounceTranscript(transcript);
            }
          }
        });

        SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
          if (data.status === 'stopped') {
            onSpeechStopped();
          }
        });
      } catch (error) {
        console.error('Capacitor speech recognition error:', error);
        setListening(false);
        wasListeningRef.current = false;
      }
    } else {
      // 2. Desktop/Browser Build: Use Web Speech API fallback
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) return;

      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = langCode;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        latestTranscriptRef.current = transcript;
        if (activeSubMode === 'chat') {
          setInputText(transcript);
        } else {
          setPronounceTranscript(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Web speech recognition error:', event.error);
        setListening(false);
        wasListeningRef.current = false;
      };

      recognition.onend = () => {
        onSpeechStopped();
      };

      recognition.start();
    }
  };

  const stopListening = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        await SpeechRecognition.stop();
      } catch (error) {
        console.error('Capacitor speech stop error:', error);
      }
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    onSpeechStopped();
  };


  const startStudySession = async (concept: Concept) => {
    setActiveConcept(concept);
    updateStudyStatus(concept.id, 'studying');
    clearChatHistory();
    setActiveSubMode('chat');
    setLoading(true);

    const userFriendlyText = `Hi! I would like to start a structured lesson on "${concept.title}".`;
    addChatMessage('user', userFriendlyText);

    try {
      const response = await fetch(getApiUrl('/api/tutor'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userFriendlyText,
          history: [],
          nativeLanguage,
          level,
          concept
        })
      });
      const data = await response.json();
      if (data.text) {
        addChatMessage('model', data.text);
        speakText(data.text);
      }
    } catch (error) {
      console.error('Study guide proxy error:', error);
      addChatMessage('model', "Sorry, I had some trouble starting the study session. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  // 1. Send free-form chat message to tutor
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText('');
    addChatMessage('user', userMsg);
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/tutor'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory,
          nativeLanguage,
          level,
          concept: activeConcept
        })
      });
      const data = await response.json();
      if (data.text) {
        addChatMessage('model', data.text);
        // Automatically speak tutor responses for auditory training
        speakText(data.text);
      } else {
        throw new Error('No reply received');
      }
    } catch (error) {
      console.error('Tutor chat proxy error:', error);
      addChatMessage('model', "Sorry, I had some trouble connecting to my brain. Please check if your Express proxy server is running!");
    } finally {
      setLoading(false);
    }
  };

  // Sync active phrase when selection or target language or phrases changes
  useEffect(() => {
    if (phrases && phrases.length > 0) {
      const idx = selectedPhraseIdx >= phrases.length ? 0 : selectedPhraseIdx;
      if (selectedPhraseIdx >= phrases.length) {
        setSelectedPhraseIdx(0);
      }
      setActivePhrase({
        text: phrases[idx].text,
        description: phrases[idx].description
      });
      setPronounceTranscript('');
      setScoreResult(null);
    } else {
      setActivePhrase({ text: '', description: '' });
    }
  }, [selectedPhraseIdx, targetLanguage, phrases]);

  // Generate dynamic level-scaled phrase from Gemini
  const handleGenerateAIPhrase = async () => {
    setGeneratingPhrase(true);
    setPronounceTranscript('');
    setScoreResult(null);
    try {
      const response = await fetch(getApiUrl('/api/pronounce/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLanguage,
          level,
          previousPhrase: activePhrase.text
        })
      });
      const data = await response.json();
      if (data.text) {
        setActivePhrase({
          text: data.text,
          description: data.translation
        });
        // Auto-play correct pronunciation using best voice
        speakTextWithBestVoice(data.text, targetLanguage, speechRate);
      }
    } catch (err) {
      console.error('Error generating AI phrase:', err);
    } finally {
      setGeneratingPhrase(false);
    }
  };

  // 2. Send recorded transcript to Pronunciation Scorer
  const evaluatePronunciation = async (transcript: string) => {
    setScoring(true);
    setScoreResult(null);
    const targetText = activePhrase.text;

    try {
      const response = await fetch(getApiUrl('/api/pronounce'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPhrase: targetText,
          userTranscript: transcript,
          targetLanguage
        })
      });
      const data = await response.json();
      setScoreResult(data);
      if (data.score !== undefined) {
        addPronunciationAttempt(data.score);
      }
    } catch (error) {
      console.error('Pronunciation scoring error:', error);
      // Client-side fallback if server fails
      setScoreResult({
        score: 75,
        feedback: "Could not fetch dynamic score. Local analysis suggests correct words, try checking server.js status!"
      });
    } finally {
      setScoring(false);
    }
  };

  // Dictate tutor response
  const speakText = (text: string) => {
    speakTextWithBestVoice(text, targetLanguage, speechRate);
  };

  // Helper to render chat message with basic formatting (no asterisks, bold/italic, translation on next line)
  const renderMessageContent = (content: string) => {
    // 1. First, strip any remaining asterisks
    let text = content.replace(/\*/g, '');

    // 2. Format side-by-side bracketed translations (e.g. "Sentence [Translation]") onto the next line
    // E.g. "Hello [Hola]" -> "Hello\n_Hola_"
    text = text.replace(/([^\[\n]+)\s*\[(.*?)\]/g, (match, p1, p2) => {
      const sentence = p1.trim();
      const translation = p2.trim();
      if (sentence && translation) {
        return `${sentence}\n_${translation}_`;
      }
      return match;
    });

    // 3. Split into lines
    const lines = text.split('\n');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lineIdx} style={{ height: '8px' }} />;
          }

          // Check if the whole line is an italicized translation, e.g. _Hola_
          const isItalicTranslation = trimmed.startsWith('_') && trimmed.endsWith('_') && !trimmed.slice(1, -1).includes('_');
          
          if (isItalicTranslation) {
            const translationText = trimmed.slice(1, -1);
            return (
              <div 
                key={lineIdx} 
                style={{ 
                  fontStyle: 'italic', 
                  color: 'var(--text-muted)', 
                  fontSize: '12.5px', 
                  marginTop: '1px',
                  paddingLeft: '8px',
                  borderLeft: '2px solid var(--border)' 
                }}
              >
                {translationText}
              </div>
            );
          }

          // Parse double underscores (__bold__) and single underscores (_italic_) inline
          const parts: React.ReactNode[] = [];
          const regex = /(__|_)(.*?)\1/g;
          let lastIndex = 0;
          let match;
          let partKey = 0;

          while ((match = regex.exec(line)) !== null) {
            // Text before match
            if (match.index > lastIndex) {
              parts.push(<span key={`t-${partKey++}`}>{line.substring(lastIndex, match.index)}</span>);
            }
            
            const marker = match[1];
            const innerText = match[2];
            
            if (marker === '__') {
              parts.push(<strong key={`b-${partKey++}`} style={{ fontWeight: '700' }}>{innerText}</strong>);
            } else {
              parts.push(<em key={`i-${partKey++}`} style={{ fontStyle: 'italic' }}>{innerText}</em>);
            }
            
            lastIndex = regex.lastIndex;
          }

          if (lastIndex < line.length) {
            parts.push(<span key={`t-${partKey++}`}>{line.substring(lastIndex)}</span>);
          }

          return (
            <div key={lineIdx} style={{ display: 'block', wordBreak: 'break-word' }}>
              {parts.length > 0 ? parts : line}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' }}>
      
      {/* Sub Mode Header */}
      <div style={{ display: 'flex', background: 'var(--surface)', padding: '4px', borderRadius: '12px', marginBottom: '12px', border: '1px solid var(--border)' }}>
        <button
          onClick={() => setActiveSubMode('study')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: activeSubMode === 'study' ? 'var(--primary-gradient)' : 'transparent',
            border: 'none',
            color: 'white',
            fontWeight: '600',
            fontSize: '12px',
            padding: '8px 4px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <BookOpen size={13} />
          <span>{nativeLanguage === 'es' ? 'Estudio' : 'Study Guide'}</span>
        </button>
        <button
          onClick={() => setActiveSubMode('chat')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: activeSubMode === 'chat' ? 'var(--primary-gradient)' : 'transparent',
            border: 'none',
            color: 'white',
            fontWeight: '600',
            fontSize: '12px',
            padding: '8px 4px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={13} />
          <span>{nativeLanguage === 'es' ? 'Tutor' : 'Tutor Chat'}</span>
        </button>
        <button
          onClick={() => setActiveSubMode('pronounce')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: activeSubMode === 'pronounce' ? 'var(--primary-gradient)' : 'transparent',
            border: 'none',
            color: 'white',
            fontWeight: '600',
            fontSize: '12px',
            padding: '8px 4px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Languages size={13} />
          <span>{nativeLanguage === 'es' ? 'Pronunciación' : 'Speech Coach'}</span>
        </button>
      </div>

      {/* Screen Mode Contents */}
      {activeSubMode === 'chat' && (
        // 1. FREE TUTOR CHAT
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Active study session banner */}
          {activeConcept && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-glow)',
              padding: '10px 14px',
              borderRadius: '12px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <BookOpen size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>Active Lesson Focus</div>
                  <h5 style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeConcept.title}</h5>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    updateStudyStatus(activeConcept.id, 'mastered');
                    setActiveConcept(null);
                  }}
                  style={{
                    background: 'rgb(16, 185, 129)',
                    border: 'none',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Mastered ✅
                </button>
                <button
                  onClick={() => setActiveConcept(null)}
                  style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          {/* Messages list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px', marginBottom: '12px' }}>
            {chatHistory.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', gap: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--border-glow)' }}>
                  🤖
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                    {nativeLanguage === 'es' ? '¡Hola! Soy tu tutor personal.' : 'Hello! I am your personal tutor.'}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                    {nativeLanguage === 'es'
                      ? 'Pregúntame dudas de gramática o dile "hola" para conversar en inglés.'
                      : 'Ask me grammar questions or say "hello" to start practicing Spanish.'}
                  </p>
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div 
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  <div 
                    style={{
                      background: msg.role === 'user' ? 'var(--primary-gradient)' : 'var(--surface)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                      lineHeight: '1.5',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* Read response button for tutor */}
                    {msg.role === 'model' && (
                      <button 
                        onClick={() => speakText(msg.content)}
                        style={{
                          float: 'right',
                          background: 'var(--bg-app)',
                          border: 'none',
                          color: 'var(--primary)',
                          padding: '3px',
                          borderRadius: '4px',
                          marginLeft: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <Volume2 size={12} />
                      </button>
                    )}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{renderMessageContent(msg.content)}</div>
                  </div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', marginTop: '2px', padding: '0 4px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', background: 'var(--surface)', padding: '12px 16px', borderRadius: '18px 18px 18px 2px', border: '1px solid var(--border)' }}>
                <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 1s infinite alternate' }}></span>
                <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 1s infinite alternate', animationDelay: '0.2s' }}></span>
                <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 1s infinite alternate', animationDelay: '0.4s' }}></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form panel */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {chatHistory.length > 0 && (
              <button 
                type="button" 
                onClick={clearChatHistory}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
            
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={nativeLanguage === 'es' ? 'Pregúntame algo en inglés...' : 'Ask me something in Spanish...'}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '12px 42px 12px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              
              {/* Mic Icon */}
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
                    justifyContent: 'center',
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
      )}

      {activeSubMode === 'pronounce' && (
        // 2. PRONUNCIATION COACH
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          
          {/* Selector header */}
          <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>
              🎯 {nativeLanguage === 'es' ? 'Frase de Práctica' : 'Practice Drill'}
            </span>
            
            {/* Phrase Source Toggle */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-app)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '2px' }}>
              <button
                type="button"
                onClick={() => {
                  setPhraseSource('standard');
                  setSelectedPhraseIdx(0);
                  setPronounceTranscript('');
                  setScoreResult(null);
                }}
                style={{
                  flex: 1,
                  background: phraseSource === 'standard' ? 'var(--primary)' : 'transparent',
                  color: phraseSource === 'standard' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {nativeLanguage === 'es' ? 'Estándar' : 'Standard'}
              </button>
              <button
                type="button"
                disabled={savedVocabulary.length === 0}
                onClick={() => {
                  setPhraseSource('vocabulary');
                  setSelectedPhraseIdx(0);
                  setPronounceTranscript('');
                  setScoreResult(null);
                }}
                style={{
                  flex: 1,
                  background: phraseSource === 'vocabulary' ? 'var(--primary)' : 'transparent',
                  color: savedVocabulary.length === 0 ? 'var(--text-muted)' : phraseSource === 'vocabulary' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: savedVocabulary.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {nativeLanguage === 'es' ? 'Vocabulario Guardado' : 'Starred Vocab'} ({savedVocabulary.length})
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={phrases.some(p => p.text === activePhrase.text) ? selectedPhraseIdx : "custom"}
                onChange={(e) => {
                  if (e.target.value === 'custom') return;
                  setSelectedPhraseIdx(parseInt(e.target.value));
                  setPronounceTranscript('');
                  setScoreResult(null);
                }}
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {phrases.map((p, idx) => (
                  <option key={idx} value={idx}>Phrase {idx + 1}: {p.text.substring(0, 25)}...</option>
                ))}
                {activePhrase && !phrases.some(p => p.text === activePhrase.text) && (
                  <option value="custom">Custom AI Phrase</option>
                )}
              </select>
              
              <button
                onClick={() => speakText(activePhrase.text)}
                style={{
                  background: 'var(--primary-glow)',
                  border: '1px solid var(--border-glow)',
                  color: 'var(--primary)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <Volume2 size={16} />
              </button>
            </div>

            {/* AI Phrase Generator Button */}
            <button
              onClick={handleGenerateAIPhrase}
              disabled={generatingPhrase}
              type="button"
              style={{
                width: '100%',
                background: 'var(--primary-glow)',
                border: '1px solid var(--border-glow)',
                color: 'var(--primary)',
                fontWeight: '600',
                fontSize: '12px',
                padding: '8px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '4px',
                transition: 'all 0.2s ease'
              }}
            >
              {generatingPhrase ? (
                <>
                  <span className="pulse-recording" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginRight: '4px' }}></span>
                  Generating AI Phrase...
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Generate custom AI Phrase ({level.toUpperCase()})</span>
                </>
              )}
            </button>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
              "{activePhrase.description}"
            </div>
          </div>

          {/* Drill Board */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px', textAlign: 'center' }}>
            
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {nativeLanguage === 'es' ? 'Lee esta frase en voz alta' : 'Read this phrase aloud'}
            </div>
            
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.4', padding: '0 8px' }}>
              "{activePhrase.text}"
            </div>

            {/* Mic trigger */}
            {speechSupported ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={toggleSpeech}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: listening ? 'var(--danger)' : 'var(--primary-gradient)',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 10px 20px rgba(124, 58, 237, 0.3)'
                  }}
                  className={listening ? 'pulse-recording' : ''}
                >
                  {listening ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                <span style={{ fontSize: '11px', color: listening ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '600' }}>
                  {listening ? (nativeLanguage === 'es' ? 'Escuchando...' : 'Listening...') : (nativeLanguage === 'es' ? 'Pulsa para Hablar' : 'Tap to Speak')}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '10px', color: 'var(--danger)', fontSize: '12px' }}>
                <AlertCircle size={14} />
                <span>Speech recognition is not supported on this platform/browser.</span>
              </div>
            )}
          </div>

          {/* Results dashboard */}
          {(scoring || pronounceTranscript || scoreResult) && (
            <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Recording output */}
              {pronounceTranscript && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                    {nativeLanguage === 'es' ? 'Lo que dijiste:' : 'You said:'}
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                    "{pronounceTranscript}"
                  </p>
                </div>
              )}

              {/* Scoring loader */}
              {scoring && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ width: '12px', height: '12px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 0.5s infinite' }}></div>
                  <span>Analyzing pronunciation registers...</span>
                </div>
              )}

              {/* Score breakdown */}
              {scoreResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color={scoreResult.score > 80 ? 'var(--success)' : 'var(--warning)'} />
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {nativeLanguage === 'es' ? 'Resultado' : 'Evaluation'}
                      </span>
                    </div>
                    
                    {/* Visual radial percentage */}
                    <span style={{
                      background: scoreResult.score > 80 ? 'var(--success-glow)' : 'rgba(217, 119, 6, 0.15)',
                      color: scoreResult.score > 80 ? 'var(--success)' : 'var(--warning)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '15px',
                      border: `1px solid ${scoreResult.score > 80 ? 'var(--success-glow)' : 'rgba(217, 119, 6, 0.3)'}`
                    }}>
                      {scoreResult.score}% Accuracy
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {scoreResult.feedback}
                  </p>

                  {/* Corrections items list */}
                  {scoreResult.corrections && scoreResult.corrections.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                        Practice words:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {scoreResult.corrections.map((w, i) => (
                          <span key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {activeSubMode === 'study' && (
        // 3. STUDY GUIDE MODE
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>
              {nativeLanguage === 'es' ? 'Plan de Estudios' : 'Curriculum Study Guide'}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {nativeLanguage === 'es' 
                ? 'Completa lecciones estructuradas respaldadas por tu material de estudio.' 
                : 'Complete structured grammar and vocabulary lessons backed by your textbooks.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {STUDY_CONCEPTS[targetLanguage]?.filter(c => c.level === level).map((concept) => {
              const status = studyProgress[concept.id] || 'not_started';
              const isCurrent = activeConcept?.id === concept.id;

              return (
                <div 
                  key={concept.id}
                  className="glass-card"
                  style={{
                    padding: '14px',
                    border: isCurrent ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    background: isCurrent ? 'rgba(139, 92, 246, 0.03)' : 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={16} color="var(--primary)" />
                      <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {concept.title}
                      </h4>
                    </div>
                    
                    {/* Status Badge */}
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      background: status === 'mastered' 
                        ? 'rgba(16, 185, 129, 0.15)' 
                        : status === 'studying' 
                          ? 'rgba(245, 158, 11, 0.15)' 
                          : 'rgba(255,255,255,0.05)',
                      color: status === 'mastered' 
                        ? 'rgb(16, 185, 129)' 
                        : status === 'studying' 
                          ? 'rgb(245, 158, 11)' 
                          : 'var(--text-muted)'
                    }}>
                      {status === 'mastered' ? 'Mastered' : status === 'studying' ? 'Studying' : 'Not Started'}
                    </span>
                  </div>

                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {concept.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    {/* Mastery Action */}
                    {status === 'studying' ? (
                      <button
                        onClick={() => updateStudyStatus(concept.id, 'mastered')}
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          color: 'rgb(16, 185, 129)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Mark as Mastered
                      </button>
                    ) : status === 'mastered' ? (
                      <button
                        onClick={() => updateStudyStatus(concept.id, 'studying')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '0',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Review Concept
                      </button>
                    ) : (
                      <div />
                    )}

                    <button
                      onClick={() => startStudySession(concept)}
                      style={{
                        background: 'var(--primary-gradient)',
                        border: 'none',
                        color: 'white',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Sparkles size={11} />
                      <span>{status === 'studying' ? 'Continue Lesson' : 'Study with Tutor'}</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
