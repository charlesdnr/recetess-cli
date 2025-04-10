import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'category/:category', 
    loadComponent: () => import('./components/category/category.component').then(m => m.CategoryComponent) 
  },
  { 
    path: 'category/:category/:subcategory', 
    loadComponent: () => import('./components/category/category.component').then(m => m.CategoryComponent) 
  },
  { 
    path: 'recipe/:id', 
    loadComponent: () => import('./components/recipe-detail/recipe-detail.component').then(m => m.RecipeDetailComponent) 
  },
  { 
    path: 'new-recipe', 
    loadComponent: () => import('./components/recipe-form/recipe-form.component').then(m => m.RecipeFormComponent) 
  },
  { 
    path: 'edit-recipe/:id', 
    loadComponent: () => import('./components/recipe-form/recipe-form.component').then(m => m.RecipeFormComponent) 
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];