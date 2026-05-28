import { IoMdTrendingDown } from "react-icons/io";
import { IoTrendingUp } from "react-icons/io5";
import { MdMoreVert } from "react-icons/md";

export default function Cards({
  icon,
  label,
  value,
  helper,
  trend,
  trendNegative = false,
  warning = false,
}) {
  const trendColor = trendNegative ? "text-red-600" : "text-[#082f91]";
  return (
    <div className="flex h-full min-h-[190px] w-full min-w-0 flex-col justify-between rounded-[10px] border border-[#e7e7e7] bg-gradient-to-br from-[#FFFFFF] to-[#F4F1ED] px-[26px] py-8 shadow-[0_2px_6px_rgba(20,20,20,0.16)]">
      {icon && (
        <div className="mb-[24px] flex min-h-10 items-start justify-between">
          {icon && (
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full ${warning ? "bg-[#d71920]" : "bg-[#e99f13]"} text-white`}
            >
              <img className="h-5 w-5 object-contain" src={icon} alt="" />
            </span>
          )}
          <MdMoreVert className="h-6 w-6 text-[#757683]" />
        </div>
      )}

      <div className="mt-2">
        <p className="text-lg  font-semibold  font-inter text-[#182D5099]/60">
          {label}
        </p>
        <p className=" text-[28px] font-inter font-extrabold text-[#042586]">
          {value}
        </p>
        {(trend || helper) && (
          <p className="mt-[6px] text-[12px] font-semibold text-[#6f7482]">
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
