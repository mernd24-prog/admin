import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router'
import { getInventoryDetailsById } from '../../../Redux/erpSlice'
import { toast } from 'sonner'
import Loader from '../../../components/Loader/Loader'

const ViewInventory = () => {
    const { id } = useParams()
    const [inventory, setInventory] = useState(null)
    const [loading, setLoading] = useState(true)

    const dispatch = useDispatch()

    useEffect(() => {
        if (id) {
            dispatch(getInventoryDetailsById({ _id: id }))
                .unwrap()
                .then((res) => {
                    setInventory(res.data)
                })
                .catch(() => {
                    toast.error("Failed to load inventory details")
                })
                .finally(() => setLoading(false))
        }
    }, [id, dispatch])

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A'
        return new Date(timestamp).toLocaleString()
    }

    if (!inventory) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-lg text-gray-600">No inventory data found</p>
            </div>
        )
    }

    return (
        <>
            <Loader loading={loading}/>
            <div className="max-w-7xl mx-auto p-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Inventory Details</h1>
                
                <div className="bg-white rounded-lg shadow p-6 space-y-6 grid grid-cols-2 gap-3">
                    {/* Product Section */}
                    <Section title="Product Information">
                        <DetailRow label="Product" value={inventory.product_id?.name} />
                        <DetailRow label="Supplier" value={inventory.supplier_id?.name} />
                        <DetailRow label="Description" value={inventory.description} />
                        <DetailRow label="Batch Code" value={inventory.batch_code?.batchCode} />
                        <DetailRow label="Date" value={formatDate(inventory.date)} />
                        
                        {inventory.thumbnails && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-500 mb-2">Thumbnail:</p>
                                <img 
                                    src={inventory.thumbnails} 
                                    alt="Product thumbnail" 
                                    className="max-w-full h-auto max-h-48 rounded border"
                                />
                            </div>
                        )}
                    </Section>

                    {/* Pricing Section */}
                    <Section title="Pricing & Stock">
                        <DetailRow label="Base Price" value={`₹${inventory.base_price?.toLocaleString()}`} />
                        <DetailRow label="Purchase Price" value={`₹${inventory.purchase_price?.toLocaleString()}`} />
                        <DetailRow label="Sale Price" value={`₹${inventory.sale_price?.toLocaleString()}`} />
                        <DetailRow label="Available Stock" value={inventory.avail_stock?.toLocaleString()} />
                        <DetailRow label="Minimum Stock" value={inventory.min_stock?.toLocaleString()} />
                        <DetailRow label="Maximum Stock" value={inventory.max_stock?.toLocaleString()} />
                    </Section>
                   
                </div>
            </div>
        </>
    )
}

// Reusable section component
const Section = ({ title, children }) => (
    <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        <div className="space-y-2 pl-2">
            {children}
        </div>
    </div>
)

// Reusable divider component
const Divider = () => <div className="border-t border-gray-200 my-4"></div>

// Reusable component for detail rows
const DetailRow = ({ label, value }) => (
    <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-500">{label}:</span>
        <span className="text-sm text-gray-700">{value || 'N/A'}</span>
    </div>
)

// Reusable component for status badges
const StatusBadge = ({ label, color }) => {
    const colorClasses = {
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
        blue: 'bg-blue-100 text-blue-800',
        gray: 'bg-gray-100 text-gray-800',
        yellow: 'bg-yellow-100 text-yellow-800',
    }
    
    return (
        <span className={`text-xs px-2 py-1 rounded-full ${colorClasses[color] || colorClasses.gray}`}>
            {label}
        </span>
    )
}

export default ViewInventory