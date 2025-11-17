type PageShellProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <section className="space-y-6">
      {title && (
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-gp-evergreen">{title}</h1>
          {subtitle && (
            <p className="text-base text-gp-evergreen/80">{subtitle}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
