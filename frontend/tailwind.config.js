/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#fdf8f0', 100: '#faecd4', 200: '#f5d5a3',
          300: '#edb96d', 400: '#e39640', 500: '#d97b22',
          600: '#c4621a', 700: '#a34916', 800: '#833a18',
          900: '#6b3017', 950: '#3a1609',
        }
      },
      fontFamily: {
        sans: ['Nunito Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Rubik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: []
}
