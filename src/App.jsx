// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

function GuestRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user) {
    const back = location.state?.from?.pathname || "/stations";
    return <Navigate to={back} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/homepage" replace />} />

          {/* PUBLIC */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login/>
              </GuestRoute>
            }
          />

          <Route
            path="/homepage"
            element={
              <GuestRoute>
                <Homepage/>
              </GuestRoute>
            }
          />

           <Route
            path="/services"
            element={
              <GuestRoute>
                <ServicePlans/>
              </GuestRoute>
            }
          />

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

          {/* FALLBACK nên về /login hoặc 404 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
