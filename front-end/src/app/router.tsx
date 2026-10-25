import type { ComponentType } from 'react';
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { RouteError } from '@/components/shared/route-error';
import { RedirectIfAuthed, RequireAdmin, RequireAuth } from '@/features/auth/components/guards';

/**
 * Route-level code splitting: each page's bundle loads when its route is first visited.
 * Pages are thin; their content lives in src/features/<name>/components.
 */
const lazy = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/', lazy: lazy(() => import('@/pages/LandingPage')) },

      // public auth pages
      {
        element: <RedirectIfAuthed><Outlet /></RedirectIfAuthed>,
        children: [{ path: '/login', lazy: lazy(() => import('@/pages/LoginPage')) }],
      },
      // the invite email links here; usable whether or not someone is signed in
      { path: '/setup-password', lazy: lazy(() => import('@/pages/SetupPasswordPage')) },

      // the app
      {
        path: '/app',
        element: <RequireAuth><RootLayout /></RequireAuth>,
        children: [
          { index: true, element: <Navigate to="projects" replace /> },
          {
            path: 'projects',
            children: [
              { index: true, lazy: lazy(() => import('@/pages/ProjectsPage')) },
              {
                path: ':projectId',
                lazy: lazy(() => import('@/pages/ProjectPage')),
                children: [
                  { index: true, lazy: lazy(() => import('@/pages/ProjectOverviewPage')) },
                  { path: 'documents', lazy: lazy(() => import('@/pages/ProjectDocumentsPage')) },
                  { path: 'processing', lazy: lazy(() => import('@/pages/ProjectProcessingPage')) },
                  { path: 'extractions', lazy: lazy(() => import('@/pages/ProjectExtractionsPage')) },
                  { path: 'members', lazy: lazy(() => import('@/pages/ProjectMembersPage')) },
                  { path: 'models', lazy: lazy(() => import('@/pages/ProjectModelsPage')) },
                ],
              },
            ],
          },
          // admin only
          {
            element: <RequireAdmin><Outlet /></RequireAdmin>,
            children: [
              { path: 'credentials', lazy: lazy(() => import('@/pages/CredentialsPage')) },
              { path: 'credentials/:credentialId', lazy: lazy(() => import('@/pages/CredentialDetailPage')) },
              { path: 'users', lazy: lazy(() => import('@/pages/UsersPage')) },
            ],
          },
        ],
      },

      { path: '*', lazy: lazy(() => import('@/pages/NotFoundPage')) },
    ],
  },
]);
