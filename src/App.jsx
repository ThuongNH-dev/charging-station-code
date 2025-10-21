// src/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import StationList from "./pages/c-station/StationList";
import StationDetail from "./pages/c-station/StationDetail";
import BookingPorts from "./pages/Booking/BookingPorts";
import PaymentPage from "./pages/payment/PaymentPage";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentFailure from "./pages/payment/PaymentFailure";
import ChargingProgress from "./components/charging/ChargingProgress";
import PaymentCharging from "./components/charging/PaymentCharging";
import PaymentInvoice from "./components/charging/PaymentInvoice";
import Login from "./components/login/Login";
import Homepage from "./pages/homepage/homepage";
import ServicePlans from "./components/subscription/ServicePlans";
import Unauthorized from "./pages/Unauthorized"; // ✅ thêm trang này (mục 2)
// import ChargerManager from "./pages/staff/ChargerManager";
// import SessionManager from "./pages/staff/SessionManager";
import BookingHistory from "./pages/booking/BookingHisory"; // ✅ thêm trang lịch sử đặt chỗ
import InvoicePage from "./components/charging/Invoice";
import StaffLayout from "./layouts/StaffLayout";
import AdminLayout from "./components/admin/layout/AdminLayout";
import StationManagement from "./components/admin/pages/StationManagement";
import UserManagement from "./components/admin/pages/UserManagement";
import Reports from "./components/admin/pages/Reports";

// Chuyển role thành path tương ứng

function roleToPath(role) {
  switch ((role || "").toLowerCase()) {
    case "customer":
      return "/stations";
    case "admin":
      return "/admin";
    case "staff":
      return "/staff";
    default:
      return "/homepage";
  }
}

function GuestRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return children;

  const from = location.state?.from?.pathname;
  const target = from || roleToPath(user.role);

  // ❗ Nếu đang ở đúng target rồi, không redirect nữa (tránh loop trắng trang)
  if (location.pathname === target) return children;

  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/homepage" replace />} />
      {/* PUBLIC */}
      <Route path="/homepage" element={<Homepage />} />{" "}
      {/* ✅ KHÔNG bọc GuestRoute */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route
        path="/services"
        element={
          <GuestRoute>
            <ServicePlans />
          </GuestRoute>
        }
      />
      <Route path="/unauthorized" element={<Unauthorized />} /> {/* ✅ */}
      {/* PROTECTED (Customer) */}
      <Route
        path="/stations"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <StationList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stations/:id"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <StationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stations/:id/chargers/:cid/book"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <BookingPorts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <PaymentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/success"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/failure"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <PaymentFailure />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/charging"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <PaymentCharging />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/invoice"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <PaymentInvoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/charging"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <ChargingProgress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/history"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <BookingHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <InvoicePage />
          </ProtectedRoute>
        }
      />
      {/*Staff */}
      <Route
        path="/staff/*"
        element={
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffLayout />
          </ProtectedRoute>
        }
      />
      {/* Admin
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={["Admin"]}>
          <AdminLayout/>
        </ProtectedRoute>
      } >
        <Route index element={<StationManagement />} />
        <Route path="stations" element={<StationManagement />} />

        <Route path="/admin/users" element={<UserManagement />} />
        </Route>  */}
      {/* <Route path="/admin" element={
        <ProtectedRoute allowedRoles={["Admin"]}>
          <AdminLayout/>
        </ProtectedRoute>
      } />

      <Route path="/admin/stations" element={
        <ProtectedRoute allowedRoles={["Admin"]}>
          <StationManagement/>
        </ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={["Admin"]}>
          <UserManagement/>
        </ProtectedRoute>
      } /> */}
      <Route
        path="admin"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* LƯU Ý: path con là tương đối, KHÔNG dùng "/admin/..." */}
        <Route index element={<StationManagement />} />
        <Route path="stations" element={<StationManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/homepage" replace />} />{" "}
      {/* ✅ */}
    </Routes>
  );
}
