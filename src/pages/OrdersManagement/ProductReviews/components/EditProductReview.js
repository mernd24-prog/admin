import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import ImageViewer from '../../../../components/ImageViewer/ImageViewer';

const categories = ['Product', 'Shop', 'Delivery', 'Overall Rating'];

const StarRating = ({ rating, setRating }) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className={`text-2xl transition-colors duration-200 ${star <= rating ? 'text-yellow-600' : 'text-gray-300'} hover:text-yellow-600`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const EditProductReview = ({ isOpen, onClose }) => {
  const [ratings, setRatings] = useState({
    Product: 0,
    Shop: 0,
    Delivery: 0,
    'Overall Rating': 0,
  });
  const [status, setStatus] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);




  return (
    <>
      <div className={`fixed inset-0 z-50 bg-black bg-opacity-40 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute top-0 right-0 w-full max-w-xl h-full bg-white shadow-lg transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Edit Product Review</h2>
            <button onClick={onClose} className="text-gray-600 hover:text-black">
              <MdOutlineClose size={24} />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-60px)]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Product Name:</strong> <span className="text-gray-700">Men's Sweatshirt</span>
              </div>
              <div>
                <strong>Reviewed By:</strong> <span className="text-gray-700">Tomhanks</span>
              </div>
              <div>
                <strong>Date:</strong> <span className="text-gray-700">14/02/2025 17:29</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {categories.map((cat) => (
                <div key={cat}>
                  <label className="block mb-1 font-medium">{cat}</label>
                  <StarRating rating={ratings[cat]} setRating={(r) => setRatings({ ...ratings, [cat]: r })} />
                </div>
              ))}
            </div>

            <div>
              <label className="block mb-1 font-medium">Title*</label>
              <input
                type="text"
                defaultValue="Comfortable and Stylish Sweatshirt👌"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Description*</label>
              <textarea
                rows="3"
                defaultValue="Fashionable product, Good value for money!\nMaterial thickness is just perfect for light tropical winters."
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Status*</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Photos</label>
              <div className="flex gap-3">
                {[
                  'https://demo.yo-kart.com/image/review/1595/0/MINITHUMB/24499?t=1739534383',
                  'https://demo.yo-kart.com/image/review/1595/0/MINITHUMB/24500?t=1739534383',
                  'https://demo.yo-kart.com/image/review/1595/0/MINITHUMB/24501?t=1739534383'
                ].map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`review-${idx}`}
                    onClick={() => setSelectedImage(src)}
                    className="object-cover w-24 h-24 border rounded cursor-pointer hover:opacity-80"
                  />
                ))}
              </div>
            </div>

            <div className="text-right">
              <button className="px-6 py-2 mt-4 text-black bg-blue-600 rounded hover:bg-blue-700">
                Submit Review
              </button>
            </div>
          </div>
        </div>
      </div>
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};

export default EditProductReview;
