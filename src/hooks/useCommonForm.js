import { useCallback, useMemo, useState } from "react";
import { getFieldValue, mapApiErrors, setFieldValue, validateField, validateValues } from "../_helpers/validation";

const hasErrors = (value) =>
  value && typeof value === "object"
    ? Object.values(value).some((item) => (typeof item === "object" ? hasErrors(item) : Boolean(item)))
    : Boolean(value);

export const useCommonForm = ({
  initialValues = {},
  validationSchema = {},
  onSubmit,
  validateOnBlur = true,
  validateOnChange = false,
} = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback((name, value, shouldValidate = validateOnChange) => {
    setValues((current) => {
      const next = setFieldValue(current, name, value);
      if (shouldValidate) {
        const error = validateField(value, validationSchema[name], next, name);
        setErrors((currentErrors) => setFieldValue(currentErrors, name, error));
      }
      return next;
    });
  }, [validateOnChange, validationSchema]);

  const handleChange = useCallback((eventOrName, suppliedValue) => {
    if (typeof eventOrName === "string") {
      setField(eventOrName, suppliedValue);
      return;
    }
    const target = eventOrName?.target;
    if (!target?.name) return;
    const value = target.type === "checkbox" ? target.checked : target.files ? target.files[0] : target.value;
    setField(target.name, value);
  }, [setField]);

  const handleBlur = useCallback((eventOrName) => {
    const name = typeof eventOrName === "string" ? eventOrName : eventOrName?.target?.name;
    if (!name) return;
    setTouched((current) => setFieldValue(current, name, true));
    if (validateOnBlur) {
      setErrors((current) =>
        setFieldValue(current, name, validateField(getFieldValue(values, name), validationSchema[name], values, name))
      );
    }
  }, [validateOnBlur, validationSchema, values]);

  const validate = useCallback(() => {
    const nextErrors = validateValues(values, validationSchema);
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  }, [validationSchema, values]);

  const handleSubmit = useCallback(async (event) => {
    event?.preventDefault?.();
    if (!validate() || !onSubmit) return false;
    setSubmitting(true);
    try {
      await onSubmit(values, { reset: () => setValues(initialValues), setErrors });
      return true;
    } catch (error) {
      const apiErrors = mapApiErrors(error);
      if (hasErrors(apiErrors)) setErrors(apiErrors);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [initialValues, onSubmit, validate, values]);

  const resetForm = useCallback((nextValues = initialValues) => {
    setValues(nextValues);
    setErrors({});
    setTouched({});
    setSubmitting(false);
  }, [initialValues]);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initialValues), [initialValues, values]);

  return {
    values, errors, touched, submitting, loading: submitting, dirty,
    setValues, setErrors, setField, handleChange, handleBlur, handleSubmit,
    validate, resetForm,
  };
};

export default useCommonForm;
