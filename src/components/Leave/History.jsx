import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useLeaveStore } from "../../stores/leaveStore";
import { useBackgroundTheme } from "../Common/ThemeProvider";
import { supabase } from "../../config/supabase";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import DescriptionIcon from "@mui/icons-material/Description";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import toast from "react-hot-toast";

const History = () => {
  const { userProfile } = useAuthStore();
  const { backgroundTheme } = useBackgroundTheme();
  const {
    leaveRequests,
    loading,
    error,
    fetchLeaveRequests,
    updateLeaveRequest,
    deleteLeaveRequest,
  } = useLeaveStore();

  const [activeFilter, setActiveFilter] = useState("leave");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [correctionStatusFilter, setCorrectionStatusFilter] = useState("all");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [editingLeave, setEditingLeave] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLeaveId, setDeleteLeaveId] = useState(null);
  const [formData, setFormData] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  useEffect(() => {
    const loadData = async () => {
      if (userProfile?.id && initialLoad) {
        try {
          await fetchLeaveRequests(userProfile.id, userProfile.role);
          await fetchCorrectionRequests();
          await fetchAttendanceRecords();
        } catch (err) {
          console.error("Error loading history data:", err);
        } finally {
          setInitialLoad(false);
        }
      }
    };

    loadData();
  }, [userProfile, fetchLeaveRequests, initialLoad]);

  const fetchCorrectionRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance_corrections")
        .select("*")
        .eq("user_id", userProfile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCorrectionRequests(data || []);
    } catch (err) {
      console.error("Error fetching correction requests:", err);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userProfile.id)
        .order("check_in_time", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (err) {
      console.error("Error fetching attendance records:", err);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status) => {
    const statusMap = {
      pending: <HourglassEmptyIcon fontSize="small" />,
      approved: <CheckCircleIcon fontSize="small" />,
      rejected: <CancelIcon fontSize="small" />,
    };
    return statusMap[status] || null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatLeaveType = (type) => {
    if (!type) return "-";
    return (
      type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ") + " Leave"
    );
  };

  const calculateHoursWorked = (attendance) => {
    if (!attendance || !attendance.duration_hours) return "--:--";
    const hours = Math.floor(attendance.duration_hours);
    const minutes = Math.round((attendance.duration_hours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const handleEdit = (leave) => {
    if (leave.status !== "pending") {
      toast.error("Only pending leave requests can be edited");
      return;
    }
    setEditingLeave(leave);
    setFormData({
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      reason: leave.reason || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (leaveId, status) => {
    if (status !== "pending") {
      toast.error("Only pending leave requests can be deleted");
      return;
    }

    setDeleteLeaveId(leaveId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await deleteLeaveRequest(deleteLeaveId);
      if (error) {
        toast.error("Failed to delete leave request");
      } else {
        toast.success("Leave request deleted successfully");
        await fetchLeaveRequests(userProfile.id, userProfile.role);
      }
    } catch (err) {
      toast.error("Error deleting leave request");
    } finally {
      setShowDeleteModal(false);
      setDeleteLeaveId(null);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      const { error } = await updateLeaveRequest(editingLeave.id, formData);
      if (error) {
        toast.error("Failed to update leave request");
      } else {
        toast.success("Leave request updated successfully");
        setShowEditModal(false);
        setEditingLeave(null);
        await fetchLeaveRequests(userProfile.id, userProfile.role);
      }
    } catch (err) {
      toast.error("Error updating leave request");
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingLeave(null);
    setFormData({
      leave_type: "",
      start_date: "",
      end_date: "",
      reason: "",
    });
  };

  // Theme-aware colors
  const isDarkTheme = backgroundTheme === "dark";
  const cardBgClass = isDarkTheme ? "bg-gray-800" : "bg-white";
  const textClass = isDarkTheme ? "text-white" : "text-gray-800";
  const subtextClass = isDarkTheme ? "text-gray-400" : "text-gray-600";
  const borderClass = isDarkTheme ? "border-gray-700" : "border-gray-200";

  const tabConfig = [
    { id: "leave", label: "Leave", icon: <DescriptionIcon /> },
    { id: "correction", label: "Correction", icon: <AccessTimeIcon /> },
    { id: "attendance", label: "Attendance", icon: <CalendarTodayIcon /> },
  ];

  const FilterBadge = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-blue-600 text-white shadow-md"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseModal}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Edit Leave Request</h3>
              <button onClick={handleCloseModal} className="text-gray-500">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) =>
                    setFormData({ ...formData, leave_type: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="paid">Paid Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <DeleteIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete Leave Request</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this leave request? This action
                cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <HistoryIcon className="w-6 h-6 text-blue-600" />
          </div>
          <span>History</span>
        </h2>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveFilter(tab.id);
              setLeaveStatusFilter("all");
              setCorrectionStatusFilter("all");
              setAttendanceDateFilter({ startDate: "", endDate: "" });
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeFilter === tab.id
                ? "bg-gradient-to-r from-indigo-600 to-red-600 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leave History */}
      {activeFilter === "leave" && (
        <div
          className={`${cardBgClass} rounded-xl shadow-sm border ${borderClass}`}
        >
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <FilterBadge
                  key={status}
                  active={leaveStatusFilter === status}
                  onClick={() => setLeaveStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </FilterBadge>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading && initialLoad ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center p-8 text-red-500">
                Error loading leave history: {error}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Leave Type
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Dates
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Reason
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Submitted
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredRequests =
                      leaveStatusFilter === "all"
                        ? leaveRequests
                        : leaveRequests.filter(
                            (leave) => leave.status === leaveStatusFilter,
                          );

                    if (filteredRequests.length === 0) {
                      return (
                        <tr>
                          <td colSpan="6" className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                              <DescriptionIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className={`text-lg ${subtextClass}`}>
                              No leave requests found
                            </p>
                          </td>
                        </tr>
                      );
                    }

                    return filteredRequests.map((leave) => (
                      <tr
                        key={leave.id}
                        className={`border-b ${borderClass} hover:bg-gray-50 transition-colors`}
                      >
                        <td className={`py-3 px-4 ${textClass}`}>
                          {formatLeaveType(leave.leave_type)}
                        </td>
                        <td className={`py-3 px-4 ${subtextClass}`}>
                          {formatDate(leave.start_date)} -{" "}
                          {formatDate(leave.end_date)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(
                              leave.status,
                            )}`}
                          >
                            {getStatusIcon(leave.status)}
                            {leave.status}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 ${subtextClass} max-w-xs truncate`}
                          title={leave.reason}
                        >
                          {leave.reason || "-"}
                        </td>
                        <td className={`py-3 px-4 ${subtextClass} text-sm`}>
                          {formatDate(leave.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(leave)}
                              disabled={leave.status !== "pending"}
                              className={`p-2 rounded-lg transition ${
                                leave.status === "pending"
                                  ? "text-blue-600 hover:bg-blue-50"
                                  : "text-gray-400 cursor-not-allowed"
                              }`}
                              title="Edit"
                            >
                              <EditIcon fontSize="small" />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(leave.id, leave.status)
                              }
                              disabled={leave.status !== "pending"}
                              className={`p-2 rounded-lg transition ${
                                leave.status === "pending"
                                  ? "text-red-600 hover:bg-red-50"
                                  : "text-gray-400 cursor-not-allowed"
                              }`}
                              title="Delete"
                            >
                              <DeleteIcon fontSize="small" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Correction History */}
      {activeFilter === "correction" && (
        <div
          className={`${cardBgClass} rounded-xl shadow-sm border ${borderClass}`}
        >
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <FilterBadge
                  key={status}
                  active={correctionStatusFilter === status}
                  onClick={() => setCorrectionStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </FilterBadge>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {(() => {
              const filteredRequests =
                correctionStatusFilter === "all"
                  ? correctionRequests
                  : correctionRequests.filter(
                      (correction) =>
                        correction.status === correctionStatusFilter,
                    );

              if (filteredRequests.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <AccessTimeIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className={`text-lg ${subtextClass}`}>
                      No correction requests found
                    </p>
                  </div>
                );
              }

              return (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Requested Time
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Reason
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((correction) => (
                      <tr
                        key={correction.id}
                        className={`border-b ${borderClass} hover:bg-gray-50 transition-colors`}
                      >
                        <td className={`py-3 px-4 ${textClass}`}>
                          {formatDate(correction.attendance_date)}
                        </td>
                        <td className={`py-3 px-4 ${subtextClass}`}>
                          {correction.missing_type === "check_in"
                            ? "Missing Check-in"
                            : "Missing Check-out"}
                        </td>
                        <td className={`py-3 px-4 ${textClass}`}>
                          {correction.requested_time}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(
                              correction.status,
                            )}`}
                          >
                            {getStatusIcon(correction.status)}
                            {correction.status}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 ${subtextClass} max-w-xs truncate`}
                          title={correction.reason}
                        >
                          {correction.reason || "-"}
                        </td>
                        <td className={`py-3 px-4 ${subtextClass} text-sm`}>
                          {formatDate(correction.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}

      {/* Attendance History */}
      {activeFilter === "attendance" && (
        <div
          className={`${cardBgClass} rounded-xl shadow-sm border ${borderClass}`}
        >
          <div className="p-4 border-b border-gray-100">
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={attendanceDateFilter.startDate}
                  onChange={(e) =>
                    setAttendanceDateFilter((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={attendanceDateFilter.endDate}
                  onChange={(e) =>
                    setAttendanceDateFilter((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() =>
                  setAttendanceDateFilter({ startDate: "", endDate: "" })
                }
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {(() => {
              const filteredRecords = attendanceRecords.filter((record) => {
                if (!record.check_in_time) return false;
                const recordDate = new Date(record.check_in_time);

                if (attendanceDateFilter.startDate) {
                  const startDate = new Date(attendanceDateFilter.startDate);
                  if (recordDate < startDate) return false;
                }

                if (attendanceDateFilter.endDate) {
                  const endDate = new Date(attendanceDateFilter.endDate);
                  endDate.setHours(23, 59, 59, 999);
                  if (recordDate > endDate) return false;
                }

                return true;
              });

              if (filteredRecords.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <CalendarTodayIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className={`text-lg ${subtextClass}`}>
                      No attendance records found
                    </p>
                  </div>
                );
              }

              return (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Clock In
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Clock Out
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Work Hours
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className={`border-b ${borderClass} hover:bg-gray-50 transition-colors`}
                      >
                        <td className={`py-3 px-4 ${textClass}`}>
                          {formatDate(record.check_in_time)}
                        </td>
                        <td className={`py-3 px-4 ${subtextClass}`}>
                          {formatTime(record.check_in_time)}
                        </td>
                        <td className={`py-3 px-4 ${subtextClass}`}>
                          {record.check_out_time
                            ? formatTime(record.check_out_time)
                            : "-"}
                        </td>
                        <td className={`py-3 px-4 ${textClass}`}>
                          {calculateHoursWorked(record)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(
                              record.status === "checked-in"
                                ? "pending"
                                : record.check_out_time
                                  ? "approved"
                                  : "pending",
                            )}`}
                          >
                            {record.check_out_time ? (
                              <>
                                <CheckCircleIcon fontSize="small" />
                                Completed
                              </>
                            ) : (
                              <>
                                <HourglassEmptyIcon fontSize="small" />
                                In Progress
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
