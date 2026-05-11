import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../../components/Loader/Loader';
import { updateProducts } from '../../../../Redux/productSlice';

const Row = ({ label, value }) => (
  <div className="border-b border-gray-100 py-3">
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <p className="text-sm text-gray-900 break-words">{value || 'N/A'}</p>
  </div>
);

const ProductAdminDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.product);
  const product = selector?.updateProductsData?.data?.data || {};
  const attributes =
    product.attributes instanceof Map
      ? Object.fromEntries(product.attributes)
      : product.attributes || {};

  useEffect(() => {
    if (id) dispatch(updateProducts({ _id: id }));
  }, [dispatch, id]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Loader loading={selector.loading} />
      <div className="mb-4">
        <h3><Link to="/app/product-catalog">Product Catalog</Link> / <b>Product Details</b></h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-white border border-[#E6E6E6] p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Row label="Title" value={product.title} />
            <Row label="Seller" value={product.sellerId} />
            <Row label="Category" value={product.category || product.categoryId} />
            <Row label="Brand" value={product.brand} />
            <Row label="Price" value={product.price} />
            <Row label="MRP" value={product.mrp} />
            <Row label="Stock" value={product.stock} />
            <Row label="Status" value={product.status} />
            <Row label="Created At" value={product.createdAt ? new Date(product.createdAt).toLocaleString() : ''} />
            <Row label="Approved At" value={product.approvedAt ? new Date(product.approvedAt).toLocaleString() : ''} />
          </div>
        </section>
        <section className="bg-white border border-[#E6E6E6] p-5">
          <h2 className="text-lg font-semibold mb-3">Images</h2>
          <div className="grid grid-cols-2 gap-2">
            {(product.images || []).map((image) => (
              <img key={image} src={image} alt="" className="w-full aspect-square object-cover border" />
            ))}
          </div>
        </section>
        <section className="bg-white border border-[#E6E6E6] p-5 lg:col-span-3">
          <h2 className="text-lg font-semibold mb-3">Attributes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
            {Object.entries(attributes).map(([key, value]) => (
              <Row key={key} label={key} value={Array.isArray(value) ? value.join(', ') : String(value ?? '')} />
            ))}
          </div>
        </section>
        <section className="bg-white border border-[#E6E6E6] p-5 lg:col-span-3">
          <h2 className="text-lg font-semibold mb-3">Variants</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">MRP</th>
                  <th className="text-left p-2">Stock</th>
                  <th className="text-left p-2">Attributes</th>
                </tr>
              </thead>
              <tbody>
                {(product.variants || []).map((variant) => (
                  <tr key={variant.sku} className="border-b">
                    <td className="p-2">{variant.sku}</td>
                    <td className="p-2">{variant.price}</td>
                    <td className="p-2">{variant.mrp}</td>
                    <td className="p-2">{variant.stock}</td>
                    <td className="p-2">{JSON.stringify(variant.attributes || {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductAdminDetails;
