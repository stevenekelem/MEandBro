import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { VocabWord } from '../context/AppContext';
import { speakTextWithBestVoice } from '../utils/speech';
import { Auth } from './Auth';
import { 
  Settings, Volume2, Trash2, Search, Sparkles, 
  RotateCcw, Check, X, BookOpen, 
  GraduationCap, Eye, Cloud, LogOut, Bell
} from 'lucide-react';
import { sendTestNotification } from '../utils/notifications';

export const VocabularyModule: React.FC = () => {
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
    authLoading,
    notificationsEnabled,
    setNotificationsEnabled,
    notificationTimes,
    setNotificationTimes
  } = useApp();

  const [moduleTab, setModuleTab] = useState<'list' | 'flashcards'>('list');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ correct: number; incorrect: number }>({ correct: 0, incorrect: 0 });

  const speakVocab = (e: React.MouseEvent, word: string) => {
    e.stopPropagation(); // Prevent card toggle expansion
    const targetLang = nativeLanguage === 'en' ? 'es' : 'en';
    speakTextWithBestVoice(word, targetLang, speechRate);
  };

  const handleReset = () => {
    if (confirm(nativeLanguage === 'es' ? '¿Estás seguro de que deseas borrar todo tu progreso y vocabulario?' : 'Are you sure you want to reset all progress and vocabulary?')) {
      resetAllData();
      setShowSettings(false);
    }
  };

  // Vocabulary filters
  const partOfSpeechOptions = [
    { value: 'all', label: nativeLanguage === 'es' ? 'Todos' : 'All' },
    { value: 'noun', label: nativeLanguage === 'es' ? 'Sustantivos' : 'Nouns' },
    { value: 'verb', label: nativeLanguage === 'es' ? 'Verbos' : 'Verbs' },
    { value: 'adjective', label: nativeLanguage === 'es' ? 'Adjetivos' : 'Adjectives' },
    { value: 'adverb', label: nativeLanguage === 'es' ? 'Adverbios' : 'Adverbs' },
    { value: 'phrase', label: nativeLanguage === 'es' ? 'Frases' : 'Phrases' },
    { value: 'general', label: nativeLanguage === 'es' ? 'General' : 'General' }
  ];

  // Filter & Search Logic
  const filteredVocabulary = useMemo(() => {
    return savedVocabulary.filter(vocab => {
      // 1. Part of Speech match
      let posMatch = true;
      if (selectedFilter !== 'all') {
        const itemPos = (vocab.partOfSpeech || '').toLowerCase().trim();
        if (selectedFilter === 'general') {
          // Fallback if part of speech is empty or none of the main ones
          posMatch = !itemPos || !['noun', 'verb', 'adjective', 'adverb', 'phrase'].includes(itemPos);
        } else {
          posMatch = itemPos === selectedFilter;
        }
      }
      // 2. Search query match
      const query = searchQuery.toLowerCase().trim();
      const textMatch = !query || 
        vocab.word.toLowerCase().includes(query) || 
        vocab.translation.toLowerCase().includes(query) || 
        (vocab.definition || '').toLowerCase().includes(query);
        
      return posMatch && textMatch;
    });
  }, [savedVocabulary, selectedFilter, searchQuery]);

  // Flashcards source
  const flashcardDeck = useMemo(() => {
    // Shuffled subset of current filtered vocabulary
    return [...filteredVocabulary].sort(() => 0.5 - Math.random());
  }, [filteredVocabulary, cardIndex === 0 && !isFlipped]); // reshuffle only when resetting/first load

  const activeCard = flashcardDeck[cardIndex];

  const handleFlashcardAnswer = (correct: boolean) => {
    setIsFlipped(false);
    if (correct) {
      setSessionResults(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setSessionResults(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
    
    // Animate transition delay
    setTimeout(() => {
      if (cardIndex < flashcardDeck.length - 1) {
        setCardIndex(prev => prev + 1);
      } else {
        // Wrap around or show end session
        setCardIndex(0);
      }
    }, 200);
  };

  const resetFlashcards = () => {
    setCardIndex(0);
    setIsFlipped(false);
    setSessionResults({ correct: 0, incorrect: 0 });
  };

  const getVerbConjugations = (conjugations: any) => {
    if (!conjugations) return null;
    // Handle both stringified JSON and direct object structures
    let parsed = conjugations;
    if (typeof conjugations === 'string') {
      try { parsed = JSON.parse(conjugations); } catch(e) { return null; }
    }
    return parsed?.present || parsed;
  };

  return (
    <div className="animate-slide-up" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraduationCap style={{ color: 'var(--primary)' }} />
            <span>{nativeLanguage === 'es' ? 'Vocabulario y Progreso' : 'Vocab & Progress'}</span>
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {nativeLanguage === 'es' ? 'Estudia tus palabras guardadas' : 'Study your personal language bank'}
          </p>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="icon-button"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '8px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '4px',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <button
          onClick={() => { setModuleTab('list'); resetFlashcards(); }}
          style={{
            flex: 1,
            background: moduleTab === 'list' ? 'var(--primary-gradient)' : 'transparent',
            color: moduleTab === 'list' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            padding: '8px',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          📖 {nativeLanguage === 'es' ? 'Diccionario' : 'Word Bank'}
        </button>
        <button
          onClick={() => { setModuleTab('flashcards'); resetFlashcards(); }}
          style={{
            flex: 1,
            background: moduleTab === 'flashcards' ? 'var(--primary-gradient)' : 'transparent',
            color: moduleTab === 'flashcards' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            padding: '8px',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          🗂️ {nativeLanguage === 'es' ? 'Tarjetas' : 'Flashcards'}
        </button>
      </div>

      {/* Main Workspace Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        
        {moduleTab === 'list' ? (
          <>
            {/* Search & Stats Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder={nativeLanguage === 'es' ? 'Buscar palabra o traducción...' : 'Search word or translation...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                />
              </div>

              {/* POS Filter Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '6px', 
                overflowX: 'auto', 
                paddingBottom: '4px',
                scrollbarWidth: 'none'
              }}>
                {partOfSpeechOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedFilter(opt.value)}
                    style={{
                      whiteSpace: 'nowrap',
                      background: selectedFilter === opt.value ? 'var(--primary)' : 'var(--surface)',
                      border: `1px solid ${selectedFilter === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                      color: 'white',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vocabulary list grid */}
            {filteredVocabulary.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                gap: '12px'
              }}>
                <BookOpen size={48} style={{ color: 'var(--border)', strokeWidth: 1.5 }} />
                <div style={{ fontSize: '13px' }}>
                  {searchQuery || selectedFilter !== 'all'
                    ? (nativeLanguage === 'es' ? 'No se encontraron resultados para los filtros seleccionados.' : 'No saved words found matching your search.')
                    : (nativeLanguage === 'es' ? 'Tu diccionario está vacío. Guarda palabras en las secciones de Noticias o Literatura.' : 'Your dictionary is empty. Save words from News or Lit to build your database.')}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px' }}>
                {filteredVocabulary.map((vocab: VocabWord) => {
                  const isExpanded = expandedWord === vocab.word;
                  const conjugations = getVerbConjugations(vocab.conjugations);
                  
                  return (
                    <div
                      key={vocab.word}
                      onClick={() => setExpandedWord(isExpanded ? null : vocab.word)}
                      className="glass-card"
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: isExpanded ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border)',
                        background: isExpanded ? 'rgba(139, 92, 246, 0.04)' : 'var(--surface)'
                      }}
                    >
                      {/* Word Header Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button 
                            onClick={(e) => speakVocab(e, vocab.word)}
                            className="icon-button"
                            style={{
                              background: 'var(--bg-app)',
                              border: 'none',
                              color: 'var(--primary)',
                              padding: '6px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Volume2 size={14} />
                          </button>
                          
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{vocab.word}</span>
                              {vocab.partOfSpeech && (
                                <span style={{
                                  fontSize: '9px',
                                  textTransform: 'uppercase',
                                  background: 'rgba(139, 92, 246, 0.15)',
                                  color: '#a78bfa',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontWeight: '700'
                                }}>
                                  {vocab.partOfSpeech}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {vocab.translation}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeWord(vocab.word); }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Word Details */}
                      {isExpanded && (
                        <div 
                          className="animate-slide-up" 
                          style={{ 
                            marginTop: '12px', 
                            paddingTop: '12px', 
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            cursor: 'default'
                          }}
                          onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking details
                        >
                          {/* Definition */}
                          {vocab.definition ? (
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                                {nativeLanguage === 'es' ? 'Definición' : 'Definition'}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                {vocab.definition}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                              <Sparkles size={12} style={{ color: 'var(--primary)' }} />
                              <span>{nativeLanguage === 'es' ? 'Enriqueciendo traducción...' : 'Enriching detailed meaning...'}</span>
                            </div>
                          )}

                          {/* Example Sentence */}
                          {vocab.exampleSentence && (
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                {nativeLanguage === 'es' ? 'Ejemplo de uso' : 'Example Usage'}
                              </div>
                              <div style={{ 
                                display: 'flex', 
                                gap: '8px', 
                                background: 'var(--bg-app)', 
                                border: '1px solid var(--border)',
                                padding: '8px 10px', 
                                borderRadius: '8px',
                                alignItems: 'center'
                              }}>
                                <button
                                  onClick={(e) => speakVocab(e, vocab.exampleSentence || '')}
                                  style={{
                                    background: 'var(--surface)',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    borderRadius: '6px',
                                    padding: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Volume2 size={12} />
                                </button>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                                    "{vocab.exampleSentence}"
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {vocab.exampleTranslation}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Conjugations if Verb */}
                          {vocab.partOfSpeech === 'verb' && conjugations && (
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                Present Tense Conjugations (Presente)
                              </div>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                                gap: '6px',
                                background: 'rgba(139, 92, 246, 0.05)',
                                padding: '8px',
                                borderRadius: '8px',
                                border: '1px dashed rgba(139, 92, 246, 0.2)'
                              }}>
                                {Object.entries(conjugations).map(([subj, conj]) => (
                                  <div key={subj} style={{ textAlign: 'center', padding: '4px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                      {subj.replace('_', '/')}
                                    </div>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                                      {conj as string}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Flashcards Mode */
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            paddingBottom: '20px'
          }}>
            {flashcardDeck.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                <BookOpen size={48} style={{ color: 'var(--border)', margin: '0 auto 12px auto' }} />
                <div>
                  {nativeLanguage === 'es' 
                    ? 'Agrega palabras a tu diccionario para habilitar la sesión de tarjetas.' 
                    : 'Add words to your dictionary to enable flashcard quizzes.'}
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Session Counter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>
                    {nativeLanguage === 'es' ? `Tarjeta ${cardIndex + 1} de ${flashcardDeck.length}` : `Card ${cardIndex + 1} of ${flashcardDeck.length}`}
                  </span>
                  
                  {/* Correct / Incorrect counters */}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: '700' }}>
                    <span style={{ color: 'var(--success)' }}>✅ {sessionResults.correct}</span>
                    <span style={{ color: '#ef4444' }}>❌ {sessionResults.incorrect}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', width: '100%', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--primary-gradient)', 
                    width: `${((cardIndex + 1) / flashcardDeck.length) * 100}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                {/* Flippable card */}
                <div 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="glass-card"
                  style={{
                    height: '240px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'transform 0.4s ease, border-color 0.2s ease',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    boxShadow: '0 8px 32px rgba(15, 12, 41, 0.1)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Front Side */}
                  <div style={{
                    position: 'absolute',
                    backfaceVisibility: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    width: '100%',
                    padding: '20px',
                    gap: '12px'
                  }}>
                    <button 
                      onClick={(e) => speakVocab(e, activeCard.word)}
                      className="icon-button"
                      style={{
                        background: 'var(--bg-app)',
                        border: 'none',
                        color: 'var(--primary)',
                        padding: '8px',
                        borderRadius: '50%',
                        cursor: 'pointer'
                      }}
                    >
                      <Volume2 size={16} />
                    </button>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                      {activeCard.word}
                    </div>
                    {activeCard.partOfSpeech && (
                      <span style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#a78bfa',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: '700'
                      }}>
                        {activeCard.partOfSpeech}
                      </span>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={12} />
                      <span>{nativeLanguage === 'es' ? 'Toca para revelar traducción' : 'Tap to reveal translation'}</span>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div style={{
                    position: 'absolute',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    width: '100%',
                    padding: '20px',
                    gap: '8px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>
                      {nativeLanguage === 'es' ? 'Traducción' : 'Translation'}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {activeCard.translation}
                    </div>
                    
                    {activeCard.definition && (
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '90%', margin: '4px 0', lineHeight: '1.3' }}>
                        {activeCard.definition}
                      </p>
                    )}

                    {activeCard.exampleSentence && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px' }}>
                        "{activeCard.exampleSentence}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Flip control prompts */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    onClick={() => handleFlashcardAnswer(false)}
                    style={{
                      flex: 1,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      padding: '12px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <X size={15} />
                    <span>{nativeLanguage === 'es' ? 'Repasar' : 'Review'}</span>
                  </button>
                  <button
                    onClick={() => handleFlashcardAnswer(true)}
                    style={{
                      flex: 1,
                      background: 'var(--primary-gradient)',
                      border: 'none',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check size={15} />
                    <span>{nativeLanguage === 'es' ? '¡Lo sé!' : 'Got it!'}</span>
                  </button>
                </div>

                {/* Reset button */}
                <button
                  onClick={resetFlashcards}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    marginTop: '4px'
                  }}
                >
                  <RotateCcw size={11} />
                  <span>{nativeLanguage === 'es' ? 'Reiniciar sesión' : 'Reset Deck'}</span>
                </button>

              </div>
            )}
          </div>
        )}

      </div>

      {/* Settings Overlay Modal */}
      {showSettings && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 12, 41, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          zIndex: 90
        }}>
          <div 
            className="animate-slide-up"
            style={{
              background: 'var(--bg-app)',
              borderTop: '1px solid var(--border)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              width: '100%',
              maxHeight: '85%',
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)' }}>
                ⚙️ {nativeLanguage === 'es' ? 'Ajustes de Spanglish' : 'Spanglish Settings'}
              </span>
              <button 
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'var(--surface)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  padding: '6px',
                  borderRadius: '50%',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
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
                    onClick={() => { setShowSettings(false); setShowAuthModal(true); }}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="glass-card" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  <BookOpen size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.wordsTranslated}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                    {nativeLanguage === 'es' ? 'Traducidas' : 'Translated'}
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--primary)' }}>
                  <RotateCcw size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.chatSessions}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                    {nativeLanguage === 'es' ? 'Chats' : 'Chats'}
                  </div>
                </div>
              </div>
            </div>

            {/* Change Level */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ⚙️ {nativeLanguage === 'es' ? 'Nivel Académico' : 'Academic Level'}
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

            {/* Dictation Speed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                <span>🔊 {nativeLanguage === 'es' ? 'Velocidad de Voz' : 'TTS Voice Speed'}</span>
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
                  background: 'var(--border)',
                  height: '4px',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Notification Reminders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bell size={12} style={{ color: 'var(--primary)' }} />
                  {nativeLanguage === 'es' ? 'Recordatorios Diarios' : 'Daily Reminders'}
                </span>
                
                {/* Switch Toggle */}
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  style={{
                    background: notificationsEnabled ? 'var(--primary-gradient)' : 'var(--border)',
                    border: 'none',
                    width: '38px',
                    height: '20px',
                    borderRadius: '12px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px'
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'white',
                      transform: notificationsEnabled ? 'translateX(18px)' : 'translateX(0px)',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  />
                </button>
              </div>

              {notificationsEnabled && (
                <div 
                  className="animate-slide-up"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px', 
                    background: 'var(--bg-app)', 
                    padding: '10px', 
                    borderRadius: '12px',
                    border: '1px dashed var(--border)' 
                  }}
                >
                  {/* Morning News */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      🌅 {nativeLanguage === 'es' ? 'Noticias de la Mañana' : 'Morning News'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="time"
                        value={notificationTimes.morning}
                        onChange={(e) => setNotificationTimes({ ...notificationTimes, morning: e.target.value })}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '4px 6px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                      <button
                        onClick={() => sendTestNotification('news')}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--primary)',
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          cursor: 'pointer'
                        }}
                      >
                        Test
                      </button>
                    </div>
                  </div>

                  {/* Midday Lesson */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      💬 {nativeLanguage === 'es' ? 'Lección del Mediodía' : 'Midday Lesson'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="time"
                        value={notificationTimes.midday}
                        onChange={(e) => setNotificationTimes({ ...notificationTimes, midday: e.target.value })}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '4px 6px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                      <button
                        onClick={() => sendTestNotification('chat')}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--primary)',
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          cursor: 'pointer'
                        }}
                      >
                        Test
                      </button>
                    </div>
                  </div>

                  {/* Evening Lit */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      📖 {nativeLanguage === 'es' ? 'Lectura de la Noche' : 'Evening Literature'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="time"
                        value={notificationTimes.evening}
                        onChange={(e) => setNotificationTimes({ ...notificationTimes, evening: e.target.value })}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '4px 6px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                      <button
                        onClick={() => sendTestNotification('literature')}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--primary)',
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          cursor: 'pointer'
                        }}
                      >
                        Test
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reset progress */}
            <button
              onClick={handleReset}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--danger)',
                padding: '10px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                transition: 'all 0.2s ease'
              }}
            >
              <RotateCcw size={13} />
              <span>{nativeLanguage === 'es' ? 'Borrar Todo el Progreso' : 'Reset Everything'}</span>
            </button>
          </div>
        </div>
      )}

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
