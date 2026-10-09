import * as Yup from "yup";

export const parentInfluencerValidationSchema = Yup.object({
  firstName: Yup.string()
    .trim()
    .required("First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be no more than 50 characters")
    .matches(/^[A-Za-z\s.'-]+$/, "Enter a valid first name"),
  lastName: Yup.string()
    .trim()
    .required("Last name is required")
    .min(1, "Last name must be at least 1 character")
    .max(50, "Last name must be no more than 50 characters")
    .matches(/^[A-Za-z\s.'-]+$/, "Enter a valid last name"),
  email: Yup.string()
    .trim()
    .required("Email is required")
    .min(5, "Email must be at least 5 characters")
    .max(254, "Email must be no more than 254 characters")
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"),
  password: Yup.string()
    .required("Temporary password is required")
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be no more than 128 characters"),
phone: Yup.string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .notRequired()
  .matches(/^[6-9][0-9]{9}$/, "Enter a valid 10 digit mobile number"),
  code: Yup.string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .notRequired()
    .min(4, "Referral code must be at least 4 characters")
    .max(32, "Referral code must be no more than 32 characters")
    .matches(
      /^[A-Za-z0-9_-]+$/,
      "Use letters, numbers, hyphen, or underscore only",
    ),
});

export const brandAssociateValidationSchema =
  parentInfluencerValidationSchema.shape({
    parentId: Yup.string().required("Growth Partner is required"),
    canCreateChildren: Yup.boolean(),
  });

export const referralCodeValidationSchema = Yup.object({
  influencerId: Yup.string().required("Referral Partner is required"),
  code: Yup.string()
    .trim()
    .required("Referral code is required")
    .min(4, "Referral code must be at least 4 characters")
    .max(32, "Referral code must be no more than 32 characters")
    .matches(
      /^[A-Za-z0-9_-]+$/,
      "Use letters, numbers, hyphen, or underscore only",
    ),
  status: Yup.string().required("Status is required"),
  usageLimit: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null ? undefined : value,
    )
    .optional()
    .integer("Usage limit must be a whole number")
    .min(1, "Usage limit must be greater than 0"),
});

const taxRateSchema = (label) =>
  Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? undefined : value,
    )
    .typeError(`${label} must be a number`)
    .required(`${label} is required`)
    .min(0, `${label} must be between 0 and 100`)
    .max(100, `${label} must be between 0 and 100`);

export const hsnValidationSchema = Yup.object({
  code: Yup.string()
    .trim()
    .required("HSN Code is required")
    .matches(/^\d{4,8}$/, "Must be 4-8 digits"),
  description: Yup.string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .notRequired()
    .min(3, "Description must be at least 3 characters")
    .max(100, "Description must be no more than 100 characters"),
  IGST: taxRateSchema("IGST"),
  CGST: taxRateSchema("CGST"),
  SGST: taxRateSchema("SGST"),
  additionalTax: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? undefined : value,
    )
    .typeError("Additional Tax must be a number")
    .notRequired()
    .min(0, "Additional Tax must be between 0 and 100")
    .max(100, "Additional Tax must be between 0 and 100"),
});

export const taxValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Tax name is required")
    .min(2, "Min 2 characters"),
  country_code: Yup.string().required("Country is required"),
});

export const taxInvoiceValidationSchema = Yup.object({
  orderId: Yup.string()
    .trim()
    .required("Order ID is required")
    .min(3, "Order ID must be at least 3 characters")
    .max(100, "Order ID must be at most 100 characters"),
});

export const subTaxValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Name is required")
    .min(3, "Min 3 characters"),
  percentage: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null ? undefined : value,
    )
    .typeError("Only numbers are allowed")
    .required("Percentage is required")
    .min(0, "Must be between 0 and 100")
    .max(100, "Must be between 0 and 100"),
  taxId: Yup.string().required("Parent tax is required"),
});

export const taxRuleValidationSchema = Yup.object({
  description: Yup.string()
    .trim()
    .required("Description is required")
    .min(3, "Min 3 characters")
    .max(100, "Max 2500 characters"),
  tax_id: Yup.string().required("Tax is required"),
  subTaxes_id: Yup.array()
    .of(Yup.string())
    .min(1, "Sub Tax is required"),
  category_id: Yup.string().required("Category is required"),
});

const optionalCreditNoteText = (label, maxLength) =>
  Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, `${label} must be at least 3 characters`)
    .max(maxLength, `${label} must be at most ${maxLength} characters`);

const optionalCreditNoteAmount = (label) =>
  Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null ? undefined : value,
    )
    .typeError(`${label} must be a number`)
    .notRequired()
    .min(0, `${label} cannot be negative`);

export const creditNoteValidationSchema = Yup.object({
  orderId: Yup.string()
    .trim()
    .required("Order ID is required")
    .min(3, "Order ID must be at least 3 characters")
    .max(100, "Order ID must be at most 100 characters"),
  referenceId: optionalCreditNoteText("Reference ID", 100),
  referenceType: Yup.string()
    .required("Reference type is required")
    .oneOf(["return", "cancellation", "refund", "manual"]),
  taxableAmount: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null ? undefined : value,
    )
    .typeError("Taxable amount must be a number")
    .required("Taxable amount is required")
    .moreThan(0, "Taxable amount must be greater than zero"),
  taxAmount: optionalCreditNoteAmount("Tax amount"),
  totalAmount: optionalCreditNoteAmount("Total credit amount"),
  reason: optionalCreditNoteText("Reason", 500),
});

export const categoryValidationSchema = Yup.object({
  categoryName: Yup.string()
    .trim()
    .required("Category name is required")
    .min(3, "Category name must be at least 3 characters")
    .max(50, "Category name must be less than 50 characters"),
});

export const closeReturnValidationSchema = Yup.object({
  reason: Yup.string()
    .trim()
    .required("Close reason is required")
    .min(3, "Close reason must be at least 3 characters")
    .max(250, "Close reason must be at most 250 characters"),

  note: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, "Note must be at least 3 characters")
    .max(500, "Note must be at most 500 characters"),
});

export const rejectReturnValidationSchema = Yup.object({
  reason: Yup.string()
    .trim()
    .required("Rejection reason is required")
    .min(3, "Rejection reason must be at least 3 characters")
    .max(250, "Rejection reason must be at most 250 characters"),
  note: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, "Note must be at least 3 characters")
    .max(500, "Note must be at most 500 characters"),
});

const optionalTextWithLength = (label, max) =>
  Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, `${label} must be at least 3 characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const replacementRequestValidationSchema = Yup.object({
  note: optionalTextWithLength("Note", 500),
});

export const scheduleReturnValidationSchema = Yup.object({
  mode: Yup.string().required("Return mode is required"),
  courierName: Yup.string().when("mode", {
    is: "reverse_pickup",
    then: (schema) =>
      schema
        .trim()
        .required("Courier is required")
        .min(3, "Courier must be at least 3 characters")
        .max(100, "Courier must be at most 100 characters"),
    otherwise: () => optionalTextWithLength("Courier", 100),
  }),
  trackingNumber: Yup.string().when("mode", {
    is: "reverse_pickup",
    then: (schema) =>
      schema
        .trim()
        .required("Tracking / AWB is required")
        .min(3, "Tracking / AWB must be at least 3 characters")
        .max(100, "Tracking / AWB must be at most 100 characters"),
    otherwise: () => optionalTextWithLength("Tracking / AWB", 100),
  }),
  note: optionalTextWithLength("Note", 500),
});

