import React, { useState } from 'react';
import { CiBank } from 'react-icons/ci';
import { FiSearch } from 'react-icons/fi';
import { PiCityThin } from "react-icons/pi";
import { RiPinDistanceLine } from "react-icons/ri";
import { Link } from 'react-router-dom';



const settingsData = [
    {
        title: 'Countries',
        description: 'Manage the list of countries that will be visible in the countrys dropdown list all over the platform.',
        icon: <CiBank className="text-3xl text-blue-500" />,
        path: '/app/country'
    },
    {
        title: 'State',
        description: 'Manage the states (for the active countries) that will be visible in the states dropdown list all over the platform.',
        icon: <RiPinDistanceLine className="text-3xl text-blue-500" />,
        path: '/app/state'

    },
    {
        title: 'Cites',
        description: 'Manage the cities (for the active countries) that will be visible in the states dropdown list all over the platform.',
        icon: <PiCityThin className="text-3xl text-blue-500" />,
        path: '/app/city'

    },
];

export default function Settings() {
    const [query, setQuery] = useState('');

    const filteredSettings = settingsData.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className='min-h-screen max-w-7xl mx-auto space-y-5 p-5'>
            <div className="text-sm text-gray-500">Home / <span className="text-black font-semibold">System settings</span></div>

            <div className="p-6 bg-white ">

                <div className="mb-6 flex justify-center items-center">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10 py-2 w-full max-w-md rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl text-wrap mx-auto">
                    {filteredSettings.map((item, index) => (
                        <Link
                            key={index}
                            className="group bg-white md:p-5 p-0 border border-transparent hover:border-gray-300 transition"
                            to={item?.path}
                        >
                            <div className="flex items-start gap-2">
                                <span className="text-xl group-hover:text-[#0A73CF] transition-colors">
                                    {item.icon}
                                </span>
                                <div>
                                    <h3 className="font-[500] text-[15px] group-hover:text-[#0A73CF] transition-colors">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {filteredSettings.length === 0 && (
                        <p className="text-gray-500 col-span-full text-center">No settings found.</p>
                    )}
                </div>

            </div>
        </div>
    );
}
