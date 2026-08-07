const TabNavigation = ({ tabs, activeTab, scrollToSection }) => (
  <div className="hidden lg:block">
    <aside className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <nav className="divide-y divide-gray-100">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToSection(tab.id)}
              className={`flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors duration-300 ease-in-out ${
                isActive
                  ? "border-r-2 border-[var(--admin-blue)] bg-[var(--admin-blue-soft)]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <div
                className={`flex-shrink-0 rounded-md p-1.5 transition-colors duration-300 ease-in-out ${
                  isActive
                    ? "bg-[var(--admin-blue)] text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <span className="flex transition-colors duration-300 ease-in-out">
                  {tab.icon}
                </span>
              </div>

              <p
                className={`text-xs font-medium leading-tight transition-colors duration-300 ease-in-out ${
                  isActive
                    ? "text-[var(--admin-blue)]"
                    : "text-gray-700"
                }`}
              >
                {tab.title}
              </p>
            </button>
          );
        })}
      </nav>
    </aside>
  </div>
);

export default TabNavigation;