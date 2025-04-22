// src/app/services/recipe.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map, shareReplay } from 'rxjs/operators';
import { Recipe, Category } from '../models/recipe.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  readonly backendBaseUrl = environment.endpoint;
  private apiUrl = `${this.backendBaseUrl}/api/recipes`;
  private categoriesApiUrl = `${this.backendBaseUrl}/api/categories`;
  private uploadUrl = `${this.backendBaseUrl}/api/upload/image`;

  private allRecipesCache$: Observable<Recipe[]> | null = null;
  private allCategoriesCache$: Observable<Category[]> | null = null;

  constructor(private http: HttpClient) {}

  // --- Gestion des Catégories/Sous-catégories ---

  // POST /api/categories - Créer (pas de changement de signature ici)
  addCategory(name: string): Observable<{ message: string; id?: string }> {
    // Peut renvoyer l'ID créé
    // Le backend doit renvoyer l'ID dans la réponse pour être complet
    return this.http
      .post<{ message: string; id?: string }>(this.categoriesApiUrl, { name })
      .pipe(
        tap((response) => {
          this.invalidateCategoryCache();
        }),
        catchError(
          this.handleError<{ message: string; id?: string }>('addCategory')
        )
      );
  }

  // DELETE /api/categories/:id - Supprimer par ID
  deleteCategory(categoryId: string): Observable<{ message: string }> {
    // <-- Attend categoryId
    // Utilise l'ID dans l'URL
    const url = `${this.categoriesApiUrl}/${encodeURIComponent(categoryId)}`;
    return this.http.delete<{ message: string }>(url).pipe(
      tap(() => {
        this.invalidateCategoryCache();
        this.invalidateRecipeCache();
      }),
      catchError(this.handleError<{ message: string }>('deleteCategory'))
    );
  }

  // POST /api/categories/:id/subcategories - Ajouter une sous-catégorie par ID de catégorie parente
  addSubcategory(
    categoryId: string,
    subcategoryName: string
  ): Observable<{ message: string }> {
    // <-- Attend categoryId
    // Utilise l'ID dans l'URL
    const url = `${this.categoriesApiUrl}/${encodeURIComponent(
      categoryId
    )}/subcategories`;
    return this.http
      .post<{ message: string }>(url, { name: subcategoryName })
      .pipe(
        tap(() => {
          this.invalidateCategoryCache();
        }),
        catchError(this.handleError<{ message: string }>('addSubcategory'))
      );
  }

  // DELETE /api/categories/:id/subcategories/:name - Supprimer une sous-catégorie par ID parent et nom sous-cat
  deleteSubcategory(
    categoryId: string,
    subcategoryName: string
  ): Observable<{ message: string }> {
    // <-- Attend categoryId
    // Utilise l'ID dans l'URL
    const url = `${this.categoriesApiUrl}/${encodeURIComponent(
      categoryId
    )}/subcategories/${encodeURIComponent(subcategoryName)}`;
    return this.http.delete<{ message: string }>(url).pipe(
      tap(() => {
        this.invalidateCategoryCache();
        // Pas forcément besoin d'invalider le cache recette ici, sauf si on veut être ultra prudent
        // this.invalidateRecipeCache();
      }),
      catchError(this.handleError<{ message: string }>('deleteSubcategory'))
    );
  }

  getCategories(): Observable<Category[]> {
    if (!this.allCategoriesCache$) {
      this.allCategoriesCache$ = this.http
        .get<Category[]>(this.categoriesApiUrl)
        .pipe(
          // map(categories => categories.sort((a, b) => a.name.localeCompare(b.name))), // Optionnel: garder un tri alphabétique final si besoin
          shareReplay(1),
          catchError((err) => {
            console.error(
              '[RecipeService] Critical error loading categories from API:',
              err
            );
            this.allCategoriesCache$ = null;
            return throwError(
              () => new Error('Could not load categories from API')
            );
          })
        );
    }
    return this.allCategoriesCache$;
  }

  // ... (Le reste du service : recettes CRUD, uploadImage, handleError) ...
  private invalidateRecipeCache(): void {
    this.allRecipesCache$ = null;
  }

  private invalidateCategoryCache(): void {
    this.allCategoriesCache$ = null;
  }

  public clearAllCaches(): void {
    this.invalidateRecipeCache();
    this.invalidateCategoryCache();
  }
  loadAllRecipesFromApi(): Observable<Recipe[]> {
    if (!this.allRecipesCache$) {
      this.allRecipesCache$ = this.http.get<Recipe[]>(this.apiUrl).pipe(
        shareReplay(1), // Cacher le résultat
        catchError((err) => {
          console.error(
            '[RecipeService] Critical error loading recipes from API:',
            err
          );
          this.allRecipesCache$ = null; // Reset cache on error
          return throwError(() => new Error('Could not load recipes from API'));
        })
      );
    }
    return this.allRecipesCache$;
  }
  getRecipesByCategory(categoryName: string): Observable<Recipe[]> {
    return this.loadAllRecipesFromApi().pipe(
      map((recipes) => recipes.filter((r) => r.category === categoryName)),
      catchError(() => of([]))
    );
  }
  getRecipesBySubcategory(
    categoryName: string,
    subcategoryName: string
  ): Observable<Recipe[]> {
    return this.loadAllRecipesFromApi().pipe(
      map((recipes) =>
        recipes.filter(
          (r) =>
            r.category === categoryName && r.subcategory === subcategoryName
        )
      ),
      catchError(() => of([]))
    );
  }
  getRecipe(id: string): Observable<Recipe | undefined> {
    // L'ID ici est l'ID de la *recette*, pas de la catégorie
    return this.loadAllRecipesFromApi().pipe(
      map((recipes) => recipes.find((r) => r.id === id)),
      catchError(() => of(undefined))
    );
  }
  saveRecipe(recipe: Recipe): Observable<Recipe> {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    };
    // L'ID ici est celui de la *recette*
    const recipePayload: any = { ...recipe };
    delete recipePayload.id; // L'ID est dans l'URL pour PUT, ou généré par Firestore pour POST

    if (recipe.id) {
      // Si un ID existe, c'est une mise à jour (PUT)
      const url = `${this.apiUrl}/${recipe.id}`;
      return this.http.put<Recipe>(url, recipePayload, httpOptions).pipe(
        tap((updatedRecipe) => {
          this.invalidateRecipeCache();
        }),
        catchError(this.handleError<Recipe>('updateRecipe'))
      );
    } else {
      // Sinon, c'est une création (POST)
      return this.http
        .post<Recipe>(this.apiUrl, recipePayload, httpOptions)
        .pipe(
          tap((newRecipe) => {
            this.invalidateRecipeCache();
          }),
          catchError(this.handleError<Recipe>('addRecipe'))
        );
    }
  }
  deleteRecipe(id: string): Observable<boolean> {
    // L'ID ici est celui de la *recette*
    if (!id) {
      console.error('[RecipeService] Delete recipe requires ID.');
      return of(false);
    }
    const url = `${this.apiUrl}/${id}`;
    // Note: La suppression de recette backend supprime aussi l'image associée
    return this.http.delete<void>(url).pipe(
      map(() => true),
      tap(() => {
        this.invalidateRecipeCache();
      }),
      catchError(this.handleError<boolean>('deleteRecipe', false))
    );
  }
  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('recipeImage', file, file.name);
    return this.http.post<{ imageUrl: string }>(this.uploadUrl, formData).pipe(
      catchError(
        // Gardez votre gestion d'erreur actuelle
        this.handleError<{ imageUrl: string }>('uploadImage', { imageUrl: '' })
      )
    );
  }

  searchRecipes(term: string): Observable<Recipe[]> {
    if (!term.trim()) {
      // Si le terme est vide, retourner un Observable de tableau vide
      return of([]);
    }
    // Utiliser HttpParams pour encoder correctement le terme de recherche dans l'URL
    const params = new HttpParams().set('q', term);
    const searchUrl = `${this.backendBaseUrl}/api/recipes/search`; // Construire l'URL complète

    return this.http.get<Recipe[]>(searchUrl, { params }).pipe(
      catchError(this.handleError<Recipe[]>('searchRecipes', [])) // Renvoyer [] en cas d'erreur
    );
  }
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(
        `[RecipeService] ${operation} failed: ${error.message}`,
        error
      );
      return throwError(() => error);
    };
  }
}
