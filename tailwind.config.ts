import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#141414",
        card: "#1f1f1f",
        surfaceHover: "#262626",
        border: "#2e2e2e",
        foreground: "#f1f1f1",
        muted: "#9ca3af",
        accent: {
          primary: "#3b82f6",
          secondary: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
      },
      borderRadius: {
        "2xl": "16px",
        xl: "12px",
        lg: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
