import React from "react";
import { useAuthStore } from "../../stores/authStore";

const Sidebar = ({ activeTab, setActiveTab, tabs }) => {
  const { userProfile } = useAuthStore();

  return (
    <aside className="bg-blue-900 text-white p-2 h-screen flex flex-col sticky top-0 w-24">
      <div className="mb-4 flex justify-center"></div>

      <nav className="space-y-2 flex-1 overflow-y-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex justify-center items-center px-3 py-3 rounded-lg transition ${
              activeTab === tab.id
                ? "bg-red-600 text-white"
                : "text-white hover:bg-white hover:text-red-500"
            }`}
            title={tab.label}
            type="button"
          >
            {tab.icon && <span>{tab.icon}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
