import React, { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Button from "../buttons/button";
import SearchInput from "../SearchInput/SearchInput";
import FilterSelect from "../FilterSelect/FilterSelect";
import { IoIosArrowDown } from "react-icons/io";
import { MdFilterList, MdOutlineDeleteOutline } from "react-icons/md";
import { DateRangeFilter } from "../../Shared/FilterBar";
// import FormInput from '../FormInput/FormInput';
import Input from "../Input/Input";
import selectJson from "../../../_helpers/SelectJson.json";
import { PiToggleLeftThin, PiToggleRightThin } from "react-icons/pi";
import { getRouteModuleCandidates } from "../../../_helpers/rbacRoutes";

export default function SearchComponent({
  userLabel,
  handleAction,
  selectedRow = [],
  loading = false,
  filters,
  setFilters,
  isProduct = false,
  isUser = false,
  isCategory = false,
  isActivationStatus = false,
  isApprovalOptions = false,
  isProductType = false,
  dateFrom = false,
  dateTo = false,
  isSearchShow = false,
  isActionButton = false,
  isSearchDown = false,
  isStatusAction,
  isPermanentDeleteAction = false,
  productOptions = [],
  userOptions = [],
  categoryOptions = [],
  activationStatusOptions = [],
  approvalOptions = [],
  productTypeOptions = [],
  activationStatus,
  approvalStatus,
  orderFrom,
  orderTo,
  fromLabel,
  toLabel,
  isDelete,
  deleteLable,
  placeholder,
  isSelectNearSearch = false,
  applyFilters,
  countryOptions = [],
  handleSearchRemove,
  productLabel,
  brandOption,
  isBrand,
  mobailClassName,
  requiredModule,
  searchDebounce = 0,
  searchActions,
  defaultSearchOpen = false,
  exclusiveStatusFilters = false,
  filterGridClassName = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  compactFilterBar = false,
  hideFilterActions = false,
  largeSearchInput = false,
  hideBottomBorder = false,
}) {
  const location = useLocation();
  const inferredModule = getRouteModuleCandidates(location.pathname)[0];
  const guardModule = inferredModule || requiredModule;
  const hasAdvancedFilters = Boolean(
    isBrand ||
      isProduct ||
      isUser ||
      isDelete ||
      isCategory ||
      isActivationStatus ||
      isApprovalOptions ||
      isProductType ||
      dateFrom ||
      dateTo ||
      orderFrom ||
      orderTo,
  );
  const [searchDown, setSearchDown] = useState(
    defaultSearchOpen || (!isSearchDown && hasAdvancedFilters),
  );
  const [, setFilteredProducts] = useState([]);
  const [isFiltering] = useState(false);
 const activeFilterCount = (() => {
  const count = Object.entries(filters || {}).filter(([key, value]) => {
    // Ignore search and date range keys
    if (
      key === "search" ||
      key === "dateFrom" ||
      key === "dateTo" ||
      key === "fromDate" ||
      key === "toDate"
    ) {
      return false;
    }

    const filterValue =
      value && typeof value === "object" ? value.value : value;

    return (
      filterValue !== undefined &&
      filterValue !== null &&
      filterValue !== "" &&
      String(filterValue).toLowerCase() !== "all"
    );
  }).length;

  // Count Date Range as one filter
  const hasDateRange =
    filters?.dateFrom ||
    filters?.dateTo ||
    filters?.fromDate ||
    filters?.toDate;

  return count + (hasDateRange ? 1 : 0);
})();

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const nextFilters = {
        ...prev,
        [field]: value,
      };

      if (exclusiveStatusFilters) {
        if (field === "activationStatus" && value?.value && value.value !== "All") {
          nextFilters.approvalStatus = { value: "All", label: "All" };
        }
        if (field === "approvalStatus" && value?.value && value.value !== "All") {
          nextFilters.activationStatus = { value: "All", label: "All" };
        }
      }

      return nextFilters;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  const getClearedFilters = useCallback(
    (previousFilters = {}) => ({
      ...previousFilters,
      search: "",
      ...(isSelectNearSearch ? { country: { value: "", label: "All" } } : {}),
      ...(isBrand ? { brand: { value: "", label: "All" } } : {}),
      ...(isProduct ? { product: { value: "", label: "All" } } : {}),
      ...(isUser || isDelete
        ? { sellerName: { value: "", label: "Search By User Name" } }
        : {}),
      ...(isCategory
        ? { category: { value: "", label: "Search By Category" } }
        : {}),
      ...(isActivationStatus
        ? { activationStatus: { value: "All", label: "All" } }
        : {}),
      ...(isApprovalOptions
        ? { approvalStatus: { value: "All", label: "All" } }
        : {}),
      ...(isProductType ? { productType: { value: "", label: "All" } } : {}),
      ...(dateFrom ? { dateFrom: "" } : {}),
      ...(dateTo ? { dateTo: "" } : {}),
    }),
    [
      dateFrom,
      dateTo,
      isActivationStatus,
      isApprovalOptions,
      isBrand,
      isCategory,
      isDelete,
      isProduct,
      isProductType,
      isSelectNearSearch,
      isUser,
    ],
  );

  const clearFilters = useCallback(() => {
    setFilters((prev) => getClearedFilters(prev));
    handleSearchRemove?.();
    setFilteredProducts([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getClearedFilters, handleSearchRemove, setFilters]);

  const handleSearchDown = () => {
    setSearchDown((prev) => !prev);
  };

  const today = new Date().toISOString().split("T")[0];

  const handleBulkAction = (action) => {
    if (selectedRow.length === 0) {
      return;
    }
    if (handleAction) {
      handleAction(action, selectedRow);
    }
  };

  return (
    <div
      className="admin-legacy-filter-card w-full"
      style={hideBottomBorder ? { borderBottom: "none" } : undefined}
    >
      <div
        className={`flex flex-col gap-3 mb-8 md:flex-row md:items-start md:justify-between ${mobailClassName}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center md:flex-[1_1_640px]">
          <div className={`w-full min-w-0 ${largeSearchInput ? "md:max-w-2xl" : "md:max-w-md"}`}>
            <SearchInput
              type="text"
              placeholder={placeholder ? placeholder : "Search"}
              searchTerm={filters.search}
              handleChange={(e) => handleFilterChange("search", e.target.value)}
              disabled={isFiltering}
              handleRemove={handleSearchRemove}
              onSubmit={applyFilters}
              debounce={searchDebounce}
              large={largeSearchInput}
            />
          </div>
          {isSelectNearSearch && (
            <div className="shrink-0">
              <FilterSelect
                label={""}
                value={filters.country}
                options={countryOptions}
                onChange={(option) => handleFilterChange("country", option)}
                placeholder={`All `}
                className={`admin-field-inline w-full sm:w-44`}
              />
            </div>
          )}
          {isSearchDown && hasAdvancedFilters && (
            <Button
              onClick={handleSearchDown}
              className="admin-btn-secondary h-6 !min-h-6 !px-2"
              disabled={isFiltering}
            >
              <IoIosArrowDown
                className={`text-xl text-[var(--admin-blue)] transition-transform duration-200 ${searchDown ? "rotate-180" : ""}`}
              />
            </Button>
          )}

          {!(isSearchShow && hasAdvancedFilters && searchDown) && (
            <Button
              onClick={applyFilters}
              className={`button-primary h-9 shrink-0 !min-h-9`}
              disabled={isFiltering}
            >
              {isFiltering ? "Searching..." : "Search"}
            </Button>
          )}
          </div>

{(searchActions || isActionButton) && (
  <div className="flex shrink-0 flex-wrap items-center gap-2">
    {searchActions}

    {isActionButton && isStatusAction && (
      <>
        <Button
          onClick={() => handleBulkAction("Active")}
          disabled={selectedRow.length === 0 || loading || isFiltering}
          requiredModule={guardModule}
          requiredAction="status_change"
          className={
            selectedRow.length === 0
              ? "h-9 !min-h-9 cursor-not-allowed border-[var(--admin-line)] gap-2"
              : "h-9 !min-h-9 border-[var(--admin-blue)] text-[var(--admin-blue)] gap-2"
          }
        >
          <PiToggleRightThin className="text-xl" />
          Activate
        </Button>

        <Button
          onClick={() => handleBulkAction("Inactive")}
          disabled={selectedRow.length === 0 || loading || isFiltering}
          requiredModule={guardModule}
          requiredAction="status_change"
          className={
            selectedRow.length === 0
              ? "h-9 !min-h-9 cursor-not-allowed border-[var(--admin-line)] gap-2"
              : "h-9 !min-h-9 border-[var(--admin-blue)] text-[var(--admin-blue)] gap-2"
          }
        >
          <PiToggleLeftThin className="text-xl" />
          Deactivate
        </Button>
      </>
    )}

    {isActionButton && isPermanentDeleteAction && (
      <Button
        onClick={() => handleBulkAction("PermanentDelete")}
        disabled={selectedRow.length === 0 || loading || isFiltering}
        requiredModule={guardModule}
        requiredAction="delete"
        className="h-9 !min-h-9 border-red-700 text-red-700 gap-2"
      >
        <MdOutlineDeleteOutline className="text-xl" />
        Delete Permanently
      </Button>
    )}

    {isActionButton && isDelete && (
      <Button
        onClick={() => handleBulkAction("Delete")}
        disabled={selectedRow.length === 0 || loading || isFiltering}
        requiredModule={guardModule}
        requiredAction="delete"
        className={
          selectedRow.length === 0
            ? "h-9 !min-h-9 cursor-not-allowed border-[var(--admin-line)] gap-2"
            : "h-9 !min-h-9 border-[var(--admin-blue)] text-[var(--admin-blue)] gap-2"
        }
      >
        <MdOutlineDeleteOutline className="text-xl" />
        Delete
      </Button>
    )}
  </div>
)}
      </div>

      {isSearchShow && hasAdvancedFilters && (
        <div
          className={`transition-all duration-300 ease-in-out ${
            searchDown
              ? compactFilterBar
                ? "-mx-4 -mb-4 -mt-4 border-t border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-4 py-3 opacity-100"
                : "mb-4 opacity-100"
              : "pointer-events-none max-h-0 overflow-hidden opacity-0"
          }`}
        >
          <div className="flex flex-col gap-3 ">
            <div className="flex shrink-0 items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <MdFilterList size={16} className="text-[var(--admin-muted)]" />
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Filters
                </span>
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--admin-gold)] px-1.5 text-[10px] font-bold text-[var(--admin-navy)] ${activeFilterCount > 0 ? "visible" : "invisible"}`}
                  aria-hidden={activeFilterCount === 0}
                >
                  {activeFilterCount || 0}
                </span>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                disabled={isFiltering || activeFilterCount === 0}
                aria-hidden={activeFilterCount === 0}
                tabIndex={activeFilterCount > 0 ? 0 : -1}
                className={`shrink-0 whitespace-nowrap text-xs font-medium text-red-500 transition-colors hover:text-red-700 disabled:cursor-not-allowed ${activeFilterCount > 0 ? "visible" : "invisible pointer-events-none"}`}
              >
                × Clear filters
              </button>
            </div>
            <div
              className={
                compactFilterBar
                  ? `grid w-full min-w-0 items-start gap-x-3 gap-y-4 text-xs ${filterGridClassName}`
                  : "flex min-w-0 flex-1 items-center gap-x-3 gap-y-4 text-xs flex-wrap"
              }
            >
            {isBrand && (
              <div className={compactFilterBar ? "min-w-0" : "shrink-0"}>
                <FilterSelect
                  label={`Brand`}
                  value={filters.brand}
                  options={brandOption || []}
                  isSearchable={false}
                  onChange={(option) => handleFilterChange("brand", option)}
                />
              </div>
            )}

            {isProduct && (
              <div className={compactFilterBar ? "min-w-0" : "shrink-0"}>
                <FilterSelect
                  label={productLabel ? productLabel : `Product`}
                  value={filters.product}
                  options={productOptions || []}
                  isSearchable={false}
                  onChange={(option) => handleFilterChange("product", option)}
                />
              </div>
            )}

            {isUser && (
              <div>
                <FilterSelect
                  label={userLabel ? userLabel : "User"}
                  value={filters.sellerName}
                  options={userOptions}
                  isSearchable={false}
                  onChange={(option) =>
                    handleFilterChange("sellerName", option)
                  }
                />
              </div>
            )}
            {isDelete && (
              <div>
                <FilterSelect
                  label={deleteLable ? deleteLable : "Delete Order"}
                  value={filters.sellerName}
                  options={selectJson?.deleteStatus}
                  isSearchable={false}
                  onChange={(option) =>
                    handleFilterChange("sellerName", option)
                  }
                />
              </div>
            )}

            {isCategory && (
              <div className={compactFilterBar ? "min-w-0" : undefined}>
                <FilterSelect
                  label={`Category`}
                  value={filters.category}
                  options={categoryOptions}
                  isSearchable={true}
                  onChange={(option) => handleFilterChange("category", option)}
                />
              </div>
            )}

            {isActivationStatus && (
              <div className={compactFilterBar ? "min-w-0" : undefined}>
                <FilterSelect
                  label={
                    activationStatus ? activationStatus : `Activation status`
                  }
                  value={filters.activationStatus}
                  options={activationStatusOptions}
                  isSearchable={false}
                  onChange={(option) =>
                    handleFilterChange("activationStatus", option)
                  }
                />
              </div>
            )}

            {isApprovalOptions && (
              <div className={compactFilterBar ? "min-w-0" : undefined}>
                <FilterSelect
                  label={approvalStatus ? approvalStatus : "Approval Status"}
                  value={filters.approvalStatus}
                  options={approvalOptions}
                  isSearchable={false}
                  onChange={(option) =>
                    handleFilterChange("approvalStatus", option)
                  }
                />
              </div>
            )}

            {isProductType && (
              <div className={compactFilterBar ? "min-w-0" : undefined}>
                <FilterSelect
                  label={`Product type`}
                  value={filters.productType}
                  options={productTypeOptions}
                  isSearchable={false}
                  onChange={(option) =>
                    handleFilterChange("productType", option)
                  }
                />
              </div>
            )}

            {dateFrom && dateTo && (
              <div className={compactFilterBar ? "min-w-0" : "min-w-40"}>
                <DateRangeFilter
                  field={{
                    label: "Date Range",
                    startKey: "dateFrom",
                    endKey: "dateTo",
                    width: "w-full",
                    wrapperClassName: "admin-field",
                    labelClassName: "admin-label",
                    placeholder: "All Date Range",
                    disableFuture: true,
                  }}
                  values={filters}
                  onChange={handleFilterChange}
                />
              </div>
            )}

            {dateFrom && !dateTo && (
              <div>
                <label className="admin-label">
                  Date from
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      handleFilterChange("dateFrom", e.target.value)
                    }
                    className="w-full"
                    disabled={isFiltering}
                    max={today}
                  />
                </div>
              </div>
            )}

            {dateTo && !dateFrom && (
              <div>
                <label className="admin-label">
                  To (Date)
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      handleFilterChange("dateTo", e.target.value)
                    }
                    className="w-full"
                    disabled={isFiltering}
                    min={filters.dateFrom}
                    max={today}
                  />
                </div>
              </div>
            )}
            {orderFrom && (
              <Input
                label={`Order From`}
                labelName={fromLabel ? fromLabel : "Order From"}
                placeholder={`Order from [$]`}
              />
            )}
            {orderTo && (
              <Input
                label={`Order To`}
                labelName={toLabel ? toLabel : "Order To"}
                placeholder={`Order to [$]`}
              />
            )}

            {!hideFilterActions && <div className="flex items-end gap-2 mb-2">
              <Button
                onClick={applyFilters}
                className="admin-btn-secondary h-9 !min-h-9 !px-4"
                disabled={isFiltering}
              >
                {isFiltering ? "Searching..." : "Search"}
              </Button>
              <Button
                onClick={clearFilters}
                disabled={isFiltering}
                className="admin-btn-secondary h-9 !min-h-9 !px-4"
              >
                Clear
              </Button>
            </div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
