import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { speakTextWithBestVoice } from '../utils/speech';
import { Book, Volume2, HelpCircle, FileText, Info } from 'lucide-react';

interface LitExcerpt {
  id: string;
  title: string;
  author: string;
  sourceLang: 'es' | 'en';
  synopsis: string;       // Storyline overview
  chapterSummary: string; // Chapter introduction summary
  lines: Array<{
    target: string;
    native: string;
  }>;
}

const LITERATURE_DATA: LitExcerpt[] = [
  {
    id: 'quijote',
    title: 'Don Quijote de la Mancha (Capítulo I)',
    author: 'Miguel de Cervantes',
    sourceLang: 'es',
    synopsis: 'Un hidalgo de la Mancha pierde la razón de tanto leer novelas de caballerías y decide lanzarse al mundo como caballero andante, buscando honor, batallas y amor cortesano.',
    chapterSummary: 'Introducción a Alonso Quijano, sus costumbres cotidianas, su dieta y cómo su obsesión con la literatura medieval lo arrastra a convertirse en Don Quijote.',
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
    id: 'principito',
    title: 'El Principito (Capítulo II)',
    author: 'Antoine de Saint-Exupéry',
    sourceLang: 'es',
    synopsis: 'Un piloto varado en el desierto del Sahara entabla amistad con un pequeño y misterioso príncipe que proviene de un asteroide lejano y viaja por el cosmos buscando respuestas.',
    chapterSummary: 'Tras sufrir una avería en su avión, el narrador despierta en el desierto al amanecer con una extraña vocecita que le pide un dibujo peculiar: un cordero.',
    lines: [
      { target: 'Viví así, solo, sin nadie con quien hablar verdaderamente,', native: 'I lived like this, alone, with no one to truly talk to,' },
      { target: 'hasta que tuve una avería en el desierto del Sahara hace seis años.', native: 'until I had a breakdown in the Sahara Desert six years ago.' },
      { target: 'Algo se había roto en mi motor.', native: 'Something had broken in my engine.' },
      { target: 'La primera noche me dormí sobre la arena,', native: 'The first night I fell asleep on the sand,' },
      { target: 'a mil millas de toda tierra habitada.', native: 'a thousand miles from any inhabited land.' },
      { target: 'Se imaginarán mi sorpresa cuando,', native: 'You can imagine my surprise when,' },
      { target: 'al romper el día, me despertó una extraña vocecita que decía:', native: 'at break of day, I was awakened by an odd little voice saying:' },
      { target: '—Por favor... ¡dibújame un cordero!', native: '—Please... draw me a sheep!' }
    ]
  },
  {
    id: 'vida_sueno',
    title: 'La Vida es Sueño (Jornada I, Escena II)',
    author: 'Pedro Calderón de la Barca',
    sourceLang: 'es',
    synopsis: 'Una obra filosófica clásica que gira en torno a Segismundo, príncipe de Polonia, encarcelado en una torre secreta desde su nacimiento por su propio padre debido a una profecía fatal.',
    chapterSummary: 'Segismundo pronuncia su célebre monólogo lamentando su cautiverio y expresando celos de la libertad que disfrutan las aves, los peces y los ríos de la naturaleza.',
    lines: [
      { target: '¡Ay mísero de mí, y ay infelice!', native: 'Ah, wretched me! Oh, unhappy man!' },
      { target: 'Apurar, cielos, pretendo,', native: 'I try to determine, heavens,' },
      { target: 'ya que me tratáis así,', native: 'since you treat me so,' },
      { target: 'qué delito cometí contra vosotros naciendo.', native: 'what crime I committed against you by being born.' },
      { target: 'Nace el ave, y con las galas que le dan belleza suma,', native: 'The bird is born, and with the finery that gives it ultimate beauty,' },
      { target: 'apenas es flor de pluma cuando las etéreas salas corta con velocidad.', native: 'it is barely a flower of feathers when it swiftly cuts the ethereal halls.' },
      { target: '¿Y yo tengo menos libertad?', native: 'And do I have less freedom?' }
    ]
  },
  {
    id: 'hamlet',
    title: 'Hamlet (Act III, Scene I)',
    author: 'William Shakespeare',
    sourceLang: 'en',
    synopsis: 'The ultimate tragedy of Prince Hamlet of Denmark, who is tasked by his father\'s ghost to avenge his murder by killing his uncle Claudius, who has usurped the throne.',
    chapterSummary: 'Hamlet delivers his iconic soliloquy reflecting on the pain of existence, the dread of the afterlife, and the choice between suicide and action.',
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
      { target: 'To sleep, chance to dream—ay, there\'s the rub:', native: 'dormir, tal vez soñar; sí, ahí está la dificultad:' }
    ]
  },
  {
    id: 'pride_prejudice',
    title: 'Pride and Prejudice (Chapter I)',
    author: 'Jane Austen',
    sourceLang: 'en',
    synopsis: 'A classic romantic novel charting the emotional development of Elizabeth Bennet, who learns the difference between superficial goodness and actual integrity.',
    chapterSummary: 'Mrs. Bennet urges her husband to visit Mr. Bingley, a wealthy young bachelor who has just leased the nearby estate of Netherfield Park, hoping to marry off one of her daughters.',
    lines: [
      { target: 'It is a truth universally acknowledged,', native: 'Es una verdad mundialmente reconocida,' },
      { target: 'that a single man in possession of a good fortune,', native: 'que un hombre soltero, dueño de una gran fortuna,' },
      { target: 'must be in want of a wife.', native: 'necesita una esposa.' },
      { target: 'However little known the feelings of such a man may be', native: 'Por poco conocidos que sean los sentimientos de tal hombre' },
      { target: 'on his first entering a neighbourhood,', native: 'al entrar por primera vez en un vecindario,' },
      { target: 'this truth is so well fixed in the minds of the surrounding families,', native: 'esta verdad está tan asentada en las mentes de las familias vecinas,' },
      { target: 'that he is considered as the rightful property of some one or other of their daughters.', native: 'que lo consideran propiedad legítima de alguna de sus hijas.' }
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
    <div className="animate-slide-up" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
      
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
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', background: 'var(--surface)' }}>
        
        {/* Book Title Header inside reader */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '8px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--primary)' }}>{selectedBook.title}</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
            By {selectedBook.author}
          </p>
        </div>

        {/* Storyline Synopsis (Advanced feature) */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.05)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          padding: '12px',
          borderRadius: '12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start'
        }}>
          <Info size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              {nativeLanguage === 'es' ? 'Sinopsis general' : 'General Synopsis'}
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {selectedBook.synopsis}
            </p>
          </div>
        </div>

        {/* Chapter Summary (Advanced feature) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border)',
          padding: '12px',
          borderRadius: '12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start'
        }}>
          <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              {nativeLanguage === 'es' ? 'Resumen del Capítulo' : 'Chapter Summary'}
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {selectedBook.chapterSummary}
            </p>
          </div>
        </div>

        {/* Paragraph text rendering block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
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
        color: 'var(--text-secondary)',
        marginBottom: '10px'
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
