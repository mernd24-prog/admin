import { IoIosCheckmark } from "react-icons/io";
import { useLocation } from "react-router-dom";
import PermissionGuard from "../PermissionGuard/PermissionGuard";
import { getRouteModuleCandidates } from "../../../_helpers/rbacRoutes";

const ToggleButton = ({
  handleClick,
  isToggle,
  requiredModule,
  requiredAction = "status_change",
  disabled = false,
  loading = false,
}) => {
  const location = useLocation();
  const inferredModule = getRouteModuleCandidates(location.pathname)[0];
  const guardModule = inferredModule || requiredModule;
  const toggle = (
    <div className="flex">
      <label className="relative inline-flex items-center w-11 h-6">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isToggle}
          disabled={disabled || loading}
          readOnly
          onClick={disabled || loading ? undefined : handleClick}
        />
        <div
          className={`w-9 h-5 rounded-full bg-[var(--admin-line-strong)] 
            peer-checked:bg-[var(--admin-navy)] transition-all duration-300 ${
              disabled || loading
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer"
            }`}
        ></div>
        <div
          className={`absolute top-[4px] left-[1px] w-4 h-4 rounded-full flex items-center justify-center 
            transition-all duration-300 transform ${
              isToggle
                ? "translate-x-full bg-white text-[var(--admin-navy)]"
                : "bg-white"
            }`}
        >
          {loading ? (
            <span className="h-2.5 w-2.5 animate-spin rounded-full border border-[var(--admin-navy)] border-t-transparent" />
          ) : (
            isToggle && <IoIosCheckmark className="text-md" size={24} />
          )}
        </div>
      </label>
    </div>
  );
  return guardModule ? (
    <PermissionGuard module={guardModule} action={requiredAction} hide>
      {toggle}
    </PermissionGuard>
  ) : (
    toggle
  );
};

export default ToggleButton;
