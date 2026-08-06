import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-dark': 'var(--primary-dark)',
        'primary-light': 'var(--primary-light)',
        'primary-hover': 'var(--primary-hover)',
        sidebar: {
          DEFAULT: 'var(--bg-sidebar)',
          hover: 'var(--bg-surface-hover)',
          active: 'var(--primary-light)',
        },
        surface: {
          DEFAULT: 'var(--bg-surface)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-surface-hover)',
        },
        'surface-hover': 'var(--bg-surface-hover)',
        'surface-elevated': 'var(--bg-surface-elevated)',
        card: 'var(--bg-card)',
        'card-hover': 'var(--bg-card-hover)',
        header: 'var(--bg-header)',
        modal: 'var(--bg-modal)',
        accent: {
          green: 'var(--success)',
          'green-bg': 'var(--success-light)',
          red: 'var(--danger)',
          'red-bg': 'var(--danger-light)',
          amber: 'var(--warning)',
          'amber-bg': 'var(--warning-light)',
          blue: 'var(--info)',
          'blue-bg': 'var(--info-light)',
          purple: 'var(--primary)',
          'purple-bg': 'var(--primary-light)',
        },
        danger: 'var(--danger)',
        'danger-light': 'var(--danger-light)',
        success: 'var(--success)',
        'success-light': 'var(--success-light)',
        warning: 'var(--warning)',
        'warning-light': 'var(--warning-light)',
        info: 'var(--info)',
        'info-light': 'var(--info-light)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          sidebar: 'var(--text-sidebar)',
          'sidebar-active': 'var(--text-sidebar-active)',
        },
        border: {
          DEFAULT: 'var(--border-primary)',
          primary: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
          input: 'var(--border-input)',
          sidebar: 'var(--border-sidebar)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.2)',
        'sidebar': '4px 0 15px -3px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
export default config
