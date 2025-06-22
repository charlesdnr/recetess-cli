// src/app/components/home/home.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { Category, Recipe } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';
import { forkJoin } from 'rxjs'; // Import de forkJoin

// Interface étendue pour inclure le nombre de recettes
interface CategoryWithCount extends Category {
  recipeCount: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, CardModule, ButtonModule, DividerModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  // Utiliser notre nouvelle interface pour le typage
  allCategories: CategoryWithCount[] = [];
  isLoading: boolean = true;
  recipesCount: number = 0;

  constructor(private recipeService: RecipeService) {}

  ngOnInit(): void {
    this.isLoading = true;

    // Utiliser forkJoin pour charger les catégories et les recettes en parallèle
    forkJoin({
      categories: this.recipeService.getCategories(),
      recipes: this.recipeService.loadAllRecipesFromApi() // S'assurer de charger toutes les recettes
    }).subscribe({
      next: ({ categories, recipes }) => {
        this.recipesCount = recipes.length;

        // Calculer le nombre de recettes pour chaque catégorie
        this.allCategories = categories.map(category => {
          const count = recipes.filter(recipe => recipe.category === category.name).length;
          return {
            ...category,
            recipeCount: count // Ajouter la propriété recipeCount
          };
        });

        this.isLoading = false;
      },
      error: (err) => {
        console.error("Erreur lors du chargement des données :", err);
        this.isLoading = false;
      }
    });
  }

  // Les fonctions de liens restent inchangées
  getCategoryLink(categoryName: string): string[] {
    return ['/category', categoryName];
  }

  getSubcategoryLink(categoryName: string, subcategoryName: string): string[] {
    return ['/category', categoryName, subcategoryName];
  }
}