import React from 'react';
import { MdChevronRight } from 'react-icons/md';
import { Link } from 'react-router-dom';

/**
 * PageHeader
 *
 * Props:
 *   title       {string}          — page title
 *   subtitle    {string}          — optional subtitle
 *   breadcrumbs {Array<{label, to?}>} — optional breadcrumb trail
 *   actions     {React.ReactNode} — buttons to render top-right
 */
const PageHeader = ({ title, subtitle, breadcrumbs = [], actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
    <div>
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <MdChevronRight size={14} />}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-gray-600 transition-colors">{crumb.label}</Link>
              ) : (
                <span className="text-gray-600">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <h1 className="text-xl font-semibold text-gray-800 leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
