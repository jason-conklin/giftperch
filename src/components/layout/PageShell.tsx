import type { ReactNode } from "react";

type PageShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: PageShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      {(title || subtitle || actions) && (
        <section className="gp-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gp-evergreen">
              {title ?? "GiftPerch"}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-gp-evergreen/70">{subtitle}</p>
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
    </div>
  );
}
