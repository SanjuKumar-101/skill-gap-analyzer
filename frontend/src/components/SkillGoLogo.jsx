import React, { useId } from 'react';

/*
 * SkillGO brand logo.
 *
 * Renders an abstract Neomorphic container holding an energetic "S" fused with
 * an upward growth-vector arrow, painted with the Indigo -> Cyan -> Emerald
 * brand gradient, followed by the bold "SkillGO" wordmark.
 *
 * Sizes:
 *   - "sm"  compact (nav chrome, inline usage)
 *   - "md"  default (navbar, dashboard header)
 *   - "lg"  prominent (footer, auth card, hero moments)
 */

const SIZE_VARIANTS = {
  sm: {
    icon: 'w-8 h-8',
    pad: 'p-1.5',
    radius: 'rounded-xl',
    text: 'text-lg',
    gap: 'gap-2',
  },
  md: {
    icon: 'w-11 h-11',
    pad: 'p-2',
    radius: 'rounded-2xl',
    text: 'text-2xl',
    gap: 'gap-3',
  },
  lg: {
    icon: 'w-16 h-16',
    pad: 'p-2.5',
    radius: 'rounded-[1.25rem]',
    text: 'text-4xl',
    gap: 'gap-3.5',
  },
};

export default function SkillGoLogo({ size = 'md', className = '' }) {
  const variant = SIZE_VARIANTS[size] || SIZE_VARIANTS.md;

  // A unique id keeps the gradient namespaced so multiple logos can safely
  // render on the same page (navbar + footer + auth card, etc.).
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `skillgo-gradient-${uid}`;

  return (
    <span className={`inline-flex items-center select-none ${variant.gap} ${className}`}>
      {/* Neomorphic container */}
      <span
        className={`${variant.icon} ${variant.pad} ${variant.radius} inline-flex items-center justify-center flex-shrink-0 bg-[#e0e0e0] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] transition-colors duration-500 dark:bg-[#1e293b] dark:shadow-[6px_6px_12px_#0f172a,-6px_-6px_12px_#334155]`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="11"
              y1="39"
              x2="40"
              y2="11"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="52%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Energetic "S" */}
          <path
            d="M29.4 16.2 C29.4 11.9 25.3 10 21.1 10 C16.9 10 13 12 13 15.8 C13 19.6 17 20.9 20.9 21.8 C24.8 22.7 28.8 24 28.8 27.9 C28.8 31.8 24.8 34 20.7 34 C16.6 34 12.6 32.3 12.6 27.9"
            stroke={`url(#${gradientId})`}
            strokeWidth="5.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Upward growth vector arrow */}
          <path
            d="M35.2 38 V19.4"
            stroke={`url(#${gradientId})`}
            strokeWidth="4.8"
            strokeLinecap="round"
          />
          <path
            d="M30.3 24.1 L35.2 18.8 L40.1 24.1"
            stroke={`url(#${gradientId})`}
            strokeWidth="4.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Brand typography */}
      <span className={`font-display font-black tracking-tight leading-none ${variant.text}`}>
        <span className="text-slate-800 dark:text-slate-100">Skill</span>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-500">
          GO
        </span>
      </span>
    </span>
  );
}
