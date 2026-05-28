import { IoIosCheckmark } from "react-icons/io";
import { useLocation } from "react-router-dom";
import PermissionGuard from "../PermissionGuard/PermissionGuard";
import { getRouteModuleCandidates } from "../../../_helpers/rbacRoutes";

const ToggleButton = ({ handleClick, isToggle, requiredModule, requiredAction = "status_change" }) => {
  const location = useLocation();
  const inferredModule = getRouteModuleCandidates(location.pathname)[0];
  const guardModule = requiredModule || inferredModule;
  const toggle = (
    <div className="flex">
      <label className="relative inline-flex items-center w-11 h-6">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isToggle}
          readOnly
           onClick={handleClick}
        />
        <div
         
          className={`w-9 h-5 rounded-full bg-gray-200 
            peer-checked:bg-gray-200 transition-all duration-300 cursor-pointer`}
        ></div>
        <div
          className={`absolute top-[4px] left-[1px] w-4 h-4 rounded-full flex items-center justify-center 
            transition-all duration-300 transform ${
              isToggle ? "translate-x-full bg-white text-black" : "bg-white"
            }`}
        >
          {isToggle && <IoIosCheckmark className="text-md" size={24} />}
        </div>
      </label>
    </div>
  );
  return guardModule ? (
    <PermissionGuard module={guardModule} action={requiredAction} hide>
      {toggle}
    </PermissionGuard>
  ) : toggle;
};

export default ToggleButton;
