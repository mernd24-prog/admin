import { useEffect, useMemo, useState } from "react";
import { dropdownApi } from "../_helpers/dropdownApi";

export const withSelectedOption = (options = [], value = "") => {
  if (!value || options.some((option) => String(option.value) === String(value))) return options;
  return [{ label: value, value, id: "", meta: { unavailable: true } }, ...options];
};

const useDropdownOptions = (resource, params = {}, { enabled = true } = {}) => {
  const serializedParams = JSON.stringify(params);
  const stableParams = useMemo(() => JSON.parse(serializedParams), [serializedParams]);
  const [state, setState] = useState({ options: [], loading: false, error: "" });

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setState({ options: [], loading: false, error: "" });
      return undefined;
    }

    setState((current) => ({ ...current, loading: true, error: "" }));
    dropdownApi.get(resource, stableParams)
      .then((options) => {
        if (active) setState({ options, loading: false, error: "" });
      })
      .catch((error) => {
        if (active) {
          setState({ options: [], loading: false, error: error?.message || "Unable to load options" });
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, resource, stableParams]);

  return state;
};

export default useDropdownOptions;
