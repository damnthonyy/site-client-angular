// src/app/blog/blog-page.component.ts
import { Component, AfterViewInit, OnDestroy, OnInit, Input, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { OsmowScriptService } from '../services/osmow-script.service';
import { environment } from '../../environments/environment';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-blog-page',
  template: `
    <div id="my-blog" style="min-height: 200px;"></div>
    <div *ngIf="loading" style="padding: 20px; text-align: center;">
      Chargement du blog...
    </div>
    <div *ngIf="error" style="padding: 20px; background: #fee; color: #c00; border: 1px solid #c00; margin: 20px;">
      <strong>Erreur:</strong> {{ error }}
      <br>
      <small>Vérifiez que le serveur Osmow est accessible sur {{ scriptUrl }}</small>
    </div>
  `,
  standalone: true,
  imports: [CommonModule],
})
export class BlogPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() siteId?: string;
  @Input() siteUrl?: string;
  @Input() signature?: string;
  @Input() embedGridOnly: boolean = false;

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

  loading: boolean = true;
  error: string | null = null;
  scriptUrl: string = '';
  private clickListener?: (e: Event) => void;
  private routerSubscription?: Subscription;
  private isInitialized: boolean = false;

  constructor(
    private osmowScripts: OsmowScriptService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Écouter les changements de navigation pour recharger le contenu
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          // Si on navigue vers /blog et que le composant est déjà initialisé, recharger
          if (event.url === '/blog' || event.url.startsWith('/blog?')) {
            if (this.isInitialized) {
              console.log('Navigation vers /blog détectée, rechargement du contenu...');
              this.reloadBlog();
            }
          }
        }
      });
  }

  ngAfterViewInit(): void {
    if (!this.isInitialized) {
      this.loadBlog();
      this.isInitialized = true;
    }
  }

  private loadBlog(): void {
    console.log('BlogPageComponent: Chargement du script Osmow...', {
      scriptBase: environment.osmow.scriptBase,
      siteId: this.effectiveSiteId,
      siteUrl: this.effectiveSiteUrl,
      signature: this.effectiveSignature ? 'défini' : 'manquant',
      targetDiv: 'my-blog',
    });

    // S'assurer que le div cible existe
    const targetDiv = document.getElementById('my-blog');
    if (!targetDiv) {
      console.error('Le div #my-blog n\'existe pas dans le DOM');
      this.ngZone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
      return;
    }

    // Attendre un peu pour s'assurer que le DOM est prêt
    this.scriptUrl = `${environment.osmow.scriptBase}/blog-embed.js`;
    
    // Vérifier que tous les paramètres sont définis
    if (!this.effectiveSiteId || !this.effectiveSiteUrl || !this.effectiveSignature) {
      console.error('Paramètres Osmow manquants:', {
        siteId: this.effectiveSiteId,
        siteUrl: this.effectiveSiteUrl,
        signature: this.effectiveSignature ? 'défini' : 'manquant',
        environment: environment.osmow,
      });
      this.ngZone.run(() => {
        this.loading = false;
        this.error = 'Configuration Osmow incomplète. Vérifiez les variables d\'environnement.';
        this.cdr.detectChanges();
      });
      return;
    }

    setTimeout(() => {
      // Ajouter les attributs data sur le div cible (le script Osmow peut les lire depuis là)
      if (targetDiv) {
        targetDiv.setAttribute('data-sign', this.effectiveSignature);
        targetDiv.setAttribute('data-site-id', this.effectiveSiteId);
        targetDiv.setAttribute('data-url', this.effectiveSiteUrl);
        targetDiv.setAttribute('data-embed', this.embedGridOnly ? 'true' : 'false');
        
        console.log('Attributs data ajoutés sur le div:', {
          'data-sign': this.effectiveSignature,
          'data-site-id': this.effectiveSiteId,
          'data-url': this.effectiveSiteUrl,
          'data-embed': this.embedGridOnly ? 'true' : 'false',
        });
      }

      this.osmowScripts.appendScript({
        id: 'osmow-blog-script',
        src: this.scriptUrl,
        dataset: {
          sign: this.effectiveSignature,
          'site-id': this.effectiveSiteId,
          url: this.effectiveSiteUrl,
          embed: this.embedGridOnly ? 'true' : 'false',
        },
      }).then(() => {
        console.log('Script Osmow blog chargé avec succès');
        console.log('Attributs data sur le div:', {
          sign: targetDiv?.getAttribute('data-sign'),
          'site-id': targetDiv?.getAttribute('data-site-id'),
          url: targetDiv?.getAttribute('data-url'),
          embed: targetDiv?.getAttribute('data-embed'),
        });
        // Attendre que le contenu soit injecté
        this.waitForContent();
        this.setupLinkInterception();
      }).catch((error) => {
        console.error('Erreur lors du chargement du script Osmow:', error);
        this.ngZone.run(() => {
          this.loading = false;
          this.error = `Impossible de charger le script depuis ${this.scriptUrl}. Vérifiez que le serveur Osmow est en cours d'exécution.`;
          this.cdr.detectChanges();
        });
      });
    }, 100);
  }

  private reloadBlog(): void {
    // Nettoyer le contenu précédent
    const targetDiv = document.getElementById('my-blog');
    if (targetDiv) {
      targetDiv.innerHTML = '';
    }

    // Retirer l'ancien listener
    if (this.clickListener) {
      if (targetDiv) {
        targetDiv.removeEventListener('click', this.clickListener, true);
      }
      this.clickListener = undefined;
    }

    // Retirer l'ancien script
    this.osmowScripts.removeScript('osmow-blog-script');

    // Réinitialiser l'état
    this.ngZone.run(() => {
      this.loading = true;
      this.error = null;
      this.cdr.detectChanges();
    });

    // Recharger le blog
    setTimeout(() => {
      this.loadBlog();
    }, 100);
  }

  private waitForContent(): void {
    // Utiliser MutationObserver pour détecter quand le contenu est injecté
    const targetDiv = document.getElementById('my-blog');
    if (!targetDiv) return;

    const observer = new MutationObserver((mutations) => {
      // Vérifier si du contenu a été ajouté
      if (targetDiv.children.length > 0 || targetDiv.textContent?.trim()) {
        this.ngZone.run(() => {
          this.loading = false;
          this.error = null;
        });
        observer.disconnect();
      }
    });

    observer.observe(targetDiv, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Timeout de sécurité après 5 secondes
    setTimeout(() => {
      observer.disconnect();
      this.ngZone.run(() => {
        this.loading = false;
      });
    }, 5000);
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
      // Format attendu: /blog/slug ou blog/slug
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

      // Vérifier si c'est un lien vers la page blog
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

      // Pour les autres liens, laisser le comportement par défaut
    };

    // Attendre que le contenu soit injecté avant d'ajouter le listener
    setTimeout(() => {
      const targetDiv = document.getElementById('my-blog');
      if (targetDiv && this.clickListener) {
        targetDiv.addEventListener('click', this.clickListener, true);
      }
    }, 500);
  }

  ngOnDestroy(): void {
    // Désabonner de la souscription aux événements de navigation
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }

    this.osmowScripts.removeScript('osmow-blog-script');
    
    // Retirer le listener
    if (this.clickListener) {
      const targetDiv = document.getElementById('my-blog');
      if (targetDiv) {
        targetDiv.removeEventListener('click', this.clickListener, true);
      }
    }
  }
}

