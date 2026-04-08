import React, { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useLeaveStore } from "../../stores/leaveStore";
import { requestLeave } from "../../services/supabaseService";
import toast from "react-hot-toast";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DescriptionIcon from "@mui/icons-material/Description";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

const LeaveRequest = () => {
  const { userProfile } = useAuthStore();
  const { fetchLeaveRequests } = useLeaveStore();
  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!userProfile?.id) {
        throw new Error("User not authenticated");
      }

      if (!formData.leaveType) {
        throw new Error("Please select a leave type");
      }

      // Validate dates
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (endDate < startDate) {
        throw new Error("End date cannot be before start date");
      }

      // Prepare leave request data
      const leaveData = {
        user_id: userProfile.id,
        leave_type: formData.leaveType,
        start_date: formData.startDate,
        end_date: formData.endDate,
        reason: formData.reason || null,
      };

      // Submit to database
      const { error: submitError } = await requestLeave(leaveData);

      if (submitError) {
        throw submitError;
      }

      // Refresh leave requests
      await fetchLeaveRequests(userProfile.id, userProfile.role);

      // Show success message
      toast.success("Leave request submitted successfully!");

      // Show submitted state
      setIsSubmitted(true);

      // Reset form after delay
      setTimeout(() => {
        setFormData({
          leaveType: "",
          startDate: "",
          endDate: "",
          reason: "",
        });
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Leave request error:", error);
      setError(error.message || "Failed to submit leave request");
      toast.error(error.message || "Failed to submit leave request");
    } finally {
      setLoading(false);
    }
  };

  const daysRequested = calculateDays();

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <CheckCircleIcon className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Request Submitted!
            </h2>
            <p className="text-gray-600">
              Your leave request has been sent for approval.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              You will be notified once it's reviewed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Card Section with Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Gradient Top Border */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 to-red-600"></div>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <CalendarTodayIcon className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Request Leave</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Submit a request for time off from work
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <DescriptionIcon fontSize="small" />
              {error}
            </div>
          )}

          {/* Leave Type Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white transition-all cursor-pointer hover:border-gray-400"
                required
              >
                <option value="">Select leave type...</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="paid">Paid Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
              <ArrowDropDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-5 h-5" />
            </div>
          </div>

          {/* Date Selection - Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full px-4 py-2.5 pl-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-gray-400 ${
                    formData.startDate
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-gray-300"
                  }`}
                  required
                />
                <CalendarTodayIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                End Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={
                    formData.startDate || new Date().toISOString().split("T")[0]
                  }
                  className={`w-full px-4 py-2.5 pl-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-gray-400 ${
                    formData.endDate
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-gray-300"
                  }`}
                  required
                />
                <CalendarTodayIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Days Summary */}
          {daysRequested > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <CalendarTodayIcon className="text-blue-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Total Days Requested
                    </p>
                    <p className="text-xl font-bold text-blue-700">
                      {daysRequested} day{daysRequested > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {formData.startDate && formData.endDate && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(formData.startDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      )}{" "}
                      -{" "}
                      {new Date(formData.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Reason */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Reason{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none hover:border-gray-400"
                rows="4"
                placeholder="Please provide a brief reason for your leave request..."
              ></textarea>
              <DescriptionIcon className="absolute right-3 top-3 text-gray-400 w-4 h-4" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
            }`}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <SendIcon />
                Submit Leave Request
              </>
            )}
          </button>

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-gray-600">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs">i</span>
            </div>
            <p>
              Your leave request will be sent to your manager for approval. You
              will receive a notification once it's reviewed.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequest;
