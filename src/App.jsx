// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StationList from "./pages/c-station/StationList";
import StationDetail from "./pages/c-station/StationDetail";
import BookingPorts from "./pages/Booking/BookingPorts";
import PaymentPage from "./pages/payment/PaymentPage";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentFailure from "./pages/payment/PaymentFailure";
import ChargingProgress from "./components/charging/ChargingProgress";
import PaymentCharging from "./components/charging/PaymentCharging";
import PaymentInvoice from "./components/charging/PaymentInvoice";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext"; 
import Login from "./components/login/Login";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<Navigate to="/stations" replace />} />
          <Route path="/login" element={<Login/>} />

          {/* PROTECTED */}
          <Route
            path="/stations"
            element={
              <ProtectedRoute>
                <StationList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stations/:id"
            element={
              <ProtectedRoute>
                <StationDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stations/:id/chargers/:cid/book"
            element={
              <ProtectedRoute>
                <BookingPorts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/failure"
            element={
              <ProtectedRoute>
                <PaymentFailure />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/charging"
            element={
              <ProtectedRoute>
                <PaymentCharging />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/invoice"
            element={
              <ProtectedRoute>
                <PaymentInvoice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charging"
            element={
              <ProtectedRoute>
                <ChargingProgress />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
