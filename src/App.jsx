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
import Unauthorized from "./pages/Unauthorized";
import BookingHistory from "./pages/booking/BookingHisory";
import InvoicePage from "./components/charging/Invoice";
import StaffLayout from "./layouts/StaffLayout";
import StaffPaymentSuccess from "./pages/staff/StaffPaymentSuccess";
import AdminLayout from "./components/admin/layout/AdminLayout";
import StationPage from "./components/admin/pages/station/StationPage";
import StationDetailPage from "./components/admin/pages/station/StationDetailPage";

import UserManagement from "./components/admin/pages/UserManagement/UserManagement";
import RegisterSelect from "./pages/Register/RegisterSelect";
import PersonalRegister from "./pages/Register/PersonalRegister";
import BusinessRegister from "./pages/Register/BusinessRegister";
import BusinessPayment from "./pages/Register/BusinessPayment";
import BusinessSuccess from "./pages/Register/BusinessSuccess";
import InvoiceSummary from "./pages/payment/InvoiceSummary";
import InvoiceDetail from "./pages/payment/InvoiceDetail";
import ResourceManagement from "./pages/company/ReManagerment";
import NotFound from "./pages/NotFound";
import ReManagerDetail from "./pages/company/ReManagerDetail";
import Reports from "./components/admin/pages/Reports/Reports";
import ChargingSessionStart from "./components/charging/ChargingSessionStart";

import UpdateInfo from "./components/updateProfilePerson/UpdateInfo";
import VehicleInfo from "./components/updateProfilePerson/VehicleInfo";

import ChangePassword from "./components/updateProfilePerson/ChangePassword";
import EnterpriseInfo from "./components/updateProfileBusiness/EnterpriseInfo";
import MonthlyStats from "./pages/company/MonthlyStats";
import Notification from "./pages/notification/Notification";

// Chuyển role thành path tương ứng

import StaffInfo from "./pages/updateProfileStaff/StaffInfo";
import AdminInfo from "./pages/updateProfileAdmin/AdminInfo";
import ForgotPassword from "./pages/password/ForgotPassword";
import ResetPassword from "./pages/password/ResetPassword";
import ManageSubscriptions from "./components/subscription/ManageSubcription";
import Dashboard from "./components/admin/pages/dashboard/Dashboard";
import AdminNotificationsSendPage from "./components/admin/pages/AdminNotificationsSendPage";
import PricingRulesPage from "./components/admin/pages/pricing/PricingRulesPage";
import AdminIncidentReports from "./components/admin/pages/Reports/AdminIncidentReports";
import InfoDriver from "./pages/enterInfo/InfoDriver";
import RegisterInfo from "./layouts/RegisterInfo";
import MyFeedbacks from "./pages/feedback/MyFeedbacks";

function roleToPath(role) {
  switch ((role || "").toLowerCase()) {
    case "customer":
      return "/stations";
    case "admin":
      return "/admin/dashboard";
    case "staff":
      return "/staff";
    case "company":
      return "/company";
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
  if (location.pathname === target) return children;

  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/homepage" replace />} />
      {/* PUBLIC */}
      <Route path="/homepage" element={<Homepage />} />
      <Route path="/register/select" element={<RegisterSelect />} />
      <Route path="/register/personal" element={<PersonalRegister />} />
      <Route path="/register/business" element={<BusinessRegister />} />
      <Route path="/register/payment" element={<BusinessPayment />} />
      <Route path="/register/success" element={<BusinessSuccess />} />
      {/* các route khác của bạn */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* PUBLIC: Forgot/Reset password */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Hỗ trợ cả dạng có token trên path */}
      <Route path="/reset-password/:token" element={<ResetPassword />} />

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
          <ProtectedRoute allowedRoles={["Customer", "Company"]}>
            <PaymentPage />
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
          <ProtectedRoute allowedRoles={["Customer", "Company"]}>
            <PaymentInvoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/success"
        element={
          <ProtectedRoute allowedRoles={["Customer", "Staff"]}>
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/charging/start"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <ChargingSessionStart />
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

      {/* Invoices & Services */}
      <Route
        path="/invoice"
        element={
          <ProtectedRoute allowedRoles={["Customer", "Company"]}>
            <InvoicePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoiceSummary"
        element={
          <ProtectedRoute allowedRoles={["Customer", "Company", "Staff"]}>
            <InvoiceSummary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoiceDetail/:invoiceId"
        element={
          <ProtectedRoute allowedRoles={["Customer", "Company", "Staff"]}>
            <InvoiceDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute allowedRoles={["Customer", "Company"]}>
            <ServicePlans />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-feedback"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <MyFeedbacks/>
          </ProtectedRoute>
        }
      />

      {/* ✅ Profile (Admin) */}
      <Route
        path="/profile/admin-info"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminInfo />
          </ProtectedRoute>
        }
      />

      {/* ✅ Profile (Company) – HÌNH 2 */}
      <Route
        path="/profile/enterprise-info"
        element={
          <ProtectedRoute allowedRoles={["Company"]}>
            <EnterpriseInfo />
          </ProtectedRoute>
        }
      />

      {/* ✅ Profile (Staff) */}
      <Route
        path="/profile/staff-info"
        element={
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffInfo />
          </ProtectedRoute>
        }
      />

      {/* ✅ Profile (Customer) – HÌNH 3 */}
      <Route
        path="/profile/update-info"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <UpdateInfo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/vehicle-info"
        element={
          <ProtectedRoute allowedRoles={["Customer", "Company"]}>
            <VehicleInfo />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile/change-password"
        element={
          <ProtectedRoute
            allowedRoles={["Customer", "Company", "Staff", "Admin"]}
          >
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* Company */}
      <Route
        path="/company"
        element={
          <ProtectedRoute allowedRoles={["Company"]}>
            <ResourceManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/vehicles/:vehicleId/sessions"
        element={
          <ProtectedRoute allowedRoles={["Company"]}>
            <ReManagerDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/reports"
        element={
          <ProtectedRoute allowedRoles={["Company", "Customer"]}>
            <MonthlyStats />
          </ProtectedRoute>
        }
      />

      {/*Staff */}
      {/* ✅ Đặt TRƯỚC để không bị /staff/* catch */}
      <Route
        path="/staff/payment-success"
        element={
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffPaymentSuccess />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/*"
        element={
          <ProtectedRoute allowedRoles={["Staff"]}>
            <StaffLayout />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="stations" element={<StationPage />} />
        <Route path="stations/:stationId" element={<StationDetailPage />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="reports" element={<Reports />} />
        <Route path="incident-reports" element={<AdminIncidentReports />} />

        <Route path="pricing-rules" element={<PricingRulesPage />} />
        <Route
          path="notifications/send"
          element={<AdminNotificationsSendPage />}
        />
      </Route>
      {/*Notification */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={["Customer", "Company"]}>
            <Notification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manageSubcription"
        element={
          <ProtectedRoute allowedRoles={["Customer", "Company"]}>
            <ManageSubscriptions />
          </ProtectedRoute>
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
