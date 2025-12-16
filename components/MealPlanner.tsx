import React, { useState } from 'react';
import { Recipe, MealPlan, DayOfWeek, MealType } from '../types';
import { GripIcon, TrashIcon, ClockIcon, FlameIcon, PlusIcon, XIcon } from './Icons';

interface Props {
  savedRecipes: Recipe[];
  mealPlan: MealPlan;
  onUpdatePlan: (day: DayOfWeek, type: MealType, recipe: Recipe | null) => void;
  onRecipeClick: (recipe: Recipe) => void;
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const MealPlanner: React.FC<Props> = ({ savedRecipes, mealPlan, onUpdatePlan, onRecipeClick }) => {
  const [draggedRecipe, setDraggedRecipe] = useState<Recipe | null>(null);
  const [activeSlot, setActiveSlot] = useState<{day: DayOfWeek, type: MealType} | null>(null);

  const handleDragStart = (e: React.DragEvent, recipe: Recipe) => {
    setDraggedRecipe(recipe);
    e.dataTransfer.setData("recipeId", recipe.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, day: DayOfWeek, type: MealType) => {
    e.preventDefault();
    const recipeId = e.dataTransfer.getData("recipeId");
    const recipe = savedRecipes.find(r => r.id === recipeId);
    
    if (recipe) {
      onUpdatePlan(day, type, recipe);
    }
    setDraggedRecipe(null);
  };

  const handleManualSelect = (recipe: Recipe) => {
      if (activeSlot) {
          onUpdatePlan(activeSlot.day, activeSlot.type, recipe);
          setActiveSlot(null);
      }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Sidebar: Saved Recipes */}
      <div className="lg:w-1/4 w-full flex-shrink-0">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-100 dark:border-gray-700 p-4 sticky top-24 max-h-[calc(100vh-8rem)] flex flex-col">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
            Drag Recipes
          </h3>
          
          <div className="overflow-y-auto space-y-3 custom-scrollbar flex-1 pr-1">
            {savedRecipes.length === 0 ? (
               <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                   Save recipes to your cookbook to plan them!
               </div>
            ) : (
                savedRecipes.map(recipe => (
                    <div
                        key={recipe.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, recipe)}
                        className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 cursor-grab active:cursor-grabbing hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-start gap-2">
                            <GripIcon className="w-5 h-5 text-gray-300 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{recipe.name}</h4>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-0.5"><ClockIcon className="w-3 h-3"/> {parseInt(recipe.prepTime) + parseInt(recipe.cookTime)}m</span>
                                    <span className="flex items-center gap-0.5"><FlameIcon className="w-3 h-3"/> {recipe.calories}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Main: Calendar Grid */}
      <div className="flex-1 min-w-0">
         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
             {/* Desktop Header */}
             <div className="hidden lg:grid grid-cols-7 bg-orange-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                 {DAYS.map(day => (
                     <div key={day} className="p-3 text-center font-bold text-sm text-gray-700 dark:text-gray-300">
                         {day.slice(0, 3)}
                     </div>
                 ))}
             </div>

             <div className="lg:grid lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-700">
                 {DAYS.map(day => (
                     <div key={day} className="flex flex-col">
                         {/* Mobile Day Header */}
                         <div className="lg:hidden bg-orange-50 dark:bg-gray-800/80 p-2 font-bold text-gray-800 dark:text-gray-200 text-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                             {day}
                         </div>

                         <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                             {MEALS.map(mealType => {
                                 const recipe = mealPlan[day]?.[mealType];
                                 return (
                                     <div 
                                        key={mealType} 
                                        className={`p-2 min-h-[120px] transition-colors relative flex flex-col ${
                                            draggedRecipe ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, day, mealType)}
                                     >
                                         <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 tracking-wider">
                                             {mealType}
                                         </div>
                                         
                                         {recipe ? (
                                             <div className="flex-1 bg-white dark:bg-gray-700 rounded-lg p-2 shadow-sm border border-orange-100 dark:border-gray-600 group relative">
                                                 <div onClick={() => onRecipeClick(recipe)} className="cursor-pointer">
                                                    <p className="font-semibold text-xs text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight mb-1">
                                                        {recipe.name}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {recipe.nutrition && (
                                                            <span className="text-[9px] bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1 rounded">
                                                                {recipe.nutrition.protein} P
                                                            </span>
                                                        )}
                                                        <span className="text-[9px] bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1 rounded">
                                                            {recipe.calories}
                                                        </span>
                                                    </div>
                                                 </div>
                                                 <button 
                                                    onClick={() => onUpdatePlan(day, mealType, null)}
                                                    className="absolute -top-1.5 -right-1.5 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                    title="Remove from plan"
                                                 >
                                                     <XIcon className="w-3 h-3" />
                                                 </button>
                                             </div>
                                         ) : (
                                             <div className="flex-1 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-lg flex items-center justify-center group-hover:border-orange-200 dark:group-hover:border-gray-500 transition-colors">
                                                 <button 
                                                    onClick={() => setActiveSlot({ day, type: mealType })}
                                                    className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-orange-500 dark:hover:text-orange-400"
                                                 >
                                                     <PlusIcon className="w-5 h-5" />
                                                 </button>
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 ))}
             </div>
         </div>
      </div>

      {/* Manual Selection Modal (Mobile Friendly) */}
      {activeSlot && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveSlot(null)} />
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col relative animate-[fadeIn_0.2s_ease-out]">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900 dark:text-white">
                          Select for {activeSlot.day} {activeSlot.type}
                      </h3>
                      <button onClick={() => setActiveSlot(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                          <XIcon className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="overflow-y-auto p-2 custom-scrollbar">
                       {savedRecipes.length === 0 ? (
                           <div className="p-6 text-center text-gray-500">No saved recipes. Go generate and save some!</div>
                       ) : (
                           savedRecipes.map(recipe => (
                               <button
                                  key={recipe.id}
                                  onClick={() => handleManualSelect(recipe)}
                                  className="w-full text-left p-3 hover:bg-orange-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-3 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0"
                               >
                                   <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden flex-shrink-0">
                                       <img src={`https://tse3.mm.bing.net/th?q=${encodeURIComponent(recipe.name)}&w=100&h=100&c=7&rs=1&p=0`} className="w-full h-full object-cover" alt="" />
                                   </div>
                                   <div>
                                       <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{recipe.name}</div>
                                       <div className="text-xs text-gray-500">{recipe.calories} • {recipe.difficulty}</div>
                                   </div>
                               </button>
                           ))
                       )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default MealPlanner;