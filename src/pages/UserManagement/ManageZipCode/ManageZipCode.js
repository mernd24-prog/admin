/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdLocationPin } from "react-icons/md";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import Input from "../../../components/Atoms/Input/Input";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import {
  ConfirmModal,
  DataTable,
  PageHeader,
} from "../../../components/Shared";
import {
  create,
  edit,
  enableDisableZipCode,
  getZipCodeList,
} from "../../../Redux/zipCodeSlice";
import { getAllCountryList } from "../../../Redux/CountrySlice";
import { getAllStateList } from "../../../Redux/stateSlice";
import { getAllCityList } from "../../../Redux/citySlice";

const PAGE_SIZE = 10;

const extractListPayload = (payload = {}) => {
  const data = payload?.data || payload;
  const nestedData = data?.data || data;
  const list = nestedData?.list || nestedData?.items || [];
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(nestedData?.total || list.length || 0),
  };
};

const initialFormState = {
  _id: null,
  zipCode: "",
  areaName: "",
  countryId: null,
  stateId: null,
  cityId: null,
  serviceable: true,
  codAvailable: true,
  expressDelivery: false,
  deliveryCharge: 0,
  minOrderAmount: 0,
  estimatedDeliveryDays: 5,
};

const ZipCodeFormModal = ({
  open,
  onClose,
  onSubmit,
  isEditMode,
  formData,
  handleInputChange,
  handleSelectChange,
  errors,
  allCountries,
  filteredStates,
  filteredCities,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-lg shadow-xl mx-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            {isEditMode ? "Edit Zip Code" : "Add Zip Code"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              labelName="Zip / Pin Code"
              type="text"
              value={formData.zipCode}
              name="zipCode"
              onChange={handleInputChange}
              error={errors.zipCode}
              required
              maxLength={10}
            />
            <Input
              labelName="Area Name"
              type="text"
              value={formData.areaName}
              name="areaName"
              onChange={handleInputChange}
              error={errors.areaName}
              maxLength={100}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <FilterSelect
                options={allCountries}
                value={
                  allCountries.find((o) => o.value === formData.countryId) ||
                  null
                }
                onChange={handleSelectChange}
                name="countryId"
                isSearchable
                placeholder="Select Country"
              />
              {errors.countryId && (
                <p className="mt-1 text-sm text-red-600">{errors.countryId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <FilterSelect
                options={filteredStates}
                value={
                  filteredStates.find((o) => o.value === formData.stateId) ||
                  null
                }
                onChange={handleSelectChange}
                name="stateId"
                isSearchable
                placeholder="Select State"
                isDisabled={!formData.countryId}
              />
              {errors.stateId && (
                <p className="mt-1 text-sm text-red-600">{errors.stateId}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <FilterSelect
                options={filteredCities}
                value={
                  filteredCities.find((o) => o.value === formData.cityId) ||
                  null
                }
                onChange={handleSelectChange}
                name="cityId"
                isSearchable
                placeholder="Select City"
                isDisabled={!formData.stateId}
              />
              {errors.cityId && (
                <p className="mt-1 text-sm text-red-600">{errors.cityId}</p>
              )}
            </div>

            <Input
              labelName="Delivery Charge (₹)"
              type="number"
              value={formData.deliveryCharge}
              name="deliveryCharge"
              onChange={handleInputChange}
              error={errors.deliveryCharge}
              min={0}
            />
            <Input
              labelName="Min Order Amount (₹)"
              type="number"
              value={formData.minOrderAmount}
              name="minOrderAmount"
              onChange={handleInputChange}
              error={errors.minOrderAmount}
              min={0}
            />
            <Input
              labelName="Est. Delivery Days"
              type="number"
              value={formData.estimatedDeliveryDays}
              name="estimatedDeliveryDays"
              onChange={handleInputChange}
              error={errors.estimatedDeliveryDays}
              min={1}
            />

            <div className="col-span-2 flex flex-wrap gap-6 pt-2">
              {[
                ["serviceable", "Serviceable"],
                ["codAvailable", "COD Available"],
                ["expressDelivery", "Express Delivery"],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name={name}
                    checked={!!formData[name]}
                    onChange={handleInputChange}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="admin-btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="admin-btn-primary">
              {isEditMode ? "Update" : "Add Zip Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ManageZipCode = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state);

  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddModal, setIsAddModal] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [toggleTarget, setToggleTarget] = useState(null);
  const [filteredStates, setFilteredStates] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);

  const allCountries =
    selector?.country?.getAllCountryListData?.data?.data?.list?.map((e) => ({
      value: e?._id,
      label: e?.name,
    })) || [];
  const allStates =
    selector?.state?.getAllStateListData?.data?.data?.list || [];

  useEffect(() => {
    dispatch(getAllCountryList());
    dispatch(getAllStateList());
  }, [dispatch]);

  useEffect(() => {
    if (formData.countryId) {
      setFilteredStates(
        allStates
          .filter(
            (s) =>
              s.countryId === formData.countryId ||
              s.countryId?._id === formData.countryId,
          )
          .map((s) => ({ value: s._id, label: s.name })),
      );
    } else {
      setFilteredStates(
        allStates.map((s) => ({ value: s._id, label: s.name })),
      );
    }
  }, [formData.countryId, allStates.length]);

  useEffect(() => {
    if (formData.stateId) {
      dispatch(getAllCityList({ stateId: formData.stateId })).then((res) => {
        setFilteredCities(
          extractListPayload(res?.payload).list.map((c) => ({
            value: c._id,
            label: c.name,
          })),
        );
      });
    } else {
      setFilteredCities([]);
    }
  }, [formData.stateId]);

  const fetchList = useCallback(() => {
    setIsLoading(true);
    dispatch(getZipCodeList({ page: pageNo, size: PAGE_SIZE, keyWord: search }))
      .then((res) => setApiRes(extractListPayload(res?.payload)))
      .catch(() => setApiRes({ list: [], total: 0 }))
      .finally(() => setIsLoading(false));
  }, [dispatch, pageNo, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSelectChange = (option, { name }) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: option?.value || null };
      if (name === "countryId") {
        updated.stateId = null;
        updated.cityId = null;
      }
      if (name === "stateId") {
        updated.cityId = null;
      }
      return updated;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const closeModal = () => {
    setIsAddModal(false);
    setIsEditMode(false);
    setFormData(initialFormState);
    setErrors({});
    setFilteredStates([]);
    setFilteredCities([]);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.zipCode) errs.zipCode = "Zip/Pin code is required";
    if (!formData.countryId) errs.countryId = "Country is required";
    if (!formData.stateId) errs.stateId = "State is required";
    if (!formData.cityId) errs.cityId = "City is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {
      if (isEditMode) {
        await dispatch(edit({ ...formData })).unwrap();
        toast.success("Zip code updated successfully");
      } else {
        await dispatch(create(formData)).unwrap();
        toast.success("Zip code created successfully");
      }
      closeModal();
      fetchList();
    } catch (error) {
      toast.error(error?.message || "Failed to save zip code");
      if (error.errors) setErrors(error.errors);
    }
  };

  const isRowActive = (row = {}) =>
    row?.active !== undefined ? Boolean(row.active) : !row?.isDisable;

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    try {
      const res = await dispatch(
        enableDisableZipCode({
          _id: [toggleTarget?._id],
          isDisable: isRowActive(toggleTarget),
        }),
      ).unwrap();
      if (res) toast.success(res?.message);
      setToggleTarget(null);
      fetchList();
    } catch (error) {
      toast.error(error?.message || "Failed");
    }
  };

  const openEdit = (ele) => {
    setFormData({
      _id: ele._id,
      zipCode: ele.zipCode,
      areaName: ele.areaName || "",
      countryId: ele.countryId?._id || ele.countryId || null,
      stateId: ele.stateId?._id || ele.stateId || null,
      cityId: ele.cityId?._id || ele.cityId || null,
      serviceable: ele.serviceable ?? true,
      codAvailable: ele.codAvailable ?? true,
      expressDelivery: ele.expressDelivery ?? false,
      deliveryCharge: ele.deliveryCharge ?? 0,
      minOrderAmount: ele.minOrderAmount ?? 0,
      estimatedDeliveryDays: ele.estimatedDeliveryDays ?? 5,
    });
    setIsEditMode(true);
    setIsAddModal(true);
  };

  const columns = [
    {
      key: "zipCode",
      label: "Zip/Pin Code",
      render: (v) => <span className="font-mono font-medium">{v}</span>,
    },
    {
      key: "areaName",
      label: "Area Name",
      render: (v) => <span>{v || "—"}</span>,
    },
    {
      key: "cityId",
      label: "City",
      render: (v) => <span className="capitalize">{v?.name || "—"}</span>,
    },
    {
      key: "stateId",
      label: "State",
      render: (v) => <span className="capitalize">{v?.name || "—"}</span>,
    },
    {
      key: "serviceable",
      label: "Serviceable",
      render: (v) => (
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${v ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {v ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "codAvailable",
      label: "COD",
      render: (v) => (
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${v ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
        >
          {v ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <ToggleButton
            isToggle={isRowActive(row)}
            handleClick={() => setToggleTarget(row)}
            requiredModule="zip_codes"
          />
          <ActionButtons
            onEdit={() => openEdit(row)}
            showLinkButton={false}
            showDeleteButton={false}
            requiredModule="zip_codes"
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Manage Zip Codes"
        subtitle="Configure serviceable pin codes with delivery settings"
        breadcrumbs={[{ label: "Settings" }, { label: "Zip Codes" }]}
        actions={
          <button
            onClick={() => {
              setFormData(initialFormState);
              setIsEditMode(false);
              setIsAddModal(true);
            }}
          >
            + Add Zip Code
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={apiRes.list}
        loading={isLoading}
        totalCount={apiRes.total}
        page={pageNo}
        pageSize={PAGE_SIZE}
        onPageChange={setPageNo}
        onSearch={(v) => {
          setSearch(v?.trim() || "");
          setPageNo(1);
        }}
        searchPlaceholder="Search by zip code or area..."
        emptyText="No zip codes found."
        emptyIcon={<MdLocationPin size={40} className="text-gray-200" />}
        requiredModule="zip_codes"
      />

      <ZipCodeFormModal
        open={isAddModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isEditMode={isEditMode}
        formData={formData}
        handleInputChange={handleInputChange}
        handleSelectChange={handleSelectChange}
        errors={errors}
        allCountries={allCountries}
        filteredStates={filteredStates}
        filteredCities={filteredCities}
      />

      <ConfirmModal
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleConfirm}
        title={`${isRowActive(toggleTarget) ? "Disable" : "Enable"} Zip Code?`}
        message={`${isRowActive(toggleTarget) ? "Disable" : "Enable"} zip code "${toggleTarget?.zipCode || ""}"?`}
        confirmLabel={isRowActive(toggleTarget) ? "Disable" : "Enable"}
      />
    </div>
  );
};

export default ManageZipCode;
