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
      className="gp-app-page-shell"
    >
      {hero}
      {(title || subtitle || actions) && (
        <header className="gp-app-page-header">
          <div className="min-w-0 space-y-2">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gp-app-gold-strong">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-display text-3xl font-semibold leading-tight text-gp-app-evergreen sm:text-4xl lg:text-[2.75rem]">
              {title ?? "GiftPerch"}
            </h1>
            {subtitle ? (
              <p className="max-w-3xl text-sm leading-6 text-gp-app-muted sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="grid shrink-0 gap-2 sm:flex sm:items-center sm:gap-3">
              {actions}
            </div>
          ) : null}
        </header>
      )}
      {children}
    </main>
  );
}
