import { createFileRoute } from '@tanstack/react-router';

import { Card } from '@/components/ui';
import { env } from '@/config/env';

export const Route = createFileRoute('/_app/')({
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

        {/*
          Deploy check. The values below are baked in at build time, so if this
          panel shows the commit you just merged, the whole pipeline worked:
          CI passed, GitHub Actions built it, and Vercel served it.
        */}
        <dl className="buildstamp">
          <div className="buildstamp__row">
            <dt>Commit</dt>
            <dd>
              <code>{__BUILD_SHA__}</code>
            </dd>
          </div>
          <div className="buildstamp__row">
            <dt>Built</dt>
            <dd>{__BUILT_AT__}</dd>
          </div>
          <div className="buildstamp__row">
            <dt>API</dt>
            <dd>
              <code>{env.apiBaseUrl}</code>
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
