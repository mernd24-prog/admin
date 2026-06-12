import React from "react";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    title: "1) Categories",
    description:
      "Create categories first. This is the base for product mapping and filters.",
    route: "/app/categories",
  },
  {
    title: "2) Category Attributes",
    description:
      "Define attribute schema per category. Product attribute fields come from this setup.",
    route: "/app/category-attributes",
  },
  {
    title: "3) Brands",
    description: "Create brands used by products.",
    route: "/app/brands",
  },
  {
    title: "4) Product Families",
    description:
      "Create families with base attributes and variant axes (size/color etc).",
    route: "/app/product-families",
  },
  {
    title: "5) Product Options",
    description:
      "Create options and option values used in variant dropdowns/selectors.",
    route: "/app/product-options",
  },
  {
    title: "6) Product Variants",
    description:
      "Create reusable variant records (SKU, stock, attribute combinations).",
    route: "/app/product-variants",
  },
  {
    title: "7) HSN / Dimensions / Warranty / Batch",
    description:
      "Create compliance and operational masters before product creation.",
    route: "/app/product-dimensions",
    extraRoutes: [
      { label: "Warranty", route: "/app/warranty" },
      { label: "Batch", route: "/app/batch" },
      { label: "HSN Codes", route: "/app/hsn-code" },
    ],
  },
  {
    title: "8) Product Catalog",
    description:
      "Create final products and map category, attributes, brand, family, HSN, and origin location.",
    route: "/app/product-catalog",
  },
  {
    title: "9) Post-Create Management",
    description:
      "Manage seller inventory, threshold alerts, and moderation after products are created.",
    route: "/app/seller-product-inventory",
    extraRoutes: [
      { label: "Threshold Products", route: "/app/threshold-products" },
      { label: "Inventory Audit Log", route: "/app/inventory-audit" },
    ],
  },
];

const ProductFlow = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto py-6">
      <h3 className="mb-3">
        Home / <b>Product Setup Flow</b>
      </h3>
      <div className="rounded-lg border border-[#E6E6E6] bg-white p-4">
        <p className="mb-4 text-sm text-gray-600">
          Follow this order to avoid broken product mappings and missing
          references.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-lg border border-gray-200 p-4"
            >
              <p className="font-semibold text-[#2E2E2E]">{step.title}</p>
              <p className="mt-1 text-sm text-gray-600">{step.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate(step.route)}
                  className="rounded bg-[var(--admin-blue)] px-3 py-1.5 text-xs font-medium text-white"
                >
                  Open
                </button>
                {(step.extraRoutes || []).map((item) => (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => navigate(item.route)}
                    className="rounded border border-[var(--admin-blue)] px-3 py-1.5 text-xs font-medium text-[var(--admin-blue)]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductFlow;
