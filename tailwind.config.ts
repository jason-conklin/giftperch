import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gp: {
          evergreen: "#0F3D3E",
          cream: "#F8F5E0",
          gold: "#D9C189",
        },
      },
      keyframes: {
        gpGiftGlow: {
          "0%, 100%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(217, 193, 137, 0.15)",
          },
          "50%": {
            transform: "scale(1.03)",
            boxShadow: "0 0 18px 4px rgba(217, 193, 137, 0.45)",
          },
        },
      },
      animation: {
        "gp-gift-glow": "gpGiftGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
