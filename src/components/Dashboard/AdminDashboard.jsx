import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import Header from "../Common/Header";
import Sidebar from "../Common/Sidebar";
import Settings from "../Common/Settings";
import Modal from "../Common/Modal";
import { supabase } from "../../config/supabase";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore";
import { useAdminData } from "./useAdminData";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import EventIcon from "@mui/icons-material/Event";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DescriptionIcon from "@mui/icons-material/Description";
import {
  UsersIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  UserPlusIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  XCircleIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

const Announcements = React.lazy(() => import("../Leave/Announcements"));

// Tab configuration matching EmployeeDashboard style
const TAB_CONFIG = [
  { id: "overview", label: "Overview", icon: <DashboardIcon /> },
  { id: "users", label: "Users", icon: <PeopleIcon /> },
  { id: "departments", label: "Departments", icon: <BusinessIcon /> },
  { id: "holidays", label: "Holidays", icon: <EventIcon /> },
  { id: "announcements", label: "Announcements", icon: <NotificationsIcon /> },
  { id: "attendance", label: "Reports", icon: <DescriptionIcon /> },
];

// ============ UI Components ============
const StatCard = ({ label, value, icon: Icon, color, trend }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
        {value}
      </p>
      {trend && (
        <p
          className={`text-sm mt-1 ${trend > 0 ? "text-green-500" : "text-red-500"}`}
        >
          {trend > 0 ? "+" : ""}
          {trend}% from last week
        </p>
      )}
    </div>
    <div className={`p-4 bg-${color}-100 dark:bg-${color}-900/30 rounded-2xl`}>
      <Icon className={`w-10 h-10 text-${color}-600 dark:text-${color}-400`} />
    </div>
  </div>
);

const ActionButton = ({
  onClick,
  icon: Icon,
  color = "blue",
  title,
  children,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
      color === "red"
        ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        : color === "green"
          ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
          : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
    }`}
    title={title}
  >
    <Icon className="w-5 h-5" />
    {children && <span>{children}</span>}
  </button>
);

const Card = ({ children, className = "", hover = false }) => (
  <div
    className={`card bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 ${
      hover ? "transition-all duration-300 hover:shadow-lg" : ""
    } ${className}`}
  >
    {children}
  </div>
);

const ToggleButton = ({
  isOpen,
  onClick,
  iconOpen: IconOpen,
  iconClosed: IconClosed,
  label,
  color = "blue",
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
      isOpen
        ? "bg-red-500 hover:bg-red-600 text-white shadow-lg"
        : `bg-${color}-500 hover:bg-${color}-600 text-white shadow-md hover:shadow-lg`
    }`}
  >
    {isOpen ? (
      <IconOpen className="w-5 h-5" />
    ) : (
      <IconClosed className="w-5 h-5" />
    )}
    <span>{isOpen ? "Cancel" : label}</span>
  </button>
);

const FormField = ({ label, children, required, hint }) => (
  <div>
    <div className="flex items-center gap-2">
      <label className="label-text font-medium">{label}</label>
      {required && <span className="text-red-500 text-sm">*</span>}
    </div>
    {hint && (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
    )}
    {children}
  </div>
);

const PasswordField = ({
  value,
  show,
  onToggle,
  field,
  onChange,
  formData,
}) => (
  <div className="relative">
    <input
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange({ ...formData, [field]: e.target.value })}
      className="input-field pr-12"
      placeholder="••••••••"
      required={true}
    />
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition p-1"
    >
      {show ? (
        <EyeSlashIcon className="w-5 h-5" />
      ) : (
        <EyeIcon className="w-5 h-5" />
      )}
    </button>
  </div>
);

// ============ Pagination Component ============
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showingFrom,
  showingTo,
  totalItems,
  itemLabel,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing{" "}
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {showingFrom}
        </span>{" "}
        to{" "}
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {showingTo}
        </span>{" "}
        of{" "}
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {totalItems}
        </span>{" "}
        {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Page{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {currentPage}
          </span>{" "}
          of{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {totalPages}
          </span>
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700 transition-all duration-200 shadow-sm"
            title="Previous Page"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700 transition-all duration-200 shadow-sm"
            title="Next Page"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ Main Component ============
const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [showSettings, setShowSettings] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    confirmPassword: "",
    role: "employee",
    department_id: "",
    manager_id: "",
  });
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptData, setDeptData] = useState({ name: "", manager_id: "" });
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayData, setHolidayData] = useState({
    name: "",
    date: "",
    is_recurring: false,
  });
  const [announcementData, setAnnouncementData] = useState({
    title: "",
    content: "",
    priority: "normal",
  });
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [userFilter, setUserFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 4;
  const [showDeleteUser, setShowDeleteUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [currentPageDepts, setCurrentPageDepts] = useState(1);
  const [currentPageHolidays, setCurrentPageHolidays] = useState(1);
  const [showDeleteDept, setShowDeleteDept] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [showDeleteHoliday, setShowDeleteHoliday] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportUser, setExportUser] = useState(null);

  const {
    loading,
    stats,
    users,
    managers,
    departments,
    holidays,
    attendanceStats,
    fetchDashboardData,
    fetchUsers,
    fetchManagers,
    fetchDepartments,
    fetchHolidays,
    fetchAttendanceStats,
    handleAddUser,
    handleDeleteUser,
    handleUpdateUserRole,
    handleAddDepartment,
    handleDeleteDepartment,
    handleAddHoliday,
    handleDeleteHoliday,
    createAnnouncement,
    getManagerName,
    getDepartmentName,
  } = useAdminData();

  // Tab data fetching
  useEffect(() => {
    if (!user) return;
    const tabFetchers = {
      overview: fetchDashboardData,
      users: () => {
        fetchUsers();
        fetchManagers();
        fetchDepartments();
      },
      departments: fetchDepartments,
      holidays: fetchHolidays,
      attendance: fetchAttendanceStats,
      announcements: () => {
        // Fetch announcements if needed
      },
    };
    tabFetchers[activeTab]?.();
  }, [
    activeTab,
    user,
    fetchDashboardData,
    fetchUsers,
    fetchManagers,
    fetchDepartments,
    fetchHolidays,
    fetchAttendanceStats,
  ]);

  const handleExportRecords = async (targetUser, range) => {
    const toastId = toast.loading(`Preparing ${range} report for ${targetUser.full_name || 'User'}...`);
    try {
      const now = new Date();
      let attendanceQuery = supabase
        .from("attendance")
        .select("*")
        .eq("user_id", targetUser.id)
        .order("check_in_time", { ascending: false });
      
      let correctionsQuery = supabase
        .from("attendance_corrections")
        .select("*")
        .eq("user_id", targetUser.id)
        .eq("status", "approved")
        .order("attendance_date", { ascending: false });

      let startDate;
      if (range === 'weekly') {
        const tempDate = new Date(now);
        startDate = new Date(tempDate.setDate(tempDate.getDate() - tempDate.getDay()));
        startDate.setHours(0, 0, 0, 0);
      } else if (range === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (startDate) {
        attendanceQuery = attendanceQuery.gte("check_in_time", startDate.toISOString());
        correctionsQuery = correctionsQuery.gte("attendance_date", startDate.toISOString().split('T')[0]);
      }

      const [{ data: attData, error: attError }, { data: corrData, error: corrError }] = await Promise.all([
        attendanceQuery,
        correctionsQuery
      ]);
      
      if (attError) throw attError;
      if (corrError) throw corrError;

      if ((!attData || attData.length === 0) && (!corrData || corrData.length === 0)) {
        toast.error("No records found for this period", { id: toastId });
        return;
      }

      let csvContent = "ATTENDANCE LOGS\n";
      csvContent += "Date,Check-in,Check-out,Duration (Hours),Status,Late,Notes\n";
      
      if (attData && attData.length > 0) {
        attData.forEach(r => {
          const isLate = r.status?.toLowerCase().includes('late') ? "Yes" : "No";
          const row = [
            new Date(r.check_in_time).toLocaleDateString(),
            new Date(r.check_in_time).toLocaleTimeString(),
            r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : "N/A",
            r.duration_hours?.toFixed(2) || "0.00",
            r.status,
            isLate,
            r.notes?.replace(/,/g, ';') || ""
          ];
          csvContent += row.join(",") + "\n";
        });
      }

      csvContent += "\nAPPROVED CORRECTIONS\n";
      csvContent += "Date,Type,Requested Time,Original Time,Reason,Approved At\n";

      if (corrData && corrData.length > 0) {
        corrData.forEach(c => {
          const row = [
            c.attendance_date,
            c.missing_type?.replace('_', ' '),
            c.requested_time,
            c.original_time || "N/A",
            c.reason?.replace(/,/g, ';') || "",
            c.approved_at ? new Date(c.approved_at).toLocaleDateString() : "N/A"
          ];
          csvContent += row.join(",") + "\n";
        });
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      // Format: FULLNAME_WHATREPORT_DATE (MM-DD-YYYY)
      const fullName = (targetUser.full_name || 'User').replace(/\s+/g, '').toUpperCase();
      const reportType = range === 'all' ? 'YEARLOGS' : range.toUpperCase();
      const dateStr = new Date().toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '-');
      
      const fileName = `${fullName}_${reportType}_${dateStr}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Report downloaded!", { id: toastId });
    } catch (error) {
      toast.error("Failed to export records", { id: toastId });
    }
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    const result = await handleAddUser(formData, editingUser, managers);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(result.message);
      setFormData({
        email: "",
        full_name: "",
        password: "",
        confirmPassword: "",
        role: "employee",
        department_id: "",
        manager_id: "",
      });
      setEditingUser(null);
      setShowAddUser(false);
    }
  };

  const handleDeleteUserClick = async (userId) => {
    const result = await handleDeleteUser(userId);
    if (result?.error) toast.error(result.error);
    else if (!result?.cancelled) toast.success(result.message);
  };

  const handleSubmitDepartment = async (e) => {
    e.preventDefault();
    const result = await handleAddDepartment(deptData);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(result.message);
      setDeptData({ name: "", manager_id: "" });
      setShowAddDept(false);
    }
  };

  const handleSubmitHoliday = async (e) => {
    e.preventDefault();
    const result = await handleAddHoliday(holidayData);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(result.message);
      setHolidayData({ name: "", date: "", is_recurring: false });
      setShowAddHoliday(false);
    }
  };

  const handleSubmitAnnouncement = async (e) => {
    e.preventDefault();
    const result = await createAnnouncement(announcementData);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(result.message);
      setAnnouncementData({ title: "", content: "", priority: "normal" });
      setShowAddAnnouncement(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (userFilter !== "all")
      filtered = filtered.filter((u) => u.role === userFilter);
    if (userSearch)
      filtered = filtered.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email?.toLowerCase().includes(userSearch.toLowerCase()),
      );
    return filtered;
  }, [users, userFilter, userSearch]);

  // Paginated users
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userFilter, userSearch]);

  // Render functions for each tab
  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold">Welcome back, Admin! 👋</h2>
        <p className="text-blue-100 mt-2">
          Here's what's happening with your organization today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={UsersIcon}
          color="blue"
          trend={12}
        />
        <StatCard
          label="Departments"
          value={stats.totalDepartments}
          icon={BuildingOfficeIcon}
          color="green"
          trend={5}
        />
        <StatCard
          label="Present Today"
          value={stats.presentToday}
          icon={ChartBarIcon}
          color="yellow"
          trend={8}
        />
        <StatCard
          label="Absent Today"
          value={stats.absentToday}
          icon={XCircleIcon}
          color="red"
          trend={-3}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-bold mb-4 dark:text-white">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              icon: UserPlusIcon,
              label: "Add Employee",
              color: "blue",
              action: () => {
                setActiveTab("users");
                setShowAddUser(true);
              },
            },
            {
              icon: BuildingOfficeIcon,
              label: "Add Department",
              color: "green",
              action: () => {
                setActiveTab("departments");
                setShowAddDept(true);
              },
            },
            {
              icon: CalendarDaysIcon,
              label: "Add Holiday",
              color: "purple",
              action: () => {
                setActiveTab("holidays");
                setShowAddHoliday(true);
              },
            },
            {
              icon: ClipboardDocumentListIcon,
              label: "View Reports",
              color: "orange",
              action: () => setActiveTab("attendance"),
            },
          ].map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-300 group"
            >
              <item.icon className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <h2 className="text-2xl font-bold">
            User Management
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Manage employees, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-semibold transition-all duration-300 shadow-md"
        >
          <UserPlusIcon className="w-5 h-5" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filter Buttons */}
      <Modal
        isOpen={showAddUser}
        onClose={() => {
          setShowAddUser(false);
          setEditingUser(null);
          setFormData({
            email: "",
            full_name: "",
            password: "",
            confirmPassword: "",
            role: "employee",
            department_id: "",
            manager_id: "",
          });
        }}
        title={editingUser ? "Edit Employee" : "Add New Employee"}
        size="lg"
      >
        <form onSubmit={handleSubmitUser} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Display Name" required>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="input-field"
                placeholder="John Doe"
                required
              />
            </FormField>
            <FormField label="Email Address" required>
              <div className="flex">
                <input
                  type="text"
                  value={formData.email.replace(/@rlb\.com$/, "")}
                  onChange={(e) => {
                    const username = e.target.value.replace(/@.*$/, "");
                    if (!username.includes("@"))
                      setFormData({
                        ...formData,
                        email: username ? `${username}@rlb.com` : "",
                      });
                  }}
                  className="input-field rounded-r-none"
                  placeholder="username"
                  required
                />
                <span className="inline-flex items-center px-3 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-300 text-sm">
                  @rlb.com
                </span>
              </div>
            </FormField>
            {!editingUser && (
              <>
                <FormField
                  label="Password"
                  required
                  hint="Minimum 8 characters"
                >
                  <PasswordField
                    value={formData.password}
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                    field="password"
                    onChange={setFormData}
                    formData={formData}
                  />
                </FormField>
                <FormField label="Confirm Password" required>
                  <PasswordField
                    value={formData.confirmPassword}
                    show={showConfirmPassword}
                    onToggle={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    field="confirmPassword"
                    onChange={setFormData}
                    formData={formData}
                  />
                </FormField>
              </>
            )}
            <FormField label="Role" required>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="input-field"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </FormField>
            <FormField label="Department (Optional)">
              <select
                value={formData.department_id}
                onChange={(e) =>
                  setFormData({ ...formData, department_id: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label={`Manager${formData.role === "manager" ? " (Optional)" : ""}`}
              required={formData.role !== "manager"}
            >
              <select
                value={formData.manager_id}
                onChange={(e) =>
                  setFormData({ ...formData, manager_id: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select Manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowAddUser(false);
                setEditingUser(null);
                setFormData({
                  email: "",
                  full_name: "",
                  password: "",
                  confirmPassword: "",
                  role: "employee",
                  department_id: "",
                  manager_id: "",
                });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {loading
                ? editingUser
                  ? "Updating..."
                  : "Creating..."
                : editingUser
                  ? "Update Employee"
                  : "Create Employee Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All Users", count: users.length },
          {
            key: "employee",
            label: "Employees",
            count: users.filter((u) => u.role === "employee").length,
          },
          {
            key: "manager",
            label: "Managers",
            count: users.filter((u) => u.role === "manager").length,
          },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setUserFilter(filter.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              userFilter === filter.key
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {filter.label}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
        />
        <svg
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Users Table */}
      <Card hover>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Email
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Name
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Role
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Department
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Manager
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="p-4 text-gray-700 dark:text-gray-200">
                    {user.email}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {user.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleUpdateUserRole(user.id, e.target.value)
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
                          : user.role === "manager"
                            ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    {getDepartmentName(user.department_id)}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">
                    {getManagerName(user.manager_id)}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <ActionButton
                        onClick={() => {
                          setExportUser(user);
                          setShowExportModal(true);
                        }}
                        icon={DocumentArrowDownIcon}
                        color="blue"
                        title="Extract Records"
                      />
                      <ActionButton
                        onClick={() => {
                          setEditingUser(user);
                          setFormData({
                            email: user.email,
                            full_name: user.full_name,
                            password: "",
                            confirmPassword: "",
                            role: user.role,
                            department_id: user.department_id || "",
                            manager_id: user.manager_id || "",
                          });
                          setShowAddUser(true);
                        }}
                        icon={PencilIcon}
                        title="Edit Employee"
                      />
                      <ActionButton
                        onClick={() => {
                          setUserToDelete(user);
                          setShowDeleteUser(true);
                        }}
                        icon={TrashIcon}
                        color="red"
                        title="Delete Employee"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          showingFrom={Math.min(
            (currentPage - 1) * ITEMS_PER_PAGE + 1,
            filteredUsers.length,
          )}
          showingTo={Math.min(
            currentPage * ITEMS_PER_PAGE,
            filteredUsers.length,
          )}
          totalItems={filteredUsers.length}
          itemLabel="users"
        />
      </Card>

      {/* Add/Edit Employee Modal */}
      <Modal
        isOpen={showAddUser}
        onClose={() => {
          setShowAddUser(false);
          setEditingUser(null);
          setFormData({
            email: "",
            full_name: "",
            password: "",
            confirmPassword: "",
            role: "employee",
            department_id: "",
            manager_id: "",
          });
        }}
        title={editingUser ? "Edit Employee" : "Add New Employee"}
        size="lg"
      >
        <form onSubmit={handleSubmitUser} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Display Name" required>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="input-field"
                placeholder="John Doe"
                required
              />
            </FormField>
            <FormField label="Email Address" required>
              <div className="flex">
                <input
                  type="text"
                  value={formData.email.replace(/@rlb\.com$/, "")}
                  onChange={(e) => {
                    const username = e.target.value.replace(/@.*$/, "");
                    if (!username.includes("@"))
                      setFormData({
                        ...formData,
                        email: username ? `${username}@rlb.com` : "",
                      });
                  }}
                  className="input-field rounded-r-none"
                  placeholder="username"
                  required
                />
                <span className="inline-flex items-center px-3 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-300 text-sm">
                  @rlb.com
                </span>
              </div>
            </FormField>
            {!editingUser && (
              <>
                <FormField
                  label="Password"
                  required
                  hint="Minimum 8 characters"
                >
                  <PasswordField
                    value={formData.password}
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                    field="password"
                    onChange={setFormData}
                    formData={formData}
                  />
                </FormField>
                <FormField label="Confirm Password" required>
                  <PasswordField
                    value={formData.confirmPassword}
                    show={showConfirmPassword}
                    onToggle={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    field="confirmPassword"
                    onChange={setFormData}
                    formData={formData}
                  />
                </FormField>
              </>
            )}
            <FormField label="Role" required>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="input-field"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </FormField>
            <FormField label="Department (Optional)">
              <select
                value={formData.department_id}
                onChange={(e) =>
                  setFormData({ ...formData, department_id: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label={`Manager${formData.role === "manager" ? " (Optional)" : ""}`}
              required={formData.role !== "manager"}
            >
              <select
                value={formData.manager_id}
                onChange={(e) =>
                  setFormData({ ...formData, manager_id: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select Manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowAddUser(false);
                setEditingUser(null);
                setFormData({
                  email: "",
                  full_name: "",
                  password: "",
                  confirmPassword: "",
                  role: "employee",
                  department_id: "",
                  manager_id: "",
                });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {loading
                ? editingUser
                  ? "Updating..."
                  : "Creating..."
                : editingUser
                  ? "Update Employee"
                  : "Create Employee Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteUser}
        onClose={() => {
          setShowDeleteUser(false);
          setUserToDelete(null);
        }}
        title="Delete Employee"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete{" "}
            <strong>{userToDelete?.full_name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowDeleteUser(false);
                setUserToDelete(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                const result = await handleDeleteUser(userToDelete.id);
                if (result?.error) toast.error(result.error);
                else if (!result?.cancelled) toast.success(result.message);
                setShowDeleteUser(false);
                setUserToDelete(null);
              }}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );

  const renderDepartments = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <h2 className="text-2xl font-bold">
            Department Management
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Organize your workforce into departments
          </p>
        </div>
        <button
          onClick={() => setShowAddDept(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-semibold transition-all duration-300 shadow-md"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={showAddDept}
        onClose={() => {
          setShowAddDept(false);
          setDeptData({ name: "", manager_id: "" });
        }}
        title="Add New Department"
        size="md"
      >
        <form onSubmit={handleSubmitDepartment} className="space-y-4">
          <FormField label="Department Name" required>
            <input
              type="text"
              value={deptData.name}
              onChange={(e) =>
                setDeptData({ ...deptData, name: e.target.value })
              }
              className="input-field"
              placeholder="e.g., Sales, Marketing, IT"
              required
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowAddDept(false);
                setDeptData({ name: "", manager_id: "" });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Department"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Department Modal */}
      <Modal
        isOpen={showDeleteDept}
        onClose={() => {
          setShowDeleteDept(false);
          setDeptToDelete(null);
        }}
        title="Delete Department"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete{" "}
            <strong>{deptToDelete?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowDeleteDept(false);
                setDeptToDelete(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                const result = await handleDeleteDepartment(deptToDelete.id);
                if (result?.error) toast.error(result.error);
                else toast.success(result.message);
                setShowDeleteDept(false);
                setDeptToDelete(null);
              }}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Departments Grid with Pagination */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments
          .slice(
            (currentPageDepts - 1) * ITEMS_PER_PAGE,
            currentPageDepts * ITEMS_PER_PAGE,
          )
          .map((dept) => (
            <Card key={dept.id} hover>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <BuildingOfficeIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold dark:text-white">
                      {dept.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {users.filter((u) => u.department_id === dept.id).length}{" "}
                      members
                    </p>
                  </div>
                </div>
                <ActionButton
                  onClick={() => {
                    setDeptToDelete(dept);
                    setShowDeleteDept(true);
                  }}
                  icon={TrashIcon}
                  color="red"
                  title="Delete Department"
                />
              </div>
            </Card>
          ))}
      </div>
      <Pagination
        currentPage={currentPageDepts}
        totalPages={Math.ceil(departments.length / ITEMS_PER_PAGE)}
        onPageChange={setCurrentPageDepts}
        showingFrom={Math.min(
          (currentPageDepts - 1) * ITEMS_PER_PAGE + 1,
          departments.length,
        )}
        showingTo={Math.min(
          currentPageDepts * ITEMS_PER_PAGE,
          departments.length,
        )}
        totalItems={departments.length}
        itemLabel="departments"
      />
    </div>
  );

  const renderHolidays = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <h2 className="text-2xl font-bold">
            Holiday Management
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Set up company holidays and observances
          </p>
        </div>
        <button
          onClick={() => setShowAddHoliday(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-semibold transition-all duration-300 shadow-md"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Holiday</span>
        </button>
      </div>

      {/* Add Holiday Modal */}
      <Modal
        isOpen={showAddHoliday}
        onClose={() => {
          setShowAddHoliday(false);
          setHolidayData({ name: "", date: "", is_recurring: false });
        }}
        title="Add New Holiday"
        size="md"
      >
        <form onSubmit={handleSubmitHoliday} className="space-y-4">
          <FormField label="Holiday Name" required>
            <input
              type="text"
              value={holidayData.name}
              onChange={(e) =>
                setHolidayData({ ...holidayData, name: e.target.value })
              }
              className="input-field"
              placeholder="e.g., Christmas, New Year"
              required
            />
          </FormField>
          <FormField label="Date" required>
            <input
              type="date"
              value={holidayData.date}
              onChange={(e) =>
                setHolidayData({ ...holidayData, date: e.target.value })
              }
              className="input-field"
              required
            />
          </FormField>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <input
              type="checkbox"
              checked={holidayData.is_recurring}
              onChange={(e) =>
                setHolidayData({
                  ...holidayData,
                  is_recurring: e.target.checked,
                })
              }
              className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
              id="recurring"
            />
            <label
              htmlFor="recurring"
              className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
            >
              Recurring annually
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowAddHoliday(false);
                setHolidayData({ name: "", date: "", is_recurring: false });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Holiday"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Announcement Modal */}
      <Modal
        isOpen={showAddAnnouncement}
        onClose={() => {
          setShowAddAnnouncement(false);
          setAnnouncementData({ title: "", content: "", priority: "normal" });
        }}
        title="Create New Announcement"
        size="md"
      >
        <form onSubmit={handleSubmitAnnouncement} className="space-y-4">
          <FormField label="Title" required>
            <input
              type="text"
              value={announcementData.title}
              onChange={(e) =>
                setAnnouncementData({
                  ...announcementData,
                  title: e.target.value,
                })
              }
              className="input-field"
              placeholder="e.g., Office Maintenance Notice"
              required
            />
          </FormField>
          <FormField label="Content" required>
            <textarea
              value={announcementData.content}
              onChange={(e) =>
                setAnnouncementData({
                  ...announcementData,
                  content: e.target.value,
                })
              }
              className="input-field min-h-[100px] resize-y"
              placeholder="Enter the announcement details..."
              required
            />
          </FormField>
          <FormField label="Priority">
            <select
              value={announcementData.priority}
              onChange={(e) =>
                setAnnouncementData({
                  ...announcementData,
                  priority: e.target.value,
                })
              }
              className="input-field"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowAddAnnouncement(false);
                setAnnouncementData({
                  title: "",
                  content: "",
                  priority: "normal",
                });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Announcement"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Holiday Modal */}
      <Modal
        isOpen={showDeleteHoliday}
        onClose={() => {
          setShowDeleteHoliday(false);
          setHolidayToDelete(null);
        }}
        title="Delete Holiday"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete{" "}
            <strong>{holidayToDelete?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowDeleteHoliday(false);
                setHolidayToDelete(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                const result = await handleDeleteHoliday(holidayToDelete.id);
                if (result?.error) toast.error(result.error);
                else toast.success(result.message);
                setShowDeleteHoliday(false);
                setHolidayToDelete(null);
              }}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Holidays Grid with Pagination */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays
          .slice(
            (currentPageHolidays - 1) * ITEMS_PER_PAGE,
            currentPageHolidays * ITEMS_PER_PAGE,
          )
          .map((holiday) => (
            <Card
              key={holiday.id}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800"
              hover
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                    <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {holiday.name}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                      {new Date(holiday.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {holiday.is_recurring && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs mt-2">
                        🔄 Recurring Annually
                      </span>
                    )}
                  </div>
                </div>
                <ActionButton
                  onClick={() => {
                    setHolidayToDelete(holiday);
                    setShowDeleteHoliday(true);
                  }}
                  icon={TrashIcon}
                  color="red"
                  title="Delete Holiday"
                />
              </div>
            </Card>
          ))}
      </div>
      <Pagination
        currentPage={currentPageHolidays}
        totalPages={Math.ceil(holidays.length / ITEMS_PER_PAGE)}
        onPageChange={setCurrentPageHolidays}
        showingFrom={Math.min(
          (currentPageHolidays - 1) * ITEMS_PER_PAGE + 1,
          holidays.length,
        )}
        showingTo={Math.min(
          currentPageHolidays * ITEMS_PER_PAGE,
          holidays.length,
        )}
        totalItems={holidays.length}
        itemLabel="holidays"
      />
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        }
      >
        <Announcements />
      </Suspense>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold">
          Attendance Reports
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          Track employee attendance and working hours
        </p>
      </div>
      <Card hover>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Employee
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Date
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Check-in
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Check-out
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Duration
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {attendanceStats.map((record) => {
                // Use existing duration_hours if available, otherwise calculate from check_in/check_out
                let duration = record.duration_hours;
                if (
                  (duration === null || duration === undefined) &&
                  record.check_in_time &&
                  record.check_out_time
                ) {
                  const checkIn = new Date(record.check_in_time);
                  const checkOut = new Date(record.check_out_time);
                  duration = (checkOut - checkIn) / (1000 * 60 * 60); // Convert milliseconds to hours
                }
                duration = duration || 0;

                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                          {record.users?.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {record.users?.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">
                      {new Date(record.check_in_time).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">
                      {new Date(record.check_in_time).toLocaleTimeString()}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">
                      {record.check_out_time
                        ? new Date(record.check_out_time).toLocaleTimeString()
                        : "-"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-semibold ${
                          duration >= 8
                            ? "text-green-600 dark:text-green-400"
                            : duration >= 6
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {duration.toFixed(1)}h
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.check_out_time
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {record.check_out_time ? "Complete" : "In Progress"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header
        title="Admin Dashboard"
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex flex-1">
        <aside className="w-24 hidden md:block">
          <Sidebar
            tabs={TAB_CONFIG}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </aside>

        <main className="flex-1 p-4 md:p-6 flex justify-center overflow-auto">
          <div className="w-full max-w-7xl">
            <div className="md:hidden mb-6">
              <Sidebar
                tabs={TAB_CONFIG}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>

            {activeTab === "overview" && renderOverview()}
            {activeTab === "users" && renderUsers()}
            {activeTab === "departments" && renderDepartments()}
            {activeTab === "holidays" && renderHolidays()}
            {activeTab === "announcements" && renderAnnouncements()}
            {activeTab === "attendance" && renderAttendance()}
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Export Records Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setExportUser(null);
        }}
        title="Extract Attendance Records"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Select the data range to download for <strong>{exportUser?.full_name}</strong>:
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                handleExportRecords(exportUser, 'weekly');
                setShowExportModal(false);
              }}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CalendarDaysIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-bold dark:text-white">Weekly Logs</p>
                <p className="text-xs text-gray-500">Current week records</p>
              </div>
            </button>

            <button
              onClick={() => {
                handleExportRecords(exportUser, 'monthly');
                setShowExportModal(false);
              }}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold dark:text-white">Monthly Logs</p>
                <p className="text-xs text-gray-500">Current month records</p>
              </div>
            </button>

            <button
              onClick={() => {
                handleExportRecords(exportUser, 'all');
                setShowExportModal(false);
              }}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
            >
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <ClipboardDocumentListIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-bold dark:text-white">Yearly Logs</p>
                <p className="text-xs text-gray-500">Full historical records</p>
              </div>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
