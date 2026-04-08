import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useBackgroundTheme } from "./ThemeProvider";
import Settings from "./Settings";
import toast from "react-hot-toast";
import {
  ChartBarIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  BellIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const ManagerSidebar = ({ activeTab, setActiveTab, onOpenSettings }) => {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuthStore();
  const { backgroundTheme, changeTheme, BACKGROUND_OPTIONS } =
    useBackgroundTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Click outside handler to close user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = event.target.closest(".manager-sidebar");
      if (!sidebar && showUserMenu) {
        setShowUserMenu(false);
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: ChartBarIcon },
    { id: "attendance", label: "Attendance", icon: CalendarDaysIcon },
    { id: "leave-requests", label: "Leave", icon: ClipboardDocumentListIcon },
    { id: "announcements", label: "Announce", icon: BellIcon },
    { id: "corrections", label: "Corrections", icon: ClockIcon },
    { id: "employee-directory", label: "Team", icon: UserGroupIcon },
    { id: "monthly-hours", label: "Hours", icon: CurrencyDollarIcon },
  ];

  return (
    <aside className="manager-sidebar bg-gray-900 text-white h-[calc(100vh-64px)] flex flex-col w- flex-shrink-0">
      {/* Logo/Brand */}
      {/* <div className="mb-4 flex justify-center pt-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm">M</span>
        </div>
      </div> */}

      {/* Navigation Tabs - Left side with just icons */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex justify-center items-center px-3 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
              title={tab.label}
            >
              <tab.icon className="w-6 h-6" />
            </button>
          ))}
        </div>
      </nav>

      {/* User Profile Section with Theme and Logout Menu */}
    </aside>
  );
};

export default ManagerSidebar;
