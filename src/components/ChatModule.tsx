import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { speakTextWithBestVoice } from '../utils/speech';
import { Capacitor } from '@capacitor/core';
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  Languages, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Flag, 
  X,
  History,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Pin,
  Search,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
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
    conversations,
    activeConversationId,
    activeConversation,
    chatHistory, 
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    togglePinConversation,
    addChatMessage, 
    clearChatHistory, 
    speechRate, 
    addPronunciationAttempt,
    savedVocabulary,
    recordActivity,
    user
  } = useApp();

  const [activeSubMode, setActiveSubMode] = useState<'chat' | 'pronounce' | 'study'>('study');
  const [activeConcept, setActiveConcept] = useState<Concept | null>(null);
  
  // History Drawer & Conversation UI states
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [searchConvQuery, setSearchConvQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [activeMenuConvId, setActiveMenuConvId] = useState<string | null>(null);

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
  const [scoreResult, setScoreResult] = useState<{ 
    score: number; 
    feedback: string; 
    corrections?: string[]; 
    phoneticTips?: { word: string; ipa: string; tip: string }[] 
  } | null>(null);
  const [scoring, setScoring] = useState(false);
  const [activePhrase, setActivePhrase] = useState<{ text: string; description: string }>({ text: '', description: '' });
  const [generatingPhrase, setGeneratingPhrase] = useState(false);

  // Report AI Content modal state
  const [reportingMsg, setReportingMsg] = useState<any>(null);
  const [reportReason, setReportReason] = useState('Offensive or inappropriate content');
  const [reportComments, setReportComments] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const openReportModal = (msg: any) => {
    setReportingMsg(msg);
    setReportReason('Offensive or inappropriate content');
    setReportComments('');
    setReportSuccess(null);
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMsg) return;
    setSubmittingReport(true);
    try {
      const msgIndex = chatHistory.findIndex(m => m.id === reportingMsg.id);
      const prevUserMsg = msgIndex > 0 && chatHistory[msgIndex - 1].role === 'user' ? chatHistory[msgIndex - 1].content : '';

      const res = await fetch(getApiUrl('api/report-ai-content'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiResponse: reportingMsg.content,
          userText: prevUserMsg,
          reportReason,
          userComments: reportComments,
          userEmail: user?.email || ''
        })
      });
      if (res.ok) {
        setReportSuccess(nativeLanguage === 'es' ? '¡Gracias! La respuesta ha sido reportada.' : 'Thank you! The response has been reported for review.');
        setTimeout(() => {
          setReportingMsg(null);
          setReportSuccess(null);
        }, 1800);
      } else {
        alert('Failed to send report. Please try again.');
      }
    } catch (err) {
      console.error('Error reporting content:', err);
      alert('Error submitting report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef('');
  const wasListeningRef = useRef(false);
  const speechTimeoutRef = useRef<any>(null);
  const activeConversationIdRef = useRef(activeConversationId);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (err) { console.error('Error cleaning up speech recognition:', err); }
      }
    };
  }, []);

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
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

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

    // Abort and clean up any previous browser recognition instance if it exists
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.error('Error aborting previous recognition:', err);
      }
      recognitionRef.current = null;
    }

    setListening(true);
    wasListeningRef.current = true;
    latestTranscriptRef.current = '';
    const langCode = targetLanguage === 'es' ? 'es-MX' : 'en-US';

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    speechTimeoutRef.current = setTimeout(() => {
      console.log('Speech recognition timed out after 20 seconds');
      stopListening();
    }, 20000);

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
    setActiveSubMode('chat');

    // Look for existing session for this concept
    const existingConv = conversations.find(c => c.conceptId === concept.id);
    if (existingConv) {
      await selectConversation(existingConv.id);
      return;
    }

    // Create a dedicated lesson conversation thread
    const newTitle = `📚 ${concept.title}`;
    const newConvId = await createConversation(newTitle, 'lesson', concept.id);
    setLoading(true);

    const userFriendlyText = `Hi! I would like to start a structured lesson on "${concept.title}".`;
    await addChatMessage('user', userFriendlyText, newConvId);

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
        await addChatMessage('model', data.text, newConvId);
        speakText(data.text);
        recordActivity('tutor');
      }
    } catch (error) {
      console.error('Study guide proxy error:', error);
      await addChatMessage('model', "Sorry, I had some trouble starting the study session. Please try again!", newConvId);
    } finally {
      setLoading(false);
    }
  };

  // 1. Send free-form chat message to tutor
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || !inputText.trim()) return;

    const userMsg = inputText.trim();
    const conversationId = activeConversationIdRef.current || 'conv-default-1';
    const historyForRequest = [...chatHistory, { role: 'user', content: userMsg }];
    setInputText('');
    setLoading(true);
    await addChatMessage('user', userMsg, conversationId);

    try {
      const response = await fetch(getApiUrl('/api/tutor'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: historyForRequest,
          nativeLanguage,
          level,
          concept: activeConcept
        })
      });
      if (!response.ok) throw new Error(`Tutor request failed with status ${response.status}`);
      const data = await response.json();
      if (!data.text) throw new Error('No reply received');
      await addChatMessage('model', data.text, conversationId);
      // Automatically speak tutor responses for auditory training
      speakText(data.text);
      // Award tutor lesson activity score (+25 XP)
      recordActivity('tutor');
    } catch (error) {
      console.error('Tutor chat proxy error:', error);
      await addChatMessage('model', "Sorry, I had some trouble connecting to my brain. Please check if your Express proxy server is running!", conversationId);
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
          
          {/* Conversation Switcher Header Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '6px 10px',
            borderRadius: '12px',
            marginBottom: '10px',
            gap: '8px'
          }}>
            {/* Active conversation pill - Click to open drawer */}
            <button
              onClick={() => setShowHistoryDrawer(true)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                overflow: 'hidden',
                padding: '4px 6px',
                borderRadius: '8px',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: activeConversation?.type === 'lesson' 
                  ? 'rgba(168, 85, 247, 0.15)' 
                  : 'rgba(56, 189, 248, 0.15)',
                color: activeConversation?.type === 'lesson' ? '#c084fc' : '#38bdf8',
                flexShrink: 0
              }}>
                {activeConversation?.type === 'lesson' ? <BookOpen size={13} /> : <MessageSquare size={13} />}
              </div>

              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeConversation?.title || 'General Tutor Practice'}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  {chatHistory.length} {nativeLanguage === 'es' ? 'mensajes' : 'messages'} · {nativeLanguage === 'es' ? 'Toca para cambiar' : 'Tap to switch'}
                </div>
              </div>

              <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button
                onClick={() => createConversation()}
                title={nativeLanguage === 'es' ? 'Nueva conversación' : 'New Chat'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--primary-gradient)',
                  border: 'none',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                }}
              >
                <Plus size={13} />
                <span>{nativeLanguage === 'es' ? 'Nuevo' : 'New'}</span>
              </button>

              <button
                onClick={() => setShowHistoryDrawer(true)}
                title={nativeLanguage === 'es' ? 'Historial de chats' : 'Chat History'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <History size={14} />
              </button>
            </div>
          </div>
          
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
                    {/* Action buttons for tutor response (listen & report) */}
                    {msg.role === 'model' && (
                      <div style={{ float: 'right', display: 'flex', gap: '4px', marginLeft: '8px' }}>
                        <button 
                          onClick={() => speakText(msg.content)}
                          title={nativeLanguage === 'es' ? 'Escuchar' : 'Listen'}
                          style={{
                            background: 'var(--bg-app)',
                            border: 'none',
                            color: 'var(--primary)',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Volume2 size={12} />
                        </button>
                        <button 
                          onClick={() => openReportModal(msg)}
                          title={nativeLanguage === 'es' ? 'Reportar respuesta' : 'Report response'}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: 'var(--danger)',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}
                        >
                          <Flag size={10} />
                          <span>{nativeLanguage === 'es' ? 'Reportar' : 'Report'}</span>
                        </button>
                      </div>
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
                onClick={() => clearChatHistory()}
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.4', padding: '0 8px' }}>
                "{activePhrase.text}"
              </div>
              {activePhrase.description && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {activePhrase.description}
                </div>
              )}
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
                  {listening ? (nativeLanguage === 'es' ? 'Escuchando (máx 20s)...' : 'Listening (max 20s)...') : (nativeLanguage === 'es' ? 'Pulsa para Hablar' : 'Tap to Speak')}
                </span>
                
                {listening && (
                  <button
                    type="button"
                    onClick={stopListening}
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      padding: '8px 18px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
                    }}
                  >
                    <MicOff size={13} />
                    <span>{nativeLanguage === 'es' ? 'Terminar y Evaluar' : 'Stop & Evaluate'}</span>
                  </button>
                )}
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

                  {/* Phonetic tips */}
                  {scoreResult.phoneticTips && scoreResult.phoneticTips.length > 0 && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px', textAlign: 'left' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <Sparkles size={11} />
                        {nativeLanguage === 'es' ? 'Guía de Pronunciación Fonética:' : 'Phonetic Pronunciation Guide:'}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {scoreResult.phoneticTips.map((tipObj: any, idx: number) => (
                          <div 
                            key={idx} 
                            style={{ 
                              background: 'rgba(139, 92, 246, 0.03)', 
                              border: '1px solid var(--border)', 
                              padding: '8px 10px', 
                              borderRadius: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              <span style={{ fontWeight: '700', fontSize: '12.5px', color: 'var(--text-primary)' }}>{tipObj.word}</span>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--primary)', background: 'rgba(139, 92, 246, 0.08)', padding: '1px 6px', borderRadius: '4px' }}>
                                {tipObj.ipa}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                              {tipObj.tip}
                            </div>
                          </div>
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
                      <span>
                        {conversations.some(c => c.conceptId === concept.id)
                          ? (nativeLanguage === 'es' ? 'Continuar Lección' : 'Continue Lesson')
                          : (nativeLanguage === 'es' ? 'Aprender con Tutor' : 'Study with Tutor')}
                      </span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report AI Content Modal */}
      {reportingMsg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="glass-card animate-scale-up" style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
                <Flag size={18} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                  {nativeLanguage === 'es' ? 'Reportar Respuesta del Tutor' : 'Report AI Response'}
                </h3>
              </div>
              <button
                onClick={() => setReportingMsg(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {reportSuccess ? (
              <div style={{
                background: 'var(--success-glow)',
                border: '1px solid var(--success)',
                color: 'var(--success)',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '13px',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                <CheckCircle2 size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                {reportSuccess}
              </div>
            ) : (
              <form onSubmit={handleSendReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  {nativeLanguage === 'es' 
                    ? 'Ayúdanos a mantener Spanglish seguro y preciso. Reporta contenido ofensivo, dañino o incorrecto.'
                    : 'Help us keep Spanglish safe and accurate. Report inappropriate, harmful, or incorrect content.'}
                </p>

                <div style={{
                  background: 'var(--bg-app)',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  fontSize: '11.5px',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic'
                }}>
                  "{reportingMsg.content.substring(0, 180)}{reportingMsg.content.length > 180 ? '...' : ''}"
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    {nativeLanguage === 'es' ? 'Motivo del reporte:' : 'Reason for report:'}
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <option value="Offensive or inappropriate content">
                      {nativeLanguage === 'es' ? 'Contenido ofensivo o inapropiado' : 'Offensive or inappropriate content'}
                    </option>
                    <option value="Factually incorrect or broken response">
                      {nativeLanguage === 'es' ? 'Respuesta incorrecta o rota' : 'Factually incorrect or broken response'}
                    </option>
                    <option value="Harmful or unsafe content">
                      {nativeLanguage === 'es' ? 'Contenido perjudicial o no seguro' : 'Harmful or unsafe content'}
                    </option>
                    <option value="Other issue">
                      {nativeLanguage === 'es' ? 'Otro problema' : 'Other issue'}
                    </option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    {nativeLanguage === 'es' ? 'Detalles adicionales (opcional):' : 'Additional details (optional):'}
                  </label>
                  <textarea
                    value={reportComments}
                    onChange={(e) => setReportComments(e.target.value)}
                    placeholder={nativeLanguage === 'es' ? 'Escribe más detalles si lo deseas...' : 'Provide any extra context...'}
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      resize: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setReportingMsg(null)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {nativeLanguage === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    style={{
                      background: 'var(--danger)',
                      border: 'none',
                      color: 'white',
                      fontWeight: '700',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: submittingReport ? 0.7 : 1
                    }}
                  >
                    <Flag size={12} />
                    <span>{submittingReport ? (nativeLanguage === 'es' ? 'Enviando...' : 'Submitting...') : (nativeLanguage === 'es' ? 'Enviar Reporte' : 'Submit Report')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Multi-Session Conversation History Drawer */}
      {showHistoryDrawer && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 6, 15, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-start',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            setShowHistoryDrawer(false);
            setActiveMenuConvId(null);
            setEditingConvId(null);
          }}
        >
          <div 
            style={{
              width: '85%',
              maxWidth: '340px',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(30, 27, 75, 0.98) 0%, rgba(15, 12, 41, 0.99) 100%)',
              borderRight: '1px solid rgba(139, 92, 246, 0.3)',
              boxShadow: '10px 0 30px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              gap: '14px',
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'var(--primary-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <History size={16} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  {nativeLanguage === 'es' ? 'Tus Conversaciones' : 'Chat History'}
                </h3>
              </div>

              <button
                onClick={() => setShowHistoryDrawer(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: 'var(--text-muted)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* "+ New Chat" button */}
            <button
              onClick={async () => {
                await createConversation();
                setShowHistoryDrawer(false);
              }}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus size={16} />
              <span>{nativeLanguage === 'es' ? 'Nueva Conversación' : 'New Custom Chat'}</span>
            </button>

            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '6px 10px'
            }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder={nativeLanguage === 'es' ? 'Buscar temas o lecciones...' : 'Search past chats...'}
                value={searchConvQuery}
                onChange={e => setSearchConvQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  width: '100%'
                }}
              />
              {searchConvQuery && (
                <button
                  onClick={() => setSearchConvQuery('')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Conversations List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '2px'
            }}>
              {conversations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px' }}>
                  {nativeLanguage === 'es' ? 'No hay conversaciones aún.' : 'No conversations yet.'}
                </div>
              ) : (
                conversations
                  .filter(c => !searchConvQuery || c.title.toLowerCase().includes(searchConvQuery.toLowerCase()))
                  .map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    const isEditing = editingConvId === conv.id;
                    const isMenuOpen = activeMenuConvId === conv.id;

                    return (
                      <div
                        key={conv.id}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: isActive 
                            ? 'linear-gradient(90deg, rgba(124, 58, 237, 0.25) 0%, rgba(236, 72, 153, 0.15) 100%)' 
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isActive 
                            ? '1px solid rgba(139, 92, 246, 0.5)' 
                            : '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '12px',
                          padding: '8px 10px',
                          cursor: isEditing ? 'default' : 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          if (!isEditing) {
                            selectConversation(conv.id);
                            setShowHistoryDrawer(false);
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                          <div style={{
                            color: conv.isPinned ? '#fbbf24' : conv.type === 'lesson' ? '#c084fc' : '#38bdf8',
                            flexShrink: 0
                          }}>
                            {conv.isPinned ? <Pin size={13} style={{ fill: '#fbbf24' }} /> : conv.type === 'lesson' ? <BookOpen size={13} /> : <MessageSquare size={13} />}
                          </div>

                          {isEditing ? (
                            <form
                              onSubmit={e => {
                                e.preventDefault();
                                renameConversation(conv.id, editTitleInput);
                                setEditingConvId(null);
                              }}
                              style={{ display: 'flex', gap: '4px', flex: 1, alignItems: 'center' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={editTitleInput}
                                onChange={e => setEditTitleInput(e.target.value)}
                                autoFocus
                                style={{
                                  background: 'rgba(0, 0, 0, 0.4)',
                                  border: '1px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'white',
                                  fontSize: '11.5px',
                                  padding: '2px 6px',
                                  width: '100%',
                                  outline: 'none'
                                }}
                              />
                              <button
                                type="submit"
                                style={{
                                  background: 'var(--primary)',
                                  border: 'none',
                                  color: 'white',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  padding: '3px 6px',
                                  cursor: 'pointer',
                                  fontWeight: '700'
                                }}
                              >
                                ✓
                              </button>
                            </form>
                          ) : (
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{
                                fontSize: '12px',
                                fontWeight: isActive ? '700' : '500',
                                color: isActive ? '#fff' : 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {conv.title}
                              </div>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                {new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                {conv.type === 'lesson' && ' · Lesson'}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Options menu trigger */}
                        {!isEditing && (
                          <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setActiveMenuConvId(isMenuOpen ? null : conv.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px'
                              }}
                            >
                              <MoreVertical size={13} />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '24px',
                                background: 'rgba(20, 18, 50, 0.98)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                zIndex: 10000,
                                boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                                minWidth: '110px'
                              }}>
                                <button
                                  onClick={() => {
                                    togglePinConversation(conv.id);
                                    setActiveMenuConvId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-primary)',
                                    fontSize: '11px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                  }}
                                >
                                  <Pin size={11} />
                                  <span>{conv.isPinned ? 'Unpin' : 'Pin'}</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingConvId(conv.id);
                                    setEditTitleInput(conv.title);
                                    setActiveMenuConvId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-primary)',
                                    fontSize: '11px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                  }}
                                >
                                  <Edit3 size={11} />
                                  <span>Rename</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (window.confirm(nativeLanguage === 'es' ? '¿Eliminar esta conversación?' : 'Delete this conversation?')) {
                                      deleteConversation(conv.id);
                                    }
                                    setActiveMenuConvId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#f87171',
                                    fontSize: '11px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                  }}
                                >
                                  <Trash2 size={11} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
