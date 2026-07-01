import React, { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Button from "../buttons/button";
import SearchInput from "../SearchInput/SearchInput";
import FilterSelect from "../FilterSelect/FilterSelect";
import { IoIosArrowDown } from "react-icons/io";
import { IoFilterCircleOutline } from "react-icons/io5";
import { MdOutlineDeleteOutline } from "react-icons/md";
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

  const handleBulkAction = (action) => {
    if (selectedRow.length === 0) {
      return;
    }
    if (handleAction) {
      handleAction(action, selectedRow);
    }
  };

  return (
    <div className="admin-legacy-filter-card w-full">
      <div
        className={`flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center ${mobailClassName}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center md:flex-[1_1_640px]">
          <div className="w-full min-w-0 md:max-w-2xl">
            <SearchInput
              type="text"
              placeholder={placeholder ? placeholder : "Search"}
              searchTerm={filters.search}
              handleChange={(e) => handleFilterChange("search", e.target.value)}
              disabled={isFiltering}
              handleRemove={handleSearchRemove}
              onSubmit={applyFilters}
              debounce={searchDebounce}
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
          {searchActions && (
            <div className="flex shrink-0 flex-wrap items-start gap-2">
              {searchActions}
            </div>
          )}
        </div>
        {isActionButton && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isStatusAction && (
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
                  <PiToggleLeftThin className="text-xl" /> Deactivate
                </Button>
              </>
            )}
            {isDelete && (
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
                <MdOutlineDeleteOutline className="text-xl" /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {isSearchShow && hasAdvancedFilters && (
        <div
          className={`transition-all duration-300 ease-in-out ${searchDown ? "mt-4 opacity-100" : "max-h-0 overflow-hidden opacity-0"}`}
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            <IoFilterCircleOutline className="text-xl" />
            Filters
          </div>
          <div className="grid grid-cols-1 items-end gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isBrand && (
              <div className="w-full">
                <FilterSelect
                  label={`Brand`}
                  value={filters.brand}
                  options={brandOption || []}
                  onChange={(option) => handleFilterChange("brand", option)}
                />
              </div>
            )}

            {isProduct && (
              <div className="w-full">
                <FilterSelect
                  label={productLabel ? productLabel : `Product`}
                  value={filters.product}
                  options={productOptions || []}
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
                  onChange={(option) =>
                    handleFilterChange("sellerName", option)
                  }
                />
              </div>
            )}

            {isCategory && (
              <div>
                <FilterSelect
                  label={`Category`}
                  value={filters.category}
                  options={categoryOptions}
                  onChange={(option) => handleFilterChange("category", option)}
                />
              </div>
            )}

            {isActivationStatus && (
              <div>
                <FilterSelect
                  label={
                    activationStatus ? activationStatus : `Activation status`
                  }
                  value={filters.activationStatus}
                  options={activationStatusOptions}
                  onChange={(option) =>
                    handleFilterChange("activationStatus", option)
                  }
                />
              </div>
            )}

            {isApprovalOptions && (
              <div>
                <FilterSelect
                  label={approvalStatus ? approvalStatus : "Approval Status"}
                  value={filters.approvalStatus}
                  options={approvalOptions}
                  onChange={(option) =>
                    handleFilterChange("approvalStatus", option)
                  }
                />
              </div>
            )}

            {isProductType && (
              <div>
                <FilterSelect
                  label={`Product type`}
                  value={filters.productType}
                  options={productTypeOptions}
                  onChange={(option) =>
                    handleFilterChange("productType", option)
                  }
                />
              </div>
            )}

            {dateFrom && (
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
                  />
                </div>
              </div>
            )}

            {dateTo && (
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

            <div className="flex items-end gap-2 self-end sm:col-span-2 lg:col-span-3 xl:col-span-4">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
