export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  imageUrl: string;
  tags: string[];

  category: string;
  subcategory: string;
}

export interface Category {
  name: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  name: string;
  recipes?: Recipe[];
}