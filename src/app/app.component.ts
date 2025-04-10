import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MenubarModule,
    ButtonModule,
    InputTextModule,
    InputGroupAddonModule,
    InputGroupModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Livre de Recettes';
  items: MenuItem[] = [
    {
      label: 'Accueil',
      icon: 'pi pi-home',
      routerLink: '/'
    },
    {
      label: 'Catégories',
      icon: 'pi pi-list',
      items: [
        {
          label: 'Entrées',
          routerLink: '/category/Entrées'
        },
        {
          label: 'Plats principaux',
          routerLink: '/category/Plats principaux'
        },
        {
          label: 'Desserts',
          routerLink: '/category/desserts'
        },
        {
          label: 'Salades',
          routerLink: '/category/Salades'
        },
        {
          label: 'Brunch et petit déjeuner',
          routerLink: '/category/Brunch et petit dejeuner'
        },
        {
          label: 'Boissons',
          routerLink: '/category/boissons'
        }
      ]
    },
    {
      label: 'Nouvelle Recette',
      icon: 'pi pi-plus',
      routerLink: '/new-recipe'
    }
  ];
}