import { FiEdit, FiEye, FiTrash2 } from "react-icons/fi";
import { IoIosList, IoMdLink } from "react-icons/io";
import { RxCountdownTimer } from "react-icons/rx";
import { IoAddCircleOutline } from "react-icons/io5";
import { IoWarningOutline } from "react-icons/io5";
import { BsListTask } from "react-icons/bs";
import { FaEye, FaUserLock } from "react-icons/fa6";
import { MdListAlt, MdPassword } from "react-icons/md";
import { useLocation } from "react-router-dom";
import Tooltip from "../tooltip/Tooltip";
import { MdLocalPrintshop } from "react-icons/md";
import PermissionGuard from "../PermissionGuard/PermissionGuard";
import { getRouteModuleCandidates } from "../../../_helpers/rbacRoutes";

export const ActionButtons = ({
  onEdit,
  onDelete,
  onAdd,
  onLink,
  onOptionValue,
  onHistory,
  onWarning,
  onView,
  onBanner,
  onPasswordChange,
  showEditButton = true,
  showLinkButton = false,
  showDeleteButton = true,
  showHistoryButton = false,
  showAddButton = false,
  showWarningButton = false,
  showOptionValues = false,
  showViewButton = false,
  showBannerButton = false,
  showPasswordButton = false,
  userPermissions = false,
  onPermissionClick,
  showListing = false,
  onListing,
  showPrint = false,
  onPrint,
  showReplace = false,
  onReplace,
  showActivateAndDeActivate = false,
  activate = false,
  showPrintIcon = false,
  viewButton=false,onViewClick,
  requiredModule,
  editAction = "update",
  deleteAction = "delete",
  viewAction = "view",
  addAction = "create",
  optionValueAction = "view",
  permissionAction = "assign",
  warningAction = "status_change",
  bannerAction = "view",
  passwordAction = "update",
  listingAction = "view",
  linkAction = "view",
  historyAction = "view",
  printAction = "export",
  replaceAction = "update",
  statusAction = "status_change",
}) => {
  const location = useLocation();
  const inferredModule = getRouteModuleCandidates(location.pathname)[0];
  const guardModule = requiredModule || inferredModule;
  const guard = (action, node) => guardModule ? (
    <PermissionGuard module={guardModule} action={action} hide>{node}</PermissionGuard>
  ) : node;
  return (
    <div className="flex items-center space-x-2">
      {showEditButton && guard(editAction, (
        <Tooltip text="Edit" position="top">
          <button
            onClick={onEdit}
            className="p-1 text-green-600 transition-colors duration-200 rounded hover:bg-green-100"
          >
            <FiEdit size={18} />
          </button>
        </Tooltip>
      ))}


         {viewButton && guard(viewAction, (
        <Tooltip text="View" position="top">
          <button
            onClick={onViewClick}
            className="p-1 text-green-600 transition-colors duration-200 rounded hover:bg-green-100"
          >
            <FiEye size={18} />
          </button>
        </Tooltip>
      ))}


      {showAddButton && guard(addAction, (
        <Tooltip text="Add" position="top">
          <button
            onClick={onAdd}
            className="p-1 text-gray-500 transition-colors duration-200 rounded hover:bg-gray-300"
          >
            <IoAddCircleOutline size={20} />
          </button>
        </Tooltip>
      ))}
      {showOptionValues && guard(optionValueAction, (
        <button
          onClick={onOptionValue}
          className="p-1 text-gray-500 transition-colors duration-200 rounded hover:bg-gray-300"
        >
          <BsListTask size={20} />
        </button>
      ))}
      {userPermissions && guard(permissionAction, <FaUserLock size={20} onClick={onPermissionClick} />)}
      {showWarningButton && guard(warningAction, (
        <button
          onClick={onWarning}
          className="p-1 text-gray-500 transition-colors duration-200 rounded hover:bg-gray-300"
        >
          <IoWarningOutline size={20} />
        </button>
      ))}
      {showViewButton && guard(viewAction, (
        <button
          onClick={onView}
          className="p-1 text-gray-500 transition-colors duration-200 rounded hover:bg-gray-300"
        >
          <FaEye size={20} />
        </button>
      ))}
      {showLinkButton && guard(linkAction, (
        <button
          onClick={onLink}
          className="p-1 text-gray-500 transition-colors duration-200 rounded hover:bg-gray-300"
        >
          <IoMdLink size={20} />
        </button>
      ))}
      {showHistoryButton && guard(historyAction, (
        <button
          onClick={onHistory}
          className="p-1 text-gray-500 transition-colors duration-200 rounded hover:bg-gray-300"
        >
          <RxCountdownTimer size={20} />
        </button>
      ))}
      {showDeleteButton && guard(deleteAction, (
        <button
          onClick={onDelete}
          className="p-1 text-red-600 transition-colors duration-200 rounded hover:bg-red-100"
        >
          <FiTrash2 size={18} />
        </button>
      ))}
      {showBannerButton && guard(bannerAction, (
        <button
          onClick={onBanner}
          className="p-1 text-gray-500 transition-colors duration-200 rounded hover:bg-gray-300"
        >
          <MdListAlt size={18} />
        </button>
      ))}
      {showPasswordButton && guard(passwordAction, (
        <Tooltip text="Change Password" position="top">
          <button
            onClick={onPasswordChange}
            className="p-1 text-black duration-200 rounded hover:bg-blue-100 hover:text-blue-500"
          >
            <MdPassword size={20} />
          </button>
        </Tooltip>
      ))}
      {showListing && guard(listingAction, (
        <button
          onClick={onListing}
          className="p-1 text-black duration-200 rounded hover:bg-blue-100 hover:text-blue-500"
        >
          <IoIosList size={20} />
        </button>
      ))}
      {showPrint && guard(printAction, (
        <p className="" onClick={onPrint}>
          Print
        </p>
      ))}
      {showPrintIcon && guard(printAction, (
        <button
          onClick={onPrint}
          className="p-1 text-gray-500 transition-colors duration-200 rounded hover:bg-gray-300"
        >
          <MdLocalPrintshop size={18} />
        </button>
      ))}
      {showReplace && guard(replaceAction, (
        <p className="" onClick={onReplace}>
          Replace
        </p>
      ))}
      {showActivateAndDeActivate && guard(statusAction, (
        <p className={activate ? "text-green-500" : "text-red-500"}>
          {activate ? "Activate" : "DeActivate"}
        </p>
      ))}
    </div>
  );
};

export const getStatusStyles = ({ status }) => {
  const normalizedStatus = status?.toLowerCase?.() || "";
  switch (normalizedStatus) {
    case "success":
    case "active":
    case "approved":
    case "paid":
    case "yes":
      return "bg-green-100 text-green-800";
    case "failed":
    case "inactive":
    case "no":
      return "bg-red-100 text-red-800";
    case "refunded":
      return "bg-blue-100 text-blue-800";
    case "suspended":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
