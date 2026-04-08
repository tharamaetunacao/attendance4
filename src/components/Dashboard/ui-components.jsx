import React from "react";
import {
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentListIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon as CheckCircleSolid,
  ClockIcon as ClockSolid,
} from "@heroicons/react/24/solid";

// Loading Spinner
export const LoadingSpinner = ({ size = "md" }) => {
  const sizes = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };
  return (
    <div className={`${sizes[size]} animate-spin`}>
      <svg
        className="w-full h-full text-blue-600"
        viewBox="0 0 24 24"
        fill="none"
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
    </div>
  );
};

// Stat Card
export const StatCard = React.memo(
  ({ label, value, color, subtext, icon: Icon, trend }) => {
    const colorClasses = {
      blue: {
        bg: "from-blue-500 to-blue-600",
        light: "bg-blue-50 dark:bg-blue-900/20",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800",
      },
      orange: {
        bg: "from-orange-500 to-orange-600",
        light: "bg-orange-50 dark:bg-orange-900/20",
        text: "text-orange-600 dark:text-orange-400",
        border: "border-orange-200 dark:border-orange-800",
      },
      purple: {
        bg: "from-purple-500 to-purple-600",
        light: "bg-purple-50 dark:bg-purple-900/20",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-200 dark:border-purple-800",
      },
      green: {
        bg: "from-green-500 to-green-600",
        light: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-600 dark:text-green-400",
        border: "border-green-200 dark:border-green-800",
      },
    };
    const colors = colorClasses[color] || colorClasses.blue;

    return (
      <div
        className={`relative overflow-hidden rounded-2xl ${colors.light} border ${colors.border} p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group`}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {label}
            </p>
            <p
              className={`text-4xl font-bold ${colors.text} transition-transform duration-300 group-hover:scale-105`}
            >
              {value}
            </p>
            {subtext && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {trend && (
                  <span
                    className={trend > 0 ? "text-green-500" : "text-red-500"}
                  >
                    {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                  </span>
                )}
                {subtext}
              </p>
            )}
          </div>
          {Icon && (
            <div
              className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg} shadow-lg`}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
        <div
          className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${colors.bg} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}
        />
      </div>
    );
  },
);

// Status Badge
export const StatusBadge = React.memo(({ status }) => {
  const config = {
    pending: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      icon: ClockSolid,
      label: "Pending",
    },
    approved: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: CheckCircleSolid,
      label: "Approved",
    },
    rejected: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      icon: XMarkIcon,
      label: "Rejected",
    },
    "checked-out": {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: CheckCircleSolid,
      label: "Checked Out",
    },
  };
  const {
    bg,
    text,
    icon: Icon,
    label,
  } = config[status] || {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-400",
    icon: InformationCircleIcon,
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${bg} ${text} transition-all duration-200 hover:shadow-sm`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
});

// Action Buttons
export const ActionButtons = ({ onApprove, onReject, loading }) => (
  <div className="flex items-center gap-2">
    <button
      onClick={onApprove}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
    >
      <CheckIcon className="w-4 h-4" />
      Approve
    </button>
    <button
      onClick={onReject}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
    >
      <XMarkIcon className="w-4 h-4" />
      Reject
    </button>
  </div>
);

// Rejection Modal
export const RejectionModal = React.memo(
  ({ isOpen, reason, onChange, onConfirm, onCancel, loading, title }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCancel}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejection.
            </p>
            <textarea
              value={reason}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none"
              rows="4"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading || !reason.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Rejecting...
                  </span>
                ) : (
                  "Confirm Rejection"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

// Tab Button
export const TabButton = ({ active, onClick, icon: Icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`relative flex-1 py-3.5 px-4 text-center font-medium transition-all duration-300 flex items-center justify-center gap-2 ${active ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
  >
    <Icon className="w-5 h-5" />
    <span className="hidden sm:inline">{label}</span>
    {badge > 0 && (
      <span
        className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold rounded-full ${active ? "bg-white text-blue-600" : "bg-red-500 text-white"}`}
      >
        {badge}
      </span>
    )}
  </button>
);

// Filter Card
export const FilterCard = ({ children, title }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
    {title && (
      <div className="flex items-center gap-2 mb-4">
        <FunnelIcon className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-700 dark:text-gray-300">
          {title}
        </h3>
      </div>
    )}
    {children}
  </div>
);

// Data Table
export const DataTable = React.memo(
  ({ columns, data, emptyMessage, loading }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <LoadingSpinner size="lg" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Loading data...
                    </p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                      <ClipboardDocumentListIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  ),
);

// Section Header
export const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-400">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
    {action}
  </div>
);

// Report Card
export const ReportCard = React.memo(
  ({ title, description, color, icon: Icon, onClick }) => {
    const colorClasses = {
      blue: "from-blue-500 to-blue-600 shadow-blue-500/25",
      green: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
      orange: "from-orange-500 to-orange-600 shadow-orange-500/25",
      purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
    };
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300 group">
        <div
          className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg mb-4`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
        <button
          onClick={onClick}
          className={`w-full py-2.5 px-4 bg-gradient-to-r ${colorClasses[color]} text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-[1.02]`}
        >
          <DocumentArrowDownIcon className="w-5 h-5" />
          Export Report
        </button>
      </div>
    );
  },
);
