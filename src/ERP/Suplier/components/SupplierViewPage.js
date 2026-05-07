import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {  getSupplierDetails } from "../../../Redux/erpSlice";
import Loader from "../../../components/Loader/Loader";
import { toast } from "sonner";
import TransparentButton from "../../../components/Atoms/buttons/TransParentButton";

const LabelValue = ({ label, value }) => (
  <div className="mb-2">
    <p className="text-gray-500 text-sm">{label}</p>
    <p className="text-gray-800 font-semibold">{value || "—"}</p>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white p-4 shadow rounded-md">
    <h2 className="text-lg font-semibold text-[#0A73CF] mb-3 border-b pb-1">
      {title}
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {children}
    </div>
  </div>
);

const SupplierViewPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      dispatch(getSupplierDetails({_id:id}))
        .unwrap()
        .then((res) => {
          setSupplier(res.data);
        })
        .catch(() => {
          toast.error("Failed to load supplier details");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <Loader loading={loading} />;

  if (!supplier) {
    return (
      <div className="text-center text-gray-600 py-10">
        Supplier not found.
      </div>
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
  } = supplier;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Supplier Details</h1>
          <p className="text-sm text-gray-500">Dashboard / Supplier / View</p>
        </div>
        <div className="flex gap-2">
          <TransparentButton label="Back" onClick={() => navigate("/app/supplier")} />
        </div>
      </div>

      {/* Sections */}
      <Section title="Basic Information">
        <LabelValue label="Supplier Name" value={name} />
        <LabelValue label="Contact Person" value={contact_person} />
        <LabelValue label="Phone Number" value={phone} />
        <LabelValue label="Email" value={email} />
        <LabelValue label="Supplier Type" value={supplier_type} />
        <LabelValue label="Category Type" value={category_type} />
      </Section>

      <Section title="Business Information">
        <LabelValue label="GST Number" value={gst_number} />
        <LabelValue label="Drug License No." value={drug_license_no} />
        <LabelValue label="PAN Number" value={bank_account_details.pan_number || pan_number} />
        <LabelValue label="TIN Number" value={tin_number} />
      </Section>

      <Section title="Address">
        <LabelValue label="Address Line 1" value={address_line1} />
        <LabelValue label="Address Line 2" value={address_line2} />
      </Section>

      <Section title="Bank Details">
        <LabelValue label="Bank Name" value={bank_account_details.bank_name} />
        <LabelValue label="Account Number" value={bank_account_details.account_number} />
        <LabelValue label="IFSC Code" value={bank_account_details.ifsc_code} />
      </Section>
    </div>
  );
};

export default SupplierViewPage;
