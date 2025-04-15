import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router'; // RouterLink pour les liens
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';
import { Observable, switchMap, tap, catchError, of } from 'rxjs';

// Imports PrimeNG (similaires à category.component)
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner'; // Pour le chargement
import { MessageModule } from 'primeng/message'; // Pour les messages d'erreur/vide

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
    MessageModule
  ],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss'] // Créez ce fichier
})
export class SearchResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);

  searchTerm = signal<string>('');
  recipes = signal<Recipe[]>([]);
  isLoading = signal<boolean>(false);
  errorLoading = signal<string | null>(null);

  // Calcul pour le nombre de résultats (optionnel)
  resultsCount = computed(() => this.recipes().length);

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      tap(() => {
        this.isLoading.set(true); // Démarrer le chargement
        this.recipes.set([]); // Vider les anciens résultats
        this.errorLoading.set(null);
      }),
      switchMap(params => {
        const query = params.get('q');
        this.searchTerm.set(query || ''); // Mettre à jour le signal du terme recherché
        if (!query) {
          return of([]); // Pas de terme, retourne un tableau vide
        }
        return this.recipeService.searchRecipes(query).pipe(
           catchError(err => {
              this.errorLoading.set("Une erreur est survenue lors de la recherche.");
              return of([]); // Retourne un tableau vide en cas d'erreur
           })
        );
      }),
      tap(() => this.isLoading.set(false)) // Arrêter le chargement après réception
    ).subscribe(results => {
      this.recipes.set(results);
    });
  }

  // Fonction pour obtenir l'URL complète de l'image (similaire à category.component)
  getFullImageUrl(imageUrl: string | undefined): string {
    const defaultImg = 'assets/images/default-recipe.jpg';
    if (imageUrl && imageUrl.startsWith('https://res.cloudinary.com/')) {
      return imageUrl;
    }
    return defaultImg;
  }
}