import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/login/LoginPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { ClassesPage } from "../pages/classes/ClassesPage";
import { ClassRosterPage } from "../pages/classes/ClassRosterPage";
import { StudentDetailPage } from "../pages/students/StudentDetailPage";
import { GradesEntryPage } from "../pages/grades/GradesEntryPage";
import { ReportCardPage } from "../pages/report-card/ReportCardPage";
import { TimetablePage } from "../pages/timetable/TimetablePage";
import { AttendancePage } from "../pages/attendance/AttendancePage";
import { ClassLogPage } from "../pages/classlog/ClassLogPage";
import { MessagingPage } from "../pages/messaging/MessagingPage";
import { AnnouncementsPage } from "../pages/announcements/AnnouncementsPage";
import { AccountsPage } from "../pages/accounts/AccountsPage";
import { ReportsPage } from "../pages/reports/ReportsPage";
import { TuitionPage } from "../pages/tuition/TuitionPage";
import { PayrollPage } from "../pages/payroll/PayrollPage";
import { PayslipPage } from "../pages/payroll/PayslipPage";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AdminProtectedRoute } from "../auth/AdminProtectedRoute";
import { AdminLoginPage } from "../pages/admin/AdminLoginPage";
import { AdminEcolesPage } from "../pages/admin/AdminEcolesPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute><ClassesPage /></ProtectedRoute>} />
      <Route path="/classes/:id" element={<ProtectedRoute><ClassRosterPage /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute><StudentDetailPage /></ProtectedRoute>} />
      <Route path="/students/:id/bulletin" element={<ProtectedRoute><ReportCardPage /></ProtectedRoute>} />
      <Route path="/grades" element={<ProtectedRoute><GradesEntryPage /></ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute><TimetablePage /></ProtectedRoute>} />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute allow={["DIRECTION", "CENSEUR", "ENSEIGNANT"]}>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route path="/class-log" element={<ProtectedRoute><ClassLogPage /></ProtectedRoute>} />
      <Route path="/messaging" element={<ProtectedRoute><MessagingPage /></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
      <Route
        path="/accounts"
        element={
          <ProtectedRoute allow={["DIRECTION"]}>
            <AccountsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route
        path="/tuition"
        element={
          <ProtectedRoute allow={["DIRECTION", "SECRETAIRE"]}>
            <TuitionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <ProtectedRoute allow={["DIRECTION", "SECRETAIRE"]}>
            <PayrollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/:teacherId"
        element={
          <ProtectedRoute allow={["DIRECTION", "SECRETAIRE"]}>
            <PayslipPage />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin/ecoles"
        element={
          <AdminProtectedRoute>
            <AdminEcolesPage />
          </AdminProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
