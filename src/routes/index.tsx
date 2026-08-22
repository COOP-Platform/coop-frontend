import { createFileRoute } from '@tanstack/react-router';

import { Card } from '@/components/ui';
import { env } from '@/config/env';

export const Route = createFileRoute('/')({
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <Card>
      <div className="welcome">
        <p className="welcome__eyebrow">Sprint 1 · 20 Aug – 02 Sep 2026</p>

        <h1 className="welcome__title">Welcome to the {env.appName}</h1>

        <p className="welcome__message">
          The frontend is scaffolded and running. This is the starter shell for the Les Cousins
          Neretse pilot — React, TypeScript, TanStack Router and TanStack Query are wired up and
          ready. Colours, typography and the product name land once the design system is approved;
          feature work starts with Community and Member Management.
        </p>

        <div className="welcome__meta">
          <span className="tag">React 18</span>
          <span className="tag">TypeScript</span>
          <span className="tag">TanStack Router</span>
          <span className="tag">TanStack Query</span>
          <span className="tag">Vite</span>
        </div>
      </div>
    </Card>
  );
}
