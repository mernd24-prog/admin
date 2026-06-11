import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import Loader from "../../../../components/Loader/Loader";
import {
  getProductById,
  approveDisapprove,
  archiveProduct,
  duplicateProduct,
  getProductRevisions,
  reviewProductRevision,
} from "../../../../Redux/productSlice";
import ProductStatusBadge from "../../../../components/Product/ProductStatusBadge";
import ProductReviewModal from "../../../../components/Product/ProductReviewModal";
import ConfirmModal from "../../../../components/Shared/ConfirmModal";
import PermissionGuard from "../../../../components/Atoms/PermissionGuard/PermissionGuard";
import { getProductImages } from "../../../../_helpers/productMedia";

const formatDisplayValue = (value) => {
  if (React.isValidElement(value)) return value;
  if (value === 0) return "0";
  if (value === undefined || value === null || value === "") return "N/A";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "N/A";
  if (typeof value === "object") {
    return value.name || value.title || value.label || value.email || value._id || JSON.stringify(value);
  }
  return String(value);
};

const Row = ({ label, value }) => (
  <div className="border-b border-gray-100 py-3">
    <p className="text-xs uppercase text-gray-400">{label}</p>
    <p className="text-sm text-gray-900 break-words">{formatDisplayValue(value)}</p>
  </div>
);

const CHECKLIST_LABELS = {
  titleVerified: "Title & Description",
  categoryVerified: "Category",
  complianceVerified: "Compliance",
  mediaVerified: "Media / Images",
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
  const data = sliceData?.data?.data || sliceData?.normalized?.data || sliceData?.data || {};
  if (Array.isArray(data)) return { list: data, total: data.length };
  return data;
};

const formatRevisionValue = (value) => {
  if (value === undefined || value === null || value === "") return "N/A";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

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
  const statusHistory = Array.isArray(product.statusHistory)
    ? [...product.statusHistory].reverse()
    : [];
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);

  const REVIEWABLE_STATUSES = new Set(['pending_approval']);
  const needsReview =
    REVIEWABLE_STATUSES.has(product?.status) ||
    product?.revisionStatus === 'change_pending' ||
    Boolean(product?.pendingRevisionId) ||
    Boolean(product?.pendingRevision);

  const attributes =
    product.attributes instanceof Map
      ? Object.fromEntries(product.attributes)
      : product.attributes || {};
  const productImages = getProductImages(product);

  useEffect(() => {
    if (id) {
      dispatch(getProductById({ _id: id }));
      dispatch(getProductRevisions({ productId: id, page: 1, size: 20 }));
    }
  }, [dispatch, id]);

  const handleReviewSubmit = async (decision, rejectionReason, checklist, notes) => {
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

  const handleArchiveSubmit = async () => {
    setActionLoading(true);
    try {
      const res = await dispatch(
        archiveProduct({ _id: id, reason: "admin_archived" }),
      ).unwrap();
      toast.success(res?.message || "Product archived successfully.");
      dispatch(getProductById({ _id: id }));
    } catch (err) {
      toast.error(err?.message || "Failed to archive product.");
    } finally {
      setActionLoading(false);
      setArchiveConfirm(false);
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
    <div className="max-w-7xl mx-auto p-6">
      <Loader loading={selector.loading || reviewLoading || actionLoading} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-gray-500">
          <Link
            to="/app/product-catalog"
            className="hover:underline text-[var(--admin-blue)]"
          >
            Product Catalog
          </Link>
          {" / "}
          <b className="text-gray-800">Product Details</b>
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
              className="px-4 py-2 text-sm rounded-md bg-[var(--admin-blue)] text-white hover:bg-[#2e3074]"
            >
              {pendingRevision ? "Review Revision" : "Review Product"}
            </button>
          )}
          <PermissionGuard module="products" action="create" hide>
            <button
              onClick={() => setDuplicateConfirm(true)}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Duplicate
            </button>
          </PermissionGuard>
          {product.status !== "archived" && (
            <PermissionGuard module="products" action="delete" hide>
              <button
                onClick={() => setArchiveConfirm(true)}
                className="px-4 py-2 text-sm rounded-md bg-orange-500 text-white hover:bg-orange-600"
              >
                Archive
              </button>
            </PermissionGuard>
          )}
          {product.status === "archived" && (
            <PermissionGuard module="products" action="restore" hide>
              <Link
                to={`/app/product-catalog`}
                onClick={(e) => {
                  e.preventDefault();
                  // restore via list page restore flow
                  navigate("/app/product-catalog?status=archived");
                }}
                className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                Restore
              </Link>
            </PermissionGuard>
          )}
          <Link
            to={`/app/product-catalog/form/${id}`}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Edit
          </Link>
        </div>
      </div>

      {product.status === "rejected" && product.rejectionReason && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">
            Rejection Reason
          </p>
          <p className="text-sm text-red-600">{product.rejectionReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Row label="Title" value={product.title} />
            <Row label="Seller" value={refToLabel(product.sellerId)} />
            <Row
              label="Category"
              value={
                refToLabel(product.categoryName) ||
                refToLabel(product.category) ||
                refToLabel(product.categoryId)
              }
            />
            <Row label="Brand" value={refToLabel(product.brand)} />
            <Row label="SKU" value={product.sku} />
            <Row label="Color" value={product.color} />
            <Row
              label="Price"
              value={product.price !== undefined ? `₹${product.price}` : null}
            />
            <Row
              label="MRP"
              value={product.mrp !== undefined ? `₹${product.mrp}` : null}
            />
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
            <Row label="Revision Status" value={product.revisionStatus} />
            <Row label="Version" value={product.version} />
            <Row label="Stock" value={product.stock} />
            <Row
              label="Created At"
              value={
                product.createdAt
                  ? new Date(product.createdAt).toLocaleString()
                  : null
              }
            />
            <Row
              label="Approved At"
              value={
                product.approvedAt
                  ? new Date(product.approvedAt).toLocaleString()
                  : null
              }
            />
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5">
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
        </section>

        {product.complianceSnapshot && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
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
        )}

        {pendingRevision && (
          <section className="bg-white border border-blue-200 rounded-lg p-5 lg:col-span-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  Pending Revision
                </h2>
                <p className="text-xs text-gray-500">
                  Base version {pendingRevision.baseVersion || "N/A"} submitted{" "}
                  {pendingRevision.submittedAt
                    ? new Date(pendingRevision.submittedAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              {needsReview && (
                <button
                  onClick={() => setReviewOpen(true)}
                  className="px-4 py-2 text-sm rounded-md bg-[var(--admin-blue)] text-white hover:bg-[#2e3074]"
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
        )}

        {product.moderation && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Moderation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mb-3">
              <Row label="Reviewed By" value={product.moderation?.reviewedBy} />
              <Row
                label="Reviewed At"
                value={
                  product.moderation?.reviewedAt
                    ? new Date(product.moderation.reviewedAt).toLocaleString()
                    : null
                }
              />
              <Row
                label="Submitted At"
                value={
                  product.moderation?.submittedAt
                    ? new Date(product.moderation.submittedAt).toLocaleString()
                    : null
                }
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
        )}

        {statusHistory.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Status History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {["From", "To", "Revision", "Reason", "Fields", "Actor", "Date"].map((heading) => (
                      <th key={heading} className="p-3 text-left text-xs font-medium text-gray-600">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statusHistory.map((entry, index) => (
                    <tr key={entry._id || index} className="border-b hover:bg-gray-50">
                      <td className="p-3">{entry.fromStatus || "N/A"}</td>
                      <td className="p-3">{entry.toStatus || "N/A"}</td>
                      <td className="p-3">
                        {[entry.fromRevisionStatus, entry.toRevisionStatus]
                          .filter(Boolean)
                          .join(" -> ") || "N/A"}
                      </td>
                      <td className="p-3 max-w-xs break-words">{entry.reason || "N/A"}</td>
                      <td className="p-3">
                        {Array.isArray(entry.changedFields) && entry.changedFields.length
                          ? entry.changedFields.join(", ")
                          : "N/A"}
                      </td>
                      <td className="p-3">{entry.actorRole || entry.actor || entry.actorId || "N/A"}</td>
                      <td className="p-3">
                        {entry.createdAt || entry.at
                          ? new Date(entry.createdAt || entry.at).toLocaleString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {Object.keys(attributes).length > 0 && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Attributes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
              {Object.entries(attributes).map(([key, value]) => (
                <Row
                  key={key}
                  label={key}
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
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Variants ({product.variants.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-600">
                      SKU
                    </th>
                    <th className="text-left p-3 font-medium text-gray-600">
                      Price
                    </th>
                    <th className="text-left p-3 font-medium text-gray-600">
                      MRP
                    </th>
                    <th className="text-left p-3 font-medium text-gray-600">
                      Stock
                    </th>
                    <th className="text-left p-3 font-medium text-gray-600">
                      Attributes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant, i) => (
                    <tr
                      key={variant.sku || i}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3">{variant.sku || "N/A"}</td>
                      <td className="p-3">
                        {variant.price !== undefined
                          ? `₹${variant.price}`
                          : "N/A"}
                      </td>
                      <td className="p-3">
                        {variant.mrp !== undefined ? `₹${variant.mrp}` : "N/A"}
                      </td>
                      <td className="p-3">{variant.stock ?? "N/A"}</td>
                      <td className="p-3 text-gray-500">
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

        {(product.dimensions || product.origin || product.warranty) && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Shipping & Compliance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
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
                      ? `Eligible — ${product.warranty.returnPolicy.days || 7} days`
                      : "Not eligible"
                  }
                />
              )}
            </div>
          </section>
        )}

        {/* Digital product details */}
        {product.productType === "digital" && product.digital && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Digital Product Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
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
              {product.digital.fileUrl && (
                <div className="border-b border-gray-100 py-3 md:col-span-3">
                  <p className="text-xs uppercase text-gray-400">
                    Download URL
                  </p>
                  <a
                    href={product.digital.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[var(--admin-blue)] hover:underline break-all"
                  >
                    {product.digital.fileUrl}
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Subscription details */}
        {product.productType === "subscription" && product.subscription && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Subscription Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
              <Row
                label="Billing Cycle"
                value={product.subscription.billingCycle}
              />
              <Row
                label="Recurring Price"
                value={
                  product.subscription.recurringPrice !== undefined
                    ? `₹${product.subscription.recurringPrice}`
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
                    ? `₹${product.subscription.setupFee}`
                    : "Free"
                }
              />
              <Row
                label="Grace Period"
                value={
                  product.subscription.gracePeriodDays
                    ? `${product.subscription.gracePeriodDays} days`
                    : null
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
              <div className="mt-3">
                <p className="text-xs uppercase text-gray-400 mb-2">
                  Plan Features
                </p>
                <ul className="space-y-1">
                  {product.subscription.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-green-500 flex-shrink-0"
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
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Bundle items */}
        {product.productType === "bundle" &&
          product.bundleItems?.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800">
                  Bundle Items ({product.bundleItems.length})
                </h2>
                {product.bundleDiscount > 0 && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    {product.bundleDiscount}% bundle discount
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-600 text-xs">
                        Product
                      </th>
                      <th className="text-left p-3 font-medium text-gray-600 text-xs">
                        SKU
                      </th>
                      <th className="text-right p-3 font-medium text-gray-600 text-xs">
                        Qty
                      </th>
                      <th className="text-right p-3 font-medium text-gray-600 text-xs">
                        Unit Price
                      </th>
                      <th className="text-right p-3 font-medium text-gray-600 text-xs">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.bundleItems.map((item, i) => (
                      <tr
                        key={item.productId || i}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {item.image && (
                              <img
                                src={item.image}
                                alt=""
                                className="w-8 h-8 object-cover rounded border border-gray-200 flex-shrink-0"
                              />
                            )}
                            <span className="text-gray-800">
                              {item.title || item.productId}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-500 font-mono text-xs">
                          {item.sku || "—"}
                        </td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">
                          ₹{Number(item.price || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-right font-medium">
                          ₹
                          {(item.price * item.quantity).toLocaleString("en-IN")}
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
            <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                SEO Metadata
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <Row label="Meta Title" value={product.seo.metaTitle} />
                <Row
                  label="Meta Description"
                  value={product.seo.metaDescription}
                />
                <Row label="Canonical URL" value={product.seo.canonicalUrl} />
                <Row label="OG Title" value={product.seo.ogTitle} />
              </div>
              {product.seo.keywords?.length > 0 && (
                <div className="border-b border-gray-100 py-3">
                  <p className="text-xs uppercase text-gray-400 mb-2">
                    Keywords
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.seo.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2.5 py-0.5 bg-[var(--admin-blue)]/10 text-[var(--admin-blue)] text-xs rounded-full"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

        {/* Analytics */}
        {product.analytics && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Analytics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                  value: (product.analytics.wishlists || 0).toLocaleString(
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
                  className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg"
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

        {/* Tags */}
        {product.tags?.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex px-2.5 py-0.5 bg-[var(--admin-blue)] text-white text-xs rounded-full"
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
        open={archiveConfirm}
        onClose={() => setArchiveConfirm(false)}
        title="Archive product?"
        message={`This will archive "${product?.title || "this product"}" and remove it from the active catalog. You can restore it later.`}
        variant="danger"
        confirmLabel="Archive"
        loading={actionLoading}
        onConfirm={handleArchiveSubmit}
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
