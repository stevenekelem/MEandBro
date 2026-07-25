import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../utils/supabase';
import { 
  RefreshCw, Volume2, Plus, Check, 
  CheckCircle2, Sparkles, BookOpen
} from 'lucide-react';
import { speakTextWithBestVoice } from '../utils/speech';
import { getApiUrl } from '../utils/api';

interface NewsItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  vocab: Array<{ word: string; translation: string }>;
  submitted_url?: string;
  created_at?: string;
}

export interface TopicDef {
  id: string;
  nameEn: string;
  nameEs: string;
  icon: string;
}

const TOPICS: TopicDef[] = [
  { id: 'all', nameEn: 'All Topics', nameEs: 'Todos los Temas', icon: '🌐' },
  { id: 'Ciencia', nameEn: 'Science & Tech', nameEs: 'Ciencia & Tech', icon: '🔬' },
  { id: 'Cultura', nameEn: 'Culture & Art', nameEs: 'Cultura & Arte', icon: '🏛️' },
  { id: 'Mundo', nameEn: 'World & Society', nameEs: 'Mundo & Sociedad', icon: '🌍' },
  { id: 'Deportes', nameEn: 'Sports & Health', nameEs: 'Deportes & Salud', icon: '⚽' },
  { id: 'Entretenimiento', nameEn: 'Entertainment', nameEs: 'Entretenimiento', icon: '🎬' }
];

// Helper to format article creation date nicely
const formatPublishDate = (dateStr?: string, nativeLang: 'en' | 'es' = 'en'): string => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    return nativeLang === 'es' ? 'Hoy' : 'Today';
  }
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    return nativeLang === 'es' ? 'Hace un momento' : 'Just now';
  } else if (diffHours < 24 && d.getDate() === now.getDate()) {
    return nativeLang === 'es' ? `Hace ${diffHours}h` : `${diffHours}h ago`;
  }
  return d.toLocaleDateString(nativeLang === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

// Heuristic to detect translation language of an article to find matching news
const matchesNativeLanguageHeuristic = (vocabList: any[], nativeLanguage: 'en' | 'es'): boolean => {
  if (!vocabList || !Array.isArray(vocabList) || vocabList.length === 0) {
    return true; // allow by default if no vocab list
  }
  const sampleTranslation = vocabList[0].translation || '';
  
  const englishWords = /\b(the|of|and|a|to|in|is|you|that|it|he|was|for|on|are|as|with|his|they|i|at|be|this|have|from|or|one|had|by|word|but|not|what|all|were|we|when|your|can|said|there|use|an|each|which|she|do|how|their|if|will|up|other|about|out|many|then|them|these|so|some|her|would|make|like|him|into|time|has|look|two|more|write|go|see|number|no|way|could|people|my|than|first|water|been|call|who|oil|its|now|find|long|down|day|did|get|come|made|may|part)\b/i;
  const spanishWords = /\b(el|la|los|las|un|una|unos|unas|de|del|y|en|que|es|son|se|un|con|por|para|como|su|sus|al|lo|como|más|pero|o|este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella|aquellos|aquellas|mi|mis|tu|tus|su|sus|nuestro|nuestra|nuestros|nuestras|yo|tú|él|ella|nosotros|vosotros|ellos|ellas|me|te|le|nos|os|les|este|esta|todo|todos|toda|todas|otro|otra|otros|otras|mismo|misma|mismos|mismas|alguno|alguna|algunos|algunas|ninguno|ninguna|ningunos|ningunas|mucho|mucha|muchos|muchas|poco|poca|pocos|pocas|tanto|tanta|tantos|tantas|demasiado|demasiada|demasiados|demasiadas|cuyo|cuya|cuyos|cuyas|donde|cuando|como|porque|si|no|sí|bien|mal|muy|mucho|poco|hoy|ayer|mañana|ahora|después|antes|aquí|allí|allá|cerca|lejos|dentro|fuera|arriba|abajo|delante|detrás|encima|debajo)\b/i;

  const textToTest = sampleTranslation.toLowerCase();
  const hasEnglish = englishWords.test(textToTest);
  const hasSpanish = spanishWords.test(textToTest);

  if (nativeLanguage === 'en') {
    return hasEnglish || !hasSpanish;
  } else {
    return hasSpanish || !hasEnglish;
  }
};

// High quality offline seed articles across all topics
const getTopicSeedNews = (nativeLanguage: 'en' | 'es', level: string): NewsItem[] => {
  if (nativeLanguage === 'en') {
    // Spanish articles with English translations for English speakers learning Spanish
    return [
      {
        id: 'seed-ciencia-1',
        title: 'Avance científico en las selvas de Costa Rica',
        category: 'Ciencia',
        created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        summary: level === 'basic' 
          ? 'Científicos descubren una planta nueva. [Scientists discover a new plant.] La planta cura enfermedades del estómago. [The plant cures stomach illnesses.] Es un día feliz para la ciencia. [It is a happy day for science.]'
          : level === 'intermediate'
            ? 'Un grupo de botánicos en Costa Rica ha descubierto una nueva especie de planta medicinal en la selva. Esta planta parece tener compuestos químicos que combaten infecciones estomacales rápidamente.'
            : 'Un equipo internacional de investigadores en la península de Osa, Costa Rica, ha catalogado una especie vegetal inédita con propiedades antimicrobianas excepcionales.',
        vocab: [
          { word: 'Científicos', translation: 'Scientists' },
          { word: 'Selva', translation: 'Jungle/Forest' },
          { word: 'Enfermedades', translation: 'Illnesses' }
        ]
      },
      {
        id: 'seed-cultura-1',
        title: 'El gran festival del libro comienza en Madrid',
        category: 'Cultura',
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        summary: level === 'basic' 
          ? 'El parque del Retiro tiene muchos libros. [Retiro park has many books.] La gente compra novelas de amor y misterio. [People buy love and mystery novels.] El sol brilla mucho hoy. [The sun shines a lot today.]'
          : level === 'intermediate'
            ? 'La Feria del Libro de Madrid abre sus puertas este fin de semana en el Parque del Retiro. Se esperan miles de visitantes y más de 300 autores firmando sus obras.'
            : 'La septuagésima Feria del Libro de Madrid arranca hoy en el Parque del Retiro con el lema del fomento de la lectura juvenil.',
        vocab: [
          { word: 'Feria', translation: 'Fair' },
          { word: 'Firmando', translation: 'Signing' },
          { word: 'Obras', translation: 'Works/Books' }
        ]
      },
      {
        id: 'seed-mundo-1',
        title: 'Ciudades verdes: El futuro urbano en Latinoamérica',
        category: 'Mundo',
        created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        summary: level === 'basic' 
          ? 'Las ciudades siembran árboles en las calles. [Cities plant trees in the streets.] El aire es más fresco y limpio. [The air is fresher and cleaner.] Los parques ayudan a todos. [Parks help everyone.]'
          : level === 'intermediate'
            ? 'Varias capitales latinoamericanas están creando corredores verdes urbanos para combatir las olas de calor y reducir la contaminación del aire en el centro de las ciudades.'
            : 'La implementación de corredores ecológicos urbanos en metrópolis sudamericanas representa un cambio de paradigma estructural hacia la resiliencia climática.',
        vocab: [
          { word: 'Árboles', translation: 'Trees' },
          { word: 'Contaminación', translation: 'Pollution' },
          { word: 'Resiliencia', translation: 'Resilience' }
        ]
      },
      {
        id: 'seed-deportes-1',
        title: 'Atletas rompen récords en el campeonato iberoamericano',
        category: 'Deportes',
        created_at: new Date(Date.now() - 1000 * 60 * 450).toISOString(),
        summary: level === 'basic' 
          ? 'Los corredores corren muy rápido. [The runners run very fast.] Ganaron medallas de oro y plata. [They won gold and silver medals.] La gente celebra en el estadio. [People celebrate in the stadium.]'
          : level === 'intermediate'
            ? 'En el campeonato de atletismo, dos corredores jóvenes superaron los récords de velocidad en los 100 metros planos tras meses de intenso entrenamiento.'
            : 'Una jornada histórica en la pista atlética presenció la superación de dos plusmarcas continentales en la prueba reina de la velocidad.',
        vocab: [
          { word: 'Corredores', translation: 'Runners' },
          { word: 'Velocidad', translation: 'Speed' },
          { word: 'Entrenamiento', translation: 'Training' }
        ]
      },
      {
        id: 'seed-entretenimiento-1',
        title: 'El nuevo cine en español triunfa en festivales internacionales',
        category: 'Entretenimiento',
        created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
        summary: level === 'basic' 
          ? 'Una nueva película de cine gusta a todos. [A new movie pleases everyone.] Los actores reciben aplausos. [The actors receive applause.] El director sonríe feliz. [The director smiles happily.]'
          : level === 'intermediate'
            ? 'El cine hispanoamericano ha obtenido los máximos galardones en el festival de cine gracias a historias conmovedoras y grandes interpretaciones.'
            : 'La cinematografía iberoamericana continúa su racha triunfal en la palestra internacional con producciones de narrativa audaz y estética vanguardista.',
        vocab: [
          { word: 'Película', translation: 'Movie' },
          { word: 'Galardones', translation: 'Awards' },
          { word: 'Director', translation: 'Director' }
        ]
      }
    ];
  } else {
    // English articles with Spanish translations for Spanish speakers learning English
    return [
      {
        id: 'seed-ciencia-1',
        title: 'New Solar Power Record Achieved in California',
        category: 'Science',
        created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        summary: level === 'basic' 
          ? 'California makes a lot of clean energy. [California produce mucha energía limpia.] Solar panels cover the desert. [Los paneles solares cubren el desierto.] The air is cleaner now. [El aire es más limpio ahora.]'
          : level === 'intermediate'
            ? 'California has set a new record by generating 95% of its electricity from renewable sources on Sunday morning thanks to massive solar farms.'
            : 'California briefly achieved a milestone by meeting 95% of its grid demand with clean energy, driven by surge outputs from utility-scale solar arrays.',
        vocab: [
          { word: 'Renewable', translation: 'Renovable' },
          { word: 'Desert', translation: 'Desierto' },
          { word: 'Grid', translation: 'Red eléctrica' }
        ]
      },
      {
        id: 'seed-cultura-1',
        title: 'Classic Theatre Festival Commences in London',
        category: 'Culture',
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        summary: level === 'basic' 
          ? 'Actors play Shakespeare stories in London. [Los actores interpretan historias de Shakespeare en Londres.] People sit outside. [La gente se sienta afuera.] The tickets are cheap. [Las entradas son baratas.]'
          : level === 'intermediate'
            ? 'The open-air Shakespeare festival has begun in London. Audiences can watch classic plays under the stars during summer nights.'
            : 'London\'s annual Open Air Theatre season commenced in Regent\'s Park, headlining a modern adaptation of Shakespearean classics.',
        vocab: [
          { word: 'Open-air', translation: 'Al aire libre' },
          { word: 'Audiences', translation: 'Público/Espectadores' },
          { word: 'Booking', translation: 'Reservar' }
        ]
      },
      {
        id: 'seed-mundo-1',
        title: 'Global Urban Parks Expansion Program Launched',
        category: 'World',
        created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        summary: level === 'basic' 
          ? 'Big cities build new green parks. [Las grandes ciudades construyen nuevos parques verdes.] Children play outside happily. [Los niños juegan afuera felizmente.] Nature helps city life. [La naturaleza ayuda a la vida urbana.]'
          : level === 'intermediate'
            ? 'Major international cities are expanding urban forest networks to lower summer temperatures and improve public health for residents.'
            : 'Urban planners globally are pioneering integrated botanical corridors to mitigate urban heat island phenomena and optimize atmospheric quality.',
        vocab: [
          { word: 'Forest', translation: 'Bosque' },
          { word: 'Health', translation: 'Salud' },
          { word: 'Residents', translation: 'Residentes' }
        ]
      },
      {
        id: 'seed-deportes-1',
        title: 'Young Marathon Runner Breaks Historic Record',
        category: 'Sports',
        created_at: new Date(Date.now() - 1000 * 60 * 450).toISOString(),
        summary: level === 'basic' 
          ? 'A young runner wins the race. [Un joven corredor gana la carrera.] He ran faster than everyone. [Él corrió más rápido que todos.] The crowd cheers loudly. [La multitud anima ruidosamente.]'
          : level === 'intermediate'
            ? 'An emerging long-distance athlete set a new course record during the international marathon under rainy conditions.'
            : 'An unheralded marathoner delivered an astonishing performance, shattering the long-standing course record by over two minutes.',
        vocab: [
          { word: 'Runner', translation: 'Corredor' },
          { word: 'Race', translation: 'Carrera' },
          { word: 'Performance', translation: 'Rendimiento' }
        ]
      },
      {
        id: 'seed-entretenimiento-1',
        title: 'Indie Film Festival Showcases Groundbreaking Animations',
        category: 'Entertainment',
        created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
        summary: level === 'basic' 
          ? 'Artists create colorful animated films. [Los artistas crean películas animadas coloridas.] Music plays softly in theatres. [La música suena suavemente en los cines.] Audience loves the story. [Al público le encanta la historia.]'
          : level === 'intermediate'
            ? 'Independent filmmakers gathered this week to screen innovative animated shorts featuring hand-drawn artistry and compelling original soundtracks.'
            : 'The independent film festival debuted a stunning slate of animated features that push the boundaries of digital narrative art.',
        vocab: [
          { word: 'Filmmakers', translation: 'Cineastas' },
          { word: 'Animated', translation: 'Animado' },
          { word: 'Soundtracks', translation: 'Bandas sonoras' }
        ]
      }
    ];
  }
};

export const NewsModule: React.FC = () => {
  const { nativeLanguage, level, speechRate, saveWord, savedVocabulary, removeWord, recordActivity } = useApp();
  
  const cacheKey = `spanglish_cached_news_${nativeLanguage}_${level}`;

  // Topic selection state
  const [selectedTopic, setSelectedTopic] = useState<string>(() => {
    return localStorage.getItem('spanglish_selected_news_topic') || 'all';
  });

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
    try {
      localStorage.setItem('spanglish_selected_news_topic', topicId);
    } catch (e) {}
  };

  // Persistent read articles set
  const [readArticles, setReadArticles] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('spanglish_read_articles');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  
  const handleMarkArticleRead = (articleId: string) => {
    if (readArticles.has(articleId)) return;
    setReadArticles(prev => {
      const updated = new Set(prev).add(articleId);
      try {
        localStorage.setItem('spanglish_read_articles', JSON.stringify(Array.from(updated)));
      } catch (e) {}
      return updated;
    });
    recordActivity('article');
  };
  
  // Instant load from local storage if present
  const [news, setNews] = useState<NewsItem[]>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(cacheKey);
    } catch (e) {
      return true;
    }
  });

  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (news.length === 0) {
      setLoading(true);
    }
    
    let baseNews: NewsItem[] = [];
    let dbNews: NewsItem[] = [];

    // 1. Fetch latest articles processed in cron/Supabase table 'news_articles'
    const fetchSupabaseNews = async (): Promise<NewsItem[]> => {
      try {
        const { data: dbArticles, error: dbError } = await supabase
          .from('news_articles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);

        if (dbError) {
          console.warn('Could not load articles from Supabase:', dbError.message);
          return [];
        }

        if (dbArticles && dbArticles.length > 0) {
          return dbArticles
            .filter(art => matchesNativeLanguageHeuristic(art.vocab, nativeLanguage))
            .map(art => {
              let summaryText = art.summary || art.content || '';
              if (level === 'basic' && art.summary_basic) summaryText = art.summary_basic;
              else if (level === 'intermediate' && art.summary_intermediate) summaryText = art.summary_intermediate;
              else if (level === 'advanced' && art.summary_advanced) summaryText = art.summary_advanced;

              return {
                id: art.id,
                title: art.title,
                category: art.category || 'Ciencia',
                summary: summaryText,
                vocab: Array.isArray(art.vocab) ? art.vocab : [],
                submitted_url: art.submitted_url || undefined,
                created_at: art.created_at
              };
            });
        }
        return [];
      } catch (error) {
        console.warn('Exception fetching articles from Supabase:', error);
        return [];
      }
    };

    // 2. Fetch daily news from Express proxy backend (with 3.5s timeout)
    const fetchDailyProxyNews = async (): Promise<NewsItem[]> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(getApiUrl('/api/news'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nativeLanguage, level, refresh: isRefresh }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        clearTimeout(timeoutId);
        return [];
      }
    };

    // Execute fetches
    const [supabaseResult, proxyResult] = await Promise.all([
      fetchSupabaseNews(),
      fetchDailyProxyNews()
    ]);

    dbNews = supabaseResult;
    baseNews = proxyResult;

    // Combine and deduplicate articles
    const seedArticles = getTopicSeedNews(nativeLanguage, level);
    const combinedMap = new Map<string, NewsItem>();

    // Add Supabase DB articles first (latest cron processed)
    dbNews.forEach(item => combinedMap.set(item.id, item));
    // Add Proxy backend articles
    baseNews.forEach(item => {
      if (!combinedMap.has(item.id)) combinedMap.set(item.id, item);
    });
    // Add Seed fallback articles so every topic always has rich items
    seedArticles.forEach(item => {
      if (!combinedMap.has(item.id)) combinedMap.set(item.id, item);
    });

    const finalNewsList = Array.from(combinedMap.values());
    setNews(finalNewsList);

    try {
      localStorage.setItem(cacheKey, JSON.stringify(finalNewsList));
    } catch (e) {}

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchNews();
  }, [nativeLanguage, level]);

  const speakWord = (word: string) => {
    const targetLang = nativeLanguage === 'en' ? 'es' : 'en';
    speakTextWithBestVoice(word, targetLang, speechRate);
  };

  const isSaved = (word: string) => {
    return savedVocabulary.some(v => v.word.toLowerCase() === word.toLowerCase().trim());
  };

  const toggleSaveWord = (word: string, translation: string) => {
    if (isSaved(word)) {
      removeWord(word);
    } else {
      saveWord(word, translation, 'News Vocabulary');
    }
  };

  const renderFormattedSummary = (summaryText: string) => {
    const regex = /([^\[]+)(?:\[(.*?)\])?/g;
    const matches = [...summaryText.matchAll(regex)];

    if (matches.length === 0) {
      return <span>{summaryText}</span>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {matches.map((match, idx) => {
          const sentence = match[1].trim();
          const translation = match[2]?.trim();

          if (!sentence) return null;

          return (
            <div key={idx} style={{ display: 'block' }}>
              <span style={{ color: 'var(--text-primary)', display: 'block' }}>{sentence}</span>
              {translation && (
                <span style={{ 
                  display: 'block', 
                  fontStyle: 'italic', 
                  fontSize: '12px', 
                  color: 'var(--text-muted)', 
                  marginTop: '2px',
                  paddingLeft: '8px',
                  borderLeft: '2px solid var(--border)'
                }}>
                  {translation}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Filter news list based on active selected topic
  const filteredTopicNews = news.filter(item => {
    if (selectedTopic === 'all') return true;
    const cat = (item.category || '').toLowerCase();
    const top = selectedTopic.toLowerCase();
    return cat.includes(top) || top.includes(cat);
  });

  // Separate into Unread (Latest Popular) vs Previously Read
  const latestPopularArticles = filteredTopicNews.filter(item => !readArticles.has(item.id));
  const previouslyReadArticles = filteredTopicNews.filter(item => readArticles.has(item.id));

  return (
    <div className="animate-slide-up" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>
            {nativeLanguage === 'es' ? 'Noticias del Día' : 'Daily News'}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {nativeLanguage === 'es' 
              ? `Nivel: ${level.toUpperCase()} | Traduce presionando texto` 
              : `Level: ${level.toUpperCase()} | Highlight text to translate`}
          </p>
        </div>
        
        <button 
          onClick={() => fetchNews(true)} 
          disabled={loading || refreshing}
          style={{
            background: 'var(--surface)',
            border: refreshing ? '1px solid var(--primary)' : '1px solid var(--border)',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: refreshing ? 'var(--primary)' : 'var(--text-primary)',
            cursor: refreshing ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: refreshing ? '0 0 10px var(--primary-glow)' : 'none'
          }}
        >
          <RefreshCw 
            size={15} 
            style={{ 
              animation: refreshing ? 'spin 1s linear infinite' : 'none', 
              transition: 'all 0.3s ease' 
            }} 
          />
        </button>
      </div>

      {/* Topic Selector Chip Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
        {TOPICS.map(topic => {
          const isSelected = selectedTopic === topic.id;
          return (
            <button
              key={topic.id}
              onClick={() => handleTopicSelect(topic.id)}
              style={{
                background: isSelected ? 'var(--primary-gradient)' : 'var(--surface)',
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                color: isSelected ? 'white' : 'var(--text-secondary)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{topic.icon}</span>
              <span>{nativeLanguage === 'es' ? topic.nameEs : topic.nameEn}</span>
            </button>
          );
        })}
      </div>

      {/* Refreshing Banner */}
      {refreshing && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--primary-glow)',
          border: '1px solid var(--border-glow)',
          padding: '8px 12px',
          borderRadius: '10px',
          color: 'var(--primary)',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          <div style={{ width: '12px', height: '12px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <span>{nativeLanguage === 'es' ? 'Obteniendo noticias del servidor...' : 'Fetching latest topic news...'}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 1s infinite' }}></div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {nativeLanguage === 'es' ? 'Cargando artículos del tema...' : 'Loading topic articles...'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Section 1: Latest Popular Articles (Unread) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {nativeLanguage === 'es' ? 'Últimas Noticias Populares' : 'Latest Popular Articles'}
              </h3>
              <span style={{ fontSize: '11px', background: 'var(--surface)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>
                {latestPopularArticles.length}
              </span>
            </div>

            {latestPopularArticles.length === 0 ? (
              <div className="glass-card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                {nativeLanguage === 'es'
                  ? '¡Has leído todos los artículos nuevos de este tema! Revisa los artículos leídos abajo.'
                  : 'You have read all new articles in this topic! Check out previously read articles below.'}
              </div>
            ) : (
              latestPopularArticles.map(item => (
                <div key={item.id} className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Category & Date Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      background: 'var(--primary-glow)', 
                      color: 'var(--primary)',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {item.category}
                    </span>

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {formatPublishDate(item.created_at, nativeLanguage)}
                    </span>
                  </div>

                  {/* Article Title */}
                  <h3 style={{ fontSize: '16px', fontWeight: '700', lineHeight: '1.4' }}>
                    {item.title}
                  </h3>

                  {/* Adapted Summary */}
                  <div style={{ 
                    fontSize: '14px', 
                    lineHeight: '1.6', 
                    color: 'var(--text-secondary)',
                    background: 'var(--surface)',
                    padding: '12px',
                    borderRadius: '12px',
                    borderLeft: '3px solid var(--primary)'
                  }}>
                    {renderFormattedSummary(item.summary)}
                  </div>

                  {/* Vocabulary Section */}
                  {item.vocab && item.vocab.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {nativeLanguage === 'es' ? 'Vocabulario Clave:' : 'Key Vocabulary:'}
                      </span>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {item.vocab.map((v, i) => {
                          const saved = isSaved(v.word);
                          return (
                            <div 
                              key={i} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                background: saved ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                                border: saved ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border)',
                                padding: '6px 10px', 
                                borderRadius: '20px',
                                fontSize: '12px'
                              }}
                            >
                              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{v.word}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({v.translation})</span>
                              
                              <button 
                                onClick={() => speakWord(v.word)}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, display: 'flex' }}
                                title="Listen pronunciation"
                              >
                                <Volume2 size={12} />
                              </button>

                              <button 
                                onClick={() => toggleSaveWord(v.word, v.translation)}
                                style={{ background: 'none', border: 'none', color: saved ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                                title={saved ? "Remove from vocabulary" : "Save to vocabulary"}
                              >
                                {saved ? <Check size={12} /> : <Plus size={12} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mark as Read Action Button */}
                  <button
                    onClick={() => handleMarkArticleRead(item.id)}
                    style={{
                      marginTop: '6px',
                      background: 'var(--primary-gradient)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)'
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{nativeLanguage === 'es' ? 'Marcar como Leído (+10 XP)' : 'Mark as Read (+10 XP)'}</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Section 2: Previously Read Articles */}
          {previouslyReadArticles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} style={{ color: '#10b981' }} />
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {nativeLanguage === 'es' ? 'Artículos Leídos Anteriormente' : 'Previously Read Articles'}
                </h3>
                <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '10px', color: '#10b981', fontWeight: '700' }}>
                  {previouslyReadArticles.length}
                </span>
              </div>

              {previouslyReadArticles.map(item => (
                <div 
                  key={item.id} 
                  className="card" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    background: 'rgba(16, 185, 129, 0.04)',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      background: 'rgba(16, 185, 129, 0.15)', 
                      color: '#10b981',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Check size={12} />
                      {nativeLanguage === 'es' ? 'Leído' : 'Read'} • {item.category}
                    </span>

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatPublishDate(item.created_at, nativeLanguage)}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: '700', lineHeight: '1.4', color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>

                  <div style={{ 
                    fontSize: '13px', 
                    lineHeight: '1.6', 
                    color: 'var(--text-secondary)',
                    background: 'rgba(0, 0, 0, 0.15)',
                    padding: '12px',
                    borderRadius: '10px',
                    borderLeft: '3px solid #10b981'
                  }}>
                    {renderFormattedSummary(item.summary)}
                  </div>

                  {item.vocab && item.vocab.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {item.vocab.map((v, i) => (
                        <div key={i} style={{ fontSize: '11px', background: 'var(--surface)', padding: '4px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{v.word}</strong>: {v.translation}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
