import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const { signup, loading } = useAuthStore();
  const [step, setStep] = useState(1); // Step 1: Role, Step 2: Credentials, Step 3: Manager Selection
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [organizationUUID, setOrganizationUUID] = useState(null); // Store the UUID
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    managerEmail: '',
    role: '', // 'admin', 'manager', or 'employee'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!formData.role) {
      toast.error('Please select a role');
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Skip to step 3 without organization lookup
    setStep(3);
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();

    // Manager is optional - only required for employees if managers exist
    if (formData.role === 'employee' && managers.length > 0 && !formData.managerEmail) {
      toast.error('Please select your manager');
      return;
    }

    try {
      let selectedManager = null;
      if (formData.role === 'employee' && formData.managerEmail) {
        selectedManager = managers.find(m => m.email === formData.managerEmail);
        if (!selectedManager) {
          toast.error('Invalid manager selection');
          return;
        }
      }

      console.log('Starting signup with:', {
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        managerId: selectedManager?.id || null,
        departmentId: selectedManager?.department_id || null,
      });

      // Pass manager_id and department_id to signup (can be null)
      await signup(
        formData.email,
        formData.password,
        formData.fullName,
        null, // organizationUUID - will be set during first login or admin setup
        selectedManager?.id || null,
        selectedManager?.department_id || null,
        formData.role
      );
      
      toast.success('Registration successful! Please check your email.');
      navigate('/login');
    } catch (error) {
      console.error('Signup error details:', error);
      toast.error(error.message || 'Registration failed');
    }
  };

  const handleSubmit = step === 1 ? handleStep1Submit : (step === 2 ? handleStep2Submit : handleStep3Submit);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">AttendanceHub</h1>
          <p className="text-gray-600">Create Your Account</p>
          <p className="text-sm text-gray-500 mt-2">Step {step} of 3</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            // Step 1: Role Selection
            <>
              <div className="space-y-3">
                <p className="font-semibold text-gray-700 mb-4">Select Your Role</p>
                
                <label className="flex items-center p-4 border-2 border-gray-200 rounded cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition" htmlFor="role-admin">
                  <input
                    id="role-admin"
                    type="radio"
                    name="role"
                    value="admin"
                    checked={formData.role === 'admin'}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <p className="font-semibold text-gray-800">Administrator</p>
                    <p className="text-xs text-gray-600">Manage organization, users, and system settings</p>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-200 rounded cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition" htmlFor="role-manager">
                  <input
                    id="role-manager"
                    type="radio"
                    name="role"
                    value="manager"
                    checked={formData.role === 'manager'}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <p className="font-semibold text-gray-800">Manager</p>
                    <p className="text-xs text-gray-600">Supervise team, approve leaves, and monitor attendance</p>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-200 rounded cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition" htmlFor="role-employee">
                  <input
                    id="role-employee"
                    type="radio"
                    name="role"
                    value="employee"
                    checked={formData.role === 'employee'}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <p className="font-semibold text-gray-800">Employee</p>
                    <p className="text-xs text-gray-600">Check in/out, view attendance, and request leaves</p>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={!formData.role}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                Continue →
              </button>
            </>
          ) : step === 2 ? (
            // Step 2: Account Credentials
            <>
              <div className="bg-blue-50 p-3 rounded mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Role:</strong> {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
                </p>
              </div>
              <div>
                <label className="label-text">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="label-text">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="your.email@company.com"
                  required
                />
              </div>

              <div>
                <label className="label-text">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="label-text">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loadingManagers}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loadingManagers ? 'Loading...' : 'Continue →'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold py-2 px-4 rounded transition"
                >
                  ← Back
                </button>
              </div>
            </>
          ) : (
            // Step 3: Manager Selection (for employees only) or Confirmation
            <>
              <div className="bg-blue-50 p-4 rounded mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Account Details:</strong><br/>
                  Email: {formData.email}<br/>
                  Name: {formData.fullName}<br/>
                  Role: {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
                </p>
              </div>

              {formData.role === 'employee' ? (
                <>
                  {managers.length > 0 ? (
                    <div>
                      <label className="label-text">Select Your Manager</label>
                      <select
                        name="managerEmail"
                        value={formData.managerEmail}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="">-- Choose Your Manager --</option>
                        {managers.map(manager => (
                          <option key={manager.id} value={manager.email}>
                            {manager.full_name} ({manager.email})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        Your manager will have access to approve your leave requests and monitor your attendance.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-orange-50 p-4 rounded mb-4 border border-orange-200">
                      <p className="text-sm text-orange-800">
                        <strong>⚠️ No Managers Available</strong><br/>
                        Your organization doesn't have any managers yet. You can proceed with registration, and an admin will assign a manager to you later.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-green-50 p-4 rounded mb-4 border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>✓ Ready to Complete Registration</strong><br/>
                    You'll receive a verification email shortly. Please confirm your email to activate your account.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold py-2 px-4 rounded transition"
                >
                  ← Back
                </button>
              </div>
            </>
          )}
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login-portal" className="text-blue-600 hover:underline font-semibold">
              Login here
            </Link>
          </p>
          <button
            onClick={() => navigate('/login-portal')}
            className="w-full text-gray-600 hover:text-gray-800 font-semibold py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
          >
            ← Back to Portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
