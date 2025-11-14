# Application Angular avec intégration Osmow

Application Angular configurée pour intégrer le blog et les articles Osmow via des scripts d'embed dynamiques.

## 📋 Table des matières

- [Présentation](#présentation)
- [Architecture du projet](#architecture-du-projet)
- [Installation](#installation)
- [Configuration](#configuration)
- [Structure détaillée des fichiers](#structure-détaillée-des-fichiers)
- [Fonctionnement de l'intégration Osmow](#fonctionnement-de-lintégration-osmow)
- [Routes et navigation](#routes-et-navigation)
- [Commandes disponibles](#commandes-disponibles)
- [Dépannage](#dépannage)

---

## 🎯 Présentation

Cette application Angular permet d'intégrer facilement le contenu Osmow (blog et articles) dans votre site web. Elle utilise Angular Router pour gérer la navigation et charge dynamiquement les scripts d'embed Osmow selon la route visitée.

### Technologies utilisées

- **Angular 15+** - Framework TypeScript pour applications web
- **TypeScript 5+** - Typage statique
- **Angular Router** - Gestion du routing
- **RxJS** - Programmation réactive (inclus avec Angular)
- **Osmow** - Plateforme de gestion de contenu

---

## 📁 Architecture du projet

```
client-site-angular/
│
├── 📄 package.json               # Dépendances et scripts npm
├── 📄 angular.json               # Configuration Angular
├── 📄 tsconfig.json              # Configuration TypeScript
├── 📄 README.md                  # Documentation (ce fichier)
│
├── 📂 src/                       # Code source de l'application
│   │
│   ├── 📄 main.ts                # Point d'entrée de l'application
│   ├── 📄 index.html             # Point d'entrée HTML
│   │
│   ├── 📂 app/                   # Module principal
│   │   │
│   │   ├── 📄 app.component.ts   # Composant racine
│   │   ├── 📄 app.routes.ts      # Configuration du routing
│   │   │
│   │   ├── 📂 services/          # Services Angular
│   │   │   └── 📄 osmow-script.service.ts  # Service de chargement des scripts
│   │   │
│   │   ├── 📂 blog/              # Module blog
│   │   │   ├── 📄 blog-page.component.ts    # Composant page blog
│   │   │   └── 📄 article-page.component.ts # Composant page article
│   │   │
│   │   └── 📂 environments/      # Variables d'environnement
│   │       ├── 📄 environment.ts # Environnement de développement
│   │       └── 📄 environment.prod.ts # Environnement de production
│   │
│   └── 📂 assets/                # Ressources statiques
│       └── 📄 styles.css         # Styles CSS globaux
│
├── 📂 dist/                      # Build de production (généré)
├── 📂 node_modules/              # Dépendances npm (généré)
└── 📄 .env                       # Variables d'environnement (optionnel)
```

---

## 🚀 Installation

### Prérequis

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Angular CLI** >= 17.0.0

### Étapes d'installation

1. **Installer Angular CLI globalement** (si ce n'est pas déjà fait)
   ```bash
   npm install -g @angular/cli
   ```

2. **Créer un nouveau projet Angular**
   ```bash
   ng new client-site-angular
   cd client-site-angular
   ```
   
   Lors de la création, choisissez :
   - Routing : **Oui**
   - Stylesheet format : **CSS** (ou votre préférence)
   - Standalone components : **Oui** (recommandé pour Angular 15+)

3. **Installer les dépendances** (si ce n'est pas fait automatiquement)
   ```bash
   npm install
   ```

4. **Lancer le serveur de développement**
   ```bash
   ng serve
   ```

L'application sera accessible sur `http://localhost:4200` (port par défaut d'Angular).

---

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `src/environments/environment.ts` avec les variables suivantes :

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  osmow: {
    siteId: '019a8211-6055-7732-a155-8c4c3dc00dda',
    siteUrl: 'http://localhost:4200',
    signature: '23b01cac9f39b36b571faaf353fe42ba158ee2f0d94286f4018cf40f9a5b904a',
    scriptBase: 'https://app.osmow.com',
  },
};
```

Pour la production, créez `src/environments/environment.prod.ts` :

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  osmow: {
    siteId: '019a8211-6055-7732-a155-8c4c3dc00dda',
    siteUrl: 'https://www.votresite.com',
    signature: '23b01cac9f39b36b571faaf353fe42ba158ee2f0d94286f4018cf40f9a5b904a',
    scriptBase: 'https://app.osmow.com',
  },
};
```

> **Note** : Remplacez les valeurs par celles récupérées depuis **Sites web ▸ Code d'intégration** dans votre tableau de bord Osmow.

### Configuration Angular

Le fichier `angular.json` est généré automatiquement. Assurez-vous que les environnements sont bien configurés :

```json
{
  "projects": {
    "client-site-angular": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.prod.ts"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

---

## 📄 Structure détaillée des fichiers

### `src/app/services/osmow-script.service.ts`

Service Angular pour charger et supprimer les scripts Osmow dynamiquement.

```typescript
// src/app/services/osmow-script.service.ts
import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OsmowScriptService {
  private renderer: Renderer2;
  private scriptIds = new Set<string>();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  appendScript(params: {
    id: string;
    src: string;
    dataset: Record<string, string>;
  }): void {
    // Vérifier si le script existe déjà (évite les doublons)
    if (this.scriptIds.has(params.id)) {
      return;
    }

    const script = this.renderer.createElement('script');
    script.id = params.id;
    script.src = params.src;
    script.async = true;
    script.defer = true;

    // Utiliser setAttribute pour les attributs data-* avec tirets
    // dataset ne supporte que camelCase, mais Osmow nécessite des tirets
    Object.entries(params.dataset).forEach(([key, value]) => {
      this.renderer.setAttribute(script, `data-${key}`, value);
    });

    this.renderer.appendChild(document.body, script);
    this.scriptIds.add(params.id);
  }

  removeScript(id: string): void {
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
      this.scriptIds.delete(id);
    }
  }
}
```

**Fonction `appendScript`** :
- Vérifie si le script existe déjà (évite les doublons)
- Utilise `Renderer2` d'Angular pour manipuler le DOM de manière sécurisée
- Crée un élément `<script>` avec les attributs requis
- Utilise `setAttribute` pour créer les attributs `data-*` (support des tirets)
- Ajoute le script au `<body>`
- Enregistre l'ID du script pour éviter les doublons

**Fonction `removeScript`** :
- Supprime le script du DOM lors du démontage du composant
- Évite les fuites mémoire et les conflits
- Retire l'ID du script du Set

**Pourquoi utiliser `setAttribute` au lieu de `dataset` ?**
- `dataset` ne supporte que le camelCase (`dataSiteId`)
- Osmow nécessite des attributs avec tirets (`data-site-id`)
- `setAttribute` permet de créer n'importe quel attribut

### `src/app/blog/blog-page.component.ts`

Composant pour afficher la page blog Osmow.

```typescript
// src/app/blog/blog-page.component.ts
import { Component, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { OsmowScriptService } from '../services/osmow-script.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-blog-page',
  template: `<div id="my-blog"></div>`,
  standalone: true,
})
export class BlogPageComponent implements AfterViewInit, OnDestroy {
  @Input() siteId: string = environment.osmow.siteId;
  @Input() siteUrl: string = environment.osmow.siteUrl;
  @Input() signature: string = environment.osmow.signature;
  @Input() embedGridOnly: boolean = false;

  constructor(private osmowScripts: OsmowScriptService) {}

  ngAfterViewInit(): void {
    this.osmowScripts.appendScript({
      id: 'osmow-blog-script',
      src: `${environment.osmow.scriptBase}/blog-embed.js`,
      dataset: {
        sign: this.signature,
        'site-id': this.siteId,
        url: this.siteUrl,
        embed: this.embedGridOnly ? 'true' : 'false',
      },
    });
  }

  ngOnDestroy(): void {
    this.osmowScripts.removeScript('osmow-blog-script');
  }
}
```

**Fonctionnement** :
1. Reçoit les props via `@Input()` ou utilise les valeurs par défaut depuis `environment`
2. Dans `ngAfterViewInit`, charge le script `blog-embed.js` avec les attributs data requis
3. Le script Osmow injecte le contenu dans `<div id="my-blog" />`
4. Dans `ngOnDestroy`, supprime le script pour éviter les fuites mémoire

**Attributs data passés au script** :
- `data-sign` : Signature de sécurité
- `data-site-id` : ID du site
- `data-url` : URL du site
- `data-embed` : `"true"` pour grille seule, `"false"` pour page complète

### `src/app/blog/article-page.component.ts`

Composant pour afficher un article Osmow spécifique.

```typescript
// src/app/blog/article-page.component.ts
import {
  Component,
  AfterViewInit,
  OnDestroy,
  Input,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OsmowScriptService } from '../services/osmow-script.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-article-page',
  template: `<div id="my-article"></div>`,
  standalone: true,
})
export class ArticlePageComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() siteId: string = environment.osmow.siteId;
  @Input() siteUrl: string = environment.osmow.siteUrl;
  @Input() signature: string = environment.osmow.signature;

  slug: string = '';

  constructor(
    private route: ActivatedRoute,
    private osmowScripts: OsmowScriptService
  ) {}

  ngOnInit(): void {
    // Extraire le slug depuis les paramètres de route
    this.route.params.subscribe((params) => {
      this.slug = params['slug'] || '';
    });
  }

  ngAfterViewInit(): void {
    if (!this.slug) {
      console.error('data-article-slug est requis');
      return;
    }

    this.osmowScripts.appendScript({
      id: `osmow-article-${this.slug}`,
      src: `${environment.osmow.scriptBase}/article-embed.js`,
      dataset: {
        sign: this.signature,
        'site-id': this.siteId,
        url: this.siteUrl,
        'article-slug': this.slug,
      },
    });
  }

  ngOnDestroy(): void {
    if (this.slug) {
      this.osmowScripts.removeScript(`osmow-article-${this.slug}`);
    }
  }
}
```

**Fonctionnement** :
1. Extrait le slug depuis `ActivatedRoute.params` dans `ngOnInit`
2. Reçoit les props via `@Input()` ou utilise les valeurs par défaut depuis `environment`
3. Dans `ngAfterViewInit`, charge le script `article-embed.js` avec le slug
4. Le script Osmow injecte l'article dans `<div id="my-article" />`
5. Dans `ngOnDestroy`, supprime le script

**Attributs data passés au script** :
- `data-sign` : Signature de sécurité
- `data-site-id` : ID du site
- `data-url` : URL du site
- `data-article-slug` : Slug de l'article (extrait de l'URL)

**Gestion du slug** :
- Supporte les slugs simples : `/blog/mon-article`
- Supporte les slugs avec slashes : `/blog/categorie/mon-article`
- Vérifie que le slug existe avant de charger le script

### `src/app/app.routes.ts`

Configuration complète du routing avec Angular Router.

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { BlogPageComponent } from './blog/blog-page.component';
import { ArticlePageComponent } from './blog/article-page.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/blog',
    pathMatch: 'full',
  },
  {
    path: 'blog',
    component: BlogPageComponent,
  },
  {
    path: 'blog/:slug',
    component: ArticlePageComponent,
  },
  {
    path: '**',
    redirectTo: '/blog',
  },
];
```

**Routes définies** :
1. **`/`** → Redirige vers `/blog`
2. **`/blog`** → Affiche `BlogPageComponent` (page blog)
3. **`/blog/:slug`** → Affiche `ArticlePageComponent` (article spécifique)
4. **`**`** → Redirige vers `/blog` (route catch-all)

**Fonctionnalités** :
- Utilise le routing HTML5 (URLs propres)
- Passe les paramètres de route aux composants
- Gère les redirections automatiques

### `src/app/app.component.ts`

Composant racine de l'application.

```typescript
// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header>
      <h1>Mon Blog</h1>
      <nav>
        <a routerLink="/">Accueil</a>
        <a routerLink="/blog">Blog</a>
      </nav>
    </header>
    <main>
      <router-outlet></router-outlet>
    </main>
    <footer>
      <p>&copy; 2024 Mon Site</p>
    </footer>
  `,
  styles: [
    `
      header {
        padding: 20px;
        background: #f0f0f0;
      }
      nav a {
        margin-right: 20px;
        text-decoration: none;
        color: #0066cc;
      }
      main {
        padding: 20px;
      }
    `,
  ],
})
export class AppComponent {
  title = 'client-site-angular';
}
```

**Rôle** : Point de rendu pour tous les composants de route via `<router-outlet>`.

---

## 🔧 Fonctionnement de l'intégration Osmow

### Principe général

L'intégration Osmow fonctionne en chargeant dynamiquement des scripts JavaScript externes qui injectent le contenu dans des conteneurs spécifiques.

### Flux d'exécution

#### Pour la page blog (`/blog`) :

1. L'utilisateur navigue vers `/blog`
2. Angular Router charge le composant `BlogPageComponent`
3. `BlogPageComponent.ngAfterViewInit()` s'exécute
4. `OsmowScriptService.appendScript()` crée un `<script>` avec :
   ```html
   <script 
     id="osmow-blog-script"
     src="https://app.osmow.com/blog-embed.js"
     data-sign="..."
     data-site-id="..."
     data-url="..."
     data-embed="false"
     async
     defer
   ></script>
   ```
5. Le script Osmow s'exécute et injecte le contenu dans `<div id="my-blog" />`
6. Lors de la navigation, `ngOnDestroy()` supprime le script

#### Pour un article (`/blog/mon-article`) :

1. L'utilisateur navigue vers `/blog/mon-article`
2. Angular Router extrait `slug = "mon-article"`
3. Angular Router charge le composant `ArticlePageComponent`
4. `ArticlePageComponent.ngOnInit()` extrait le slug depuis `ActivatedRoute.params`
5. `ArticlePageComponent.ngAfterViewInit()` s'exécute
6. `OsmowScriptService.appendScript()` crée un `<script>` avec :
   ```html
   <script 
     id="osmow-article-mon-article"
     src="https://app.osmow.com/article-embed.js"
     data-sign="..."
     data-site-id="..."
     data-url="..."
     data-article-slug="mon-article"
     async
     defer
   ></script>
   ```
7. Le script Osmow charge l'article correspondant au slug
8. Le contenu est injecté dans `<div id="my-article" />`

### Gestion des erreurs

- **Slug manquant** : Le composant `ArticlePageComponent` vérifie que le slug existe avant de charger le script
- **Script déjà chargé** : `OsmowScriptService` vérifie l'existence du script avant de le créer
- **Nettoyage** : Les scripts sont supprimés dans `ngOnDestroy()` pour éviter les fuites mémoire

---

## 🧭 Routes et navigation

### Routes disponibles

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | → | Redirige vers `/blog` |
| `/blog` | `BlogPageComponent` | Page blog complète ou grille |
| `/blog/:slug` | `ArticlePageComponent` | Article spécifique |

### Exemples d'URLs

- `http://localhost:4200/` → Redirige vers `/blog`
- `http://localhost:4200/blog` → Page blog
- `http://localhost:4200/blog/mon-premier-article` → Article
- `http://localhost:4200/blog/categorie/article` → Article avec chemin

### Navigation programmatique

```typescript
import { Router } from '@angular/router';

export class MyComponent {
  constructor(private router: Router) {}

  // Naviguer vers le blog
  goToBlog() {
    this.router.navigate(['/blog']);
  }

  // Naviguer vers un article
  goToArticle() {
    this.router.navigate(['/blog', 'mon-article']);
  }

  // Naviguer avec paramètres
  goToArticleWithParams() {
    this.router.navigate(['/blog', 'categorie', 'mon-article']);
  }
}
```

---

## 📦 Commandes disponibles

### Développement

```bash
ng serve
```

Lance le serveur de développement Angular avec :
- Hot Module Replacement (HMR)
- Rechargement automatique
- Port : 4200 (par défaut)

### Build de production

```bash
ng build --configuration production
```

Génère les fichiers optimisés dans le dossier `dist/` :
- Minification du code
- Optimisation des assets
- Tree-shaking (suppression du code inutilisé)
- AOT (Ahead-of-Time) compilation

### Tests

```bash
ng test
```

Lance les tests unitaires avec Karma et Jasmine.

### Linter

```bash
ng lint
```

Vérifie le code avec ESLint.

---

## 🐛 Dépannage

### Erreur : "data-article-slug est requis"

**Cause** : Le slug n'est pas correctement extrait de l'URL.

**Solutions** :
1. Vérifiez que l'URL contient bien un slug : `/blog/mon-article`
2. Vérifiez la console pour voir les logs de débogage
3. Assurez-vous que la route est bien configurée dans `app.routes.ts`
4. Vérifiez que `ActivatedRoute.params` retourne bien le slug

### Le contenu Osmow ne s'affiche pas

**Vérifications** :
1. Les variables d'environnement sont-elles correctement définies dans `environment.ts` ?
2. Le script est-il bien chargé ? (vérifiez dans l'onglet Network des DevTools)
3. Les attributs `data-*` sont-ils présents sur le script ? (vérifiez dans l'onglet Elements)
4. Y a-t-il des erreurs dans la console du navigateur ?
5. Le service `OsmowScriptService` est-il bien injecté dans le composant ?

### Le script se charge plusieurs fois

**Cause** : Le script n'est pas supprimé lors de la navigation.

**Solutions** :
1. Vérifiez que `ngOnDestroy()` appelle bien `removeScript()`
2. Vérifiez que `OsmowScriptService` vérifie bien l'existence du script avant de le créer
3. Vérifiez que le Set `scriptIds` fonctionne correctement

### Erreurs TypeScript

**Solutions** :
1. Vérifiez que `tsconfig.json` est présent et correctement configuré
2. Vérifiez que les types Angular sont installés
3. Redémarrez le serveur TypeScript dans votre IDE
4. Exécutez `ng build` pour voir les erreurs de compilation

### Erreur : "Cannot find name 'document'"

**Cause** : Tentative d'accès à `document` dans un contexte où il n'est pas disponible.

**Solutions** :
1. Utilisez `Renderer2` d'Angular au lieu d'accéder directement à `document`
2. Vérifiez que le code s'exécute dans `ngAfterViewInit` et non dans le constructeur
3. Utilisez `isPlatformBrowser` pour vérifier que vous êtes côté client

---

## 📚 Ressources supplémentaires

- [Documentation Angular](https://angular.io/docs)
- [Documentation TypeScript](https://www.typescriptlang.org/)
- [Documentation RxJS](https://rxjs.dev/)
- [Documentation Osmow](https://app.osmow.com)

---

## 📝 Notes importantes

- Utilisez `Renderer2` d'Angular pour manipuler le DOM de manière sécurisée
- Les scripts Osmow sont chargés de manière asynchrone (`async defer`)
- Chaque composant gère son propre cycle de vie de script (chargement/déchargement)
- Utilisez `ngAfterViewInit` pour charger les scripts après le rendu du composant
- Utilisez `ngOnDestroy` pour nettoyer les scripts lors du démontage
- Les variables d'environnement sont remplacées lors du build de production
- Le service `OsmowScriptService` est un singleton (fourni dans `root`)

---

## 👤 Auteur

Application créée pour l'intégration Osmow avec Angular.

---

## 📄 Licence

MIT

