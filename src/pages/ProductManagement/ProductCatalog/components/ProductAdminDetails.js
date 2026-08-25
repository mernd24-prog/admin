import React, { useState, useEffect } from "react";
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
// import PermissionGuard from "../../../../components/Atoms/PermissionGuard/PermissionGuard";
import {
  getProductImages,
  normalizeImageList,
} from "../../../../_helpers/productMedia";
import ImageGallery from "../../../../components/Atoms/ImageGallery/ImageGallery";
import {
  formatDateTime12Hour,
  formatLabel,
} from "../../../../utils/formatters";
import { getStoredRole, normalizeRole } from "../../../../_helpers/authStorage";

const formatDisplayValue = (value) => {
  if (React.isValidElement(value)) return value;
  if (value === 0) return "0";
  if (value === undefined || value === null || value === "") return "N/A";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "N/A";
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
  <div className="group rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-[var(--admin-gold)]/20 hover:bg-[var(--admin-surface-soft)]">
    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400">
      {label}
    </p>
    <p className="break-words text-sm font-medium text-gray-800">
      {formatLabel(formatDisplayValue(value))}
    </p>
  </div>
);

const getShippingPincodeSummary = (shipping = {}) => {
  const mode = shipping?.serviceabilityMode || "inherit";
  const allowed =
    shipping?.allowPincodes || shipping?.serviceablePincodes || [];
  if (mode === "disabled") return "Delivery disabled for this product";
  if (mode === "allowlist") {
    return allowed.length
      ? `Only allowed pincodes: ${allowed.join(", ")}`
      : "Allowlist selected, but no pincodes added";
  }
  if (mode === "all_pincodes") return "Deliverable to all pincodes";
  return "Inherits seller or shipping profile pincode rules";
};

// const CHECKLIST_LABELS = {
//   titleVerified: "Title & Description",
//   categoryVerified: "Category",
//   complianceVerified: "Compliance",
//   mediaVerified: "Media / Images",
// };

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
  if (Array.isArray(data)) return { list: data, total: data.length };
  return data;
};

// const formatRevisionValue = (value) => {
//   if (value === undefined || value === null || value === "") return "N/A";
//   if (typeof value === "object") return JSON.stringify(value, null, 2);
//   return String(value);
// };

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasVariants = (product = {}) =>
  Array.isArray(product?.variants) && product.variants.length > 0;

const getDefaultVariant = (product = {}) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  return (
    variants.find((variant) => variant?.isDefault === true) ||
    variants.find((variant) => variant?.status !== "inactive") ||
    variants[0] ||
    null
  );
};

// const getEffectivePrice = (product = {}) => {
//   const defaultVariant = getDefaultVariant(product);
//   return hasVariants(product)
//     ? toNumberOrNull(defaultVariant?.price ?? defaultVariant?.salePrice)
//     : toNumberOrNull(product?.price ?? product?.salePrice);
// };

// const getEffectiveMrp = (product = {}) => {
//   const defaultVariant = getDefaultVariant(product);
//   return hasVariants(product)
//     ? toNumberOrNull(defaultVariant?.mrp ?? defaultVariant?.price)
//     : toNumberOrNull(product?.mrp ?? product?.price);
// };

// const getEffectiveStock = (product = {}) => {
//   const defaultVariant = getDefaultVariant(product);
//   return hasVariants(product)
//     ? toNumberOrNull(defaultVariant?.stock)
//     : toNumberOrNull(product?.stock);
// };

// const formatMoney = (value) => {
//   const amount = toNumberOrNull(value);
//   return amount === null ? null : `₹${amount.toLocaleString("en-IN")}`;
// };

const ProductAdminDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
  // const statusHistory = Array.isArray(product.statusHistory)
  //   ? [...product.statusHistory].reverse()
  //   : [];
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);
  const currentRole = normalizeRole(getStoredRole());
  const isSellerRole = ["seller", "seller-admin", "seller-sub-admin"].includes(
    currentRole,
  );

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
  // const productImages = getProductImages(product);

  const getVariantImage = (variant = {}) => {
    const imgs = normalizeImageList(
      variant?.images,
      variant?.image,
      variant?.imageUrls,
      variant?.thumbnail,
      variant?.media?.images,
    );
    return imgs[0] || "";
  };

  const [variantGalleryOpen, setVariantGalleryOpen] = useState(false);
  const [variantGalleryImages, setVariantGalleryImages] = useState([]);

  const getVariantImagesList = (variant = {}) =>
    normalizeImageList(
      variant?.images,
      variant?.image,
      variant?.imageUrls,
      variant?.thumbnail,
      variant?.media?.images,
    );
  // const effectivePrice = getEffectivePrice(product);
  // const effectiveMrp = getEffectiveMrp(product);
  // const effectiveStock = getEffectiveStock(product);
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

  useEffect(() => {
    if (id) {
      dispatch(getProductById({ _id: id }));
      dispatch(getProductRevisions({ productId: id, page: 1, size: 20 }));
    }
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
        `${pendingRevision ? "Product revision" : "Product"} ${labels[decision] || "updated"} successfully.`,
      );
      dispatch(getProductById({ _id: id }));
      dispatch(getProductRevisions({ productId: id, page: 1, size: 20 }));
    } catch (err) {
      throw new Error(err?.message || "Failed to update product");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDuplicateSubmit = async () => {
    setActionLoading(true);
    try {
      const res = await dispatch(duplicateProduct({ _id: id })).unwrap();
      const newId = res?.data?.data?._id || res?.data?._id;
      toast.success(res?.message || "Product duplicated successfully.");
      setDuplicateConfirm(false);
      if (newId) navigate(`/app/product-catalog/form/${newId}`);
    } catch (err) {
      toast.error(err?.message || "Failed to duplicate product.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <Loader loading={selector.loading || reviewLoading || actionLoading} />
      <div className="mb-6 flex flex-col gap-4 px-1 py-2 sm:px-0 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-sm text-gray-500">
          <Link
            to="/app/product-catalog"
            className="font-medium text-[var(--admin-blue)] transition-colors hover:text-[var(--admin-gold)] hover:underline"
          >
            Product Catalog
          </Link>
          <span className="mx-2 text-black">/</span>
          <b className="font-semibold text-gray-900">Product Details</b>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {product.status && (
            <ProductStatusBadge
              status={product.status}
              revisionStatus={product.revisionStatus}
            />
          )}
          {needsReview && (
            <button
              onClick={() => setReviewOpen(true)}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--admin-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2e3074] hover:shadow-md"
            >
              {pendingRevision ? "Review Revision" : "Review Product"}
            </button>
          )}
          {/* <PermissionGuard module="products" action="create" hide>
            <button
              onClick={() => setDuplicateConfirm(true)}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Duplicate
            </button>
          </PermissionGuard> */}
          <Link
            to={`/app/product-catalog/form/${id}`}
            className="flex items-center gap-2 rounded-lg bg-[var(--admin-gold)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--admin-gold-dark)] hover:shadow-md"
          >
            Edit
          </Link>
        </div>
      </div>

      {product.status === "rejected" && product.rejectionReason && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 border-l-4 border-red-500 bg-red-50 px-4 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-red-700">
                Product rejected
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-red-600">
                {product.rejectionReason}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
          <div className="flex flex-col gap-2 border-b border-gray-100 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white px-5 pt-4 pb-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                Product information
              </p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">Overview</h2>
            </div>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
              General details
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-3">
            <Row label="Title" value={product.title} />
            <Row label="Seller" value={refToLabel(sellerDisplayName)} />
            <Row
              label="Seller Email"
              value={product.sellerEmail || product.seller?.email}
            />
            <Row label="Seller ID" value={refToLabel(product.sellerId)} />
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
            <Row label="Brand" value={refToLabel(product.brand)} />
            {/* <Row label="SKU" value={product.sku} /> */}
            {/* <Row
              label="Price"
              value={formatMoney(effectivePrice)}
            />
            <Row
              label="MRP"
              value={formatMoney(effectiveMrp)}
            /> */}
            <Row
              label="GST Rate"
              value={
                product.gstRate !== undefined ? `${product.gstRate}%` : null
              }
            />
            <Row
              label="GST Mode"
              value={product.gstInclusive === false ? "Excluded" : "Included"}
            />
            <Row label="HSN Code" value={product.hsnCode} />
            {/* <Row label="Revision Status" value={product.revisionStatus} /> */}
            {/* <Row label="Version" value={product.version} /> */}
            {/* <Row label="Stock" value={effectiveStock} /> */}
            <Row
              label="Deal Product"
              value={
                product.metadata?.isDealProduct
                  ? `${product.metadata?.dealBadge || "Deal"} (${product.metadata?.dealSource || "admin_direct"})`
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

        {/* Analytics */}
        {product.analytics && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
            <div className="border-b border-gray-100 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white px-5 pt-4 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                Performance
              </p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">
                Analytics
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-8">
              {[
                {
                  label: "Total Views",
                  value: (product.analytics.views || 0).toLocaleString("en-IN"),
                },
                {
                  label: "Purchases",
                  value: (product.analytics.purchases || 0).toLocaleString(
                    "en-IN",
                  ),
                },
                {
                  label: "Revenue",
                  value: `₹${(product.analytics.revenue || 0).toLocaleString("en-IN")}`,
                },
                {
                  label: "Wishlists",
                  value: (product.analytics.wishlistAdds || 0).toLocaleString(
                    "en-IN",
                  ),
                },
                {
                  label: "Cart Adds",
                  value: (product.analytics.cartAdds || 0).toLocaleString(
                    "en-IN",
                  ),
                },
                {
                  label: "Returns",
                  value: (product.analytics.returns || 0).toLocaleString(
                    "en-IN",
                  ),
                },
                {
                  label: "Avg Rating",
                  value: product.rating
                    ? `${Number(product.rating).toFixed(1)} ★`
                    : "No ratings",
                },
                {
                  label: "Reviews",
                  value: (product.reviewCount || 0).toLocaleString("en-IN"),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                >
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-base font-bold text-gray-800 mt-0.5">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Images</h2>
          <div className="grid grid-cols-2 gap-2">
            {productImages.map((image) => (
              <img
                key={image}
                src={image}
                alt={product.title || "Product"}
                className="w-full aspect-square object-cover border rounded"
                loading="lazy"
              />
            ))}
            {!productImages.length && (
              <p className="text-sm text-gray-400 col-span-2">No images</p>
            )}
          </div>
        </section> */}

        {/* {product.complianceSnapshot && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Compliance Snapshot
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6">
              <Row label="HSN Code" value={product.complianceSnapshot.hsnCode} />
              <Row
                label="GST Rate"
                value={
                  product.complianceSnapshot.gstRate !== undefined
                    ? `${product.complianceSnapshot.gstRate}%`
                    : null
                }
              />
              <Row label="Tax Type" value={product.complianceSnapshot.taxType} />
              <Row label="Source" value={product.complianceSnapshot.source} />
            </div>
          </section>
        )} */}

        {/* {pendingRevision && (
          <section className="bg-white border border-blue-200 rounded-lg p-5 lg:col-span-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  Pending Revision
                </h2>
                <p className="text-xs text-gray-500">
                  Base version {pendingRevision.baseVersion || "N/A"} submitted{" "}
                  {formatDateTime12Hour(pendingRevision.submittedAt, "N/A")}
                </p>
              </div>
              {needsReview && (
                <button
                  onClick={() => setReviewOpen(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--admin-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2e3074] hover:shadow-md"
                >
                  Review Revision
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(pendingRevision.changedFields?.length
                ? pendingRevision.changedFields
                : Object.keys(pendingRevision.draftChanges || {})
              ).map((field) => (
                <div key={field} className="rounded-md border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    {field}
                  </p>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase text-gray-400">Current</p>
                      <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-700">
                        {formatRevisionValue(product?.[field])}
                      </pre>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-gray-400">Proposed</p>
                      <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap rounded bg-green-50 p-2 text-xs text-green-800">
                        {formatRevisionValue(pendingRevision.draftChanges?.[field])}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )} */}

        {/* {product.moderation && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Moderation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mb-3">
              <Row label="Reviewed By" value={product.moderation?.reviewedBy} />
              <Row
                label="Reviewed At"
                value={formatDateTime12Hour(product.moderation?.reviewedAt)}
              />
              <Row
                label="Submitted At"
                value={formatDateTime12Hour(product.moderation?.submittedAt)}
              />
              {product.moderation?.rejectionReason && (
                <Row
                  label="Rejection Reason"
                  value={product.moderation.rejectionReason}
                />
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-2">Checklist</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
                  const done = product.moderation?.checklist?.[key] === true;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border ${done ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500" : "bg-gray-300"}`}
                      >
                        {done && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-xs ${done ? "text-green-700" : "text-gray-500"}`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )} */}

        {/* {statusHistory.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Status History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-[var(--admin-surface-soft)]">
                    {["From", "To", "Revision", "Reason", "Fields", "Actor", "Date"].map((heading) => (
                      <th key={heading} className="p-3 text-left text-xs font-medium text-gray-600">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statusHistory.map((entry, index) => (
                    <tr key={entry._id || index} className="border-b border-gray-100 transition-colors hover:bg-[var(--admin-surface-soft)]">
                      <td className="p-3">{formatLabel(entry.fromStatus, "N/A") }</td>
                      <td className="p-3">{formatLabel(entry.toStatus, "N/A") }</td>
                      <td className="p-3">
                        {[entry.fromRevisionStatus, entry.toRevisionStatus]
                          .filter(Boolean)
                          .join(" -> ") || "N/A"}
                      </td>
                      <td className="p-3 max-w-xs break-words">{formatLabel(entry.reason , "N/A")}</td>
                      <td className="p-3">
                        {Array.isArray(entry.changedFields) && entry.changedFields.length
                          ? entry.changedFields.join(", ")
                          : "N/A"}
                      </td>
                      <td className="p-3">{formatLabel(entry.actorRole) || formatLabel(entry.actor) || formatLabel(entry.actorId , "N/A")}</td>
                      <td className="p-3">
                        {formatDateTime12Hour(
                          entry.createdAt || entry.at,
                          "N/A",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )} */}

        {Object.keys(attributes).length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
            <div className="border-b border-gray-100 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white px-5 pt-4 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                Product specifications
              </p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">
                Attributes
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-1 p-3 sm:p-4 md:grid-cols-3">
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

        {product.variants?.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
            <div className="border-b border-gray-100 px-5 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white pt-4 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                Product variants
              </p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">
                Variants ({product.variants.length})
              </h2>
            </div>

            <div className="overflow-x-auto p-3 sm:p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-[var(--admin-surface-soft)]">
                    <th className="whitespace-nowrap p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Image
                    </th>
                    <th className="whitespace-nowrap p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      SKU
                    </th>
                    <th className="whitespace-nowrap p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Price
                    </th>
                    <th className="whitespace-nowrap p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      MRP
                    </th>
                    <th className="whitespace-nowrap p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Stock
                    </th>
                    <th className="whitespace-nowrap p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Attributes
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {product.variants.map((variant, i) => (
                    <tr
                      key={variant.sku || i}
                      className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-[var(--admin-surface-soft)]"
                    >
                      <td className="p-3 align-middle">
                        <div className="flex items-center gap-3">
                          {getVariantImage(variant) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setVariantGalleryImages(
                                  getVariantImagesList(variant),
                                );
                                setVariantGalleryOpen(true);
                              }}
                              className="group relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200 bg-white"
                              title="View variant images"
                            >
                              <img
                                src={getVariantImage(variant)}
                                alt={variant.sku || variant.title || "Variant"}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                            </button>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
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
                            className="text-xs font-semibold text-[var(--admin-blue)] transition-colors hover:text-[var(--admin-gold)] hover:underline"
                          >
                            View
                          </button>
                        </div>
                      </td>

                      <td className="p-3 align-middle">
                        <span className="font-mono text-xs font-medium text-gray-700">
                          {variant.sku || "N/A"}
                        </span>
                      </td>

                      <td className="p-3 align-middle">
                        <span className="font-semibold text-gray-900">
                          {variant.price !== undefined
                            ? `₹${Number(variant.price).toLocaleString("en-IN")}`
                            : "N/A"}
                        </span>
                      </td>

                      <td className="p-3 align-middle">
                        <span className="text-gray-600">
                          {variant.mrp !== undefined
                            ? `₹${Number(variant.mrp).toLocaleString("en-IN")}`
                            : "N/A"}
                        </span>
                      </td>

                      <td className="p-3 align-middle">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${Number(variant.stock) > 0
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-600"
                            }`}
                        >
                          {variant.stock ?? "N/A"}
                        </span>
                      </td>

                      <td className="max-w-md p-3 align-middle text-xs leading-5 text-gray-500">
                        {variant.attributes
                          ? Object.entries(
                            variant.attributes instanceof Map
                              ? Object.fromEntries(variant.attributes)
                              : variant.attributes,
                          )
                            .map(([k, v]) => `${k}: ${v}`)
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
        <ImageGallery
          images={variantGalleryImages}
          isOpen={variantGalleryOpen}
          onClose={() => setVariantGalleryOpen(false)}
        />

        {(product.dimensions ||
          product.origin ||
          product.warranty ||
          product.shipping) && (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
              <div className="border-b border-gray-100 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white px-5 pt-4 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                  Operations
                </p>
                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  Shipping & Compliance
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-1 p-3 sm:p-4 md:grid-cols-3">
                {product.shipping && (
                  <>
                    <Row
                      label="Delivery pincode rule"
                      value={getShippingPincodeSummary(product.shipping)}
                    />
                    <Row
                      label="Shipping charge"
                      value={
                        product.shipping.freeShipping
                          ? "Free shipping"
                          : (product.shipping.shippingCharge ??
                            product.shipping.additionalCost)
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
                      label="Dimensions (L×W×H)"
                      value={
                        [
                          product.dimensions.length,
                          product.dimensions.width,
                          product.dimensions.height,
                        ]
                          .filter(Boolean)
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
                          ? `${product.dimensions.weight} ${product.dimensions.weightUnit || "kg"}`
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
                    value={`${product.warranty.period} ${product.warranty.periodUnit || "months"} (${product.warranty.type || "manufacturer"})`}
                  />
                )}
                {product.warranty?.returnPolicy?.eligible !== undefined && (
                  <Row
                    label="Return Policy"
                    value={
                      product.warranty.returnPolicy.eligible
                        ? `Eligible — ${product.warranty.returnPolicy.days ?? product.warranty.returnPolicy.returnWindowDays ?? 0} days`
                        : "Not eligible"
                    }
                  />
                )}
              </div>
            </section>
          )}

        {/* Digital product details */}
        {product.productType === "digital" && product.digital && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
            <div className="border-b border-gray-100 px-5 pt-4 pb-1 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                Digital information
              </p>

              <h2 className="mt-1 text-lg font-bold text-gray-900">
                Digital Product Details
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-1 p-3 sm:p-4 md:grid-cols-3">
              <Row label="File Type" value={product.digital.fileType} />

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

              <Row label="License Type" value={product.digital.licenseType} />

              <Row label="Version" value={product.digital.version} />

              <Row label="Platform" value={product.digital.platform} />

              <Row
                label="Requires Auth"
                value={product.digital.requiresAuth ? "Yes" : "No"}
              />
            </div>

            {product.digital.fileUrl && (
              <div className="border-t border-gray-100 px-5 py-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Download URL
                </p>

                <a
                  href={product.digital.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm font-medium text-[var(--admin-blue)] transition-colors hover:text-[var(--admin-gold)] hover:underline"
                >
                  {product.digital.fileUrl}
                </a>
              </div>
            )}
          </section>
        )}

        {/* Subscription details */}
        {product.productType === "subscription" && product.subscription && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
            <div className="border-b border-gray-100 px-5 pt-4 pb-1 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                Subscription information
              </p>

              <h2 className="mt-1 text-lg font-bold text-gray-900">
                Subscription Details
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-1 p-3 sm:p-4 md:grid-cols-3">
              <Row
                label="Billing Cycle"
                value={product.subscription.billingCycle}
              />

              <Row
                label="Recurring Price"
                value={
                  product.subscription.recurringPrice !== undefined
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
                    ? `₹${Number(product.subscription.setupFee).toLocaleString(
                      "en-IN",
                    )}`
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
                value={product.subscription.autoRenew ? "Enabled" : "Disabled"}
              />

              <Row
                label="Pause Allowed"
                value={product.subscription.pauseAllowed ? "Yes" : "No"}
              />
            </div>

            {product.subscription.features?.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Plan Features
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {product.subscription.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 bg-[var(--admin-surface-soft)] px-3 py-2.5 text-sm text-gray-700"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <svg
                          className="h-3 w-3 text-green-600"
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

                      <span className="break-words">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Bundle items */}
        {product.productType === "bundle" &&
          product.bundleItems?.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
              <div className="border-b border-gray-100 px-5 pt-4 pb-1 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                      Bundle information
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-gray-900">
                      Bundle Items ({product.bundleItems.length})
                    </h2>
                  </div>

                  {product.bundleDiscount > 0 && (
                    <span className="inline-flex w-fit items-center rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                      {product.bundleDiscount}% bundle discount
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto p-3 sm:p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-[var(--admin-surface-soft)]">
                      <th className="whitespace-nowrap p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Product
                      </th>

                      <th className="whitespace-nowrap p-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        SKU
                      </th>

                      <th className="whitespace-nowrap p-3 text-right text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Qty
                      </th>

                      <th className="whitespace-nowrap p-3 text-right text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Unit Price
                      </th>

                      <th className="whitespace-nowrap p-3 text-right text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Subtotal
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {product.bundleItems.map((item, i) => (
                      <tr
                        key={item.productId || i}
                        className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-[var(--admin-surface-soft)]"
                      >
                        <td className="p-3 align-middle">
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title || "Bundle product"}
                                className="h-10 w-10 flex-shrink-0 rounded-lg border border-gray-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
                                —
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-800">
                                {item.title || item.productId}
                              </p>

                              {item.productId && (
                                <p className="mt-0.5 truncate text-[11px] text-gray-400">
                                  ID: {item.productId}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3 align-middle">
                          <span className="font-mono text-xs font-medium text-gray-600">
                            {item.sku || "—"}
                          </span>
                        </td>

                        <td className="p-3 text-right align-middle">
                          <span className="inline-flex min-w-8 justify-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            {item.quantity}
                          </span>
                        </td>

                        <td className="p-3 text-right align-middle">
                          <span className="font-medium text-gray-800">
                            ₹{Number(item.price || 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        <td className="p-3 text-right align-middle">
                          <span className="font-semibold text-gray-900">
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

        {/* SEO data */}
        {product.seo &&
          Object.keys(product.seo).some((k) => product.seo[k]) && (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
              <div
                className="border-b border-gray-100 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white px-5 pt-4
pb-1"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                  Search visibility
                </p>

                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  SEO Metadata
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-1 p-3 sm:p-4 md:grid-cols-2">
                <Row label="Meta Title" value={product.seo.metaTitle} />

                <Row
                  label="Meta Description"
                  value={product.seo.metaDescription}
                />

                <Row label="Canonical URL" value={product.seo.canonicalUrl} />

                <Row label="OG Title" value={product.seo.ogTitle} />
              </div>

              {product.seo.keywords?.length > 0 && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                    Keywords
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {product.seo.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center rounded-full border border-[var(--admin-gold)]/25 bg-[var(--admin-gold)]/10 px-3 py-1 text-xs font-medium text-[var(--admin-blue)]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

        {/* Tags */}
        {product.tags?.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
            <div className="border-b border-gray-100 px-5 pt-4 pb-1 bg-gradient-to-r from-[var(--admin-surface-soft)] to-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-gold)]">
                Product organization
              </p>

              <h2 className="mt-1 text-lg font-bold text-gray-900">Tags</h2>
            </div>

            <div className="flex flex-wrap gap-2 p-4 sm:p-5">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-[var(--admin-gold)]/25 bg-[var(--admin-gold)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--admin-blue)] transition-colors hover:border-[var(--admin-gold)]/50 hover:bg-[var(--admin-gold)]/15"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

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
        message={`This will create a draft copy of "${product?.title || "this product"}". You will be taken to the edit form to review it.`}
        variant="info"
        confirmLabel="Duplicate"
        loading={actionLoading}
        onConfirm={handleDuplicateSubmit}
      />
    </div>
  );
};

export default ProductAdminDetails;
