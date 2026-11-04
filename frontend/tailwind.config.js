/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dusty, aged-paper palette: muted parchment grounds, antique gold, deep brown ink.
        ivory: '#E7DCC8',      // page ground — dusty parchment
        linen: '#EFE6D6',      // raised surfaces: cards, inputs, drawers
        champagne: '#DCCDB3',  // secondary bands
        nude: '#C8B496',
        gold: { DEFAULT: '#987850', soft: '#BBA078', deep: '#765A35' },
        espresso: { DEFAULT: '#2A1E16', soft: '#53402F', muted: '#7A6754' },
        cocoa: '#36221A',
        ink: '#17110D',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.32em',
        wide2: '0.18em',
      },
      maxWidth: { site: '1360px' },
      transitionTimingFunction: { silk: 'cubic-bezier(.22,.61,.36,1)' },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'none' } },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slowZoom: { '0%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        fadeUp: 'fadeUp .9s cubic-bezier(.22,.61,.36,1) both',
        fadeIn: 'fadeIn .6s ease both',
        slowZoom: 'slowZoom 2.4s cubic-bezier(.22,.61,.36,1) both',
      },
    },
  },
  plugins: [],
};
