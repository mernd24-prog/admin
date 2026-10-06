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
  code: Yup.string().trim().required("HSN Code is required"),
  description: Yup.string()
    .trim()
    .required("Description is required")
    .min(3, "Description must be at least 3 characters")
    .max(100, "Description must be no more than 100 characters"),
  IGST: taxRateSchema("IGST"),
  CGST: taxRateSchema("CGST"),
  SGST: taxRateSchema("SGST"),
  additionalTax: taxRateSchema("Additional Tax"),
});

export const taxValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Tax name is required")
    .min(2, "Min 2 characters"),
  country_code: Yup.string().required("Country is required"),
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
    .min(3, "Min 3 characters"),
  tax_id: Yup.string().required("Tax is required"),
  subTaxes_id: Yup.array()
    .of(Yup.string())
    .min(1, "Sub Tax is required"),
  category_id: Yup.string().required("Category is required"),
});