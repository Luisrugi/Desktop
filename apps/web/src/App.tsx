import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { TimeTracking } from "./pages/TimeTracking";
import { Clients } from "./pages/Clients";
import { Projects } from "./pages/Projects";
import { Invoices } from "./pages/Invoices";
import { Reports } from "./pages/Reports";
import { Employees } from "./pages/Employees";
import { Absences } from "./pages/Absences";
import { Suppliers } from "./pages/Suppliers";
import { Articles } from "./pages/Articles";
import { PurchaseOrders } from "./pages/PurchaseOrders";
import { Accounting } from "./pages/Accounting";
import { Bank } from "./pages/Bank";
import { Payroll } from "./pages/Payroll";
import { Billing } from "./pages/Billing";

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Lädt…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/time-tracking" element={<TimeTracking />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/absences" element={<Absences />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/bank" element={<Bank />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/billing" element={<Billing />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
