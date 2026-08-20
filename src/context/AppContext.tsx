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


// Chat message and conversation structures
export interface Conversation {
  id: string;
  title: string;
  type: 'custom' | 'lesson' | 'roleplay';
  conceptId?: string;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// Stats counter & Gamification structure
export interface UserStats {
  wordsTranslated: number;
  chatSessions: number;
  pronunciationAttempts: number;
  avgPronunciationScore: number;
  totalPronunciationScore: number; // to calculate running average
  // Gamification fields
  totalScore: number;
  dailyPoints: number;
  dailyGoal: number;
  streakCount: number;
  lastActiveDate: string; // YYYY-MM-DD
  flashcardsDailyPoints: number;
  articlesCompleted: number;
  chaptersCompleted: number;
  tutorLessonsCompleted: number;
  flashcardsCompleted: number;
}

interface AppContextType {
  nativeLanguage: 'en' | 'es';
  targetLanguage: 'en' | 'es';
  level: 'basic' | 'intermediate' | 'advanced';
  onboarded: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | undefined;
  chatHistory: ChatMessage[];
  savedVocabulary: VocabWord[];
  speechRate: number;
  stats: UserStats;
  user: any;
  authLoading: boolean;
  activeTab: 'news' | 'literature' | 'chat' | 'vocabulary';
  notificationsEnabled: boolean;
  notificationTimes: { morning: string; midday: string; evening: string };
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (val: boolean) => void;
  setNativeLanguage: (lang: 'en' | 'es') => void;
  setLevel: (level: 'basic' | 'intermediate' | 'advanced') => void;
  setOnboarded: (val: boolean) => void;
  createConversation: (title?: string, type?: 'custom' | 'lesson' | 'roleplay', conceptId?: string) => Promise<string>;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  renameConversation: (conversationId: string, newTitle: string) => Promise<void>;
  togglePinConversation: (conversationId: string) => Promise<void>;
  addChatMessage: (role: 'user' | 'model', content: string, customConvId?: string) => Promise<void>;
  clearChatHistory: (convId?: string) => Promise<void>;
  saveWord: (word: string, translation: string, category?: string) => void;
  removeWord: (word: string) => void;
  setSpeechRate: (rate: number) => void;
  addPronunciationAttempt: (score: number) => void;
  incrementWordsTranslated: () => void;
  recordActivity: (type: 'article' | 'chapter' | 'tutor' | 'flashcard', customPoints?: number) => void;
  resetAllData: () => void;
  setActiveTab: (tab: 'news' | 'literature' | 'chat' | 'vocabulary') => void;
  setNotificationsEnabled: (val: boolean) => void;
  setNotificationTimes: (times: { morning: string; midday: string; evening: string }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Date helpers for daily activity & streak tracking
const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'literature' | 'chat' | 'vocabulary'>('news');
  
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

  // Multi-session conversation management
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('spanglish_conversations');
      if (saved) {
        const parsed: Conversation[] = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      }
      // Backward compatibility: migrate legacy single chat history if exists
      const legacyChat = localStorage.getItem('spanglish_chat_history');
      if (legacyChat) {
        const parsedLegacy = JSON.parse(legacyChat);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          const initialConv: Conversation = {
            id: 'conv-default-1',
            title: 'General Tutor Practice',
            type: 'custom',
            createdAt: parsedLegacy[0]?.timestamp || Date.now(),
            updatedAt: parsedLegacy[parsedLegacy.length - 1]?.timestamp || Date.now()
          };
          localStorage.setItem('spanglish_conversations', JSON.stringify([initialConv]));
          localStorage.setItem('spanglish_conv_messages_conv-default-1', JSON.stringify(parsedLegacy.map((m: any) => ({
            ...m,
            conversationId: 'conv-default-1'
          }))));
          return [initialConv];
        }
      }
      // Default initial session
      const defaultConv: Conversation = {
        id: 'conv-default-1',
        title: 'General Tutor Practice',
        type: 'custom',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      localStorage.setItem('spanglish_conversations', JSON.stringify([defaultConv]));
      return [defaultConv];
    } catch (e) {
      console.error('Error initializing conversations:', e);
      return [{
        id: 'conv-default-1',
        title: 'General Tutor Practice',
        type: 'custom',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const savedActive = localStorage.getItem('spanglish_active_conv_id');
    if (savedActive) return savedActive;
    const savedConvs = localStorage.getItem('spanglish_conversations');
    if (savedConvs) {
      try {
        const parsed = JSON.parse(savedConvs);
        if (parsed && parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    return 'conv-default-1';
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const activeId = localStorage.getItem('spanglish_active_conv_id') || 'conv-default-1';
      const convMsgs = localStorage.getItem(`spanglish_conv_messages_${activeId}`);
      if (convMsgs) return JSON.parse(convMsgs);
      const legacyChat = localStorage.getItem('spanglish_chat_history');
      if (legacyChat) return JSON.parse(legacyChat);
      return [];
    } catch (e) {
      return [];
    }
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
    const parsed = data ? JSON.parse(data) : {};
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    let dailyPoints = parsed.dailyPoints || 0;
    let flashcardsDailyPoints = parsed.flashcardsDailyPoints || 0;
    let streakCount = parsed.streakCount || 0;
    const lastActiveDate = parsed.lastActiveDate || '';

    if (lastActiveDate && lastActiveDate !== today) {
      dailyPoints = 0; // reset today's points
      flashcardsDailyPoints = 0; // reset flashcard daily points
      if (lastActiveDate !== yesterday) {
        streakCount = 0; // broken streak
      }
    }

    return {
      wordsTranslated: parsed.wordsTranslated || 0,
      chatSessions: parsed.chatSessions || 0,
      pronunciationAttempts: parsed.pronunciationAttempts || 0,
      avgPronunciationScore: parsed.avgPronunciationScore || 0,
      totalPronunciationScore: parsed.totalPronunciationScore || 0,
      totalScore: parsed.totalScore || 0,
      dailyPoints: dailyPoints,
      dailyGoal: parsed.dailyGoal || 50,
      streakCount: streakCount,
      lastActiveDate: lastActiveDate,
      flashcardsDailyPoints: flashcardsDailyPoints,
      articlesCompleted: parsed.articlesCompleted || 0,
      chaptersCompleted: parsed.chaptersCompleted || 0,
      tutorLessonsCompleted: parsed.tutorLessonsCompleted || 0,
      flashcardsCompleted: parsed.flashcardsCompleted || 0
    };
  });

  // Password Recovery state
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || search.includes('type=recovery');
    }
    return false;
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
        const today = getTodayDateString();
        setStats(prev => {
          const mergedStats: UserStats = {
            wordsTranslated: Math.max(prev.wordsTranslated || 0, profile.words_translated || 0),
            chatSessions: Math.max(prev.chatSessions || 0, profile.chat_sessions || 0),
            pronunciationAttempts: Math.max(prev.pronunciationAttempts || 0, profile.pronunciation_attempts || 0),
            avgPronunciationScore: profile.avg_pronunciation_score || prev.avgPronunciationScore || 0,
            totalPronunciationScore: Math.max(prev.totalPronunciationScore || 0, profile.total_pronunciation_score || 0),
            totalScore: Math.max(prev.totalScore || 0, profile.total_score || 0),
            dailyPoints: (profile.last_active_date === today || prev.lastActiveDate === today)
              ? Math.max(prev.dailyPoints || 0, profile.daily_points || 0)
              : 0,
            dailyGoal: prev.dailyGoal || 50,
            streakCount: Math.max(prev.streakCount || 0, profile.streak_count || 0),
            lastActiveDate: profile.last_active_date || prev.lastActiveDate || today,
            flashcardsDailyPoints: prev.flashcardsDailyPoints || 0,
            articlesCompleted: prev.articlesCompleted || 0,
            chaptersCompleted: prev.chaptersCompleted || 0,
            tutorLessonsCompleted: prev.tutorLessonsCompleted || 0,
            flashcardsCompleted: prev.flashcardsCompleted || 0
          };
          localStorage.setItem('spanglish_stats', JSON.stringify(mergedStats));
          return mergedStats;
        });
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

      // Fetch conversations and thread messages from Supabase
      try {
        const { data: convs, error: convsErr } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (!convsErr && convs && convs.length > 0) {
          const parsedConvs: Conversation[] = convs.map(c => ({
            id: c.id,
            title: c.title,
            type: c.type || 'custom',
            conceptId: c.concept_id || undefined,
            isPinned: c.is_pinned || false,
            createdAt: new Date(c.created_at).getTime(),
            updatedAt: new Date(c.updated_at).getTime()
          }));
          setConversations(parsedConvs);
          localStorage.setItem('spanglish_conversations', JSON.stringify(parsedConvs));

          const currentActive = activeConversationId && parsedConvs.some(c => c.id === activeConversationId)
            ? activeConversationId
            : parsedConvs[0].id;
          
          setActiveConversationId(currentActive);
          localStorage.setItem('spanglish_active_conv_id', currentActive);

          // Fetch messages for active conversation
          const { data: threadMsgs } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', currentActive)
            .order('created_at', { ascending: true });

          if (threadMsgs) {
            const parsedMsgs: ChatMessage[] = threadMsgs.map(m => ({
              id: m.id,
              conversationId: m.conversation_id,
              role: m.role as 'user' | 'model',
              content: m.content,
              timestamp: new Date(m.created_at).getTime()
            }));
            setChatHistory(parsedMsgs);
            localStorage.setItem(`spanglish_conv_messages_${currentActive}`, JSON.stringify(parsedMsgs));
          }
        } else {
          // Fallback check legacy chat_history table
          const { data: chats } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

          if (chats && chats.length > 0) {
            const parsedChats: ChatMessage[] = chats.map(c => ({
              id: c.id,
              conversationId: 'conv-default-1',
              role: c.role as 'user' | 'model',
              content: c.content,
              timestamp: new Date(c.created_at).getTime()
            }));
            setChatHistory(parsedChats);
            localStorage.setItem('spanglish_conv_messages_conv-default-1', JSON.stringify(parsedChats));
          }
        }
      } catch (convFetchErr) {
        console.warn('Could not fetch cloud conversations (table may need migration):', convFetchErr);
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
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

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

  // Multi-session Conversation Operations
  const createConversation = async (
    title?: string, 
    type: 'custom' | 'lesson' | 'roleplay' = 'custom', 
    conceptId?: string
  ): Promise<string> => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `conv-${Date.now()}`;
    const newTitle = title || (type === 'lesson' ? 'Grammar Lesson' : 'New Tutor Chat');
    const now = Date.now();

    const newConv: Conversation = {
      id: newId,
      title: newTitle,
      type,
      conceptId,
      isPinned: false,
      createdAt: now,
      updatedAt: now
    };

    setConversations(prev => {
      const updated = [newConv, ...prev];
      localStorage.setItem('spanglish_conversations', JSON.stringify(updated));
      return updated;
    });

    setActiveConversationId(newId);
    localStorage.setItem('spanglish_active_conv_id', newId);
    setChatHistory([]);
    localStorage.setItem(`spanglish_conv_messages_${newId}`, JSON.stringify([]));

    if (user) {
      try {
        await supabase.from('conversations').insert({
          id: newId,
          user_id: user.id,
          title: newTitle,
          type,
          concept_id: conceptId || null,
          is_pinned: false
        });
      } catch (err) {
        console.warn('Error creating cloud conversation:', err);
      }
    }

    return newId;
  };

  const selectConversation = async (conversationId: string) => {
    if (conversationId === activeConversationId) return;

    setActiveConversationId(conversationId);
    localStorage.setItem('spanglish_active_conv_id', conversationId);

    // 1. Try local cache first for instant UI response
    const cached = localStorage.getItem(`spanglish_conv_messages_${conversationId}`);
    if (cached) {
      setChatHistory(JSON.parse(cached));
    } else {
      setChatHistory([]);
    }

    // 2. Fetch latest messages from Supabase if authenticated
    if (user) {
      try {
        const { data: msgs, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (!error && msgs) {
          const parsed: ChatMessage[] = msgs.map(m => ({
            id: m.id,
            conversationId: m.conversation_id,
            role: m.role as 'user' | 'model',
            content: m.content,
            timestamp: new Date(m.created_at).getTime()
          }));
          setChatHistory(parsed);
          localStorage.setItem(`spanglish_conv_messages_${conversationId}`, JSON.stringify(parsed));
        }
      } catch (err) {
        console.warn('Error loading messages for conversation from cloud:', err);
      }
    }
  };

  const deleteConversation = async (conversationId: string) => {
    const remaining = conversations.filter(c => c.id !== conversationId);
    setConversations(remaining);
    localStorage.setItem('spanglish_conversations', JSON.stringify(remaining));
    localStorage.removeItem(`spanglish_conv_messages_${conversationId}`);

    if (activeConversationId === conversationId) {
      if (remaining.length > 0) {
        const nextId = remaining[0].id;
        setActiveConversationId(nextId);
        localStorage.setItem('spanglish_active_conv_id', nextId);
        const cached = localStorage.getItem(`spanglish_conv_messages_${nextId}`);
        setChatHistory(cached ? JSON.parse(cached) : []);
      } else {
        // Create fresh default conversation
        createConversation('General Tutor Practice', 'custom');
      }
    }

    if (user) {
      try {
        await supabase.from('conversations').delete().eq('id', conversationId);
      } catch (err) {
        console.warn('Error deleting cloud conversation:', err);
      }
    }
  };

  const renameConversation = async (conversationId: string, newTitle: string) => {
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return;

    setConversations(prev => {
      const updated = prev.map(c => c.id === conversationId ? { ...c, title: cleanTitle, updatedAt: Date.now() } : c);
      localStorage.setItem('spanglish_conversations', JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await supabase.from('conversations').update({ 
          title: cleanTitle, 
          updated_at: new Date().toISOString() 
        }).eq('id', conversationId);
      } catch (err) {
        console.warn('Error renaming cloud conversation:', err);
      }
    }
  };

  const togglePinConversation = async (conversationId: string) => {
    let updatedPin = false;
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id === conversationId) {
          updatedPin = !c.isPinned;
          return { ...c, isPinned: updatedPin };
        }
        return c;
      });
      localStorage.setItem('spanglish_conversations', JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await supabase.from('conversations').update({ is_pinned: updatedPin }).eq('id', conversationId);
      } catch (err) {
        console.warn('Error toggling pin on cloud conversation:', err);
      }
    }
  };

  // Chat message management (Thread-Scoped)
  const addChatMessage = async (role: 'user' | 'model', content: string, customConvId?: string) => {
    const targetConvId = customConvId || activeConversationId || 'conv-default-1';
    const now = Date.now();

    const newMessage: ChatMessage = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `msg-${now}`,
      conversationId: targetConvId,
      role,
      content,
      timestamp: now,
    };
    
    // Update active chat history if message belongs to current thread
    if (targetConvId === activeConversationId) {
      setChatHistory(prev => {
        const updated = [...prev, newMessage];
        localStorage.setItem(`spanglish_conv_messages_${targetConvId}`, JSON.stringify(updated));
        return updated;
      });
    } else {
      const cached = localStorage.getItem(`spanglish_conv_messages_${targetConvId}`);
      const list = cached ? JSON.parse(cached) : [];
      localStorage.setItem(`spanglish_conv_messages_${targetConvId}`, JSON.stringify([...list, newMessage]));
    }

    // Update conversation updatedAt timestamp & auto-name if first message in custom chat
    setConversations(prev => {
      let found = false;
      const updated = prev.map(c => {
        if (c.id === targetConvId) {
          found = true;
          let newTitle = c.title;
          // If default placeholder title and this is the user's first prompt, generate a smart short title
          if (role === 'user' && (c.title === 'New Tutor Chat' || c.title === 'New Conversation')) {
            const preview = content.trim().replace(/\n+/g, ' ');
            newTitle = preview.length > 32 ? preview.substring(0, 32) + '...' : preview;
          }
          return { ...c, title: newTitle, updatedAt: now };
        }
        return c;
      });

      if (!found) {
        updated.unshift({
          id: targetConvId,
          title: 'Tutor Chat',
          type: 'custom',
          createdAt: now,
          updatedAt: now
        });
      }

      // Sort with pinned first, then by updatedAt descending
      updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });

      localStorage.setItem('spanglish_conversations', JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await supabase.from('chat_messages').insert({
          id: newMessage.id,
          conversation_id: targetConvId,
          user_id: user.id,
          role,
          content
        });

        await supabase.from('conversations').update({
          updated_at: new Date(now).toISOString()
        }).eq('id', targetConvId);
      } catch (err) {
        console.warn('Error writing chat message to cloud:', err);
      }
    }

    // Count a session only when this conversation had no messages before this write.
    let isStartingChat = true;
    try {
      const cachedMessages = localStorage.getItem(`spanglish_conv_messages_${targetConvId}`);
      isStartingChat = !cachedMessages || JSON.parse(cachedMessages).length === 0;
    } catch {
      isStartingChat = true;
    }
    if (isStartingChat) {
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

  const clearChatHistory = async (convId?: string) => {
    const targetId = convId || activeConversationId;
    if (!targetId) return;

    if (targetId === activeConversationId) {
      setChatHistory([]);
    }
    localStorage.removeItem(`spanglish_conv_messages_${targetId}`);

    if (user) {
      try {
        await supabase.from('chat_messages').delete().eq('conversation_id', targetId);
      } catch (err) {
        console.warn('Error clearing thread messages in cloud:', err);
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

  const recordActivity = async (type: 'article' | 'chapter' | 'tutor' | 'flashcard', customPoints?: number) => {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    const pointsMap = {
      article: 10,
      chapter: 25,
      tutor: 25,
      flashcard: 1
    };

    let earned = customPoints ?? pointsMap[type];

    let updatedStats: UserStats = stats;
    setStats(prev => {
      const isNewDay = prev.lastActiveDate !== today;
      let newStreak = prev.streakCount;

      if (isNewDay) {
        if (prev.lastActiveDate === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      } else if (newStreak === 0) {
        newStreak = 1;
      }

      const prevDailyPoints = isNewDay ? 0 : (prev.dailyPoints || 0);
      let prevFlashcardDaily = isNewDay ? 0 : (prev.flashcardsDailyPoints || 0);

      if (type === 'flashcard') {
        if (prevFlashcardDaily >= 20) {
          earned = 0; // Capped at 20 XP max per day for flashcards
        } else {
          earned = Math.min(earned, 20 - prevFlashcardDaily);
          prevFlashcardDaily += earned;
        }
      }

      const newDailyPoints = prevDailyPoints + earned;

      // Check if daily goal hit for bonus
      const wasGoalHit = prevDailyPoints >= (prev.dailyGoal || 50);
      const isNowGoalHit = newDailyPoints >= (prev.dailyGoal || 50);
      const bonusXP = (!wasGoalHit && isNowGoalHit) ? 25 : 0;

      const newTotalScore = (prev.totalScore || 0) + earned + bonusXP;

      updatedStats = {
        ...prev,
        dailyPoints: newDailyPoints,
        totalScore: newTotalScore,
        streakCount: newStreak,
        lastActiveDate: today,
        flashcardsDailyPoints: prevFlashcardDaily,
        articlesCompleted: type === 'article' ? (prev.articlesCompleted || 0) + 1 : (prev.articlesCompleted || 0),
        chaptersCompleted: type === 'chapter' ? (prev.chaptersCompleted || 0) + 1 : (prev.chaptersCompleted || 0),
        tutorLessonsCompleted: type === 'tutor' ? (prev.tutorLessonsCompleted || 0) + 1 : (prev.tutorLessonsCompleted || 0),
        flashcardsCompleted: type === 'flashcard' ? (prev.flashcardsCompleted || 0) + 1 : (prev.flashcardsCompleted || 0),
      };

      localStorage.setItem('spanglish_stats', JSON.stringify(updatedStats));
      return updatedStats;
    });

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({
            total_score: updatedStats.totalScore,
            streak_count: updatedStats.streakCount,
            last_active_date: updatedStats.lastActiveDate,
            daily_points: updatedStats.dailyPoints
          })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error updating gamification stats in cloud:', err);
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
    localStorage.removeItem('spanglish_conversations');
    localStorage.removeItem('spanglish_active_conv_id');
    localStorage.removeItem('spanglish_vocabulary');
    localStorage.removeItem('spanglish_speech_rate');
    localStorage.removeItem('spanglish_stats');
    localStorage.removeItem('spanglish_notifications_enabled');
    localStorage.removeItem('spanglish_notification_times');

    // Clean any cached conversation messages
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('spanglish_conv_messages_')) {
        localStorage.removeItem(key);
      }
    }

    const defaultConv: Conversation = {
      id: 'conv-default-1',
      title: 'General Tutor Practice',
      type: 'custom',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setNativeLanguageState('en');
    setLevelState('basic');
    setOnboardedState(false);
    setConversations([defaultConv]);
    setActiveConversationId('conv-default-1');
    setChatHistory([]);
    setSavedVocabulary([]);
    setSpeechRateState(0.85);
    setStats({
      wordsTranslated: 0,
      chatSessions: 0,
      pronunciationAttempts: 0,
      avgPronunciationScore: 0,
      totalPronunciationScore: 0,
      totalScore: 0,
      dailyPoints: 0,
      dailyGoal: 50,
      streakCount: 0,
      lastActiveDate: '',
      flashcardsDailyPoints: 0,
      articlesCompleted: 0,
      chaptersCompleted: 0,
      tutorLessonsCompleted: 0,
      flashcardsCompleted: 0
    });
    setNotificationsEnabledState(true);
    setNotificationTimesState({ morning: '09:00', midday: '13:00', evening: '19:00' });
    setActiveTab('news');
    setIsPasswordRecovery(false);
    setUser(null);
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId) || conversations[0];

  return (
    <AppContext.Provider value={{
      nativeLanguage,
      targetLanguage,
      level,
      onboarded,
      conversations,
      activeConversationId,
      activeConversation,
      chatHistory,
      savedVocabulary,
      speechRate,
      stats,
      user,
      authLoading,
      activeTab,
      notificationsEnabled,
      notificationTimes,
      isPasswordRecovery,
      setIsPasswordRecovery,
      setNativeLanguage,
      setLevel,
      setOnboarded,
      createConversation,
      selectConversation,
      deleteConversation,
      renameConversation,
      togglePinConversation,
      addChatMessage,
      clearChatHistory,
      saveWord,
      removeWord,
      setSpeechRate,
      addPronunciationAttempt,
      incrementWordsTranslated,
      recordActivity,
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
