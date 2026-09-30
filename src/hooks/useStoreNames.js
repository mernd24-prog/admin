import { useEffect, useState } from "react";
import { dropdownApi } from "../_helpers/dropdownApi";

const normalizeId = (id) => {
  if (id === null || id === undefined || id === "") return "";
  return String(id);
};

const useStoreNames = () => {
  const [storeNameMap, setStoreNameMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchStoreNames = async () => {
      try {
        const stores = await dropdownApi.getStoreName({
          keyWord: "",
          searchFields: "organizationName,businessName,legalBusinessName",
          limit: 100,
        });

        const storeMap = {};

        (Array.isArray(stores) ? stores : []).forEach((store) => {
          const storeName =
            store.label ||
            store.storeDisplayName ||
            store.businessName ||
            store.organizationName ||
            store.legalBusinessName;

          if (!storeName) return;

          const organizationId = normalizeId(
            store.value ||
              store.organizationId ||
              store.organization_id ||
              store.id,
          );

          const sellerId = normalizeId(
            store.meta?.sellerId ||
              store.meta?.seller_id ||
              store.sellerId ||
              store.seller_id,
          );

          if (organizationId) {
            storeMap[organizationId] = storeName;
          }

          if (sellerId) {
            storeMap[sellerId] = storeName;
          }
        });

        if (isMounted) {
          setStoreNameMap(storeMap);
        }
      } catch (error) {
        console.error("Failed to fetch store names:", error);

        if (isMounted) {
          setStoreNameMap({});
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStoreNames();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    storeNameMap,
    loading,
  };
};

export default useStoreNames;
