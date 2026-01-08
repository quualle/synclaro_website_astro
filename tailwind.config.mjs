/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'swiss-orange': '#FF4F00',
        // Dark theme colors (from old CRM blog)
        'dark': {
          600: '#374151',
          700: '#1f2937',
          800: '#111827',
          900: '#0a0a0f',
        },
        'neon-purple': '#a855f7',
        'electric-violet': '#8b5cf6',
        'electric-cyan': '#06b6d4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
