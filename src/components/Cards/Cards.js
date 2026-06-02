import { IoMdTrendingDown } from "react-icons/io";
import { IoTrendingUp } from "react-icons/io5";

export default function Cards({
  icon,
  label,
  value,
  helper,
  trend,
  trendNegative = false,
  warning = false,
}) {
  const trendColor = trendNegative ? "text-red-500" : "text-emerald-500";
  return (
    <div className="flex h-full min-h-[92px] w-full min-w-0 flex-col justify-between rounded-[8px] border border-[var(--admin-line)] bg-white px-4 py-3 shadow-[var(--admin-shadow)]">
      {icon && (
        <div className="mb-1 flex min-h-8 items-start justify-between">
          <p className="text-[11px] font-medium font-inter text-[var(--admin-ink)]">
            {label}
          </p>
          {icon && (
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-[6px] ${warning ? "bg-red-100" : "bg-[var(--admin-gold-soft)]"} text-white`}
            >
              <img className="h-5 w-5 object-contain" src={icon} alt="" />
            </span>
          )}
        </div>
      )}

      <div className="mt-0">
        {!icon && (
          <p className="text-[11px] font-medium font-inter text-[var(--admin-ink)]">
            {label}
          </p>
        )}
        <p className="text-[21px] leading-7 font-inter font-extrabold text-[var(--admin-navy)]">
          {value}
        </p>
        {(trend || helper) && (
          <p className="mt-1 text-[10px] font-semibold text-[var(--admin-muted)]">
            {trend && (
              <span className={`inline-flex items-center gap-1 ${trendColor}`}>
                {trendNegative ? (
                  <IoMdTrendingDown className="h-3 w-3" />
                ) : (
                  <IoTrendingUp className="h-3 w-3" />
                )}
                {trend}
              </span>
            )}{" "}
            {helper && <span className="font-medium">{helper}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
