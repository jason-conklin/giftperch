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
    },
  },
  plugins: [],
};

export default config;
