import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdArrowBack, MdAdd, MdDelete, MdEdit, MdClose } from "react-icons/md";
import { formatLabel } from "../../../utils/formatters";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import Input from "../../../components/Atoms/Input/Input";
import Loader from "../../../components/Loader/Loader";
import { useNavigate } from "react-router-dom";
import {
  getCategoryAttributes,
  getList,
  updateCategoryAttributes,
} from "../../../Redux/productSlice";
import {
  getPlatformOptions,
  getPlatformOptionValues,
} from "../../../Redux/adminCoreSlice";
import OrangeButton from "../../../components/Atoms/buttons/OrangeButton";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const EMPTY_ATTRIBUTE = {
  key: "",
  label: "",
  type: "text",
  required: false,
  options: [],
  platformOptionId: "",
  allowCustomOptions: false,
  customOptionsText: "",
  unit: "",
  isVariantAttribute: false,
  isFilterable: false,
  isSearchable: false,
};

const typeOptions = [
  "text",
  "number",
  "select",
  "multi_select",
  "boolean",
  "date",
].map((value) => ({ value, label: formatLabel(value) }));

const CHECKBOX_FIELDS = [
  { key: "required", label: "Required" },
  { key: "isVariantAttribute", label: "Variant" },
  { key: "isFilterable", label: "Filterable" },
  { key: "isSearchable", label: "Searchable" },
];

const cleanId = (val) => {
  if (!val) return "";
  if (typeof val === "object") return String(val._id || val.id || "");
  return String(val).trim();
};

const idOf = (record = {}) => cleanId(record?._id || record?.id);

const valueName = (record) => {
  if (record == null) return "";
  if (typeof record === "string" || typeof record === "number") return String(record).trim();
  return String(
    record.name ||
    record.label ||
    record.value ||
    record.valueCode ||
    record.title ||
    ""
  ).trim();
};

const extractList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const candidates = [
    res?.data?.data,
    res?.data?.items,
    res?.data?.list,
    res?.data?.results,
    res?.data?.normalized?.data,
    res?.normalized?.data,
    res?.data,
    res?.items,
    res?.list,
    res?.results,
    res?.raw?.data,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
};

/* ─── Standard Presets & Suggestion Masters ────────────────────────────── */
const DEFAULT_OPTION_MASTERS = [
  { value: "master_size", label: "Size / Paper Size" },
  { value: "master_ruling", label: "Ruling Type" },
  { value: "master_pages", label: "Number of Pages" },
  { value: "master_cover", label: "Cover & Binding" },
  { value: "master_gsm", label: "Paper GSM / Quality" },
  { value: "master_color", label: "Color" },
];

const PRESET_VALUES_BY_MASTER = {
  master_size: ["A4", "A5", "B5", "A6", "Pocket Size", "5 x 7 Inches", "6 x 9 Inches", "Small", "Medium", "Large"],
  master_ruling: ["Ruled", "Unruled", "Single Line", "Double Line", "Four Line", "Square / Grid", "Dot Grid"],
  master_pages: ["80 Pages", "100 Pages", "120 Pages", "160 Pages", "192 Pages", "200 Pages", "240 Pages", "300 Pages", "400 Pages"],
  master_cover: ["Hardcover", "Softcover", "Spiral Bound", "Wiro Bound", "Stitched", "Leather Bound", "Paperback"],
  master_gsm: ["70 GSM", "80 GSM", "90 GSM", "100 GSM", "120 GSM"],
  master_color: ["Black", "Blue", "Brown", "Red", "Green", "Grey", "Tan", "Multicolour", "Yellow", "White"],
};

const SUGGESTIONS_BY_KEYWORD = {
  rule: ["Ruled", "Unruled", "Single Line", "Double Line", "Four Line", "Square / Grid", "Dot Grid"],
  ruling: ["Ruled", "Unruled", "Single Line", "Double Line", "Four Line", "Square / Grid", "Dot Grid"],
  line: ["Ruled", "Unruled", "Single Line", "Double Line", "Four Line", "Square / Grid", "Dot Grid"],
  page: ["80 Pages", "100 Pages", "120 Pages", "160 Pages", "192 Pages", "200 Pages", "240 Pages", "300 Pages", "400 Pages"],
  size: ["A4", "A5", "B5", "A6", "Pocket Size", "5 x 7 Inches", "6 x 9 Inches", "Small", "Medium", "Large"],
  paper: ["A4", "A5", "B5", "70 GSM", "80 GSM", "90 GSM", "100 GSM", "Recycled Paper", "Bond Paper"],
  cover: ["Hardcover", "Softcover", "Spiral Bound", "Wiro Bound", "Stitched", "Leather Bound", "Paperback"],
  bind: ["Hardcover", "Softcover", "Spiral Bound", "Wiro Bound", "Stitched", "Leather Bound", "Paperback"],
  color: ["Black", "Blue", "Brown", "Red", "Green", "Grey", "Tan", "Multicolour", "Yellow", "White"],
  gsm: ["70 GSM", "80 GSM", "90 GSM", "100 GSM", "120 GSM"],
  material: ["Leather", "Paper", "Cardboard", "Kraft Paper", "Plastic / Poly"],
};

const NOTEBOOK_COMMON_OPTIONS = [
  "Ruled",
  "Unruled",
  "Single Line",
  "Square / Grid",
  "Dot Grid",
  "A4",
  "A5",
  "B5",
  "A6",
  "Pocket Size",
  "5 x 7 Inches",
  "80 Pages",
  "100 Pages",
  "160 Pages",
  "192 Pages",
  "200 Pages",
  "300 Pages",
  "400 Pages",
  "Hardcover",
  "Softcover",
  "Spiral Bound",
  "Wiro Bound",
  "Leather Bound",
  "Paperback",
  "70 GSM",
  "80 GSM",
  "90 GSM",
  "100 GSM",
];

const NOTEBOOK_ATTRIBUTE_PRESETS = [
  {
    id: "ruling",
    buttonLabel: "+ Ruling Type",
    key: "ruling",
    label: "Ruling Type",
    type: "select",
    platformOptionId: "master_ruling",
    options: ["Ruled", "Unruled", "Single Line", "Square / Grid", "Dot Grid"],
    isFilterable: true,
  },
  {
    id: "pages",
    buttonLabel: "+ Number of Pages",
    key: "number_of_pages",
    label: "Number of Pages",
    type: "select",
    platformOptionId: "master_pages",
    options: ["80 Pages", "100 Pages", "160 Pages", "192 Pages", "200 Pages", "300 Pages", "400 Pages"],
    isFilterable: true,
  },
  {
    id: "size",
    buttonLabel: "+ Paper Size",
    key: "paper_size",
    label: "Paper Size",
    type: "select",
    platformOptionId: "master_size",
    options: ["A4", "A5", "B5", "A6", "Pocket Size", "5 x 7 Inches"],
    isFilterable: true,
  },
  {
    id: "cover",
    buttonLabel: "+ Cover & Binding",
    key: "cover_binding",
    label: "Cover & Binding",
    type: "select",
    platformOptionId: "master_cover",
    options: ["Hardcover", "Softcover", "Spiral Bound", "Wiro Bound", "Leather Bound"],
    isFilterable: true,
  },
  {
    id: "gsm",
    buttonLabel: "+ Paper GSM",
    key: "paper_gsm",
    label: "Paper GSM",
    type: "select",
    platformOptionId: "master_gsm",
    options: ["70 GSM", "80 GSM", "90 GSM", "100 GSM"],
    isFilterable: true,
  },
];

const toCategoryOptions = (categories = []) => {
  const options = [];

  const walkNested = (nodes = [], prefix = "") => {
    nodes.forEach((category) => {
      const key = category?.categoryKey || category?._id;
      if (!key) return;
      const name = category?.name || category?.title || category?.categoryKey;
      const label = prefix ? `${prefix} > ${name}` : name;
      options.push({ value: key, label, category });
      const children =
        category?.children ||
        category?.subcategories ||
        category?.subCategories ||
        [];
      if (Array.isArray(children) && children.length) {
        walkNested(children, label);
      }
    });
  };

  const hasNested = categories.some(
    (item) =>
      Array.isArray(item?.children) ||
      Array.isArray(item?.subcategories) ||
      Array.isArray(item?.subCategories),
  );
  if (hasNested) {
    walkNested(categories);
    return options;
  }

  const byParent = new Map();
  categories.forEach((category) => {
    const parent = category?.parentKey
      ? String(category.parentKey)
      : "__root__";
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(category);
  });

  const walkFlatTree = (parent = "__root__", prefix = "") => {
    (byParent.get(parent) || [])
      .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
      .forEach((category) => {
        const key = category?.categoryKey || category?._id;
        if (!key) return;
        const name = category?.name || category?.title || category?.categoryKey;
        const label = prefix ? `${prefix} > ${name}` : name;
        options.push({ value: key, label, category });
        walkFlatTree(String(key), label);
      });
  };

  walkFlatTree();
  return options;
};

/* ─── Attribute Row (edit mode) ─────────────────────────────────────────── */
const AttributeRow = ({
  attribute,
  index,
  onUpdate,
  onRemove,
  platformOptionChoices,
  optionValues,
  onLoadOptionValues,
}) => {
  const currentOptionId = cleanId(attribute.platformOptionId);

  // Auto-fetch option values if optionId is set/selected from server but not loaded yet
  useEffect(() => {
    if (
      currentOptionId &&
      !currentOptionId.startsWith("master_") &&
      (!optionValues[currentOptionId] || optionValues[currentOptionId].length === 0)
    ) {
      onLoadOptionValues(currentOptionId);
    }
  }, [currentOptionId, optionValues, onLoadOptionValues]);

  const masterValues = useMemo(() => {
    if (!currentOptionId) return [];
    if (currentOptionId.startsWith("master_") && PRESET_VALUES_BY_MASTER[currentOptionId]) {
      return PRESET_VALUES_BY_MASTER[currentOptionId];
    }
    const fromState = optionValues[currentOptionId] || [];
    if (fromState.length > 0) return fromState;
    // Check if matching master preset exists by name
    const choice = platformOptionChoices.find((c) => c.value === currentOptionId);
    const label = (choice?.label || "").toLowerCase();
    for (const [mKey, vals] of Object.entries(PRESET_VALUES_BY_MASTER)) {
      const mLabel = mKey.replace("master_", "");
      if (label.includes(mLabel)) return vals;
    }
    return [];
  }, [currentOptionId, optionValues, platformOptionChoices]);

  const existingOptions = Array.isArray(attribute.options) ? attribute.options : [];

  // Match keyword suggestions based on attribute.key and attribute.label
  const keywordMatches = useMemo(() => {
    const text = `${attribute.key || ""} ${attribute.label || ""}`.toLowerCase();
    const matches = new Set();
    Object.entries(SUGGESTIONS_BY_KEYWORD).forEach(([keyword, vals]) => {
      if (text.includes(keyword)) {
        vals.forEach((v) => matches.add(v));
      }
    });
    return Array.from(matches);
  }, [attribute.key, attribute.label]);

  // Build combined options list for the Allowed Values dropdown
  const allowedSelectOptions = useMemo(() => {
    const map = new Map();

    // 1. If master values exist, put them first
    masterValues.forEach((item) => {
      const name = valueName(item);
      if (name) map.set(name, { value: name, label: name });
    });

    // 2. Add keyword suggestions
    keywordMatches.forEach((val) => {
      const name = valueName(val);
      if (name && !map.has(name)) {
        map.set(name, { value: name, label: name });
      }
    });

    // 3. Add existing selected options so they are always selectable and displayed
    existingOptions.forEach((item) => {
      const name = valueName(item);
      if (name && !map.has(name)) {
        map.set(name, { value: name, label: name });
      }
    });

    // 4. Always ensure common notebook options are present as choices
    NOTEBOOK_COMMON_OPTIONS.forEach((val) => {
      if (!map.has(val)) {
        map.set(val, { value: val, label: val });
      }
    });

    // 5. Add any option values loaded from other platform options
    Object.values(optionValues).forEach((valList) => {
      if (Array.isArray(valList)) {
        valList.forEach((item) => {
          const name = valueName(item);
          if (name && !map.has(name)) {
            map.set(name, { value: name, label: name });
          }
        });
      }
    });

    return Array.from(map.values());
  }, [masterValues, keywordMatches, existingOptions, optionValues]);

  const currentSelectValue = useMemo(() => {
    return existingOptions
      .map((item) => {
        const name = valueName(item);
        return name ? { value: name, label: name } : null;
      })
      .filter(Boolean);
  }, [existingOptions]);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Attribute #{index + 1}
        </span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
        >
          <MdDelete size={14} /> Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          labelName="Key"
          value={attribute.key}
          onChange={(e) => onUpdate(index, "key", e.target.value)}
          placeholder="e.g. ruling or pages"
        />
        <Input
          labelName="Label"
          value={attribute.label}
          onChange={(e) => onUpdate(index, "label", e.target.value)}
          placeholder="e.g. Ruling Type or Pages"
        />
        <FilterSelect
          label="Type"
          options={typeOptions}
          value={typeOptions.find((item) => item.value === attribute.type)}
          onChange={(option) => {
            const nextType = option?.value || "text";
            onUpdate(index, "type", nextType);
            if (nextType !== "select" && nextType !== "multi_select") {
              onUpdate(index, "platformOptionId", "");
              onUpdate(index, "options", []);
              onUpdate(index, "allowCustomOptions", false);
              onUpdate(index, "customOptionsText", "");
            }
          }}
        />
        {(attribute.type === "select" || attribute.type === "multi_select") && (
          <>
            <FilterSelect
              label="Product Option Master"
              options={platformOptionChoices}
              value={
                platformOptionChoices.find(
                  (item) => item.value === currentOptionId,
                ) || null
              }
              onChange={(option) => {
                const nextOptionId = option?.value ? String(option.value) : "";
                onUpdate(index, "platformOptionId", nextOptionId);
                if (nextOptionId) onLoadOptionValues(nextOptionId);
              }}
              placeholder="Select Size, Color, Ruling, Pages..."
              isClearable
            />
            <div className="md:col-span-2">
              <FilterSelect
                label="Allowed Values"
                isMulti
                isCreatable
                options={allowedSelectOptions}
                value={currentSelectValue}
                onChange={(selected) => {
                  const values = (selected || [])
                    .map((item) =>
                      typeof item === "object" ? valueName(item) : String(item),
                    )
                    .filter(Boolean);
                  onUpdate(index, "options", values);
                }}
                placeholder="Select from options or type custom values..."
                helperText="Click to select allowed values from the list, or type a custom value and press Enter"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(attribute.allowCustomOptions)}
                  onChange={(e) =>
                    onUpdate(index, "allowCustomOptions", e.target.checked)
                  }
                  className="w-3.5 h-3.5 accent-[var(--admin-blue)]"
                />
                Allow custom category-specific values
              </label>
              {attribute.allowCustomOptions && (
                <Input
                  labelName="Custom Values (comma separated)"
                  value={attribute.customOptionsText || ""}
                  onChange={(e) =>
                    onUpdate(index, "customOptionsText", e.target.value)
                  }
                  placeholder="e.g. 100 Pages, 200 Pages, Spiral Bound"
                />
              )}
            </div>
          </>
        )}
        {attribute.type === "number" && (
          <Input
            labelName="Unit"
            value={attribute.unit}
            onChange={(e) => onUpdate(index, "unit", e.target.value)}
            placeholder="e.g. kg, cm"
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        {CHECKBOX_FIELDS.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={Boolean(attribute[key])}
              onChange={(e) => onUpdate(index, key, e.target.checked)}
              className="w-4 h-4 accent-[var(--admin-blue)] rounded"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
};

/* ─── Category Listing Row ───────────────────────────────────────────────── */
const CategoryRow = ({ option, attrCount, onEdit, loadingKey }) => {
  const parts = option.label.split(" > ");
  const depth = parts.length - 1;
  const name = parts[parts.length - 1];
  const path = parts.slice(0, -1).join(" > ");

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div
          style={{ paddingLeft: `${depth * 16}px` }}
          className="flex items-center gap-2"
        >
          {depth > 0 && <span className="text-gray-300 text-xs">└</span>}
          <div>
            <p className="text-sm font-medium text-gray-800 capitalize">
              {name}
            </p>
            {path && <p className="text-xs text-gray-400 mt-0.5">{path}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            attrCount > 0
              ? "bg-blue-50 text-blue-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {attrCount != null ? attrCount : "—"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onEdit(option)}
          disabled={loadingKey === option.value}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--admin-blue)] border border-[var(--admin-blue)] rounded hover:bg-[var(--admin-blue)] hover:text-white transition-colors disabled:opacity-50"
        >
          <MdEdit size={13} />
          {loadingKey === option.value ? "Loading…" : "Edit Attributes"}
        </button>
      </td>
    </tr>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const CategoryAttributesPanel = ({
  embedded = false,
  initialCategory = null,
  onClose,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.product);
  const initialCategoryKey = initialCategory
    ? String(initialCategory.categoryKey || initialCategory._id || "")
    : "";
  const initialCategoryLabel =
    initialCategory?.name ||
    initialCategory?.title ||
    initialCategory?.categoryName ||
    initialCategory?.categoryKey ||
    "";
  const initialCategoryOption = useMemo(
    () =>
      initialCategoryKey
        ? {
            value: initialCategoryKey,
            label: initialCategoryLabel,
            category: initialCategory,
          }
        : null,
    [initialCategory, initialCategoryKey, initialCategoryLabel],
  );

  const categories = useMemo(() => {
    const payload = selector?.getListData?.data?.data || {};
    if (Array.isArray(payload)) return payload;
    return payload?.list || payload?.items || [];
  }, [selector?.getListData?.data?.data]);

  const categoryOptions = useMemo(
    () => toCategoryOptions(categories),
    [categories],
  );

  // view: 'list' | 'edit'
  const [view, setView] = useState(initialCategoryOption ? "edit" : "list");
  const [selectedCategory, setSelectedCategory] = useState(
    initialCategoryOption,
  );
  const [attributes, setAttributes] = useState([]);
  const [loadingKey, setLoadingKey] = useState(null);
  const [saving, setSaving] = useState(false);
  // Cache attribute counts per category key after first load
  const [attrCounts, setAttrCounts] = useState({});
  const [platformOptions, setPlatformOptions] = useState([]);
  const [optionValues, setOptionValues] = useState({});

  const loadedInitialCategoryRef = useRef("");

  const loadOptionValues = useCallback(
    async (rawOptionId) => {
      const optionId = cleanId(rawOptionId);
      if (!optionId) return;
      if (optionId.startsWith("master_")) {
        setOptionValues((prev) => ({
          ...prev,
          [optionId]: PRESET_VALUES_BY_MASTER[optionId] || [],
        }));
        return;
      }
      if (optionValues[optionId] && optionValues[optionId].length > 0) return;

      let foundList = null;

      try {
        const res = await dispatch(
          getPlatformOptionValues({
            optionId,
            option_id: optionId,
            limit: 200,
          }),
        ).unwrap();
        const list = extractList(res);
        if (Array.isArray(list) && list.length > 0) {
          foundList = list;
        }
      } catch (err) {
        console.warn("getPlatformOptionValues error:", err);
      }

      if (!foundList || foundList.length === 0) {
        try {
          const dropdownRes = await dropdownApi.getProductOptionValues(optionId);
          const list = extractList(dropdownRes);
          if (Array.isArray(list) && list.length > 0) {
            foundList = list;
          }
        } catch (err) {
          console.warn("dropdownApi.getProductOptionValues error:", err);
        }
      }

      setOptionValues((prev) => ({
        ...prev,
        [optionId]: foundList || [],
      }));
    },
    [dispatch, optionValues],
  );

  useEffect(() => {
    dispatch(getList({ tree: true, limit: 100 }));
    dispatch(getPlatformOptions({ limit: 200 }))
      .unwrap()
      .then((res) => {
        const list = extractList(res);
        if (list.length > 0) {
          setPlatformOptions(list);
          list.forEach((opt) => {
            const optId = cleanId(opt);
            if (optId) loadOptionValues(optId);
          });
        } else {
          dropdownApi
            .getProductOptions()
            .then((dRes) => {
              const dList = extractList(dRes);
              setPlatformOptions(dList);
              dList.forEach((opt) => {
                const optId = cleanId(opt);
                if (optId) loadOptionValues(optId);
              });
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        dropdownApi
          .getProductOptions()
          .then((dRes) => {
            const dList = extractList(dRes);
            setPlatformOptions(dList);
            dList.forEach((opt) => {
              const optId = cleanId(opt);
              if (optId) loadOptionValues(optId);
            });
          })
          .catch(() => {});
      });
  }, [dispatch, loadOptionValues]);

  const platformOptionChoices = useMemo(() => {
    const map = new Map();
    // 1. Add server platform options
    platformOptions.forEach((item) => {
      const id = cleanId(item);
      const name = item.name || item.slug || item.title || id;
      if (id && name) map.set(id, { value: id, label: name });
    });
    // 2. Add default option masters
    DEFAULT_OPTION_MASTERS.forEach(({ value, label }) => {
      const exists = Array.from(map.values()).some(
        (opt) =>
          opt.label.toLowerCase().includes(label.toLowerCase()) ||
          label.toLowerCase().includes(opt.label.toLowerCase()),
      );
      if (!exists) {
        map.set(value, { value, label });
      }
    });
    return Array.from(map.values());
  }, [platformOptions]);

  const openEditor = useCallback(
    (option) => {
      setLoadingKey(option.value);
      dispatch(
        getCategoryAttributes({
          categoryKey: option.value,
          categoryId: option.value,
          _id: option.value,
          id: option.value,
        }),
      )
        .unwrap()
        .then((res) => {
          const schema =
            res?.data?.attributeSchema ||
            res?.data?.data?.attributeSchema ||
            res?.attributeSchema ||
            (Array.isArray(res?.data) ? res.data : []);
          const formattedSchema = schema.map((item) => {
            const optId = cleanId(item.platformOptionId || item.optionId);
            const rawOpts = Array.isArray(item.options)
              ? item.options
              : String(item.options || "")
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean);
            return {
              ...EMPTY_ATTRIBUTE,
              ...item,
              platformOptionId: optId,
              options: rawOpts.map((o) => valueName(o)).filter(Boolean),
            };
          });

          setAttributes(formattedSchema);
          formattedSchema.forEach((item) => {
            if (item.platformOptionId) {
              loadOptionValues(item.platformOptionId);
            }
          });
          setAttrCounts((prev) => ({
            ...prev,
            [option.value]: formattedSchema.length,
          }));
          setSelectedCategory(option);
          setView("edit");
        })
        .catch(() => {
          setAttributes([]);
          setSelectedCategory(option);
          setView("edit");
        })
        .finally(() => setLoadingKey(null));
    },
    [dispatch, loadOptionValues],
  );

  useEffect(() => {
    loadedInitialCategoryRef.current = "";
  }, [initialCategoryKey]);

  useEffect(() => {
    if (!initialCategoryKey) return;
    const matchedOption =
      categoryOptions.find(
        (option) => String(option.value) === initialCategoryKey,
      ) || initialCategoryOption;
    if (
      !matchedOption?.value ||
      loadedInitialCategoryRef.current === matchedOption.value
    ) {
      return;
    }
    loadedInitialCategoryRef.current = matchedOption.value;
    openEditor(matchedOption);
  }, [categoryOptions, initialCategoryKey, initialCategoryOption, openEditor]);

  const handleBack = () => {
    if (embedded && initialCategoryKey) {
      onClose?.();
      return;
    }
    setView("list");
    setSelectedCategory(null);
    setAttributes([]);
  };

  const updateAttribute = (index, field, value) => {
    setAttributes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeAttribute = (index) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedCategory?.value) {
      toast.error("No category selected");
      return;
    }

    const keySet = new Set();
    const duplicateKeys = [];
    const payload = attributes
      .filter((item) => item.key && item.label)
      .map((item) => {
        const rawOptions = Array.isArray(item.options) ? item.options : [];
        const customFromText = item.allowCustomOptions
          ? String(item.customOptionsText || "")
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : [];
        const uniqueOptions = Array.from(
          new Set(
            [...rawOptions, ...customFromText]
              .map((o) => valueName(o))
              .filter(Boolean),
          ),
        );

        return {
          key: item.key
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_"),
          label: item.label.trim(),
          type: item.type,
          required: Boolean(item.required),
          platformOptionId: cleanId(item.platformOptionId),
          options: uniqueOptions,
          allowCustomOptions: Boolean(item.allowCustomOptions),
          unit: item.unit || null,
          isVariantAttribute: Boolean(item.isVariantAttribute),
          isFilterable: Boolean(item.isFilterable),
          isSearchable: Boolean(item.isSearchable),
        };
      });

    payload.forEach((item) => {
      if (keySet.has(item.key)) duplicateKeys.push(item.key);
      keySet.add(item.key);
    });
    if (duplicateKeys.length) {
      toast.error(`Duplicate attribute keys: ${duplicateKeys.join(", ")}`);
      return;
    }

    const invalidSelect = payload.filter(
      (item) =>
        (item.type === "select" || item.type === "multi_select") &&
        !item.platformOptionId &&
        !item.options.length,
    );
    if (invalidSelect.length) {
      toast.error(
        "Select / multi-select attributes must have at least one value (use an option master or add custom values).",
      );
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateCategoryAttributes({
          categoryKey: selectedCategory.value,
          categoryId: selectedCategory.value,
          _id: selectedCategory.value,
          id: selectedCategory.value,
          attributeSchema: payload,
        }),
      ).unwrap();
      toast.success("Category attributes saved");
      setAttrCounts((prev) => ({
        ...prev,
        [selectedCategory.value]: payload.length,
      }));
      dispatch(getList({ tree: true, limit: 100 }));
    } catch (error) {
      toast.error(error?.message || "Failed to save category attributes");
    } finally {
      setSaving(false);
    }
  };

  /* ── LIST VIEW ────────────────────────────────────────────────────────── */
  if (view === "list") {
    return (
      <div className={`${embedded ? "h-full overflow-y-auto p-5" : ""}`}>
        <Loader loading={selector.loading} />
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Category Attributes
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Configure which attributes appear in Product Catalog per category
            </p>
          </div>
          {embedded ? (
            <button
              type="button"
              className="text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              className="text-xs text-[var(--admin-blue)] border border-[var(--admin-blue)] px-3 py-1.5 rounded hover:bg-[var(--admin-blue)] hover:text-white transition-colors"
              onClick={() => navigate("/app/product-catalog")}
            >
              Open Product Catalog
            </button>
          )}
        </div>

        <div className="bg-white border border-[#E6E6E6] rounded-lg overflow-hidden">
          {categoryOptions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              {selector.loading ? "Loading categories…" : "No categories found"}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">
                    Attributes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryOptions.map((option) => (
                  <CategoryRow
                    key={option.value}
                    option={option}
                    attrCount={attrCounts[option.value]}
                    onEdit={openEditor}
                    loadingKey={loadingKey}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  /* ── EDIT VIEW ────────────────────────────────────────────────────────── */
  const categoryName =
    selectedCategory?.label?.split(" > ").pop() || selectedCategory?.label;
  const categoryPath = selectedCategory?.label
    ?.split(" > ")
    .slice(0, -1)
    .join(" > ");

  return (
    <div className={`${embedded ? "h-full overflow-y-auto p-5" : ""}`}>
      <Loader loading={selector.loading || saving} />

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 capitalize">
              {categoryName}
            </h1>
            {categoryPath && (
              <p className="text-xs text-gray-400 mt-0.5">{categoryPath}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors shadow-sm"
              title="Close"
            >
              <MdClose size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-2">
        <span className="text-blue-500 mt-0.5">ℹ</span>
        <p className="text-xs text-blue-800">
          These attributes control which fields appear when adding/editing
          products under <strong>{categoryName}</strong>. You can choose from presets below or add custom attributes.
        </p>
      </div>

      {/* Quick Notebook Presets */}
      <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
        <p className="text-xs font-semibold text-blue-900 mb-2">
          Notebook Attribute Presets: Click to quickly add standard attributes with allowed values
        </p>
        <div className="flex flex-wrap gap-2">
          {NOTEBOOK_ATTRIBUTE_PRESETS.map((preset) => {
            const alreadyAdded = attributes.some((a) => a.key === preset.key);
            return (
              <button
                key={preset.id}
                type="button"
                disabled={alreadyAdded}
                onClick={() => {
                  setAttributes((prev) => [
                    ...prev,
                    {
                      ...EMPTY_ATTRIBUTE,
                      key: preset.key,
                      label: preset.label,
                      type: preset.type,
                      platformOptionId: preset.platformOptionId,
                      options: [...preset.options],
                      isFilterable: true,
                      isSearchable: true,
                    },
                  ]);
                  toast.success(`Added ${preset.label} with standard allowed values`);
                }}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                  alreadyAdded
                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                    : "bg-white text-[var(--admin-blue)] border border-[var(--admin-blue)]/30 hover:bg-[var(--admin-blue)] hover:text-white shadow-sm"
                }`}
              >
                {preset.buttonLabel} {alreadyAdded ? "(Added)" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Attribute editor */}
      {attributes.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg py-12 text-center">
          <p className="text-gray-400 text-sm mb-3">
            No attributes defined for this category yet.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {NOTEBOOK_ATTRIBUTE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setAttributes([
                    {
                      ...EMPTY_ATTRIBUTE,
                      key: preset.key,
                      label: preset.label,
                      type: preset.type,
                      platformOptionId: preset.platformOptionId,
                      options: [...preset.options],
                      isFilterable: true,
                      isSearchable: true,
                    },
                  ]);
                  toast.success(`Added ${preset.label} with standard allowed values`);
                }}
                className="text-xs px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
              >
                {preset.buttonLabel}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--admin-blue)] text-white text-sm hover:bg-[#2f3070]"
            onClick={() => setAttributes([{ ...EMPTY_ATTRIBUTE }])}
          >
            <MdAdd size={15} /> Add Custom Attribute
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {attributes.map((attribute, index) => (
            <AttributeRow
              key={`attr-${index}`}
              attribute={attribute}
              index={index}
              onUpdate={updateAttribute}
              onRemove={removeAttribute}
              platformOptionChoices={platformOptionChoices}
              optionValues={optionValues}
              onLoadOptionValues={loadOptionValues}
            />
          ))}

          <button
            type="button"
            className="w-full border border-dashed border-[var(--admin-blue)] text-[var(--admin-blue)] rounded-lg py-3 text-sm hover:bg-[#f0f0ff] transition-colors flex items-center justify-center gap-1.5"
            onClick={() =>
              setAttributes((prev) => [...prev, { ...EMPTY_ATTRIBUTE }])
            }
          >
            <MdAdd size={15} /> Add Another Attribute
          </button>
        </div>
      )}

      {/* Bottom save */}
      {attributes.length > 0 && (
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
          >
            Cancel
          </button>

          <OrangeButton onClick={handleSave}>
            {saving ? "Saving…" : "Save Attributes"}
          </OrangeButton>
        </div>
      )}
    </div>
  );
};

const CategoryAttributes = () => <CategoryAttributesPanel />;

export { CategoryAttributesPanel };
export default CategoryAttributes;
