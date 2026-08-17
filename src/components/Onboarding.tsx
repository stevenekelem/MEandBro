import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, ArrowRight, Check, Compass } from 'lucide-react';
import { Auth } from './Auth';
import { AppWalkthroughModal } from './AppWalkthroughModal';

export const Onboarding: React.FC = () => {
  const { nativeLanguage, setNativeLanguage, level, setLevel, setOnboarded } = useApp();
  const [step, setStep] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const openAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
      setShowTourModal(true); // Automatically launch feature walkthrough after selecting language & level
    } else {
      setOnboarded(true);
    }
  };

  return (
    <div className="onboarding-container animate-slide-up" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '24px',
      justifyContent: 'space-between',
      background: 'radial-gradient(circle at top right, hsla(263, 80%, 65%, 0.1) 0%, transparent 60%)',
      position: 'relative'
    }}>
      {/* Walkthrough Carousel Modal */}
      <AppWalkthroughModal 
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        onSkip={() => {
          setShowTourModal(false);
        }}
        onOpenAuth={(mode) => {
          setShowTourModal(false);
          openAuth(mode || 'signup');
        }}
      />

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(5, 6, 8, 0.95)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <Auth 
            initialMode={authMode}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={() => {
              setShowAuthModal(false);
              setOnboarded(true); // Complete onboarding directly on successful auth
            }}
          />
        </div>
      )}

      {/* Upper Brand Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '6px', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setShowTourModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--primary-glow)',
            border: '1px solid var(--border-glow)',
            padding: '6px 12px',
            borderRadius: '99px',
            color: 'var(--primary)',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
        >
          <Compass size={13} />
          <span>{nativeLanguage === 'es' ? 'Recorrido' : 'App Tour'}</span>
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => openAuth('signup')}
            style={{
              background: 'var(--primary-gradient)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '10px',
              color: 'white',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {nativeLanguage === 'es' ? 'Crear Cuenta' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={() => openAuth('login')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              padding: '6px 12px',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {nativeLanguage === 'es' ? 'Ingresar' : 'Sign In'}
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {step === 1 ? (nativeLanguage === 'es' ? 'Elige tu Idioma' : 'Choose Language') :
           step === 2 ? (nativeLanguage === 'es' ? 'Tu Nivel de Fluidez' : 'Your Learning Level') :
           (nativeLanguage === 'es' ? '¡Todo Listo!' : 'You Are Ready!')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px', padding: '0 10px' }}>
          {step === 1 && (nativeLanguage === 'es' ? 'Selecciona tu lengua materna para adaptar las explicaciones.' : 'Select your native language to adapt tutor explanations.')}
          {step === 2 && (nativeLanguage === 'es' ? 'Ajustaremos las noticias, lecturas y el tutor a tu nivel.' : 'We will customize news, literature, and the tutor to your pace.')}
          {step === 3 && (nativeLanguage === 'es' ? 'Explora noticias, literatura clásica y habla con tu tutor.' : 'Explore current news, classic literature, and chat with your voice tutor.')}
        </p>
      </div>

      {/* Main Steps Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: '30px 0' }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={() => setNativeLanguage('en')}
              className={`glass-card ${nativeLanguage === 'en' ? 'active-selection' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '20px',
                border: nativeLanguage === 'en' ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                background: nativeLanguage === 'en' ? 'var(--primary-glow)' : 'var(--glass-bg)',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '20px',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '36px' }}>🇺🇸</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>English speaker</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>I want to learn Spanish / Quiero aprender español.</div>
              </div>
              {nativeLanguage === 'en' && <div style={{ background: 'var(--primary)', borderRadius: '50%', padding: '4px', color: 'white' }}><Check size={16} /></div>}
            </button>

            <button
              onClick={() => setNativeLanguage('es')}
              className={`glass-card ${nativeLanguage === 'es' ? 'active-selection' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '20px',
                border: nativeLanguage === 'es' ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                background: nativeLanguage === 'es' ? 'var(--primary-glow)' : 'var(--glass-bg)',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '20px',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '36px' }}>🇪🇸</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>Hablante Español</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>I want to learn English / Quiero aprender inglés.</div>
              </div>
              {nativeLanguage === 'es' && <div style={{ background: 'var(--primary)', borderRadius: '50%', padding: '4px', color: 'white' }}><Check size={16} /></div>}
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { id: 'basic', title: nativeLanguage === 'es' ? 'Básico / Principiante' : 'Basic Grammar', desc: nativeLanguage === 'es' ? 'Vocabulario simple, traducciones directas y gramática del presente.' : 'Simple vocabulary, direct translation helpers, and basic verbs.' },
              { id: 'intermediate', title: nativeLanguage === 'es' ? 'Intermedio' : 'Intermediate Fluency', desc: nativeLanguage === 'es' ? 'Estructuras moderadas, giros idiomáticos y conversaciones fluidas.' : 'Moderate idioms, natural sentence structures, and fluid conversations.' },
              { id: 'advanced', title: nativeLanguage === 'es' ? 'Avanzado' : 'Advanced Literary', desc: nativeLanguage === 'es' ? 'Lectura en idioma nativo completo, debates culturales y gramática compleja.' : 'Native-level discussions, advanced literature analysis, and complex registers.' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setLevel(item.id as any)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px 20px',
                  border: level === item.id ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                  background: level === item.id ? 'var(--primary-glow)' : 'var(--glass-bg)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>{item.title}</div>
                  {level === item.id && <div style={{ background: 'var(--primary)', borderRadius: '50%', padding: '2px', color: 'white' }}><Check size={12} /></div>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>{item.desc}</div>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--primary-gradient)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 10px 25px rgba(124, 58, 237, 0.4)',
              animation: 'voicePulse 2s infinite'
            }}>
              <Globe size={40} color="white" />
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {nativeLanguage === 'es' ? '¡Tu tutor inteligente te espera!' : 'Your Expert Tutor is Ready!'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '0 20px', marginTop: '8px', lineHeight: '1.5' }}>
                {nativeLanguage === 'es' 
                  ? 'Aprende leyendo noticias del día, analizando literatura clásica, o conversando por voz directamente con nuestro tutor con inteligencia artificial.'
                  : 'Learn by reading customized news stories, analyzing classic literature, or speaking directly with our voice-enabled AI tutor.'}
              </p>
            </div>

            <div style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '4px'
            }}>
              <button
                type="button"
                onClick={() => setShowTourModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'var(--primary-glow)',
                  border: '1px solid var(--border-glow)',
                  padding: '12px',
                  borderRadius: '14px',
                  color: 'var(--primary)',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <Compass size={16} />
                <span>{nativeLanguage === 'es' ? 'Ver Recorrido Interactivo' : 'Take Interactive Feature Tour'}</span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border)',
                    padding: '12px',
                    borderRadius: '14px',
                    color: 'var(--text-primary)',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ✨ {nativeLanguage === 'es' ? 'Crear Cuenta' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border)',
                    padding: '12px',
                    borderRadius: '14px',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🔑 {nativeLanguage === 'es' ? 'Iniciar Sesión' : 'Sign In'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Button */}
      <button
        onClick={handleNext}
        className="btn-primary"
        style={{
          width: '100%',
          justifyContent: 'center',
          padding: '16px',
          borderRadius: '18px',
          fontWeight: '700',
          fontSize: '16px'
        }}
      >
        <span>
          {step === 3 
            ? (nativeLanguage === 'es' ? 'Empezar Aprendizaje' : 'Start Learning') 
            : (nativeLanguage === 'es' ? 'Siguiente' : 'Continue')}
        </span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
};
