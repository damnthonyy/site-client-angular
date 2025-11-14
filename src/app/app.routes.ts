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

