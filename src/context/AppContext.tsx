import React, { createContext, useContext, useState } from 'react';

// Vocabulary entry structure
export interface VocabWord {
  word: string;
  translation: string;
  timestamp: number;
  category: string;
}

// Chat message structure
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// Stats counter structure
export interface UserStats {
  wordsTranslated: number;
  chatSessions: number;
  pronunciationAttempts: number;
  avgPronunciationScore: number;
  totalPronunciationScore: number; // to calculate running average
}

interface AppContextType {
  nativeLanguage: 'en' | 'es';
  targetLanguage: 'en' | 'es';
  level: 'basic' | 'intermediate' | 'advanced';
  onboarded: boolean;
  chatHistory: ChatMessage[];
  savedVocabulary: VocabWord[];
  speechRate: number;
  stats: UserStats;
  setNativeLanguage: (lang: 'en' | 'es') => void;
  setLevel: (level: 'basic' | 'intermediate' | 'advanced') => void;
  setOnboarded: (val: boolean) => void;
  addChatMessage: (role: 'user' | 'model', content: string) => void;
  clearChatHistory: () => void;
  saveWord: (word: string, translation: string, category?: string) => void;
  removeWord: (word: string) => void;
  setSpeechRate: (rate: number) => void;
  addPronunciationAttempt: (score: number) => void;
  incrementWordsTranslated: () => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load preferences from localStorage on mount
  const [nativeLanguage, setNativeLanguageState] = useState<'en' | 'es'>(() => {
    return (localStorage.getItem('spanglish_native_lang') as 'en' | 'es') || 'en';
  });
  
  const [level, setLevelState] = useState<'basic' | 'intermediate' | 'advanced'>(() => {
    return (localStorage.getItem('spanglish_level') as 'basic' | 'intermediate' | 'advanced') || 'basic';
  });
  
  const [onboarded, setOnboardedState] = useState<boolean>(() => {
    return localStorage.getItem('spanglish_onboarded') === 'true';
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const data = localStorage.getItem('spanglish_chat_history');
    return data ? JSON.parse(data) : [];
  });

  const [savedVocabulary, setSavedVocabulary] = useState<VocabWord[]>(() => {
    const data = localStorage.getItem('spanglish_vocabulary');
    return data ? JSON.parse(data) : [];
  });

  const [speechRate, setSpeechRateState] = useState<number>(() => {
    const rate = localStorage.getItem('spanglish_speech_rate');
    return rate ? parseFloat(rate) : 0.85; // slightly slower than normal (1.0) for clarity
  });

  const [stats, setStats] = useState<UserStats>(() => {
    const data = localStorage.getItem('spanglish_stats');
    return data ? JSON.parse(data) : {
      wordsTranslated: 0,
      chatSessions: 0,
      pronunciationAttempts: 0,
      avgPronunciationScore: 0,
      totalPronunciationScore: 0
    };
  });

  const targetLanguage = nativeLanguage === 'en' ? 'es' : 'en';

  // Synchronizers
  const setNativeLanguage = (lang: 'en' | 'es') => {
    setNativeLanguageState(lang);
    localStorage.setItem('spanglish_native_lang', lang);
  };

  const setLevel = (lvl: 'basic' | 'intermediate' | 'advanced') => {
    setLevelState(lvl);
    localStorage.setItem('spanglish_level', lvl);
  };

  const setOnboarded = (val: boolean) => {
    setOnboardedState(val);
    localStorage.setItem('spanglish_onboarded', val ? 'true' : 'false');
  };

  const setSpeechRate = (rate: number) => {
    setSpeechRateState(rate);
    localStorage.setItem('spanglish_speech_rate', rate.toString());
  };

  // Chat management
  const addChatMessage = (role: 'user' | 'model', content: string) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now(),
    };
    setChatHistory(prev => {
      const updated = [...prev, newMessage];
      localStorage.setItem('spanglish_chat_history', JSON.stringify(updated));
      return updated;
    });

    // If starting a chat session, record it
    if (chatHistory.length === 0) {
      setStats(prev => {
        const updated = { ...prev, chatSessions: prev.chatSessions + 1 };
        localStorage.setItem('spanglish_stats', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('spanglish_chat_history');
  };

  // Starred Words management
  const saveWord = (word: string, translation: string, category: string = 'General') => {
    const cleanWord = word.trim();
    setSavedVocabulary(prev => {
      // Avoid duplicate vocabulary words
      if (prev.some(v => v.word.toLowerCase() === cleanWord.toLowerCase())) {
        return prev;
      }
      const newWord: VocabWord = {
        word: cleanWord,
        translation: translation.trim(),
        timestamp: Date.now(),
        category
      };
      const updated = [newWord, ...prev];
      localStorage.setItem('spanglish_vocabulary', JSON.stringify(updated));
      return updated;
    });
  };

  const removeWord = (word: string) => {
    setSavedVocabulary(prev => {
      const updated = prev.filter(v => v.word.toLowerCase() !== word.toLowerCase().trim());
      localStorage.setItem('spanglish_vocabulary', JSON.stringify(updated));
      return updated;
    });
  };

  // Stats updates
  const addPronunciationAttempt = (score: number) => {
    setStats(prev => {
      const totalAttempts = prev.pronunciationAttempts + 1;
      const runningTotalScore = prev.totalPronunciationScore + score;
      const updated = {
        ...prev,
        pronunciationAttempts: totalAttempts,
        totalPronunciationScore: runningTotalScore,
        avgPronunciationScore: Math.round(runningTotalScore / totalAttempts)
      };
      localStorage.setItem('spanglish_stats', JSON.stringify(updated));
      return updated;
    });
  };

  const incrementWordsTranslated = () => {
    setStats(prev => {
      const updated = { ...prev, wordsTranslated: prev.wordsTranslated + 1 };
      localStorage.setItem('spanglish_stats', JSON.stringify(updated));
      return updated;
    });
  };

  const resetAllData = () => {
    localStorage.removeItem('spanglish_native_lang');
    localStorage.removeItem('spanglish_level');
    localStorage.removeItem('spanglish_onboarded');
    localStorage.removeItem('spanglish_chat_history');
    localStorage.removeItem('spanglish_vocabulary');
    localStorage.removeItem('spanglish_speech_rate');
    localStorage.removeItem('spanglish_stats');

    setNativeLanguageState('en');
    setLevelState('basic');
    setOnboardedState(false);
    setChatHistory([]);
    setSavedVocabulary([]);
    setSpeechRateState(0.85);
    setStats({
      wordsTranslated: 0,
      chatSessions: 0,
      pronunciationAttempts: 0,
      avgPronunciationScore: 0,
      totalPronunciationScore: 0
    });
  };

  return (
    <AppContext.Provider value={{
      nativeLanguage,
      targetLanguage,
      level,
      onboarded,
      chatHistory,
      savedVocabulary,
      speechRate,
      stats,
      setNativeLanguage,
      setLevel,
      setOnboarded,
      addChatMessage,
      clearChatHistory,
      saveWord,
      removeWord,
      setSpeechRate,
      addPronunciationAttempt,
      incrementWordsTranslated,
      resetAllData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
