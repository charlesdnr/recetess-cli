// src/app/components/category/category.component.ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Recipe } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
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
    SelectModule,
    FormsModule
  ],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);
  public authService = inject(AuthService);

  category = signal('');
  subcategory = signal('');
  recipes = signal<Recipe[]>([])

  recipesSort = computed(() => {
    return this.recipes().sort((a: Recipe, b: Recipe) => {
      if (this.sortField() === 'prepTime') {
        const timeA = (a.prepTime || 0) + (a.cookTime || 0);
        const timeB = (b.prepTime || 0) + (b.cookTime || 0);
        return timeA - timeB;
      }
      if (this.sortField() === 'difficulty') {
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
      // For 'newest' or any other value, default to sorting by title
      return a.title.localeCompare(b.title);
    });
  });


  isAdmin$: Observable<boolean> | null = null;

  // Options de tri
  sortOptions = [
    { label: 'Plus récent', value: 'newest' },
    { label: 'Temps de préparation', value: 'prepTime' },
    { label: 'Difficulté', value: 'difficulty' }
  ];
  sortField = signal('newest'); // Valeur par défaut
  backendBaseUrl: string = '';

  ngOnInit(): void {
    this.isAdmin$ = this.authService.isAdmin$;
    this.backendBaseUrl = this.recipeService.backendBaseUrl;

    // Use effect or subscribe to paramMap and update signals
    this.route.paramMap.subscribe(params => {
      const categoryValue = params.get('category') || '';
      const subcategoryValue = params.get('subcategory') || '';

      this.category.set(categoryValue);
      this.subcategory.set(subcategoryValue);

      // Use the signal values directly
      const loadRecipesFn = subcategoryValue
        ? this.recipeService.getRecipesBySubcategory(categoryValue, subcategoryValue)
        : this.recipeService.getRecipesByCategory(categoryValue);

      loadRecipesFn.subscribe({
        next: (loadedRecipes) => {
          this.recipes.set(loadedRecipes);
        },
        error: (err) => console.error('[CategoryComponent] Error loading recipes:', err)
      });
    });
  }

  getFullImageUrl(imageUrl: string | undefined): string {
    const defaultImg = 'assets/images/default-recipe.jpg'; // Chemin local

    if (imageUrl && imageUrl.startsWith('https://res.cloudinary.com/')) {
      // Si c'est une URL Cloudinary valide, on la retourne directement
      return imageUrl;
    }
    return defaultImg;
  }
}
