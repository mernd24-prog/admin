import React, { useEffect, useState } from "react";
import { MdGridView, MdSearch, MdRefresh } from "react-icons/md";
import { PageHeader, StatusBadge } from "../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { toast } from "react-toastify";

const VariantInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axiosProvider.get(ENDPOINTS.products.listForPanel, {
          params: {
            productType: "variable",
            hasVariants: true,
            limit: 50,
            search,
          },
        });
        setProducts(res.data?.data?.products || res.data?.data || []);
      } catch {
        toast.error("Failed to load variant data");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <PageHeader
        title="Variant Inventory"
        subtitle="Per-variant stock levels for variable products"
        breadcrumbs={[
          { label: "Inventory Management" },
          { label: "Variant Inventory" },
        ]}
        actions={
          <button
            onClick={() => setSearch("")}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <MdRefresh size={16} /> Refresh
          </button>
        }
      />

      <div className="relative mb-5 w-full sm:w-80">
        <MdSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search variable products…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--admin-gold)]"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
            >
              <div className="h-5 w-48 bg-gray-200 rounded mb-3" />
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-16 bg-gray-100 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <MdGridView size={40} className="mx-auto mb-3 text-gray-200" />
          <p>No variable products found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {product.title}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {product.category} · {product.variants?.length || 0}{" "}
                    variants
                  </p>
                </div>
                <StatusBadge status={product.status} dot />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 uppercase">
                      <th className="px-4 py-2 text-left font-semibold tracking-wide">
                        Variant
                      </th>
                      <th className="px-4 py-2 text-left font-semibold tracking-wide">
                        SKU
                      </th>
                      <th className="px-4 py-2 text-right font-semibold tracking-wide">
                        Stock
                      </th>
                      <th className="px-4 py-2 text-right font-semibold tracking-wide">
                        Reserved
                      </th>
                      <th className="px-4 py-2 text-right font-semibold tracking-wide">
                        Available
                      </th>
                      <th className="px-4 py-2 text-left font-semibold tracking-wide">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(product.variants || []).map((v) => {
                      const avail = (v.stock ?? 0) - (v.reservedStock ?? 0);
                      const s =
                        avail <= 0
                          ? "out_of_stock"
                          : avail <= 5
                            ? "low_stock"
                            : "in_stock";
                      return (
                        <tr key={v._id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-2.5 font-medium text-gray-700">
                            {v.title || "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-gray-500">
                            {v.sku || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {v.stock ?? 0}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-400">
                            {v.reservedStock ?? 0}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono font-semibold ${avail <= 0 ? "text-red-500" : avail <= 5 ? "text-yellow-600" : "text-green-600"}`}
                          >
                            {avail}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={s} size="sm" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariantInventory;
