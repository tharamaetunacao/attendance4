import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useLeaveStore } from '../../stores/leaveStore';
import toast from 'react-hot-toast';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

const LeaveHistory = () => {
  const { userProfile } = useAuthStore();
  const { leaveRequests, loading, error, fetchLeaveRequests, updateLeaveRequest, deleteLeaveRequest } = useLeaveStore();
  const [initialLoad, setInitialLoad] = useState(true);
  const [editingLeave, setEditingLeave] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLeaveId, setDeleteLeaveId] = useState(null);
  const [formData, setFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    const loadLeaveRequests = async () => {
      if (userProfile?.id && initialLoad) {
        try {
          await fetchLeaveRequests(userProfile.id, userProfile.role);
        } catch (err) {
          console.error('Error loading leave requests:', err);
        } finally {
          setInitialLoad(false);
        }
      }
    };

    loadLeaveRequests();
  }, [userProfile, fetchLeaveRequests, initialLoad]);

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLeaveType = (type) => {
    if (!type) return '-';
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ') + ' Leave';
  };

  const handleEdit = (leave) => {
    if (leave.status !== 'pending') {
      toast.error('Only pending leave requests can be edited');
      return;
    }
    setEditingLeave(leave);
    setFormData({
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      reason: leave.reason || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = (leaveId, status) => {
    if (status !== 'pending') {
      toast.error('Only pending leave requests can be deleted');
      return;
    }

    setDeleteLeaveId(leaveId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await deleteLeaveRequest(deleteLeaveId);
      if (error) {
        toast.error('Failed to delete leave request');
      } else {
        toast.success('Leave request deleted successfully');
        await fetchLeaveRequests(userProfile.id, userProfile.role);
      }
    } catch (err) {
      toast.error('Error deleting leave request');
    } finally {
      setShowDeleteModal(false);
      setDeleteLeaveId(null);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      const { error } = await updateLeaveRequest(editingLeave.id, formData);
      if (error) {
        toast.error('Failed to update leave request');
      } else {
        toast.success('Leave request updated successfully');
        setShowEditModal(false);
        setEditingLeave(null);
        await fetchLeaveRequests(userProfile.id, userProfile.role);
      }
    } catch (err) {
      toast.error('Error updating leave request');
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingLeave(null);
    setFormData({
      leave_type: '',
      start_date: '',
      end_date: '',
      reason: ''
    });
  };

  if (loading && initialLoad) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Leave History</h2>
        <div className="text-center py-8 text-gray-500">
          Loading leave history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Leave History</h2>
        <div className="text-center py-8 text-red-500">
          Error loading leave history: {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Leave History</h2>
        {leaveRequests && leaveRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Leave Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Start Date</th>
                  <th className="text-left py-3 px-4 font-semibold">End Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Reason</th>
                  <th className="text-left py-3 px-4 font-semibold">Submitted</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(leave => (
                  <tr key={leave.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{formatLeaveType(leave.leave_type)}</td>
                    <td className="py-3 px-4">{formatDate(leave.start_date)}</td>
                    <td className="py-3 px-4">{formatDate(leave.end_date)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={leave.reason}>
                      {leave.reason || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {formatDate(leave.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(leave)}
                          disabled={leave.status !== 'pending'}
                          className={`p-2 rounded-lg transition ${
                            leave.status === 'pending'
                              ? 'text-blue-600 hover:bg-blue-50'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                          title={leave.status === 'pending' ? 'Edit' : 'Only pending requests can be edited'}
                        >
                          <EditIcon fontSize="small" />
                        </button>
                        <button
                          onClick={() => handleDelete(leave.id, leave.status)}
                          disabled={leave.status !== 'pending'}
                          className={`p-2 rounded-lg transition ${
                            leave.status === 'pending'
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                          title={leave.status === 'pending' ? 'Delete' : 'Only pending requests can be deleted'}
                        >
                          <DeleteIcon fontSize="small" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No leave requests found
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit Leave Request</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Leave Type</label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select leave type</option>
                  <option value="sick">Sick Leave</option>
                  <option value="vacation">Vacation Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="emergency">Emergency Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Reason for leave..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-600">Confirm Delete</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteLeaveId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this leave request? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteLeaveId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeaveHistory;
