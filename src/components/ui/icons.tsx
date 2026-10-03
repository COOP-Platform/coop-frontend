import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function IconUser(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a16.6 16.6 0 0 1-3.4 4.3M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7c1.4 0 2.7-.3 3.8-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function IconAtSign(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9" />
    </svg>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m21 15-4.5-4.5L7 20" />
    </svg>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="m8 7 1.5-2h5L16 7" />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20s-7-4.4-7-9.3A4 4 0 0 1 12 8a4 4 0 0 1 7 2.7C19 15.6 12 20 12 20Z" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10.5 12 4l8 6.5V20h-5v-5h-6v5H4Z" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.5a3.25 3.25 0 0 1 0 6.4" />
      <path d="M18 19c0-2.3-.8-3.9-2-5" />
    </svg>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M16.5 14.5h1.5" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h16v11H9l-5 4V5Z" />
    </svg>
  );
}

export function IconBarChart(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h7l5 5v13H6Z" />
      <path d="M13 3v5h5" />
    </svg>
  );
}

export function IconCheckSquare(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15 5H6v14h9" />
      <path d="M13 12h8" />
      <path d="m18 9 3 3-3 3" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </svg>
  );
}

export function IconUserPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="8" r="3.25" />
      <path d="M4 19c0-3.3 2.7-5.5 6-5.5 1 0 1.9.2 2.7.6" />
      <path d="M17 14v6M14 17h6" />
    </svg>
  );
}

export function IconPlusCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

export function IconInfoCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <path d="M12 7.75h.01" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3 8 4.5-8 4.5-8-4.5Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 4 3 10.5l7 2.5 2.5 7Z" />
      <path d="M21 4l-11 9" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8 12 2.75 2.75L16 9.5" />
    </svg>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 6.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5" />
    </svg>
  );
}

export function IconKey(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9" />
      <path d="M17 12v3.5M20 12v2.5" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconExternalLink(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14 5h5v5" />
      <path d="m19 5-7.5 7.5" />
      <path d="M18 14v4a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V7.5A1.5 1.5 0 0 1 6 6h4" />
    </svg>
  );
}

export function IconWifi(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9a12 12 0 0 1 16 0" />
      <path d="M7 12.5a8 8 0 0 1 10 0" />
      <path d="M10 16a4 4 0 0 1 4 0" />
      <path d="M12 19h.01" />
    </svg>
  );
}

/* ---------- Sprint 2: Community app ---------- */

export function IconGrid(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="6.5" height="8" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="4.5" rx="1" />
      <rect x="13.5" y="11.5" width="6.5" height="8.5" rx="1" />
      <rect x="4" y="15" width="6.5" height="5" rx="1" />
    </svg>
  );
}

/** Three people — the "Community" app mark. */
export function IconCommunity(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="2.75" />
      <circle cx="5.5" cy="10" r="2" />
      <circle cx="18.5" cy="10" r="2" />
      <path d="M7.5 19c0-2.8 2-4.75 4.5-4.75s4.5 1.95 4.5 4.75" />
      <path d="M2.5 18.5c0-2 1.3-3.5 3-3.5.8 0 1.5.2 2 .6M21.5 18.5c0-2-1.3-3.5-3-3.5-.8 0-1.5.2-2 .6" />
    </svg>
  );
}

/** ID badge on a lanyard — positions / governance roles. */
export function IconIdBadge(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="7" width="17" height="13" rx="2" />
      <path d="M9.5 7V4.5h5V7" />
      <circle cx="9" cy="12.5" r="1.75" />
      <path d="M6.5 17c.3-1.4 1.3-2.25 2.5-2.25s2.2.85 2.5 2.25M14 12h3.5M14 15h3.5" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 7h15M9.5 7V4.5h5V7" />
      <path d="M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.3 4.3 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 16.75h.01" />
    </svg>
  );
}

/** Bell with an exclamation — "needs attention". */
export function IconBellAlert(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
      <path d="M12 8.5v3.5M12 14.5h.01" />
    </svg>
  );
}

export function IconPauseCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 9v6M14 9v6" />
    </svg>
  );
}

export function IconUserMinus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="8" r="3.25" />
      <path d="M4 19c0-3.3 2.7-5.5 6-5.5 1.4 0 2.6.4 3.6 1" />
      <path d="M15 17h6" />
    </svg>
  );
}

/** Person with a strike-through — an unassigned seat. */
export function IconUserOff(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5c.4-3.3 3-5.5 6.5-5.5 1.3 0 2.5.3 3.5.9" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

export function IconUserCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="8" r="3.25" />
      <path d="M4 19c0-3.3 2.7-5.5 6-5.5 1.2 0 2.3.3 3.2.8" />
      <path d="m15 17.5 2 2 4-4" />
    </svg>
  );
}

/** Person with a small gear — role management. */
export function IconUserCog(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="8" r="3.25" />
      <path d="M4 19c0-3.3 2.7-5.5 6-5.5 1 0 1.9.2 2.7.6" />
      <circle cx="18" cy="17" r="2" />
      <path d="M18 13.5v1.5M18 19v1.5M14.5 17H16M20 17h1.5" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15.5 4.5 19.5 8.5 8.5 19.5H4.5V15.5Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 1 0 2.3-5.6" />
      <path d="M4 4.5v4h4" />
      <path d="M12 8v4.25l3 1.75" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a1.5 1.5 0 0 1-1.5 1.5A15.5 15.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4Z" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m14.5 6-6 6 6 6" />
    </svg>
  );
}

export function IconShieldCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 19 6v5.5c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  );
}

/** Scalloped badge with a tick — verified identity. */
export function IconBadgeCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l2.3 1.7 2.8-.1.9 2.7 2.3 1.6-.9 2.7.9 2.7-2.3 1.6-.9 2.7-2.8-.1L12 21l-2.3-1.7-2.8.1-.9-2.7-2.3-1.6.9-2.7-.9-2.7 2.3-1.6.9-2.7 2.8.1Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconAward(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 3.5h8l-1.5 6h-5Z" />
      <circle cx="12" cy="14.5" r="4" />
      <path d="M12 12.75v3.5" />
    </svg>
  );
}

/** Clipboard with a clock — "requires review". */
export function IconClipboardClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4.5h6v2.5H9Z" />
      <path d="M15 5.5h2A1.5 1.5 0 0 1 18.5 7v4M9 5.5H7A1.5 1.5 0 0 0 5.5 7v12A1.5 1.5 0 0 0 7 20.5h4.5" />
      <circle cx="17" cy="17" r="4" />
      <path d="M17 15.25V17l1.25.75" />
    </svg>
  );
}

export function IconGavel(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m12.5 4.5 6 6M9.5 7.5l6 6" />
      <path d="m11 6 5.5 5.5" />
      <path d="m12.5 10.5-7.5 7.5a1.4 1.4 0 0 0 2 2l7.5-7.5" />
      <path d="M13 20.5h7.5" />
    </svg>
  );
}

export function IconMegaphone(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1Z" />
      <path d="M7.5 15 9 20h2" />
      <path d="M17 9.5a3.5 3.5 0 0 1 0 5M19.5 7a7 7 0 0 1 0 10" />
    </svg>
  );
}

/** Quill — the Secretary seat. */
export function IconFeather(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 4c-6.5 0-12 4.5-12 11v5" />
      <path d="M20 4c0 6.5-4.5 12-11 12" />
      <path d="M8 15 4 19" />
      <path d="M12 12h4.5" />
    </svg>
  );
}

export function IconBanknote(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </svg>
  );
}

/** Head with a heart — the advisor / elder seat. */
export function IconAdvisor(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M17.5 19.5v-3.2a7 7 0 1 0-11-5.8c0 2 .8 3.6 2 4.8v4.2" />
      <path d="M12 13.5s-3-1.7-3-3.6a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.9-3 3.6-3 3.6Z" />
    </svg>
  );
}

export function IconBan(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconLink(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}

/** 3×3 dots — the app switcher. */
export function IconApps(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {[6, 12, 18].flatMap((y) =>
        [6, 12, 18].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="currentColor" stroke="none" />
        )),
      )}
    </svg>
  );
}

/** Pillared building — the COOP mark. */
export function IconInstitution(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 9 12 4l8.5 5Z" />
      <path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9" />
      <path d="M3 20.5h18" />
    </svg>
  );
}

export function IconFingerprint(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 18.5c1-1.8 1.5-4 1.5-6.5a4.5 4.5 0 0 1 9 0c0 1.6-.1 3-.4 4.4" />
      <path d="M12 12c0 3.3-.8 6.1-2.3 8.5" />
      <path d="M15.2 19.5c.3-.8.5-1.6.7-2.5" />
      <path d="M4 14c.3-.8.5-1.3.5-2a7.5 7.5 0 0 1 13.4-4.6" />
      <path d="M19.8 11a14 14 0 0 1-.6 5.5" />
    </svg>
  );
}

export function IconUserPen(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="8" r="3.25" />
      <path d="M4 19c0-3.3 2.7-5.5 6-5.5 1 0 1.9.2 2.7.6" />
      <path d="m18 13 2 2-4.5 4.5h-2v-2Z" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconVote(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 14.5h16v5H4Z" />
      <path d="m8.5 10.5 3 3 5.5-5.5-3-3Z" />
    </svg>
  );
}
