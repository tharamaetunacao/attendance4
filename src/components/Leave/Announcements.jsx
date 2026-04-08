import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../config/supabase";
import { useAuthStore } from "../../stores/authStore";
import { useBackgroundTheme } from "../Common/ThemeProvider";
import toast from "react-hot-toast";
import { createNotification } from "../../services/supabaseService";
import {
  BellIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";

// Modal component
const Modal = ({ isOpen, onClose, title, children, size = "md", isDark }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className={`relative ${
          isDark ? "bg-gray-800 border border-gray-700" : "bg-white"
        } rounded-xl w-full ${sizeClasses[size]} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex justify-between items-center p-4 border-b ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h3
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`${
              isDark
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const Announcements = () => {
  const { user, userProfile, loading: authLoading } = useAuthStore();
  const { backgroundTheme } = useBackgroundTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [creatorRoles, setCreatorRoles] = useState({});
  const [filter, setFilter] = useState("all");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal",
    expires_at: "",
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [canCreateAnnouncement, setCanCreateAnnouncement] = useState(false);
  const profileLoadedRef = useRef(false);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    title: "",
  });

  // Fetch user profile if not available
  useEffect(() => {
    const loadProfile = async () => {
      if (profileLoadedRef.current || !user?.id) return;

      const shouldFetch = !userProfile || !userProfile.manager_id;

      if (shouldFetch) {
        const { data: profileData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          const isUserAdmin = profileData.role === "admin";
          const canCreate =
            profileData.role === "admin" || profileData.role === "manager";
          setIsAdmin(isUserAdmin);
          setCanCreateAnnouncement(canCreate);
        }
      } else {
        const isUserAdmin = userProfile.role === "admin";
        const canCreate =
          userProfile.role === "admin" || userProfile.role === "manager";
        setIsAdmin(isUserAdmin);
        setCanCreateAnnouncement(canCreate);
      }

      profileLoadedRef.current = true;
    };

    loadProfile();
  }, [user, userProfile]);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setAnnouncements(data || []);

        // Fetch creator roles
        const creatorIds = [...new Set(data?.map((a) => a.created_by) || [])];
        if (creatorIds.length > 0) {
          const { data: creatorsData } = await supabase
            .from("users")
            .select("id, role, full_name")
            .in("id", creatorIds);

          const rolesMap = {};
          creatorsData?.forEach((creator) => {
            rolesMap[creator.id] = creator;
          });
          setCreatorRoles(rolesMap);
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
        toast.error("Failed to load announcements");
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Filter announcements
  useEffect(() => {
    let filtered = announcements;

    if (filter === "admin") {
      filtered = announcements.filter(
        (a) => creatorRoles[a.created_by]?.role === "admin",
      );
    } else if (filter === "manager") {
      filtered = announcements.filter(
        (a) => creatorRoles[a.created_by]?.role === "manager",
      );
    }

    setFilteredAnnouncements(filtered);
  }, [filter, announcements, creatorRoles]);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();

    // Validate user is authenticated
    if (!user?.id) {
      toast.error("You must be logged in to create an announcement");
      return;
    }

    // Validate form data
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creating announcement...");

    try {
      const insertData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        expires_at: formData.expires_at || null,
        created_by: user.id,
        manager_id: user.id, // Required by database schema
      };

      console.log("Creating announcement with data:", insertData);

      const { data: announcementData, error } = await supabase
        .from("announcements")
        .insert([insertData])
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(error.message || "Failed to create announcement");
      }

      if (!announcementData || announcementData.length === 0) {
        throw new Error("No data returned from announcement creation");
      }

      console.log("Announcement created successfully:", announcementData);
      toast.success("Announcement created successfully", { id: toastId });
      setShowForm(false);
      setFormData({
        title: "",
        content: "",
        priority: "normal",
        expires_at: "",
      });

      // Refresh announcements
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      setAnnouncements(data || []);

      // Create notifications for all users (don't let this block success)
      try {
        const { data: allUsers } = await supabase.from("users").select("id");
        const message = `New Announcement: ${formData.title}`;
        const referenceId = announcementData?.[0]?.id || null;

        if (allUsers && allUsers.length > 0) {
          for (const u of allUsers) {
            await createNotification(
              u.id,
              message,
              "announcement",
              referenceId,
            );
          }
        }
      } catch (notifError) {
        console.error("Error sending notifications:", notifError);
        // Don't fail the whole operation if notifications fail
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create announcement: " + error.message, {
        id: toastId,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", deleteModal.id);

      if (error) throw error;

      toast.success("Announcement deleted");
      setDeleteModal({ open: false, id: null, title: "" });

      // Refresh announcements
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case "high":
        return {
          border: "border-l-4 border-red-500",
          badge: "bg-red-100 text-red-800",
          dot: "bg-red-500",
        };
      case "low":
        return {
          border: "border-l-4 border-gray-400",
          badge: "bg-gray-100 text-gray-800",
          dot: "bg-gray-400",
        };
      default:
        return {
          border: "border-l-4 border-blue-500",
          badge: "bg-blue-100 text-blue-800",
          dot: "bg-blue-500",
        };
    }
  };

  const FilterButton = ({ type, label }) => (
    <button
      onClick={() => setFilter(type)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        filter === type
          ? "bg-gradient-to-r from-indigo-600 to-red-600 text-white shadow-md"
          : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
      }`}
    >
      {label}
    </button>
  );

  const canDelete = (announcement) => {
    // Only admins can delete any announcement
    // Managers can only delete their own announcements
    if (isAdmin) return true;
    if (canCreateAnnouncement && announcement.created_by === user?.id)
      return true;
    return false;
  };

  // Get theme-aware colors
  const isDarkTheme = backgroundTheme === "dark";
  const cardBgClass = isDarkTheme ? "bg-gray-800" : "bg-white";
  const textClass = isDarkTheme ? "text-white" : "text-gray-800";
  const subtextClass = isDarkTheme ? "text-gray-400" : "text-gray-600";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, title: "" })}
        title="Delete Announcement"
        size="sm"
        isDark={isDarkTheme}
      >
        <p
          className={`mb-4 ${isDarkTheme ? "text-gray-300" : "text-gray-700"}`}
        >
          Are you sure you want to delete <strong>"{deleteModal.title}"</strong>
          ?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setDeleteModal({ open: false, id: null, title: "" })}
            className={`px-4 py-2 rounded-lg transition ${
              isDarkTheme
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-200 hover:bg-gray-300 text-gray-800"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>

      {/* Create Announcement Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create New Announcement"
        size="lg"
        isDark={isDarkTheme}
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label
              className={`block text-sm font-medium mb-1 ${isDarkTheme ? "text-gray-300" : "text-gray-700"}`}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkTheme
                  ? "bg-gray-900 border-gray-700 text-white placeholder-gray-400"
                  : "border-gray-300 text-gray-900"
              }`}
              placeholder="Announcement Title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${isDarkTheme ? "text-gray-300" : "text-gray-700"}`}
              >
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkTheme
                    ? "bg-gray-900 border-gray-700 text-white"
                    : "border-gray-300 text-gray-900"
                }`}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${isDarkTheme ? "text-gray-300" : "text-gray-700"}`}
              >
                Expires At (Optional)
              </label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) =>
                  setFormData({ ...formData, expires_at: e.target.value })
                }
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkTheme
                    ? "bg-gray-900 border-gray-700 text-white"
                    : "border-gray-300 text-gray-900"
                }`}
              />
            </div>
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-1 ${isDarkTheme ? "text-gray-300" : "text-gray-700"}`}
            >
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkTheme
                  ? "bg-gray-900 border-gray-700 text-white placeholder-gray-400"
                  : "border-gray-300 text-gray-900"
              }`}
              placeholder="Announcement content..."
              rows="4"
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={`px-4 py-2 rounded-lg transition ${
                isDarkTheme
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              <SendIcon fontSize="small" />
              {loading ? "Creating..." : "Publish"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Main Card Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BellIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Announcements
                </h2>
                <p className="text-sm text-gray-500">
                  Stay updated with the latest news
                </p>
              </div>
            </div>
            {canCreateAnnouncement && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition shadow-sm hover:shadow-md flex items-center gap-2 font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                {showForm ? "Cancel" : "New Announcement"}
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100">
            <FilterButton type="all" label="All" />
            <FilterButton type="admin" label="Admin" />
            <FilterButton type="manager" label="Manager" />
          </div>

          {/* Announcements List */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <BellIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">
                No announcements found
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Check back later for updates
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => {
                const styles = getPriorityStyles(announcement.priority);
                const isExpanded = expandedId === announcement.id;
                const creator = creatorRoles[announcement.created_by];
                const canDeleteAnnouncement = canDelete(announcement);
                const creatorDisplayName =
                  creator?.full_name || creator?.role === "manager"
                    ? "Manager"
                    : creator?.full_name || "Unknown";

                return (
                  <div
                    key={announcement.id}
                    className={`${cardBgClass} rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md ${styles.border}`}
                  >
                    {/* Card Header - Clickable */}
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpand(announcement.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Expand Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {isExpanded ? (
                            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {/* Priority Dot */}
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${styles.dot}`}
                            />
                            {/* Title */}
                            <h3
                              className={`font-semibold ${textClass} truncate`}
                            >
                              {announcement.title}
                            </h3>
                            {/* Priority Badge */}
                            <span
                              className={`px-2.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${styles.badge}`}
                            >
                              {announcement.priority === "high"
                                ? "HIGH"
                                : announcement.priority === "low"
                                  ? "LOW"
                                  : "Normal"}
                            </span>
                          </div>

                          {/* Preview */}
                          <p className={`text-sm ${subtextClass} line-clamp-2`}>
                            {announcement.content.substring(0, 120)}
                            {announcement.content.length > 120 ? "..." : ""}
                          </p>

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <UserIcon className="w-4 h-4" />
                              <span>
                                {creator?.role === "admin"
                                  ? "Admin"
                                  : creatorDisplayName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              <span>
                                {new Date(
                                  announcement.created_at,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Delete Button (Admin only) */}
                        {isAdmin && canDeleteAnnouncement && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal({
                                open: true,
                                id: announcement.id,
                                title: announcement.title,
                              });
                            }}
                            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <div className="ml-9">
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <span>
                              From:{" "}
                              <span className="font-medium text-gray-700 capitalize">
                                {creatorDisplayName}
                              </span>
                            </span>
                            {announcement.expires_at && (
                              <span>
                                Expires:{" "}
                                {new Date(
                                  announcement.expires_at,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div
                            className={`${cardBgClass} p-4 rounded-lg border border-gray-200`}
                          >
                            <p
                              className={`${textClass} whitespace-pre-wrap leading-relaxed`}
                            >
                              {announcement.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
