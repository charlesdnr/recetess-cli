// Recettes/recettes/src/app/components/home/home.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // Assurez-vous que RouterLink est importé
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider'; // Importez si vous l'utilisez (optionnel)
import { Category } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';

@Component({
  selector: 'app-home',
  standalone: true,
  // Incluez les modules nécessaires, notamment CommonModule, RouterLink, CardModule
  imports: [CommonModule, RouterLink, CardModule, ButtonModule, DividerModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  // Une seule liste pour toutes les catégories
  allCategories: Category[] = [];
  isLoading: boolean = true;

  constructor(private recipeService: RecipeService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.recipeService.getCategories().subscribe({
      next: (categories) => {
        // Affectez directement toutes les catégories à la liste unique
        this.allCategories = categories;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Erreur lors du chargement des catégories:", err);
        this.isLoading = false;
      }
    });
  }

  // Fonctions utilitaires pour générer les liens proprement
  getCategoryLink(categoryName: string): string[] {
    // Assurez-vous que le nom est correctement formaté pour l'URL si nécessaire
    return ['/category', categoryName];
  }

  getSubcategoryLink(categoryName: string, subcategoryName: string): string[] {
    // Idem pour les sous-catégories
    return ['/category', categoryName, subcategoryName];
  }
}