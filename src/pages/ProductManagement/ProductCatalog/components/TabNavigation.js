const TabNavigation = ({ tabs, activeTab, scrollToSection }) => (
  <div className="hidden lg:block">
    <aside className="overflow-hidden bg-white border border-gray-100 ">
      <nav className="divide-y divide-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => scrollToSection(tab.id)}
            className={`w-full text-left p-4 transition-all duration-200 flex items-start gap-3
              ${activeTab === tab.id
                ? 'bg-white text-black '
                : 'hover:bg-red-50 text-gray-700 hover:text-red-500'
              }`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === tab.id ? 'text-black' : 'bg-gray-100 text-gray-500'}`}>
              {tab.icon}
            </div>
            <div>
              <p className="text-sm font-medium">{tab.title}</p>
              <p className={`text-sm  mt-3 ${activeTab === tab.id ? "text-black" : 'text-black'}`}>{tab.description}</p>
            </div>
          </button>
        ))}
      </nav>
    </aside>
  </div>
);

export default TabNavigation;