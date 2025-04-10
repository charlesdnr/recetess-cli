// src/app/components/category/category.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Recipe } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
// DataViewModule et SelectButtonModule ne sont plus nécessaires
// import { DataViewModule } from 'primeng/dataview';
// import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    // DataViewModule, // RETIRÉ
    // SelectButtonModule, // RETIRÉ
    SelectModule,
    FormsModule
  ],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  category: string = '';
  subcategory: string = '';
  recipes: Recipe[] = [];
  // layout et layoutOptions ne sont plus nécessaires
  // layout: 'grid' | 'list' = 'grid';
  // layoutOptions = [
  //   { icon: 'pi pi-th-large', value: 'grid' },
  //   { icon: 'pi pi-list', value: 'list' }
  // ];
  isAdmin$: Observable<boolean>;

  // Options de tri (conservées mais inactives sans logique manuelle)
  sortOptions = [
    { label: 'Plus récent', value: 'newest' }, // Vous devrez définir comment trier par 'newest'
    { label: 'Temps de préparation', value: 'prepTime' },
    { label: 'Difficulté', value: 'difficulty' } // Vous devrez définir comment trier par 'difficulty'
  ];
  sortField: string = 'newest'; // Valeur par défaut

  readonly backendBaseUrl: string; // Stocker l'URL

  constructor(
    private route: ActivatedRoute,
    private recipeService: RecipeService,
    public authService: AuthService
  ) {
    this.isAdmin$ = this.authService.isAdmin$;
    this.backendBaseUrl = this.recipeService.backendBaseUrl; // Assigner l'URL
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.category = params.get('category') || '';
      this.subcategory = params.get('subcategory') || '';
      console.log(`[CategoryComponent] Category: ${this.category}, Subcategory: ${this.subcategory}`);

      const loadRecipesFn = this.subcategory
        ? this.recipeService.getRecipesBySubcategory(this.category, this.subcategory)
        : this.recipeService.getRecipesByCategory(this.category);

      loadRecipesFn.subscribe({
        next: (loadedRecipes) => {
          console.log('[CategoryComponent] Recipes received:', loadedRecipes);
          this.recipes = loadedRecipes; // Assignation directe
          // NOTE: Le tri manuel devrait être appliqué ici si nécessaire
          // this.sortRecipes(); // Appel d'une fonction de tri (à créer)
          console.log('[CategoryComponent] this.recipes assigned:', this.recipes);
          if (loadedRecipes.length === 0) {
            console.warn('[CategoryComponent] No recipes found.');
          }
        },
        error: (err) => console.error('[CategoryComponent] Error loading recipes:', err)
      });
    });
  }

  onSortChange(event: any) {
    this.sortField = event.value;
    console.log('[CategoryComponent] Sort field changed to:', this.sortField);
    // **ACTION REQUISE ICI SI VOUS VOULEZ LE TRI**
    // Vous devez implémenter la logique pour trier le tableau `this.recipes`
    // en fonction de la nouvelle valeur de `this.sortField`.
    this.sortRecipes(); // Appel d'une fonction de tri (à créer)
  }

  // --- EXEMPLE DE FONCTION DE TRI (à adapter/compléter) ---
  sortRecipes(): void {
    if (!this.recipes) return;

    const field = this.sortField;

    this.recipes.sort((a, b) => {
      if (field === 'prepTime') {
        const timeA = (a.prepTime || 0) + (a.cookTime || 0);
        const timeB = (b.prepTime || 0) + (b.cookTime || 0);
        return timeA - timeB;
      }
      if (field === 'difficulty') {
        // Définir un ordre pour la difficulté (ex: Très facile=1, Facile=2, ...)
        const difficultyOrder: { [key: string]: number } = {
          'Très facile': 1,
          'Facile': 2,
          'Moyen': 3,
          'Difficile': 4
        };
        const difficultyA = difficultyOrder[a.difficulty] || 99;
        const difficultyB = difficultyOrder[b.difficulty] || 99;
        return difficultyA - difficultyB;
      }
      if (field === 'newest') {
        // Le tri par "plus récent" est difficile sans date de création.
        // On pourrait trier par titre par défaut ou ne rien faire.
        return a.title.localeCompare(b.title); // Tri par titre par défaut pour 'newest'
      }
      // Autres cas de tri potentiels
      return 0;
    });

    // Important si vous utilisez OnPush change detection (pas le cas ici par défaut)
    // this.recipes = [...this.recipes];
    console.log('[CategoryComponent] Recipes sorted by:', field, this.recipes);
  }

  getFullImageUrl(imageUrl: string | undefined): string {
    const defaultImg = 'assets/images/default-recipe.jpg'; // Chemin local par défaut

    // Si pas d'URL, si c'est l'URL par défaut, ou si ça ne commence pas par /uploads
    if (!imageUrl || imageUrl === defaultImg || !imageUrl.startsWith('/uploads')) {
      // Retourner l'image par défaut (qui est dans les assets Angular)
      return defaultImg;
    }
    // === CORRECTION ICI ===
    // Préfixer avec l'URL du backend en utilisant correctement les backticks et ${}
    return `${this.backendBaseUrl}${imageUrl}`;
    // =======================
  }

  // trackById n'est plus nécessaire si on utilise @for sans *ngFor
  // trackByIndex n'est plus nécessaire non plus
}
