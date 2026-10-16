import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        // Charcoal scale (from the logo's dark grey) — kept under the "navy" key so all components re-theme.
        navy: {
          50: "#F6F6F7",
          100: "#ECEDEF",
          200: "#D6D8DC",
          300: "#B3B6BD",
          400: "#8A8E97",
          500: "#666A73",
          600: "#4B4F57",
          700: "#3A3D44",
          800: "#2A2C31",
          900: "#1E2024",
          950: "#141518",
        },
        // Brand orange (logo: #FD5E0C). 600+ meet WCAG AA with white text.
        brand: {
          DEFAULT: "#FD5E0C",
          50: "#FFF4EC",
          100: "#FFE4D1",
          200: "#FFC7A1",
          300: "#FFA066",
          400: "#FF7D33",
          500: "#FD5E0C",
          600: "#C94600",
          700: "#A63A02",
        },
        ink: { DEFAULT: "#1E2024", muted: "#5D616A", soft: "#6F737C" },
        line: { DEFAULT: "#E8E9EC", strong: "#D3D5DA" },
        success: { 50: "#ECFDF3", 100: "#D1FADF", 500: "#16A34A", 600: "#15803D", 700: "#166534" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,32,36,0.04), 0 4px 16px -4px rgba(30,32,36,0.08)",
        lift: "0 2px 4px rgba(30,32,36,0.05), 0 16px 32px -12px rgba(30,32,36,0.18)",
        focus: "0 0 0 3px rgba(253,94,12,0.35)",
      },
      borderRadius: { xl: "14px", "2xl": "18px", "3xl": "24px" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(1)" }, "50%": { transform: "scale(1.18)" }, "100%": { transform: "scale(1)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { "fade-up": "fade-up .35s ease-out both", pop: "pop .35s ease-out", shimmer: "shimmer 1.4s infinite" },
    },
  },
  plugins: [],
} satisfies Config;
