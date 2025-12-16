export interface Ingredient {
  name: string;
  amount: string;
}

export interface Nutrition {
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
}

export interface Recipe {
  id: string; // generated locally for list keys
  name: string;
  description: string;
  calories: string; // e.g., "450 kcal"
  prepTime: string;
  cookTime: string;
  difficulty: string;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  nutrition?: Nutrition; // Optional to support backward compatibility
  drinkPairing?: string; // Optional to support backward compatibility
}

export interface GenerationRequest {
  availableIngredients: string[];
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

export type MealPlan = {
  [key in DayOfWeek]?: {
    [key in MealType]?: Recipe;
  };
};