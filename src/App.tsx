import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useHighlightTranslation } from './hooks/useHighlightTranslation';
import { Onboarding } from './components/Onboarding';
import { NewsModule } from './components/NewsModule';
import { LiteratureModule } from './components/LiteratureModule';
import { ChatModule } from './components/ChatModule';
import { VocabularyModule } from './components/VocabularyModule';
import { StreakHeaderMeter } from './components/StreakHeaderMeter';
import { Newspaper, BookOpen, MessageSquare, Volume2, X, GraduationCap } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { scheduleAllReminders } from './utils/notifications';

const App: React.FC = () => {
  const { 
    onboarded, 
    nativeLanguage, 
    activeTab, 
    setActiveTab, 
    notificationsEnabled, 
    notificationTimes 
  } = useApp();
  const [currentTime, setCurrentTime] = useState('');

  // Floating selection translation hook
  const { result, speakText, closeBubble, isSaved, handleSaveWord } = useHighlightTranslation();

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

  // Close floating bubble when tab changes or when in vocabulary tab
  useEffect(() => {
    closeBubble();
  }, [activeTab, closeBubble]);

  // Schedule native notifications when enabled state or times change
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      scheduleAllReminders(notificationsEnabled, notificationTimes);
    }
  }, [notificationsEnabled, notificationTimes]);

  // Listen for local notification actions
  useEffect(() => {
    let listenerHandle: any = null;

    if (Capacitor.isNativePlatform()) {
      const initListener = async () => {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          listenerHandle = await LocalNotifications.addListener(
            'localNotificationActionPerformed',
            (action) => {
              console.log('Notification action performed:', action);
              const targetTab = action.notification.extra?.tab;
              if (targetTab && targetTab !== 'translate') {
                setActiveTab(targetTab);
              }
            }
          );
        } catch (err) {
          console.error('Error setting up notification listener:', err);
        }
      };

      initListener();
    }

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [setActiveTab]);

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

            {/* Streak & Daily Progress Meter Header */}
            <StreakHeaderMeter />

            {/* Main Screen scrollable area */}
            <div className="screen-content">
              {/* Highlight Translation overlay card (disabled in Vocabulary module) */}
              {result.isOpen && activeTab !== 'vocabulary' && (
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                        {result.translation}
                      </span>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                        <button
                          onClick={speakText}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--primary)',
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
                        
                        <button
                          onClick={handleSaveWord}
                          disabled={isSaved}
                          style={{
                            background: isSaved ? 'rgba(16, 185, 129, 0.1)' : 'var(--primary-gradient)',
                            border: isSaved ? '1px solid rgba(16, 185, 129, 0.2)' : 'none',
                            borderRadius: '8px',
                            color: isSaved ? '#10b981' : 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '6px',
                            cursor: isSaved ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{isSaved ? '✓ Saved' : 'Save'}</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Render Selected Module Component */}
              {activeTab === 'news' && <NewsModule />}
              {activeTab === 'literature' && <LiteratureModule />}
              {activeTab === 'chat' && <ChatModule />}
              {activeTab === 'vocabulary' && <VocabularyModule />}
            </div>

            {/* Bottom Nav Bar (4 tabs) */}
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
                onClick={() => setActiveTab('vocabulary')}
                className={`nav-tab ${activeTab === 'vocabulary' ? 'active' : ''}`}
              >
                <GraduationCap />
                <span className="nav-tab-label">
                  {nativeLanguage === 'es' ? 'Vocabulario' : 'Vocabulary'}
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
