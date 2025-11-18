"use client";

import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-6 rounded-3xl border border-gp-evergreen/15 bg-white/80 px-6 py-4 text-sm text-gp-evergreen/70">
      <div className="flex flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {year} GiftPerch. Built by{" "}
          <Link
            href="https://jasonconklin.dev"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-gp-evergreen underline-offset-4 hover:underline"
          >
            Jason Conklin
          </Link>
          .
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-xs uppercase tracking-wide">
          <Link href="#" className="hover:text-gp-evergreen">
            Privacy
          </Link>
          <Link href="#" className="hover:text-gp-evergreen">
            Terms
          </Link>
          <Link href="#" className="hover:text-gp-evergreen">
            Contact
          </Link>
        </div>
      </div>
      {/* TODO: Replace placeholder links with actual routes/policies. */}
    </footer>
  );
}
