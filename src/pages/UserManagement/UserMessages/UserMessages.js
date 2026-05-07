import React, { useState } from 'react'
import { FiMenu } from 'react-icons/fi';
import { IoSearch } from 'react-icons/io5';

const UserMessages = () => {
  const [searchText, setSearchText] = useState("");
  return (
    <div className="flex min-h-screen p-4 "> 
      <div className="bg-white border-r border-gray-200 w-80"> 
        <div className="p-4 border-b border-gray-200">
          <div className="relative flex items-center">
            <IoSearch size={18} className="absolute text-gray-400 left-3" />
            <input
              type="text"
              placeholder="Search by subject or name"
              className="w-full py-2 pl-10 pr-4 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <FiMenu size={18} className="ml-2 text-gray-500" />
          </div>
        </div>
        <div className="h-full overflow-y-auto"> 
          <div className="px-4 py-3 text-black bg-blue-500">
            <div className="flex items-center">
              <div className="w-10 h-10 mr-3 overflow-hidden rounded-full">
                <img
                  src="/Img/1.jpeg"
                  alt="Rock's avatar"
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <div className="font-medium">rock</div>
                <div className="w-56 text-sm text-blue-100 truncate">rambled it to make a type s...</div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 hover:bg-gray-100">
            <div className="flex items-center">
              <div className="w-10 h-10 mr-3 overflow-hidden rounded-full">
                <img
                  src="/Img/1.jpeg"
                  alt="Michael Williams's avatar"
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <div className="font-medium">Michael Williams</div>
                <div className="w-56 text-sm text-gray-500 truncate">Hi jdjdjak oakak</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-1 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 mr-3 overflow-hidden rounded-full">
              <img
                src="/Img/1.jpeg"
                alt="Rock's avatar"
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <div className="font-medium">rock</div>
              <div className="text-xs text-gray-500">Subject: Some question regarding the product</div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto max-h-[90dvh]"> 
          <div className="flex justify-center my-4">
            <div className="px-3 py-1 text-xs text-gray-500 bg-gray-200 rounded-full">
              21/04/2022
            </div>
          </div>
          <div className="mb-6">
            <div className="flex mb-1">
              <div className="w-8 h-8 mr-2 overflow-hidden rounded-full">
                <img
                  src="/Img/1.jpeg"
                  alt="Rock's avatar"
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            <div className="max-w-3xl p-4 ml-10 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                Lorem Ipsum has been the industry's standard dummy text ever since the
                1500s, when an unknown printer took a galley of type and scrambled it to
                make a type specimen book. It has survived not only five centuries, but also
                the leap into electronic typesetting, remaining essentially unchanged. It was
                popularised in the 1960s with the release of Letraset sheets containing
                Lorem Ipsum passages, and more recently with desktop publishing software
                like Aldus PageMaker including versions of Lorem Ipsum.
              </p>
            </div>
            <div className="mt-1 ml-10 text-xs text-gray-500">14:50</div>
          </div>
          <div className="mb-6">
            <div className="flex justify-end mb-1">
              <div className="self-end mr-2 text-xs text-gray-500">
                HEllo<br />sf
              </div>
              <div className="w-8 h-8 overflow-hidden rounded-full">
                <img
                  src="/Img/1.jpeg"
                  alt="Michael's avatar"
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            <div className="text-xs text-right text-gray-500">Michael Williams - 14:52</div>
          </div>
          <div className="mb-6">
            <div className="flex justify-end mb-1">
              <div className="max-w-3xl p-4 mr-10 text-right bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-700">
                  Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                  Lorem Ipsum has been the industry's standard dummy text ever since the
                  1500s, when an unknown printer took a galley of type and scrambled it to
                  make a type specimen book. It has survived not only five centuries,
                </p>
              </div>
              <div className="w-8 h-8 overflow-hidden rounded-full">
                <img
                  src="/Img/1.jpeg"
                  alt="Michael's avatar"
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            <div className="text-xs text-right text-gray-500">Michael Williams - 14:52</div>
          </div>
          <div className="mb-6">
            <div className="flex justify-end mb-1">
              <div className="max-w-3xl p-4 mr-10 text-right bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-700">
                  to electronic typesetting, remaining essentially unchanged. It was
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserMessages;