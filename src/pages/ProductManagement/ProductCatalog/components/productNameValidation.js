export function validateProductName(value) {
  const name = String(value || "").trim();

  if (!name) return "Product name is required.";

  if (name.length < 3) {
    return "Product name must be at least 3 characters.";
  }

  if (name.length > 200) {
    return "Product name must not be more than 200 characters.";
  }

  if (!/\p{L}/u.test(name)) {
    return "Product name must contain at least one letter.";
  }

  if (/ {2,}/u.test(name)) {
    return "Product name cannot contain repeated spaces.";
  }

  return "";
}
