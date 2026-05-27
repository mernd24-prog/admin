import React, { useState, useCallback } from "react";
import Button from "../buttons/button";
import SearchInput from "../SearchInput/SearchInput";
import FilterSelect from "../FilterSelect/FilterSelect";
import { IoIosArrowDown } from "react-icons/io";
import { MdOutlineDeleteOutline } from "react-icons/md";
// import FormInput from '../FormInput/FormInput';
import Input from "../Input/Input";
import selectJson from "../../../_helpers/SelectJson.json";
import { PiToggleLeftThin, PiToggleRightThin } from "react-icons/pi";

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
  countryLabel,
  countryOptions = [],
  handleSearchRemove,
  productLabel,
  brandOption,
  isBrand,
  mobailClassName,
  requiredModule,
  searchDebounce = 0,
}) {
  const [searchDown, setSearchDown] = useState(false);
  const [, setFilteredProducts] = useState([]);
  const [isFiltering] = useState(false);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      sellerName: { value: "", label: "Search By User Name" },
      category: { value: "", label: "Search By Category" },
      activationStatus: { value: "Does not matter", label: "Does not matter" },
      approvalStatus: { value: "Does not matter", label: "Does not matter" },
      productType: { value: "Select", label: "Select" },
      dateFrom: "",
      dateTo: "",
    });
    setFilteredProducts([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="w-full bg-white p-1 ">
      <div
        className={`flex md:flex-row flex-col   justify-between gap-10  mb-4 ${mobailClassName}`}
      >
        <div className="flex justify-center   items-center w-full gap-3">
          <div className="w-full">
            <SearchInput
              type="text"
              placeholder={placeholder ? placeholder : "Search"}
              searchTerm={filters.search}
              handleChange={(e) => handleFilterChange("search", e.target.value)}
              disabled={isFiltering}
              handleRemove={handleSearchRemove}
              debounce={searchDebounce}
            />
          </div>
          {isSelectNearSearch && (
            <div>
              <FilterSelect
                label={""}
                value={filters.country}
                options={countryOptions}
                onChange={(option) => handleFilterChange("country", option)}
                placeholder={`All `}
                className={`w-44 `}
              />
            </div>
          )}
          {isSearchDown && (
            <Button
              onClick={handleSearchDown}
              className={`bg-[#f3f6f9] border-none py-2.5`}
              disabled={isFiltering}
            >
              <IoIosArrowDown
                className={`text-xl text-[#0A73CF] transition-transform duration-200 ${searchDown ? "rotate-180" : ""}`}
              />
            </Button>
          )}

          <Button
            onClick={applyFilters}
            className={`button-primary  `}
            disabled={isFiltering}
          >
            {isFiltering ? "Searching..." : "Search"}
          </Button>
        </div>
        {isActionButton && (
          <div className="flex justify-end items-center gap-2">
            {isStatusAction && (
              <>
                <Button
                  onClick={() => handleBulkAction("Active")}
                  disabled={selectedRow.length === 0 || loading || isFiltering}
                  requiredModule={requiredModule}
                  requiredAction="status"
                  className={
                    selectedRow.length === 0
                      ? " cursor-not-allowed border-[#dee2e6] gap-2"
                      : "border-blue-500 text-blue-500 gap-2"
                  }
                >
                  <PiToggleRightThin />
                  Activate
                </Button>
                <Button
                  onClick={() => handleBulkAction("Inactive")}
                  disabled={selectedRow.length === 0 || loading || isFiltering}
                  requiredModule={requiredModule}
                  requiredAction="status"
                  className={
                    selectedRow.length === 0
                      ? " cursor-not-allowed border-[#dee2e6] gap-2"
                      : "border-blue-500 text-blue-500 gap-2"
                  }
                >
                  <PiToggleLeftThin /> Deactivate
                </Button>
              </>
            )}
            {isDelete && (
              <Button
                onClick={() => handleBulkAction("Delete")}
                disabled={selectedRow.length === 0 || loading || isFiltering}
                requiredModule={requiredModule}
                requiredAction="delete"
                className={
                  selectedRow.length === 0
                    ? " cursor-not-allowed border-[#dee2e6] gap-2"
                    : "border-blue-500 text-blue-500 gap-2"
                }
              >
                <MdOutlineDeleteOutline /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {isSearchShow && (
        <div
          className={` transition-all duration-300 ease-in-out ${searchDown ? "opacity-100 mb-4 " : "opacity-0 max-h-0"}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end text-xs">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date from
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      handleFilterChange("dateFrom", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded"
                    disabled={isFiltering}
                  />
                </div>
              </div>
            )}

            {dateTo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To (Date)
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      handleFilterChange("dateTo", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded"
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

            <div className="flex items-end gap-2">
              <Button
                onClick={applyFilters}
                className={`bg-white text-black`}
                disabled={isFiltering}
              >
                {isFiltering ? "Searching..." : "Search"}
              </Button>
              <Button onClick={clearFilters} disabled={isFiltering}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
