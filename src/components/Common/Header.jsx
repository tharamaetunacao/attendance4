import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import toast from "react-hot-toast";
import Notifications from "./Notifications";
import {
  QuestionMarkCircleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

const Header = ({ onLogout, title, onNavigate, onOpenSettings }) => {
  const navigate = useNavigate();
  const { userProfile, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  return (
    <>
      <header className="shadow-lg relative z-10 h-24">
        <div className="flex justify-between items-center">
          {/* Left Section - Branding */}
          <div className="flex items-center gap-3 -ml-2 ">
            <div className="flex items-center gap-3 px-6 py-2">
              <img
                src="/rlb-logo.jpg"
                alt="AttendanceHub Logo"
                className="h-12 w-auto sm:h-16 md:h-20"
              />

              <div className="flex flex-col text-lg sm:text-xl md:text-xl font-normal leading-tight text-gray-600">
                <span>
                  Rider Levett Bucknall Philippines -{" "}
                  <span className="text-red-600">BOHOL</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Section - User Info */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Notifications className="text-black" onNavigate={onNavigate} />

            {/* Help Icon */}
            <QuestionMarkCircleIcon className="w-6 h-6 text-black mr-4" />

            {/* User Avatar with Dropdown */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors px-8"
                onClick={() => setShowUserMenu(!showUserMenu)}
                title="User menu"
              >
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                  <UserCircleIcon className="w-8 h-8 text-white" />
                </div>
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-xl border border-gray-200 bg-white py-1 z-[100]">
                  {/* User Info Header */}
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="font-semibold text-sm truncate text-gray-900">
                      {userProfile?.full_name || "User"}
                    </p>
                    <p className="text-xs truncate text-gray-600 capitalize">
                      {userProfile?.role || "Employee"}
                    </p>
                  </div>

                  {/* Settings Button */}
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenSettings?.();
                    }}
                  >
                    <SettingsIcon fontSize="small" />
                    Settings
                  </button>

                  {/* Divider */}
                  <div className="border-t border-gray-100 my-1" />

                  {/* Logout Button */}
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                  >
                    <LogoutIcon fontSize="small" />
                    Logout
                  </button>
                </div>
              )}

              {/* Click outside to close menu */}
              {showUserMenu && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
