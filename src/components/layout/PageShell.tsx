import type { ReactNode } from "react";

type PageShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
  hero?: ReactNode;
  children: ReactNode;
};

export function PageShell({
  title,
  subtitle,
  actions,
  eyebrow,
  hero,
  children,
}: PageShellProps) {
  return (
    <main
      id="gp-main-content"
      role="main"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 text-gp-evergreen sm:px-6 lg:px-8"
    >
      {hero}
      {(title || subtitle || actions) && (
        <section className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-gp-gold px-5 py-4 text-black shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/70">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-2xl font-semibold text-black">
              {title ?? "GiftPerch"}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-black/70">{subtitle}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="grid gap-2 sm:flex sm:items-center sm:gap-3">
              {actions}
            </div>
          ) : null}
        </section>
      )}
      {children}
    </main>
  );
}
