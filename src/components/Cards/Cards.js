import { IoMdTrendingDown } from "react-icons/io";
import { IoTrendingUp } from "react-icons/io5";
import { formatLabel } from "../../utils/formatters";

export default function Cards({
  icon,
  label,
  value,
  helper,
  trend,
  iconBg = "#dde6d9",
  iconColor,
  trendNegative = false,
  onClick,
}) {
  const trendColor = trendNegative ? "text-red-500" : "text-emerald-500";
  const Component = onClick ? "button" : "div";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`relative flex h-full min-h-[92px] w-full min-w-0 overflow-hidden rounded-[10px] border border-[#f0c86f] bg-[#FFFDF8] px-4 py-3 text-left shadow-none ${
        onClick
          ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] focus:ring-offset-2"
          : ""
      }`}
    >
      {icon && (
        <span
          className="absolute right-0 top-0 flex h-9 w-10 items-center justify-center rounded-bl-[10px]"
          style={{ backgroundColor: iconBg }}
        >
          {iconColor ? (
            <span
              className="h-5 w-5"
              style={{
                backgroundColor: iconColor,
                WebkitMask: `url(${icon}) center / contain no-repeat`,
                mask: `url(${icon}) center / contain no-repeat`,
              }}
            />
          ) : (
            <img
              className="h-5 w-5 object-contain opacity-100"
              src={icon}
              alt=""
            />
          )}
        </span>
      )}

      <div className={`flex min-w-0 flex-col justify-between ${icon ? "pr-12" : ""}`}>
        <div>
          <p className="font-inter text-[11px] font-medium leading-4 text-[#2f2f37]">
            {label}
          </p>
          <p className="mt-2 font-inter text-[20px] font-extrabold leading-6 text-[var(--admin-navy)]">
            {value}
          </p>
        </div>

        {(trend || helper) && (
          <p className="mt-3 text-[9px] font-medium text-[#36363f]">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 font-bold ${trendColor}`}
              >
                {trendNegative ? (
                  <IoMdTrendingDown className="h-3 w-3" />
                ) : (
                  <IoTrendingUp className="h-3 w-3" />
                )}
                {trend}
              </span>
            )}{" "}
            {helper && (
              <span>
                {formatLabel(String(helper).replace("last month", "Last month"))}
              </span>
            )}
          </p>
        )}
      </div>
    </Component>
  );
}
