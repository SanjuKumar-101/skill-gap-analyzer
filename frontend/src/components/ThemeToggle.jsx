import React from 'react';
import { useTheme } from '../context/ThemeContext';

/*
 * ThemeToggle — a hardware-grade neomorphic light/dark switch.
 *
 * Construction:
 *   - Track:  an inset (concave) pill carved out of the surface.
 *   - Thumb:  a raised (convex) knob that glides between the two poles.
 *   - Poles:  a Sun icon (light) on the left, a Moon icon (dark) on the right.
 *
 * Every surface, shadow and gradient is themed explicitly so the control keeps
 * its exact physical depth in both light and dark mode.
 */

function SunIcon({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className={`group relative inline-flex h-9 w-[72px] flex-shrink-0 items-center rounded-full bg-[#e0e0e0] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] transition-colors duration-500 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:bg-[#1e293b] dark:shadow-[inset_4px_4px_8px_#0f172a,inset_-4px_-4px_8px_#334155] ${className}`}
    >
      {/* Left pole — Sun (revealed when the knob glides away in dark mode) */}
      <span className="pointer-events-none absolute left-1 top-0.5 flex h-8 w-8 items-center justify-center">
        <SunIcon
          className={`h-4 w-4 text-amber-500 transition-opacity duration-300 ${
            isDark ? 'opacity-70' : 'opacity-0'
          }`}
        />
      </span>

      {/* Right pole — Moon (revealed when the knob glides away in light mode) */}
      <span className="pointer-events-none absolute right-1 top-0.5 flex h-8 w-8 items-center justify-center">
        <MoonIcon
          className={`h-4 w-4 text-indigo-500 dark:text-indigo-300 transition-opacity duration-300 ${
            isDark ? 'opacity-0' : 'opacity-70'
          }`}
        />
      </span>

      {/* Gliding convex thumb */}
      <span
        className={`absolute left-1 top-0.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#e0e0e0] shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] transition-transform duration-500 ease-in-out dark:bg-[#1e293b] dark:shadow-[4px_4px_8px_#0f172a,-4px_-4px_8px_#334155] ${
          isDark ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <MoonIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
        ) : (
          <SunIcon className="h-4 w-4 text-amber-500" />
        )}
      </span>
    </button>
  );
}
