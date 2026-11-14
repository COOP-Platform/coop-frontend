import { useState } from 'react';

import { initials } from '@/components/ui';

/**
 * The community's logo, or its initials on a brand tile until one is
 * uploaded (or when the stored image no longer loads).
 */
export function CommunityLogo({
  name,
  url,
  size = 'md',
}: {
  name: string;
  url: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}) {
  // Keyed on the URL, so a newly uploaded image gets its own chance to load.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const broken = Boolean(url) && brokenUrl === url;
  const className = `cs-logo cs-logo--${size}`;

  if (url && !broken) {
    return (
      <img className={className} src={url} alt={`${name} logo`} onError={() => setBrokenUrl(url)} />
    );
  }
  return (
    <span className={`${className} cs-logo--placeholder`} role="img" aria-label={`${name} logo`}>
      {initials(name)}
    </span>
  );
}

/** The cover banner, or a calm brand-tinted placeholder of the same shape. */
export function CommunityCover({ name, url }: { name: string; url: string | null | undefined }) {
  // Keyed on the URL, so a newly uploaded image gets its own chance to load.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const broken = Boolean(url) && brokenUrl === url;

  if (url && !broken) {
    return (
      <img
        className="cs-cover"
        src={url}
        alt={`${name} cover banner`}
        onError={() => setBrokenUrl(url)}
      />
    );
  }
  return <div className="cs-cover cs-cover--placeholder" aria-hidden="true" />;
}
