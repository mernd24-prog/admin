import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdSearch, MdStar, MdStarBorder } from "react-icons/md";
import { createProductReview } from "../../../../Redux/adminCoreSlice";
import { ENDPOINTS } from "../../../../_helpers/endpoints";
import { axiosPrivate } from "../../../../_helpers/axiosProvider";
import { getStoredUser } from "../../../../_helpers/authStorage";
import MultiImageUpload from "../../../../components/Atoms/ImageGallery/MultiImageUpload";
import FilterSelect from "../../../../components/Atoms/FilterSelect/FilterSelect";
import DefaultModal from "../../../../components/Atoms/Modal/DefaultRightSideModal";

const STATUSES = [
  { value: "published", label: "Published" },
  { value: "pending", label: "Pending" },
  { value: "hidden", label: "Hidden" },
];

const normalizeList = (response) => {
  const root = response?.data?.data || response?.data || {};
  const items = Array.isArray(root)
    ? root
    : root.list || root.items || root.rows || root.products || [];
  return Array.isArray(items) ? items : [];
};

const productId = (product = {}) =>
  product._id || product.id || product.productId || "";

const productLabel = (product = {}) =>
  product.title ||
  product.name ||
  product.productName ||
  product.slug ||
  productId(product);

const readSessionUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("EcomAdmin") || "null") || {};
  } catch {
    return {};
  }
};

const getCurrentAdminId = () => {
  const user = getStoredUser() || {};
  const sessionUser = readSessionUser();
  return (
    user._id ||
    user.id ||
    user.userId ||
    sessionUser._id ||
    sessionUser.id ||
    sessionUser.userId ||
    ""
  );
};

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl transition-colors"
          aria-label={`${star} star`}
        >
          {star <= (hovered || value) ? (
            <MdStar className="text-yellow-400" />
          ) : (
            <MdStarBorder className="text-gray-300" />
          )}
        </button>
      ))}
      <span className="ml-1 text-xs text-gray-500">{value || 0}/5</span>
    </div>
  );
}

const AddProductReview = ({ isOpen, onClose, onCreated }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    productId: "",
    buyerName: "",
    rating: 5,
    title: "",
    reviewText: "",
    media: [],
    status: "published",
  });
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) => String(productId(product)) === String(form.productId),
      ),
    [form.productId, products],
  );

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const searchProducts = useCallback(async (search = "") => {
    setSearching(true);
    try {
      const response = await axiosPrivate.get(ENDPOINTS.products.list, {
        params: {
          q: search.trim() || undefined,
          search: search.trim() || undefined,
          limit: 12,
          includeAllStatuses: true,
        },
      });
      setProducts(normalizeList(response));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load products");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      searchProducts();
    }
  }, [isOpen, searchProducts]);

  useEffect(() => {
    if (!isOpen) {
      setForm({
        productId: "",
        buyerName: "",
        rating: 5,
        title: "",
        reviewText: "",
        media: [],
        status: "published",
      });
      setQuery("");
      setProducts([]);
      setExistingReview(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const loadExistingReview = async () => {
      const adminId = getCurrentAdminId();
      if (!isOpen || !form.productId || !adminId) {
        setExistingReview(null);
        return;
      }

      setLoadingExisting(true);
      try {
        const response = await axiosPrivate.get(
          ENDPOINTS.platform.productReviews,
          {
            params: {
              productId: form.productId,
              buyerId: adminId,
              limit: 1,
              sortBy: "createdAt",
              sortOrder: "desc",
            },
          },
        );
        const [review] = normalizeList(response);
        setExistingReview(review || null);
        setForm((current) => {
          if (String(current.productId) !== String(form.productId))
            return current;
          return {
            ...current,
            buyerName:
              review?.buyerName === "Admin Review"
                ? ""
                : review?.buyerName || "",
            rating: review?.rating || 5,
            title: review?.title || "",
            reviewText: review?.reviewText || "",
            media: Array.isArray(review?.media) ? review.media : [],
            status: review?.status || "published",
          };
        });
      } catch (error) {
        setExistingReview(null);
        toast.error(
          error?.response?.data?.message || "Failed to check existing review",
        );
      } finally {
        setLoadingExisting(false);
      }
    };

    loadExistingReview();
  }, [form.productId, isOpen]);

  const handleSubmit = async () => {
    if (!form.productId) {
      toast.warning("Please select a product");
      return;
    }
    if (!form.rating) {
      toast.warning("Please select a rating");
      return;
    }
    if (!form.reviewText.trim()) {
      toast.warning("Please write a review");
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        createProductReview({
          ...form,
          buyerName: form.buyerName.trim(),
          reviewText: form.reviewText.trim(),
          title: form.title.trim(),
        }),
      ).unwrap();
      toast.success(
        existingReview
          ? "Review updated successfully"
          : "Review added successfully",
      );
      onCreated?.();
      onClose();
    } catch (error) {
      toast.error(error?.message || error || "Failed to add review");
    } finally {
      setSaving(false);
    }
  };

  const setMedia = (updater) => {
    setForm((current) => ({
      ...current,
      media:
        typeof updater === "function" ? updater(current.media || []) : updater,
    }));
  };
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  if (!isOpen) return null;

  return (
    <DefaultModal
  isOpen={isOpen}
  onClose={onClose}
  onSubmit={handleSubmit}
  title={existingReview ? "Edit Product Review" : "Add Product Review"}
  isButtonView={true}
  submitButtonText={existingReview ? "Update Review" : "Add Review"}
  closeButtonText="Cancel"
  loading={saving || loadingExisting}
  width="600px"
>
  <div className="space-y-5">
    {/* ==================== Review Information ==================== */}
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#1E293B]">
          Review Information
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          {existingReview
            ? "Update the selected product review details."
            : "Add a review for a selected product."}
        </p>
      </div>

      <div className="space-y-4">
        {/* Product */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1E293B]">
            Product <span className="text-red-500">*</span>
          </label>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <MdSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    searchProducts(query);
                  }
                }}
                placeholder="Search product"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[var(--admin-gold)]/20"
              />
            </div>

            <button
              type="button"
              onClick={() => searchProducts(query)}
              disabled={searching}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-[var(--admin-gold)] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Product Select */}
          <div className="mt-2.5">
            <FilterSelect
              options={products.map((product) => ({
                value: productId(product),
                label: productLabel(product),
              }))}
              value={
                products
                  .map((product) => ({
                    value: productId(product),
                    label: productLabel(product),
                  }))
                  .find(
                    (option) =>
                      String(option.value) ===
                      String(form.productId || ""),
                  ) || null
              }
              onChange={(option) => {
                setForm((current) => ({
                  ...current,
                  productId: option?.value || "",
                }));
              }}
              placeholder="Select product"
              isSearchable
              isClearable
            />
          </div>

          {selectedProduct && (
            <p className="mt-1.5 truncate text-xs text-gray-400">
              Product ID: {productId(selectedProduct)}
            </p>
          )}

          {loadingExisting && (
            <p className="mt-1.5 text-xs text-gray-400">
              Checking existing review...
            </p>
          )}

          {!loadingExisting && existingReview && (
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-xs font-medium text-[var(--admin-navy)]">
                Existing review found. You are editing the saved review.
              </p>
            </div>
          )}
        </div>

        {/* Reviewer + Status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Reviewer */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1E293B]">
              Reviewer Name
            </label>

            <input
              value={form.buyerName}
              onChange={set("buyerName")}
              maxLength={120}
              placeholder="Admin name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[var(--admin-gold)]/20"
            />

            <p className="mt-1 text-[11px] text-gray-400">
              Leave blank to use the logged-in admin name.
            </p>
          </div>

          {/* Status */}
          <div>
            <FilterSelect
              label="Status"
              options={STATUSES}
              value={
                STATUSES.find(
                  (option) =>
                    String(option.value) ===
                    String(form.status || ""),
                ) || null
              }
              onChange={(option) => {
                setForm((current) => ({
                  ...current,
                  status: option?.value || "",
                }));
              }}
              placeholder="Select status"
              isSearchable={false}
              isClearable={false}
            />
          </div>
        </div>
      </div>
    </div>

    {/* ==================== Rating & Content ==================== */}
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#1E293B]">
          Rating & Content
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Add the rating and written feedback for the product.
        </p>
      </div>

      <div className="space-y-4">
        {/* Rating */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1E293B]">
            Rating <span className="text-red-500">*</span>
          </label>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <StarRating
              value={form.rating}
              onChange={(rating) =>
                setForm((current) => ({
                  ...current,
                  rating,
                }))
              }
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#1E293B]">
            Title
          </label>

          <input
            value={form.title}
            onChange={set("title")}
            maxLength={200}
            placeholder="Enter review title"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[var(--admin-gold)]/20"
          />
        </div>

        {/* Review */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-[#1E293B]">
              Review <span className="text-red-500">*</span>
            </label>

            <span className="text-xs text-gray-400">
              {form.reviewText.length}/2000
            </span>
          </div>

          <textarea
            rows={4}
            value={form.reviewText}
            onChange={set("reviewText")}
            maxLength={2000}
            placeholder="Write review..."
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[var(--admin-gold)]/20"
          />
        </div>
      </div>
    </div>

    {/* ==================== Review Photos ==================== */}
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#1E293B]">
          Review Photos
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Upload product photos that should appear with this review.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-3">
        <MultiImageUpload
          label="Review Photos"
          images={form.media}
          setImages={setMedia}
          maxFiles={5}
          type="PRODUCT_REVIEWS"
          isDisabled={saving}
        />
      </div>
    </div>
  </div>
</DefaultModal>
  );
};

export default AddProductReview;
