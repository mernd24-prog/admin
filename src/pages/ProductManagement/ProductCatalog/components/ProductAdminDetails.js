import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import Loader from '../../../../components/Loader/Loader';
import { getProductById, approveDisapprove } from '../../../../Redux/productSlice';
import ProductStatusBadge from '../../../../components/Product/ProductStatusBadge';
import ProductReviewModal from '../../../../components/Product/ProductReviewModal';

const Row = ({ label, value }) => (
  <div className="border-b border-gray-100 py-3">
    <p className="text-xs uppercase text-gray-400">{label}</p>
    <p className="text-sm text-gray-900 break-words">{value || 'N/A'}</p>
  </div>
);

const CHECKLIST_LABELS = {
  titleVerified:      'Title & Description',
  categoryVerified:   'Category',
  complianceVerified: 'Compliance',
  mediaVerified:      'Media / Images',
};

const ProductAdminDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.product);
  const product = selector?.updateProductsData?.normalized?.data || selector?.updateProductsData?.data?.data || {};
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const attributes =
    product.attributes instanceof Map
      ? Object.fromEntries(product.attributes)
      : product.attributes || {};

  useEffect(() => {
    if (id) dispatch(getProductById({ _id: id }));
  }, [dispatch, id]);

  const handleReviewSubmit = async (decision, rejectionReason, checklist) => {
    setReviewLoading(true);
    try {
      await dispatch(approveDisapprove({
        id,
        status: decision,
        rejectionReason: rejectionReason || null,
        checklist,
      })).unwrap();
      const labels = { active: 'approved', inactive: 'deactivated', rejected: 'rejected' };
      toast.success(`Product ${labels[decision] || 'updated'} successfully.`);
      dispatch(getProductById({ _id: id }));
    } catch (err) {
      throw new Error(err?.message || 'Failed to update product');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Loader loading={selector.loading || reviewLoading} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-gray-500">
          <Link to="/app/product-catalog" className="hover:underline text-[#3E4094]">Product Catalog</Link>
          {' / '}
          <b className="text-gray-800">Product Details</b>
        </h3>
        <div className="flex items-center gap-3">
          {product.status && <ProductStatusBadge status={product.status} />}
          <button
            onClick={() => setReviewOpen(true)}
            className="px-4 py-2 text-sm rounded-md bg-[#3E4094] text-white hover:bg-[#2e3074]"
          >
            Review Product
          </button>
          <Link
            to={`/app/product-catalog/form/${id}`}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Edit
          </Link>
        </div>
      </div>

      {product.status === 'rejected' && product.rejectionReason && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</p>
          <p className="text-sm text-red-600">{product.rejectionReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Row label="Title" value={product.title} />
            <Row label="Seller ID" value={product.sellerId} />
            <Row label="Category" value={product.category || product.categoryId} />
            <Row label="Brand" value={product.brand} />
            <Row label="SKU" value={product.sku} />
            <Row label="Color" value={product.color} />
            <Row label="Price" value={product.price !== undefined ? `₹${product.price}` : null} />
            <Row label="MRP" value={product.mrp !== undefined ? `₹${product.mrp}` : null} />
            <Row label="GST Rate" value={product.gstRate !== undefined ? `${product.gstRate}%` : null} />
            <Row label="HSN Code" value={product.hsnCode} />
            <Row label="Stock" value={product.stock} />
            <Row label="Created At" value={product.createdAt ? new Date(product.createdAt).toLocaleString() : null} />
            <Row label="Approved At" value={product.approvedAt ? new Date(product.approvedAt).toLocaleString() : null} />
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Images</h2>
          <div className="grid grid-cols-2 gap-2">
            {(product.images || []).map((image) => (
              <img key={image} src={image} alt="" className="w-full aspect-square object-cover border rounded" />
            ))}
            {!product.images?.length && <p className="text-sm text-gray-400 col-span-2">No images</p>}
          </div>
        </section>

        {product.moderation && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Moderation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mb-3">
              <Row label="Reviewed By" value={product.moderation?.reviewedBy} />
              <Row label="Reviewed At" value={product.moderation?.reviewedAt ? new Date(product.moderation.reviewedAt).toLocaleString() : null} />
              <Row label="Submitted At" value={product.moderation?.submittedAt ? new Date(product.moderation.submittedAt).toLocaleString() : null} />
              {product.moderation?.rejectionReason && (
                <Row label="Rejection Reason" value={product.moderation.rejectionReason} />
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-2">Checklist</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
                  const done = product.moderation?.checklist?.[key] === true;
                  return (
                    <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-md border ${done ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {done && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs ${done ? 'text-green-700' : 'text-gray-500'}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {Object.keys(attributes).length > 0 && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Attributes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
              {Object.entries(attributes).map(([key, value]) => (
                <Row key={key} label={key} value={Array.isArray(value) ? value.join(', ') : String(value ?? '')} />
              ))}
            </div>
          </section>
        )}

        {product.variants?.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Variants ({product.variants.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-600">SKU</th>
                    <th className="text-left p-3 font-medium text-gray-600">Price</th>
                    <th className="text-left p-3 font-medium text-gray-600">MRP</th>
                    <th className="text-left p-3 font-medium text-gray-600">Stock</th>
                    <th className="text-left p-3 font-medium text-gray-600">Attributes</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant, i) => (
                    <tr key={variant.sku || i} className="border-b hover:bg-gray-50">
                      <td className="p-3">{variant.sku || 'N/A'}</td>
                      <td className="p-3">{variant.price !== undefined ? `₹${variant.price}` : 'N/A'}</td>
                      <td className="p-3">{variant.mrp !== undefined ? `₹${variant.mrp}` : 'N/A'}</td>
                      <td className="p-3">{variant.stock ?? 'N/A'}</td>
                      <td className="p-3 text-gray-500">
                        {variant.attributes
                          ? Object.entries(
                              variant.attributes instanceof Map
                                ? Object.fromEntries(variant.attributes)
                                : variant.attributes
                            )
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')
                          : 'N/A'}
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
            <h2 className="text-base font-semibold text-gray-800 mb-3">Shipping & Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
              {product.dimensions && (
                <>
                  <Row label="Dimensions (L×W×H)" value={
                    [product.dimensions.length, product.dimensions.width, product.dimensions.height]
                      .filter(Boolean).join(' × ') + (product.dimensions.unit ? ` ${product.dimensions.unit}` : '') || null
                  } />
                  <Row label="Weight" value={product.dimensions.weight ? `${product.dimensions.weight} ${product.dimensions.weightUnit || 'kg'}` : null} />
                </>
              )}
              {product.origin && (
                <Row label="Origin" value={[product.origin.city, product.origin.state, product.origin.country].filter(Boolean).join(', ') || null} />
              )}
              {product.warranty?.period && (
                <Row label="Warranty" value={`${product.warranty.period} ${product.warranty.periodUnit || 'months'} (${product.warranty.type || 'manufacturer'})`} />
              )}
              {product.warranty?.returnPolicy?.eligible !== undefined && (
                <Row label="Return Policy" value={product.warranty.returnPolicy.eligible ? `Eligible — ${product.warranty.returnPolicy.days || 7} days` : 'Not eligible'} />
              )}
            </div>
          </section>
        )}
      </div>

      <ProductReviewModal
        isOpen={reviewOpen}
        product={product}
        onClose={() => setReviewOpen(false)}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};

export default ProductAdminDetails;
