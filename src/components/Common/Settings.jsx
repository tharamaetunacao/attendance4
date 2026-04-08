import React, { useState } from "react";
import { supabase } from "../../config/supabase";
import { useAuthStore } from "../../stores/authStore";
import toast from "react-hot-toast";
import SettingsIcon from "@mui/icons-material/Settings";
import CloseIcon from "@mui/icons-material/Close";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const Settings = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  if (!isOpen) return null;

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return "Password must be at least 8 characters long";
    }
    if (!hasUpperCase) {
      return "Password must contain at least one uppercase letter";
    }
    if (!hasLowerCase) {
      return "Password must contain at least one lowercase letter";
    }
    if (!hasNumbers) {
      return "Password must contain at least one number";
    }
    if (!hasSpecialChar) {
      return "Password must contain at least one special character (!@#$%^&*())";
    }
    return null;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    // Validate password complexity
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Note: Supabase's updateUser doesn't require current password verification
      // The user must be authenticated, which they are since they're in the app
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        // If error is about re-authentication required, try re-auth flow
        if (error.message.includes("re-authentication")) {
          // Try to re-authenticate with current password
          const { error: reauthError } = await supabase.auth.signInWithPassword(
            {
              email: user?.email,
              password: currentPassword,
            },
          );

          if (reauthError) {
            setPasswordError("Current password is incorrect");
            setLoading(false);
            return;
          }

          // Try update again after re-auth
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (updateError) {
            setPasswordError(updateError.message);
          } else {
            setPasswordSuccess(true);
            setPasswordForm({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
            setTimeout(() => {
              setShowPasswordChange(false);
              setPasswordSuccess(false);
            }, 2000);
          }
        } else {
          setPasswordError(error.message);
        }
      } else {
        setPasswordSuccess(true);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => {
          setShowPasswordChange(false);
          setPasswordSuccess(false);
        }, 2000);
      }
    } catch (err) {
      setPasswordError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError("");
    setPasswordSuccess(false);
    setShowPasswordChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden bg-white">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={() => {
              onClose();
              resetPasswordForm();
            }}
            className="p-1 hover:bg-gray-100 rounded-full transition text-gray-500"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 text-gray-700">
          {/* Password Change Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <LockIcon className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Change Password
              </h3>
            </div>

            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      className="input-field pr-10"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          current: !showPasswords.current,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPasswords.current ? (
                        <VisibilityOffIcon className="w-5 h-5" />
                      ) : (
                        <VisibilityIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      className="input-field pr-10"
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          new: !showPasswords.new,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPasswords.new ? (
                        <VisibilityOffIcon className="w-5 h-5" />
                      ) : (
                        <VisibilityIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs mt-1 text-gray-500">
                    Min 8 characters, uppercase, lowercase, number, special
                    character
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="input-field pr-10"
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          confirm: !showPasswords.confirm,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPasswords.confirm ? (
                        <VisibilityOffIcon className="w-5 h-5" />
                      ) : (
                        <VisibilityIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {passwordError && (
                  <div className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600">
                    {passwordError}
                  </div>
                )}

                {/* Success Message */}
                {passwordSuccess && (
                  <div className="p-3 rounded-lg text-sm bg-green-50 border border-green-200 text-green-600">
                    Password updated successfully!
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetPasswordForm}
                    className="flex-1 px-4 py-2 rounded-lg transition-colors font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
