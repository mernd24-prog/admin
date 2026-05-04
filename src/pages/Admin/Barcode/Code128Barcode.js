import React, { useEffect, useRef } from 'react';
import bwipjs from 'bwip-js';

const Code128Barcode = ({ product }) => {
  const canvasRef = useRef(null);
  const barcodeNumber = product?._id ? product._id.toUpperCase() : '000000000000';

  useEffect(() => {
    if (canvasRef.current) {
      try {

        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'code128',      
          text: barcodeNumber,  
          scale: 1,              
          height: 10,            
          includetext: true,    
          textxalign: 'center',  
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [barcodeNumber]);

  return (
    <div className="border border-gray-300 p-3 bg-white max-w-xs">
      <div className="flex justify-between text-xs font-bold mb-2">
        <span>Brand</span>
        <span>{product?.brand_id?.name || 'N/A'}</span>
      </div>
      <div className="text-xs mb-2" title="Product ID">{product._id}</div>
      <div className="flex justify-center mb-2">
        <canvas ref={canvasRef} />
      </div>
      <div className="text-xs mb-2">
        {product?.name?.substring(0, 10).toUpperCase() || 'PROD'}
      </div>
      <div className="flex justify-between text-xs">
        <div>
          <div>M.R.P. ₹: {product.basePrice || 'N/A'}</div>
          <div>Sale ₹: {product.salePrice || 'N/A'}</div>
          <div>Pkd. Dt. {new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
          })}</div>
        </div>
        <div>
          <div>DISCOUNT: {product.discount || 0}%</div>
          <div>COD: {product.cod ? 'YES' : 'NO'}</div>
          <div>HSN: {product.hsn_code?.code || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};

export default Code128Barcode;