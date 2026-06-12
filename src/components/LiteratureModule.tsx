import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { speakTextWithBestVoice } from '../utils/speech';
import { Book, Volume2, HelpCircle } from 'lucide-react';

interface LitExcerpt {
  id: string;
  title: string;
  author: string;
  sourceLang: 'es' | 'en';
  lines: Array<{
    target: string;
    native: string;
  }>;
}

const LITERATURE_DATA: LitExcerpt[] = [
  {
    id: 'quijote',
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    sourceLang: 'es',
    lines: [
      { target: 'En un lugar de la Mancha,', native: 'In a place of La Mancha,' },
      { target: 'de cuyo nombre no quiero acordarme,', native: 'whose name I do not wish to remember,' },
      { target: 'no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero,', native: 'not long ago there lived a nobleman, one of those with a lance in a rack,' },
      { target: 'adarga antigua, rocín flaco y galgo corredor.', native: 'an ancient shield, a skinny nag, and a racing greyhound.' },
      { target: 'Una olla de algo más vaca que carnero, salpicón las más noches,', native: 'A pot of stew, containing a bit more beef than mutton, hash most nights,' },
      { target: 'duelos y quebrantos los sábados, lantejas los viernes,', native: 'scraps and eggs on Saturdays, lentils on Fridays,' },
      { target: 'algún palomino de añadidura los domingos,', native: 'and some pigeon as an addition on Sundays,' },
      { target: 'consumían las tres partes de su hacienda.', native: 'consumed three-quarters of his income.' }
    ]
  },
  {
    id: 'hamlet',
    title: 'Hamlet (Act III, Scene I)',
    author: 'William Shakespeare',
    sourceLang: 'en',
    lines: [
      { target: 'To be, or not to be, that is the question:', native: 'Ser o no ser, esa es la cuestión:' },
      { target: "Whether 'tis nobler in the mind to suffer", native: 'Si es más noble para el espíritu sufrir' },
      { target: 'The slings and arrows of outrageous fortune,', native: 'Los golpes y dardos de la insultante fortuna,' },
      { target: 'Or to take arms against a sea of troubles', native: 'O tomar las armas contra un mar de tribulaciones' },
      { target: 'And by opposing end them. To die—to sleep,', native: 'Y oponiéndose a ellas, darles fin. Morir, dormir,' },
      { target: 'No more; and by a sleep to say we end', native: 'no más; y con un sueño decir que acabamos' },
      { target: 'The heart-ache and the thousand natural shocks', native: 'el dolor del corazón y los mil conflictos naturales' },
      { target: 'That flesh is heir to: \'tis a consummation', native: 'que heredó la carne; es una consumación' },
      { target: 'Devoutly to be wish\'d. To die, to sleep;', native: 'devotamente deseable. Morir, dormir;' },
      { target: 'To sleep, perchance to dream—ay, there\'s the rub:', native: 'dormir, tal vez soñar; sí, ahí está la dificultad:' }
    ]
  }
];

export const LiteratureModule: React.FC = () => {
  const { nativeLanguage, speechRate, setSpeechRate } = useApp();
  const [selectedBook, setSelectedBook] = useState<LitExcerpt>(LITERATURE_DATA[0]);
  const [layoutMode, setLayoutMode] = useState<'target' | 'translation'>('translation');
  const [fontSize, setFontSize] = useState<number>(14); // in px
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Filter book recommendations based on target language
  const targetLang = nativeLanguage === 'en' ? 'es' : 'en';
  const filteredBooks = LITERATURE_DATA.filter(b => b.sourceLang === targetLang);

  // Set default book based on target language
  useEffect(() => {
    if (filteredBooks.length > 0) {
      setSelectedBook(filteredBooks[0]);
    }
  }, [nativeLanguage]);

  // Handle responsive resize checks for mobile view
  useEffect(() => {
    const checkResize = () => {
      setIsMobile(window.innerWidth < 450);
    };
    checkResize();
    window.addEventListener('resize', checkResize);
    return () => window.removeEventListener('resize', checkResize);
  }, []);

  const speakLine = (text: string) => {
    speakTextWithBestVoice(text, selectedBook.sourceLang, speechRate);
  };

  return (
    <div className="animate-slide-up" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Module Title */}
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: '800' }}>
          {nativeLanguage === 'es' ? 'Literatura Clásica' : 'Classic Literature'}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {nativeLanguage === 'es' 
            ? 'Domina la lectura nativa y traducción interlineal' 
            : 'Master reading native literature and interlinear translation'}
        </p>
      </div>

      {/* Book selector & Configuration Panels */}
      <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Book size={18} color="var(--primary)" />
          <select 
            value={selectedBook.id}
            onChange={(e) => {
              const book = LITERATURE_DATA.find(b => b.id === e.target.value);
              if (book) setSelectedBook(book);
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
            {filteredBooks.map(b => (
              <option key={b.id} value={b.id}>{b.title} ({b.author})</option>
            ))}
          </select>
        </div>

        {/* Configurations layout row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          
          {/* Mode Switcher */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
              Layout
            </span>
            <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setLayoutMode('target')}
                style={{
                  flex: 1,
                  background: layoutMode === 'target' ? 'var(--primary)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {nativeLanguage === 'es' ? 'Solo Original' : 'Original Only'}
              </button>
              <button
                onClick={() => setLayoutMode('translation')}
                style={{
                  flex: 1,
                  background: layoutMode === 'translation' ? 'var(--primary)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {nativeLanguage === 'es' ? 'Traducción' : 'Translation'}
              </button>
            </div>
          </div>

          {/* Size Controller */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
              Text Size / Font
            </span>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '8px', height: '28px', padding: '0 4px', justifyContent: 'space-between' }}>
              <button 
                onClick={() => setFontSize(prev => Math.max(12, prev - 1))}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '24px', height: '100%', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                -
              </button>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>{fontSize}px</span>
              <button 
                onClick={() => setFontSize(prev => Math.min(22, prev + 1))}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '24px', height: '100%', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                +
              </button>
            </div>
          </div>

        </div>

        {/* Speech Rate Adjustment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
            <span>🔊 Speech Speed</span>
            <span>{Math.round(speechRate * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="1.5" 
            step="0.05"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--primary)',
              background: 'var(--bg-app)',
              height: '4px',
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

      </div>

      {/* Excerpt Reading Panel */}
      <div className="card" style={{ flex: 1, overflowY: 'auto', maxHeight: '430px', padding: '20px', background: 'var(--surface)' }}>
        
        {/* Book Title Header inside reader */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--primary)' }}>{selectedBook.title}</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
            By {selectedBook.author}
          </p>
        </div>

        {/* Paragraph text rendering block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {selectedBook.lines.map((line, idx) => {
            const isDualLayout = layoutMode === 'translation';
            const isSideBySide = isDualLayout && !isMobile;
            const isInterlinear = isDualLayout && isMobile;

            return (
              <div 
                key={idx} 
                style={{ 
                  display: isSideBySide ? 'grid' : 'flex',
                  gridTemplateColumns: isSideBySide ? '1fr 1fr' : 'none',
                  flexDirection: 'column',
                  gap: isSideBySide ? '20px' : '4px',
                  alignItems: 'flex-start',
                  borderBottom: '1px dashed rgba(255, 255, 255, 0.03)',
                  paddingBottom: '10px'
                }}
              >
                
                {/* Target Language Line */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                  <button 
                    onClick={() => speakLine(line.target)}
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      color: 'var(--primary)',
                      padding: '4px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px',
                      flexShrink: 0
                    }}
                  >
                    <Volume2 size={12} />
                  </button>
                  <span style={{ 
                    fontSize: `${fontSize}px`, 
                    color: 'var(--text-primary)', 
                    lineHeight: '1.6',
                    fontFamily: 'serif' // classic literary styling
                  }}>
                    {line.target}
                  </span>
                </div>

                {/* Translation Line */}
                {isSideBySide && (
                  <span style={{ 
                    fontSize: `${fontSize - 1}px`, 
                    color: 'var(--text-secondary)', 
                    lineHeight: '1.6',
                    fontFamily: 'var(--font-sans)',
                    borderLeft: '1px solid var(--border)',
                    paddingLeft: '12px',
                    fontStyle: 'italic'
                  }}>
                    {line.native}
                  </span>
                )}

                {isInterlinear && (
                  <span style={{ 
                    fontSize: `${fontSize - 2}px`, 
                    color: 'var(--text-muted)', 
                    lineHeight: '1.4',
                    fontFamily: 'var(--font-sans)',
                    paddingLeft: '24px', // align with text, not speaker button
                    fontStyle: 'italic'
                  }}>
                    {line.native}
                  </span>
                )}

              </div>
            );
          })}
        </div>

      </div>

      {/* Tip Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        fontSize: '11px',
        color: 'var(--text-secondary)'
      }}>
        <HelpCircle size={14} color="var(--primary)" />
        <span>
          {nativeLanguage === 'es'
            ? '¿Ves una palabra difícil? Selecciónala para ver la traducción instantánea.'
            : 'Unsure about a word? Highlight it to trigger the translation popup.'}
        </span>
      </div>

    </div>
  );
};
