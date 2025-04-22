// src/app/components/search-results/search-results.component.ts
import { Component, OnInit, inject, signal, computed, WritableSignal } from '@angular/core'; // Ajoutez WritableSignal
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model'; // Assurez-vous que Recipe est importé
import { Observable, switchMap, tap, catchError, of } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider'; // Importer DividerModule

// Structure pour les données groupées
interface GroupedSubcategory {
  name: string;
  recipes: Recipe[];
}
interface GroupedCategory {
  name: string;
  subcategories: GroupedSubcategory[];
  // Optionnel: pour les recettes sans sous-catégorie explicite mais appartenant à la catégorie
  recipesWithoutSubcategory: Recipe[];
}

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    MessageModule,
    DividerModule // Ajouter DividerModule ici
  ],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss']
})
export class SearchResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);

  searchTerm = signal<string>('');
  recipes = signal<Recipe[]>([]); // Garder pour les résultats de recherche non groupés
  isLoading = signal<boolean>(false);
  errorLoading = signal<string | null>(null);

  // *** NOUVEAU Signal pour les recettes groupées ***
  groupedRecipes: WritableSignal<GroupedCategory[]> = signal([]);

  resultsCount = computed(() => {
    // Compter toutes les recettes dans la structure groupée si elle est utilisée, sinon compter la liste plate
    if (!this.searchTerm()) {
      return this.groupedRecipes().reduce((total, cat) =>
        total + cat.recipesWithoutSubcategory.length + cat.subcategories.reduce((subTotal, sub) => subTotal + sub.recipes.length, 0), 0);
    }
    return this.recipes().length;
  });


  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      tap(() => {
        this.isLoading.set(true);
        this.recipes.set([]);
        this.groupedRecipes.set([]); // Réinitialiser aussi les groupes
        this.errorLoading.set(null);
      }),
      switchMap(params => {
        const query = params.get('q');
        this.searchTerm.set(query || '');

        if (!query) {
          // Charger toutes les recettes pour le regroupement
          return this.recipeService.loadAllRecipesFromApi().pipe(
             catchError(err => {
                console.error("Error loading all recipes:", err);
                this.errorLoading.set("Une erreur est survenue lors du chargement des recettes.");
                return of([]);
             })
          );
        } else {
          // Charger les résultats de recherche (pas de regroupement ici)
          return this.recipeService.searchRecipes(query).pipe(
             catchError(err => {
                console.error("Error searching recipes:", err);
                this.errorLoading.set("Une erreur est survenue lors de la recherche.");
                return of([]);
             })
          );
        }
      }),
      tap((loadedRecipes) => {
        // *** MODIFICATION : Traiter les résultats ici ***
        if (!this.searchTerm()) {
          // Si on chargeait TOUTES les recettes, les grouper maintenant
          this.groupRecipes(loadedRecipes);
          this.recipes.set([]); // Vider la liste plate car on utilise groupedRecipes
        } else {
          // Si c'était une recherche, stocker les résultats dans la liste plate
          this.recipes.set(loadedRecipes);
          this.groupedRecipes.set([]); // Vider les groupes
        }
        this.isLoading.set(false);
      })
    ).subscribe(); // Plus besoin de faire le set dans subscribe, c'est fait dans tap
  }

  // *** NOUVELLE méthode pour grouper les recettes ***
  private groupRecipes(recipes: Recipe[]): void {
    const groups: { [category: string]: GroupedCategory } = {};

    recipes.forEach(recipe => {
      const catName = recipe.category || 'Non classé';
      const subCatName = recipe.subcategory;

      // Initialiser la catégorie si elle n'existe pas
      if (!groups[catName]) {
        groups[catName] = { name: catName, subcategories: [], recipesWithoutSubcategory: [] };
      }

      if (subCatName) {
        // Trouver ou créer la sous-catégorie
        let subCategory = groups[catName].subcategories.find(sub => sub.name === subCatName);
        if (!subCategory) {
          subCategory = { name: subCatName, recipes: [] };
          groups[catName].subcategories.push(subCategory);
        }
        subCategory.recipes.push(recipe);
        // Trier les recettes dans la sous-catégorie (optionnel)
        subCategory.recipes.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        // Ajouter à la liste des recettes sans sous-catégorie pour cette catégorie
        groups[catName].recipesWithoutSubcategory.push(recipe);
        // Trier les recettes sans sous-catégorie (optionnel)
        groups[catName].recipesWithoutSubcategory.sort((a, b) => a.title.localeCompare(b.title));
      }
    });

    // Convertir l'objet en tableau et trier
    const groupedArray = Object.values(groups);

    // Trier les sous-catégories dans chaque catégorie
    groupedArray.forEach(cat => {
      cat.subcategories.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Trier les catégories principales
    groupedArray.sort((a, b) => a.name.localeCompare(b.name));

    this.groupedRecipes.set(groupedArray);
  }
  // *** FIN NOUVELLE méthode ***


  getFullImageUrl(imageUrl: string | undefined): string {
    const defaultImg = 'assets/images/default-recipe.jpg';
    if (imageUrl && imageUrl.startsWith('https://res.cloudinary.com/')) {
      return imageUrl;
    }
    return defaultImg;
  }
}