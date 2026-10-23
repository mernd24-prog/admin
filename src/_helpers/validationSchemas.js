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

const referralPayoutAdminNote = Yup.string()
  .transform((value) => (value?.trim() ? value.trim() : undefined))
  .notRequired()
  .min(3, "Admin note must be at least 3 characters")
  .max(500, "Admin note must be at most 500 characters");

export const approveReferralPayoutValidationSchema = Yup.object({
  adminNote: referralPayoutAdminNote.required("Admin note is required"),
});

export const rejectReferralPayoutValidationSchema = Yup.object({
  adminNote: referralPayoutAdminNote.required("Admin note is required"),
});

export const recordReferralPayoutPaymentValidationSchema = Yup.object({
  transactionReference: Yup.string()
    .trim()
    .required("Transaction reference is required")
    .min(3, "Transaction reference must be at least 3 characters")
    .max(150, "Transaction reference must be at most 150 characters"),
  paymentProofUrl: Yup.string().required("Payment proof is required"),
  adminNote: referralPayoutAdminNote,
});

const shipmentTrackingNoteSchema = Yup.string().when("status", {
  is: (status) => ["failed", "rto", "cancelled"].includes(status),
  then: (schema) =>
    schema
      .trim()
      .required("Add a reason of at least 3 characters.")
      .min(3, "Add a reason of at least 3 characters.")
      .max(500, "Note must be at most 500 characters."),
  otherwise: (schema) =>
    schema
      .max(500, "Note must be at most 500 characters.")
      .test(
        "minimum-note-length",
        "Note must be at least 3 characters.",
        (value) => !value || value.trim().length >= 3,
      ),
});

export const shipmentTrackingActionValidationSchema = Yup.object({
  status: Yup.string().required("Select a shipment status."),
  location: Yup.string()
    .trim()
    .max(200, "Location must be at most 200 characters.")
    .test(
      "minimum-location-length",
      "Location must be at least 3 characters.",
      (value) => !value || value.length >= 3,
    )
    .test(
      "readable-location",
      "Enter a readable location, not only numbers.",
      (value) => !value || !/^\d+$/.test(value),
    ),
  note: shipmentTrackingNoteSchema,
  courierName: Yup.string().when("status", {
    is: "in_transit",
    then: (schema) =>
      schema
        .trim()
        .required("Courier or delivery method is required.")
        .max(100, "Courier or delivery method must be at most 100 characters."),
    otherwise: (schema) => schema,
  }),
  awbNumber: Yup.string().when("status", {
    is: "in_transit",
    then: (schema) =>
      schema
        .trim()
        .required("Tracking reference is required.")
        .min(5, "Tracking reference must be 5–50 characters.")
        .max(50, "Tracking reference must be 5–50 characters.")
        .matches(
          /^[A-Za-z0-9_/-]+$/,
          "Allowed: letters, numbers, -, _, and / only.",
        ),
    otherwise: (schema) => schema,
  }),
  expectedDeliveryAt: Yup.string().when("status", {
    is: "in_transit",
    then: (schema) =>
      schema
        .required("Expected delivery date is required.")
        .test(
          "future-date",
          "Expected delivery must be in the future.",
          (value) => Boolean(value) && new Date(value).getTime() > Date.now(),
        ),
    otherwise: (schema) => schema,
  }),
  trackingUrl: Yup.string()
    .trim()
    .max(2048, "Tracking URL must be at most 2048 characters.")
    .test(
      "valid-tracking-url",
      "Enter a valid http:// or https:// tracking URL.",
      (value) => {
        if (!value) return true;
        try {
          const parsedUrl = new URL(value);
          return ["http:", "https:"].includes(parsedUrl.protocol);
        } catch {
          return false;
        }
      },
    ),
});

const taxRateSchema = (label) =>
  Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? undefined : value,
    )
    .typeError(`${label} must be a number`)
    .required(`${label} is required`)
    .min(0.01, `${label} must be between 0.01 and 100`)
    .max(100, `${label} must be between 0 and 100`);

export const hsnValidationSchema = Yup.object({
  code: Yup.string()
    .trim()
    .required("HSN Code is required")
    .matches(/^\d{4,8}$/, "Must be 4-8 digits")
    .matches(/^(?!0+$)\d+$/, "HSN Code cannot be all zeroes"),
  description: Yup.string()
    .trim()
    .required("Description is required")
    .transform((value) => (value === "" ? undefined : value))

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
    .min(0.01, "Additional Tax must be between 0.01 and 100")
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
  subTaxes_id: Yup.array().of(Yup.string()).min(1, "Sub Tax is required"),
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

export const payoutRetryValidationSchema = Yup.object({
  paymentMethod: Yup.string().notRequired(),
  paymentReference: Yup.string().when("paymentMethod", {
    is: (method) => method !== "razorpayx",
    then: (schema) =>
      schema
        .trim()
        .required("Payment reference is required")
        .min(3, "Payment reference must be at least 3 characters")
        .max(200, "Payment reference must be at most 200 characters"),
    otherwise: (schema) => schema.notRequired(),
  }),
});

export const payoutCancellationValidationSchema = Yup.object({
  reason: Yup.string()
    .trim()
    .required("Cancellation reason is required")
    .min(3, "Cancellation reason must be at least 3 characters")
    .max(500, "Cancellation reason must be at most 500 characters"),
});

export const payoutReleaseValidationSchema = Yup.object({
  paymentMethod: Yup.string().notRequired(),
  approve: Yup.boolean().when("paymentMethod", {
    is: "razorpayx",
    then: (schema) =>
      schema.oneOf(
        [true],
        "Approve on release is required for RazorpayX payouts",
      ),
  }),
  note: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, "Note must be at least 3 characters")
    .max(500, "Note must be at most 500 characters"),
});

export const approvePaymentValidationSchema = Yup.object({
  referenceId: Yup.string()
    .trim()
    .required("Collection or bank reference is required")
    .min(3, "Reference must be at least 3 characters")
    .max(150, "Reference must be at most 150 characters"),
  reason: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, "Additional notes must be at least 3 characters")
    .max(500, "Additional notes must be at most 500 characters"),
});

export const rejectPaymentValidationSchema = Yup.object({
  reason: Yup.string()
    .trim()
    .required("Rejection reason is required")
    .min(3, "Rejection reason must be at least 3 characters")
    .max(500, "Rejection reason must be at most 500 characters"),
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

export const approveReturnValidationSchema = Yup.object({
  refundAmount: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value,
    )
    .typeError("Refund amount must be a number")
    .required("Refund amount is required")
    .moreThan(0, "Refund amount must be greater than zero"),
  itemActions: Yup.array()
    .min(1, "At least one return item is required")
    .required("Return items are required"),
  note: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, "Note must be at least 3 characters")
    .max(500, "Note must be at most 500 characters"),
});

export const orderNoteValidationSchema = Yup.object({
  note: Yup.string()
    .trim()
    .required("Note is required")
    .min(3, "Note must be at least 3 characters")
    .max(500, "Note must be no more than 500 characters"),
  visibility: Yup.string()
    .oneOf(["internal", "seller", "buyer"], "Select a valid visibility")
    .required("Visibility is required"),
});

export const orderStatusOverrideValidationSchema = Yup.object({
  status: Yup.string().trim().required("Status is required"),
  reason: Yup.string().when("status", {
    is: "cancelled",
    then: (schema) =>
      schema
        .trim()
        .required("Please enter a cancellation reason.")
        .min(10, "Reason must be at least 10 characters.")
        .max(2000, "Reason must be no more than 2000 characters."),
    otherwise: (schema) =>
      schema
        .transform((value) => (value?.trim() ? value.trim() : undefined))
        .notRequired()
        .min(3, "Reason must be at least 3 characters.")
        .max(2000, "Reason must be no more than 2000 characters."),
  }),
  note: Yup.string()
    .max(500, "Note must be no more than 500 characters.")
    .min(3, "Note must be at least 3 characters."),
});

const cmsOptionalText = (label, min = 2, max = 120) =>
  Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be no more than ${max} characters`);

const cmsRequiredText = (label, min = 2, max = 120) =>
  Yup.string()
    .trim()
    .required(`${label} is required`)
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be no more than ${max} characters`);

const cmsOptionalTextMax = (label, max) =>
  Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .max(max, `${label} must be no more than ${max} characters`);

const cmsBoundedNumber = (label, min, max) =>
  Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value,
    )
    .typeError(`${label} must be a number`)
    .integer(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be no more than ${max}`);

const cmsImageValidationSchema = Yup.object({
  url: cmsOptionalText("Image URL", 2, 2048),
  alt: cmsOptionalTextMax("Image alt text", 150),
  title: cmsOptionalText("Image title", 2, 120),
  caption: cmsOptionalText("Image caption", 2, 500),
  type: cmsOptionalText("Image type", 2, 60),
});

const cmsCtaValidationSchema = Yup.object({
  label: cmsOptionalText("CTA label", 2, 50),
  url: cmsOptionalText("CTA URL", 2, 2048),
  target: cmsOptionalText("CTA target", 2, 30),
});

const cmsPointValidationSchema = Yup.object({
  title: cmsOptionalText("Point title", 2, 120),
  description: cmsOptionalText("Point description", 3, 2000),
  sortOrder: cmsBoundedNumber("Point sort order", 0, 99999),
  image: cmsImageValidationSchema,
  cta: cmsCtaValidationSchema,
});

const cmsSectionValidationSchema = Yup.object({
  type: cmsOptionalText("Section type", 2, 60),
  title: cmsOptionalText("Section title", 2, 100),
  description: cmsOptionalText("Section description", 3, 5000),
  sortOrder: cmsBoundedNumber("Section sort order", 0, 99999),
  image: cmsImageValidationSchema,
  gallery: Yup.array()
    .of(cmsImageValidationSchema)
    .max(50, "A section can have no more than 50 gallery images"),
  points: Yup.array()
    .of(cmsPointValidationSchema)
    .max(100, "A section can have no more than 100 points"),
  cta: cmsCtaValidationSchema,
});

const cmsOptionalTextList = (label, maxItems = 100) =>
  Yup.array()
    .of(cmsOptionalText(label, 2, 100))
    .max(maxItems, `${label} can contain no more than ${maxItems} items`);

export const contentPageValidationSchema = Yup.object({
  title: cmsRequiredText("Title", 2, 100),
  slug: cmsRequiredText("Slug", 2, 150),
  pageType: cmsRequiredText("Page type", 2, 60),
  category: cmsOptionalText("Category", 2, 100),
  language: cmsOptionalText("Language", 2, 12),
  sortOrder: cmsBoundedNumber("Sort order", 0, 99999),
  description: cmsOptionalText("Description", 3, 1000),
  excerpt: cmsOptionalText("Excerpt", 3, 500),
  body: cmsOptionalText("Body content", 3, 100000),
  image: cmsImageValidationSchema,
  gallery: Yup.array()
    .of(cmsImageValidationSchema)
    .max(100, "A page can have no more than 100 gallery images"),
  galleryImages: cmsOptionalTextList("Gallery image URL", 100),
  sections: Yup.array()
    .of(cmsSectionValidationSchema)
    .max(100, "A page can have no more than 100 sections"),
  points: Yup.array()
    .of(cmsPointValidationSchema)
    .max(100, "A page can have no more than 100 points"),
  cta: cmsCtaValidationSchema,
  tags: cmsOptionalTextList("Tag", 100),
  visibility: Yup.object({
    channels: cmsOptionalTextList("Channel", 20),
    roles: cmsOptionalTextList("Role", 50),
  }),
  seo: Yup.object({
    metaTitle: cmsOptionalTextMax("Meta title", 60),
    metaDescription: cmsOptionalText("Meta description", 3, 160),
    keywords: cmsOptionalTextList("SEO keyword", 100),
    focusKeyword: cmsOptionalText("Focus keyword", 2, 100),
    canonicalUrl: cmsOptionalText("Canonical URL", 2, 2048),
    robots: cmsOptionalText("Robots value", 2, 100),
    ogTitle: cmsOptionalText("Open Graph title", 2, 100),
    ogDescription: cmsOptionalText("Open Graph description", 3, 500),
    ogImage: cmsImageValidationSchema,
    twitterTitle: cmsOptionalText("Twitter title", 2, 100),
    twitterDescription: cmsOptionalText("Twitter description", 3, 500),
    twitterImage: cmsImageValidationSchema,
    schemaType: cmsOptionalText("Schema type", 2, 100),
    schemaJson: Yup.mixed().test(
      "schema-json-size",
      "Schema JSON must be no more than 100000 characters",
      (value) => JSON.stringify(value || {}).length <= 100000,
    ),
    breadcrumbs: Yup.array()
      .of(Yup.mixed())
      .max(100, "No more than 100 breadcrumbs are allowed"),
  }),
  author: Yup.object({
    name: cmsOptionalText("Author name", 2, 100),
    avatar: cmsOptionalText("Author avatar URL", 2, 2048),
  }),
  publishedAt: Yup.string()
    .transform((value) => (value?.trim() ? value : undefined))
    .notRequired()
    .min(16, "Publish date and time must be at least 16 characters")
    .max(35, "Publish date and time must be no more than 35 characters")
    .test(
      "valid-published-at",
      "Enter a valid publish date and time",
      (value) => value === undefined || !Number.isNaN(Date.parse(value)),
    ),
  coverImage: cmsOptionalText("Cover image URL", 2, 2048),
  thumbnailUrl: cmsOptionalText("Thumbnail URL", 2, 2048),
  heroImage: cmsOptionalText("Hero image URL", 2, 2048),
  metadata: Yup.mixed().test(
    "metadata-size",
    "Metadata JSON must be between 2 and 100000 characters",
    (value) => {
      const length = JSON.stringify(value || {}).length;
      return length >= 2 && length <= 100000;
    },
  ),
});

const optionalShippingNumber = (label) =>
  Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value,
    )
    .typeError(`${label} must be a number`)
    .notRequired()
    .min(0, `${label} cannot be negative`);

const MAX_SHIPPING_AMOUNT = 10000;
const MAX_SHIPPING_ETA_DAYS = 365;

export const shippingProfileValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Profile name is required")
    .min(2, "Profile name must be at least 2 characters")
    .max(100, "Profile name must be at most 100 characters"),
  description: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, "Description must be at least 3 characters")
    .max(500, "Description must be at most 500 characters"),
  organizationId: Yup.string().notRequired(),
  sellerId: Yup.string().required("Select a target seller"),
  shippingMethod: Yup.string()
    .oneOf(["standard", "express", "same_day", "hyperlocal"])
    .required("Select a shipping method"),
  serviceabilityMode: Yup.string()
    .oneOf(["all_india", "selected_pincodes"])
    .required("Select a serviceability mode"),
  allowedPincodes: Yup.array().when("serviceabilityMode", {
    is: "selected_pincodes",
    then: (schema) =>
      schema
        .test(
          "valid-indian-pincodes",
          "Each pincode must contain 6 digits and cannot start with 0",
          (pincodes = []) =>
            pincodes.every((pincode) => /^[1-9]\d{5}$/.test(pincode)),
        )
        .min(1, "Add at least one allowed pincode")
        .required("Add at least one allowed pincode"),
    otherwise: (schema) => schema,
  }),
  pincodeDraft: Yup.string()
    .notRequired()
    .test(
      "valid-pincode-draft",
      "Pincode must contain 6 digits and cannot start with 0",
      (value) => !value || /^[1-9]\d{5}$/.test(value),
    )
    .test(
      "unique-pincode-draft",
      "This pincode is already added",
      function (value) {
        return !value || !(this.parent.allowedPincodes || []).includes(value);
      },
    ),
  codAvailable: Yup.boolean(),
  shippingCharge: optionalShippingNumber("Shipping charge").max(
    MAX_SHIPPING_AMOUNT,
    "Shipping charge cannot exceed ₹10,000",
  ),
  freeShippingThreshold: optionalShippingNumber("Free shipping threshold").max(
    MAX_SHIPPING_AMOUNT,
    "Free shipping threshold cannot exceed ₹10,000",
  ),
  etaMin: optionalShippingNumber("Minimum ETA")
    .integer("Minimum ETA must be a whole number")
    .max(
      MAX_SHIPPING_ETA_DAYS,
      `Minimum ETA cannot exceed ${MAX_SHIPPING_ETA_DAYS} days`,
    ),
  etaMax: optionalShippingNumber("Maximum ETA")
    .integer("Maximum ETA must be a whole number")
    .max(
      MAX_SHIPPING_ETA_DAYS,
      `Maximum ETA cannot exceed ${MAX_SHIPPING_ETA_DAYS} days`,
    )
    .when("etaMin", ([etaMin], schema) =>
      etaMin === undefined
        ? schema
        : schema.min(etaMin, "Maximum ETA must be at least the minimum ETA"),
    ),
  isDefault: Yup.boolean(),
  active: Yup.boolean(),
});

export const shippingProfileCloneValidationSchema = Yup.object({
  templateId: Yup.string().required("Select an admin template"),
  sellerId: Yup.string().required("Select a seller"),
  organizationId: Yup.string().notRequired(),
  name: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(2, "Profile name must be at least 2 characters")
    .max(100, "Profile name must be at most 100 characters"),
  description: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, "Description must be at least 3 characters")
    .max(500, "Description must be at most 500 characters"),
  isDefault: Yup.boolean(),
  active: Yup.boolean(),
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

export const codCollectionValidationSchema = Yup.object({
  collectedAmount: Yup.number()
    .transform((value, originalValue) =>
      typeof originalValue === "string" && originalValue.trim() === ""
        ? undefined
        : value,
    )
    .typeError("Enter a valid collected amount")
    .required("Collected amount is required")
    .min(0, "Collected amount cannot be negative")
    .test(
      "valid-amount",
      "Only numbers and up to 2 decimal places are allowed",
      (_, context) => {
        const value = context.originalValue;

        if (value === "" || value === undefined || value === null) {
          return true;
        }

        return /^\d+(\.\d{1,2})?$/.test(String(value).trim());
      },
    ),
  referenceId: Yup.string()
    .trim()
    .required("Collection reference is required")
    .min(3, "Collection reference must be at least 3 characters")
    .max(100, "Collection reference must be no more than 100 characters"),

  notes: Yup.string()
    .max(500, "Notes must be no more than 500 characters")
    .min(3, "Notes must be at least 3 characters"),

  markRemitted: Yup.boolean().required("Remittance status is required"),
});

export const brandValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Brand name is required")
    .min(2, "Brand name must be at least 2 characters")
    .max(200, "Brand name must be no more than 200 characters"),

  logo: Yup.string().required("Please upload a brand logo"),

  description: Yup.string()
    .min(3, "Description must be at least 3 characters")
    .max(1000, "Description must be no more than 1000 characters"),
});
export const bonusRuleValidationSchema = Yup.object({
  ruleName: Yup.string().trim().required("Bonus rule name is required"),

  period: Yup.string().required("Please select a bonus period"),

  targetType: Yup.string().required("Please select a target type"),

  customStartAt: Yup.string().when("period", {
    is: "custom",
    then: (schema) => schema.required("Custom start date is required"),
    otherwise: (schema) => schema.notRequired(),
  }),

  customEndAt: Yup.string().when("period", {
    is: "custom",
    then: (schema) =>
      schema
        .required("Custom end date is required")
        .test(
          "end-date-after-start",
          "End date must be on or after the start date",
          function (value) {
            const { customStartAt } = this.parent;

            if (!value || !customStartAt) {
              return true;
            }

            return value >= customStartAt;
          },
        ),
    otherwise: (schema) => schema.notRequired(),
  }),

  targetValue: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value,
    )
    .typeError("Target value must be a valid number")
    .required("Target value is required")
    .moreThan(0, "Target value must be greater than 0"),

  bonusType: Yup.string().required("Please select a bonus type"),

  bonusValue: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value,
    )
    .typeError("Bonus value must be a valid number")
    .required("Bonus value is required")
    .moreThan(0, "Bonus value must be greater than 0"),

  applyTo: Yup.string().required("Please select where the bonus applies"),

  resetCycle: Yup.string().required("Please select a reset cycle"),

  releaseRule: Yup.string().required("Please select a release rule"),

  status: Yup.string()
    .oneOf(["active", "inactive"], "Please select a valid status")
    .required("Status is required"),
});
export const authTestimonialValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Reviewer name is required")
    .min(2, "Reviewer name must be at least 2 characters")
    .max(100, "Reviewer name must be no more than 100 characters")
    .matches(/^[A-Za-z\s.'-]+$/, "Enter a valid reviewer name"),

  avatarUrl: Yup.string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .notRequired()
    .url("Enter a valid avatar URL")
    .max(2048, "Avatar URL must be no more than 2048 characters"),

  rating: Yup.number()
    .transform((value, originalValue) => (originalValue === "" ? NaN : value))
    .typeError("Rating must be a number")
    .required("Rating is required")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be no more than 5"),

  reviewText: Yup.string()
    .trim()
    .required("Review text is required")
    .min(10, "Review text must be at least 10 characters")
    .max(2000, "Review text must be no more than 2000 characters"),

  googleRating: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? undefined : value,
    )
    .typeError("Google rating must be a number")
    .notRequired()
    .min(0, "Google rating cannot be less than 0")
    .max(5, "Google rating must be no more than 5"),

  googleReviewCount: Yup.string()
    .trim()
    .max(50, "Google review count must be no more than 50 characters"),

  googlePlaceUrl: Yup.string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .notRequired()
    .url("Enter a valid Google Place / Review URL")
    .max(
      2048,
      "Google Place / Review URL must be no more than 2048 characters",
    ),

  pageTarget: Yup.string()
    .required("Please select where the testimonial should appear")
    .oneOf(["all", "login", "register"], "Select a valid display location"),

  sortOrder: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? undefined : value,
    )
    .typeError("Sort order must be a number")
    .notRequired()
    .integer("Sort order must be a whole number")
    .min(0, "Sort order cannot be negative"),

  published: Yup.boolean().required("Please select a publication status"),
});

export const generateInvoiceValidationSchema = Yup.object({
  orderId: Yup.string().trim().required("Order ID is required"),
});

export const dealProductValidationSchema = Yup.object({
  sellerId: Yup.string().when("mode", {
    is: "seller_request",
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema.required("Please select a seller"),
  }),
  productId: Yup.string().required("Please select a product"),
  variantId: Yup.string().test(
    "variant-required",
    "Please select a product variant",
    function (value) {
      return Boolean(value || this.parent.variantSku);
    },
  ),
  variantSku: Yup.string().notRequired(),
  title: Yup.string()
    .trim()
    .required("Deal title is required")
    .min(2, "Deal title must be at least 2 characters")
    .max(120, "Deal title must be no more than 120 characters"),
  dealType: Yup.string().notRequired(),
  dealSource: Yup.string().notRequired(),
  allocatedQuantity: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value,
    )
    .typeError("Deal quantity must be a number")
    .integer("Deal quantity must be a whole number")
    .min(0, "Deal quantity cannot be negative")
    .notRequired(),
  maxQuantityPerOrder: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value,
    )
    .typeError("Maximum quantity must be a number")
    .integer("Maximum quantity must be a whole number")
    .min(1, "Maximum quantity must be at least 1")
    .notRequired(),
  startAt: Yup.string().required("Please select the deal period"),
  endAt: Yup.string()
    .required("Please select the deal period")
    .test(
      "end-date-after-start",
      "End date must be after the start date",
      function (endAt) {
        const { startAt } = this.parent;
        if (!startAt || !endAt) return true;
        return new Date(endAt).getTime() > new Date(startAt).getTime();
      },
    ),
  dealBadge: Yup.string().notRequired(),
  priority: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? undefined : value,
    )
    .typeError("Priority must be a number")
    .integer("Priority must be a whole number")
    .min(0, "Priority cannot be negative")
    .notRequired(),
  reason: Yup.string().when("mode", {
    is: "seller_request",
    then: (schema) => schema.trim().required("Reason is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  message: Yup.string().notRequired(),
});

export const negativeBalanceRecoverySchema = Yup.object({
  resolveAction: Yup.string()
    .oneOf(
      ["collected_from_seller", "platform_write_off"],
      "Please select a valid recovery action",
    )
    .required("Please select a recovery action"),

  referenceId: Yup.string().when("resolveAction", {
  is: "collected_from_seller",
  then: (schema) =>
    schema
      .trim()
      .required("Payment reference ID is required"),
  otherwise: (schema) => schema.notRequired(),
}),

  note: Yup.string()
    .trim()
    .when("resolveAction", {
      is: "platform_write_off",
      then: (schema) =>
        schema
          .required("Approved write-off reason is required")
          .min(3, "Write-off reason must be at least 3 characters")
          .max(1000, "Write-off reason must be no more than 1000 characters"),
      otherwise: (schema) =>
        schema
          .required("Payment note is required")
          .min(3, "Payment note must be at least 3 characters")
          .max(1000, "Payment note must be no more than 1000 characters"),
    }),
});
