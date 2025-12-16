import React, { useState, useEffect, useRef } from 'react';
import { ChefHatIcon, PlusIcon, SparklesIcon, XIcon, ClockIcon, HeartIcon, FilterIcon, SunIcon, MoonIcon, ShareIcon, CalendarIcon } from './components/Icons';
import { Recipe, MealPlan, DayOfWeek, MealType } from './types';
import { generateRecipes } from './services/geminiService';
import RecipeDetailModal from './components/RecipeDetailModal';
import MealPlanner from './components/MealPlanner';
import { generateShareText, shareRecipe } from './utils';

const QUICK_ADD_INGREDIENTS = ["Chicken", "Rice", "Eggs", "Tomatoes", "Potatoes", "Cheese", "Pasta", "Onions"];

const COMMON_INGREDIENTS = [
  "Apples", "Asparagus", "Avocado", "Bacon", "Bananas", "Basmati Rice", "Basil", "Beans", "Beef", 
  "Bell Peppers", "Black Beans", "Bread", "Broccoli", "Brown Sugar", "Butter", "Cabbage", "Cardamom", 
  "Carrots", "Cauliflower", "Celery", "Cheddar", "Cheese", "Chicken", "Chicken Breast", "Chicken Thighs", 
  "Chickpeas", "Chili Powder", "Cilantro", "Cinnamon", "Coconut Milk", "Coriander", "Corn", "Cucumber", 
  "Cumin", "Curry Powder", "Eggs", "Fish", "Flour", "Garam Masala", "Garlic", "Ginger", "Ground Beef", 
  "Ham", "Heavy Cream", "Honey", "Lemon", "Lentils", "Lettuce", "Lime", "Milk", "Mozzarella", 
  "Mushrooms", "Mustard", "Noodles", "Oats", "Oil", "Olive Oil", "Onions", "Oregano", "Paneer", 
  "Paprika", "Parmesan", "Pasta", "Peanut Butter", "Peas", "Pepper", "Pork", "Pork Chops", "Potatoes", 
  "Quinoa", "Red Kidney Beans", "Rice", "Salmon", "Salt", "Sausage", "Shrimp", "Sour Cream", "Soy Sauce", 
  "Spaghetti", "Spinach", "Steak", "Strawberries", "Sugar", "Sweet Potatoes", "Thyme", "Tofu", "Tomatoes", 
  "Tomato Paste", "Tomato Sauce", "Tortillas", "Turmeric", "Tuna", "Turkey", "Vanilla", "Vegetable Oil", 
  "Vinegar", "Walnuts", "Yogurt", "Zucchini"
].sort();

const DIETARY_FILTERS = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Low-Carb", "Healthy"];

const LOCAL_STORAGE_KEY = 'chefgenie_saved_recipes';
const MEAL_PLAN_KEY = 'chefgenie_meal_plan';
const THEME_STORAGE_KEY = 'chefgenie_theme';

type ViewMode = 'generated' | 'saved' | 'planner';
type Theme = 'light' | 'dark';

function App() {
  const [inputVal, setInputVal] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('generated');
  
  // Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Toast state
  const [showToast, setShowToast] = useState(false);

  // Filter state
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Initialize saved recipes from localStorage
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map((r: any) => ({
        ...r,
        servings: r.servings || 2
      }));
    } catch (e) {
      console.error("Failed to load saved recipes", e);
      return [];
    }
  });

  // Initialize meal plan
  const [mealPlan, setMealPlan] = useState<MealPlan>(() => {
    try {
        const saved = localStorage.getItem(MEAL_PLAN_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Toast Timer
  useEffect(() => {
      if (showToast) {
          const timer = setTimeout(() => setShowToast(false), 3000);
          return () => clearTimeout(timer);
      }
  }, [showToast]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);

    if (val.trim().length > 0) {
      const valLower = val.toLowerCase();
      const filtered = COMMON_INGREDIENTS.filter(ing => 
        ing.toLowerCase().includes(valLower) && 
        !ingredients.includes(ing)
      ).sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        
        // Exact match priority
        if (aLower === valLower && bLower !== valLower) return -1;
        if (bLower === valLower && aLower !== valLower) return 1;
        
        // Starts with priority
        const aStarts = aLower.startsWith(valLower);
        const bStarts = bLower.startsWith(valLower);
        
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        
        return 0; // Maintain original sort (alphabetical) for others
      });
      
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleAddIngredient = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setInputVal('');
      setShowSuggestions(false);
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showSuggestions && suggestions.length > 0) {
          const exactMatch = suggestions.find(s => s.toLowerCase() === inputVal.trim().toLowerCase());
          if (exactMatch) {
              handleAddIngredient(exactMatch);
          } else if (suggestions.length === 1) {
              handleAddIngredient(suggestions[0]);
          } else {
              handleAddIngredient(inputVal);
          }
      } else {
          handleAddIngredient(inputVal);
      }
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      setError("Please add at least one ingredient!");
      return;
    }

    setLoading(true);
    setError(null);
    setRecipes([]);
    setViewMode('generated');

    try {
      const generated = await generateRecipes(ingredients);
      setRecipes(generated);
    } catch (err) {
      setError("Failed to generate recipes. Please try again. Make sure your API key is configured.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveRecipe = (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isSaved = savedRecipes.some(r => r.id === recipe.id);
    let newSavedList: Recipe[];

    if (isSaved) {
      newSavedList = savedRecipes.filter(r => r.id !== recipe.id);
    } else {
      newSavedList = [...savedRecipes, recipe];
    }

    setSavedRecipes(newSavedList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSavedList));
  };

  const handleUpdateMealPlan = (day: DayOfWeek, type: MealType, recipe: Recipe | null) => {
      const newPlan = { ...mealPlan };
      if (!newPlan[day]) newPlan[day] = {};
      
      if (recipe === null) {
          if (newPlan[day]) {
              delete newPlan[day]![type];
              if (Object.keys(newPlan[day]!).length === 0) {
                  delete newPlan[day];
              }
          }
      } else {
          newPlan[day]![type] = recipe;
      }
      
      setMealPlan(newPlan);
      localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(newPlan));
  };

  const handleCardShare = (recipe: Recipe, e: React.MouseEvent) => {
      e.stopPropagation();
      const text = generateShareText(recipe);
      shareRecipe(text, recipe.name, () => setShowToast(true));
  }

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  // Determine which recipes to display based on view mode and filters
  const getDisplayRecipes = () => {
    const sourceList = viewMode === 'generated' ? recipes : savedRecipes;
    
    if (activeFilters.length === 0) return sourceList;

    return sourceList.filter(recipe => {
      // Create a lower case set of tags for comparison
      const recipeTags = recipe.tags.map(t => t.toLowerCase());
      // Check if EVERY active filter is present in the recipe tags
      return activeFilters.every(filter => recipeTags.includes(filter.toLowerCase()));
    });
  };

  const displayRecipes = getDisplayRecipes();
  const sourceHasRecipes = (viewMode === 'generated' ? recipes : savedRecipes).length > 0;

  // Logic to determine if we should show the "Add [Input]" option
  const showManualAdd = inputVal.trim().length > 0 && 
                        !ingredients.includes(inputVal.trim()) &&
                        !suggestions.some(s => s.toLowerCase() === inputVal.trim().toLowerCase());

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white dark:from-gray-900 dark:to-gray-950 text-gray-800 dark:text-gray-100 font-sans pb-20 transition-colors duration-300">
      
      {/* Toast Notification */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 transition-all duration-300 flex items-center gap-2 ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
          <SparklesIcon className="w-4 h-4 text-orange-400" />
          <span className="font-medium text-sm">Copied to clipboard!</span>
      </div>

      {/* Navbar */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-orange-100 dark:border-gray-800 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setViewMode('generated')}>
            <div className="bg-orange-600 p-2 rounded-lg text-white">
              <ChefHatIcon className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-500 dark:to-amber-500 hidden sm:block">
              ChefGenie
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <button
               onClick={toggleTheme}
               className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
               title="Toggle Dark Mode"
             >
               {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
             </button>
             
             <button 
                onClick={() => setViewMode('saved')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'saved' ? 'bg-orange-100 dark:bg-gray-800 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}
             >
                 <HeartIcon className="w-4 h-4" filled={viewMode === 'saved'} />
                 <span className="hidden sm:inline">Cookbook</span>
             </button>
             
             <button 
                onClick={() => setViewMode('planner')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'planner' ? 'bg-orange-100 dark:bg-gray-800 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}
             >
                 <CalendarIcon className="w-4 h-4" />
                 <span className="hidden sm:inline">Meal Plan</span>
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-10">
        
        {viewMode !== 'planner' && (
          <>
            {/* Header Section */}
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                What's in your <span className="text-orange-600 dark:text-orange-500">kitchen?</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Enter the ingredients you have, and let our AI chef conjure up delicious recipes.
              </p>
            </div>

            {/* Input Section */}
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-orange-100/50 dark:shadow-none p-6 md:p-8 mb-12 border border-orange-50 dark:border-gray-700 z-20 relative transition-all">
              <div className="relative mb-6" ref={wrapperRef}>
                <input
                  type="text"
                  value={inputVal}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                      if (inputVal.trim().length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Type an ingredient (e.g., 'Chicken Breast' or 'Paneer')..."
                  className="w-full px-6 py-4 text-lg rounded-xl border-2 border-orange-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/30 transition-all outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  disabled={loading}
                  autoComplete="off"
                />
                <button 
                  onClick={() => handleAddIngredient(inputVal)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-orange-100 hover:bg-orange-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-orange-700 dark:text-orange-300 p-2 rounded-lg transition-colors"
                  disabled={!inputVal.trim() || loading}
                >
                  <PlusIcon className="w-5 h-5" />
                </button>

                {/* Autocomplete Dropdown */}
                {showSuggestions && (suggestions.length > 0 || showManualAdd) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-orange-100 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 custom-scrollbar">
                    <ul>
                      {suggestions.map((suggestion, index) => (
                        <li 
                          key={index}
                          onMouseDown={() => handleAddIngredient(suggestion)} // onMouseDown fires before input blur
                          className="px-6 py-3 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer transition-colors text-gray-700 dark:text-gray-200 font-medium flex items-center justify-between group"
                        >
                          {suggestion}
                          <PlusIcon className="w-4 h-4 text-orange-300 dark:text-gray-500 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                        </li>
                      ))}
                      
                      {/* Manual Add Option */}
                      {showManualAdd && (
                        <li 
                          onMouseDown={() => handleAddIngredient(inputVal)}
                          className="px-6 py-3 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer transition-colors text-orange-700 dark:text-orange-400 font-medium flex items-center justify-between border-t border-orange-100 dark:border-gray-700"
                        >
                          Add "{inputVal}"
                          <PlusIcon className="w-4 h-4" />
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tag Cloud */}
              <div className="flex flex-wrap gap-2 mb-8 min-h-[40px]">
                {ingredients.length === 0 && !loading && (
                  <p className="text-gray-400 dark:text-gray-500 text-sm italic w-full text-center">No ingredients added yet. Try suggestions below.</p>
                )}
                {ingredients.map((ing) => (
                  <span key={ing} className="animate-[fadeIn_0.2s_ease-out] flex items-center gap-1.5 bg-orange-600 dark:bg-orange-700 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-sm group">
                    {ing}
                    <button onClick={() => removeIngredient(ing)} className="hover:bg-white/20 rounded-full p-0.5 transition-colors">
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Popular Ingredients Chips */}
              {ingredients.length < 5 && (
                <div className="mb-8">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Popular Ingredients</p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_ADD_INGREDIENTS.filter(s => !ingredients.includes(s)).map(s => (
                            <button 
                                key={s} 
                                onClick={() => handleAddIngredient(s)}
                                disabled={loading}
                                className="text-sm border border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500 hover:text-orange-700 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-gray-700 px-3 py-1 rounded-full transition-all text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800"
                            >
                                + {s}
                            </button>
                        ))}
                    </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || ingredients.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] ${
                  loading 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-700 dark:to-red-700 text-white shadow-lg hover:shadow-orange-200 dark:hover:shadow-none hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Dreaming up recipes...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Find Recipes
                  </>
                )}
              </button>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-center text-sm border border-red-100 dark:border-red-900/30">
                    {error}
                </div>
              )}
            </div>

            {/* View Mode Tabs & Filters */}
            {(sourceHasRecipes || recipes.length > 0 || viewMode === 'saved') && (
                <div className="max-w-4xl mx-auto mb-8 space-y-4">
                    {/* Tabs */}
                    <div className="flex justify-center">
                        <div className="bg-orange-100 dark:bg-gray-800 p-1 rounded-xl flex gap-1">
                            <button 
                                onClick={() => setViewMode('generated')}
                                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'generated' ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}
                            >
                                Generated
                            </button>
                            <button 
                                onClick={() => setViewMode('saved')}
                                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'saved' ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}
                            >
                                Saved
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap justify-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mr-2">
                            <FilterIcon className="w-4 h-4" />
                            <span>Filter by:</span>
                        </div>
                        {DIETARY_FILTERS.map(filter => (
                            <button
                                key={filter}
                                onClick={() => toggleFilter(filter)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                    activeFilters.includes(filter)
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                        {activeFilters.length > 0 && (
                            <button
                                onClick={() => setActiveFilters([])}
                                className="text-xs text-orange-600 dark:text-orange-400 hover:underline ml-2"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}
          </>
        )}

        {/* Views */}
        {viewMode === 'planner' ? (
             <MealPlanner 
                savedRecipes={savedRecipes} 
                mealPlan={mealPlan} 
                onUpdatePlan={handleUpdateMealPlan}
                onRecipeClick={setSelectedRecipe}
             />
        ) : displayRecipes.length > 0 ? (
          <div className="max-w-4xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span className="w-8 h-1 bg-orange-500 rounded-full"></span>
                {viewMode === 'generated' ? `Found ${displayRecipes.length} recipes` : `Cookbook (${displayRecipes.length})`}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayRecipes.map((recipe) => {
                 const isSaved = savedRecipes.some(r => r.id === recipe.id);
                 return (
                    <div 
                    key={recipe.id} 
                    onClick={() => setSelectedRecipe(recipe)}
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 cursor-pointer group relative"
                    >
                    <div className="h-48 overflow-hidden relative">
                        <img 
                        src={`https://tse3.mm.bing.net/th?q=${encodeURIComponent(recipe.name + " recipe meal")}&w=800&h=600&c=7&rs=1&p=0`}
                        alt={recipe.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                            e.currentTarget.src = `https://picsum.photos/600/400?random=${recipe.id}`;
                        }}
                        />
                        
                        {/* Active Filters Overlay */}
                        {activeFilters.length > 0 && (
                            <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                                {activeFilters.map(filter => (
                                    <span key={filter} className="bg-green-600/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-sm flex items-center gap-1 border border-green-500/30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                        {filter}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                             <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-orange-700 dark:text-orange-400 shadow-sm">
                                {recipe.calories}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => handleCardShare(recipe, e)}
                                    className="bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 p-1.5 rounded-full shadow-sm text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                    title="Share Recipe"
                                >
                                    <ShareIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={(e) => toggleSaveRecipe(recipe, e)}
                                    className="bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 p-1.5 rounded-full shadow-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-500 transition-colors"
                                    title={isSaved ? "Remove from cookbook" : "Save to cookbook"}
                                >
                                    <HeartIcon className={`w-5 h-5 ${isSaved ? "text-red-500" : ""}`} filled={isSaved} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="p-5">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{recipe.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 h-10">{recipe.description}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                                <ClockIcon className="w-4 h-4" />
                                {parseInt(recipe.prepTime) + parseInt(recipe.cookTime) || '30'}m
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${
                                    recipe.difficulty === 'Easy' ? 'bg-green-500' :
                                    recipe.difficulty === 'Medium' ? 'bg-yellow-500' :
                                    'bg-red-500'
                                }`}></span>
                                {recipe.difficulty}
                            </div>
                        </div>
                        {/* Tags Preview */}
                        <div className="mt-3 flex flex-wrap gap-1">
                           {recipe.tags.slice(0, 3).map(tag => (
                               <span key={tag} className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                   {tag}
                               </span>
                           ))}
                        </div>
                    </div>
                    </div>
                 );
              })}
            </div>
          </div>
        ) : viewMode !== 'planner' ? (
            // Show different empty states depending on why it's empty
            sourceHasRecipes ? (
                <div className="max-w-4xl mx-auto text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <FilterIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No recipes match your filters</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Try removing some filters to see more results.</p>
                    <button onClick={() => setActiveFilters([])} className="text-orange-600 dark:text-orange-400 font-medium hover:underline">Clear all filters</button>
                </div>
            ) : viewMode === 'saved' ? (
                <div className="max-w-4xl mx-auto text-center py-20 bg-orange-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-orange-200 dark:border-gray-700">
                    <HeartIcon className="w-12 h-12 text-orange-200 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No saved recipes yet</h3>
                    <p className="text-gray-500 dark:text-gray-400">Generate some delicious recipes and save them here!</p>
                    <button onClick={() => setViewMode('generated')} className="mt-4 text-orange-600 dark:text-orange-400 font-medium hover:underline">Go to Generator</button>
                </div>
            ) : null
        ) : null}
      </main>

      {/* Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal 
            recipe={selectedRecipe} 
            isOpen={!!selectedRecipe} 
            onClose={() => setSelectedRecipe(null)} 
            isSaved={savedRecipes.some(r => r.id === selectedRecipe.id)}
            onToggleSave={() => toggleSaveRecipe(selectedRecipe)}
            onShowToast={() => setShowToast(true)}
        />
      )}

    </div>
  );
}

export default App;