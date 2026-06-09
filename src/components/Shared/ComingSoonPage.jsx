import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiClock, FiArrowLeft } from "react-icons/fi";

const titleFromPath = (pathname = "") =>
  String(pathname || "")
    .replace(/^\/app\/?/, "")
    .replace(/\/.*/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "This Page";

const ComingSoonPage = ({ title, description }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = title || titleFromPath(location.pathname);

  return (
    <section className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--admin-gold-soft)] border border-[var(--admin-gold)]/30">
          <FiClock className="h-7 w-7 text-[var(--admin-gold-dark)]" />
        </div>

        {/* Label */}
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--admin-muted)]">
          Coming Soon
        </p>

        {/* Title */}
        <h1 className="mt-2 text-xl font-bold text-[var(--admin-navy)]">
          {pageTitle}
        </h1>

        {/* Description */}
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--admin-muted)]">
          {description ||
            "This section is being built and will be available shortly. Core modules are fully functional in the meantime."}
        </p>

        {/* Divider */}
        <div className="my-6 border-t border-[var(--admin-line)] mx-auto w-16" />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-line)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--admin-ink)] transition hover:border-[var(--admin-navy)] hover:text-[var(--admin-navy)]"
        >
          <FiArrowLeft size={13} />
          Go Back
        </button>

      </div>
    </section>
  );
};

export default ComingSoonPage;
