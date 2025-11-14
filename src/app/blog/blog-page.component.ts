// src/app/blog/blog-page.component.ts
import { Component, AfterViewInit, OnDestroy, OnInit, Input, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { OsmowScriptService } from '../services/osmow-script.service';
import { OsmowLinkInterceptorService } from '../services/osmow-link-interceptor.service';
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
    private linkInterceptor: OsmowLinkInterceptorService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          if ((event.url === '/blog' || event.url.startsWith('/blog?')) && this.isInitialized) {
            this.reloadBlog();
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
    const targetDiv = document.getElementById('my-blog');
    if (!targetDiv) {
      this.ngZone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
      return;
    }

    this.scriptUrl = `${environment.osmow.scriptBase}/blog-embed.js`;
    
    if (!this.effectiveSiteId || !this.effectiveSiteUrl || !this.effectiveSignature) {
      this.ngZone.run(() => {
        this.loading = false;
        this.error = 'Configuration Osmow incomplète. Vérifiez les variables d\'environnement.';
        this.cdr.detectChanges();
      });
      return;
    }

    setTimeout(() => {
      targetDiv.setAttribute('data-sign', this.effectiveSignature);
      targetDiv.setAttribute('data-site-id', this.effectiveSiteId);
      targetDiv.setAttribute('data-url', this.effectiveSiteUrl);
      targetDiv.setAttribute('data-embed', this.embedGridOnly ? 'true' : 'false');

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
        this.waitForContent();
        this.setupLinkInterception();
      }).catch(() => {
        this.ngZone.run(() => {
          this.loading = false;
          this.error = `Impossible de charger le script depuis ${this.scriptUrl}. Vérifiez que le serveur Osmow est en cours d'exécution.`;
          this.cdr.detectChanges();
        });
      });
    }, 100);
  }

  private reloadBlog(): void {
    const targetDiv = document.getElementById('my-blog');
    if (targetDiv) {
      targetDiv.innerHTML = '';
    }

    if (this.clickListener) {
      this.linkInterceptor.detachInterceptor('my-blog', this.clickListener);
      this.clickListener = undefined;
    }

    this.osmowScripts.removeScript('osmow-blog-script');

    this.ngZone.run(() => {
      this.loading = true;
      this.error = null;
      this.cdr.detectChanges();
    });

    setTimeout(() => {
      this.loadBlog();
    }, 100);
  }

  private waitForContent(): void {
    const targetDiv = document.getElementById('my-blog');
    if (!targetDiv) return;

    const observer = new MutationObserver(() => {
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

    setTimeout(() => {
      observer.disconnect();
      this.ngZone.run(() => {
        this.loading = false;
      });
    }, 5000);
  }

  private setupLinkInterception(): void {
    this.clickListener = this.linkInterceptor.createLinkInterceptor('my-blog');
    this.linkInterceptor.attachInterceptor('my-blog', this.clickListener);
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }

    this.osmowScripts.removeScript('osmow-blog-script');
    
    if (this.clickListener) {
      this.linkInterceptor.detachInterceptor('my-blog', this.clickListener);
    }
  }
}
