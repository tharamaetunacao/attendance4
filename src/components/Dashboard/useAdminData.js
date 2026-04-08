import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../config/supabase";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore";

export const useAdminData = () => {
  const { user, setUser, setUserProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalDepartments: 0, presentToday: 0, absentToday: 0 });
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: usersData }, { data: deptData }, { data: attendanceToday }] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("departments").select("*"),
        supabase.from("attendance").select("*").gte("check_in_time", new Date().toISOString().split("T")[0]).lt("check_in_time", new Date(Date.now() + 86400000).toISOString().split("T")[0]),
      ]);
      setStats({ totalUsers: usersData?.length || 0, totalDepartments: deptData?.length || 0, presentToday: attendanceToday?.filter((a) => a.check_out_time).length || 0, absentToday: Math.max(0, (usersData?.length || 0) - (attendanceToday?.length || 0)) });
    } catch (error) { toast.error("Failed to load dashboard data"); } finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("users").select("*, department:departments(name)");
      if (error) throw error;
      setUsers(data || []);
    } catch (error) { toast.error("Failed to fetch users"); } finally { setLoading(false); }
  }, []);

  const fetchManagers = useCallback(async () => {
    const { data } = await supabase.from("users").select("*").in("role", ["manager", "admin"]);
    setManagers(data || []);
  }, []);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("departments").select("*");
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) { toast.error("Failed to fetch departments"); } finally { setLoading(false); }
  }, []);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("holidays").select("*");
      if (error) throw error;
      setHolidays(data || []);
    } catch (error) { toast.error("Failed to fetch holidays"); } finally { setLoading(false); }
  }, []);

  const fetchAttendanceStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("attendance").select("*, users(full_name, email)").order("check_in_time", { ascending: false }).limit(20);
      if (error) throw error;
      setAttendanceStats(data || []);
    } catch (error) { toast.error("Failed to fetch attendance stats"); } finally { setLoading(false); }
  }, []);

  const handleAddUser = async (formData, editingUser, managersList) => {
    if (!formData.email.endsWith("@rlb.com")) return { error: "Only @rlb.com email addresses are allowed" };
    if (!editingUser && (!formData.password || formData.password !== formData.confirmPassword)) return { error: "Passwords do not match" };
    if (formData.role !== "manager" && !formData.manager_id) return { error: "Manager selection is required for this role" };
    setLoading(true);
    try {
      // Get current user's organization
      let organizationId = null;
      try {
        const { data: orgData } = await supabase.from("organizations").select("id").limit(1).single();
        organizationId = orgData?.id || null;
      } catch (orgError) {
        console.log("No organization found, proceeding without org_id");
      }

      if (!editingUser) {
        // Create new user with signUp - this creates auth user but doesn't switch current user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name,
              role: formData.role,
              organization_id: organizationId,
              department_id: formData.department_id || null,
              manager_id: formData.manager_id || null
            }
          }
        });

        if (authError || !authData?.user) {
          throw new Error(authError?.message || "User creation failed");
        }

        console.log("New user created with ID:", authData.user.id);

        // Try to create user profile record
        try {
          await supabase.from("users").upsert([{
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            organization_id: organizationId,
            department_id: formData.department_id || null,
            manager_id: formData.manager_id || null
          }], { onConflict: "id" });
        } catch (dbError) {
          console.log("Note: User record sync -", dbError.message);
        }

        await fetchUsers();
        return { success: true, message: `Employee "${formData.full_name}" created successfully!` };
      } else {
        // Update existing user
        const { error: updateError } = await supabase.from("users").update({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          department_id: formData.department_id || null,
          manager_id: formData.manager_id || null
        }).eq("id", editingUser.id);

        if (updateError) throw updateError;
        await fetchUsers();
        return { success: true, message: `Employee "${formData.full_name}" updated successfully!` };
      }
    } catch (error) {
      console.error("User creation error:", error);
      return { error: error.message || "Failed to process user" };
    } finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId) => {
    setLoading(true);
    try {
      const { error: dbError } = await supabase.from("users").delete().eq("id", userId);
      if (dbError) throw dbError;
      await fetchUsers();
      return { success: true, message: "User deleted successfully!" };
    } catch (error) { return { error: "Failed to delete user" }; } finally { setLoading(false); }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId);
      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (error) { return { error: "Failed to update user role" }; }
  };

  const handleAddDepartment = async (deptData) => {
    if (!deptData.name) return { error: "Department name required" };
    setLoading(true);
    try {
      // Get current user's organization
      let organizationId = null;
      try {
        const { data: orgData } = await supabase.from("organizations").select("id").limit(1).single();
        organizationId = orgData?.id || null;
      } catch (orgError) {
        console.log("No organization found, proceeding without org_id");
      }

      console.log("Adding department:", { name: deptData.name, manager_id: deptData.manager_id || null, organization_id: organizationId });

      const { data, error } = await supabase.from("departments").insert([{
        name: deptData.name,
        manager_id: deptData.manager_id || null,
        organization_id: organizationId
      }]).select();

      if (error) {
        console.error("Department insert error:", error);
        throw error;
      }

      console.log("Department created:", data);
      await fetchDepartments();
      return { success: true, message: "Department added successfully" };
    } catch (error) {
      console.error("Department error:", error);
      return { error: error.message?.includes("row-level security") ? "Permission denied: Check RLS policies" : "Failed to add department: " + error.message };
    } finally { setLoading(false); }
  };

  const handleDeleteDepartment = async (deptId) => {
    try {
      console.log("Deleting department:", deptId);
      const { error } = await supabase.from("departments").delete().eq("id", deptId);
      if (error) {
        console.error("Department delete error:", error);
        throw error;
      }
      await fetchDepartments();
      return { success: true, message: "Department deleted" };
    } catch (error) {
      console.error("Delete department error:", error);
      return { error: "Failed to delete department: " + error.message };
    }
  };

  const handleAddHoliday = async (holidayData) => {
    if (!holidayData.name || !holidayData.date) return { error: "Holiday name and date required" };
    setLoading(true);
    try {
      console.log("Adding holiday:", holidayData);
      const { data, error } = await supabase.from("holidays").insert([{
        name: holidayData.name,
        date: holidayData.date,
        is_recurring: holidayData.is_recurring,
        recurring_type: holidayData.recurring_type || null
      }]).select();

      if (error) {
        console.error("Holiday insert error:", error);
        throw error;
      }

      console.log("Holiday created:", data);
      await fetchHolidays();
      return { success: true, message: "Holiday added" };
    } catch (error) {
      console.error("Holiday error:", error);
      return { error: "Failed to add holiday: " + error.message };
    } finally { setLoading(false); }
  };

  const handleDeleteHoliday = async (holidayId) => {
    try {
      console.log("Deleting holiday:", holidayId);
      const { error } = await supabase.from("holidays").delete().eq("id", holidayId);
      if (error) {
        console.error("Holiday delete error:", error);
        throw error;
      }
      await fetchHolidays();
      return { success: true, message: "Holiday deleted" };
    } catch (error) {
      console.error("Delete holiday error:", error);
      return { error: "Failed to delete holiday: " + error.message };
    }
  };

  const createAnnouncement = async (title, content) => {
    setLoading(true);
    try {
      console.log("Creating announcement:", { title, content, created_by: user?.id });

      // First try without created_by if RLS blocks it
      let { data, error } = await supabase.from("announcements").insert([{
        title,
        content,
        target_role: "all",
        created_by: user?.id
      }]).select();

      if (error) {
        console.error("Announcement insert error:", error);
        // Try without created_by
        const { data: retryData, error: retryError } = await supabase.from("announcements").insert([{
          title,
          content,
          target_role: "all"
        }]).select();

        if (retryError) {
          console.error("Retry announcement error:", retryError);
          throw retryError;
        }

        console.log("Announcement created (no created_by):", retryData);
        return { success: true, message: "Announcement created successfully" };
      }

      console.log("Announcement created:", data);
      return { success: true, message: "Announcement created successfully" };
    } catch (error) {
      console.error("Create announcement error:", error);
      return { error: "Failed to create announcement: " + error.message };
    } finally { setLoading(false); }
  };

  const managerMap = useMemo(() => Object.fromEntries(managers.map((m) => [m.id, m.full_name])), [managers]);
  const departmentMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.name])), [departments]);
  const getManagerName = (managerId) => managerMap[managerId] || "-";
  const getDepartmentName = (departmentId) => departmentMap[departmentId] || "-";

  return { loading, stats, users, managers, departments, holidays, attendanceStats, fetchDashboardData, fetchUsers, fetchManagers, fetchDepartments, fetchHolidays, fetchAttendanceStats, handleAddUser, handleDeleteUser, handleUpdateUserRole, handleAddDepartment, handleDeleteDepartment, handleAddHoliday, handleDeleteHoliday, createAnnouncement, getManagerName, getDepartmentName };
};
