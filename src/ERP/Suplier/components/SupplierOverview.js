import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router";
import { toast } from "react-toastify";
import Loader from "../../../components/Loader/Loader";
import { getSupplierDetails } from "../../../Redux/erpSlice";
import { TitleValue } from "../../../components/Atoms/TitleValue/TitleValue";

const SupplierOverview = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      dispatch(getSupplierDetails({ _id: id }))
        .unwrap()
        .then((res) => {
          setSupplier(res.data);
        })
        .catch(() => {
          toast.error("Failed to load supplier details");
        })
        .finally(() => setLoading(false));
    }
  }, [dispatch, id]);

  if (loading) return <Loader loading={loading} />;

  if (!supplier) {
    return (
      <div className="text-center text-gray-600 py-10">Supplier not found.</div>
    );
  }

  const {
    name,
    contact_person,
    email,
    phone,
    gst_number,
    drug_license_no,
    pan_number,
    tin_number,
    supplier_type,
    category_type,
    address_line1,
    address_line2,
    bank_account_details = {},
    note,
  } = supplier;

  return (
    <div className="bg-white p-4">
      <div className="  ">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <h2 className="text-gray-700 text-lg font-semibold mb-2 sm:mb-0">
            Supplier - {name || "N/A"}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm ">
          <TitleValue title="Supplier:" value={`${address_line1 || ""} ${name || ""}`.trim() || "N/A"} />
          <TitleValue title="Contact Person:" value={contact_person} />
          <TitleValue title="Address Line-1:" value={`${address_line1 || ""} ${address_line2 || ""}`.trim() || "N/A"} />
          <TitleValue title="Address Line-2:" value={`${address_line2 || ""} ${address_line2 || ""}`.trim() || "N/A"} />

          <TitleValue title="Phone:" value={phone} />
          <TitleValue title="Bank Account:" value={bank_account_details.account_number ? `${bank_account_details.bank_name || ""} - 
          ${bank_account_details.account_number}`
            : "N/A"
          }
          />
          <TitleValue title="Email:" value={email} />
          <TitleValue title="IFSC:" value={bank_account_details.ifsc_code || "N/A"} />
          <TitleValue title="Drug License:" value={drug_license_no} />
          <TitleValue title="Bank Address:" value={bank_account_details.bank_address || "N/A"} />
          <TitleValue title="GST Number:" value={gst_number} />
          <TitleValue title="PAN Number:" value={pan_number} />
          <TitleValue title="TIN Number:" value={tin_number} />
          <TitleValue title="Supplier Type:" value={supplier_type} />
          <TitleValue title="Category Type:" value={category_type} />
        </div>

        {note && (
          <p className="text-sm font-medium text-gray-700 mt-2">
            <strong>*</strong> {note}
          </p>
        )}
      </div>
    </div>
  );
};



export default SupplierOverview;
