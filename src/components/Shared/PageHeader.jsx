import React from 'react';
import { MdChevronRight, MdArrowBack } from 'react-icons/md';
import { Link, useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

/**
 * PageHeader
 *
 * Standard header for all admin list and detail pages.
 *
 * Props:
 *   title        {string}
 *   subtitle     {string}
 *   breadcrumbs  {Array<{label: string, to?: string}>}
 *   actions      {React.ReactNode}   — buttons in the top-right
 *   status       {string}            — show a StatusBadge next to the title
 *   backPath     {string}            — show a back button; if omitted, uses browser history
 *   showBack     {boolean}           — explicitly show/hide back button
 *   count        {number}            — optional record count shown next to title
 */
const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  status,
  backPath,
  showBack = false,
  count,
}) => {
  const navigate = useNavigate();

  const goBack = () => {
    if (backPath) navigate(backPath);
    else navigate(-1);
  };

  const showBackBtn = showBack || !!backPath;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        {/* Back button */}
        {showBackBtn && (
          <button
            onClick={goBack}
            className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-md border border-[var(--admin-line)] bg-white text-[var(--admin-muted)] hover:border-[var(--admin-blue)] hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-blue)] flex-shrink-0 transition-colors"
            aria-label="Go back"
          >
            <MdArrowBack size={18} />
          </button>
        )}

        <div>
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="mb-2 inline-flex w-fit max-w-full flex-wrap items-center gap-1 py-1.5 text-[11px] "
            >
          
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <MdChevronRight
                      size={14}
                      className="flex-shrink-0 text-[var(--admin-gold)]"
                    />
                  )}
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="font-medium text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-navy)]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        i === breadcrumbs.length - 1
                          ? "font-semibold text-[var(--admin-navy)]"
                          : "font-medium text-[var(--admin-muted)]"
                      }
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Title row */}
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-[18px] font-semibold text-[var(--admin-ink)] leading-tight">
              {title}
            </h1>
            {status && <StatusBadge status={status} dot />}
            {count !== undefined && count !== null && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-[var(--admin-blue-soft)] text-[var(--admin-blue)] rounded-full">
                {count.toLocaleString()}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-sm text-[var(--admin-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {actions && (
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
