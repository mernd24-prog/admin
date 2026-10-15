import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  MdDeleteOutline,
  MdMoreVert,
  MdOpenInNew,
  MdRefresh,
  MdUpload,
  MdVisibility,
} from "react-icons/md";
import { toast } from "sonner";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  DataTable,
  OrderLink,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { uploadDocumentFile } from "../../../_helpers/globalFunctions";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import ImageUpload from "../../../components/Atoms/ImageGallery/ImageUpload";

const money = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const label = (value) => String(value || "-").replace(/_/g, " ");
const RESPONSE_OPTIONS = [
  { value: "retained", label: "Cash collected and retained" },
  { value: "remittance", label: "Cash remitted to platform" },
  { value: "dispute", label: "Dispute this COD liability" },
];
const emptyForm = {
  open: false,
  row: null,
  responseType: "retained",
  amount: "",
  referenceId: "",
  proofUrl: "",
  notes: "",
};

export default function SellerCodCollections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
  });
  const emptyForm = {
    open: false,
    row: null,
    responseType: "retained",
    amount: "",
    referenceId: "",
    proofUrl: "",
    proofPreview: "",
    notes: "",
  };
  const [uploadingProof, setUploadingProof] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [openActionId, setOpenActionId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const actionButtonRefs = useRef({});

  const [validationErrors, setValidationErrors] = useState({
    amount: "",
    referenceId: "",
    notes: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosProvider.get(
        ENDPOINTS.payments.myCodCollections,
      );
      const data = response?.data?.data;
      setItems(data?.items || data?.list || data || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to load COD collections",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()
      .replace(/^#+\s*/, "");

    if (!query) return items;

    return items.filter((row) => {
      const searchableValues = [
        row?.order_number,
        row?.order_id,
        row?.orderId,
        row?.shipment_id,
        row?.awb_number,
        row?.collection_mode,
        row?.status,
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .replace(/^#+\s*/, "")
          .includes(query),
      );
    });
  }, [items, search]);

  const uploadProof = useCallback(async (event) => {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) return;

    // Allow the same file to be selected again later.
    input.value = "";

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Upload a PDF, JPG, PNG, or WebP file");
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      toast.error("File size must not exceed 5 MB");
      return;
    }

    try {
      setUploadingProof(true);

      const uploadedUrl = await uploadDocumentFile(file, "COD_COLLECTIONS");

      if (!uploadedUrl || typeof uploadedUrl !== "string") {
        throw new Error("Upload did not return a valid file URL");
      }

      setForm((current) => ({
        ...current,
        proofUrl: uploadedUrl,
      }));

      toast.success("Collection proof uploaded successfully");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to upload collection proof",
      );
    } finally {
      setUploadingProof(false);
    }
  }, []);

  const submit = useCallback(async () => {
    if (uploadingProof) {
      toast.error("Please wait for the proof upload to finish");
      return;
    }

    const isDispute = form.responseType === "dispute";

    const errors = {
      amount: "",
      referenceId: "",
      notes: "",
    };

    if (!form.row?.shipment_id) return;

    if (!isDispute) {
      if (!form.amount || Number(form.amount) <= 0) {
        errors.amount = "Please enter a valid collected amount";
      }

      if (form.referenceId.trim().length < 3) {
        errors.referenceId =
          "Collection reference must be at least 3 characters";
      }
    }

    if (isDispute && form.notes.trim().length < 5) {
      errors.notes =
        "Explain why this COD liability is disputed (minimum 5 characters)";
    }

    setValidationErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      return;
    }

    try {
      setLoading(true);

      await axiosProvider.post(
        ENDPOINTS.payments.submitCodCollection(form.row.shipment_id),
        {
          submissionType: form.responseType,
          collectedAmount: Number(form.amount),
          referenceId: form.referenceId.trim(),
          proofUrl: form.proofUrl || null,
          notes: form.notes || null,
        },
      );

      toast.success("COD collection submitted to Admin for verification");
      setForm(emptyForm);
      setValidationErrors({
        amount: "",
        referenceId: "",
        notes: "",
      });

      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to submit COD collection",
      );
    } finally {
      setLoading(false);
    }
  }, [form, load, uploadingProof]);

  const columns = useMemo(
    () => [
      {
        key: "order_number",
        label: "Order / Shipment",
        render: (_, row) => {
          const orderId = row?.order_id || row?.orderId;
          const orderDisplay = row?.order_number
            ? `#${row.order_number}`
            : row?.order_id || "—";

          return (
            <div>
              <OrderLink
                orderId={orderId}
                orderNumber={row?.order_number}
                className="block"
              >
                {orderDisplay}
              </OrderLink>

              <div className="text-xs text-gray-500">
                {row?.awb_number || "Shipment"}
              </div>
            </div>
          );
        },
      },
      {
        key: "collection_mode",
        label: "Mode",
        render: (value) => label(value),
      },
      {
        key: "expected_amount",
        label: "Expected",
        render: (value) => money(value),
      },
      {
        key: "collected_amount",
        label: "Collected",
        render: (value) => money(value),
      },
      {
        key: "status",
        label: "Status",
        render: (value) => <StatusBadge status={value} label={label(value)} />,
      },
      {
        key: "due_at",
        label: "Action due",
        render: (value, row) =>
          row.seller_action_required ? (
            <div
              className={
                row.is_overdue ? "font-semibold text-red-600" : "text-xs"
              }
            >
              {value
                ? new Date(value).toLocaleString("en-IN")
                : "Action required"}
              {row.is_overdue && (
                <div className="text-[10px] uppercase">Overdue</div>
              )}
            </div>
          ) : (
            "—"
          ),
      },
      // {
      //   key: "actions",
      //   label: "Action",
      //   render: (_, row) =>
      //     ["pending", "disputed"].includes(row.status) ? (
      //       <PermissionGuard
      //         module="sellers/commissions"
      //         action={ACTIONS.UPDATE}
      //         hide
      //       >
      //         <button
      //           type="button"
      //           className="admin-btn-secondary !px-2 !py-1"
      //           onClick={() =>
      //             setForm({
      //               open: true,
      //               row,
      //               responseType: "retained",
      //               amount: row.expected_amount || "",
      //               referenceId: "",
      //               proofUrl: "",
      //               notes: "",
      //             })
      //           }
      //         >
      //           <MdUpload aria-hidden="true" size={14} /> Respond now
      //         </button>
      //       </PermissionGuard>
      //     ) : row.status === "submitted" ? (
      //       "Awaiting Admin verification"
      //     ) : ["verified", "remitted"].includes(row.status) ? (
      //       "Completed"
      //     ) : (
      //       "No action required"
      //     ),
      // },

      {
        key: "actions",
        label: "Action",
        render: (_, row) => {
          const rowId = String(
            row?.shipment_id || row?.order_id || row?.orderId,
          );

          const isOpen = openActionId === rowId;

          const openMenu = (event) => {
            event.stopPropagation();

            if (isOpen) {
              setOpenActionId(null);
              setMenuPosition(null);
              return;
            }

            const rect = event.currentTarget.getBoundingClientRect();
            const menuWidth = 224;
            const menuHeight = 100;

            const left = Math.max(
              8,
              Math.min(
                rect.right - menuWidth,
                window.innerWidth - menuWidth - 8,
              ),
            );

            const openAbove =
              window.innerHeight - rect.bottom < menuHeight &&
              rect.top > menuHeight;

            setMenuPosition({
              top: openAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
              left,
            });

            setOpenActionId(rowId);
          };

          return (
            <div className="flex justify-center">
              <button
                ref={(element) => {
                  actionButtonRefs.current[rowId] = element;
                }}
                type="button"
                aria-label="Open shipment actions"
                aria-expanded={isOpen}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-600  focus:outline-none focus-visible:outline-none"
                onClick={openMenu}
              >
                <MdMoreVert aria-hidden="true" size={22} />
              </button>

              {isOpen &&
                menuPosition &&
                createPortal(
                  <>
                    <button
                      type="button"
                      aria-label="Close actions menu"
                      className="fixed inset-0 z-[9998] cursor-default"
                      onClick={() => {
                        setOpenActionId(null);
                        setMenuPosition(null);
                      }}
                    />

                    <div
                      className="fixed z-[9999] w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
                      style={{
                        top: menuPosition.top,
                        left: menuPosition.left,
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {["pending", "disputed"].includes(row.status) ? (
                        <PermissionGuard
                          module="sellers/commissions"
                          action={ACTIONS.UPDATE}
                          hide
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              setOpenActionId(null);
                              setMenuPosition(null);

                              setForm({
                                open: true,
                                row,
                                responseType: "retained",
                                amount: row.expected_amount || "",
                                referenceId: "",
                                proofUrl: "",
                                notes: "",
                              });
                            }}
                          >
                            <MdVisibility
                              className="text-blue-700"
                              aria-hidden="true"
                              size={16}
                            />
                            View Cod details
                          </button>
                        </PermissionGuard>
                      ) : row.status === "submitted" ? (
                        <div className="px-4 py-2.5 text-sm text-gray-500">
                          Awaiting Admin Verification
                        </div>
                      ) : ["verified", "remitted"].includes(row.status) ? (
                        <div className="px-4 py-2.5 text-sm text-green-700">
                          Completed
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 text-sm text-gray-500">
                          No action required
                        </div>
                      )}
                    </div>
                  </>,
                  document.body,
                )}
            </div>
          );
        },
      },
    ],
    [openActionId, menuPosition],
  );

  return (
    <div>
      <PageHeader
        title="COD Collections"
        subtitle="COD is enabled per product. Submit cash collected from delivered COD orders for Admin verification before settlement."
        breadcrumbs={[
          { label: "Seller Finance" },
          { label: "COD Collections" },
        ]}
      />
      {items.some((row) => row.seller_action_required) && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>COD action required</strong>
          <p className="mt-1 text-xs leading-5">
            These amounts were recorded as liabilities when delivery was
            confirmed and reduce current or future payouts. Confirm retained
            cash, report a remittance, or dispute an incorrect entry.
          </p>
        </div>
      )}
      <DataTable
        columns={columns}
        data={filteredItems}
        onRefresh={load}
        loading={loading}
        totalCount={filteredItems.length}
        page={pagination.page}
        pageSize={pagination.pageSize}
        onPageChange={(page) =>
          setPagination((current) => ({ ...current, page }))
        }
        onPageSizeChange={(pageSize) => setPagination({ page: 1, pageSize })}
        onSearch={(value) => {
          setSearch(value);
          setPagination((current) => ({ ...current, page: 1 }));
        }}
        onSort={() => {}}
        requiredModule="sellers/commissions"
      />
      <DefaultModal
        isOpen={form.open}
        onClose={() => setForm(emptyForm)}
        title="Respond to COD Liability"
        onSubmit={submit}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Expected COD: {money(form.row?.expected_amount)}
          </p>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
            This liability was recorded automatically when delivery was
            confirmed. Ignoring it does not remove it from your finance balance.
          </div>
          <FilterSelect
            label="Your response"
            options={RESPONSE_OPTIONS}
            value={RESPONSE_OPTIONS.find(
              (option) => option.value === form.responseType,
            )}
            onChange={(option) =>
              setForm((prev) => ({
                ...prev,
                responseType: option?.value || "retained",
              }))
            }
            isSearchable={false}
            required
          />
          {form.responseType !== "dispute" && (
            <div>
              <Input
                labelName="Collected amount"
                type="number"
                value={form.amount}
                onChange={(event) => {
                  const amount = event.target.value;

                  setForm((prev) => ({ ...prev, amount }));
                  setValidationErrors((prev) => ({
                    ...prev,
                    amount: "",
                  }));
                }}
                required
              />

              {validationErrors.amount && (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors.amount}
                </p>
              )}
            </div>
          )}
          <div>
            <Input
              labelName="Collection reference"
              value={form.referenceId}
              onChange={(event) => {
                const referenceId = event.target.value;

                setForm((prev) => ({ ...prev, referenceId }));
                setValidationErrors((prev) => ({
                  ...prev,
                  referenceId: "",
                }));
              }}
              placeholder="Cash receipt / courier / deposit reference"
              required={form.responseType !== "dispute"}
            />

            {validationErrors.referenceId && (
              <p className="mt-1 text-xs text-red-600">
                {validationErrors.referenceId}
              </p>
            )}

            <p className="mt-1 text-xs text-gray-500">
              {form.responseType === "remittance"
                ? "Enter the bank deposit or platform remittance reference."
                : form.responseType === "dispute"
                  ? "Optional reference supporting the dispute."
                  : "Enter the cash receipt or internal collection number."}
            </p>
          </div>

          <div className="!mt-4">
            <ImageUpload
              id="cod-collection-proof"
              label="Collection Proof"
              subtext="Upload a receipt or cash collection proof."
              accept="image/jpeg,image/png,image/webp"
              file={form.proofPreview || ""}
              isLoading={uploadingProof}
              loadingText="Uploading proof..."
              isDisabled={loading}
              helperText="JPG, PNG, WEBP"
              errorMessage=""
              onChange={async (file) => {
                if (!file) return;

                const previewUrl = URL.createObjectURL(file);

                setForm((current) => ({
                  ...current,
                  proofPreview: previewUrl,
                }));

                try {
                  setUploadingProof(true);

                  const uploadedUrl = await uploadDocumentFile(
                    file,
                    "COD_COLLECTIONS",
                  );

                  if (!uploadedUrl || typeof uploadedUrl !== "string") {
                    throw new Error("Unable to get the uploaded proof URL");
                  }

                  setForm((current) => ({
                    ...current,
                    proofUrl: uploadedUrl,
                    proofPreview: previewUrl,
                  }));

                  toast.success("Collection proof uploaded successfully");
                } catch (error) {
                  URL.revokeObjectURL(previewUrl);

                  setForm((current) => ({
                    ...current,
                    proofUrl: "",
                    proofPreview: "",
                  }));

                  toast.error(
                    error?.response?.data?.message ||
                      error?.message ||
                      "Unable to upload collection proof",
                  );
                } finally {
                  setUploadingProof(false);
                }
              }}
              onRemove={() => {
                if (form.proofPreview?.startsWith("blob:")) {
                  URL.revokeObjectURL(form.proofPreview);
                }

                setForm((current) => ({
                  ...current,
                  proofUrl: "",
                  proofPreview: "",
                }));
              }}
            />

            {form.proofUrl && (
              <a
                href={form.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#2f6bff] hover:underline"
              >
                <MdOpenInNew aria-hidden="true" size={15} />
                View uploaded proof
              </a>
            )}
          </div>

          <Input
            labelName="Notes"
            type="textarea"
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder={
              form.responseType === "dispute"
                ? "Explain why this liability is incorrect"
                : "Add notes (optional)"
            }
            required={form.responseType === "dispute"}
          />
        </div>
      </DefaultModal>
    </div>
  );
}
