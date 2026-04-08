import React from "react";
import { useNavigate } from "react-router-dom";

const LoginPortal = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-blue-600 mb-2">
            AttendanceHub
          </h1>
          <p className="text-gray-600 text-lg">
            Employee Attendance Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 hover:shadow-2xl transition transform hover:scale-105">
            <div className="text-5xl mb-4 text-center">🔐</div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-3">
              Login
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Access your AttendanceHub account
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
            >
              Login
            </button>
          </div>
        </div>

        {/* Register Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Don't have an account?</p>
          <button
            onClick={() => navigate("/register")}
            className="text-blue-600 hover:text-blue-800 font-semibold underline"
          >
            Register Here →
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPortal;
