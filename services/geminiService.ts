import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRecipes = async (ingredients: string[]): Promise<Recipe[]> => {
  if (ingredients.length === 0) return [];

  const model = "gemini-2.5-flash"; // Using Flash for speed as requested
  
  const prompt = `
    I have the following ingredients available: ${ingredients.join(", ")}.
    
    Please suggest 3 distinct, delicious recipes that I can make primarily using these ingredients. 
    You may assume I have basic pantry staples like salt, pepper, oil, water, and flour.
    
    **CRITICAL**: Try to include diverse cuisines, specifically at least one Indian-style recipe (e.g., Curry, Masala, Stir-fry) if the ingredients allow.
    
    For each recipe, provide:
    1. A catchy name.
    2. A short, appetizing description.
    3. Total calories per serving (e.g., "450 kcal").
    4. Preparation time and Cooking time (e.g., "15 min").
    5. Difficulty level (Easy, Medium, Hard).
    6. Number of servings this recipe yields (default to 2 or 4).
    7. A detailed list of ingredients with specific measurements (metric or standard).
    8. Step-by-step cooking instructions.
    9. A list of tags. CRITICAL: Include ALL applicable dietary tags from this list if the recipe qualifies: "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Low-Carb", "Healthy". Also include meal types (e.g. "Dinner", "Lunch") and cuisine type (e.g. "Indian", "Italian").
    10. Nutritional breakdown per serving: Protein, Carbs, Fat, and Fiber (e.g., "20g").
    11. A specific beverage pairing recommendation (wine, beer, or non-alcoholic) that complements the dish (max 10 words).
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class chef and nutritionist specializing in global cuisines, especially Indian, Italian, and Asian dishes. Your goal is to create creative, feasible, and healthy recipes based on limited user inputs. Be precise with measurements and nutritional estimates. Ensure dietary tags are accurate.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              calories: { type: Type.STRING },
              prepTime: { type: Type.STRING },
              cookTime: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              servings: { type: Type.INTEGER },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amount: { type: Type.STRING }
                  },
                  required: ["name", "amount"]
                }
              },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              nutrition: {
                type: Type.OBJECT,
                properties: {
                  protein: { type: Type.STRING },
                  carbs: { type: Type.STRING },
                  fat: { type: Type.STRING },
                  fiber: { type: Type.STRING }
                },
                required: ["protein", "carbs", "fat", "fiber"]
              },
              drinkPairing: { type: Type.STRING }
            },
            required: ["name", "description", "calories", "ingredients", "steps", "prepTime", "cookTime", "difficulty", "servings", "nutrition", "drinkPairing"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No data returned from AI");
    }

    const recipes: Omit<Recipe, 'id'>[] = JSON.parse(jsonText);
    
    // Add IDs for React rendering
    return recipes.map((r, index) => ({
      ...r,
      id: `recipe-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Error generating recipes:", error);
    throw error;
  }
};