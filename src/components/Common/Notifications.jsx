import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../services/supabaseService";
import { BellIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { BellIcon as BellIconSolid } from "@heroicons/react/24/solid";
import { supabase } from "../../config/supabase";

const Notifications = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    const saved = localStorage.getItem("dismissedNotifications");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      setupRealtimeSubscription();
    }

    return () => {
      // Cleanup subscription
      if (window.notificationSubscription) {
        supabase.removeChannel(window.notificationSubscription);
      }
    };
  }, [user]);

  const setupRealtimeSubscription = () => {
    // Only setup subscription if user is available
    if (!user?.id) {
      console.warn("User not available, skipping notification subscription");
      return;
    }

    // Only setup subscription if notifications table exists
    supabase
      .from("notifications")
      .select("id")
      .limit(1)
      .then(({ error }) => {
        if (!error) {
          // Table exists, setup subscription
          window.notificationSubscription = supabase
            .channel("user_notifications")
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${user.id}`,
              },
              (payload) => {
                console.log("New notification received:", payload);
                // Add the new notification to the list, avoiding duplicates
                setNotifications((prev) => {
                  // Check if this notification already exists
                  const exists = prev.some((n) => n.id === payload.new.id);
                  if (exists) {
                    console.log(
                      "Notification already exists, skipping duplicate",
                    );
                    return prev;
                  }
                  return [payload.new, ...prev];
                });
              },
            )
            .subscribe();
        } else {
          console.warn(
            "Notifications table not available, skipping real-time subscription",
          );
        }
      });
  };

  const loadNotifications = async () => {
    if (!user?.id) {
      console.warn("User not available, skipping notification load");
      setNotifications([]);
      return;
    }

    try {
      const result = await getUserNotifications(user.id);
      // getUserNotifications now returns { data, error } or just data array
      const notifications = result.data || result || [];

      // Remove any potential duplicates based on notification ID
      const uniqueNotifications = notifications.reduce((acc, curr) => {
        if (!acc.some((n) => n.id === curr.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      setNotifications(uniqueNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setNotifications([]); // Fallback to empty array
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await markNotificationAsRead(notificationId);
      if (result && !result.error) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif,
          ),
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const result = await markAllNotificationsAsRead(user.id);
      if (result && !result.error) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, is_read: true })),
        );
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (onNavigate) {
      if (notification.type === "leave") {
        onNavigate(notification.type, notification);
      } else if (notification.type === "announcement") {
        onNavigate("announcement", notification);
      }
    }

    // Close the notification dropdown
    setIsOpen(false);
  };

  const handleDismiss = (id) => {
    setDismissedNotifications((prev) => {
      const newSet = new Set([...prev, id]);
      localStorage.setItem(
        "dismissedNotifications",
        JSON.stringify([...newSet]),
      );
      return newSet;
    });
  };

  const visibleNotifications = notifications.filter(
    (n) => !dismissedNotifications.has(n.id),
  );

  const unreadCount = visibleNotifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "leave":
        return "📅";
      case "attendance":
        return "⏰";
      case "correction":
        return "🔧";
      case "announcement":
        return "📢";
      case "system":
        return "⚙️";
      default:
        return "📢";
    }
  };

  const getNotificationTitle = (type) => {
    switch (type) {
      case "leave":
        return "Leave Request";
      case "attendance":
        return "Attendance";
      case "correction":
        return "Correction Request";
      case "announcement":
        return "Announcement";
      case "system":
        return "System";
      default:
        return "Notification";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        {unreadCount > 0 ? (
          <BellIconSolid className="h-6 w-6 text-blue-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
                {visibleNotifications.length > 0 && (
                  <button
                    onClick={() => {
                      const allIds = visibleNotifications.map((n) => n.id);
                      setDismissedNotifications((prev) => {
                        const newSet = new Set([...prev, ...allIds]);
                        localStorage.setItem(
                          "dismissedNotifications",
                          JSON.stringify([...newSet]),
                        );
                        return newSet;
                      });
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.is_read ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Leave Request - Clean format */}
                      {notification.type === "leave" ? (
                        <div>
                          <span className="text-sm font-medium">
                            <span className="text-lg">
                              {getNotificationIcon(notification.type)}
                            </span>
                            Leave Request
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                      ) : (
                        /* Other notification types - keep original format */
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getNotificationIcon(notification.type)}
                            </span>
                            <h4
                              className={`font-medium ${
                                !notification.is_read
                                  ? "text-gray-900"
                                  : "text-gray-700"
                              }`}
                            >
                              {getNotificationTitle(notification.type)}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                      )}
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification.id);
                      }}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
