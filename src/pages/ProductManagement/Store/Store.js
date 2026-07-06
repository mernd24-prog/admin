/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import TableData from "../../../components/Atoms/TableData/TableData";
import DeletePopup from "../../../components/Atoms/DeletePopup.js/DeletePopup";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import AddButton from "../../../components/Button/AddButton";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import { useDispatch, useSelector } from "react-redux";
import {
  create,
  edit,
  enableDisable,
  getAllSellerList,
  getShopList,
} from "../../../Redux/StoreSlice";
import { getAllCountryList } from "../../../Redux/CountrySlice";
import { getAllStateList } from "../../../Redux/stateSlice";
import { getAllCityList } from "../../../Redux/citySlice";
import { getAllZipCodeList } from "../../../Redux/zipCodeSlice";
import { toast } from "sonner";
import Loader from "../../../components/Loader/Loader";
import CustomCheckbox from "../../../components/Atoms/Checkbox/Checkbox";
import { transformArray } from "../../../_helpers/globalFunctions";
import moment from "moment-timezone";
import DefaultMiddleModal from "../../../components/Atoms/Modal/DefaultMiddleModal ";
import Pagination from "../../../components/Pagination/Pagination";

const PAGE_SIZE = 10;
const INITIAL_FORM_STATE = {
  name: "",
  user_id: "",
  contact_person: "",
  address: "",
  country_code: "",
  state_code: "",
  city_code: "",
  zip_code: "",
  phone: "",
  mobile: "",
  email: "",
  open_time: "",
  close_time: "",
  location: {
    type: "Point",
    coordinates: ["", ""],
  },
  gstNumber: "",
  panNumber: "",
  businessLicense: "",
  password: "",
  confirmPassword: "",
  userName: "",
};

const Store = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state);
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [filters, setFilters] = useState({ search: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [selectedShopForDelete, setSelectedShopForDelete] = useState(null);
  const [selectedRow, setSelectedRow] = useState([]);
  const [userData, setUserData] = useState(null);

  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "",
    selectedShop: null,
  });
  const [isPasswordUpdateModal, setIsPasswordUpdateModal] = useState(false);

  // Form state
  const [formValues, setFormValues] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modifiedCountry = transformArray(
    selector?.country?.getAllCountryListData?.data?.data?.list || [],
  );
  const modifiedState = transformArray(
    selector?.state?.getAllStateListData?.data?.data?.list || [],
  );
  const modifiedCity = transformArray(
    selector?.city?.getAllCityListData?.data?.data?.list || [],
  );
  const modifiedZipCode = transformArray(
    selector?.zipCode?.getAllZipCodeListData?.data?.data?.list || [],
  );
  const modifiedSellerList = transformArray(
    selector?.store?.getAllSellerListData?.data?.data?.list || [],
  );

  useEffect(() => {
    const userDataString = sessionStorage.getItem("EcomAdmin");
    if (userDataString) {
      try {
        const parsedData = JSON.parse(userDataString);
        setUserData(parsedData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const fetchStoreList = useCallback(() => {
    const query = {
      page: pageNo,
      size: PAGE_SIZE,
      keyWord: filters?.search || "",
      populate: "user_id:userName,email",
    };

    setIsLoading(true);
    dispatch(getShopList(query))
      .then((res) => {
        setApiRes(res?.payload?.data || { list: [], total: 0 });
      })
      .catch((err) => {
        console.error("Error fetching shops:", err);
        setApiRes({ list: [], total: 0 });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [dispatch, pageNo, filters?.search]);

  useEffect(() => {
    fetchStoreList();
    dispatch(getAllCountryList());
    dispatch(getAllSellerList());
  }, [fetchStoreList]);

  const handleInputChange = (e, coordIndex = null) => {
    const { name, value } = e.target;

    setFormValues((prev) => {
      if (name === "coordinates") {
        const updatedCoords = [...(prev.location?.coordinates || ["", ""])];
        updatedCoords[coordIndex] = value;

        return {
          ...prev,
          location: {
            ...prev.location,
            coordinates: updatedCoords,
          },
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSelectChange = (selectedOption, action) => {
    switch (action) {
      case "COUNTRY":
        setFormValues((prev) => ({
          ...prev,
          country_code: selectedOption?.value || "",
          state_code: "",
          city_code: "",
          zip_code: "",
        }));
        setIsLoading(true);
        if (selectedOption?.value) {
          dispatch(
            getAllStateList({
              query: JSON.stringify({ country_code: selectedOption.value }),
            }),
          );
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
        break;

      case "STATE":
        setFormValues((prev) => ({
          ...prev,
          state_code: selectedOption?.value || "",
          city_code: "",
          zip_code: "",
        }));
        if (selectedOption?.value) {
          dispatch(
            getAllCityList({
              query: JSON.stringify({ state_code: selectedOption.value }),
            }),
          );
        }
        break;

      case "CITY":
        setFormValues((prev) => ({
          ...prev,
          city_code: selectedOption?.value || "",
          zip_code: "",
        }));
        if (selectedOption?.value) {
          dispatch(
            getAllZipCodeList({
              query: JSON.stringify({ city_code: selectedOption.value }),
            }),
          );
        }
        break;

      case "ZIP_CODE":
        setFormValues((prev) => ({
          ...prev,
          zip_code: selectedOption?.value || "",
        }));
        break;
      case "user_id":
        setFormValues((prev) => ({
          ...prev,
          user_id: selectedOption?.value,
        }));
        break;

      default:
        break;
    }

    const fieldMap = {
      COUNTRY: "country_code",
      STATE: "state_code",
      CITY: "city_code",
      ZIP_CODE: "zip_code",
    };

    const fieldName = fieldMap[action];
    if (fieldName && formErrors[fieldName]) {
      setFormErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }
  };

  const formatMillisToHHMM = (ms, timezone = "Asia/Kolkata") => {
    if (!ms && ms !== 0) return "-";
    const m = moment.tz(ms, timezone).startOf("day").add(ms, "ms");
    return m.format("HH:mm");
  };

  const handleAction = (type, shop = null) => {
    if (type === "EDIT" && shop) {
      setFormValues({
        name: shop.name || "",
        contact_person: shop.contact_person || "",
        address: shop.address || "",
        country_code: shop.country_code || "",
        state_code: shop.state_code || "",
        city_code: shop.city_code || "",
        zip_code: shop.zip_code || "",
        phone: shop.phone || "",
        mobile: shop.mobile || "",
        email: shop.email || "",
        open_time: formatMillisToHHMM(shop.open_time || ""),
        close_time: formatMillisToHHMM(shop.close_time || ""),
        location: {
          type: "Point",
          coordinates: shop.location?.coordinates || [0, 0],
        },
        user_id: shop.user_id?._id || "",
        gstNumber: shop.gstNumber || "",
        panNumber: shop.panNumber || "",
        businessLicense: shop.businessLicense || "",
        userName: shop?.userName,
      });

      if (shop.country_code) {
        dispatch(
          getAllStateList({
            query: JSON.stringify({ country_code: shop.country_code }),
          }),
        );
      }
      if (shop.state_code) {
        dispatch(
          getAllCityList({
            query: JSON.stringify({ state_code: shop.state_code }),
          }),
        );
      }
      if (shop.city_code) {
        dispatch(
          getAllZipCodeList({
            query: JSON.stringify({ city_code: shop.city_code }),
          }),
        );
      }
    } else {
      setFormValues(INITIAL_FORM_STATE);
    }

    setFormErrors({});
    setModalState({
      isOpen: true,
      type,
      selectedShop: shop,
    });
  };

  const convertTimeToMilliseconds = (timeStr, timezone = "Asia/Kolkata") => {
    const m = moment.tz(timeStr, "HH:mm", timezone);
    return m.hours() * 60 * 60 * 1000 + m.minutes() * 60 * 1000;
  };

  const validateStoreForm = (formValues) => {
    const errors = {};
    if (userData?.roleId !== 3) {
      if (!formValues.user_id) errors.user_id = "Seller is required";
    }
    if (!formValues.name?.trim()) errors.name = "Store name is required";
    if (!formValues.contact_person?.trim())
      errors.contact_person = "Contact person is required";
    if (!formValues.address?.trim()) errors.address = "Address is required";
    if (!formValues.businessLicense?.trim())
      errors.businessLicense = "Business license is required";
    if (!formValues.gstNumber?.trim())
      errors.gstNumber = "GST number is required";
    if (!formValues.panNumber?.trim())
      errors.panNumber = "PAN number is required";
    if (!formValues.phone?.trim()) errors.phone = "Phone number is required";
    if (modalState.type !== "EDIT") {
      if (!formValues.password?.trim())
        errors.password = "Password  is required";
      if (!formValues.confirmPassword?.trim())
        errors.confirmPassword = "Confirm Password  is required";
    }
    if (!formValues.mobile?.trim()) errors.mobile = "Mobile number is required";
    if (!formValues.userName?.trim()) errors.userName = "User Name is required";

    if (
      !Array.isArray(formValues?.location?.coordinates) ||
      formValues.location.coordinates.length !== 2 ||
      !formValues.location.coordinates[0] ||
      !formValues.location.coordinates[1]
    ) {
      errors.coordinates = "Both longitude and latitude are required";
    }
    if (!formValues.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      errors.email = "Invalid email format";
    }
    if (!formValues.country_code) errors.country_code = "Country is required";
    if (!formValues.state_code) errors.state_code = "State is required";
    if (!formValues.city_code) errors.city_code = "City is required";
    if (!formValues.zip_code) errors.zip_code = "Zip code is required";
    if (!formValues.open_time) errors.open_time = "Open time is required";
    if (!formValues.close_time) errors.close_time = "Close time is required";
    if (formValues.open_time && formValues.close_time) {
      const openTime = new Date(`2000-01-01T${formValues.open_time}`);
      const closeTime = new Date(`2000-01-01T${formValues.close_time}`);
      if (closeTime <= openTime) {
        errors.close_time = "Close time must be after open time";
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateStoreForm(formValues);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payloadWithTime = {
        ...formValues,
        open_time: convertTimeToMilliseconds(formValues.open_time),
        close_time: convertTimeToMilliseconds(formValues.close_time),
      };

      let res;

      if (modalState.type === "EDIT") {
        // Remove password fields when editing
        const { password, confirmPassword, ...cleanedPayload } =
          payloadWithTime;

        const apiPayload = {
          ...cleanedPayload,
          _id: modalState.selectedShop._id,
        };

        res = await dispatch(edit(apiPayload)).unwrap();
        toast.success(res?.message || "Shop updated successfully!");
      } else {
        res = await dispatch(create(payloadWithTime)).unwrap();
        toast.success(res?.message || "Shop created successfully!");
      }

      setModalState({ isOpen: false, type: "", selectedShop: null });
      setFormValues(INITIAL_FORM_STATE);
      setFormErrors({});
      fetchStoreList();
    } catch (error) {
      toast.error(error || "Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (shop) => {
    setSelectedShopForDelete(shop);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      console.log("Deleting shop:", selectedShopForDelete);

      setShowDeleteConfirmation(false);
      setSelectedShopForDelete(null);
      fetchStoreList();
    } catch (error) {
      console.error("Error deleting shop:", error);
    }
  };

  const formatMillisTo12Hour = (ms, timezone = "Asia/Kolkata") => {
    if (!ms && ms !== 0) return "-";
    const m = moment.tz(ms, timezone).startOf("day").add(ms, "ms");
    return m.format("hh:mm A");
  };

  const getAllRowIds = useCallback(() => {
    return apiRes?.list?.map((row) => row?._id) || [];
  }, [apiRes?.list]);

  const handleToggleAction = async (data) => {
    const apiPayload = {
      _id: [data?._id],
      isDisable: !data?.isDisable,
    };
    try {
      setIsLoading(true);
      const response = await dispatch(enableDisable(apiPayload)).unwrap();

      if (response.message) {
        toast.success(
          `Store ${apiPayload.isDisable ? "disabled" : "enabled"} successfully.`,
        );
        fetchStoreList();
      } else {
        toast.info(response?.message || "Something went wrong");
      }
    } catch (error) {
      toast.error(error?.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeaderCheckboxChange = (e) => {
    setSelectedRow(e.target.checked ? getAllRowIds() : []);
  };

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow((prev) =>
      e.target.checked ? [...prev, rowId] : prev.filter((id) => id !== rowId),
    );
  };

  // Table configuration
  const tableHeadings = [
    "Shop Name",
    ...(userData?.roleId !== 3 ? ["Seller Name"] : []),
    "Address",
    "Mobile/ Email",
    "Opening Hours",
    "Created On",
    "Status",
    "Action",
  ];

  const tableRows = apiRes?.list?.map((shop, index) => {
    const row = [
      <span key={`checkbox-${index}`}>
        <CustomCheckbox
          checked={selectedRow.includes(shop._id)}
          onChange={(e) => handleRowCheckboxChange(e, shop._id)}
        />
      </span>,

      <div className="flex flex-col" key={`shopname-${index}`}>
        <span className="font-medium">{shop?.name}</span>
      </div>,
    ];
    if (userData?.roleId !== 3) {
      row.push(
        <div key={`seller-${index}`}>
          <p>{shop?.user_id?.userName}</p>
          <p>{shop?.user_id?.email}</p>
          {/* <p>{shop?.contact_person || '-'}</p> */}
        </div>,
      );
    }

    row.push(
      <p
        key={`address-${index}`}
        className="truncate text-wrap break-words w-52"
      >
        {shop?.address || "-"}
      </p>,
      <div key={`contact-${index}`}>
        <p>
          <span>{shop?.mobile || "-"}</span>
        </p>
        <p>
          <span>{shop?.email || "-"}</span>
        </p>
      </div>,
      <span key={`hours-${index}`}>
        {`${formatMillisTo12Hour(shop?.open_time)} - ${formatMillisTo12Hour(shop?.close_time)}`}
      </span>,
      <span key={`created-${index}`}>
        {shop?.createdAt ? new Date(shop.createdAt).toLocaleDateString() : "-"}
      </span>,
      <ToggleButton
        key={`toggle-${index}`}
        isToggle={!shop?.isDisable}
        handleClick={() => handleToggleAction(shop)}
      />,
      <div key={`actions-${index}`}>
        <ActionButtons
          onDelete={() => handleDelete(shop)}
          showWarningButton={false}
          showLinkButton={false}
          showEditButton={true}
          showDeleteButton={false}
          onEdit={() => handleAction("EDIT", shop)}
          onPasswordChange={() => {
            setIsPasswordUpdateModal(true);
            setFormValues({ user_id: shop?._id });
          }}
          showPasswordButton={userData?.roleId === 3 ? true : false}
        />
      </div>,
    );

    return row;
  });

  const handleBulkAction = async (action) => {
    if (action === "Active" || action === "Inactive") {
      let apiPayload = {
        _id: selectedRow,
        isDisable: action === "Active" ? false : true,
      };
      try {
        const res = await dispatch(enableDisable(apiPayload)).unwrap();
        if (res) {
          toast.success(res?.message);
        }
        fetchStoreList();
      } catch (error) {
        toast.error(error?.message || error || "Failed...!");
      }
    }
  };

  const handleClose = () => {
    setIsPasswordUpdateModal(false);
    setFormValues(INITIAL_FORM_STATE);
    setFormErrors({});
  };

  const handleSubmitUpdatePassword = async () => {
    toast.info(
      "Store password update API is unavailable. Please use the seller forgot/reset password flow.",
    );
    setIsPasswordUpdateModal(false);
    setFormValues(INITIAL_FORM_STATE);
    setFormErrors({});
  };

  const handlePageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  return (
    <>
      <Loader loading={isSubmitting || isLoading} />
      <div className="overflow-hidden overflow-x-auto overflow-y-auto space-y-3 py-10">
        <div className="flex justify-between items-center">
          <h3>Home / Store</h3>
          <AddButton onClick={() => handleAction("ADD")} />
        </div>

        <div className="overflow-auto overflow-y-auto bg-white text-xs">
          <div className="border-b mb-2 p-4">
            <SearchComponent
              filters={filters}
              isSearchDown={false}
              isActionButton={true}
              isSearchShow={false}
              isStatusAction={true}
              dateFrom={true}
              dateTo={true}
              productLabel="Mark as featured"
              isProduct={true}
              productOptions={[{ value: "", label: "All" }]}
              isUser={true}
              userLabel={"Status"}
              userOptions={[{ value: "", label: "All" }]}
              isActivationStatus={true}
              activationStatus={`Shop status by seller`}
              activationStatusOptions={[{ value: "", label: "All" }]}
              setFilters={setFilters}
              selectedRow={selectedRow}
              setSelectedRow={setSelectedRow}
              handleAction={handleBulkAction}
            />
          </div>

          <TableData
            Heading="Shops"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder="Search by shop name, contact person, email..."
            showFilter={false}
            showSummary={false}
            showAddButton={false}
            isLoading={isLoading}
            totalData={apiRes?.total || 0}
            currentPage={pageNo}
            pageSize={PAGE_SIZE}
            onPageChange={setPageNo}
            isHeaderCheckbox={true}
            handleHeaderCheckboxChange={handleHeaderCheckboxChange}
            allRowsSelected={selectedRow.length === apiRes?.list?.length}
          />
        </div>
        {apiRes?.total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(apiRes?.total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => {
          setShowDeleteConfirmation(false);
          setSelectedShopForDelete(null);
        }}
        confirmDelete={confirmDelete}
        DeleteHeading={`Are you sure you want to delete "${selectedShopForDelete?.name}"?`}
      />
      <DefaultModal
        title={modalState.type === "EDIT" ? "Edit Store" : "Add Store"}
        isOpen={modalState.isOpen}
        onClose={() => {
          setModalState({ isOpen: false, type: "", selectedShop: null });
          setFormValues(INITIAL_FORM_STATE);
          setFormErrors({});
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="p-4 space-y-4 py-6 text-xs">
          <div className="grid grid-cols-2 gap-4">
            {userData?.roleId !== 3 && (
              <div className="col-span-2">
                <FilterSelect
                  label="Seller *"
                  name="user_id"
                  value={
                    modifiedSellerList.find(
                      (c) => c.value === formValues.user_id,
                    ) || null
                  }
                  onChange={(e) => handleSelectChange(e, "user_id")}
                  options={modifiedSellerList}
                  placeholder="Select Seller"
                  error={formErrors.user_id}
                />
              </div>
            )}

            <div className="col-span-2">
              <Input
                labelName="Store Name *"
                name="name"
                value={formValues.name}
                onChange={handleInputChange}
                error={formErrors.name}
                placeholder="Enter store name"
              />
            </div>

            <div>
              <Input
                labelName="Contact Person *"
                name="contact_person"
                value={formValues.contact_person}
                onChange={handleInputChange}
                error={formErrors.contact_person}
                placeholder="Enter contact person name"
              />
            </div>
            <div className="">
              <Input
                labelName="Store Username *"
                name="userName"
                value={formValues.userName}
                onChange={handleInputChange}
                error={formErrors.userName}
                placeholder="Enter store user name"
              />
            </div>
          </div>

          <div>
            <Input
              labelName="Address *"
              name="address"
              value={formValues.address}
              onChange={handleInputChange}
              error={formErrors.address}
              placeholder="Enter full address"
            />
          </div>
          <div>
            <div className=" grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                labelName={`GST`}
                value={formValues?.gstNumber}
                name={`gstNumber`}
                onChange={handleInputChange}
                error={formErrors.gstNumber}
              />
              <Input
                labelName={`PAN`}
                value={formValues?.panNumber}
                name={`panNumber`}
                onChange={handleInputChange}
                error={formErrors.panNumber}
              />
              <Input
                labelName={`Business License`}
                value={formValues?.businessLicense}
                name={`businessLicense`}
                onChange={handleInputChange}
                error={formErrors.businessLicense}
              />
              <Input
                labelName="Email *"
                name="email"
                type="email"
                value={formValues.email}
                onChange={handleInputChange}
                error={formErrors.email}
                placeholder="Enter email address"
              />
            </div>
          </div>
          <label className="text-sm font-semibold">Location:</label>

          <div>
            <FilterSelect
              label="Country *"
              name="country_code"
              value={
                modifiedCountry.find(
                  (c) => c.value === formValues.country_code,
                ) || null
              }
              onChange={(e) => handleSelectChange(e, "COUNTRY")}
              options={modifiedCountry}
              placeholder="Select Country"
              error={formErrors.country_code}
            />
          </div>
          <div>
            <FilterSelect
              label="State *"
              name="state_code"
              value={
                modifiedState.find((s) => s.value === formValues.state_code) ||
                null
              }
              onChange={(e) => handleSelectChange(e, "STATE")}
              options={modifiedState}
              placeholder="Select State"
              disabled={!formValues.country_code}
              error={formErrors.state_code}
            />
          </div>

          <div>
            <FilterSelect
              label="City *"
              name="city_code"
              value={
                modifiedCity.find((c) => c.value === formValues.city_code) ||
                null
              }
              onChange={(e) => handleSelectChange(e, "CITY")}
              options={modifiedCity}
              placeholder="Select City"
              disabled={!formValues.state_code}
              error={formErrors.city_code}
            />
          </div>
          <div>
            <FilterSelect
              label="Zip Code *"
              name="zip_code"
              value={
                modifiedZipCode.find((z) => z.value === formValues.zip_code) ||
                null
              }
              onChange={(e) => handleSelectChange(e, "ZIP_CODE")}
              options={modifiedZipCode}
              placeholder="Select Zip Code"
              disabled={!formValues.city_code}
              error={formErrors.zip_code}
            />
          </div>
          <Input
            labelName={`Longitude's`}
            value={formValues?.location?.coordinates[0]}
            placeholder={`ex:28.69564`}
            name={`coordinates`}
            onChange={(e) => handleInputChange(e, 0)}
          />
          <Input
            labelName={`Latitudes`}
            value={formValues?.location?.coordinates[1]}
            name={`coordinates`}
            placeholder={`ex:28.69564`}
            onChange={(e) => handleInputChange(e, 1)}
          />
          <span className="text-red-500 text-xs col-span-2">
            {formErrors.coordinates}
          </span>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                labelName="Phone"
                name="phone"
                value={formValues.phone}
                onChange={handleInputChange}
                error={formErrors.phone}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Input
                labelName="Mobile *"
                name="mobile"
                value={formValues.mobile}
                onChange={handleInputChange}
                error={formErrors.mobile}
                placeholder="Enter mobile number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                labelName="Open Time * (24hr format)"
                name="open_time"
                type="time"
                value={formValues.open_time}
                onChange={handleInputChange}
                error={formErrors.open_time}
                placeholder="e.g., 900 for 9:00 AM"
              />
            </div>
            <div>
              <Input
                labelName="Close Time * (24hr format)"
                name="close_time"
                type="time"
                value={formValues.close_time}
                onChange={handleInputChange}
                error={formErrors.close_time}
                placeholder="e.g., 2100 for 9:00 PM"
              />
            </div>
            {modalState.type !== "EDIT" && (
              <>
                <div>
                  <Input
                    labelName="Password"
                    name="password"
                    type="password"
                    value={formValues.password}
                    onChange={handleInputChange}
                    error={formErrors.password}
                    placeholder="password"
                  />
                </div>
                <div>
                  <Input
                    labelName="confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formValues.confirmPassword}
                    onChange={handleInputChange}
                    error={formErrors.confirmPassword}
                    placeholder="confirm Password"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </DefaultModal>

      <DefaultMiddleModal
        isOpen={isPasswordUpdateModal}
        onClose={handleClose}
        title={`Update your store password`}
        onSubmit={handleSubmitUpdatePassword}
      >
        <div className="p-2">
          <Input
            type="password"
            value={formValues?.password}
            onChange={handleInputChange}
            name="password"
            labelName={`Password`}
          />
          <Input
            type="password"
            value={formValues?.confirmPassword}
            onChange={handleInputChange}
            name="confirmPassword"
            labelName={`Confirm Password`}
          />
        </div>
      </DefaultMiddleModal>
    </>
  );
};

export default Store;
