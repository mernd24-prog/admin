import React, { useCallback, useEffect, useMemo, useState } from "react";
import Loader from "../../../components/Loader/Loader";
import TableData from "../../../components/Atoms/TableData/TableData";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllBrandList,
  getList,
  getProducts,
} from "../../../Redux/productSlice";
import { toast } from "sonner";

import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import { transformArray } from "../../../_helpers/globalFunctions";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import ImageGallery from "../../../components/Atoms/ImageGallery/ImageGallery";
import Pagination from "../../../components/Pagination/Pagination";
import Code128Barcode from "./Code128Barcode";
import Button from "../../../components/Atoms/buttons/button";

const TABLE_HEADINGS = ["Image", "Name", "Barcode Label", "Actions"];

const SIZE_OPTIONS = [
  { value: "1", label: "1" },
  { value: "3", label: "3" },
  { value: "10", label: "10" },
  { value: "16", label: "16" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

const INITIAL_FILTERS = {
  search: "",
  product: null,
  category: null,
  brand: null,
};

const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "N/A";
  }
};

const getPrintStyles = () => `
    @page {
        size: 80mm 210mm;
        margin: 2mm;
    }
    
    body { 
        margin: 0; 
        padding: 0;
        font-family: Arial, sans-serif; 
        background: white;
        width: 76mm; /* 80mm - 4mm margin */
        height: 206mm; /* 210mm - 4mm margin */
    }
    
    .label-container {
        width: 76mm;
        height: 206mm;
        border: 1px solid #000;
        padding: 3mm;
        box-sizing: border-box;
        background: white;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        font-size: 10px;
        margin-bottom: 2mm;
        border-bottom: 1px solid #ccc;
        padding-bottom: 1mm;
    }
    
    .brand-name {
        text-transform: capitalize;
        font-size: 9px;
    }
    
    .product-section {
        text-align: center;
        margin: 2mm 0;
    }
    
    .product-name {
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        margin: 2mm 0;
        line-height: 1.2;
        word-wrap: break-word;
    }
    
    .product-id {
        font-size: 8px;
        margin: 1mm 0;
        color: #666;
    }
    
    .barcode-section {
        text-align: center;
        margin: 3mm 0;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    
    .barcode-canvas {
        max-width: 70mm;
        height: auto;
        margin: 2mm 0;
    }
    
    .barcode-number {
        font-size: 9px;
        font-weight: bold;
        margin: 1mm 0;
        letter-spacing: 1px;
        font-family: 'Courier New', monospace;
    }
    
    .pricing-section {
        margin-top: 3mm;
        border-top: 1px solid #ccc;
        padding-top: 2mm;
    }
    
    .price-row {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        margin: 1mm 0;
        font-weight: bold;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1mm;
        margin-top: 2mm;
        font-size: 9px;
        font-weight: bold;
    }
    
    .info-item {
        padding: 1mm;
        background: #f8f8f8;
        border-radius: 1mm;
        text-align: center;
    }
    
    .date-section {
        text-align: center;
        font-size: 8px;
        margin-top: 2mm;
        padding-top: 1mm;
        border-top: 1px dashed #ccc;
    }
    
    .no-print { 
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        background: white;
        padding: 20px;
        border: 2px solid #000;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .no-print button {
        padding: 10px 20px; 
        font-size: 16px; 
        border: none; 
        border-radius: 4px; 
        cursor: pointer;
        margin: 0 5px;
    }
    
    .print-btn {
        background: #007bff; 
        color: white;
    }
    
    .close-btn {
        background: #6c757d; 
        color: white;
    }
    
    @media print {
        body { 
            margin: 0; 
            padding: 0; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .no-print { display: none; }
        .label-container {
            border: 1px solid #000 !important;
        }
    }
`;

const BarcodePage = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.product);

  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [pageNo, setPageNo] = useState(1);
  const [size, setSize] = useState(10);
  const [isProductView, setIsProductView] = useState(false);
  const [isProductData, setIsProductData] = useState(null);

  const modifiedBrandData = useMemo(
    () => transformArray(selector?.getAllBrandListData?.data?.data?.list),
    [selector?.getAllBrandListData?.data?.data?.list],
  );

  const createSelectOptions = useMemo(() => {
    const options = [];

    const addOptions = (categories, prefix = "") => {
      if (!Array.isArray(categories)) return;

      categories.forEach((category) => {
        const label = prefix ? `${prefix} > ${category.name}` : category.name;
        options.push({
          value: category._id,
          label,
        });

        if (
          Array.isArray(category.subcategories) &&
          category.subcategories.length > 0
        ) {
          addOptions(category.subcategories, label);
        }
      });
    };

    addOptions(selector?.getListData?.data?.data);
    return options;
  }, [selector?.getListData]);

  const fetchProductsList = useCallback(async () => {
    setLoading(true);
    try {
      const query = {
        page: pageNo,
        size: size,
        keyWord: filters.search || "",
        searchFields: "name",
        populate:
          "product_catalogs_id:images|product_image_id:images|brand_id:name|hsn_code:code",
      };

      // Add filters to query
      const queryFilters = {};
      if (filters.brand?.value) {
        queryFilters.brand_id = filters.brand.value;
      }
      if (filters.category?.value) {
        queryFilters.category_id = filters.category.value;
      }

      if (Object.keys(queryFilters).length > 0) {
        query.query = JSON.stringify(queryFilters);
      }

      const response = await dispatch(getProducts(query));

      if (response?.payload?.data) {
        setApiRes(response.payload.data);
      } else {
        setApiRes({ list: [], total: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to fetch products");
      setApiRes({ list: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [dispatch, filters, size, pageNo]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([dispatch(getAllBrandList()), dispatch(getList())]);
      } catch (error) {
        console.error("Failed to initialize data:", error);
        toast.error("Failed to load initial data");
      }
    };

    initializeData();
  }, [dispatch]);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList]);

  const printBarcodeLabel = useCallback((product) => {
    if (!product?._id) {
      toast.error("Invalid product data");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Unable to open print window. Please check popup blocker.");
      return;
    }

    const barcodeNumber = product._id.toUpperCase();
    const currentDate = formatDate(new Date());

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Thermal Label - ${product.name || "Product"}</title>
            <meta charset="UTF-8">
            <style>${getPrintStyles()}</style>
            <script src="https://cdn.jsdelivr.net/npm/bwip-js@3.0.2/dist/bwip-js.min.js"></script>
        </head>
        <body>
            <div class="label-container">
                <div class="header">
                    <span>BRAND</span>
                    <span class="brand-name">${product?.brand_id?.name || "N/A"}</span>
                </div>
                
                <div class="product-section">
                    <div class="product-name">${product.name || "N/A"}</div>
                    <div class="product-id">ID: ${product._id}</div>
                </div>
                
                <div class="barcode-section">
                    <canvas id="barcode-${product._id}" class="barcode-canvas"></canvas>
                    <div class="barcode-number">${barcodeNumber}</div>
                </div>
                
                <div class="pricing-section">
                    <div class="price-row">
                        <span>MRP:</span>
                        <span>₹${product.basePrice || "N/A"}</span>
                    </div>
                    <div class="price-row">
                        <span>SALE:</span>
                        <span>₹${product.salePrice || "N/A"}</span>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <div>DISC</div>
                            <div>${product.discount || 0}%</div>
                        </div>
                        <div class="info-item">
                            <div>COD</div>
                            <div>${product.cod ? "YES" : "NO"}</div>
                        </div>
                        <div class="info-item">
                            <div>HSN</div>
                            <div>${product.hsn_code?.code || "N/A"}</div>
                        </div>
                        <div class="info-item">
                            <div>PKD</div>
                            <div>${currentDate}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="no-print">
                <h3>Thermal Label Preview</h3>
                <p>80mm x 210mm format</p>
                <button onclick="window.print()" class="print-btn">
                    Print Label
                </button>
                <button onclick="window.close()" class="close-btn">
                    Close
                </button>
            </div>

            <script>
                window.onload = function() {
                    try {
                        bwipjs.toCanvas(document.getElementById('barcode-${product._id}'), {
                            bcid: 'code128',
                            text: '${barcodeNumber}',
                            scale: 2,
                            height: 15,
                            includetext: false,
                            textxalign: 'center',
                            backgroundcolor: 'ffffff'
                        });
                    } catch (error) {
                        console.error('Barcode generation error:', error);
                        document.getElementById('barcode-${product._id}').style.display = 'none';
                    }
                };
            </script>
        </body>
        </html>
    `;

    try {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } catch (error) {
      console.error("Print window error:", error);
      toast.error("Error opening print window");
      printWindow.close();
    }
  }, []);

  const getBulkPrintStyles = () => `
    @page {
        size: 80mm 210mm;  
        margin: 2mm;
    }
    
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        width: 76mm;
    }
    
    .labels-container {
        width: 76mm;
    }
    
    .label-container {
        width: 76mm;
        height: 60mm;  /* Reduced height to fit 3 per page */
        border: 1px solid #000;
        padding: 2mm;
        box-sizing: border-box;
        background: white;
        margin-bottom: 2mm;
        page-break-inside: avoid;
    }
    
    /* Last label on the page shouldn't have bottom margin */
    .label-container:last-child {
        margin-bottom: 0;
    }
    
    /* Compact styles for the label content */
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        font-size: 8px;
        margin-bottom: 1mm;
        border-bottom: 1px solid #ccc;
        padding-bottom: 1mm;
    }
    
    .brand-name {
        text-transform: capitalize;
        font-size: 8px;
    }
    
    .product-section {
        text-align: center;
        margin: 1mm 0;
    }
    
    .product-name {
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
        margin: 1mm 0;
        line-height: 1.1;
        word-wrap: break-word;
    }
    
    .product-id {
        font-size: 7px;
        margin: 0.5mm 0;
        color: #666;
    }
    
    .barcode-section {
        text-align: center;
        margin: 1mm 0;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    
    .barcode-canvas {
        max-width: 65mm;
        height: 15mm;
        margin: 1mm 0;
    }
    
    .barcode-number {
        font-size: 8px;
        font-weight: bold;
        margin: 0.5mm 0;
        letter-spacing: 0.5px;
        font-family: 'Courier New', monospace;
    }
    
    .pricing-section {
        margin-top: 1mm;
        border-top: 1px solid #ccc;
        padding-top: 1mm;
    }
    
    .price-row {
        display: flex;
        justify-content: space-between;
        font-size: 8px;
        margin: 0.5mm 0;
        font-weight: bold;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5mm;
        margin-top: 1mm;
        font-size: 9px;
    }
    
    .info-item {
        padding: 0.5mm;
        background: #f8f8f8;
        border-radius: 1mm;
        text-align: center;
    }
    
    .date-section {
        text-align: center;
        font-size: 7px;
        margin-top: 1mm;
        padding-top: 0.5mm;
        border-top: 1px dashed #ccc;
    }
    
    .no-print {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        background: white;
        padding: 15px;
        border: 2px solid #000;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
    }
    
    .no-print button {
        padding: 10px 20px;
        margin: 0 5px;
        font-size: 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    @media print {
        body { 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .no-print { display: none; }
        .label-container {
            border: 1px solid #000 !important;
        }
        
        /* Ensure we don't get partial labels at page breaks */
        .label-container {
            page-break-inside: avoid;
        }
        
        @page {
            margin-bottom: 2mm;
        }
    }
`;

  const printAllBarcodes = useCallback(() => {
    if (apiRes.list.length === 0) {
      toast.warning("No products to print");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Unable to open print window. Please check popup blocker.");
      return;
    }

    const currentDate = formatDate(new Date());

    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Bulk Thermal Labels</title>
        <meta charset="UTF-8">
        <style>${getBulkPrintStyles()}</style>
        <script src="https://cdn.jsdelivr.net/npm/bwip-js@3.0.2/dist/bwip-js.min.js"></script>
    </head>
    <body>
        <div class="no-print">
            <button onclick="window.print()">Print All</button>
            <button onclick="window.close()">Close</button>
        </div>
        <div class="labels-container">
    `;

    for (let i = 0; i < apiRes.list.length; i++) {
      const product = apiRes.list[i];
      htmlContent += `
        <div class="label-container">
            <div class="header">
                <span>BRAND</span>
                <span class="brand-name">${product?.brand_id?.name || "N/A"}</span>
            </div>
            
            <div class="product-section">
                <div class="product-name">${product.name || "N/A"}</div>
             
            </div>
            
            <div class="barcode-section">
                <canvas id="barcode-${product._id}" class="barcode-canvas"></canvas>
                
            </div>
            
            <div class="pricing-section">
                <div class="price-row">
                    <span>MRP:</span>
                    <span>₹${product.basePrice || "N/A"}</span>
                </div>
                <div class="price-row">
                    <span>SALE:</span>
                    <span>₹${product.salePrice || "N/A"}</span>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div>DISC</div>
                        <div>${product.discount || 0}%</div>
                    </div>
                    <div class="info-item">
                        <div>COD</div>
                        <div>${product.cod ? "YES" : "NO"}</div>
                    </div>
                    <div class="info-item">
                        <div>HSN</div>
                        <div>${product.hsn_code?.code || "N/A"}</div>
                    </div>
                    <div class="info-item">
                        <div>PKD</div>
                        <div>${currentDate}</div>
                    </div>
                </div>
            </div>
        </div>
        `;

      if ((i + 1) % 3 === 0 && i !== apiRes.list.length - 1) {
        htmlContent += `
            <div style="page-break-after: always;"></div>
            `;
      }
    }

    htmlContent += `
        </div>
        <script>
            window.onload = function () {
                try {
                    ${apiRes.list
                      .map(
                        (product) => `
                        bwipjs.toCanvas(document.getElementById('barcode-${product._id}'), {
                            bcid: 'code128',
                            text: '${product._id.toUpperCase()}',
                            scale: 2,
                            height: 10,
                            includetext: false,
                            textxalign: 'center',
                            backgroundcolor: 'ffffff'
                        });
                    `,
                      )
                      .join("\n")}
                } catch (error) {
                    console.error('Barcode generation error:', error);
                }
            };
        </script>
    </body>
    </html>
`;

    try {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (error) {
      console.error("Print window error:", error);
      toast.error("Error opening print window");
      printWindow.close();
    }
  }, [apiRes.list]);

  const printBarcodes = useCallback(() => {
    if (apiRes.list.length === 0) {
      toast.warning("No products to print");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Unable to open print window. Please check popup blocker.");
      return;
    }

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Thermal Labels (50×25mm) - 2 per row on 105mm paper</title>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/bwip-js@3.0.2/dist/bwip-js.min.js"></script>

    <style>
    @page {
        size: 105mm auto;
        margin: 0;
        padding: 0;
    }

    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        width: 105mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .labels-container {
        width: 100%;
        padding: 0;
        margin: 0;
    }

    .label-row {
        display: flex;
        width: 100%;
        margin: 0;
        padding: 0;
        height: 25mm;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: auto;
        break-after: auto;
         box-sizing: border-box;
    }

    /* Force page break before every 10th row to prevent overlap */
    .label-row:nth-child(10n) {
        page-break-after: always !important;
        break-after: page !important;
    }

.label-row {
    display: flex;
    width: 100%;
    height: 15mm; /* Correct */
    margin-bottom: 0; /* No extra spacing */
    page-break-inside: avoid !important;
    break-inside: avoid !important;

}

.label-container {
    width: 50mm;
    height: 15mm;
    padding: 0mm; /* make it exact, or max 1mm */
    box-sizing: border-box;
    flex-direction: column;
      border: 1px dashed red;
    background: white;
}


    .empty-label {
        border: none !important;
        background: transparent !important;
    }



    .barcode-section {
        text-align: center;
        margin: 0;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 12mm;
    }

.barcode-canvas {
    width: 40mm !important;
    height: 10mm !important;
    image-rendering: pixelated !important;
}




    .no-print {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        background: white;
        padding: 15px;
        border: 2px solid #000;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
    }

    .no-print button {
        padding: 10px 20px;
        margin: 0 5px;
        font-size: 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: #007bff;
        color: white;
    }

    .no-print button:hover {
        background: #0056b3;
    }

    @media print {
        @page {
            size: 105mm auto;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        body { 
            margin: 0 !important;
            padding: 0 !important;
            width: 105mm !important;
        }
        
        .no-print { 
            display: none !important; 
        }
        
        .labels-container {
            width: 105mm !important;
        }
            
         canvas.barcode-canvas {
        image-rendering: pixelated !important;
    }
          .label-row {
        height: 15mm !important;

    }
    .label-container {
        height: 15mm !important;
    }
        .label-row:nth-child(10n) {
            page-break-after: always !important;
            break-after: page !important;
        }
        
   
    }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">Print All</button>
        <button onclick="window.close()">Close</button>
    </div>
    <div class="labels-container">
`;

    for (let i = 0; i < apiRes.list.length; i += 2) {
      const rowClass =
        Math.floor(i / 2) % 10 === 9 ? "label-row page-break" : "label-row";
      htmlContent += `<div class="${rowClass}">`;

      const product1 = apiRes.list[i];
      htmlContent += `
    <div class="label-container">
        <div class="barcode-section border-2">
            <canvas id="barcode-${product1.product_no}" class="barcode-canvas"></canvas>
        </div>
    </div>`;

      if (i + 1 < apiRes.list.length) {
        const product2 = apiRes.list[i + 1];
        htmlContent += `
        <div class="label-container">
            <div class="barcode-section ">
                <canvas id="barcode-${product2.product_no}" class="barcode-canvas"></canvas>
            </div>
        </div>`;
      } else {
        htmlContent += `<div class="label-container empty-label"></div>`;
      }

      htmlContent += `</div>`;
    }

    htmlContent += `
    </div>
    <script>
        window.onload = function() {
            try {
                ${apiRes.list
                  .map(
                    (product) => `
                 bwipjs.toCanvas(document.getElementById('barcode-${product.product_no}'), {
    bcid: 'code128',
    text: '${product.product_no}',
    scaleX: 3,
    scaleY: 3,
    height: 8, 
    includetext: false,
    textxalign: 'center',
    backgroundcolor: 'ffffff'
});


                `,
                  )
                  .join("\n")}
            } catch (error) {
                console.error('Barcode generation error:', error);
            }
        };
    </script>
</body>
</html>
`;

    try {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (error) {
      console.error("Print window error:", error);
      toast.error("Error opening print window");
      printWindow.close();
    }
  }, [apiRes.list]);

  const handlePageSize = useCallback((value) => {
    setSize(Number(value.value));
    setPageNo(1);
  }, []);

  const handleSearchRemove = useCallback(async () => {
    setFilters(INITIAL_FILTERS);
    setPageNo(1);
  }, []);

  const handleImageClick = (data) => {
    if (!data) return toast.info("No Image Available!");
    setIsProductData(data);
    setIsProductView(true);
  };

  const tableRows = useMemo(
    () =>
      apiRes.list.map((product) => [
        <div
          className="text-blue-500 font-semibold cursor-pointer"
          onClick={() => handleImageClick(product?.product_image_id?.images)}
        >
          View
        </div>,
        <span key={`name-${product._id}`} className="capitalize">
          {product?.name || "N/A"}
        </span>,
        <Code128Barcode key={`barcode-${product._id}`} product={product} />,
        <div key={`actions-${product._id}`} className="flex space-x-2">
          <button
            onClick={() => printBarcodeLabel(product)}
            className="px-3 py-1 bg-blue-500 text-black text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Print
          </button>
        </div>,
      ]),
    [apiRes.list, printBarcodeLabel, loading],
  );

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  return (
    <div className="p-6 mx-auto max-w-7xl space-y-3">
      <Loader loading={loading} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <FilterSelect
            options={SIZE_OPTIONS}
            value={SIZE_OPTIONS.find((opt) => opt.value === String(size))}
            onChange={handlePageSize}
            placeholder="Page Size"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={printAllBarcodes}> Print All</Button>
          <Button onClick={printBarcodes}> Print Barcode</Button>
        </div>
      </div>

      <div className="bg-white p-4 border rounded shadow-sm">
        <SearchComponent
          isSearchDown={true}
          isSearchShow={true}
          filters={filters}
          setFilters={setFilters}
          isBrand={true}
          brandOption={modifiedBrandData}
          handleSearchRemove={handleSearchRemove}
          isCategory={true}
          categoryOptions={createSelectOptions}
        />

        <TableData
          tableHeadings={TABLE_HEADINGS}
          data={tableRows}
          rowDataKey="_id"
          showHeadingDiv={false}
          sortableColumns={[1]}
          totalData={apiRes.total}
        />
      </div>

      {apiRes?.total > size && (
        <Pagination
          totalPages={Math.ceil(apiRes?.total / size)}
          currentPage={pageNo}
          onPageChange={onPageChange}
        />
      )}

      <ImageGallery
        images={isProductData}
        isOpen={isProductView}
        onClose={() => setIsProductView(false)}
      />
    </div>
  );
};

export default BarcodePage;
