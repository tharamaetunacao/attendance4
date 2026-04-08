import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { BACKGROUND_OPTIONS } from "../../components/Common/ThemeProvider";
import toast from "react-hot-toast";
import {
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  BellIcon,
} from "@heroicons/react/24/outline";

// Forest green color theme (default)
const forestTheme = {
  primary: "bg-emerald-700",
  primaryHover: "hover:bg-emerald-800",
  primaryText: "text-emerald-700",
  primaryLight: "bg-emerald-600",
  primaryGlow: "shadow-emerald-700/30",
  primaryBg: "bg-emerald-50",
  primaryBorder: "border-emerald-200",
  gradientFrom: "from-emerald-900",
  gradientTo: "to-emerald-800",
};

const AdminSidebar = ({ activeTab, setActiveTab, onLogout, currentTheme, onChangeTheme }) => {
  const navigate = useNavigate();
  const { userProfile, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const sidebarRef = useRef(null);
  const dropdownRef = useRef(null);

  // Use forest green theme (default)
  const theme = forestTheme;

  // Close user menu when clicking outside
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!showUserMenu) return;

      const clickedInsideSidebar = sidebarRef.current?.contains(e.target);
      const clickedInsideDropdown = dropdownRef.current?.contains(e.target);

      if (!clickedInsideSidebar && !clickedInsideDropdown) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [showUserMenu]);

  const tabs = [
    { id: "overview", label: "Overview", icon: ChartBarIcon },
    { id: "users", label: "Users", icon: UsersIcon },
    { id: "departments", label: "Departments", icon: BuildingOfficeIcon },
    { id: "holidays", label: "Holidays", icon: CalendarDaysIcon },
    { id: "announcements", label: "Announcements", icon: BellIcon },
    { id: "attendance", label: "Reports", icon: ClipboardDocumentListIcon },
  ];

  const handleLogout = async () => {
    try {
      if (typeof onLogout === "function") await onLogout();
      else await logout();

      toast.success("Logged out successfully");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Logout failed");
    } finally {
      setShowUserMenu(false);
    }
  };

  const handleThemeChange = (themeId) => {
    console.log("Changing theme to:", themeId);
    if (onChangeTheme) {
      onChangeTheme(themeId);
    }
    toast.success(`Theme changed to ${BACKGROUND_OPTIONS.find((o) => o.id === themeId)?.name}`);
    setShowUserMenu(false);
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`bg-gradient-to-b ${theme.gradientFrom} ${theme.gradientTo} text-white h-screen flex flex-col sticky top-0 transition-all duration-300 ${
          expanded ? "w-64" : "w-20"
        }`}
        style={{ position: 'relative', zIndex: 1000 }}
      >
        {/* Logo / Branding */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            <img
              src="/rlb-logo.jpg"
              alt="RLB Logo"
              className="w-10 h-10 rounded-lg object-cover"
            />
            {expanded && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-lg leading-tight">Admin</h1>
                <p className="text-xs text-white/70">Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Sidebar */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`absolute -right-3 top-20 w-6 h-6 ${theme.primary} rounded-full flex items-center justify-center text-white text-xs shadow-lg ${theme.primaryHover} transition`}
        >
          {expanded ? "◀" : "▶"}
        </button>

        {/* Navigation Tabs */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  activeTab === tab.id
                    ? `${theme.primary} text-white shadow-lg ${theme.primaryGlow}`
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <tab.icon
                  className={`w-5 h-5 flex-shrink-0 ${expanded ? "" : "mx-auto"}`}
                />
                {expanded && (
                  <span className="font-medium animate-fade-in">
                    {tab.label}
                  </span>
                )}
                {!expanded && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                    {tab.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-white/20">
          {/* User Profile */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowUserMenu(!showUserMenu);
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                showUserMenu ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              <div className={`w-10 h-10 rounded-full ${theme.primary} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                {userProfile?.full_name?.charAt(0).toUpperCase() || "A"}
              </div>
              {expanded && (
                <div className="flex-1 text-left animate-fade-in">
                  <p className="font-medium text-sm truncate">
                    {userProfile?.full_name || "Admin User"}
                  </p>
                  <p className="text-xs text-white/70 capitalize">
                    {userProfile?.role || "Administrator"}
                  </p>
                </div>
              )}
              {expanded && (
                <svg
                  className={`w-4 h-4 text-white/70 transition-transform ${
                    showUserMenu ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                ref={dropdownRef}
                className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 overflow-hidden animate-fade-in"
                style={{ zIndex: 1001 }}
              >
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="font-medium text-gray-900 truncate">
                    {userProfile?.full_name || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {userProfile?.role || "Administrator"}
                  </p>
                </div>
                
                {/* Theme Preferences - Like Settings Page */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    Background Theme
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {BACKGROUND_OPTIONS.map((themeOption) => (
                      <button
                        key={themeOption.id}
                        onClick={() => handleThemeChange(themeOption.id)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          currentTheme === themeOption.id
                            ? "border-blue-600 ring-2 ring-blue-200"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                        title={themeOption.name}
                      >
                        <div
                          className={`w-full h-full ${themeOption.preview} flex items-center justify-center`}
                        >
                          {currentTheme === themeOption.id && (
                            <div className="w-4 h-4 bg-blue-600 rounded-full shadow" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {BACKGROUND_OPTIONS.find((o) => o.id === currentTheme)?.name}
                  </p>
                </div>

                {/* Sign Out */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
};

export default AdminSidebar;
