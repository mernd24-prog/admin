import { min } from "moment";
import * as Yup from "yup";

export const MAX_PRODUCT_MONEY = 999999999.99;

const productDescriptionText = (value = "") => {
  if (typeof document === "undefined") {
    return String(value)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
      .replace(/&amp;/gi, "&")
      .trim();
  }

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = String(value);
  return (tempDiv.textContent || "").trim();
};

export const productBasicDetailsValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Product name is required.")
    .min(3, "Product name must be at least 3 characters.")
    .max(200, "Product name must not be more than 200 characters.")
    .test(
      "has-letter",
      "Product name must contain at least one letter.",
      (value) => !value || /\p{L}/u.test(value),
    )
    .test(
      "no-repeated-spaces",
      "Product name cannot contain repeated spaces.",
      (value) => !value || !/ {2,}/u.test(value),
    )
    .test(
      "no-only-spaces",
      "Product name cannot contain only spaces.",
      (value) => !value || value.trim().length > 0,
    )
    .test(
      "no-html-tags",
      "HTML tags are not allowed in the product name.",
      (value) => !value || !/<[^>]*>/u.test(value),
    )
    .test(
      "no-control-characters",
      "Product name contains invalid characters.",
      (value) => !value || !/[\u0000-\u001F\u007F]/u.test(value),
    ),
  description: Yup.string()
    .strict(true)
    .required("Description is required.")
    .test(
      "description-length",
      "Description must be at least 10 characters.",
      (value) => {
        const length = productDescriptionText(value).length;
        return length === 0 || length >= 10;
      },
    )
    .test(
      "description-max",
      "Description must not be more than 5000 characters.",
      (value) => productDescriptionText(value).length <= 5000,
    ),
  shortDescription: Yup.string().max(
    500,
    "Short description must be 500 characters or fewer.",
  ),

  tags: Yup.array()
    .ensure()
    .of(Yup.string().required("Tag cannot be empty."))
    .test("product-tags", function (tags = []) {
      const createError = (message) => this.createError({ message });

      if (!tags.length) {
        return createError("Add at least one tag.");
      }

      if (tags.length > 20) {
        return createError("You can add a maximum of 20 tags.");
      }

      const normalizedTags = tags.map((tag) => String(tag ?? "").trim());

      if (normalizedTags.some((tag) => !tag)) {
        return createError("Empty tags are not allowed.");
      }

      if (normalizedTags.some((tag) => tag.length < 2)) {
        return createError("Each tag must contain at least 2 characters.");
      }

      if (normalizedTags.some((tag) => tag.length > 40)) {
        return createError("Each tag cannot exceed 40 characters.");
      }

      const invalidTag = normalizedTags.some(
        (tag) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag),
      );

      if (invalidTag) {
        return createError(
          "Use lowercase letters, numbers, and single hyphens only. Tags cannot start or end with a hyphen.",
        );
      }

      const uniqueTags = new Set(
        normalizedTags.map((tag) => tag.toLowerCase()),
      );

      if (uniqueTags.size !== normalizedTags.length) {
        return createError("Duplicate tags are not allowed.");
      }

      return true;
    }),

  sellerId: Yup.string().when("$isSellerPanelUser", {
    is: true,
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema.required("Seller is required."),
  }),
  organizationId: Yup.string().when("$isSellerPanelUser", {
    is: true,
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema.required("Organization is required."),
  }),
  brand: Yup.string().test(
    "brand-required",
    "Brand is required.",
    function (value) {
      return Boolean(
        String(
          value || this.parent.brandId || this.parent.brand_id || "",
        ).trim(),
      );
    },
  ),
  category_id: Yup.string().test(
    "category-required",
    "Category is required.",
    function (value) {
      return Boolean(
        value ||
        this.parent.categoryId ||
        this.parent.category ||
        this.parent.category_key,
      );
    },
  ),
  hsn_code: Yup.string().test(
    "hsn-required",
    "HSN Code is required.",
    function (value) {
      return Boolean(
        String(value || this.parent.hsnCode || this.parent.hsn_id || "").trim(),
      );
    },
  ),
  warranty: Yup.object({
    enabled: Yup.boolean(),
    period: Yup.number()
      .transform((value, originalValue) =>
        originalValue === "" || originalValue == null ? undefined : value,
      )
      .typeError("Warranty period must be a whole number between 1 and 365.")
      .when("enabled", {
        is: true,
        then: (schema) =>
          schema
            .integer(
              "Warranty period must be a whole number between 1 and 365.",
            )
            .min(1, "Warranty period must be a whole number between 1 and 365.")
            .max(
              365,
              "Warranty period must be a whole number between 1 and 365.",
            )
            .required("Warranty period is required."),
        otherwise: (schema) => schema.notRequired(),
      }),
    periodUnit: Yup.string().when("enabled", {
      is: true,
      then: (schema) =>
        schema
          .oneOf(
            ["days", "weeks", "months", "years"],
            "Warranty unit is required.",
          )
          .required("Warranty unit is required."),
      otherwise: (schema) => schema.notRequired(),
    }),
    provider: Yup.string().when("enabled", {
      is: true,
      then: (schema) =>
        schema
          .trim()
          .required("Warranty provider is required.")
          .max(100, "Warranty provider must be 100 characters or fewer."),
      otherwise: (schema) => schema.notRequired(),
    }),
    type: Yup.string().when("enabled", {
      is: true,
      then: (schema) =>
        schema
          .trim()
          .required("Warranty type is required.")
          .max(100, "Warranty type must be 100 characters or fewer."),
      otherwise: (schema) => schema.notRequired(),
    }),
    terms: Yup.string().when("enabled", {
      is: true,
      then: (schema) =>
        schema
          .test(
            "warranty-terms-minimum",
            "Warranty terms must be at least 10 characters.",
            (value) => {
              const length = productDescriptionText(value).length;
              return length === 0 || length >= 10;
            },
          )
          .test(
            "warranty-terms-maximum",
            "Warranty terms must be 1000 characters or fewer.",
            (value) => productDescriptionText(value).length <= 1000,
          ),
      otherwise: (schema) => schema.notRequired(),
    }),
    returnPolicy: Yup.object({
      returnable: Yup.boolean(),
      type: Yup.string().when("returnable", {
        is: true,
        then: (schema) =>
          schema.test(
            "valid-return-policy-type",
            "Select a valid return policy type.",
            (value) =>
              ["standard", "replacement_only", "non_returnable"].includes(
                value || "standard",
              ),
          ),
        otherwise: (schema) => schema.notRequired(),
      }),
      resolution: Yup.string().when("returnable", {
        is: true,
        then: (schema) =>
          schema.test(
            "valid-return-resolution",
            "Select a valid return resolution.",
            (value) =>
              ["refund", "replacement", "refund_or_replacement"].includes(
                value || "refund_or_replacement",
              ),
          ),
        otherwise: (schema) => schema.notRequired(),
      }),
      shippingPaidBy: Yup.string().when("returnable", {
        is: true,
        then: (schema) =>
          schema.test(
            "valid-return-shipping-payer",
            "Select a valid return shipping responsibility.",
            (value) =>
              ["platform", "seller", "customer"].includes(value || "seller"),
          ),
        otherwise: (schema) => schema.notRequired(),
      }),
      returnWindowDays: Yup.number()
        .transform((value, originalValue) =>
          originalValue === "" || originalValue == null ? undefined : value,
        )
        .typeError("Return window must be between 1 and 365 days.")
        .when("returnable", {
          is: true,
          then: (schema) =>
            schema.test(
              "valid-return-window",
              "Return window is required.",
              function (value) {
                const windowDays = value ?? this.parent.days;
                if (
                  windowDays === undefined ||
                  windowDays === null ||
                  windowDays === ""
                ) {
                  return this.createError({
                    message: "Return window is required.",
                  });
                }

                const numberOfDays = Number(windowDays);
                if (
                  !Number.isInteger(numberOfDays) ||
                  numberOfDays < 1 ||
                  numberOfDays > 365
                ) {
                  return this.createError({
                    message: "Return window must be between 1 and 365 days.",
                  });
                }

                return true;
              },
            ),
          otherwise: (schema) => schema.notRequired(),
        }),
    }),
  }),
});

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
        .min(5, "Tracking reference must be 5–100 characters.")
        .max(100, "Tracking reference must be 5–100 characters.")
        .matches(
          /^[A-Za-z0-9\/-]+$/,
          "Use letters, numbers, hyphens, and forward slashes only.",
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
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .max(2048, "Tracking URL cannot exceed 2048 characters.")
    .test(
      "valid-tracking-url",
      "Please enter a valid URL starting with http:// or https://.",
      (value) => {
        if (!value) return true;

        try {
          const parsedUrl = new URL(value);

          return (
            ["http:", "https:"].includes(parsedUrl.protocol) &&
            Boolean(parsedUrl.hostname) &&
            (parsedUrl.hostname.includes(".") ||
              parsedUrl.hostname === "localhost")
          );
        } catch {
          return false;
        }
      },
    ),
});

const taxRateSchema = (label, required = true) => {
  const schema = Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? undefined : value,
    )
    .typeError(`${label} must be a number`)
    .min(0, `${label} must be between 0 and 100`)
    .max(100, `${label} must be between 0 and 100`);

  return required
    ? schema.required(`${label} is required`)
    : schema.notRequired();
};

export const hsnValidationSchema = Yup.object({
  code: Yup.string()
    .trim()
    .required("HSN Code is required")
    .matches(/^\d{4,8}$/, "HSN Code must be 4-8 digits")
    .matches(/^(?!0+$)\d+$/, "HSN Code cannot be all zeroes"),
  description: Yup.string()
    .trim()
    .required("Description is required")
    .transform((value) => (value === "" ? undefined : value))

    .min(3, "Description must be at least 3 characters")
    .max(100, "Description must be no more than 100 characters"),
  gstRate: taxRateSchema("GST rate"),
  cessRate: taxRateSchema("Compensation cess", false),
});

export const taxValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Tax name is required")
    .min(2, "Min 2 characters")
    .max(100, "Max 100 characters"),
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
    .min(3, "Min 3 characters")
    .max(100, "Max 100 characters"),
  percentage: Yup.string()
    .required("Percentage is required")
    .matches(
      /^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/,
      "Enter a number with up to 2 decimal places and no unnecessary leading zeros",
    )
    .test("percentage-range", "Must be between 0 and 100", (value) => {
      if (!value || !/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(value)) {
        return true;
      }
      const percentage = Number(value);
      return percentage >= 0 && percentage <= 100;
    }),
  taxId: Yup.string().required("Parent tax is required"),
});

export const taxRuleValidationSchema = Yup.object({
  description: Yup.string()
    .trim()
    .required("Description is required")
    .min(3, "Min 3 characters")
    .max(2000, "Max 2000 characters"),
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
    .min(0, `${label} cannot be negative`)
    .max(
      MAX_PRODUCT_MONEY,
      `${label} must be at most 15 digits with up to 2 decimal places`,
    );

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
    .moreThan(0, "Taxable amount must be greater than zero")
    .max(
      MAX_PRODUCT_MONEY,
      "Taxable amount must be at most 15 digits with up to 2 decimal places",
    ),
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
    .min(10, "Note must be at least 10 characters."),

  cancelItems: Yup.object().when("status", {
    is: "cancelled",
    then: (schema) =>
      schema.test(
        "at-least-one-product",
        "Please select at least one product to cancel.",
        (value) => Object.keys(value || {}).length > 0,
      ),
    otherwise: (schema) => schema.notRequired(),
  }),
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

export const productSeoValidationSchema = Yup.object({
  keywords: Yup.array()
    .ensure()
    .of(
      Yup.string()
        .required("Keywords cannot be empty.")
        .min(2, "Each SEO keyword must be at least 2 characters.")
        .max(60, "Each SEO keyword must be 60 characters or fewer.")
        .matches(
          /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/,
          "Use letters and numbers with single spaces between words only.",
        ),
    )
    .min(1, "Add at least one SEO keyword.")
    .max(20, "Use no more than 20 SEO keywords.")
    .test(
      "unique-keywords",
      "SEO keywords must be unique, ignoring letter case.",
      (keywords = []) =>
        new Set(keywords.map((keyword) => String(keyword).toLowerCase()))
          .size === keywords.length,
    ),
  metaTitle: Yup.string()
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .nullable()
    .test(
      "not-blank",
      "Meta title cannot be empty or blank spaces.",
      (value) =>
        value === null || value === undefined || value.trim().length > 0,
    )
    .max(70, "Meta title must be 70 characters or fewer.")
    .min(3, "Meta title must be at least 3 characters."),

  metaDescription: Yup.string()
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .nullable()
    .test(
      "not-blank",
      "Meta description cannot be empty or blank spaces.",
      (value) =>
        value === null || value === undefined || value.trim().length > 0,
    )
    .max(160, "Meta description must be 160 characters or fewer.")
    .min(3, "Meta description must be at least 3 characters."),

  canonicalUrl: Yup.string()
    .nullable()
    .max(2048, "Canonical URL must  be 2048 characters or fewer.")
    .test("http-url", "Canonical URL must use HTTP or HTTPS.", (value) => {
      if (!value) return true;

      try {
        const url = new URL(value.trim());
        return (
          ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname)
        );
      } catch {
        return false;
      }
    }),
  ogTitle: Yup.string()
    .nullable()
    .max(70, "Open Graph title must be 70 characters or fewer.")
    .test(
      "min-length",
      "Open Graph title must be at least 3 characters.",
      (value) => !value || value.trim().length >= 3,
    ),

  ogDescription: Yup.string()
    .nullable()
    .max(160, "Open Graph description must be 160 characters or fewer.")
    .test(
      "min-length",
      "Open Graph description must be at least 3 characters.",
      (value) => !value || value.trim().length >= 3,
    ),
  ogImage: Yup.string()
    .nullable()
    .max(2048, "OG Image URL must be 2048 characters or fewer.")
    .test(
      "http-url",
      "Pasted image URLs must be valid HTTP/HTTPS URLs.",
      (value) => {
        if (!value) return true;
        try {
          const url = new URL(value.trim());
          return (
            ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname)
          );
        } catch {
          return false;
        }
      },
    ),
});

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
    metaTitle: Yup.string()
      .transform((value) => (typeof value === "string" ? value.trim() : value))
      .nullable()
      .test(
        "not-blank",
        "Meta title cannot be empty or blank spaces.",
        (value) =>
          value === null || value === undefined || value.trim().length > 0,
      )
      .max(60, "Meta title must be no more than 60 characters")
      .min(3, "Meta title must be at least 3 characters"),
    metaDescription: Yup.string()
      .transform((value) => (typeof value === "string" ? value.trim() : value))
      .nullable()
      .test(
        "not-blank",
        "Meta description cannot be empty or blank spaces.",
        (value) =>
          value === null || value === undefined || value.trim().length > 0,
      )
      .min(3, "Meta description must be at least 3 characters")
      .max(160, "Meta description must be no more than 160 characters"),
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
    .required("Minimum ETA is required")
    .max(
      MAX_SHIPPING_ETA_DAYS,
      `Minimum ETA cannot exceed ${MAX_SHIPPING_ETA_DAYS} days`,
    ),
  etaMax: optionalShippingNumber("Maximum ETA")
    .integer("Maximum ETA must be a whole number")
    .required("Maximum ETA is required")
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
  notes: optionalTextWithLength("Verification note", 1000),
});

export const brandValidationSchema = Yup.object({
  _id: Yup.string().optional(),
  name: Yup.string()
    .transform((value) =>
      typeof value === "string" ? value.trim().replace(/ +/g, " ") : value,
    )
    .required("Brand name is required.")
    .min(2, "Brand name must contain at least 2 characters.")
    .max(50, "Brand name cannot exceed 50 characters.")
    .matches(
      /^[\p{L}\p{N}][\p{L}\p{M}\p{N} &.'’\-]*$/u,
      "Start with a letter or number. Only letters, numbers, spaces and & - . apostrophes are allowed.",
    ),

  logo: Yup.string().required("Please upload a brand logo"),

  description: Yup.string()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .notRequired()
    .min(3, "Description must be at least 3 characters.")
    .max(1000, "Description cannot exceed 1000 characters."),
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
    .max(150, "Deal title must be no more than 150 characters"),
  dealType: Yup.string().notRequired(),
  dealSource: Yup.string().notRequired(),
  allocatedQuantity: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value,
    )
    .typeError("Deal quantity must be a number")
    .integer("Deal quantity must be a whole number")
    .required("Deal quantity allocation is required")
    .min(1, "Deal quantity allocation must be at least 1")
    .max(999999999, "Deal quantity allocation cannot exceed 9 digits"),
  maxQuantityPerOrder: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value,
    )
    .typeError("Maximum quantity must be a number")
    .integer("Maximum quantity must be a whole number")
    .required("Maximum quantity per customer is required")
    .min(1, "Maximum quantity must be at least 1")
    .max(999999999, "Maximum quantity cannot exceed 9 digits"),
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
    .max(99999, "Priority cannot exceed 5 digits")
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
      schema.trim().required("Payment reference ID is required"),
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

export const sellerHelpSupportValidationSchema = Yup.object({
  category: Yup.string().required("Select a query category first."),

  otherCategory: Yup.string().when("category", {
    is: "OTHER",
    then: (schema) =>
      schema
        .trim()
        .required("Issue category / type is required.")
        .max(100, "Issue category / type must be at most 100 characters."),
    otherwise: (schema) => schema.notRequired(),
  }),

  orderNumber: Yup.string().when("category", {
    is: "ORDER_ISSUE",
    then: (schema) =>
      schema
        .transform((value) =>
          typeof value === "string" ? value.trim() : value,
        )
        .required("Order number is required.")
        .max(24, "Order number must not exceed 24 characters.")
        .test(
          "valid-order-id",
          "Enter a valid order number.",
          (value) => !value || !/^["']+$/.test(value),
        ),
    otherwise: (schema) => schema.notRequired(),
  }),

  product: Yup.string().when("category", {
    is: "PRODUCT_LISTING_ISSUE",
    then: (schema) =>
      schema
        .trim()
        .required("Product number or ID is required.")
        .min(1, "Product number or ID is required.")
        .test(
          "valid-product-id",
          "Enter a valid product ID.",
          (value) => !value || !/^["']+$/.test(value),
        ),
    otherwise: (schema) => schema.notRequired(),
  }),

  subject: Yup.string()
    .trim()
    .required("Subject is required.")
    .min(5, "Subject must be at least 5 characters.")
    .max(220, "Subject must be at most 220 characters."),

  message: Yup.string()
    .required("Message is required.")
    .test(
      "minimum-plain-text-length",
      "Message must be at least 10 characters.",
      (value) =>
        String(value || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim().length >= 10,
    )
    .test(
      "maximum-plain-text-length",
      "Message must be at most 5000 characters.",
      (value) =>
        String(value || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim().length <= 5000,
    ),
});

export const optionSubmissionSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Option name is required")
    .min(2, "Option name must be at least 2 characters")
    .max(50, "Option name must be no more than 50 characters"),
  displayType: Yup.string()
    .required("Display type is required")
    .oneOf(["button", "dropdown", "color_swatch", "radio", "thumbnail"]),
  values: Yup.string()
    .required("At least one value is required")
    .test(
      "has-values",
      "At least one value is required",
      (val) =>
        val &&
        val
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean).length > 0,
    )
    .test(
      "max-value-length",
      "Each value must be 80 characters or fewer",
      (val) =>
        !val ||
        val
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
          .every((v) => v.length <= 80),
    )
    .test("unique-values", "All values must be unique", (val) => {
      if (!val) return true;
      const items = val
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
      return new Set(items).size === items.length;
    }),
});

export const bulkSalePriceSchema = (variants = []) =>
  Yup.number()
    .typeError("Special price must be a number")
    .moreThan(0, "Special price must be greater than 0.")
    .test(
      "not-exceed-price",
      "Special price cannot equal or exceed the price.",
      function (val) {
        if (val === undefined || val === null) return true;
        return !variants.some((v) => {
          const vPrice = Number(v.price || 0);
          return vPrice > 0 && val >= vPrice;
        });
      },
    )
    .test(
      "at-least-half",
      "Special price must be at least half of the price.",
      function (val) {
        if (val === undefined || val === null) return true;
        return !variants.some((v) => {
          const vPrice = Number(v.price || 0);
          return vPrice > 0 && val < vPrice / 2;
        });
      },
    );

export const MAX_COMMON_PRODUCT_IMAGES = 8;
export const MAX_PRODUCT_STOCK = 1000000000;
export const MAX_PRODUCT_MEASUREMENT = 1000000;
export const PRODUCT_SKU_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._/-]{1,62}[A-Za-z0-9]$/;
export const PRODUCT_TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const getMediaUrl = (media) =>
  typeof media === "string"
    ? media.trim()
    : String(
        media?.url ||
          media?.imageURL ||
          media?.imageUrl ||
          media?.secure_url ||
          media?.src ||
          "",
      ).trim();

export const isHttpUrl = (value) => {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const canLoadImage = (url, timeoutMs = 8000) =>
  new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(true);
      return;
    }
    const image = new Image();
    let settled = false;
    const finish = (loaded) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };
    const timeout = setTimeout(() => finish(false), timeoutMs);
    image.onload = () =>
      finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = url;
    if (image.complete) {
      finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    }
  });

export const isValidDecimal = (
  value,
  { min = 0, max = Number.MAX_SAFE_INTEGER, places = 2 } = {},
) => {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "string" && value.trim() === "") return false;
  const text = String(value).trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return false;
  const number = Number(text);
  if (!Number.isFinite(number) || number < min || number > max) return false;
  const decimalPart = text.split(".")[1] || "";
  return decimalPart.length <= places;
};

export const isPositiveMeasurement = (value, max = MAX_PRODUCT_MEASUREMENT) =>
  isValidDecimal(value, {
    min: Number.MIN_VALUE,
    max,
    places: 6,
  });

export const isFurnitureDimensionAttribute = (field = {}) => {
  const key = String(field.key || "")
    .trim()
    .toLowerCase();
  const label = String(field.label || "")
    .trim()
    .toLowerCase();
  return ["width", "depth", "height"].some(
    (dimension) => key === dimension || label.includes(dimension),
  );
};

export const isValidNonNegativeInteger = (value, max = MAX_PRODUCT_STOCK) => {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "string" && value.trim() === "") return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= max;
};

export const findDuplicate = (values = []) => {
  const seen = new Set();
  return values.find((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    if (seen.has(normalized)) return true;
    seen.add(normalized);
    return false;
  });
};

export const findDuplicateUrls = (values = []) => {
  const seen = new Set();
  return values.find((value) => {
    let normalized;
    try {
      normalized = new URL(String(value || "").trim()).href;
    } catch {
      normalized = String(value || "").trim();
    }
    if (!normalized) return false;
    if (seen.has(normalized)) return true;
    seen.add(normalized);
    return false;
  });
};

export const slugifyVariantAxis = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getVariantAxisKey = (axis = {}) =>
  String(axis.slug || slugifyVariantAxis(axis.name)).trim();

export const getVariantAxisValue = (variant = {}, axis = {}) => {
  const attributes = variant.attributes || {};
  const key = getVariantAxisKey(axis);
  const candidateKeys = [
    key,
    String(axis.name || "")
      .trim()
      .toLowerCase(),
    key.replace(/-/g, "_"),
  ].filter(Boolean);
  const matchingKey = candidateKeys.find(
    (candidate) => attributes[candidate] != null,
  );
  return matchingKey ? attributes[matchingKey] : "";
};

export const getVariantCombinationKey = (variant = {}, axes = []) =>
  axes
    .map(
      (axis) =>
        `${getVariantAxisKey(axis)}=${String(getVariantAxisValue(variant, axis)).trim().toLowerCase()}`,
    )
    .join("|");

export const normalizeVariantAttributes = (variant = {}, axes = []) =>
  axes.reduce((attributes, axis) => {
    const value = getVariantAxisValue(variant, axis);
    if (value !== "" && value !== null && value !== undefined) {
      attributes[getVariantAxisKey(axis)] = value;
    }
    return attributes;
  }, {});

export const isValidIndianPincode = (value) =>
  /^[1-9]\d{5}$/.test(String(value || "").trim());

export const normalizePincodeList = (value) => {
  const source = Array.isArray(value)
    ? value
    : String(value || "").split(/[\n,]+/);
  return Array.from(
    new Set(source.map((item) => String(item || "").trim()).filter(Boolean)),
  );
};

export const productCatalogStatusValidationSchema = Yup.object().test(
  "product-catalog-status",
  null,
  function (formData = {}) {
    const {
      formattedData = {},
      createSelectOptions = [],
      isSellerPanelUser,
    } = this.options.context || {};
    const errors = [];

    const brandValue = String(
      formData?.brand || formData?.brandId || formData?.brand_id || "",
    ).trim();

    if (brandValue && formattedData?.brandList?.length) {
      const selectedBrand =
        formattedData.brandList.find((item) =>
          [item.value, item.resourceId, item.brandName]
            .filter(Boolean)
            .some(
              (value) =>
                String(value).toLowerCase() === brandValue.toLowerCase(),
            ),
        ) ||
        (formData?.brandApprovalStatus
          ? {
              approvalStatus: formData.brandApprovalStatus,
              active: formData.brandActive,
            }
          : null);
      if (
        !selectedBrand ||
        selectedBrand.approvalStatus === "rejected" ||
        (selectedBrand.active === false &&
          !(isSellerPanelUser && selectedBrand.approvalStatus === "pending")) ||
        (!isSellerPanelUser && selectedBrand.approvalStatus === "pending")
      ) {
        errors.push(
          new Yup.ValidationError(
            "Select an approved brand or your own pending submission.",
            brandValue,
            "brand",
          ),
        );
      }
    }

    const categoryValue =
      formData?.category_id ||
      formData?.categoryId ||
      formData?.category ||
      formData?.category_key;

    if (categoryValue && createSelectOptions?.length) {
      const selectedCategory = createSelectOptions.find((item) =>
        [item.value, item.resourceId, item.categoryKey]
          .filter(Boolean)
          .some((value) => String(value) === String(categoryValue)),
      );
      if (
        !selectedCategory ||
        selectedCategory.active === false ||
        ["pending", "rejected"].includes(selectedCategory.approvalStatus)
      ) {
        errors.push(
          new Yup.ValidationError(
            "Select a current active category.",
            categoryValue,
            "category_id",
          ),
        );
      }
    }

    const hsnValue = String(
      formData?.hsn_code || formData?.hsnCode || formData?.hsn_id || "",
    ).trim();

    if (hsnValue && formattedData?.hsnCodeList?.length) {
      const selectedHsn =
        formattedData.hsnCodeList.find((item) =>
          [item.value, item.code, item.resourceId]
            .filter(Boolean)
            .some(
              (value) => String(value).toLowerCase() === hsnValue.toLowerCase(),
            ),
        ) ||
        (formData?.hsnApprovalStatus
          ? {
              approvalStatus: formData.hsnApprovalStatus,
              active: formData.hsnActive,
            }
          : null);
      if (
        !selectedHsn ||
        selectedHsn.approvalStatus === "rejected" ||
        (selectedHsn.active === false &&
          !(isSellerPanelUser && selectedHsn.approvalStatus === "pending")) ||
        (!isSellerPanelUser && selectedHsn.approvalStatus === "pending")
      ) {
        errors.push(
          new Yup.ValidationError(
            "Select an approved HSN code or your own pending submission.",
            hsnValue,
            "hsn_code",
          ),
        );
      }
    }

    if (formData?.productFamilyCode) {
      const family = formattedData?.productFamilyList?.find(
        (item) => String(item.value) === String(formData.productFamilyCode),
      );
      if (
        (formattedData?.productFamilyList?.length && !family) ||
        family?.active === false ||
        ["pending", "rejected"].includes(family?.approvalStatus)
      ) {
        errors.push(
          new Yup.ValidationError(
            "Select a current active product family.",
            formData.productFamilyCode,
            "productFamilyCode",
          ),
        );
      }
    }

    if (errors.length) {
      throw new Yup.ValidationError(errors);
    }
    return true;
  },
);

export const productShippingValidationSchema = Yup.object().test(
  "product-shipping",
  null,
  function (shipping = {}) {
    const { shippingProfilesLoading, shippingProfileOptions } =
      this.options.context || {};
    const errors = [];

    const hasShippingProfile = Boolean(shipping?.shippingProfileId);

    if (!hasShippingProfile) {
      const allowedPincodes = normalizePincodeList(
        shipping?.allowPincodes || shipping?.serviceablePincodes,
      );

      if (allowedPincodes.some((pincode) => !isValidIndianPincode(pincode))) {
        errors.push(
          new Yup.ValidationError(
            "Every pincode must be a valid 6-digit pincode.",
            shipping,
            "shipping",
          ),
        );
      }
    }

    const shippingAmounts = [
      ["shippingCharge", "Shipping charge"],
      ["freeShippingMinOrder", "Free shipping minimum order"],
      ["additionalCost", "Additional shipping cost"],
      ["handlingCharge", "Handling charge"],
    ];
    for (const [key, label] of shippingAmounts) {
      const value = shipping?.[key];
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !isValidDecimal(value, { min: 0, max: MAX_PRODUCT_MONEY })
      ) {
        errors.push(
          new Yup.ValidationError(
            `${label} must be a non-negative amount with no more than two decimal places.`,
            value,
            "shipping",
          ),
        );
        break;
      }
    }

    const etaMin = shipping?.estimatedDaysMin;
    const etaMax = shipping?.estimatedDaysMax;
    const processingDays = shipping?.processingDays;
    if (
      (etaMin !== undefined &&
        etaMin !== "" &&
        !isValidNonNegativeInteger(etaMin)) ||
      (etaMax !== undefined &&
        etaMax !== "" &&
        !isValidNonNegativeInteger(etaMax)) ||
      (processingDays !== undefined &&
        processingDays !== "" &&
        !isValidNonNegativeInteger(processingDays))
    ) {
      errors.push(
        new Yup.ValidationError(
          "Delivery ETA values must be whole non-negative days.",
          shipping,
          "shipping",
        ),
      );
    } else if (
      etaMin !== undefined &&
      etaMin !== "" &&
      etaMax !== undefined &&
      etaMax !== "" &&
      Number(etaMin) > Number(etaMax)
    ) {
      errors.push(
        new Yup.ValidationError(
          "Minimum delivery ETA cannot exceed maximum ETA.",
          shipping,
          "shipping",
        ),
      );
    }

    if (
      shipping?.shippingProfileId &&
      !shippingProfilesLoading &&
      shippingProfileOptions?.length
    ) {
      const selectedProfile = shippingProfileOptions.find(
        (item) => String(item.value) === String(shipping.shippingProfileId),
      );
      if (
        !selectedProfile ||
        selectedProfile.profile?.active === false ||
        String(selectedProfile.value).startsWith("template:")
      ) {
        errors.push(
          new Yup.ValidationError(
            "Select an active shipping profile available to this seller and organization.",
            shipping?.shippingProfileId,
            "shipping",
          ),
        );
      }
    }

    if (errors.length) {
      throw new Yup.ValidationError(errors);
    }
    return true;
  },
);

export const productDimensionsValidationSchema = Yup.object().test(
  "product-dimensions",
  null,
  function (dimensions = {}) {
    const dimensionValues = ["length", "width", "height", "weight"];
    const hasEnteredDimension = dimensionValues.some(
      (key) =>
        dimensions?.[key] !== undefined &&
        dimensions?.[key] !== null &&
        dimensions?.[key] !== "",
    );
    const errors = [];

    for (const key of dimensionValues) {
      const value = dimensions?.[key];
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !isValidDecimal(value, {
          min: Number.MIN_VALUE,
          max: MAX_PRODUCT_MEASUREMENT,
          places: 6,
        })
      ) {
        errors.push(
          new Yup.ValidationError(
            "Weight and dimensions must be positive valid measurements.",
            value,
            "dimensions",
          ),
        );
        break;
      }
    }

    if (
      dimensions?.weight !== undefined &&
      dimensions?.weight !== null &&
      dimensions?.weight !== "" &&
      !dimensions?.weightUnit
    ) {
      errors.push(
        new Yup.ValidationError(
          "Select a weight unit when entering weight.",
          dimensions?.weight,
          "dimensions",
        ),
      );
    } else if (
      hasEnteredDimension &&
      dimensionValues.some(
        (key) =>
          key !== "weight" &&
          dimensions?.[key] !== undefined &&
          dimensions?.[key] !== null &&
          dimensions?.[key] !== "",
      ) &&
      !dimensions?.unit
    ) {
      errors.push(
        new Yup.ValidationError(
          "Select a dimension unit when entering dimensions.",
          dimensions,
          "dimensions",
        ),
      );
    }

    if (errors.length) {
      throw new Yup.ValidationError(errors);
    }
    return true;
  },
);

export const productMediaValidationSchema = Yup.object().test(
  "product-media",
  null,
  function (data = {}) {
    const {
      commonImagesUploading,
      productVideoUploading,
      ogImageUploading,
      variantBuilderBusy,
      catalogBusy,
    } = this.options.context || {};
    const errors = [];

    const commonImages = (
      Array.isArray(data?.commonImages) ? data.commonImages : []
    ).map(getMediaUrl);
    const duplicateCommonImage = findDuplicateUrls(commonImages);
    if (duplicateCommonImage) {
      errors.push(
        new Yup.ValidationError(
          "Remove duplicate product images before saving.",
          commonImages,
          "commonImages",
        ),
      );
    } else if (commonImages.some((image) => !isHttpUrl(image))) {
      errors.push(
        new Yup.ValidationError(
          "Product image URLs must use HTTP or HTTPS.",
          commonImages,
          "commonImages",
        ),
      );
    }

    const videoUrls = (Array.isArray(data?.videos) ? data.videos : [])
      .map(getMediaUrl)
      .filter(Boolean);
    if (videoUrls.length > 1 || videoUrls.some((url) => !isHttpUrl(url))) {
      errors.push(
        new Yup.ValidationError(
          "Use one valid HTTP or HTTPS product video URL.",
          videoUrls,
          "commonImages",
        ),
      );
    }

    if (commonImages.length > MAX_COMMON_PRODUCT_IMAGES) {
      errors.push(
        new Yup.ValidationError(
          `A maximum of ${MAX_COMMON_PRODUCT_IMAGES} product images is allowed.`,
          commonImages,
          "commonImages",
        ),
      );
    }

    if (
      commonImagesUploading ||
      productVideoUploading ||
      ogImageUploading ||
      variantBuilderBusy
    ) {
      errors.push(
        new Yup.ValidationError(
          "Wait for media and option uploads to finish before saving.",
          data,
          "commonImages",
        ),
      );
    }

    if (catalogBusy) {
      errors.push(
        new Yup.ValidationError(
          "Wait for catalog updates and uploads to finish before saving.",
          data,
          "basicDetails",
        ),
      );
    }

    if (errors.length) {
      throw new Yup.ValidationError(errors);
    }
    return true;
  },
);

export const productRestockingFeeValidationSchema = Yup.mixed().test(
  "product-restocking-fee",
  "Restocking fee must be a non-negative amount with no more than two decimal places.",
  function (restockingFee) {
    if (
      restockingFee !== undefined &&
      restockingFee !== null &&
      restockingFee !== "" &&
      !isValidDecimal(restockingFee, { min: 0, max: MAX_PRODUCT_MONEY })
    ) {
      return false;
    }
    return true;
  },
);

export const productVariantsValidationSchema = Yup.mixed().test(
  "product-variants",
  null,
  function (variantsData) {
    const { variantAxes = [], formData = {} } = this.options.context || {};
    const errors = [];

    if (!Array.isArray(variantsData) || !variantsData.length) {
      errors.push(
        new Yup.ValidationError(
          "Add at least one variant for this product.",
          variantsData,
          "variants._form",
        ),
      );
      errors.push(
        new Yup.ValidationError(
          "Add at least one variant or product image before saving.",
          variantsData,
          "commonImages",
        ),
      );
      throw new Yup.ValidationError(errors);
    }

    const skuCounts = variantsData.reduce((counts, variant) => {
      const sku = String(variant?.sku || "")
        .trim()
        .toLowerCase();
      if (sku) counts.set(sku, (counts.get(sku) || 0) + 1);
      return counts;
    }, new Map());
    const combinationCounts = variantsData.reduce((counts, variant) => {
      const key = getVariantCombinationKey(variant, variantAxes);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
      return counts;
    }, new Map());

    const optionNames = variantAxes.map((axis) =>
      String(axis?.name || "").trim(),
    );
    if (
      optionNames.some((name) => name.length < 2 || name.length > 50) ||
      findDuplicate(optionNames)
    ) {
      errors.push(
        new Yup.ValidationError(
          "Option names must be unique and 2–50 characters long.",
          optionNames,
          "variants._form",
        ),
      );
    }
    const invalidOptionValue = variantAxes.some((axis) => {
      const values = Array.isArray(axis?.values) ? axis.values : [];
      return (
        values.some(
          (value) =>
            String(value || "").trim().length < 1 ||
            String(value).trim().length > 80,
        ) || Boolean(findDuplicate(values))
      );
    });
    if (invalidOptionValue) {
      errors.push(
        new Yup.ValidationError(
          "Option values must be unique and 1–80 characters long.",
          variantAxes,
          "variants._form",
        ),
      );
    }

    const defaultCount = variantsData.filter(
      (variant) => variant?.isDefault === true,
    ).length;
    if (defaultCount !== 1) {
      errors.push(
        new Yup.ValidationError(
          "Choose exactly one default variant.",
          defaultCount,
          "variants._form",
        ),
      );
    }
    const productWillBeActive =
      !formData?.isDisable &&
      (formData?.status === "active" ||
        formData?.approvalStatus === "approved" ||
        formData?.isApproved === true);
    if (
      productWillBeActive &&
      !variantsData.some((variant) => variant?.status === "active")
    ) {
      errors.push(
        new Yup.ValidationError(
          "At least one variant must be active before activating the product.",
          variantsData,
          "variants._form",
        ),
      );
    }

    variantsData.forEach((variant, index) => {
      const hasPrice =
        variant?.price !== undefined &&
        variant?.price !== null &&
        variant?.price !== "";

      const hasMrp =
        variant?.mrp !== undefined &&
        variant?.mrp !== null &&
        variant?.mrp !== "";

      const price = Number(variant?.price || 0);
      const mrp = Number(variant?.mrp || 0);

      const hasSalePrice =
        variant?.salePrice !== undefined &&
        variant?.salePrice !== null &&
        variant?.salePrice !== "";

      const salePrice = Number(variant?.salePrice || 0);

      const hasGstRate =
        variant?.gstRate !== undefined &&
        variant?.gstRate !== null &&
        variant?.gstRate !== "";

      const gstRate = Number(variant?.gstRate);

      // if (!String(variant?.sku || "").trim()) {
      //   errors.push(
      //     new Yup.ValidationError(
      //       "SKU is required.",
      //       variant?.sku,
      //       `variants.${index}.sku`,
      //     ),
      //   );
      // } else if (!PRODUCT_SKU_PATTERN.test(String(variant.sku).trim())) {
      //   errors.push(
      //     new Yup.ValidationError(
      //       "Use 3–64 letters, numbers, hyphens, underscores, periods, or slashes; begin and end with a letter or number.",
      //       variant?.sku,
      //       `variants.${index}.sku`,
      //     ),
      //   );
      // } else if (skuCounts.get(String(variant.sku).trim().toLowerCase()) > 1) {
      //   errors.push(
      //     new Yup.ValidationError(
      //       "SKU must be unique across variants.",
      //       variant?.sku,
      //       `variants.${index}.sku`,
      //     ),
      //   );
      // }

      if (!hasPrice) {
        errors.push(
          new Yup.ValidationError(
            "Price is required.",
            variant?.price,
            `variants.${index}.price`,
          ),
        );
      } else if (
        !isValidDecimal(variant?.price, { min: 0.01, max: MAX_PRODUCT_MONEY })
      ) {
        errors.push(
          new Yup.ValidationError(
            "Price must be positive, no more than 999999999.99, and have at most two decimal places.",
            variant?.price,
            `variants.${index}.price`,
          ),
        );
      } else if (price <= 0) {
        errors.push(
          new Yup.ValidationError(
            "Price must be greater than 0.",
            price,
            `variants.${index}.price`,
          ),
        );
      } else if (mrp > 0 && price > mrp) {
        errors.push(
          new Yup.ValidationError(
            "Price cannot be greater than MRP.",
            price,
            `variants.${index}.price`,
          ),
        );
      }

      if (!hasMrp) {
        errors.push(
          new Yup.ValidationError(
            "MRP is required.",
            variant?.mrp,
            `variants.${index}.mrp`,
          ),
        );
      } else if (
        !isValidDecimal(variant?.mrp, { min: 0.01, max: MAX_PRODUCT_MONEY })
      ) {
        errors.push(
          new Yup.ValidationError(
            "MRP must be positive, no more than 999999999.99, and have at most two decimal places.",
            variant?.mrp,
            `variants.${index}.mrp`,
          ),
        );
      } else if (mrp <= 0) {
        errors.push(
          new Yup.ValidationError(
            "MRP must be greater than 0.",
            mrp,
            `variants.${index}.mrp`,
          ),
        );
      }

      if (!isValidNonNegativeInteger(variant?.stock)) {
        errors.push(
          new Yup.ValidationError(
            "Stock must be a whole number from 0 to 1000000000.",
            variant?.stock,
            `variants.${index}.stock`,
          ),
        );
      }
      const reservedValue = variant?.reservedStock ?? 0;
      if (
        !isValidNonNegativeInteger(reservedValue) ||
        Number(reservedValue) > Number(variant?.stock ?? 0)
      ) {
        errors.push(
          new Yup.ValidationError(
            "Reserved stock must be a whole number no greater than stock.",
            reservedValue,
            `variants.${index}.reservedStock`,
          ),
        );
      }
      if (hasSalePrice) {
        if (
          !isValidDecimal(variant?.salePrice, {
            min: 0.01,
            max: MAX_PRODUCT_MONEY,
          })
        ) {
          errors.push(
            new Yup.ValidationError(
              "Sale price must be positive, no more than 999999999.99, and have at most two decimal places.",
              variant?.salePrice,
              `variants.${index}.salePrice`,
            ),
          );
        } else if (salePrice <= 0) {
          errors.push(
            new Yup.ValidationError(
              "Special price must be greater than 0.",
              salePrice,
              `variants.${index}.salePrice`,
            ),
          );
        } else if (price > 0 && salePrice >= price) {
          errors.push(
            new Yup.ValidationError(
              "Special price cannot equal or exceed the price.",
              salePrice,
              `variants.${index}.salePrice`,
            ),
          );
        } else if (price > 0 && salePrice < price / 2) {
          errors.push(
            new Yup.ValidationError(
              "Special price must be at least half of the price.",
              salePrice,
              `variants.${index}.salePrice`,
            ),
          );
        }
      }

      const variantTitle = String(variant?.title || "").trim();
      if (variantTitle.length > 100) {
        errors.push(
          new Yup.ValidationError(
            "Variant title must be 100 characters or fewer.",
            variantTitle,
            `variants.${index}.title`,
          ),
        );
      } else if (/[\u0000-\u001F\u007F-\u009F]/u.test(variantTitle)) {
        errors.push(
          new Yup.ValidationError(
            "Variant title contains invalid characters.",
            variantTitle,
            `variants.${index}.title`,
          ),
        );
      }

      const barcode = String(variant?.barcode || "").trim();
      if (barcode && !/^\d{8,14}$/.test(barcode)) {
        errors.push(
          new Yup.ValidationError(
            "Barcode must contain 8–14 digits.",
            barcode,
            `variants.${index}.barcode`,
          ),
        );
      }
      if (
        !["active", "inactive", "out_of_stock"].includes(
          variant?.status || "active",
        )
      ) {
        errors.push(
          new Yup.ValidationError(
            "Select a valid variant status.",
            variant?.status,
            `variants.${index}.status`,
          ),
        );
      }
      if (
        variant?.weight !== undefined &&
        variant?.weight !== null &&
        variant?.weight !== ""
      ) {
        if (
          !isValidDecimal(variant.weight, {
            min: Number.MIN_VALUE,
            max: MAX_PRODUCT_MEASUREMENT,
            places: 6,
          })
        ) {
          errors.push(
            new Yup.ValidationError(
              "Variant weight must be a positive measurement.",
              variant.weight,
              `variants.${index}.weight`,
            ),
          );
        } else if (!variant.weightUnit) {
          errors.push(
            new Yup.ValidationError(
              "Select a unit for variant weight.",
              variant.weightUnit,
              `variants.${index}.weight`,
            ),
          );
        }
      }
      const variantDimensions = variant?.dimensions || {};
      const dimensionKeys = ["length", "width", "height"];
      const hasVariantDimension = dimensionKeys.some(
        (key) =>
          variantDimensions[key] !== undefined &&
          variantDimensions[key] !== null &&
          variantDimensions[key] !== "",
      );
      if (
        dimensionKeys.some((key) => {
          const value = variantDimensions[key];
          return (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !isValidDecimal(value, {
              min: Number.MIN_VALUE,
              max: MAX_PRODUCT_MEASUREMENT,
              places: 6,
            })
          );
        })
      ) {
        errors.push(
          new Yup.ValidationError(
            "Variant dimensions must be positive measurements.",
            variantDimensions,
            `variants.${index}.dimensions`,
          ),
        );
      } else if (hasVariantDimension && !variantDimensions.unit) {
        errors.push(
          new Yup.ValidationError(
            "Select a unit for variant dimensions.",
            variantDimensions.unit,
            `variants.${index}.dimensions`,
          ),
        );
      }

      const variantImages = (
        Array.isArray(variant?.images) ? variant.images : []
      ).map(getMediaUrl);
      if (variantImages.length > 5) {
        errors.push(
          new Yup.ValidationError(
            "A maximum of five images is allowed per variant.",
            variantImages,
            `variants.${index}.images`,
          ),
        );
      } else if (findDuplicateUrls(variantImages)) {
        errors.push(
          new Yup.ValidationError(
            "Remove duplicate images from this variant.",
            variantImages,
            `variants.${index}.images`,
          ),
        );
      } else if (variantImages.some((image) => !isHttpUrl(image))) {
        errors.push(
          new Yup.ValidationError(
            "Variant image URLs must use HTTP or HTTPS.",
            variantImages,
            `variants.${index}.images`,
          ),
        );
      } else if (!variantImages.length) {
        errors.push(
          new Yup.ValidationError(
            "Add at least one image to this variant.",
            variantImages,
            `variants.${index}.images`,
          ),
        );
      }

      Object.entries(variant?.attributes || {}).forEach(([key, value]) => {
        const normalizedKey = String(key || "").trim();
        const normalizedValue = String(value ?? "").trim();
        if (normalizedKey.length < 2 || normalizedKey.length > 50) {
          errors.push(
            new Yup.ValidationError(
              "Attribute names must be 2–50 characters.",
              key,
              `variants.${index}.attributes.${normalizedKey || "_key"}`,
            ),
          );
        } else if (normalizedValue.length < 1 || normalizedValue.length > 80) {
          errors.push(
            new Yup.ValidationError(
              "Attribute values must be 1–80 characters.",
              value,
              `variants.${index}.attributes.${normalizedKey}`,
            ),
          );
        }
      });

      variantAxes.forEach((axis) => {
        const axisKey = getVariantAxisKey(axis);
        const value = getVariantAxisValue(variant, axis);
        if (axis.required && !String(value || "").trim()) {
          errors.push(
            new Yup.ValidationError(
              `${axis.name || axisKey} is required.`,
              value,
              `variants.${index}.attributes.${axisKey}`,
            ),
          );
        } else if (
          value &&
          Array.isArray(axis.values) &&
          axis.values.length &&
          !axis.values.some(
            (allowedValue) => String(allowedValue) === String(value),
          )
        ) {
          errors.push(
            new Yup.ValidationError(
              `${value} is not an allowed ${axis.name || axisKey} value.`,
              value,
              `variants.${index}.attributes.${axisKey}`,
            ),
          );
        }
      });

      const combinationKey = getVariantCombinationKey(variant, variantAxes);
      if (combinationKey && combinationCounts.get(combinationKey) > 1) {
        errors.push(
          new Yup.ValidationError(
            "This option combination is already used by another variant.",
            combinationKey,
            `variants.${index}.attributes._combination`,
          ),
        );
      }
    });

    if (errors.length) {
      throw new Yup.ValidationError(errors);
    }
    return true;
  },
);

export const productCategoryAttributesValidationSchema = Yup.mixed().test(
  "product-attributes",
  null,
  function (attributes = {}) {
    const { categoryAttributeSchema = [], useManualAttributes = false } =
      this.options.context || {};
    const errors = [];

    if (!useManualAttributes) {
      categoryAttributeSchema.forEach((field) => {
        const value = attributes?.[field.key];
        const isEmpty =
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0);

        if (field.required && isEmpty) {
          errors.push(
            new Yup.ValidationError(
              `${field.label || field.key} is required.`,
              value,
              `attributes.${field.key}`,
            ),
          );
          return;
        }
        if (isEmpty) {
          if (
            field.type === "multi_select" &&
            Number(field.minSelections || 0) > 0
          ) {
            errors.push(
              new Yup.ValidationError(
                `Select at least ${field.minSelections} option(s).`,
                value,
                `attributes.${field.key}`,
              ),
            );
          }
          return;
        }

        let message = "";
        if (["text", "select"].includes(field.type)) {
          const text = String(value);
          const minLength = Number(field.minLength || 0);
          const maxLength = Number(field.maxLength ?? 5000);
          if (text.length < minLength || text.length > maxLength) {
            message = `Enter between ${minLength} and ${maxLength} characters.`;
          } else if (field.pattern) {
            try {
              if (!new RegExp(field.pattern).test(text))
                message = "Enter a value in the required format.";
            } catch {
              message =
                "This attribute has an invalid validation pattern. Contact an administrator.";
            }
          }
        } else if (field.type === "number") {
          const isDimensionField = isFurnitureDimensionAttribute(field);
          if (isDimensionField) {
            if (!isPositiveMeasurement(value)) {
              message = `${field.label || field.key} must be a positive number greater than 0. Example: 12.5.`;
            }
          } else {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue)) {
              message = "Enter a valid number.";
            } else if (
              field.min !== undefined &&
              field.min !== null &&
              field.min !== "" &&
              numericValue < Number(field.min)
            ) {
              message = `Value must be at least ${field.min}.`;
            } else if (
              field.max !== undefined &&
              field.max !== null &&
              field.max !== "" &&
              numericValue > Number(field.max)
            ) {
              message = `Value must be no more than ${field.max}.`;
            } else if (
              field.precision !== undefined &&
              field.precision !== null &&
              (String(value).split(".")[1] || "").length >
                Number(field.precision)
            ) {
              message = `Use no more than ${field.precision} decimal places.`;
            }
          }
        } else if (field.type === "date") {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            message = "Enter a valid date.";
          } else if (field.min && date < new Date(field.min)) {
            message = `Date must be on or after ${field.min}.`;
          } else if (field.max && date > new Date(field.max)) {
            message = `Date must be on or before ${field.max}.`;
          }
        } else if (field.type === "boolean" && typeof value !== "boolean") {
          message = "Enter a valid true or false value.";
        } else if (field.type === "multi_select") {
          if (!Array.isArray(value)) {
            message = "Select one or more valid options.";
          } else if (
            field.minSelections !== undefined &&
            field.minSelections !== null &&
            value.length < Number(field.minSelections)
          ) {
            message = `Select at least ${field.minSelections} option(s).`;
          } else if (
            field.maxSelections !== undefined &&
            field.maxSelections !== null &&
            value.length > Number(field.maxSelections)
          ) {
            message = `Select no more than ${field.maxSelections} option(s).`;
          } else if (findDuplicate(value)) {
            message = "Remove duplicate selections.";
          }
        }
        if (
          !message &&
          ["select", "multi_select"].includes(field.type) &&
          Array.isArray(field.options) &&
          field.options.length
        ) {
          const selectedValues = Array.isArray(value) ? value : [value];
          if (
            selectedValues.some(
              (item) =>
                !field.options.some(
                  (allowed) => String(allowed) === String(item),
                ),
            )
          ) {
            message = "Select only the available options.";
          }
        }
        if (message) {
          errors.push(
            new Yup.ValidationError(message, value, `attributes.${field.key}`),
          );
        }
      });
    } else {
      const attrs = attributes || {};
      const normalizedKeys = Object.keys(attrs).map((key) =>
        key.trim().toLowerCase(),
      );
      if (new Set(normalizedKeys).size !== normalizedKeys.length) {
        errors.push(
          new Yup.ValidationError(
            "Manual attribute keys must be unique.",
            attributes,
            "attributes._form",
          ),
        );
      }
      Object.entries(attrs).forEach(([key, value]) => {
        if (key.trim().length < 2 || key.trim().length > 50) {
          errors.push(
            new Yup.ValidationError(
              "Attribute key must be 2–50 characters.",
              key,
              `attributes.${key}`,
            ),
          );
        }
        if (typeof value === "string" && value.trim().length > 500) {
          errors.push(
            new Yup.ValidationError(
              "Attribute value must be 500 characters or fewer.",
              value,
              `attributes.${key}`,
            ),
          );
        }
      });
    }

    if (errors.length) {
      throw new Yup.ValidationError(errors);
    }
    return true;
  },
);

export const validateProductDataYup = async ({
  formData = {},
  variantsData = [],
  variantAxes = [],
  categoryAttributeSchema = [],
  useManualAttributes = false,
  formattedData = {},
  createSelectOptions = [],
  isSellerPanelUser = false,
  shippingProfilesLoading = false,
  shippingProfileOptions = [],
  commonImagesUploading = false,
  productVideoUploading = false,
  ogImageUploading = false,
  variantBuilderBusy = false,
  catalogBusy = false,
}) => {
  const errors = {};
  console.log("this is the seller panel user", isSellerPanelUser);
  const collectYupErrors = (validationError) => {
    if (!validationError) return;
    console.log("this is the seller panel user", isSellerPanelUser);
    const inner =
      Array.isArray(validationError.inner) && validationError.inner.length
        ? validationError.inner
        : [validationError];

    inner.forEach((err) => {
      if (!err || !err.path) return;
      const pathParts = err.path.split(".");

      if (pathParts[0] === "variants") {
        if (pathParts[1] === "_form") {
          errors.variants = {
            ...(errors.variants || {}),
            _form: err.message,
          };
        } else if (pathParts.length >= 3) {
          const index = pathParts[1];
          const field = pathParts[2];
          errors.variants = errors.variants || {};
          errors.variants[index] = errors.variants[index] || {};
          if (field === "attributes" && pathParts.length >= 4) {
            const attrKey = pathParts.slice(3).join(".");
            errors.variants[index].attributes =
              errors.variants[index].attributes || {};
            errors.variants[index].attributes[attrKey] = err.message;
          } else {
            errors.variants[index][field] = err.message;
          }
        }
      } else if (pathParts[0] === "attributes") {
        if (pathParts[1] === "_form") {
          errors.attributes = {
            ...(errors.attributes || {}),
            _form: err.message,
          };
        } else if (pathParts[1]) {
          const attrKey = pathParts.slice(1).join(".");
          errors.attributes = errors.attributes || {};
          errors.attributes[attrKey] = err.message;
        }
      } else {
        errors[err.path] = err.message;
      }
    });
  };

  try {
    await productCatalogStatusValidationSchema.validate(formData, {
      abortEarly: false,
      context: { formattedData, createSelectOptions, isSellerPanelUser },
    });
  } catch (err) {
    collectYupErrors(err);
  }

  try {
    await productVariantsValidationSchema.validate(variantsData, {
      abortEarly: false,
      context: { variantAxes, formData },
    });
  } catch (err) {
    collectYupErrors(err);
  }

  try {
    await productShippingValidationSchema.validate(formData?.shipping || {}, {
      abortEarly: false,
      context: { shippingProfilesLoading, shippingProfileOptions },
    });
  } catch (err) {
    collectYupErrors(err);
  }

  try {
    await productDimensionsValidationSchema.validate(
      formData?.dimensions || {},
      {
        abortEarly: false,
      },
    );
  } catch (err) {
    collectYupErrors(err);
  }

  try {
    await productMediaValidationSchema.validate(formData, {
      abortEarly: false,
      context: {
        commonImagesUploading,
        productVideoUploading,
        ogImageUploading,
        variantBuilderBusy,
        catalogBusy,
      },
    });
  } catch (err) {
    collectYupErrors(err);
  }

  const returnPolicy = formData?.warranty?.returnPolicy || {};
  const restockingFee = returnPolicy?.restockingFee;
  try {
    await productRestockingFeeValidationSchema.validate(restockingFee, {
      abortEarly: false,
    });
  } catch (err) {
    collectYupErrors(err);
  }

  try {
    await productCategoryAttributesValidationSchema.validate(
      formData?.attributes || {},
      {
        abortEarly: false,
        context: { categoryAttributeSchema, useManualAttributes },
      },
    );
  } catch (err) {
    collectYupErrors(err);
  }

  return errors;
};
export const collectionValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Collection name is required")
    .min(2, "Collection name must be at least 2 characters")
    .max(100, "Collection name must be no more than 100 characters"),

  type: Yup.string().trim().required("Collection type is required"),
});

export const sellerPayoutNoteValidationSchema = Yup.object({
  note: Yup.string()
    .trim()
    .test(
      "minimum-note-length",
      "Note must be at least 3 characters",
      (value) => !value || value.length >= 3,
    )
    .max(500, "Note cannot exceed 500 characters"),
});
