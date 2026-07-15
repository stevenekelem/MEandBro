import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { getApiUrl } from '../utils/api';

// Vocabulary entry structure
export interface VocabWord {
  word: string;
  translation: string;
  timestamp: number;
  category: string;
  partOfSpeech?: string;
  definition?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  conjugations?: any;
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
  user: any;
  authLoading: boolean;
  activeTab: 'news' | 'literature' | 'chat' | 'translate' | 'vocabulary';
  notificationsEnabled: boolean;
  notificationTimes: { morning: string; midday: string; evening: string };
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
  setActiveTab: (tab: 'news' | 'literature' | 'chat' | 'translate' | 'vocabulary') => void;
  setNotificationsEnabled: (val: boolean) => void;
  setNotificationTimes: (times: { morning: string; midday: string; evening: string }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'literature' | 'chat' | 'translate' | 'vocabulary'>('news');
  
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('spanglish_notifications_enabled') !== 'false';
  });
  
  const [notificationTimes, setNotificationTimesState] = useState<{ morning: string; midday: string; evening: string }>(() => {
    const saved = localStorage.getItem('spanglish_notification_times');
    return saved ? JSON.parse(saved) : { morning: '09:00', midday: '13:00', evening: '19:00' };
  });

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

  // Auth states
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const targetLanguage = nativeLanguage === 'en' ? 'es' : 'en';

  // 1. Fetch user data from Supabase
  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch options and stats from profiles
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr && profileErr.code !== 'PGRST116') {
        throw profileErr;
      }

      if (profile) {
        if (profile.native_lang) {
          setNativeLanguageState(profile.native_lang);
          localStorage.setItem('spanglish_native_lang', profile.native_lang);
        }
        if (profile.level) {
          setLevelState(profile.level);
          localStorage.setItem('spanglish_level', profile.level);
        }
        const dbStats = {
          wordsTranslated: profile.words_translated || 0,
          chatSessions: profile.chat_sessions || 0,
          pronunciationAttempts: profile.pronunciation_attempts || 0,
          avgPronunciationScore: profile.avg_pronunciation_score || 0,
          totalPronunciationScore: profile.total_pronunciation_score || 0
        };
        setStats(dbStats);
        localStorage.setItem('spanglish_stats', JSON.stringify(dbStats));
      }

      // Fetch vocabulary
      const { data: vocab, error: vocabErr } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (vocabErr) throw vocabErr;

      if (vocab) {
        const parsedVocab = vocab.map(v => ({
          word: v.word,
          translation: v.translation,
          category: v.category || 'General',
          timestamp: new Date(v.created_at).getTime(),
          partOfSpeech: v.part_of_speech,
          definition: v.definition,
          exampleSentence: v.example_sentence,
          exampleTranslation: v.example_translation,
          conjugations: v.conjugations
        }));
        setSavedVocabulary(parsedVocab);
        localStorage.setItem('spanglish_vocabulary', JSON.stringify(parsedVocab));
      }

      // Fetch chat history
      const { data: chats, error: chatsErr } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (chatsErr) throw chatsErr;

      if (chats) {
        const parsedChats = chats.map(c => ({
          id: c.id,
          role: c.role as 'user' | 'model',
          content: c.content,
          timestamp: new Date(c.created_at).getTime()
        }));
        setChatHistory(parsedChats);
        localStorage.setItem('spanglish_chat_history', JSON.stringify(parsedChats));
      }

    } catch (err) {
      console.error('Error fetching user cloud profile:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. Sync local data to Supabase (e.g. merge dictionary/stats on login)
  const syncLocalDataToCloud = async (userId: string) => {
    try {
      setAuthLoading(true);
      
      // A. Sync starred words
      const localVocab = JSON.parse(localStorage.getItem('spanglish_vocabulary') || '[]');
      if (localVocab.length > 0) {
        const { data: existing } = await supabase
          .from('vocabulary')
          .select('word')
          .eq('user_id', userId);
        
        const existingWords = new Set((existing || []).map(v => v.word.toLowerCase()));
        
        const toUpload = localVocab
          .filter((v: any) => !existingWords.has(v.word.toLowerCase()))
          .map((v: any) => ({
            user_id: userId,
            word: v.word,
            translation: v.translation,
            category: v.category || 'General',
            created_at: new Date(v.timestamp).toISOString(),
            part_of_speech: v.partOfSpeech,
            definition: v.definition,
            example_sentence: v.exampleSentence,
            example_translation: v.exampleTranslation,
            conjugations: v.conjugations
          }));

        if (toUpload.length > 0) {
          await supabase.from('vocabulary').insert(toUpload);
        }
      }

      // B. Merge stats
      const localStats = JSON.parse(localStorage.getItem('spanglish_stats') || '{}');
      if (Object.keys(localStats).length > 0) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (currentProfile) {
          const mergedAttempts = (currentProfile.pronunciation_attempts || 0) + (localStats.pronunciationAttempts || 0);
          const mergedTotalScore = (currentProfile.total_pronunciation_score || 0) + (localStats.totalPronunciationScore || 0);
          const mergedAvgScore = mergedAttempts > 0 ? Math.round(mergedTotalScore / mergedAttempts) : 0;

          await supabase
            .from('profiles')
            .update({
              words_translated: (currentProfile.words_translated || 0) + (localStats.wordsTranslated || 0),
              chat_sessions: (currentProfile.chat_sessions || 0) + (localStats.chatSessions || 0),
              pronunciation_attempts: mergedAttempts,
              total_pronunciation_score: mergedTotalScore,
              avg_pronunciation_score: mergedAvgScore,
              native_lang: nativeLanguage,
              level: level
            })
            .eq('id', userId);
        }
      }

      // Pull down updated database representation
      await fetchUserProfile(userId);
    } catch (err) {
      console.error('Error syncing local details to cloud:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth State Listener
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        setOnboardedState(true);
        localStorage.setItem('spanglish_onboarded', 'true');
        fetchUserProfile(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      
      if (currentUser) {
        setOnboardedState(true);
        localStorage.setItem('spanglish_onboarded', 'true');
        if (event === 'SIGNED_IN') {
          // Sync anonymous progress to profile
          await syncLocalDataToCloud(currentUser.id);
        } else {
          await fetchUserProfile(currentUser.id);
        }
      } else {
        setAuthLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Synchronizers
  const setNativeLanguage = async (lang: 'en' | 'es') => {
    setNativeLanguageState(lang);
    localStorage.setItem('spanglish_native_lang', lang);
    if (user) {
      try {
        await supabase.from('profiles').update({ native_lang: lang }).eq('id', user.id);
      } catch (err) {
        console.error('Error updating native lang in cloud:', err);
      }
    }
  };

  const setLevel = async (lvl: 'basic' | 'intermediate' | 'advanced') => {
    setLevelState(lvl);
    localStorage.setItem('spanglish_level', lvl);
    if (user) {
      try {
        await supabase.from('profiles').update({ level: lvl }).eq('id', user.id);
      } catch (err) {
        console.error('Error updating level in cloud:', err);
      }
    }
  };

  const setOnboarded = (val: boolean) => {
    setOnboardedState(val);
    localStorage.setItem('spanglish_onboarded', val ? 'true' : 'false');
  };

  const setSpeechRate = (rate: number) => {
    setSpeechRateState(rate);
    localStorage.setItem('spanglish_speech_rate', rate.toString());
  };

  const setNotificationsEnabled = (val: boolean) => {
    setNotificationsEnabledState(val);
    localStorage.setItem('spanglish_notifications_enabled', val ? 'true' : 'false');
  };

  const setNotificationTimes = (times: { morning: string; midday: string; evening: string }) => {
    setNotificationTimesState(times);
    localStorage.setItem('spanglish_notification_times', JSON.stringify(times));
  };

  // Chat management
  const addChatMessage = async (role: 'user' | 'model', content: string) => {
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

    if (user) {
      try {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          role,
          content
        });
      } catch (err) {
        console.error('Error writing chat log to cloud:', err);
      }
    }

    // If starting a chat session, record it
    if (chatHistory.length === 0) {
      let updatedStats: UserStats = stats;
      setStats(prev => {
        updatedStats = { ...prev, chatSessions: prev.chatSessions + 1 };
        localStorage.setItem('spanglish_stats', JSON.stringify(updatedStats));
        return updatedStats;
      });

      if (user) {
        try {
          await supabase.from('profiles').update({ chat_sessions: updatedStats.chatSessions }).eq('id', user.id);
        } catch (err) {
          console.error('Error updating chat session stats in cloud:', err);
        }
      }
    }
  };

  const clearChatHistory = async () => {
    setChatHistory([]);
    localStorage.removeItem('spanglish_chat_history');
    if (user) {
      try {
        await supabase.from('chat_history').delete().eq('user_id', user.id);
      } catch (err) {
        console.error('Error clearing chat history in cloud:', err);
      }
    }
  };

  // Starred Words management
  const saveWord = async (word: string, translation: string, category: string = 'General') => {
    const cleanWord = word.trim();
    if (!cleanWord) return;

    let alreadyExists = false;
    setSavedVocabulary(prev => {
      alreadyExists = prev.some(v => v.word.toLowerCase() === cleanWord.toLowerCase());
      return prev;
    });
    if (alreadyExists) return;

    const newWord: VocabWord = {
      word: cleanWord,
      translation: translation.trim(),
      timestamp: Date.now(),
      category
    };

    setSavedVocabulary(prev => {
      const updated = [newWord, ...prev];
      localStorage.setItem('spanglish_vocabulary', JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await supabase.from('vocabulary').insert({
          user_id: user.id,
          word: cleanWord,
          translation: translation.trim(),
          category
        });
      } catch (err) {
        console.error('Error saving vocabulary to cloud:', err);
      }
    }

    // Trigger background enrichment via Express backend
    (async () => {
      try {
        const response = await fetch(getApiUrl('/api/vocab/enrich'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: cleanWord, targetLanguage })
        });
        
        if (response.ok) {
          const enriched = await response.json();
          
          // Update local state
          setSavedVocabulary(prev => {
            const updated = prev.map(item => {
              if (item.word.toLowerCase() === cleanWord.toLowerCase()) {
                return {
                  ...item,
                  partOfSpeech: enriched.part_of_speech,
                  definition: enriched.definition,
                  exampleSentence: enriched.example_sentence,
                  exampleTranslation: enriched.example_translation,
                  conjugations: enriched.conjugations
                };
              }
              return item;
            });
            localStorage.setItem('spanglish_vocabulary', JSON.stringify(updated));
            return updated;
          });

          // Update Cloud database
          if (user) {
            await supabase
              .from('vocabulary')
              .update({
                part_of_speech: enriched.part_of_speech,
                definition: enriched.definition,
                example_sentence: enriched.example_sentence,
                example_translation: enriched.example_translation,
                conjugations: enriched.conjugations
              })
              .eq('user_id', user.id)
              .eq('word', cleanWord);
          }
        }
      } catch (enrichErr) {
        console.error('Failed to enrich vocabulary word in background:', cleanWord, enrichErr);
      }
    })();
  };

  const removeWord = async (word: string) => {
    const cleanWord = word.trim();
    
    setSavedVocabulary(prev => {
      const updated = prev.filter(v => v.word.toLowerCase() !== cleanWord.toLowerCase());
      localStorage.setItem('spanglish_vocabulary', JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await supabase
          .from('vocabulary')
          .delete()
          .eq('user_id', user.id)
          .eq('word', cleanWord);
      } catch (err) {
        console.error('Error removing vocabulary from cloud:', err);
      }
    }
  };

  // Stats updates
  const addPronunciationAttempt = async (score: number) => {
    let updatedStats: UserStats = stats;
    setStats(prev => {
      const totalAttempts = prev.pronunciationAttempts + 1;
      const runningTotalScore = prev.totalPronunciationScore + score;
      updatedStats = {
        ...prev,
        pronunciationAttempts: totalAttempts,
        totalPronunciationScore: runningTotalScore,
        avgPronunciationScore: Math.round(runningTotalScore / totalAttempts)
      };
      localStorage.setItem('spanglish_stats', JSON.stringify(updatedStats));
      return updatedStats;
    });

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({
            pronunciation_attempts: updatedStats.pronunciationAttempts,
            total_pronunciation_score: updatedStats.totalPronunciationScore,
            avg_pronunciation_score: updatedStats.avgPronunciationScore
          })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error updating pronunciation stats in cloud:', err);
      }
    }
  };

  const incrementWordsTranslated = async () => {
    let updatedStats: UserStats = stats;
    setStats(prev => {
      updatedStats = { ...prev, wordsTranslated: prev.wordsTranslated + 1 };
      localStorage.setItem('spanglish_stats', JSON.stringify(updatedStats));
      return updatedStats;
    });

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({
            words_translated: updatedStats.wordsTranslated
          })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error updating words translated stats in cloud:', err);
      }
    }
  };

  const resetAllData = async () => {
    if (user) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }

    localStorage.removeItem('spanglish_native_lang');
    localStorage.removeItem('spanglish_level');
    localStorage.removeItem('spanglish_onboarded');
    localStorage.removeItem('spanglish_chat_history');
    localStorage.removeItem('spanglish_vocabulary');
    localStorage.removeItem('spanglish_speech_rate');
    localStorage.removeItem('spanglish_stats');
    localStorage.removeItem('spanglish_notifications_enabled');
    localStorage.removeItem('spanglish_notification_times');

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
    setNotificationsEnabledState(true);
    setNotificationTimesState({ morning: '09:00', midday: '13:00', evening: '19:00' });
    setActiveTab('news');
    setUser(null);
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
      user,
      authLoading,
      activeTab,
      notificationsEnabled,
      notificationTimes,
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
      resetAllData,
      setActiveTab,
      setNotificationsEnabled,
      setNotificationTimes
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
