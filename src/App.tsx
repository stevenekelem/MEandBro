import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useHighlightTranslation } from './hooks/useHighlightTranslation';
import { Onboarding } from './components/Onboarding';
import { NewsModule } from './components/NewsModule';
import { LiteratureModule } from './components/LiteratureModule';
import { ChatModule } from './components/ChatModule';
import { SettingsModule } from './components/SettingsModule';
import { Newspaper, BookOpen, MessageSquare, User, Volume2, Languages, X } from 'lucide-react';

const App: React.FC = () => {
  const { onboarded, nativeLanguage } = useApp();
  const [activeTab, setActiveTab] = useState<'news' | 'literature' | 'chat' | 'settings'>('news');
  const [currentTime, setCurrentTime] = useState('');

  // Floating selection translation hook
  const { result, translateText, speakText, closeBubble } = useHighlightTranslation();

  // Tick the clock for status bar
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close floating bubble when tab changes
  useEffect(() => {
    closeBubble();
  }, [activeTab, closeBubble]);

  return (
    <div className="desktop-wrapper">
      {/* Background glowing decorations */}
      <div className="camera-notch"></div>

      {/* Main mobile screen container */}
      <div className="simulator-frame">
        {onboarded ? (
          <>
            {/* Status Bar */}
            <div className="screen-header">
              <span>{currentTime}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px' }}>📶</span>
                <span style={{ fontSize: '12px' }}>🔋</span>
              </div>
            </div>

            {/* Main Screen scrollable area */}
            <div className="screen-content">
              {/* Highlight Translation overlay card */}
              {result.isOpen && (
                <div 
                  className="translate-bubble glass-card"
                  style={{
                    position: 'absolute',
                    left: `${Math.max(10, Math.min(200, result.x - 90))}px`,
                    top: `${Math.max(10, result.y - 100)}px`,
                    width: '210px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    zIndex: 9999,
                    animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      "{result.text}"
                    </span>
                    <button 
                      onClick={closeBubble}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {result.isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                      <div style={{ width: '10px', height: '10px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'voicePulse 0.5s infinite alternate' }}></div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Translating...</span>
                    </div>
                  ) : result.translation ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                        {result.translation}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        onClick={translateText}
                        style={{
                          background: 'var(--primary-gradient)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Languages size={10} />
                        <span>Translate</span>
                      </button>
                      <button
                        onClick={speakText}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Volume2 size={10} />
                        <span>Speak</span>
                      </button>
                    </div>
                  )}

                  {result.translation && (
                    <button
                      onClick={speakText}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--primary)',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '6px 0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Volume2 size={12} />
                      <span>Hear Pronunciation</span>
                    </button>
                  )}
                </div>
              )}

              {/* Render Selected Module Component */}
              {activeTab === 'news' && <NewsModule />}
              {activeTab === 'literature' && <LiteratureModule />}
              {activeTab === 'chat' && <ChatModule />}
              {activeTab === 'settings' && <SettingsModule />}
            </div>

            {/* Bottom Nav Bar */}
            <div className="bottom-nav">
              <button 
                onClick={() => setActiveTab('news')}
                className={`nav-tab ${activeTab === 'news' ? 'active' : ''}`}
              >
                <Newspaper />
                <span className="nav-tab-label">
                  {nativeLanguage === 'es' ? 'Noticias' : 'News'}
                </span>
                <div className="nav-indicator"></div>
              </button>

              <button 
                onClick={() => setActiveTab('literature')}
                className={`nav-tab ${activeTab === 'literature' ? 'active' : ''}`}
              >
                <BookOpen />
                <span className="nav-tab-label">
                  {nativeLanguage === 'es' ? 'Lecturas' : 'Literature'}
                </span>
                <div className="nav-indicator"></div>
              </button>

              <button 
                onClick={() => setActiveTab('chat')}
                className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
              >
                <MessageSquare />
                <span className="nav-tab-label">
                  {nativeLanguage === 'es' ? 'Tutor' : 'Tutor'}
                </span>
                <div className="nav-indicator"></div>
              </button>

              <button 
                onClick={() => setActiveTab('settings')}
                className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
              >
                <User />
                <span className="nav-tab-label">
                  {nativeLanguage === 'es' ? 'Progreso' : 'Progress'}
                </span>
                <div className="nav-indicator"></div>
              </button>
            </div>
          </>
        ) : (
          <Onboarding />
        )}
      </div>
    </div>
  );
};

export default App;
