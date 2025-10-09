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



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/stations" replace />} />
        <Route path="/stations" element={<StationList />} />
        <Route path="/stations/:id" element={<StationDetail />} />
        <Route path="/stations/:id/chargers/:cid/book" element={<BookingPorts />} />

        {/* Thanh toán */}
        <Route path="/payment" element={<PaymentPage/>} />
        <Route path="/payment/success" element={<PaymentSuccess/>} />
        <Route path="/charging" element={<ChargingProgress/>} />  {/* ✅ thêm */}
        <Route path="/payment/failure" element={<PaymentFailure/>} />
        <Route path="/payment/charging" element={<PaymentCharging/>} />
        <Route path="/payment/invoice" element={<PaymentInvoice/>} />
      </Routes>
    </BrowserRouter>
  );
}
