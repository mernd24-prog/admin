import React from "react";
import { useLocation } from "react-router-dom";
import { FiClock } from "react-icons/fi";

const titleFromPath = (pathname = "") =>
  String(pathname || "")
    .replace(/^\/+/, "")
    .replace(/\/.*/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "This page";

const ComingSoonPage = ({ title, description }) => {
  const location = useLocation();
  const pageTitle = title || titleFromPath(location.pathname);

  return (
    <section className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-lg border border-[var(--admin-line)] bg-white px-6 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--admin-gold-soft)] text-[var(--admin-gold)]">
          <FiClock className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-muted)]">
          Coming Soon
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--admin-ink)]">
          {pageTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--admin-muted)]">
          {description ||
            "This management area is being prepared. Dashboard and product/catalog management are available now."}
        </p>
      </div>
    </section>
  );
};

export default ComingSoonPage;
