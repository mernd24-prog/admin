const TabNavigation = ({ tabs, activeTab, scrollToSection }) => (
  <div className="hidden lg:block">
    <aside className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <nav className="divide-y divide-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => scrollToSection(tab.id)}
            className={`w-full text-left px-3 py-3 transition-all duration-200 flex items-center gap-2.5
              ${activeTab === tab.id
                ? 'bg-[var(--admin-blue-soft)] border-r-2 border-[var(--admin-blue)]'
                : 'hover:bg-gray-50 text-gray-600 hover:text-gray-800'
              }`}
          >
            <div className={`p-1.5 rounded-md flex-shrink-0 ${activeTab === tab.id ? 'bg-[var(--admin-blue)] text-white' : 'bg-gray-100 text-gray-500'}`}>
              {tab.icon}
            </div>
            <p className={`text-xs font-medium leading-tight ${activeTab === tab.id ? 'text-[var(--admin-blue)]' : 'text-gray-700'}`}>
              {tab.title}
            </p>
          </button>
        ))}
      </nav>
    </aside>
  </div>
);

export default TabNavigation;