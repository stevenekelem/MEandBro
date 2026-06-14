import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../utils/supabase';
import { 
  RefreshCw, Volume2, Plus, Check, 
  Share2, X, Send, Link, FileText, Lock 
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

export const NewsModule: React.FC = () => {
  const { nativeLanguage, level, speechRate, saveWord, savedVocabulary, removeWord, user } = useApp();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Submit Form States
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitCategory, setSubmitCategory] = useState('Ciencia');
  const [submitContent, setSubmitContent] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      // 1. Fetch daily news from Express proxy
      const response = await fetch(getApiUrl('/api/news'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nativeLanguage, level })
      });
      const data = await response.json();
      
      let baseNews: NewsItem[] = [];
      if (Array.isArray(data)) {
        baseNews = data;
      }

      // 2. Fetch community shared news from Supabase
      let communityNews: NewsItem[] = [];
      const { data: dbArticles, error: dbError } = await supabase
        .from('news_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) {
        console.warn('Could not load community articles from Supabase:', dbError.message);
      } else if (dbArticles) {
        communityNews = dbArticles.map(art => ({
          id: art.id,
          title: art.title,
          category: art.category,
          // Select correct level summary
          summary: level === 'basic' 
            ? art.summary_basic 
            : level === 'intermediate' 
              ? art.summary_intermediate 
              : art.summary_advanced,
          vocab: Array.isArray(art.vocab) ? art.vocab : [],
          submitted_url: art.submitted_url || undefined,
          created_at: art.created_at
        }));
      }

      // Combine feed: Community articles first, then baseline articles
      setNews([...communityNews, ...baseNews]);

    } catch (error) {
      console.warn('Could not fetch news from proxy. Using local fallback data.', error);
      // Inline fallback
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

  // Submit Article to backend and Supabase
  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setSubmitError(nativeLanguage === 'es' ? 'Debes iniciar sesión para compartir noticias.' : 'You must log in to share news articles.');
      return;
    }
    if (!submitTitle.trim() || !submitContent.trim()) {
      setSubmitError(nativeLanguage === 'es' ? 'Completa los campos obligatorios.' : 'Please fill out required fields.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const targetLanguage = nativeLanguage === 'en' ? 'es' : 'en';
      
      // 1. Call proxy backend to summarize and extract vocab
      const response = await fetch(getApiUrl('/api/news/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: submitTitle,
          category: submitCategory,
          content: submitContent,
          targetLanguage
        })
      });

      if (!response.ok) throw new Error('Failed to summarize article content.');
      const data = await response.json();

      // 2. Insert into Supabase table public.news_articles
      const { error: dbError } = await supabase.from('news_articles').insert({
        user_id: user.id,
        title: submitTitle.trim(),
        category: submitCategory,
        summary_basic: data.summary_basic,
        summary_intermediate: data.summary_intermediate,
        summary_advanced: data.summary_advanced,
        vocab: data.vocab,
        submitted_url: submitUrl.trim() || null
      });

      if (dbError) throw dbError;

      // Success clean up
      setSubmitSuccess(true);
      setSubmitTitle('');
      setSubmitContent('');
      setSubmitUrl('');
      
      // Reload news feed to show the newly submitted article at the top
      fetchNews();

      setTimeout(() => {
        setSubmitSuccess(false);
        setShowSubmitForm(false);
      }, 2000);

    } catch (err: any) {
      console.error('Error submitting article:', err);
      setSubmitError(err.message || 'Error processing news article.');
    } finally {
      setSubmitting(false);
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
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSubmitForm(!showSubmitForm)}
            style={{
              background: showSubmitForm ? 'var(--danger)' : 'var(--primary-gradient)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: '700',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)'
            }}
          >
            {showSubmitForm ? <X size={14} /> : <Share2 size={14} />}
            <span>{showSubmitForm ? (nativeLanguage === 'es' ? 'Cerrar' : 'Close') : (nativeLanguage === 'es' ? 'Compartir' : 'Submit')}</span>
          </button>

          <button 
            onClick={() => fetchNews(true)} 
            disabled={loading || refreshing}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              width: '38px',
              height: '38px',
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
            <RefreshCw size={15} style={{ transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'all 0.5s ease' }} />
          </button>
        </div>
      </div>

      {/* Share Article form */}
      {showSubmitForm && (
        <div className="glass-card animate-slide-up" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(139, 92, 246, 0.35)', background: 'rgba(15, 12, 41, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>
              {nativeLanguage === 'es' ? 'Compartir Artículo de Noticias' : 'Submit News Article'}
            </span>
          </div>

          {!user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '10px', color: 'var(--danger)', fontSize: '12px' }}>
              <Lock size={14} />
              <span>{nativeLanguage === 'es' ? 'Inicia sesión en la pestaña de Vocabulario para enviar artículos.' : 'Log in under the Vocabulary tab to share articles.'}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitArticle} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Title Input */}
              <input
                type="text"
                placeholder={nativeLanguage === 'es' ? 'Título del artículo *' : 'Article Title *'}
                value={submitTitle}
                onChange={(e) => setSubmitTitle(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />

              {/* Category selector */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                  {nativeLanguage === 'es' ? 'Categoría:' : 'Category:'}
                </span>
                <select
                  value={submitCategory}
                  onChange={(e) => setSubmitCategory(e.target.value)}
                  style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Ciencia">{nativeLanguage === 'es' ? 'Ciencia' : 'Science'}</option>
                  <option value="Cultura">{nativeLanguage === 'es' ? 'Cultura' : 'Culture'}</option>
                  <option value="Tecnología">{nativeLanguage === 'es' ? 'Tecnología' : 'Technology'}</option>
                  <option value="Deportes">{nativeLanguage === 'es' ? 'Deportes' : 'Sports'}</option>
                </select>
              </div>

              {/* URL Input */}
              <div style={{ position: 'relative' }}>
                <Link size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="url"
                  placeholder={nativeLanguage === 'es' ? 'URL de origen (opcional)' : 'Source URL (optional)'}
                  value={submitUrl}
                  onChange={(e) => setSubmitUrl(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 28px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Content Paste area */}
              <textarea
                placeholder={
                  nativeLanguage === 'es' 
                    ? 'Pega el texto del artículo aquí (el servidor usará Gemini para resumirlo y traducirlo en 3 niveles)... *' 
                    : 'Paste article content text here (the backend will level-adapt & translate it via Gemini)... *'
                }
                value={submitContent}
                onChange={(e) => setSubmitContent(e.target.value)}
                required
                rows={4}
                style={{
                  width: '100%',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />

              {submitError && (
                <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '600' }}>
                  ⚠️ {submitError}
                </div>
              )}

              {submitSuccess && (
                <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} />
                  <span>{nativeLanguage === 'es' ? '¡Artículo publicado con éxito!' : 'Article submitted successfully!'}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || submitSuccess}
                style={{
                  background: 'var(--primary-gradient)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {submitting ? (
                  <>
                    <div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'voicePulse 0.5s infinite' }}></div>
                    <span>{nativeLanguage === 'es' ? 'Procesando artículo...' : 'Adapting article summaries...'}</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>{nativeLanguage === 'es' ? 'Publicar en la Comunidad' : 'Publish to Feed'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

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
                
                {/* Optional source link icon */}
                {item.submitted_url && (
                  <a 
                    href={item.submitted_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', textDecoration: 'none' }}
                  >
                    <Link size={11} />
                    <span>{nativeLanguage === 'es' ? 'Fuente' : 'Source'}</span>
                  </a>
                )}
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
              {item.vocab && item.vocab.length > 0 && (
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
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
