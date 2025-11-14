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
  }): Promise<void> {
    // Vérifier si le script existe déjà (évite les doublons)
    if (this.scriptIds.has(params.id)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
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

      script.onload = () => {
        this.scriptIds.add(params.id);
        console.log(`Script ${params.id} chargé avec succès`);
        resolve();
      };

      script.onerror = (error: ErrorEvent | Event) => {
        console.error(`Erreur lors du chargement du script ${params.id}:`, error);
        reject(error);
      };

      this.renderer.appendChild(document.body, script);
    });
  }

  removeScript(id: string): void {
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
      this.scriptIds.delete(id);
    }
  }
}

