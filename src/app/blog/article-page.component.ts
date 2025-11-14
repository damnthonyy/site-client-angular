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
import { OsmowLinkInterceptorService } from '../services/osmow-link-interceptor.service';
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
    private linkInterceptor: OsmowLinkInterceptorService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'] || '';
    
    this.routeSubscription = this.route.params.subscribe((params) => {
      const newSlug = params['slug'] || '';
      if (newSlug !== this.slug) {
        if (this.slug) {
          this.osmowScripts.removeScript(`osmow-article-${this.slug}`);
        }
        if (this.clickListener) {
          this.linkInterceptor.detachInterceptor('my-article', this.clickListener);
        }
        
        this.slug = newSlug;
        if (this.slug) {
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

    targetDiv.innerHTML = '';

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
      this.setupLinkInterception();
    }).catch(() => {
      // Erreur silencieuse - le script gère déjà les erreurs
    });
  }

  ngAfterViewInit(): void {
    if (!this.slug) return;

    setTimeout(() => {
      this.loadArticle();
    }, 100);
  }

  private setupLinkInterception(): void {
    this.clickListener = this.linkInterceptor.createLinkInterceptor('my-article');
    this.linkInterceptor.attachInterceptor('my-article', this.clickListener);
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    
    if (this.slug) {
      this.osmowScripts.removeScript(`osmow-article-${this.slug}`);
    }
    
    if (this.clickListener) {
      this.linkInterceptor.detachInterceptor('my-article', this.clickListener);
    }
  }
}
