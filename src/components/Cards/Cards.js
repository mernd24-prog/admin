import { IoMdTrendingDown } from "react-icons/io";
import { IoTrendingUp } from "react-icons/io5";
import SummaryCard from "../Shared/SummaryCard";
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
  const trendColor = trendNegative ? "text-red-500 " : "text-emerald-500";
  const iconNode = icon ? (
    typeof icon !== "string" ? (
      iconColor ? (
        <span className="flex items-center justify-center text-sm" style={{ color: iconColor }}>
          {icon}
        </span>
      ) : (
        icon
      )
    ) : iconColor ? (
      <span
        className="h-5 w-5"
        style={{
          backgroundColor: iconColor,
          WebkitMask: `url(${icon}) center / contain no-repeat`,
          mask: `url(${icon}) center / contain no-repeat`,
        }}
      />
    ) : (
      <img className="h-5 w-5 object-contain" src={icon} alt="" />
    )
  ) : null;

  const description =
    trend || helper ? (
      <p className="text-[9px] font-medium text-[#36363f]">
        {trend && (
          <span
            className={`inline-flex  items-center gap-1 font-bold ${trendColor}`}
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
    ) : null;

  return (
    <SummaryCard
      title={label}
      value={value}
      description={description}
      icon={iconNode}
      iconClassName="right-0 top-0 h-9 w-10 rounded-none rounded-bl-[10px] border-0"
      iconStyle={{ backgroundColor: iconBg }}
      onClick={onClick}
    />
  );
}
