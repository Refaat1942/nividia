import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1e40af', foreground: '#ffffff' },
        sidebar: '#0f172a',
      },
    },
  },
  plugins: [],
};
export default config;
