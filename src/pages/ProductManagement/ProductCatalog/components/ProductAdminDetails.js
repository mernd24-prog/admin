import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import Loader from "../../../../components/Loader/Loader";
import {
  getProductById,
  approveDisapprove,
  duplicateProduct,
  getProductRevisions,
  reviewProductRevision,
} from "../../../../Redux/productSlice";

import ProductStatusBadge from "../../../../components/Product/ProductStatusBadge";
import ProductReviewModal from "../../../../components/Product/ProductReviewModal";
import ConfirmModal from "../../../../components/Shared/ConfirmModal";
import ImageGallery from "../../../../components/Atoms/ImageGallery/ImageGallery";
import Tabs from "../../../../components/Shared/Tabs";

import { normalizeImageList } from "../../../../_helpers/productMedia";

import {
  formatDateTime12Hour,
  formatLabel,
} from "../../../../utils/formatters";

import {
  getStoredRole,
  normalizeRole,
} from "../../../../_helpers/authStorage";
import Breadcrumb from "./Breadcrumb";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const sectionClass =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md";

const sectionHeaderClass =
  "flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-[var(--admin-surface-soft)] via-white to-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between";

const sectionEyebrowClass =
  "text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--admin-gold)]";

const sectionTitleClass =
  "mt-1 text-xl font-bold tracking-tight text-[var(--admin-navy)]";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const formatDisplayValue = (value) => {
  if (React.isValidElement(value)) return value;

  if (value === 0) return "0";

  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "N/A";
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.title ||
      value.label ||
      value.email ||
      value._id ||
      JSON.stringify(value)
    );
  }

  return String(value);
};

const Row = ({ label, value }) => (
  <div className="group rounded-xl border border-gray-100 bg-white px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--admin-gold)]/40 hover:bg-[var(--admin-surface-soft)] hover:shadow-sm">
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
      {label}
    </p>

    <p className="break-words text-sm font-semibold leading-5 text-gray-800">
      {formatLabel(formatDisplayValue(value))}
    </p>
  </div>
);

const getShippingPincodeSummary = (shipping = {}) => {
  const mode = shipping?.serviceabilityMode || "inherit";

  const allowed =
    shipping?.allowPincodes ||
    shipping?.serviceablePincodes ||
    [];

  if (mode === "disabled") {
    return "Delivery disabled for this product";
  }

  if (mode === "allowlist") {
    return allowed.length
      ? `Only allowed pincodes: ${allowed.join(", ")}`
      : "Allowlist selected, but no pincodes added";
  }

  if (mode === "all_pincodes") {
    return "Deliverable to all pincodes";
  }

  return "Inherits seller or shipping profile pincode rules";
};

const refToLabel = (value) => {
  if (!value) return null;

  if (typeof value === "object") {
    return (
      value?.name ||
      value?.title ||
      value?.label ||
      value?.email ||
      value?._id ||
      null
    );
  }

  return String(value);
};

const getSliceData = (sliceData) => {
  const data =
    sliceData?.data?.data ||
    sliceData?.normalized?.data ||
    sliceData?.data ||
    {};

  if (Array.isArray(data)) {
    return {
      list: data,
      total: data.length,
    };
  }

  return data;
};

/* -------------------------------------------------------------------------- */
/*                              Main Component                                */
/* -------------------------------------------------------------------------- */

const ProductAdminDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);

  const [variantGalleryOpen, setVariantGalleryOpen] = useState(false);
  const [variantGalleryImages, setVariantGalleryImages] = useState([]);

  const selector = useSelector((state) => state.product);

  const product =
    selector?.updateProductsData?.normalized?.data ||
    selector?.updateProductsData?.data?.data ||
    {};

  const revisionData = getSliceData(selector?.getProductRevisionsData);

  const revisions = Array.isArray(revisionData?.list)
    ? revisionData.list
    : Array.isArray(revisionData?.items)
      ? revisionData.items
      : [];

  const pendingRevision =
    product.pendingRevision ||
    revisions.find((revision) => revision.status === "pending") ||
    null;

  const currentRole = normalizeRole(getStoredRole());

  const isSellerRole = [
    "seller",
    "seller-admin",
    "seller-sub-admin",
  ].includes(currentRole);

  const REVIEWABLE_STATUSES = new Set(["pending_approval"]);

  const needsReview =
    !isSellerRole &&
    (REVIEWABLE_STATUSES.has(product?.status) ||
      product?.revisionStatus === "change_pending" ||
      Boolean(product?.pendingRevisionId) ||
      Boolean(product?.pendingRevision));

  const attributes =
    product.attributes instanceof Map
      ? Object.fromEntries(product.attributes)
      : product.attributes || {};

  const sellerDisplayName =
    product.sellerName ||
    product.seller?.displayName ||
    product.seller?.name ||
    product.seller?.email ||
    product.sellerId;

  const organizationDisplayName =
    product.organizationSnapshot?.displayName ||
    product.organizationSnapshot?.legalBusinessName ||
    product.organizationSnapshot?.businessName ||
    product.organizationSnapshot?.name ||
    product.organizationName ||
    product.organizationId;

  const getVariantImagesList = (variant = {}) =>
    normalizeImageList(
      variant?.images,
      variant?.image,
      variant?.imageUrls,
      variant?.thumbnail,
      variant?.media?.images,
    );

  const getVariantImage = (variant = {}) => {
    const images = getVariantImagesList(variant);
    return images[0] || "";
  };

  const productTabs = [
    {
      value: "overview",
      label: "Overview",
    },

    ...(product.analytics
      ? [
          {
            value: "analytics",
            label: "Analytics",
          },
        ]
      : []),

    ...(Object.keys(attributes).length > 0
      ? [
          {
            value: "attributes",
            label: "Attributes",
            count: Object.keys(attributes).length,
          },
        ]
      : []),

    ...(product.variants?.length > 0
      ? [
          {
            value: "variants",
            label: "Variants",
            count: product.variants.length,
          },
        ]
      : []),

    ...(product.dimensions ||
    product.origin ||
    product.warranty ||
    product.shipping
      ? [
          {
            value: "shipping",
            label: "Shipping & Compliance",
          },
        ]
      : []),

    ...(product.digital ||
    product.subscription ||
    product.bundleItems?.length > 0 ||
    product.seo ||
    product.tags?.length > 0
      ? [
          {
            value: "additional",
            label: "Additional Details",
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (!id) return;

    dispatch(getProductById({ _id: id }));

    dispatch(
      getProductRevisions({
        productId: id,
        page: 1,
        size: 20,
      }),
    );
  }, [dispatch, id]);

  const handleReviewSubmit = async (
    decision,
    rejectionReason,
    checklist,
    notes,
  ) => {
    if (isSellerRole) {
      throw new Error(
        "Product approval and revision review are admin-only actions.",
      );
    }

    setReviewLoading(true);

    try {
      if (pendingRevision) {
        await dispatch(
          reviewProductRevision({
            productId: id,
            revisionId: pendingRevision._id || pendingRevision.id,
            status: decision,
            rejectionReason: rejectionReason || null,
            notes: notes || null,
            checklist,
          }),
        ).unwrap();
      } else {
        await dispatch(
          approveDisapprove({
            id,
            status: decision,
            rejectionReason: rejectionReason || null,
            notes: notes || null,
            checklist,
          }),
        ).unwrap();
      }

      const labels = {
        active: "approved",
        inactive: "deactivated",
        rejected: "rejected",
      };

      toast.success(
        `${pendingRevision ? "Product revision" : "Product"} ${
          labels[decision] || "updated"
        } successfully.`,
      );

      await Promise.all([
        dispatch(getProductById({ _id: id })).unwrap(),

        dispatch(
          getProductRevisions({
            productId: id,
            page: 1,
            size: 20,
          }),
        ).unwrap(),
      ]);

      setReviewOpen(false);
    } catch (error) {
      throw new Error(error?.message || "Failed to update product");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDuplicateSubmit = async () => {
    setActionLoading(true);

    try {
      const response = await dispatch(
        duplicateProduct({ _id: id }),
      ).unwrap();

      const newId =
        response?.data?.data?._id ||
        response?.data?._id ||
        response?.data?.data?.id ||
        response?.data?.id;

      toast.success(
        response?.message || "Product duplicated successfully.",
      );

      setDuplicateConfirm(false);

      if (newId) {
        navigate(`/app/product-catalog/form/${newId}`);
      }
    } catch (error) {
      toast.error(
        error?.message || "Failed to duplicate product.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-1 pb-8 sm:px-0">
      <Loader
        loading={
          selector.loading ||
          reviewLoading ||
          actionLoading
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* Breadcrumb                                                         */}
      {/* ------------------------------------------------------------------ */}

 <Breadcrumb currentLabel="Product Details" />

      {/* ------------------------------------------------------------------ */}
      {/* Product Header                                                     */}
      {/* ------------------------------------------------------------------ */}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {product.status && (
                <ProductStatusBadge
                  status={product.status}
                  revisionStatus={product.revisionStatus}
                />
              )}

              {product.productType && (
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  {formatLabel(product.productType)}
                </span>
              )}
            </div>

            <h1 className="truncate text-xl font-bold tracking-tight text-[var(--admin-navy)] sm:text-2xl">
              {product.title || "Product Details"}
            </h1>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Review product information, variants, analytics, and compliance
              details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {needsReview && (
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--admin-navy)] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {pendingRevision ? "Review Revision" : "Review Product"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setDuplicateConfirm(true)}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-gold)] hover:text-[var(--admin-navy)] hover:shadow-sm"
            >
              Duplicate
            </button>

            <Link
              to={`/app/product-catalog/form/${id}`}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--admin-gold)] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              Edit Product
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Rejection Alert                                                    */}
      {/* ------------------------------------------------------------------ */}

      {product.status === "rejected" && product.rejectionReason && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-white px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
              !
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-red-700">
                Product Rejected
              </p>

              <p className="mt-1 text-sm font-medium leading-6 text-red-600">
                {product.rejectionReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Tabs                                                               */}
      {/* ------------------------------------------------------------------ */}

      <Tabs
        tabs={productTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Content                                                            */}
      {/* ------------------------------------------------------------------ */}

      <div className="mt-4 grid grid-cols-1 gap-5">
        {/* ---------------------------------------------------------------- */}
        {/* Overview                                                         */}
        {/* ---------------------------------------------------------------- */}

        {activeTab === "overview" && (
          <section className={sectionClass}>
            <div className={sectionHeaderClass}>
              <div>
                <p className={sectionEyebrowClass}>
                  Product information
                </p>

                <h2 className={sectionTitleClass}>
                  Overview
                </h2>
              </div>

              <span className="inline-flex w-fit rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                General details
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 bg-gray-50/50 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-3">
              <Row label="Title" value={product.title} />

              <Row
                label="Seller"
                value={refToLabel(sellerDisplayName)}
              />

              <Row
                label="Seller Email"
                value={
                  product.sellerEmail ||
                  product.seller?.email
                }
              />

              <Row
                label="Seller ID"
                value={refToLabel(product.sellerId)}
              />

              <Row
                label="Organization"
                value={refToLabel(organizationDisplayName)}
              />

              <Row
                label="Category"
                value={
                  refToLabel(product.categoryName) ||
                  refToLabel(product.category) ||
                  refToLabel(product.categoryId)
                }
              />

              <Row
                label="Brand"
                value={refToLabel(product.brand)}
              />

              <Row
                label="GST Rate"
                value={
                  product.gstRate !== undefined
                    ? `${product.gstRate}%`
                    : null
                }
              />

              <Row
                label="GST Mode"
                value={
                  product.gstInclusive === false
                    ? "Excluded"
                    : "Included"
                }
              />

              <Row
                label="HSN Code"
                value={product.hsnCode}
              />

              <Row
                label="Deal Product"
                value={
                  product.metadata?.isDealProduct
                    ? `${
                        product.metadata?.dealBadge || "Deal"
                      } (${
                        product.metadata?.dealSource ||
                        "admin_direct"
                      })`
                    : "No"
                }
              />

              <Row
                label="Created At"
                value={formatDateTime12Hour(product.createdAt)}
              />

              <Row
                label="Approved At"
                value={formatDateTime12Hour(product.approvedAt)}
              />
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Analytics                                                        */}
        {/* ---------------------------------------------------------------- */}

        {activeTab === "analytics" && product.analytics && (
          <section className={sectionClass}>
            <div className={sectionHeaderClass}>
              <div>
                <p className={sectionEyebrowClass}>
                  Performance overview
                </p>

                <h2 className={sectionTitleClass}>
                  Analytics
                </h2>
              </div>

              <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                Product performance
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
              {[
                {
                  label: "Total Views",
                  value: (
                    product.analytics.views || 0
                  ).toLocaleString("en-IN"),
                },
                {
                  label: "Purchases",
                  value: (
                    product.analytics.purchases || 0
                  ).toLocaleString("en-IN"),
                },
                {
                  label: "Revenue",
                  value: `₹${(
                    product.analytics.revenue || 0
                  ).toLocaleString("en-IN")}`,
                },
                {
                  label: "Wishlists",
                  value: (
                    product.analytics.wishlistAdds || 0
                  ).toLocaleString("en-IN"),
                },
                {
                  label: "Cart Adds",
                  value: (
                    product.analytics.cartAdds || 0
                  ).toLocaleString("en-IN"),
                },
                {
                  label: "Returns",
                  value: (
                    product.analytics.returns || 0
                  ).toLocaleString("en-IN"),
                },
                {
                  label: "Avg Rating",
                  value: product.rating
                    ? `${Number(product.rating).toFixed(1)} ★`
                    : "No ratings",
                },
                {
                  label: "Reviews",
                  value: (
                    product.reviewCount || 0
                  ).toLocaleString("en-IN"),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="group rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--admin-gold)]/40 hover:shadow-md"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {label}
                  </p>

                  <p className="mt-2 break-words text-xl font-bold tracking-tight text-[var(--admin-navy)]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Attributes                                                       */}
        {/* ---------------------------------------------------------------- */}

        {activeTab === "attributes" &&
          Object.keys(attributes).length > 0 && (
            <section className={sectionClass}>
              <div className={sectionHeaderClass}>
                <div>
                  <p className={sectionEyebrowClass}>
                    Product specifications
                  </p>

                  <h2 className={sectionTitleClass}>
                    Attributes
                  </h2>
                </div>

                <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                  {Object.keys(attributes).length} fields
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 bg-gray-50/50 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(attributes).map(([key, value]) => (
                  <Row
                    key={key}
                    label={formatLabel(key)}
                    value={
                      Array.isArray(value)
                        ? value.join(", ")
                        : String(value ?? "")
                    }
                  />
                ))}
              </div>
            </section>
          )}

        {/* ---------------------------------------------------------------- */}
        {/* Variants                                                         */}
        {/* ---------------------------------------------------------------- */}

        {activeTab === "variants" && product.variants?.length > 0 && (
          <section className={sectionClass}>
            <div className={sectionHeaderClass}>
              <div>
                <p className={sectionEyebrowClass}>
                  Product variants
                </p>

                <h2 className={sectionTitleClass}>
                  Variants
                </h2>
              </div>

              <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                {product.variants.length} variants
              </span>
            </div>

            <div className="overflow-x-auto p-3 sm:p-4">
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-[var(--admin-surface-soft)]">
                    {[
                      "Image",
                      "SKU",
                      "Price",
                      "MRP",
                      "Stock",
                      "Attributes",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {product.variants.map((variant, index) => (
                    <tr
                      key={variant.sku || index}
                      className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-[var(--admin-surface-soft)]"
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col items-center gap-3">
                          {getVariantImage(variant) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setVariantGalleryImages(
                                  getVariantImagesList(variant),
                                );
                                setVariantGalleryOpen(true);
                              }}
                              className="group relative h-12 w-12 overflow-hidden rounded-xl border border-gray-200 bg-white"
                              title="View variant images"
                            >
                              <img
                                src={getVariantImage(variant)}
                                alt={
                                  variant.sku ||
                                  variant.title ||
                                  "Variant"
                                }
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                              />
                            </button>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                              —
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setVariantGalleryImages(
                                getVariantImagesList(variant),
                              );
                              setVariantGalleryOpen(true);
                            }}
                            className="text-xs font-bold text-[var(--admin-blue)] transition-colors hover:text-[var(--admin-gold)] hover:underline"
                          >
                            View  
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-700">
                          {variant.sku || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span className="font-bold text-gray-900">
                          {variant.price !== undefined
                            ? `₹${Number(
                                variant.price,
                              ).toLocaleString("en-IN")}`
                            : "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span className="text-gray-600">
                          {variant.mrp !== undefined
                            ? `₹${Number(
                                variant.mrp,
                              ).toLocaleString("en-IN")}`
                            : "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            Number(variant.stock) > 0
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {variant.stock ?? "N/A"}
                        </span>
                      </td>

                      <td className="max-w-md px-4 py-3 align-middle text-xs leading-5 text-gray-500">
                        {variant.attributes
                          ? Object.entries(
                              variant.attributes instanceof Map
                                ? Object.fromEntries(
                                    variant.attributes,
                                  )
                                : variant.attributes,
                            )
                              .map(
                                ([key, value]) =>
                                  `${key}: ${value}`,
                              )
                              .join(", ")
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Variant Gallery                                                  */}
        {/* ---------------------------------------------------------------- */}

        <ImageGallery
          images={variantGalleryImages}
          isOpen={variantGalleryOpen}
          onClose={() => setVariantGalleryOpen(false)}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Shipping & Compliance                                            */}
        {/* ---------------------------------------------------------------- */}

        {activeTab === "shipping" &&
          (product.dimensions ||
            product.origin ||
            product.warranty ||
            product.shipping) && (
            <section className={sectionClass}>
              <div className={sectionHeaderClass}>
                <div>
                  <p className={sectionEyebrowClass}>
                    Operations
                  </p>

                  <h2 className={sectionTitleClass}>
                    Shipping & Compliance
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 bg-gray-50/50 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-3">
                {product.shipping && (
                  <>
                    <Row
                      label="Delivery Pincode Rule"
                      value={getShippingPincodeSummary(
                        product.shipping,
                      )}
                    />

                    <Row
                      label="Shipping Charge"
                      value={
                        product.shipping.freeShipping
                          ? "Free shipping"
                          : product.shipping.shippingCharge ??
                            product.shipping.additionalCost
                      }
                    />

                    <Row
                      label="COD"
                      value={
                        product.shipping.codAvailable === false
                          ? "Not available"
                          : "Available"
                      }
                    />
                  </>
                )}

                {product.dimensions && (
                  <>
                    <Row
                      label="Dimensions (L × W × H)"
                      value={
                        [
                          product.dimensions.length,
                          product.dimensions.width,
                          product.dimensions.height,
                        ]
                          .filter(
                            (value) =>
                              value !== undefined &&
                              value !== null &&
                              value !== "",
                          )
                          .join(" × ") +
                          (product.dimensions.unit
                            ? ` ${product.dimensions.unit}`
                            : "") || null
                      }
                    />

                    <Row
                      label="Weight"
                      value={
                        product.dimensions.weight
                          ? `${product.dimensions.weight} ${
                              product.dimensions.weightUnit || "kg"
                            }`
                          : null
                      }
                    />
                  </>
                )}

                {product.origin && (
                  <Row
                    label="Origin"
                    value={
                      [
                        product.origin.city,
                        product.origin.state,
                        product.origin.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || null
                    }
                  />
                )}

                {product.warranty?.period && (
                  <Row
                    label="Warranty"
                    value={`${product.warranty.period} ${
                      product.warranty.periodUnit || "months"
                    } (${
                      product.warranty.type || "manufacturer"
                    })`}
                  />
                )}

                {product.warranty?.returnPolicy?.eligible !==
                  undefined && (
                  <Row
                    label="Return Policy"
                    value={
                      product.warranty.returnPolicy.eligible
                        ? `Eligible — ${
                            product.warranty.returnPolicy.days ??
                            product.warranty.returnPolicy
                              .returnWindowDays ??
                            0
                          } days`
                        : "Not eligible"
                    }
                  />
                )}
              </div>
            </section>
          )}

        {/* ---------------------------------------------------------------- */}
        {/* Additional Details                                              */}
        {/* ---------------------------------------------------------------- */}

        {activeTab === "additional" && (
          <>
            {/* Digital Product ------------------------------------------- */}

            {product.productType === "digital" && product.digital && (
              <section className={sectionClass}>
                <div className={sectionHeaderClass}>
                  <div>
                    <p className={sectionEyebrowClass}>
                      Digital information
                    </p>

                    <h2 className={sectionTitleClass}>
                      Digital Product Details
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 bg-gray-50/50 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-3">
                  <Row
                    label="File Type"
                    value={product.digital.fileType}
                  />

                  <Row
                    label="File Size"
                    value={
                      product.digital.fileSize
                        ? `${product.digital.fileSize} MB`
                        : null
                    }
                  />

                  <Row
                    label="Download Limit"
                    value={
                      product.digital.downloadLimit
                        ? String(product.digital.downloadLimit)
                        : "Unlimited"
                    }
                  />

                  <Row
                    label="Link Expiry"
                    value={
                      product.digital.expiryDays
                        ? `${product.digital.expiryDays} days`
                        : "Never"
                    }
                  />

                  <Row
                    label="License Type"
                    value={product.digital.licenseType}
                  />

                  <Row
                    label="Version"
                    value={product.digital.version}
                  />

                  <Row
                    label="Platform"
                    value={product.digital.platform}
                  />

                  <Row
                    label="Requires Auth"
                    value={
                      product.digital.requiresAuth ? "Yes" : "No"
                    }
                  />
                </div>

                {product.digital.fileUrl && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                      Download URL
                    </p>

                    <a
                      href={product.digital.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-sm font-semibold text-[var(--admin-blue)] transition-colors hover:text-[var(--admin-gold)] hover:underline"
                    >
                      {product.digital.fileUrl}
                    </a>
                  </div>
                )}
              </section>
            )}

            {/* Subscription --------------------------------------------- */}

            {product.productType === "subscription" &&
              product.subscription && (
                <section className={sectionClass}>
                  <div className={sectionHeaderClass}>
                    <div>
                      <p className={sectionEyebrowClass}>
                        Subscription information
                      </p>

                      <h2 className={sectionTitleClass}>
                        Subscription Details
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 bg-gray-50/50 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-3">
                    <Row
                      label="Billing Cycle"
                      value={product.subscription.billingCycle}
                    />

                    <Row
                      label="Recurring Price"
                      value={
                        product.subscription.recurringPrice !==
                        undefined
                          ? `₹${Number(
                              product.subscription.recurringPrice,
                            ).toLocaleString("en-IN")}`
                          : null
                      }
                    />

                    <Row
                      label="Trial Period"
                      value={
                        product.subscription.trialDays
                          ? `${product.subscription.trialDays} days`
                          : "No trial"
                      }
                    />

                    <Row
                      label="Setup Fee"
                      value={
                        product.subscription.setupFee
                          ? `₹${Number(
                              product.subscription.setupFee,
                            ).toLocaleString("en-IN")}`
                          : "Free"
                      }
                    />

                    <Row
                      label="Grace Period"
                      value={
                        product.subscription.gracePeriodDays
                          ? `${product.subscription.gracePeriodDays} days`
                          : "None"
                      }
                    />

                    <Row
                      label="Auto-renew"
                      value={
                        product.subscription.autoRenew
                          ? "Enabled"
                          : "Disabled"
                      }
                    />

                    <Row
                      label="Pause Allowed"
                      value={
                        product.subscription.pauseAllowed
                          ? "Yes"
                          : "No"
                      }
                    />
                  </div>

                  {product.subscription.features?.length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-5">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        Plan Features
                      </p>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {product.subscription.features.map(
                          (feature, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 rounded-xl border border-gray-100 bg-[var(--admin-surface-soft)] px-3 py-3 text-sm font-medium text-gray-700"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                                <svg
                                  className="h-3.5 w-3.5 text-green-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </span>

                              <span className="break-words">
                                {feature}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

            {/* Bundle Items --------------------------------------------- */}

            {product.productType === "bundle" &&
              product.bundleItems?.length > 0 && (
                <section className={sectionClass}>
                  <div className={sectionHeaderClass}>
                    <div>
                      <p className={sectionEyebrowClass}>
                        Bundle information
                      </p>

                      <h2 className={sectionTitleClass}>
                        Bundle Items
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                        {product.bundleItems.length} items
                      </span>

                      {product.bundleDiscount > 0 && (
                        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-700">
                          {product.bundleDiscount}% discount
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto p-3 sm:p-4">
                    <table className="w-full min-w-[750px] text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-[var(--admin-surface-soft)]">
                          {[
                            "Product",
                            "SKU",
                            "Qty",
                            "Unit Price",
                            "Subtotal",
                          ].map((heading) => (
                            <th
                              key={heading}
                              className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {product.bundleItems.map((item, index) => (
                          <tr
                            key={item.productId || index}
                            className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-[var(--admin-surface-soft)]"
                          >
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-3">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={
                                      item.title || "Bundle product"
                                    }
                                    className="h-12 w-12 rounded-xl border border-gray-200 object-cover"
                                  />
                                ) : (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
                                    —
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-gray-800">
                                    {item.title || item.productId}
                                  </p>

                                  {item.productId && (
                                    <p className="mt-1 truncate text-[11px] text-gray-400">
                                      ID: {item.productId}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-600">
                                {item.sku || "—"}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <span className="inline-flex min-w-8 justify-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                                {item.quantity}
                              </span>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <span className="font-semibold text-gray-800">
                                ₹
                                {Number(item.price || 0).toLocaleString(
                                  "en-IN",
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <span className="font-bold text-gray-900">
                                ₹
                                {(
                                  Number(item.price || 0) *
                                  Number(item.quantity || 0)
                                ).toLocaleString("en-IN")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

            {/* SEO ------------------------------------------------------- */}

            {product.seo &&
              Object.keys(product.seo).some(
                (key) => product.seo[key],
              ) && (
                <section className={sectionClass}>
                  <div className={sectionHeaderClass}>
                    <div>
                      <p className={sectionEyebrowClass}>
                        Search visibility
                      </p>

                      <h2 className={sectionTitleClass}>
                        SEO Metadata
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 bg-gray-50/50 p-3 sm:p-4 md:grid-cols-2">
                    <Row
                      label="Meta Title"
                      value={product.seo.metaTitle}
                    />

                    <Row
                      label="Meta Description"
                      value={product.seo.metaDescription}
                    />

                    <Row
                      label="Canonical URL"
                      value={product.seo.canonicalUrl}
                    />

                    <Row
                      label="OG Title"
                      value={product.seo.ogTitle}
                    />
                  </div>

                  {product.seo.keywords?.length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-5">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        Keywords
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {product.seo.keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-full border border-[var(--admin-gold)]/25 bg-[var(--admin-gold)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--admin-blue)]"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

            {/* Tags ------------------------------------------------------ */}

            {product.tags?.length > 0 && (
              <section className={sectionClass}>
                <div className={sectionHeaderClass}>
                  <div>
                    <p className={sectionEyebrowClass}>
                      Product organization
                    </p>

                    <h2 className={sectionTitleClass}>
                      Tags
                    </h2>
                  </div>

                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                    {product.tags.length} tags
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 bg-gray-50/50 p-4 sm:p-5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--admin-gold)]/25 bg-[var(--admin-gold)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--admin-blue)] transition-colors hover:border-[var(--admin-gold)]/50 hover:bg-[var(--admin-gold)]/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modals                                                             */}
      {/* ------------------------------------------------------------------ */}

      <ProductReviewModal
        isOpen={reviewOpen}
        product={product}
        revision={pendingRevision}
        onClose={() => setReviewOpen(false)}
        onSubmit={handleReviewSubmit}
      />

      <ConfirmModal
        open={duplicateConfirm}
        onClose={() => setDuplicateConfirm(false)}
        title="Duplicate product?"
        message={`This will create a draft copy of "${
          product?.title || "this product"
        }". You will be taken to the edit form to review it.`}
        variant="info"
        confirmLabel="Duplicate"
        loading={actionLoading}
        onConfirm={handleDuplicateSubmit}
      />
    </div>
  );
};

export default ProductAdminDetails;