// src/app/services/recipe.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'; // Ajout HttpParams
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map, shareReplay } from 'rxjs/operators';
import { Recipe, Category } from '../models/recipe.model'; // Subcategory peut ne plus être utile ici

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  // URL de l'API backend
  readonly backendBaseUrl = 'http://localhost:3000'; // URL de base du backend
  private apiUrl = `${this.backendBaseUrl}/api/recipes`;
  private uploadUrl = `${this.backendBaseUrl}/api/upload/image`;

  private allRecipesCache$: Observable<Recipe[]> | null = null;

  // CORRECTION : Remettre la structure complète ici
  private staticCategories: Category[] = [
    { name: 'Salades', subcategories: [] }, // Assurez-vous que les noms correspondent aux dossiers backend/data/recipes
    {
      name: 'Entrées',
      subcategories: [
        { name: 'poissons-crus' }, // Pas besoin de 'recipes:[]' ici
        { name: 'sur-le-pouce' },
        { name: 'verrines-tartines-dips' },
        { name: 'Pains' },
        { name: 'Poissons' },
      ],
    },
    {
      name: 'plats-principaux',
      subcategories: [
        { name: 'plats-legumes-pommes-de-terre' },
        { name: 'souppes-veloutes' },
        { name: 'pates' },
        { name: 'plats-base-riz-cereales' },
        { name: 'viandes-volailles' },
        { name: 'poissons-fruit-mer' },
        { name: 'tartes-salees' },
      ],
    },
    {
      name: 'desserts',
      subcategories: [
        { name: 'gateaux-tartes' },
        { name: 'gateaux-individuels' },
        { name: 'cremes-glaces-dips' },
      ],
    },
    { name: 'Brunch-petit-dejeuner', subcategories: [] },
    { name: 'boissons', subcategories: [] },
  ];

  constructor(private http: HttpClient) {}

  // getCategories utilise maintenant la structure complète
  getCategories(): Observable<Category[]> {
    return of(this.staticCategories);
  }

  // --- Charger TOUTES les recettes depuis l'API (avec cache) ---
  private loadAllRecipesFromApi(): Observable<Recipe[]> {
    if (!this.allRecipesCache$) {
      console.log(
        '[RecipeService] Cache miss: Loading all recipes from API...'
      );
      this.allRecipesCache$ = this.http.get<Recipe[]>(this.apiUrl).pipe(
        tap((recipes) =>
          console.log(
            `[RecipeService] Loaded ${recipes.length} recipes from API.`
          )
        ),
        shareReplay(1), // Cacher le résultat
        catchError((err) => {
          // Gérer erreur de chargement API
          console.error(
            '[RecipeService] Critical error loading recipes from API:',
            err
          );
          this.allRecipesCache$ = null; // Reset cache on error
          return throwError(() => new Error('Could not load recipes from API'));
        })
      );
    } else {
      console.log('[RecipeService] Cache hit: Returning cached recipes.');
    }
    return this.allRecipesCache$;
  }

  // --- Invalidation du cache ---
  private invalidateCache(): void {
    this.allRecipesCache$ = null;
    console.log('[RecipeService] Cache invalidated.');
  }

  // --- GETTERS utilisant le cache API ---
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
    return this.loadAllRecipesFromApi().pipe(
      map((recipes) => recipes.find((r) => r.id === id)),
      catchError(() => of(undefined))
    );
  }

  // --- Fonctions d'écriture (POST, PUT, DELETE) ---

  saveRecipe(recipe: Recipe): Observable<Recipe> {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    };
    const recipePayload = { ...recipe };

    if (recipePayload.id && recipePayload.id !== '') {
      // Update (PUT)
      // === VÉRIFIEZ CETTE LIGNE ATTENTIVEMENT ===
      const url = `${this.apiUrl}/${recipePayload.id}`;
      // ==========================================

      console.log(`[RecipeService] Updating recipe via PUT: ${url}`); // Vérifiez ce log dans la console navigateur
      return this.http.put<Recipe>(url, recipePayload, httpOptions).pipe(
        tap((updatedRecipe) => {
          console.log('[RecipeService] Recipe updated via API:', updatedRecipe);
          this.invalidateCache();
        }),
        catchError(this.handleError<Recipe>('updateRecipe'))
      );
    } else {
      console.log(`[RecipeService] Creating recipe via POST: ${this.apiUrl}`);
      // On envoie le payload tel quel. Le backend ignorera l'ID vide/null/undefined
      // et générera le sien.
      return this.http
        .post<Recipe>(this.apiUrl, recipePayload, httpOptions)
        .pipe(
          tap((newRecipe) => {
            console.log('[RecipeService] Recipe created via API:', newRecipe);
            // Le backend devrait renvoyer la recette COMPLÈTE avec le nouvel ID
            this.invalidateCache(); // Invalider le cache après succès
          }),
          catchError(this.handleError<Recipe>('addRecipe'))
        );
    }
  }

  // Dans src/app/services/recipe.service.ts -> deleteRecipe

  deleteRecipe(
    id: string,
    category: string,
    subcategory?: string
  ): Observable<boolean> {
    if (!id || !category) {
      console.error('[RecipeService] Delete requires ID and Category.');
      return of(false);
    }

    // === VÉRIFIEZ CETTE LIGNE ATTENTIVEMENT ===
    const url = `${this.apiUrl}/${id}`; // Construit l'URL ex: http://.../api/recipes/mon-id
    // ==========================================

    let params = new HttpParams().set('category', category);
    if (subcategory) {
      params = params.set('subcategory', subcategory);
    }

    console.log(
      `[RecipeService] Deleting recipe via DELETE: ${url} with params:`,
      params.toString()
    ); // Vérifiez ce log

    // Utilise bien la variable 'url' construite ci-dessus
    return this.http.delete<void>(url, { params: params }).pipe(
      map(() => true),
      tap(() => {
        console.log(
          `[RecipeService] Recipe deleted successfully via API: ${id}`
        );
        this.invalidateCache();
      }),
      catchError(this.handleError<boolean>('deleteRecipe', false))
    );
  }

  // --- Gestionnaire d'erreurs simple ---
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(
        `[RecipeService] ${operation} failed: ${error.message}`,
        error
      );
      // Mieux : envoyer l'erreur à un service de logging distant
      // Mieux : afficher un message clair à l'utilisateur
      return of(result as T); // Laisser l'app continuer
    };
  }

  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    // 'recipeImage' doit correspondre au nom attendu par multer.single()
    formData.append('recipeImage', file, file.name);

    console.log(`[RecipeService] Upload de l'image: ${file.name}`);
    // HttpClient gère le Content-Type pour FormData
    return this.http.post<{ imageUrl: string }>(this.uploadUrl, formData).pipe(
      tap((response) =>
        console.log('[RecipeService] Réponse upload image:', response)
      ),
      catchError(
        this.handleError<{ imageUrl: string }>('uploadImage', { imageUrl: '' })
      ) // Retourne URL vide si erreur
    );
  }
}
