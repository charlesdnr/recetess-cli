export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  ingredients: Ingredient[];
  instructions: string[];
  steps: string[];
  imageUrl: string;
  tags: string[];

  category: string;
  subcategory: string;
}

export interface Category {
  id?: string;
  name: string;
  subcategories: Subcategory[];
  sortOrder?: number;
}
export interface Subcategory {
  name: string;
  recipes?: Recipe[];
}
export interface Ingredient {
  name: string;
  quantity: number | string; // Peut être un nombre ou 'selon goût', etc.
  unit: string;
}