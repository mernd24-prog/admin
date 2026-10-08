/**
 * Global Image Validation Utility
 *
 * Validates:
 * - File exists
 * - File type
 * - File size
 * - Image dimensions
 */

const DEFAULT_IMAGE_CONFIG = {
  maxSizeMB: 5,

  allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],

  allowedExtensions: ["jpg", "jpeg", "png", "webp"],

  // Set to null if you don't want dimension validation
  minWidth: null,
  minHeight: null,

  maxWidth: null,
  maxHeight: null,
};

/**
 * Convert bytes to MB
 */
const bytesToMB = (bytes) => {
  return bytes / (1024 * 1024);
};

/**
 * Get file extension
 */
const getFileExtension = (fileName = "") => {
  return fileName.split(".").pop()?.toLowerCase() || "";
};

/**
 * Validate image dimensions
 */
const validateImageDimensions = (file, config) => {
  return new Promise((resolve) => {
    const image = new Image();

    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const { width, height } = image;

      URL.revokeObjectURL(objectUrl);

      if (config.minWidth !== null && width < config.minWidth) {
        resolve({
          valid: false,
          message: `Image width must be at least ${config.minWidth}px.`,
        });
        return;
      }

      if (config.minHeight !== null && height < config.minHeight) {
        resolve({
          valid: false,
          message: `Image height must be at least ${config.minHeight}px.`,
        });
        return;
      }

      if (config.maxWidth !== null && width > config.maxWidth) {
        resolve({
          valid: false,
          message: `Image width must not exceed ${config.maxWidth}px.`,
        });
        return;
      }

      if (config.maxHeight !== null && height > config.maxHeight) {
        resolve({
          valid: false,
          message: `Image height must not exceed ${config.maxHeight}px.`,
        });
        return;
      }

      resolve({
        valid: true,
        width,
        height,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      resolve({
        valid: false,
        message: "Invalid or corrupted image file.",
      });
    };

    image.src = objectUrl;
  });
};

/**
 * Main global image validation function
 *
 * @param {File} file
 * @param {Object} options
 *
 * Example:
 * validateImage(file, {
 *   maxSizeMB: 5,
 *   allowedTypes: ["image/jpeg", "image/png"],
 * })
 */
export const validateImage = async (file, options = {}) => {
  const config = {
    ...DEFAULT_IMAGE_CONFIG,
    ...options,
  };

  // -----------------------------------------
  // 1. File existence
  // -----------------------------------------

  if (!file) {
    return {
      valid: false,
      message: "Please select an image.",
    };
  }

  // -----------------------------------------
  // 2. File object validation
  // -----------------------------------------

  if (!(file instanceof File)) {
    return {
      valid: false,
      message: "Invalid file selected.",
    };
  }

  // -----------------------------------------
  // 3. Empty file validation
  // -----------------------------------------

  if (file.size === 0) {
    return {
      valid: false,
      message: "The selected image is empty.",
    };
  }

  // -----------------------------------------
  // 4. File type validation
  // -----------------------------------------

  const extension = getFileExtension(file.name);

  const isValidMimeType = config.allowedTypes.includes(file.type);

  const isValidExtension = config.allowedExtensions.includes(extension);

  if (!isValidMimeType || !isValidExtension) {
    return {
      valid: false,
      message: `Invalid image format. Allowed formats: ${config.allowedExtensions
        .map((type) => type.toUpperCase())
        .join(", ")}.`,
    };
  }

  // -----------------------------------------
  // 5. File size validation
  // -----------------------------------------

  const fileSizeMB = bytesToMB(file.size);

  if (fileSizeMB > config.maxSizeMB) {
    return {
      valid: false,
      message: `Image size must not exceed ${config.maxSizeMB}MB.`,
    };
  }

  // -----------------------------------------
  // 6. Image dimension validation
  // -----------------------------------------

  const hasDimensionValidation =
    config.minWidth !== null ||
    config.minHeight !== null ||
    config.maxWidth !== null ||
    config.maxHeight !== null;

  if (hasDimensionValidation) {
    const dimensionResult = await validateImageDimensions(file, config);

    if (!dimensionResult.valid) {
      return dimensionResult;
    }

    return {
      valid: true,
      file,
      sizeMB: Number(fileSizeMB.toFixed(2)),
      width: dimensionResult.width,
      height: dimensionResult.height,
      extension,
      type: file.type,
    };
  }

  // -----------------------------------------
  // 7. Success
  // -----------------------------------------

  return {
    valid: true,
    file,
    sizeMB: Number(fileSizeMB.toFixed(2)),
    extension,
    type: file.type,
  };
};

/**
 * Default configuration
 */
export const IMAGE_VALIDATION_CONFIG = DEFAULT_IMAGE_CONFIG;
