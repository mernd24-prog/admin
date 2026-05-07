import React from 'react'

const DashboardCard = ({ color, label, value }) => {
    return (
        <div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${color}-`}></div>
                    <span className="text-gray-800">{label}</span>
                </div>
                <span className="font-semibold text-gray-900">{typeof value === 'object' ? 'Invalid Data' : value}</span>
            </div></div>
    )
}

export default DashboardCard