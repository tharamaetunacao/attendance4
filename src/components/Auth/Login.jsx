import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import toast from "react-hot-toast";
import { EyeIcon, EyeSlashIcon, LockClosedIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, userProfile } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (userProfile) {
      const userRole = userProfile.role || "employee";
      navigate(`/${userRole}`, { replace: true });
    }
  }, [userProfile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    try {
      await login(formData.email, formData.password);
      toast.success("Login successful!");
    } catch (error) {
      toast.error(error.message || "Login failed");
    }
  };

  return (
  
  <div className="min-h-screen bg-slate-950">
    {/* HEADER (full width) */}
    <header className="w-full bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-blue-600 rounded-lg blur-sm opacity-20"></div>
            <img
              src="/rlb-logo.jpg"
              alt="RLB Logo"
              className="relative h-12 w-auto sm:h-16 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Rider Levett Bucknall
            </span>
            <span className="text-xs sm:text-sm text-slate-500 uppercase tracking-wider">
              Philippines — Bohol
            </span>
          </div>
        </div>
      </div>
    </header>

    {/* BODY (image background + overlay form on right) */}
    <main className="relative min-h-[calc(100vh-88px)]">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/rlb-overview.jpg')" }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/30" />

      {/* Content layer */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left text (optional) */}
          <div className="hidden lg:block lg:col-span-7 text-white">
            <h1 className="text-4xl xl:text-5xl font-bold mb-4">
              Welcome to WorkPortal
            </h1>
            <p className="text-lg text-slate-200 max-w-xl">
              Access your dashboard and manage your attendance seamlessly.
            </p>
          </div>

          {/* Right overlay form */}
          <div className="lg:col-span-5">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-slate-900/30 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 sm:px-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                  <LockClosedIcon className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Welcome Back
                </h1>
                <p className="text-blue-100 mt-2 text-sm sm:text-base">
                  Sign in to WorkPortal
                </p>
              </div>

              {/* Form */}
              <div className="px-6 py-8 sm:px-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Email Address
                    </label>
                    <div
                      className={`relative transition-all duration-200 ${
                        focusedField === "email" ? "ring-2 ring-blue-500/20" : ""
                      }`}
                    >
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EnvelopeIcon
                          className={`h-5 w-5 transition-colors ${
                            focusedField === "email"
                              ? "text-blue-600"
                              : "text-slate-400"
                          }`}
                        />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-0 transition-all duration-200"
                        placeholder="youremail@rlb.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <div
                      className={`relative transition-all duration-200 ${
                        focusedField === "password"
                          ? "ring-2 ring-blue-500/20"
                          : ""
                      }`}
                    >
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockClosedIcon
                          className={`h-5 w-5 transition-colors ${
                            focusedField === "password"
                              ? "text-blue-600"
                              : "text-slate-400"
                          }`}
                        />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        className="block w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-0 transition-all duration-200"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-md shadow-blue-500/30 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-200/60">
                  <p className="text-center text-xs text-slate-500">
                    Central Access for All Staff
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-slate-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span className="text-xs">Secure login portal</span>
                </div>
              </div>
            </div>
          </div>
          {/* end right */}
        </div>
      </div>
    </main>
  </div>
);
};

export default Login;
