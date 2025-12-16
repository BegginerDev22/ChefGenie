import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Ingredient } from '../types';
import { XIcon, PlayIcon, PauseIcon, StopIcon, SpeakerWaveIcon, ChevronRightIcon, ChevronLeftIcon, ClockIcon, CheckCircleIcon, CircleIcon } from './Icons';

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

// Helper to extract time duration from text (e.g., "10 minutes", "1 hour")
const extractTimeInSeconds = (text: string): number | null => {
    // Matches "10 minutes", "10-15 mins", "1 hour", "1.5 hrs"
    const minuteMatch = text.match(/(\d+(?:-\d+)?)\s*(?:min|minute)s?/i);
    if (minuteMatch) {
        let val = minuteMatch[1];
        // If range "10-15", take the lower bound for safety
        if (val.includes('-')) val = val.split('-')[0]; 
        return Math.floor(parseFloat(val) * 60);
    }
    
    const hourMatch = text.match(/(\d+(?:-\d+)?)\s*(?:hr|hour)s?/i);
    if (hourMatch) {
        let val = hourMatch[1];
        if (val.includes('-')) val = val.split('-')[0];
        return Math.floor(parseFloat(val) * 3600);
    }
    return null;
};

const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const CookMode: React.FC<Props> = ({ recipe, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Timer State: We allow one active timer for the Cook Mode session
  // It persists across step navigation
  const [timer, setTimer] = useState<{
    duration: number;
    remaining: number;
    isRunning: boolean;
    stepIndex: number; // The step this timer belongs to
  } | null>(null);

  // Track checked ingredients per step. Key: "stepIndex-ingredientIndex"
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const timerRef = useRef<number | null>(null);

  // Wake Lock to prevent screen sleeping
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };
    
    requestWakeLock();
    
    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // Timer Interval Logic
  useEffect(() => {
    if (timer && timer.isRunning && timer.remaining > 0) {
        timerRef.current = window.setInterval(() => {
            setTimer(prev => {
                if (!prev || !prev.isRunning) return prev;
                if (prev.remaining <= 1) {
                    // Timer finished
                    return { ...prev, remaining: 0, isRunning: false };
                }
                return { ...prev, remaining: prev.remaining - 1 };
            });
        }, 1000);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timer?.isRunning]);

  // Stop speech when component unmounts
  useEffect(() => {
      return () => {
          window.speechSynthesis.cancel();
      }
  }, []);

  const handleNext = () => {
    if (currentStepIndex < recipe.steps.length - 1) {
      window.speechSynthesis.cancel();
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      window.speechSynthesis.cancel();
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const currentStepText = recipe.steps[currentStepIndex];
  const detectedDuration = extractTimeInSeconds(currentStepText);

  // Derive relevant ingredients for the current step
  const stepIngredients = recipe.ingredients.map((ing, idx) => ({ ...ing, originalIndex: idx })).filter(ing => {
      // Basic inclusion check (case-insensitive)
      // Check if full ingredient name is in step text
      if (currentStepText.toLowerCase().includes(ing.name.toLowerCase())) return true;
      
      // Heuristic: Check if individual significant words match (len > 3)
      // e.g. "Chicken Breast" matches "Add the chicken"
      const parts = ing.name.split(/[\s-]+/);
      return parts.some(part => part.length >= 4 && currentStepText.toLowerCase().includes(part.toLowerCase()));
  });

  const toggleIngredientCheck = (ingredientIndex: number) => {
      const key = `${currentStepIndex}-${ingredientIndex}`;
      setCheckedItems(prev => {
          const next = new Set(prev);
          if (next.has(key)) {
              next.delete(key);
          } else {
              next.add(key);
          }
          return next;
      });
  };

  const startTimer = () => {
      if (detectedDuration) {
          setTimer({
              duration: detectedDuration,
              remaining: detectedDuration,
              isRunning: true,
              stepIndex: currentStepIndex
          });
      }
  };

  const toggleTimer = () => {
      setTimer(prev => prev ? { ...prev, isRunning: !prev.isRunning } : null);
  };

  const resetTimer = () => {
      setTimer(prev => prev ? { ...prev, remaining: prev.duration, isRunning: false } : null);
  };

  const stopTimer = () => {
      setTimer(null);
  };

  const speakStep = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentStepText);
      window.speechSynthesis.speak(utterance);
  };

  // Determine if a timer should be shown for THIS step or if a global timer is running
  const isTimerForThisStep = timer?.stepIndex === currentStepIndex;
  const showActiveTimer = timer !== null;

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-950 flex flex-col animate-[fadeIn_0.3s_ease-out]">
      
      {/* Header */}
      <div className="flex flex-col border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 pb-2">
          <div className="flex items-center justify-between p-4">
            <button 
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            >
                <XIcon className="w-6 h-6" />
            </button>
            
            <div className="flex-1 px-4 text-center">
                <h2 className="text-sm font-bold text-orange-600 dark:text-orange-500 uppercase tracking-wider">
                    Step {currentStepIndex + 1} of {recipe.steps.length}
                </h2>
            </div>
            
            <div className="w-10"></div> {/* Spacer for alignment */}
          </div>

          {/* Segmented Progress Bar */}
          <div className="flex gap-1 px-4 w-full h-1.5">
              {recipe.steps.map((_, idx) => (
                  <div 
                      key={idx}
                      className={`rounded-full flex-1 transition-all duration-300 relative ${
                          idx === currentStepIndex ? 'bg-orange-500' : 
                          idx < currentStepIndex ? 'bg-orange-200 dark:bg-orange-900' : 
                          'bg-gray-100 dark:bg-gray-800'
                      }`} 
                  >
                      {/* Visual Indicator for Active Timer on this step */}
                      {timer?.stepIndex === idx && (
                          <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-950 ${
                              timer.remaining === 0 ? 'bg-green-500' : 'bg-orange-600 animate-pulse'
                          }`} />
                      )}
                  </div>
              ))}
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 relative overflow-y-auto custom-scrollbar">
          
          <div className="max-w-3xl w-full text-center space-y-8">
              
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-gray-800 text-orange-600 dark:text-orange-500 font-bold text-2xl mb-4 shadow-sm">
                  {currentStepIndex + 1}
              </div>

              <p className="text-xl sm:text-3xl font-medium text-gray-900 dark:text-white leading-relaxed">
                  {currentStepText}
              </p>

              {/* Ingredient Checklist for this step */}
              {stepIngredients.length > 0 && (
                  <div className="bg-orange-50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 text-left max-w-lg mx-auto border border-orange-100 dark:border-gray-800">
                      <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          Ingredients needed
                      </h3>
                      <div className="space-y-3">
                          {stepIngredients.map((ing) => {
                              const isChecked = checkedItems.has(`${currentStepIndex}-${ing.originalIndex}`);
                              return (
                                  <div 
                                      key={ing.originalIndex} 
                                      onClick={() => toggleIngredientCheck(ing.originalIndex)}
                                      className={`flex items-center gap-3 cursor-pointer group p-2 rounded-lg transition-colors ${isChecked ? 'bg-orange-100/50 dark:bg-gray-800' : 'hover:bg-white dark:hover:bg-gray-800'}`}
                                  >
                                      <div className={`flex-shrink-0 transition-colors ${isChecked ? 'text-green-500' : 'text-gray-300 dark:text-gray-600 group-hover:text-orange-500'}`}>
                                          {isChecked ? <CheckCircleIcon className="w-6 h-6" filled /> : <CircleIcon className="w-6 h-6" />}
                                      </div>
                                      <div className={`flex-1 transition-opacity ${isChecked ? 'opacity-50 line-through' : ''}`}>
                                          <p className="font-semibold text-gray-900 dark:text-gray-200">{ing.name}</p>
                                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{ing.amount}</p>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                  <button 
                    onClick={speakStep}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                      <SpeakerWaveIcon className="w-5 h-5" />
                      Read Step
                  </button>

                  {/* Show "Start Timer" if detected and NO timer is running for this step */}
                  {detectedDuration && !isTimerForThisStep && (
                       <button 
                         onClick={startTimer}
                         className="flex items-center gap-2 px-6 py-2 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 dark:shadow-none transition-all transform hover:scale-105 font-bold"
                       >
                           <ClockIcon className="w-5 h-5" />
                           {timer ? 'Replace Timer' : `Start ${Math.ceil(detectedDuration / 60)}m Timer`}
                       </button>
                  )}
              </div>
          </div>
      </div>

      {/* Timer Overlay / Bottom Sheet - Persists across steps */}
      {showActiveTimer && (
          <div className={`border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] transition-all transform`}>
              <div className="max-w-xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold transition-colors ${timer.remaining === 0 ? 'bg-green-500 animate-bounce' : 'bg-gray-900 dark:bg-gray-700'}`}>
                          <ClockIcon className="w-6 h-6" />
                      </div>
                      <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase flex items-center gap-2">
                              {timer.remaining === 0 ? (
                                  <span className="text-green-600 dark:text-green-400">Timer Finished!</span>
                              ) : (
                                  <>
                                    {isTimerForThisStep ? 'Current Step' : `Step ${timer.stepIndex + 1}`}
                                    {!isTimerForThisStep && (
                                        <button 
                                            onClick={() => setCurrentStepIndex(timer.stepIndex)}
                                            className="text-orange-600 hover:underline ml-1"
                                        >
                                            (Go to step)
                                        </button>
                                    )}
                                  </>
                              )}
                          </div>
                          <div className={`text-2xl font-mono font-bold ${timer.remaining === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                              {formatTime(timer.remaining)}
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-2">
                      {timer.remaining === 0 ? (
                          <button onClick={stopTimer} className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                              <XIcon className="w-6 h-6" />
                          </button>
                      ) : (
                          <>
                            <button onClick={toggleTimer} className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50">
                                {timer.isRunning ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                            </button>
                            <button onClick={resetTimer} className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                                <StopIcon className="w-6 h-6" />
                            </button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Navigation Footer */}
      <div className="p-6 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center gap-4">
          <button 
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
                currentStepIndex === 0 
                ? 'bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed' 
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
            }`}
          >
              <ChevronLeftIcon className="w-6 h-6" />
              Previous
          </button>
          
          <button 
            onClick={handleNext}
            disabled={currentStepIndex === recipe.steps.length - 1}
            className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
                currentStepIndex === recipe.steps.length - 1
                ? 'bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-none'
                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg hover:shadow-xl'
            }`}
          >
              {currentStepIndex === recipe.steps.length - 1 ? (
                  <span onClick={onClose}>Finish Cooking</span>
              ) : (
                  <>
                    Next Step
                    <ChevronRightIcon className="w-6 h-6" />
                  </>
              )}
          </button>
      </div>
    </div>
  );
};

export default CookMode;