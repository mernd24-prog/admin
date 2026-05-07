import { useState } from 'react';
import { BsCreditCard } from 'react-icons/bs';
import { FaEye } from 'react-icons/fa6';
import { IoArrowBack } from "react-icons/io5";
import FormInput from '../../../../components/Atoms/FormInput/FormInput';

const ViewSubscriptionOrders = () => {
  const [comments, setComments] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [txnId, setTxnId] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <div className="flex min-h-screen p-6">
      <div className="flex-1 p-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <button className="flex items-center font-medium text-blue-500">
              <IoArrowBack className="w-5 h-5 mr-2" />
              Order #O6721742856
            </button>
          </div>
          <div className="mb-8 bg-white rounded-md shadow-sm">
            <div className="grid grid-cols-5 px-6 py-4 font-medium text-gray-700 border-b">
              <div>Order Invoice ID</div>
              <div>Status</div>
              <div>Subscription Details</div>
              <div>Subscription Period</div>
              <div>Actions</div>
            </div>
            <div className="grid items-center grid-cols-5 px-6 py-4">
              <div className="text-gray-700">1058-s0001</div>
              <div>
                <span className="px-3 py-1 text-sm text-blue-700 bg-blue-100">
                  Subscription Inactive
                </span>
              </div>
              <div className="text-gray-700">Premium Plan - $150.00 / Per 30 Days</div>
              <div className="text-gray-700">-</div>
              <div>
                <button className="text-blue-500">
                  <FaEye className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="mb-6 text-xl font-semibold">Order Payments</h2>
            <div className="p-6 bg-white rounded-md shadow-sm">
              <div className="mb-6">
                <FormInput
                  label="Comments *"
                  name="comments"
                  type="textarea"
                  value={comments}
                  placeholder="Enter your comments here"
                  onChange={(e) => setComments(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <FormInput
                  label="Payment method *"
                  name="paymentMethod"
                  type="text"
                  value={paymentMethod}
                  placeholder="Enter payment method"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <FormInput
                  label="Txn ID *"
                  name="txnId"
                  type="text"
                  value={txnId}
                  placeholder="Enter transaction ID"
                  onChange={(e) => setTxnId(e.target.value)}
                />
                <FormInput
                  label="Amount *"
                  name="amount"
                  type="text"
                  value={amount}
                  placeholder="Enter amount"
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <button className="px-6 py-2 text-blue-500 border border-blue-500 rounded-md hover:bg-blue-50">
                  Clear
                </button>
                <button className="px-6 py-2 text-black bg-blue-500 rounded-md hover:bg-blue-600">
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mt-6 space-y-6 lg:ml-6 lg:w-80 lg:mt-0">
        <div className="p-4 bg-white">
          <h2 className="flex items-center mb-4 text-lg font-semibold">
            <span className="mr-2">📋</span> Order Summary
          </h2>

          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Added On</span>
              <span className="font-medium">09/07/2024</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Cart Total</span>
              <span className="font-medium text-blue-600">$150.00</span>
            </div>
          </div>

          <div className="h-px my-4 bg-gray-200"></div>

          <div className="flex justify-between font-medium">
            <span>Net Amount</span>
            <span className="text-blue-600">$150.00</span>
          </div>
        </div>
        <div className="p-4 bg-white">
          <h2 className="mb-4 text-lg font-semibold">Contact Information</h2>
          <div className="mb-4">
            <p className="mb-1 text-sm text-gray-600">Customer name:</p>
            <p className="font-medium">PawanDZ</p>
          </div>
          <div>
            <p className="mb-1 text-sm text-gray-600">Email:</p>
            <p className="font-medium">pawan1985chd@dummyid.com</p>
          </div>
        </div>
        <div className="p-4 bg-white">
          <h2 className="flex items-center mb-4 text-lg font-semibold">
            <BsCreditCard className="w-5 h-5 mr-2" /> Payment Information
          </h2>
          <div className="mb-4">
            <p className="mb-1 text-sm text-gray-600">Payment Status:</p>
            <div className="inline-block px-3 py-1 text-sm text-blue-700 rounded-md bg-blue-50">
              Pending
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm text-gray-600">Payment Mode:</p>
            <p className="font-medium">Wallet</p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default ViewSubscriptionOrders;