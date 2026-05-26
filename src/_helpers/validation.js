const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[0-9]{10,15}$/,
  url: /^https?:\/\/[^\s]+$/i,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  pincode: /^[1-9][0-9]{5}$/,
  hsn: /^[0-9]{4,8}$/,
  sku: /^[A-Z0-9][A-Z0-9_-]{1,63}$/i,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  decimal: /^-?(?:\d+|\d*\.\d+)$/,
  positiveNumber: /^(?:\d+|\d*\.\d+)$/,
};

const empty = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

export const getFieldValue = (values, path) =>
  String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce((result, key) => result?.[key], values);

export const setFieldValue = (values, path, nextValue) => {
  const keys = String(path).replace(/\[(\d+)\]/g, ".$1").split(".");
  const result = Array.isArray(values) ? [...values] : { ...values };
  let pointer = result;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      pointer[key] = nextValue;
      return;
    }
    const existing = pointer[key];
    pointer[key] = Array.isArray(existing) ? [...existing] : { ...(existing || {}) };
    pointer = pointer[key];
  });
  return result;
};

const messageFor = (label, rule, expected) => {
  const name = label || "This field";
  const messages = {
    required: `${name} is required`,
    email: "Enter a valid email address",
    phone: "Enter a valid phone number",
    url: "Enter a valid URL starting with http:// or https://",
    gst: "Enter a valid GST number",
    pan: "Enter a valid PAN number",
    ifsc: "Enter a valid IFSC code",
    pincode: "Enter a valid 6 digit pincode",
    hsn: "Enter a valid 4 to 8 digit HSN code",
    sku: "Enter a valid SKU",
    slug: "Use lowercase letters, numbers and hyphens only",
    number: "Enter a valid number",
    decimal: "Enter a valid decimal number",
    positiveNumber: "Enter a positive number",
    password: "Use 8+ characters with upper/lowercase, number and special character",
    minLength: `${name} must be at least ${expected} characters`,
    maxLength: `${name} must be no more than ${expected} characters`,
    min: `${name} must be at least ${expected}`,
    max: `${name} must be no more than ${expected}`,
    fileSize: `File must be smaller than ${expected} MB`,
    fileType: "Choose a supported file type",
    dateRange: "End date must be on or after start date",
  };
  return messages[rule] || `${name} is invalid`;
};

export const validators = {
  required: (value) => !empty(value),
  email: (value) => PATTERNS.email.test(String(value).trim()),
  phone: (value) => PATTERNS.phone.test(String(value).replace(/[\s()-]/g, "")),
  url: (value) => PATTERNS.url.test(String(value).trim()),
  gst: (value) => PATTERNS.gst.test(String(value).trim().toUpperCase()),
  pan: (value) => PATTERNS.pan.test(String(value).trim().toUpperCase()),
  ifsc: (value) => PATTERNS.ifsc.test(String(value).trim().toUpperCase()),
  pincode: (value) => PATTERNS.pincode.test(String(value).trim()),
  hsn: (value) => PATTERNS.hsn.test(String(value).trim()),
  sku: (value) => PATTERNS.sku.test(String(value).trim()),
  slug: (value) => PATTERNS.slug.test(String(value).trim()),
  number: (value) => Number.isFinite(Number(value)),
  decimal: (value) => PATTERNS.decimal.test(String(value)),
  positiveNumber: (value) => PATTERNS.positiveNumber.test(String(value)) && Number(value) >= 0,
  password: (value) =>
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value) &&
    String(value).length >= 8,
};

export const validateField = (value, rule = {}, values = {}, fieldName = "") => {
  const label = rule.label || fieldName;
  const active = typeof rule.when === "function" ? rule.when(values) : true;
  if (!active) return "";
  if (rule.required && !validators.required(value)) {
    return rule.messages?.required || messageFor(label, "required");
  }
  if (empty(value)) return "";

  if (rule.minLength && String(value).length < rule.minLength) {
    return rule.messages?.minLength || messageFor(label, "minLength", rule.minLength);
  }
  if (rule.maxLength && String(value).length > rule.maxLength) {
    return rule.messages?.maxLength || messageFor(label, "maxLength", rule.maxLength);
  }
  if (rule.min !== undefined && Number(value) < rule.min) {
    return rule.messages?.min || messageFor(label, "min", rule.min);
  }
  if (rule.max !== undefined && Number(value) > rule.max) {
    return rule.messages?.max || messageFor(label, "max", rule.max);
  }

  const typeRules = [
    "email", "phone", "url", "gst", "pan", "ifsc", "pincode", "hsn",
    "sku", "slug", "number", "decimal", "positiveNumber", "password",
  ];
  const failedRule = typeRules.find((type) => rule[type] && !validators[type](value));
  if (failedRule) {
    return rule.messages?.[failedRule] || messageFor(label, failedRule);
  }
  if (rule.matchesField && value !== getFieldValue(values, rule.matchesField)) {
    return rule.messages?.matchesField || `${label} does not match`;
  }
  if (rule.dateRange?.startField) {
    const start = getFieldValue(values, rule.dateRange.startField);
    if (start && new Date(value) < new Date(start)) {
      return rule.messages?.dateRange || messageFor(label, "dateRange");
    }
  }
  if (rule.fileSize && value?.size > rule.fileSize * 1024 * 1024) {
    return rule.messages?.fileSize || messageFor(label, "fileSize", rule.fileSize);
  }
  if (rule.fileTypes?.length && value?.type && !rule.fileTypes.includes(value.type)) {
    return rule.messages?.fileType || messageFor(label, "fileType");
  }
  if (typeof rule.validate === "function") {
    const result = rule.validate(value, values);
    if (result !== true && result !== undefined && result !== "") {
      return typeof result === "string" ? result : messageFor(label, "custom");
    }
  }
  return "";
};

export const validateValues = (values, schema = {}) =>
  Object.entries(schema).reduce((errors, [path, rule]) => {
    const error = validateField(getFieldValue(values, path), rule, values, rule.label || path);
    return error ? setFieldValue(errors, path, error) : errors;
  }, {});

export const mapApiErrors = (error) => {
  const details = error?.errors || error?.response?.data?.errors || error?.details || [];
  if (!Array.isArray(details)) return details && typeof details === "object" ? details : {};
  return details.reduce((errors, detail) => {
    const path = detail.field || detail.path || detail.param;
    return path ? setFieldValue(errors, path, detail.message || "Invalid value") : errors;
  }, {});
};
