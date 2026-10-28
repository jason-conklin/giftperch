// Shared with the Dashboard summary CTAs. Keep the compact 8px geometry.
const geometry =
  "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-evergreen focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export const APP_GOLD_ACTION = `${geometry} border-[#d8a628]/70 bg-[linear-gradient(180deg,#f4cf62_0%,#e6b438_100%)] text-gp-app-evergreen shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_3px_8px_rgba(154,111,24,0.16)] hover:border-[#c68f17] hover:bg-[linear-gradient(180deg,#f7d979_0%,#e9ba42_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_5px_12px_rgba(154,111,24,0.22)] active:shadow-[inset_0_1px_2px_rgba(128,90,22,0.18)]`;

export const APP_EVERGREEN_ACTION = `${geometry} border-gp-app-evergreen bg-[linear-gradient(180deg,#145052_0%,#0b3536_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_3px_8px_rgba(15,61,62,0.16)] hover:bg-[linear-gradient(180deg,#1a5b5d_0%,#0b3536_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_5px_12px_rgba(15,61,62,0.22)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]`;
