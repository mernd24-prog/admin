/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import TableData from "../../../components/Atoms/TableData/TableData";
import ImageViewer from "../../../components/ImageViewer/ImageViewer";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import Loader from "../../../components/Loader/Loader";
import Pagination from "../../../components/Pagination/Pagination";
import { getProducts, updateProductsById } from "../../../Redux/productSlice";
import AddEditVolumeDiscount from "./components/AddEditVolumeDiscount";

const PAGE_SIZE = 10;
const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");
const productIdOf = (product = {}) =>
  firstDefined(product._id, product.id, product.productId);

const VolumeDiscount = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.product);

  const listResponse = selector?.getProductsData?.data?.data || {};
  const list = listResponse?.list || [];
  const total = Number(listResponse?.total || 0);

  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ search: "" });
  const [selectedRow, setSelectedRow] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      await dispatch(
        getProducts({
          page: pageNo,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
        }),
      ).unwrap();
    } catch (err) {
      toast.error(
        err?.message || err || "Failed to fetch volume discount products",
      );
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handlePageChange = useCallback((newPageNo) => {
    setPageNo(newPageNo);
  }, []);

  const applyFilters = useCallback(() => {
    setPageNo(1);
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchRemove = useCallback(() => {
    setFilters({ search: "" });
    setPageNo(1);
  }, []);

  const tableHeadings = [
    "Product Name",
    "Minimum Purchase Quantity",
    "Discount(%)",
    "Action",
  ];

  const tableRows = list.map((product) => {
    const id = productIdOf(product);
    const title = firstDefined(product?.title, product?.name, "N/A");
    const image = firstDefined(
      product?.thumbnail,
      product?.thumbnails,
      product?.images?.[0],
      "",
    );
    const minQty = Number(
      firstDefined(
        product?.metadata?.volumeDiscount?.minimumQuantity,
        product?.minPurchaseQuantity,
        product?.minimumPurchaseQty,
        1,
      ),
    );
    const discount = Number(
      firstDefined(
        product?.metadata?.volumeDiscount?.discount,
        product?.volumeDiscount,
        product?.bulkDiscountPercent,
        0,
      ),
    );

    return [
      <span className="flex items-center space-x-2 cursor-pointer">
        {image ? (
          <img
            src={image}
            alt=""
            className="object-cover w-20 h-20 border rounded"
            onClick={() => setSelectedImage(image)}
          />
        ) : (
          <span className="w-20 h-20 border rounded bg-gray-100" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-sm text-gray-500">
            Seller:{" "}
            {firstDefined(
              product?.sellerId?.name,
              product?.sellerId?.email,
              product?.sellerId,
              "N/A",
            )}
          </span>
        </div>
      </span>,
      <span>{minQty}</span>,
      <span>{discount.toFixed(2)}</span>,
      <ActionButtons
        showDeleteButton={false}
        showEditButton={false}
        showViewButton={false}
        viewButton={true}
        onViewClick={() => {
          if (!id) {
            toast.error("Product ID not found");
            return;
          }
          navigate(`/app/product-catalog/view/${id}`);
        }}
      />,
    ];
  });

  return (
    <>
      <Loader loading={isLoading} />
      <div className="p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3">
        <h3 className="text-gray-500 text-sm font-semibold py-3">
          <Link to="/app/home">Home</Link> /{" "}
          <span className="text-[#181c32]">Volume Discount</span>
        </h3>
        <div className="overflow-auto overflow-y-auto bg-white rounded-lg">
          <SearchComponent
            tableHeadings={tableHeadings}
            data={tableRows}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            loading={isLoading}
            filters={filters}
            setFilters={setFilters}
            isSearchShow={true}
            isActivationStatus={false}
            isApprovalOptions={false}
            isProduct={false}
            isUser={false}
            isActionButton={false}
            isSearchDown={false}
            isStatusAction={false}
            isDelete={false}
            applyFilters={applyFilters}
            handleSearchRemove={handleSearchRemove}
          />
          <TableData
            Heading="Volume Discount"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder="Search by product..."
            showFilter={false}
            showSummary={false}
            showAddButton={true}
            addButtonLabel="Add"
            onClickFunction={() => setIsModalOpen(true)}
            isHeaderCheckbox={false}
            totalData={total}
          />
        </div>
        {total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={handlePageChange}
          />
        )}
      </div>
      <ImageViewer
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
      <AddEditVolumeDiscount
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productOptions={list
          .map((product) => ({
            value: productIdOf(product),
            label: firstDefined(
              product?.title,
              product?.name,
              productIdOf(product),
            ),
          }))
          .filter((option) => option.value)}
        onSubmit={async (formData) => {
          if (!formData?.product) {
            toast.error("Please select a product");
            return;
          }
          try {
            await dispatch(
              updateProductsById({
                _id: formData.product,
                metadata: {
                  volumeDiscount: {
                    minimumQuantity: Number(formData.minimumQuantity || 0),
                    discount: Number(formData.discount || 0),
                  },
                },
                minPurchaseQuantity: Number(formData.minimumQuantity || 0),
                volumeDiscount: Number(formData.discount || 0),
              }),
            ).unwrap();
            toast.success("Volume discount updated successfully");
            setIsModalOpen(false);
            fetchProducts();
          } catch (err) {
            toast.error(
              err?.message || err || "Failed to update volume discount",
            );
          }
        }}
      />
    </>
  );
};

export default VolumeDiscount;
