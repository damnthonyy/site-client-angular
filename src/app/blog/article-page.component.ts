// src/app/blog/article-page.component.ts
import {
  Component,
  AfterViewInit,
  OnDestroy,
  Input,
  OnInit,
  NgZone,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { OsmowScriptService } from '../services/osmow-script.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-article-page',
  template: `<div id="my-article"></div>`,
  standalone: true,
  styles: [
    `
      #my-article {
        min-height: 200px;
      }
    `,
  ],
})
export class ArticlePageComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() siteId?: string;
  @Input() siteUrl?: string;
  @Input() signature?: string;

  // Utiliser les valeurs d'environnement comme fallback
  get effectiveSiteId(): string {
    return this.siteId || environment.osmow.siteId;
  }

  get effectiveSiteUrl(): string {
    return this.siteUrl || environment.osmow.siteUrl;
  }

  get effectiveSignature(): string {
    return this.signature || environment.osmow.signature;
  }

  slug: string = '';
  private clickListener?: (e: Event) => void;
  private routeSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private osmowScripts: OsmowScriptService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Initialiser le slug depuis les paramètres de route
    this.slug = this.route.snapshot.params['slug'] || '';
    
    // Écouter les changements de route pour gérer le bouton retour du navigateur
    this.routeSubscription = this.route.params.subscribe((params) => {
      const newSlug = params['slug'] || '';
      if (newSlug !== this.slug) {
        // Nettoyer l'ancien script et listener
        if (this.slug) {
          this.osmowScripts.removeScript(`osmow-article-${this.slug}`);
        }
        if (this.clickListener) {
          const targetDiv = document.getElementById('my-article');
          if (targetDiv) {
            targetDiv.removeEventListener('click', this.clickListener, true);
          }
        }
        
        this.slug = newSlug;
        // Si le slug change (bouton retour), recharger le script
        if (this.slug) {
          // Recharger le contenu
          setTimeout(() => {
            this.loadArticle();
          }, 100);
        }
      }
    });
  }

  private loadArticle(): void {
    if (!this.slug) return;

    const targetDiv = document.getElementById('my-article');
    if (!targetDiv) return;

    // Nettoyer le contenu précédent
    targetDiv.innerHTML = '';

    // Ajouter les attributs data sur le div cible (le script Osmow peut les lire depuis là)
    targetDiv.setAttribute('data-sign', this.effectiveSignature);
    targetDiv.setAttribute('data-site-id', this.effectiveSiteId);
    targetDiv.setAttribute('data-url', this.effectiveSiteUrl);
    targetDiv.setAttribute('data-article-slug', this.slug);

    this.osmowScripts.appendScript({
      id: `osmow-article-${this.slug}`,
      src: `${environment.osmow.scriptBase}/article-embed.js`,
      dataset: {
        sign: this.effectiveSignature,
        'site-id': this.effectiveSiteId,
        url: this.effectiveSiteUrl,
        'article-slug': this.slug,
      },
    }).then(() => {
      console.log(`Script Osmow article (${this.slug}) chargé avec succès`);
      console.log('Attributs data sur le div:', {
        sign: targetDiv.getAttribute('data-sign'),
        'site-id': targetDiv.getAttribute('data-site-id'),
        url: targetDiv.getAttribute('data-url'),
        'article-slug': targetDiv.getAttribute('data-article-slug'),
      });
      this.setupLinkInterception();
    }).catch((error) => {
      console.error(`Erreur lors du chargement du script Osmow pour l'article ${this.slug}:`, error);
    });
  }

  ngAfterViewInit(): void {
    if (!this.slug) {
      console.error('data-article-slug est requis');
      return;
    }

    // Attendre un peu pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.loadArticle();
    }, 100);
  }

  private setupLinkInterception(): void {
    // Intercepter les clics sur les liens générés par Osmow
    this.clickListener = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      const button = target.closest('button') as HTMLButtonElement;
      
      // Gérer les boutons "retour"
      if (button) {
        const onclick = button.getAttribute('onclick');
        if (onclick && (onclick.includes('history.back') || onclick.includes('history.go(-1)'))) {
          e.preventDefault();
          e.stopPropagation();
          this.ngZone.run(() => {
            this.router.navigate(['/blog']);
          });
          return;
        }
      }

      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Gérer les liens javascript:history.back()
      if (href.startsWith('javascript:') && (href.includes('history.back') || href.includes('history.go(-1)'))) {
        e.preventDefault();
        e.stopPropagation();
        this.ngZone.run(() => {
          this.router.navigate(['/blog']);
        });
        return;
      }

      // Vérifier si c'est un lien interne vers un article
      const blogArticleMatch = href.match(/\/?blog\/([^\/\?#]+)/);
      if (blogArticleMatch) {
        e.preventDefault();
        e.stopPropagation();
        const slug = blogArticleMatch[1];
        this.ngZone.run(() => {
          this.router.navigate(['/blog', slug]);
        });
        return;
      }

      // Vérifier si c'est un lien vers la page blog (retour au blog)
      if (href === '/blog' || href === 'blog' || href.endsWith('/blog') || href === '/' || href === '') {
        e.preventDefault();
        e.stopPropagation();
        this.ngZone.run(() => {
          this.router.navigate(['/blog']);
        });
        return;
      }

      // Gérer les liens relatifs qui pointent vers le blog
      if (href.startsWith('../blog') || href === '../blog' || href === '..') {
        e.preventDefault();
        e.stopPropagation();
        this.ngZone.run(() => {
          this.router.navigate(['/blog']);
        });
        return;
      }
    };

    // Attendre que le contenu soit injecté avant d'ajouter le listener
    setTimeout(() => {
      const targetDiv = document.getElementById('my-article');
      if (targetDiv && this.clickListener) {
        targetDiv.addEventListener('click', this.clickListener, true);
      }
    }, 500);
  }

  ngOnDestroy(): void {
    // Désabonner de la souscription aux params
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    
    if (this.slug) {
      this.osmowScripts.removeScript(`osmow-article-${this.slug}`);
    }
    
    // Retirer le listener
    if (this.clickListener) {
      const targetDiv = document.getElementById('my-article');
      if (targetDiv) {
        targetDiv.removeEventListener('click', this.clickListener, true);
      }
    }
  }
}

