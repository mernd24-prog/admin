import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdOutlineClose, MdSearch, MdStar, MdStarBorder } from "react-icons/md";
import { createProductReview } from "../../../../Redux/adminCoreSlice";
import { ENDPOINTS } from "../../../../_helpers/endpoints";
import { axiosPrivate } from "../../../../_helpers/axiosProvider";
import { getStoredUser } from "../../../../_helpers/authStorage";
import MultiImageUpload from "../../../../components/Atoms/ImageGallery/MultiImageUpload";

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

const productId = (product = {}) => product._id || product.id || product.productId || "";

const productLabel = (product = {}) =>
  product.title || product.name || product.productName || product.slug || productId(product);

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
          {star <= (hovered || value)
            ? <MdStar className="text-yellow-400" />
            : <MdStarBorder className="text-gray-300" />}
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
    () => products.find((product) => String(productId(product)) === String(form.productId)),
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
        const response = await axiosPrivate.get(ENDPOINTS.platform.productReviews, {
          params: {
            productId: form.productId,
            buyerId: adminId,
            limit: 1,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        });
        const [review] = normalizeList(response);
        setExistingReview(review || null);
        setForm((current) => {
          if (String(current.productId) !== String(form.productId)) return current;
          return {
            ...current,
            buyerName: review?.buyerName === "Admin Review" ? "" : review?.buyerName || "",
            rating: review?.rating || 5,
            title: review?.title || "",
            reviewText: review?.reviewText || "",
            media: Array.isArray(review?.media) ? review.media : [],
            status: review?.status || "published",
          };
        });
      } catch (error) {
        setExistingReview(null);
        toast.error(error?.response?.data?.message || "Failed to check existing review");
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
      toast.success(existingReview ? "Review updated successfully" : "Review added successfully");
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
      media: typeof updater === "function" ? updater(current.media || []) : updater,
    }));
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black bg-opacity-40 backdrop-blur-sm transition-all duration-300 ${
          isOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl transform bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Add Product Review</h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-800">
            <MdOutlineClose size={22} />
          </button>
        </div>

        <div className="h-[calc(100vh-120px)] space-y-5 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Product</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MdSearch className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") searchProducts(query);
                  }}
                  placeholder="Search product"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-navy)]"
                />
              </div>
              <button
                type="button"
                onClick={() => searchProducts(query)}
                disabled={searching}
                className="rounded-lg border border-gray-300 px-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {searching ? "..." : "Search"}
              </button>
            </div>
            <select
              value={form.productId}
              onChange={set("productId")}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-navy)]"
            >
              <option value="">Select product</option>
              {products.map((product) => {
                const id = productId(product);
                return (
                  <option key={id} value={id}>
                    {productLabel(product)}
                  </option>
                );
              })}
            </select>
            {selectedProduct && (
              <p className="mt-1 truncate text-xs text-gray-400">
                {productId(selectedProduct)}
              </p>
            )}
            {loadingExisting && (
              <p className="mt-1 text-xs text-gray-400">Checking existing review...</p>
            )}
            {!loadingExisting && existingReview && (
              <p className="mt-1 text-xs font-medium text-[var(--admin-navy)]">
                Existing review found. Editing saved review.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reviewer Name</label>
            <input
              value={form.buyerName}
              onChange={set("buyerName")}
              maxLength={120}
              placeholder="Leave blank to use logged-in admin name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-navy)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rating</label>
            <StarRating
              value={form.rating}
              onChange={(rating) => setForm((current) => ({ ...current, rating }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={form.status}
              onChange={set("status")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-navy)]"
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              value={form.title}
              onChange={set("title")}
              maxLength={200}
              placeholder="Review title"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-navy)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Review</label>
            <textarea
              rows={5}
              value={form.reviewText}
              onChange={set("reviewText")}
              maxLength={2000}
              placeholder="Write review"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-navy)]"
            />
            <p className="text-right text-xs text-gray-400">{form.reviewText.length}/2000</p>
          </div>

          <MultiImageUpload
            label="Review Photos"
            images={form.media}
            setImages={setMedia}
            maxFiles={5}
            type="PRODUCT_REVIEWS"
            isDisabled={saving}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-3 border-t bg-white px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--admin-navy)] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <MdAdd size={18} />
            {saving ? "Saving..." : existingReview ? "Update Review" : "Add Review"}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddProductReview;
