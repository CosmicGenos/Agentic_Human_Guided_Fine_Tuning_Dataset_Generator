import { useId } from 'react';

interface LogoProps {
  /** 'dark' = ink mark on a light background, 'light' = white mark on a dark one */
  tone?: 'dark' | 'light';
  size?: number;
}

export function Logo({ tone = 'dark', size = 28 }: LogoProps) {
  const maskId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Luman">
      <defs>
        <mask id={maskId}>
          <rect width="120" height="120" fill="#fff" />
          <rect x="44" y="44" width="32" height="32" rx="7" fill="#000" transform="rotate(45 60 60)" />
        </mask>
      </defs>
      <rect
        x="22" y="22" width="76" height="76" rx="28"
        fill={tone === 'light' ? '#FFFFFF' : '#16140F'}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
