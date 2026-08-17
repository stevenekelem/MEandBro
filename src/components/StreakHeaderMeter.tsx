import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Flame, Star, Award, CheckCircle2, X, BookOpen, Newspaper, MessageSquare, GraduationCap, Compass } from 'lucide-react';
import { AppWalkthroughModal } from './AppWalkthroughModal';

export const StreakHeaderMeter: React.FC = () => {
  const { stats, nativeLanguage, user } = useApp();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);

  const dailyPoints = stats.dailyPoints || 0;
  const dailyGoal = stats.dailyGoal || 50;
  const streakCount = stats.streakCount || 0;
  const totalScore = stats.totalScore || 0;

  const progressPercent = Math.min(100, Math.round((dailyPoints / dailyGoal) * 100));
  const isGoalReached = dailyPoints >= dailyGoal;

  return (
    <>
      {/* Top Header Meter Bar */}
      <div 
        onClick={() => setShowDetailModal(true)}
        style={{
          padding: '8px 16px',
          background: 'rgba(30, 27, 75, 0.55)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none',
          zIndex: 80,
          transition: 'all 0.2s ease'
        }}
      >
        {/* Streak Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: streakCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface)',
          border: streakCount > 0 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '800',
          color: streakCount > 0 ? '#fbbf24' : 'var(--text-muted)'
        }}>
          <Flame size={15} style={{ color: streakCount > 0 ? '#f59e0b' : 'var(--text-muted)', filter: streakCount > 0 ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' : 'none' }} />
          <span>{streakCount} {nativeLanguage === 'es' ? 'días' : 'd'}</span>
        </div>

        {/* Center Progress Meter */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '180px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>
            <span>{nativeLanguage === 'es' ? 'Meta diaria' : 'Daily Goal'}</span>
            <span style={{ color: isGoalReached ? '#10b981' : 'white' }}>
              {isGoalReached ? (
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <CheckCircle2 size={10} /> {dailyPoints}/{dailyGoal} XP
                </span>
              ) : (
                `${dailyPoints}/${dailyGoal} XP`
              )}
            </span>
          </div>

          <div style={{
            height: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: isGoalReached 
                ? 'linear-gradient(90deg, #10b981, #34d399)' 
                : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
              borderRadius: '10px',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isGoalReached ? '0 0 10px rgba(16, 185, 129, 0.6)' : '0 0 8px rgba(139, 92, 246, 0.5)'
            }} />
          </div>
        </div>

        {/* Total Score XP Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '800',
          color: '#c084fc'
        }}>
          <Star size={13} style={{ fill: '#c084fc', color: '#c084fc' }} />
          <span>{totalScore}</span>
        </div>
      </div>

      {/* Modal Detail view */}
      {showDetailModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 12, 41, 0.8)',
          backdropFilter: 'blur(12px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(30, 27, 75, 0.95)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '24px',
            maxWidth: '340px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowDetailModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--surface)',
                border: 'none',
                color: 'var(--text-muted)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                display: 'inline-flex', 
                padding: '12px', 
                borderRadius: '50%', 
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                marginBottom: '8px'
              }}>
                <Flame size={32} style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.8))' }} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>
                {streakCount} {nativeLanguage === 'es' ? 'Días en Racha 🔥' : 'Day Streak 🔥'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {nativeLanguage === 'es'
                  ? '¡Completa actividades cada día para aumentar tu racha y ganar puntos de bonificación!'
                  : 'Complete activities every day to build your streak and earn bonus points!'}
              </p>
            </div>

            {/* Daily Fill Progress Card */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700' }}>
                <span style={{ color: 'var(--text-muted)' }}>{nativeLanguage === 'es' ? 'Progreso de hoy' : "Today's Progress"}</span>
                <span style={{ color: isGoalReached ? '#10b981' : '#c084fc' }}>
                  {dailyPoints} / {dailyGoal} XP
                </span>
              </div>

              <div style={{
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: isGoalReached 
                    ? 'linear-gradient(90deg, #10b981, #34d399)' 
                    : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                  borderRadius: '10px'
                }} />
              </div>

              {isGoalReached && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
                  <Award size={14} />
                  <span>{nativeLanguage === 'es' ? '¡Meta diaria alcanzada! +25 XP Bonus' : 'Daily goal reached! +25 XP Bonus'}</span>
                </div>
              )}
            </div>

            {/* Points Guide */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {nativeLanguage === 'es' ? 'Puntos por Actividad' : 'Activity Rewards'}
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Newspaper size={16} style={{ color: '#38bdf8' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>{nativeLanguage === 'es' ? 'Noticia' : 'Article'}</div>
                    <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '800' }}>+10 XP</div>
                  </div>
                </div>

                <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={16} style={{ color: '#a78bfa' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>{nativeLanguage === 'es' ? 'Capítulo' : 'Chapter'}</div>
                    <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '800' }}>+25 XP</div>
                  </div>
                </div>

                <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} style={{ color: '#ec4899' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>{nativeLanguage === 'es' ? 'Tutor' : 'Tutor'}</div>
                    <div style={{ fontSize: '10px', color: '#ec4899', fontWeight: '800' }}>+25 XP</div>
                  </div>
                </div>

                <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={16} style={{ color: '#f59e0b' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>{nativeLanguage === 'es' ? 'Tarjetas' : 'Flashcards'}</div>
                    <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '800' }}>+1 XP ({nativeLanguage === 'es' ? 'Máx 20/día' : 'Max 20/day'})</div>
                  </div>
                </div>
              </div>
            </div>

            {!user && (
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setShowTourModal(true);
                }}
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  color: '#c084fc',
                  padding: '10px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Compass size={14} />
                <span>{nativeLanguage === 'es' ? 'Ver Guía de Módulos y Consejos' : 'View Module Guide & Tips'}</span>
              </button>
            )}

            <button
              onClick={() => setShowDetailModal(false)}
              style={{
                background: 'var(--primary-gradient)',
                border: 'none',
                color: 'white',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '4px'
              }}
            >
              {nativeLanguage === 'es' ? '¡Entendido!' : 'Got it!'}
            </button>
          </div>
        </div>
      )}

      {/* App Walkthrough Tour Modal */}
      <AppWalkthroughModal 
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
      />
    </>
  );
};
