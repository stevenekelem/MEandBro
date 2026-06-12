import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { VocabWord } from '../context/AppContext';
import { speakTextWithBestVoice } from '../utils/speech';
import { Auth } from './Auth';
import { Trash2, RotateCcw, Volume2, Award, BookOpen, Mic, RefreshCw, Cloud, LogOut } from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const {
    nativeLanguage,
    level,
    setLevel,
    speechRate,
    setSpeechRate,
    stats,
    savedVocabulary,
    removeWord,
    resetAllData,
    user,
    authLoading
  } = useApp();

  const [showAuthModal, setShowAuthModal] = useState(false);

  const speakVocab = (word: string) => {
    const targetLang = nativeLanguage === 'en' ? 'es' : 'en';
    speakTextWithBestVoice(word, targetLang, speechRate);
  };

  const handleReset = () => {
    if (confirm(nativeLanguage === 'es' ? '¿Estás seguro de que deseas borrar todo tu progreso y vocabulario?' : 'Are you sure you want to reset all progress and vocabulary?')) {
      resetAllData();
    }
  };

  return (
    <div className="animate-slide-up" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', position: 'relative', height: '100%' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>
            {nativeLanguage === 'es' ? 'Tu Progreso' : 'Your Progress'}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {nativeLanguage === 'es' ? 'Revisa tus estadísticas y vocabulario' : 'Review your learning stats & vocabulary'}
          </p>
        </div>
      </div>

      {/* Cloud Sync & Auth Banner */}
      {!authLoading && (
        <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Cloud size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {user ? (nativeLanguage === 'es' ? 'Sincronización en la Nube' : 'Cloud Synchronized') : (nativeLanguage === 'es' ? 'Guarda tu Progreso' : 'Backup your progress')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {user ? `${user.email}` : (nativeLanguage === 'es' ? 'Inicia sesión para no perder tus datos.' : 'Sign in to access your stats from any device.')}
              </div>
            </div>
          </div>
          
          {user ? (
            <button
              onClick={resetAllData}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--danger)',
                fontWeight: '600',
                fontSize: '11px',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                alignSelf: 'flex-start',
                transition: 'all 0.2s ease'
              }}
            >
              <LogOut size={12} />
              <span>{nativeLanguage === 'es' ? 'Cerrar Sesión' : 'Sign Out'}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                background: 'var(--primary-gradient)',
                border: 'none',
                color: 'white',
                fontWeight: '600',
                fontSize: '11px',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                alignSelf: 'flex-start',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)'
              }}
            >
              {nativeLanguage === 'es' ? 'Iniciar Sesión / Registrarse' : 'Log In / Sign Up'}
            </button>
          )}
        </div>
      )}

      {/* Stats Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        
        {/* Stat 1: Translations */}
        <div className="glass-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <BookOpen size={18} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.wordsTranslated}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              {nativeLanguage === 'es' ? 'Palabras Traducidas' : 'Words Lookup'}
            </div>
          </div>
        </div>

        {/* Stat 2: Chats */}
        <div className="glass-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--primary)' }}>
            <RefreshCw size={18} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.chatSessions}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              {nativeLanguage === 'es' ? 'Sesiones Tutor' : 'Tutor Chats'}
            </div>
          </div>
        </div>

        {/* Stat 3: Pronunciations */}
        <div className="glass-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
            <Mic size={18} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.pronunciationAttempts}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              {nativeLanguage === 'es' ? 'Intentos de Habla' : 'Speech Drills'}
            </div>
          </div>
        </div>

        {/* Stat 4: Accuracy */}
        <div className="glass-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--success-glow)', color: 'var(--success)' }}>
            <Award size={18} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.avgPronunciationScore}%</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              {nativeLanguage === 'es' ? 'Precisión Promedio' : 'Avg Speech Score'}
            </div>
          </div>
        </div>

      </div>

      {/* Vocabulary Pocket Dictionary */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📖 {nativeLanguage === 'es' ? 'Tu Diccionario (' + savedVocabulary.length + ')' : 'My Dictionary (' + savedVocabulary.length + ')'}</span>
        </h3>
        
        {savedVocabulary.length === 0 ? (
          <div style={{ padding: '18px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            {nativeLanguage === 'es' 
              ? 'No tienes palabras guardadas aún. ¡Mantén presionado cualquier texto en Noticias o Literatura para agregarlas!'
              : 'Your pocket dictionary is empty. Highlight and translate words in News or Lit to save them!'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
            {savedVocabulary.map((vocab: VocabWord) => (
              <div key={vocab.word} style={{
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
                    onClick={() => speakVocab(vocab.word)}
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
                    <Volume2 size={13} />
                  </button>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{vocab.word}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>→</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{vocab.translation}</span>
                </div>
                
                <button
                  onClick={() => removeWord(vocab.word)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adjust target level */}
      <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          ⚙️ {nativeLanguage === 'es' ? 'Cambiar Nivel' : 'Change Proficiency'}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['basic', 'intermediate', 'advanced'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevel(lvl as any)}
              style={{
                flex: 1,
                background: level === lvl ? 'var(--primary)' : 'var(--surface)',
                border: `1px solid ${level === lvl ? 'var(--primary)' : 'var(--border)'}`,
                color: 'white',
                fontSize: '11px',
                fontWeight: '600',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {lvl.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Speed synthesis adjustment */}
      <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
          <span>🔊 {nativeLanguage === 'es' ? 'Velocidad de Voz' : 'Dictation Speed'}</span>
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

      {/* Reset progress */}
      <button
        onClick={handleReset}
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--danger)',
          padding: '12px',
          borderRadius: '14px',
          fontWeight: '700',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
      >
        <RotateCcw size={14} />
        <span>{nativeLanguage === 'es' ? 'Reiniciar Datos' : 'Reset Progress'}</span>
      </button>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 12, 41, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <Auth 
            onClose={() => setShowAuthModal(false)} 
            onAuthSuccess={() => setShowAuthModal(false)}
          />
        </div>
      )}

    </div>
  );
};
