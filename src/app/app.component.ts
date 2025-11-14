// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <h1>Hello World - Mon Blog</h1>
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
      nav a:hover {
        text-decoration: underline;
      }
      main {
        padding: 20px;
        min-height: calc(100vh - 200px);
      }
      footer {
        padding: 20px;
        background: #f0f0f0;
        text-align: center;
      }
    `,
  ],
})
export class AppComponent {
  title = 'client-site-angular';
}

