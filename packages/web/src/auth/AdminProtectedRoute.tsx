import { Navigate } from "react-router-dom";
import { useAdminSession } from "./admin-session-context";

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin } = useAdminSession();

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
