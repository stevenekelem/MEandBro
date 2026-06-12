import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RefreshCw, BookOpen, Volume2, Plus, Check } from 'lucide-react';
import { speakTextWithBestVoice } from '../utils/speech';

interface NewsItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  vocab: Array<{ word: string; translation: string }>;
}

export const NewsModule: React.FC = () => {
  const { nativeLanguage, level, speechRate, saveWord, savedVocabulary, removeWord } = useApp();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nativeLanguage, level })
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setNews(data);
      } else {
        throw new Error('Invalid news format');
      }
    } catch (error) {
      console.warn('Could not fetch news from proxy. Using local fallback data.', error);
      // Inline robust fallback data (matches what's on server.js)
      const fallbackNews = nativeLanguage === 'en'
        ? [
            {
              id: 'n1',
              title: 'Avance científico en las selvas de Costa Rica',
              category: 'Ciencia',
              summary: level === 'basic' 
                ? 'Científicos descubren una planta nueva. [Scientists discover a new plant.] La planta cura enfermedades del estómago. [The plant cures stomach illnesses.] Es un día feliz para la ciencia. [It is a happy day for science.]'
                : level === 'intermediate'
                  ? 'Un grupo de botánicos en Costa Rica ha descubierto una nueva especie de planta medicinal en la selva. Esta planta parece tener compuestos químicos que combaten infecciones estomacales rápidamente. Los locales han usado infusiones similares durante décadas.'
                  : 'Un equipo internacional de investigadores en la península de Osa, Costa Rica, ha catalogado una especie vegetal inédita con propiedades antimicrobianas excepcionales. El hallazgo podría revolucionar el tratamiento de afecciones gastrointestinales bacterianas, validando el conocimiento ancestral etnobotánico de la región.',
              vocab: [
                { word: 'Científicos', translation: 'Scientists' },
                { word: 'Selva', translation: 'Jungle/Forest' },
                { word: 'Enfermedades', translation: 'Illnesses' }
              ]
            },
            {
              id: 'n2',
              title: 'El festival del libro comienza en Madrid',
              category: 'Cultura',
              summary: level === 'basic' 
                ? 'El parque del Retiro tiene muchos libros. [Retiro park has many books.] La gente compra novelas de amor y misterio. [People buy love and mystery novels.] El sol brilla mucho hoy. [The sun shines a lot today.]'
                : level === 'intermediate'
                  ? 'La Feria del Libro de Madrid abre sus puertas este fin de semana en el Parque del Retiro. Se esperan miles de visitantes y más de 300 autores firmando sus obras. Es una gran oportunidad para conseguir autógrafos.'
                  : 'La septuagésima Feria del Libro de Madrid arranca hoy en el Parque del Retiro con el lema del fomento de la lectura juvenil. Con una cifra récord de casetas y la presencia de autores galardonados internacionalmente, el sector editorial prevé superar las cifras de venta prepandémicas.',
              vocab: [
                { word: 'Feria', translation: 'Fair' },
                { word: 'Firmando', translation: 'Signing' },
                { word: 'Obras', translation: 'Works/Books' }
              ]
            }
          ]
        : [
            {
              id: 'n1',
              title: 'New Solar Power Record in California',
              category: 'Science',
              summary: level === 'basic' 
                ? 'California makes a lot of clean energy. [California produce mucha energía limpia.] Solar panels cover the desert. [Los paneles solares cubren el desierto.] The air is cleaner now. [El aire es más limpio ahora.]'
                : level === 'intermediate'
                  ? 'California has set a new record by generating 95% of its electricity from renewable sources for a short time on Sunday. Most of it came from massive solar farms in the Mojave desert, showing the rapid growth of green power.'
                  : 'California briefly achieved a milestone by meeting 95% of its grid demand with clean energy, driven by surge outputs from utility-scale solar arrays. Grid operators noted this highlights the necessity of expanding battery storage systems to manage peak load volatility.',
              vocab: [
                { word: 'Renewable', translation: 'Renovable' },
                { word: 'Desert', translation: 'Desierto' },
                { word: 'Grid', translation: 'Red eléctrica' }
              ]
            },
            {
              id: 'n2',
              title: 'Classic Theatre Festival Starts in London',
              category: 'Culture',
              summary: level === 'basic' 
                ? 'Actors play Shakespeare stories in London. [Los actores interpretan historias de Shakespeare en Londres.] People sit outside. [La gente se sienta afuera.] The tickets are cheap. [Las entradas son baratas.]'
                : level === 'intermediate'
                  ? 'The open-air Shakespeare festival has begun in London. Audiences can watch classic plays like Hamlet under the stars. Tickets are selling out quickly, so organizers recommend booking in advance.'
                  : 'London\'s annual Open Air Theatre season commenced in Regent\'s Park, headlining a modern adaptation of Shakespearean classics. The production blends historical prose with contemporary set designs, drawing critical acclaim from theatre enthusiasts.',
              vocab: [
                { word: 'Open-air', translation: 'Al aire libre' },
                { word: 'Audiences', translation: 'Público/Espectadores' },
                { word: 'Booking', translation: 'Reservar' }
              ]
            }
          ];
      setNews(fallbackNews);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  return (
    <div className="animate-slide-up" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
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
            border: '1px solid var(--border)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          className={refreshing ? 'pulse-recording' : ''}
        >
          <RefreshCw size={16} style={{ transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'all 0.5s ease' }} />
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 1s infinite' }}></div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {nativeLanguage === 'es' ? 'Cargando noticias adaptadas...' : 'Loading level-adapted news...'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {news.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Category Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  background: 'var(--primary-glow)',
                  color: 'var(--primary)',
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-glow)'
                }}>
                  {item.category}
                </span>
                <BookOpen size={14} color="var(--text-muted)" />
              </div>

              {/* Title */}
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {item.title}
              </h3>

              {/* Summary Text */}
              <div style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                background: 'rgba(0,0,0,0.1)',
                padding: '12px',
                borderRadius: '12px',
                borderLeft: '3px solid var(--primary)'
              }}>
                {renderFormattedSummary(item.summary)}
              </div>

              {/* Vocabulary cards spotlight */}
              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  🔑 {nativeLanguage === 'es' ? 'Vocabulario Clave' : 'Key Vocabulary'}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {item.vocab.map((v, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      padding: '8px 12px',
                      borderRadius: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          onClick={() => speakWord(v.word)}
                          style={{
                            background: 'var(--surface)',
                            border: 'none',
                            color: 'var(--primary)',
                            padding: '4px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Volume2 size={14} />
                        </button>
                        <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{v.word}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>→</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{v.translation}</span>
                      </div>
                      
                      {/* Save Word Icon */}
                      <button
                        onClick={() => toggleSaveWord(v.word, v.translation)}
                        style={{
                          background: isSaved(v.word) ? 'var(--success-glow)' : 'transparent',
                          border: 'none',
                          color: isSaved(v.word) ? 'var(--success)' : 'var(--text-muted)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isSaved(v.word) ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
