import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Newspaper, 
  BookOpen, 
  MessageSquare, 
  GraduationCap, 
  Lightbulb, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  X
} from 'lucide-react';

interface AppWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
  onSkip?: () => void;
}

export const AppWalkthroughModal: React.FC<AppWalkthroughModalProps> = ({ 
  isOpen, 
  onClose,
  onOpenAuth,
  onSkip
}) => {
  const { nativeLanguage } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if (e.key === 'ArrowRight' && isOpen) handleNext();
      if (e.key === 'ArrowLeft' && isOpen) handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlide]);

  if (!isOpen) return null;

  const slides = [
    {
      id: 'news',
      icon: <Newspaper size={32} className="text-sky-400" />,
      badge: nativeLanguage === 'es' ? 'Módulo 1 · Noticias' : 'Module 1 · Daily News',
      badgeColor: 'rgba(56, 189, 248, 0.2)',
      badgeTextColor: '#38bdf8',
      title: nativeLanguage === 'es' ? 'Noticias Adaptadas a tu Nivel' : 'Level-Scaled Real-World News',
      description: nativeLanguage === 'es'
        ? 'Lee historias y noticias actuales calibradas exactamente para principiantes, intermedios o avanzados con resúmenes instantáneos.'
        : 'Read current global and cultural news calibrated directly to your fluency level with instant word lookups and audio playback.',
      tipTitle: nativeLanguage === 'es' ? '💡 Consejo: Lee en Voz Alta a Diario' : '💡 Learning Tip: Read Out Loud Daily',
      tipContent: nativeLanguage === 'es'
        ? 'Pronunciar las frases en voz alta mientras lees refuerza los patrones neuronales de dicción, acelerando tu comprensión auditiva y fluidez hablada.'
        : 'Reading sentences aloud activates vocal muscle memory and strengthens auditory retention, dramatically boosting your real-world conversation speed.',
      features: [
        nativeLanguage === 'es' ? '3 niveles de dificultad por artículo' : '3 fluency tiers per article',
        nativeLanguage === 'es' ? 'Selección táctil para traducir palabras' : 'Tap any word to translate & hear audio',
        nativeLanguage === 'es' ? 'Preguntas de comprensión interactivas' : 'Interactive comprehension quizzes'
      ]
    },
    {
      id: 'literature',
      icon: <BookOpen size={32} className="text-amber-400" />,
      badge: nativeLanguage === 'es' ? 'Módulo 2 · Literatura' : 'Module 2 · Classic Literature',
      badgeColor: 'rgba(251, 191, 36, 0.2)',
      badgeTextColor: '#fbbf24',
      title: nativeLanguage === 'es' ? 'Obras Maestras Bilingües' : 'Bilingual Classic Masterpieces',
      description: nativeLanguage === 'es'
        ? 'Sumérgete en libros clásicos capítulo a capítulo con traducción paralela en español e inglés y narración por voz.'
        : 'Immerse yourself in timeless literature chapter by chapter with parallel translations, character context, and natural speech playback.',
      tipTitle: nativeLanguage === 'es' ? '🎧 Consejo: Técnica de Shadowing (Sombra)' : '🎧 Learning Tip: Sentence Shadowing',
      tipContent: nativeLanguage === 'es'
        ? 'Escucha una línea con el reproductor de voz, pausa inmediatamente y repite la oración imitando la entonación y ritmo exactos.'
        : 'Listen to a sentence using the audio player, pause, and shadow (repeat) the words aloud mimicking the speaker’s exact rhythm and intonation.',
      features: [
        nativeLanguage === 'es' ? 'Texto bilingüe lado a lado' : 'Side-by-side bilingual reading',
        nativeLanguage === 'es' ? 'Control de velocidad de audio' : 'Adjustable audio playback speed',
        nativeLanguage === 'es' ? 'Guarda palabras difíciles al instante' : 'Star difficult phrases for study'
      ]
    },
    {
      id: 'tutor',
      icon: <MessageSquare size={32} className="text-purple-400" />,
      badge: nativeLanguage === 'es' ? 'Módulo 3 · Tutor IA' : 'Module 3 · AI Language Tutor',
      badgeColor: 'rgba(168, 85, 247, 0.2)',
      badgeTextColor: '#c084fc',
      title: nativeLanguage === 'es' ? 'Tutor Personal y Lecciones por Hilos' : 'AI Tutor & Multi-Session Lessons',
      description: nativeLanguage === 'es'
        ? 'Practica conversaciones abiertas o lecciones de gramática paso a paso. Guarda tus chats anteriores por tema como en ChatGPT.'
        : 'Practice natural conversations or structured grammar lessons. Revisit and organize previous chats by topic or lesson just like ChatGPT.',
      tipTitle: nativeLanguage === 'es' ? '📚 Consejo: Revisa Chats Anteriores' : '📚 Learning Tip: Review Past Lesson Chats',
      tipContent: nativeLanguage === 'es'
        ? 'Guarda y vuelve a revisar tus conversaciones de lecciones específicas (como Ser vs Estar o Tiempos Pasados) para consolidar tu gramática.'
        : 'Revisit previous lesson threads (e.g. Ser vs Estar or Past Tenses) periodically to reinforce grammar points and track your progress over time.',
      features: [
        nativeLanguage === 'es' ? 'Historial de chats guardados por tema' : 'Multi-session chat history by topic',
        nativeLanguage === 'es' ? 'Guía de estudio estructurada por niveles' : 'Structured grammar study guide',
        nativeLanguage === 'es' ? 'Retroalimentación y corrección instantánea' : 'Instant grammar feedback & tips'
      ]
    },
    {
      id: 'vocabulary',
      icon: <GraduationCap size={32} className="text-emerald-400" />,
      badge: nativeLanguage === 'es' ? 'Módulo 4 · Vocabulario' : 'Module 4 · Smart Flashcards',
      badgeColor: 'rgba(52, 211, 153, 0.2)',
      badgeTextColor: '#34d399',
      title: nativeLanguage === 'es' ? 'Repetición Espaciada y XP' : 'Spaced Repetition & Daily XP',
      description: nativeLanguage === 'es'
        ? 'Todas las palabras que guardas en lecturas y noticias se organizan automáticamente en tarjetas de estudio con conjugaciones.'
        : 'Every word you highlight while reading automatically joins your personal flashcard deck with pronunciations, examples, and conjugations.',
      tipTitle: nativeLanguage === 'es' ? '🧠 Consejo: Práctica Diaria de 5 Minutos' : '🧠 Learning Tip: Spaced Recall Sessions',
      tipContent: nativeLanguage === 'es'
        ? 'Practicar 10-15 tarjetas al día crea un recuerdo duradero en la memoria a largo plazo mucho más efectivo que sesiones largas esporádicas.'
        : 'Testing yourself with 10-15 flashcards daily reinforces long-term memory far more effectively than sporadic marathon cram sessions.',
      features: [
        nativeLanguage === 'es' ? 'Tarjetas interactivas con vuelta táctil' : 'Interactive flip flashcard practice',
        nativeLanguage === 'es' ? 'Tablas completas de conjugación' : 'Full verb conjugation tables',
        nativeLanguage === 'es' ? 'Rachas y puntos de experiencia (XP)' : 'Daily streaks and XP gamification'
      ]
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 6, 15, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'linear-gradient(165deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 12, 41, 0.98) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '28px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(124, 58, 237, 0.2)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glowing top ambient gradient */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '260px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Top Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: slide.badgeColor,
            border: `1px solid ${slide.badgeTextColor}40`,
            padding: '5px 12px',
            borderRadius: '99px',
            color: slide.badgeTextColor,
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.5px'
          }}>
            {slide.icon}
            <span>{slide.badge}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                if (onSkip) onSkip();
                else onClose();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '4px 10px',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {nativeLanguage === 'es' ? 'Omitir' : 'Skip Tour'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#fff')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Slide Title & Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '800',
            color: '#fff',
            lineHeight: '1.25',
            margin: 0
          }}>
            {slide.title}
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            margin: 0
          }}>
            {slide.description}
          </p>
        </div>

        {/* Key Features List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '12px 14px',
          position: 'relative',
          zIndex: 1
        }}>
          {slide.features.map((feat, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
              <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* High-Impact Pedagogical Learning Tip Box */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(236, 72, 153, 0.12) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: '18px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          position: 'relative',
          zIndex: 1,
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '800',
            color: '#f472b6',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Lightbulb size={15} style={{ color: '#fbbf24' }} />
            <span>{slide.tipTitle}</span>
          </div>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.92)',
            lineHeight: '1.5',
            margin: 0
          }}>
            {slide.tipContent}
          </p>
        </div>

        {/* Carousel Progress Indicators */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 0'
        }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              style={{
                width: currentSlide === idx ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: currentSlide === idx 
                  ? 'var(--primary-gradient)' 
                  : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          ))}
        </div>

        {/* Footer Navigation Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginTop: '4px'
        }}>
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            style={{
              padding: '10px 14px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: currentSlide === 0 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: currentSlide === 0 ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeft size={16} />
            <span>{nativeLanguage === 'es' ? 'Anterior' : 'Back'}</span>
          </button>

          {onOpenAuth && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth('login');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {nativeLanguage === 'es' ? 'Iniciar Sesión' : 'Sign In'}
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>•</span>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth('signup');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {nativeLanguage === 'es' ? 'Crear Cuenta' : 'Create Account'}
              </button>
            </div>
          )}

          <button
            onClick={handleNext}
            className="btn-primary"
            style={{
              padding: '10px 18px',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>
              {currentSlide === slides.length - 1 
                ? (nativeLanguage === 'es' ? '¡Empezar!' : 'Get Started!') 
                : (nativeLanguage === 'es' ? 'Siguiente' : 'Next')}
            </span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
