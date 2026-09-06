/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep clinical teal — primary brand color. Trustworthy, calm,
        // deliberately not the generic SaaS blue.
        clinic: {
          50: "#EEF5F3",
          100: "#D6E7E2",
          200: "#AECFC6",
          300: "#7FB3A5",
          400: "#4C9484",
          500: "#2E8B7B",
          600: "#146356",
          700: "#0D4A40",
          800: "#0A3B33",
          900: "#062723",
        },
        // Reserved for genuine safety/red-flag states only — never used
        // decoratively.
        flag: {
          50: "#FBEAE3",
          500: "#C1440E",
          700: "#8F3209",
        },
        canvas: "#F6F8F7",
        ink: "#17252A",
        muted: "#5B6B69",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
