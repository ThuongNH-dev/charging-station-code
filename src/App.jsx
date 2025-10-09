// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ✅ ĐÚNG: cả List & Detail đều nằm trong components/station
import StationList from "./pages/c-station/StationList";
import StationDetail from "./pages/c-station/StationDetail";

// ✅ BookingPorts nằm trong pages/Booking
import BookingPorts from "./pages/Booking/BookingPorts";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/stations" replace />} />
        <Route path="/stations" element={<StationList />} />
        <Route path="/stations/:id" element={<StationDetail />} />
        <Route path="/stations/:id/chargers/:cid/book" element={<BookingPorts />} />
      </Routes>
    </BrowserRouter>
  );
}
