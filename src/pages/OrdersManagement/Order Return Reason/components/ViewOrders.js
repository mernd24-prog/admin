
import { useState } from "react";
import { FaChevronDown, FaChevronLeft, FaChevronUp, FaFile } from "react-icons/fa6";
import { FiMoreHorizontal } from "react-icons/fi";
import { IoEyeOutline } from 'react-icons/io5';


const OrderSummary = () => {
  const [selectedSeller, setSelectedSeller] = useState("All Sellers");
  const [isExpanded, setIsExpended] = useState(true);
  const orderItems = [
    {
      id: "O6450151299-S0003",
      name: "boAt Stone 355 Bluetooth Speaker",
      seller: "Chromium Gallery",
      status: "Delivered",
      quantity: 1,
      amount: 130.89,
      image: "https://demo.yo-kart.com/image/product/2533/SMALL/35708/0/1",
    },
    {
      id: "O6450151299-S0004",
      name: "LG 7 Kg 5 Star Inverter Fully-Automatic Front Loading Washing Machine",
      seller: "Chromium Gallery",
      status: "Delivered",
      quantity: 1,
      amount: 335.50,
      image: "https://demo.yo-kart.com/image/product/2636/SMALL/35707/0/1",
    },
    {
      id: "O6450151299-S0001",
      name: "Men's Sweatshirt",
      size: "XXL",
      seller: "Dream Shop",
      status: "Delivered",
      quantity: 1,
      amount: 1200.00,
      image: "https://demo.yo-kart.com/image/product/2533/SMALL/35708/0/1",
    },
    {
      id: "O6450151299-S0005",
      name: "Haier 8.5 Kg Semi-Automatic Top Loading Washing Machine",
      seller: "Shopper Shop",
      status: "Delivered",
      quantity: 1,
      amount: 165.00,
      image: "https://demo.yo-kart.com/image/product/2636/SMALL/35707/0/1",
    }
  ];

  const orderSummary = {
    fulfillmentType: "Ship Only",
    addedOn: "14/02/2025",
    cartTotal: 10140.44,
    taxCharges: 194.56,
    totalSaving: 3316.68,
    netAmount: 10335.00,
    siteCommission: 612.96,
    customerName: "Tom Hanks",
    email: "tom@dummyid.com",
    phone: "5644978125"
  };
  const title1 = "Delivery Address";
  const address = {
    name: "Tom Hanks",
    line1: "12 University Drive",
    city: "Hollywood",
    state: "Central Luzon",
    zip: "90210",
    country: "United States",
    phone: "4813164578"
  };

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <div className="flex flex-col gap-4 mx-auto max-w-7xl lg:flex-row">
        <div className="flex-grow p-4 bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="flex items-center mb-4">
            <button className="mr-2 text-blue-500">
              <FaChevronLeft size={20} />
            </button>
            <h1 className="text-lg font-medium">Order #O6450151299</h1>
            <div className="relative ml-auto">
              <select
                className="px-4 py-2 pr-8 text-gray-700 bg-gray-100 rounded-md appearance-none focus:outline-none"
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
              >
                <option>All Sellers</option>
                <option>Chromium Gallery</option>
                <option>Dream Shop</option>
                <option>Shopper Shop</option>
              </select>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 py-3 text-sm font-medium text-gray-600 border-b">
            <div className="col-span-4">Items summary</div>
            <div className="col-span-2">Fulfilled by</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">Quantity</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Order Items */}
          {orderItems.map((item, index) => (
            <div key={item.id}>
              {/* Shop Name - displayed when it changes */}
              {(index === 0 || item.seller !== orderItems[index - 1].seller) && (
                <div className="py-3">
                  <span className="px-3 py-1 text-sm text-teal-500 rounded-full bg-teal-50">
                    {item.seller}
                  </span>
                </div>
              )}

              {/* Order Item */}
              <div className="grid items-center grid-cols-12 py-4 border-b">
                <div className="flex items-center col-span-4">
                  <div className="w-12 h-12 mr-3">
                    <img src={item.image} alt={item.name} className="object-cover w-full h-full rounded" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{item.id}</div>
                    <div className="font-medium">{item.name}</div>
                    {item.size && <div className="text-sm text-gray-500">{item.size}</div>}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-1 text-xs text-teal-500 rounded-full bg-teal-50">Seller</span>
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-1 text-xs text-blue-500 rounded-full bg-blue-50">{item.status}</span>
                </div>
                <div className="col-span-1 text-center">{item.quantity}</div>
                <div className="col-span-2 font-medium">${item.amount.toFixed(2)}</div>
                <div className="flex col-span-1 space-x-2">
                  <button className="text-gray-500">
                    <IoEyeOutline size={18} />
                  </button>
                  <button className="text-gray-500">
                    <FaFile size={18} />
                  </button>
                  <button className="text-gray-500">
                    <FiMoreHorizontal size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Side Order Summary */}
        <div className="w-full lg:w-1/2">
          <div className="p-4 mb-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center mb-4">
              <FaFile className="mr-2" size={18} />
              <h2 className="text-lg font-medium">Order Summary</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Fulfillment Type</span>
                <span className="px-2 py-1 text-xs text-teal-500 bg-teal-50">{orderSummary.fulfillmentType}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-600">Added On</span>
                <span>{orderSummary.addedOn}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-600">Cart Total</span>
                <span>${orderSummary.cartTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-blue-500">Tax Charges</span>
                <span>${orderSummary.taxCharges.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-green-500 ">Total saving</span>
                <span className="text-green-500">${orderSummary.totalSaving.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 font-medium border-t">
                <span>Net Amount</span>
                <span>${orderSummary.netAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-600">Site commission</span>
                <span>${orderSummary.siteCommission.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg shadow-sm">
            <h2 className="mb-4 text-lg font-medium">Contact Information</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Customer name:</p>
                <p className="font-medium">{orderSummary.customerName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Email:</p>
                <p className="font-medium">{orderSummary.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Phone:</p>
                <p className="font-medium">{orderSummary.phone}</p>
              </div>
            </div>
          </div>

          <div className="relative p-4 mt-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">{title1}</h2>
              <button onClick={() => setIsExpended(!isExpanded)} className="text-gray-500 hover:text-gray-700">
                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>

            {isExpanded && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Customer name:</p>
                  <p className="font-medium">{address.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Address line 1</p>
                  <p className="font-medium">{address.line1}</p>
                </div>

                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-medium">{address.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">State</p>
                    <p className="font-medium">{address.state}</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Zip</p>
                    <p className="font-medium">{address.zip}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Country</p>
                    <p className="font-medium">{address.country}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{address.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderSummary;