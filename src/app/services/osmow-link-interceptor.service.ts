// src/app/services/osmow-link-interceptor.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class OsmowLinkInterceptorService {
  constructor(
    private router: Router,
    private ngZone: NgZone
  ) {}

  createLinkInterceptor(containerId: string): (e: Event) => void {
    return (e: Event) => {
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

      // Vérifier si c'est un lien vers la page blog
      if (href === '/blog' || href === 'blog' || href.endsWith('/blog') || href === '/' || href === '' ||
          href.startsWith('../blog') || href === '../blog' || href === '..') {
        e.preventDefault();
        e.stopPropagation();
        this.ngZone.run(() => {
          this.router.navigate(['/blog']);
        });
        return;
      }
    };
  }

  attachInterceptor(containerId: string, listener: (e: Event) => void): void {
    setTimeout(() => {
      const targetDiv = document.getElementById(containerId);
      if (targetDiv && listener) {
        targetDiv.addEventListener('click', listener, true);
      }
    }, 500);
  }

  detachInterceptor(containerId: string, listener: (e: Event) => void): void {
    const targetDiv = document.getElementById(containerId);
    if (targetDiv && listener) {
      targetDiv.removeEventListener('click', listener, true);
    }
  }
}

