/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import TableData from "../../../components/Atoms/TableData/TableData";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import Loader from "../../../components/Loader/Loader";
import Button from "../../../components/Atoms/buttons/button";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import Pagination from "../../../components/Pagination/Pagination";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import {
  create,
  edit,
  enableDisableCity,
  getCityList,
} from "../../../Redux/citySlice";
import { getAllStateList } from "../../../Redux/stateSlice";
import { getAllCountryList } from "../../../Redux/CountrySlice";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { Link } from "react-router-dom";

const size = 10;

const extractListPayload = (payload = {}) => {
  const data = payload?.data || payload;
  const nestedData = data?.data || data;
  const list = nestedData?.list || nestedData?.items || [];
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(nestedData?.total || list.length || 0),
  };
};

const ManageCity = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state);
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: "", country: "" });
  const [isLoading, setIsLoading] = useState(false);
  const initialFormState = {
    name: "",
    country_code: null,
    state_code: null,
    _id: null,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const countryOptions =
    selector?.country?.getAllCountryListData?.data?.data?.list?.map((e) => ({
      value: e?._id,
      label: e?.name,
    })) || [];

  const allStateOptions =
    selector?.state?.getAllStateListData?.data?.data?.list?.map((e) => ({
      value: e?._id,
      label: e?.name,
      countryId:
        e?.countryId?._id ||
        e?.countryId ||
        e?.country_code?._id ||
        e?.country_code ||
        null,
    })) || [];

  const stateOptions = formData.country_code
    ? allStateOptions.filter(
        (state) =>
          String(state.countryId || "") === String(formData.country_code),
      )
    : [];

  const stateFilterOptions = [
    { value: "", label: "All States" },
    ...allStateOptions,
  ];

  const fetchCityList = useCallback(() => {
    const query = {
      page: pageNo,
      size: size,
      keyWord: filters?.search,
      searchFields: "name",
      populate: "state_code:name",
      stateId: filters?.country?.value || undefined,
    };
    setIsLoading(true);
    dispatch(getCityList(query))
      .then((res) => {
        setApiRes(extractListPayload(res?.payload));
      })
      .catch((err) => {
        console.error("Error fetching cities:", err);
        setApiRes({ list: [], total: 0 });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [dispatch, pageNo, filters.search, filters?.country?.value]);

  useEffect(() => {
    fetchCityList();
    dispatch(getAllCountryList());
    dispatch(getAllStateList());
  }, [fetchCityList, dispatch]);

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  const getAllRowIds = useCallback(() => {
    return apiRes?.list?.map((row) => row?._id) || [];
  }, [apiRes?.list]);

  const handleHeaderCheckboxChange = (e) => {
    setSelectedRow(e.target.checked ? getAllRowIds() : []);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (selectedOption, { name }) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: selectedOption?.value || null,
      };
      if (name === "country_code") {
        updated.state_code = null;
      }
      return updated;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const closeModal = () => {
    setIsAddModal(false);
    setIsEditMode(false);
    setFormData(initialFormState);
    setErrors({});
  };

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow((prev) =>
      e.target.checked ? [...prev, rowId] : prev.filter((id) => id !== rowId),
    );
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.country_code) newErrors.country_code = "Country is required";
    if (!formData.state_code) newErrors.state_code = "State is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      name: formData.name,
      country_code: formData.country_code,
      state_code: formData.state_code,
    };

    try {
      if (isEditMode) {
        await dispatch(edit({ ...payload, _id: formData._id })).unwrap();
        toast.success("City updated successfully");
      } else {
        await dispatch(create(payload)).unwrap();
        toast.success("City created successfully");
      }
      closeModal();
      fetchCityList();
    } catch (error) {
      console.error("Error saving city:", error);
      toast.error(error || "Failed to save city");
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };

  const isRowActive = (row = {}) =>
    row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const handleToggle = async (city) => {
    const currentlyActive = isRowActive(city);
    let apiPayload = {
      _id: [city?._id],
      isDisable: currentlyActive,
    };
    try {
      const res = await dispatch(enableDisableCity(apiPayload)).unwrap();
      if (res) {
        toast.success(res?.message);
      }
      fetchCityList();
    } catch (error) {
      toast.error(error?.message || error || "Failed...!");
      if (error.errors) {
        setErrors(error.errors);
      }
    }
  };

  const applyFilters = useCallback(() => {
    setPageNo(1);
    fetchCityList();
  }, [fetchCityList]);

  const tableHeadings = [
    "City Name",
    "Country Name",
    "State Name",
    "Status",
    "Action",
  ];

  const tableRows = apiRes?.list?.map((ele) => [
    <input
      type="checkbox"
      checked={selectedRow.includes(ele._id)}
      onChange={(e) => handleRowCheckboxChange(e, ele._id)}
    />,
    <span className="capitalize">{ele?.name}</span>,
    <span className="capitalize">
      {ele?.countryId?.name ||
        ele?.country_code?.name ||
        ele?.stateId?.countryId?.name ||
        ele?.state_code?.countryId?.name ||
        "N/A"}
    </span>,
    <span className="capitalize">
      {ele?.stateId?.name || ele?.state_code?.name || "N/A"}
    </span>,
    <div className="flex flex-col">
      <ToggleButton
        isToggle={isRowActive(ele)}
        handleClick={() => handleToggle(ele)}
      />
    </div>,
    <ActionButtons
      onEdit={() => {
        const stateId = ele.stateId?._id || ele.state_code?._id;
        const matchingState = allStateOptions.find(
          (state) => String(state.value) === String(stateId),
        );
        setFormData({
          name: ele.name,
          country_code:
            ele.countryId?._id ||
            ele.country_code?._id ||
            ele.stateId?.countryId?._id ||
            ele.state_code?.countryId?._id ||
            matchingState?.countryId ||
            null,
          state_code: stateId,
          _id: ele._id,
        });
        setIsEditMode(true);
        setIsAddModal(true);
      }}
      showLinkButton={false}
      showDeleteButton={false}
    />,
  ]);

  const handleBulkAction = async (action) => {
    if (action === "Active" || action === "Inactive") {
      let apiPayload = {
        _id: selectedRow,
        isDisable: action === "Active" ? false : true,
      };
      try {
        const res = await dispatch(enableDisableCity(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
        }
        setSelectedRow([]);
        fetchCityList();
      } catch (error) {
        toast.error(error?.message || error || "Failed...!");
        setSelectedRow([]);
        if (error.errors) {
          setErrors(error.errors);
        }
      }
    }
  };

  const handleSearchRemove = () => {
    setFilters({ search: "", country: "" });
    setPageNo(1);
  };

  return (
    <>
      <div className="p-6 overflow-hidden max-w-7xl mx-auto overflow-x-auto overflow-y-auto space-y-3">
        <Loader loading={isLoading} />
        <div className="flex justify-between items-center">
          <h3>
            Home / <Link to="/app/setting">Settings</Link> / Cities
          </h3>
          <Button
            onClick={() => {
              setFormData(initialFormState);
              setIsEditMode(false);
              setIsAddModal(true);
            }}
          >
            Add
          </Button>
        </div>

        <div className="overflow-auto overflow-y-auto bg-white rounded-lg ">
          <SearchComponent
            isSearchShow={true}
            isActionButton={true}
            filters={filters}
            setFilters={setFilters}
            isStatusAction={true}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            placeholder={`Search by name`}
            handleAction={handleBulkAction}
            countryOptions={stateFilterOptions}
            isSelectNearSearch={true}
            applyFilters={applyFilters}
            handleSearchRemove={handleSearchRemove}
          />

          <TableData
            Heading="Manage Cities"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            showFilter={false}
            showSummary={false}
            totalData={apiRes?.total}
            totalSize={size}
            currentPage={pageNo}
            onPageChange={onPageChange}
            isHeaderCheckbox={true}
            handleHeaderCheckboxChange={handleHeaderCheckboxChange}
            allRowsSelected={
              selectedRow.length === apiRes?.list?.length &&
              apiRes?.list?.length > 0
            }
          />
          {apiRes?.total > size && (
            <Pagination
              totalPages={Math.ceil(apiRes?.total / size)}
              currentPage={pageNo}
              onPageChange={onPageChange}
            />
          )}
        </div>

        <DefaultModal
          title={isEditMode ? "Edit City" : "Add City"}
          isOpen={isAddModal}
          onClose={closeModal}
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
            <div className="col-span-2">
              <Input
                labelName="Name"
                type="text"
                value={formData.name}
                name="name"
                onChange={handleInputChange}
                error={errors.name}
                required
                maxLength={50}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <FilterSelect
                options={countryOptions}
                value={
                  countryOptions?.find(
                    (option) => option.value === formData.country_code,
                  ) || null
                }
                onChange={handleSelectChange}
                name="country_code"
                className="basic-single"
                classNamePrefix="select"
                isSearchable
                placeholder="Select Country"
              />
              {errors.country_code && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.country_code}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <FilterSelect
                options={stateOptions}
                value={
                  stateOptions?.find(
                    (option) => option.value === formData.state_code,
                  ) || null
                }
                onChange={handleSelectChange}
                name="state_code"
                className="basic-single"
                classNamePrefix="select"
                isSearchable
                placeholder="Select State"
                isDisabled={!formData.country_code}
              />
              {errors.state_code && (
                <p className="mt-1 text-sm text-red-600">{errors.state_code}</p>
              )}
            </div>
          </div>
        </DefaultModal>
      </div>
    </>
  );
};

export default ManageCity;
