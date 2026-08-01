/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand scale — maps to CSS vars so dark mode is a variable swap, not a class override.
        'bg-primary': {
          50: 'var(--bg-primary-50)',
          100: 'var(--bg-primary-100)',
          200: 'var(--bg-primary-200)',
          300: 'var(--bg-primary-300)',
          400: 'var(--bg-primary-400)',
          500: 'var(--bg-primary-500)',
          600: 'var(--bg-primary-600)',
          700: 'var(--bg-primary-700)',
          800: 'var(--bg-primary-800)',
          900: 'var(--bg-primary-900)',
        },
        'bg-neutral': {
          50: 'var(--bg-neutral-50)',
          100: 'var(--bg-neutral-100)',
          200: 'var(--bg-neutral-200)',
          300: 'var(--bg-neutral-300)',
          400: 'var(--bg-neutral-400)',
          500: 'var(--bg-neutral-500)',
          600: 'var(--bg-neutral-600)',
          700: 'var(--bg-neutral-700)',
          800: 'var(--bg-neutral-800)',
          900: 'var(--bg-neutral-900)',
          950: 'var(--bg-neutral-950)',
        },
        'bg-success': { DEFAULT: 'var(--bg-success)' },
        'bg-warning': { DEFAULT: 'var(--bg-warning)' },
        'bg-error': { DEFAULT: 'var(--bg-error)' },
        'bg-info': { DEFAULT: 'var(--bg-info)' },
        // Spec callout tokens (for technical data: capacity, speed, interface)
        'bg-spec': {
          bg: 'var(--bg-spec-bg)',
          border: 'var(--bg-spec-border)',
          text: 'var(--bg-spec-text)',
          highlight: 'var(--bg-spec-highlight)',
        },
        // Surfaces + text
        'bg-surface': { DEFAULT: 'var(--bg-surface)' },
        'bg-surface-raised': { DEFAULT: 'var(--bg-surface-raised)' },
        'bg-surface-sunken': { DEFAULT: 'var(--bg-surface-sunken)' },
        'bg-border': { DEFAULT: 'var(--bg-border)' },
        'bg-text': {
          primary: 'var(--bg-text-primary)',
          secondary: 'var(--bg-text-secondary)',
        },
        // Ink band — always-dark band in BOTH themes (hero, trust strip, image badges)
        'bg-ink': { DEFAULT: 'var(--bg-ink)' },
        'bg-ink-text': { DEFAULT: 'var(--bg-ink-text)' },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        arabic: ['Cairo', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display':    ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        'heading-xl': ['2rem',   { lineHeight: '1.2',  letterSpacing: '-0.01em', fontWeight: '600'  }],
        'heading-lg': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.005em', fontWeight: '600' }],
        'heading':    ['1.25rem',{ lineHeight: '1.3',  fontWeight: '600'  }],
        display: 'clamp(2rem, 5vw, 3.5rem)',
        h1: 'clamp(1.75rem, 3.5vw, 2.5rem)',
        h2: 'clamp(1.375rem, 2.5vw, 1.875rem)',
        h3: '1.25rem',
        'body-lg': '1.125rem',
        body: '1rem',
        'body-sm': '0.875rem',
        caption: '0.75rem',
      },
      containers: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'slide-arrow': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(5px)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.93)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-33.333%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'float':   'float 6s ease-in-out infinite',
        'glow':    'glow 3s ease-in-out infinite',
        'slide-arrow': 'slide-arrow 1.4s ease-in-out infinite',
        'scale-in': 'scale-in 0.8s ease-out forwards',
        'shimmer': 'shimmer 4s linear infinite',
        'marquee': 'marquee 28s linear infinite',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
};
