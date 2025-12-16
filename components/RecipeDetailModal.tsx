import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { XIcon, ClockIcon, FlameIcon, ChefHatIcon, HeartIcon, UsersIcon, PlusIcon, MinusIcon, ShareIcon, CopyIcon, WineIcon, PlayIcon } from './Icons';
import { scaleAmount, generateShareText, shareRecipe } from '../utils';
import CookMode from './CookMode';

interface Props {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  onShowToast: () => void;
}

const RecipeDetailModal: React.FC<Props> = ({ recipe, isOpen, onClose, isSaved, onToggleSave, onShowToast }) => {
  const [currentServings, setCurrentServings] = useState(recipe.servings || 2);
  const [isCookMode, setIsCookMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentServings(recipe.servings || 2);
      setIsCookMode(false);
    }
  }, [isOpen, recipe]);

  if (!isOpen) return null;

  const handleServingsChange = (delta: number) => {
    setCurrentServings(prev => Math.max(1, Math.min(20, prev + delta)));
  };

  const handleShare = () => {
    const text = generateShareText(recipe, currentServings);
    shareRecipe(text, recipe.name, onShowToast);
  };

  const handleCopyIngredients = async () => {
    const ingredientsList = recipe.ingredients.map(ing => {
       const amount = scaleAmount(ing.amount, recipe.servings || 2, currentServings);
       return `• ${amount} ${ing.name}`;
    }).join('\n');
    
    const text = `Ingredients for ${recipe.name} (${currentServings} servings):\n${ingredientsList}`;
    
    try {
        await navigator.clipboard.writeText(text);
        onShowToast();
    } catch (err) {
        console.error('Failed to copy ingredients', err);
    }
  };

  // Render Cook Mode Overlay if active
  if (isCookMode) {
      return <CookMode recipe={recipe} onClose={() => setIsCookMode(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-[fadeIn_0.2s_ease-out]">
        
        {/* Header Image Area */}
        <div className="relative h-48 sm:h-64 bg-orange-100 dark:bg-gray-800 flex-shrink-0">
          <img 
            src={`https://tse3.mm.bing.net/th?q=${encodeURIComponent(recipe.name + " recipe meal")}&w=1200&h=600&c=7&rs=1&p=0`}
            alt={recipe.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://picsum.photos/800/400?random=${recipe.id}`;
            }}
          />
          
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
                onClick={handleShare}
                className="bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 p-2 rounded-full shadow-md transition-colors group"
                title="Share Recipe"
            >
                <ShareIcon className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
            </button>
            <button 
                onClick={onToggleSave}
                className="bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 p-2 rounded-full shadow-md transition-colors group"
                title={isSaved ? "Remove from cookbook" : "Save to cookbook"}
            >
                <HeartIcon className={`w-5 h-5 transition-colors ${isSaved ? "text-red-500" : "text-gray-500 dark:text-gray-400 group-hover:text-red-500"}`} filled={isSaved} />
            </button>
            <button 
                onClick={onClose}
                className="bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 p-2 rounded-full shadow-md transition-colors"
            >
                <XIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-12">
             <h2 className="text-3xl font-bold text-white mb-1 drop-shadow-sm">{recipe.name}</h2>
             <div className="flex flex-wrap gap-2 mb-2">
                {recipe.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-md">
                        {tag}
                    </span>
                ))}
             </div>
          </div>
          
           {/* Start Cooking Floating Button */}
           <button 
                onClick={() => setIsCookMode(true)}
                className="absolute -bottom-6 right-6 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-orange-500/30 flex items-center gap-2 font-bold transition-all transform hover:scale-105 active:scale-95 group"
            >
                <PlayIcon className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                Start Cooking
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 pt-10 space-y-6 custom-scrollbar">
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 p-4 bg-orange-50 dark:bg-gray-800/50 rounded-xl border border-orange-100 dark:border-gray-700 items-center justify-between">
                <div className="flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Prep</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium text-sm">{recipe.prepTime}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ChefHatIcon className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Cook</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium text-sm">{recipe.cookTime}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <FlameIcon className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Cals</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium text-sm">{recipe.calories}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                     <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                         recipe.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                         recipe.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' :
                         'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                     }`}>
                         {recipe.difficulty}
                     </span>
                </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 italic border-l-4 border-orange-300 dark:border-orange-600 pl-4">
                {recipe.description}
            </p>

            {/* Drink Pairing Section */}
            {recipe.drinkPairing && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-full text-purple-600 dark:text-purple-300">
                        <WineIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-0.5">Perfect Pairing</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">{recipe.drinkPairing}</p>
                    </div>
                </div>
            )}

            {/* Nutrition Breakdown */}
            {recipe.nutrition && (
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 text-center">Nutrition Per Serving</h3>
                    <div className="grid grid-cols-4 gap-2 text-center divide-x divide-gray-100 dark:divide-gray-700">
                        <div className="px-1">
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Protein</span>
                            <span className="block text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">{recipe.nutrition.protein}</span>
                        </div>
                        <div className="px-1">
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Carbs</span>
                            <span className="block text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">{recipe.nutrition.carbs}</span>
                        </div>
                        <div className="px-1">
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fat</span>
                            <span className="block text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">{recipe.nutrition.fat}</span>
                        </div>
                        <div className="px-1">
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fiber</span>
                            <span className="block text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">{recipe.nutrition.fiber}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* Ingredients */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <span className="bg-orange-100 dark:bg-gray-800 p-1.5 rounded-lg text-orange-600 dark:text-orange-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                </svg>
                            </span>
                            Ingredients
                        </h3>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleCopyIngredients}
                                className="p-2 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                                title="Copy ingredients"
                            >
                                <CopyIcon className="w-4 h-4" />
                            </button>
                            
                            {/* Servings Adjuster */}
                            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                                <UsersIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleServingsChange(-1)} 
                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-600 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 dark:hover:border-orange-500 transition-colors"
                                        disabled={currentServings <= 1}
                                    >
                                        <MinusIcon className="w-3 h-3" />
                                    </button>
                                    <span className="font-bold text-gray-900 dark:text-gray-100 w-4 text-center">{currentServings}</span>
                                    <button 
                                        onClick={() => handleServingsChange(1)} 
                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-600 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 dark:hover:border-orange-500 transition-colors"
                                    >
                                        <PlusIcon className="w-3 h-3" />
                                    </button>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">srv</span>
                            </div>
                        </div>
                    </div>

                    <ul className="space-y-3">
                        {recipe.ingredients.map((ing, idx) => (
                            <li key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                <span className="text-gray-800 dark:text-gray-200 font-medium">{ing.name}</span>
                                <span className="text-gray-500 dark:text-gray-400 text-sm font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                                    {scaleAmount(ing.amount, recipe.servings || 2, currentServings)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Steps */}
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                         <span className="bg-orange-100 dark:bg-gray-800 p-1.5 rounded-lg text-orange-600 dark:text-orange-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                            </svg>
                        </span>
                        Instructions
                    </h3>
                    <div className="space-y-6">
                        {recipe.steps.map((step, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 dark:bg-orange-700 text-white flex items-center justify-center font-bold text-sm">
                                    {idx + 1}
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">{step}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default RecipeDetailModal;