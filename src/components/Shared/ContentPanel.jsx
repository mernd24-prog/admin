const ContentPanel = ({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "p-4",
}) => (
  <section
    className={`admin-card overflow-hidden bg-white ${className}`.trim()}
  >
    {(title || description || action) && (
      <header className="flex items-start justify-between gap-4 border-b border-[var(--admin-line)] px-4 py-3.5">
        <div className="min-w-0">
          {title && (
            <h2 className="text-base font-semibold text-[var(--admin-ink)]">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export default ContentPanel;
