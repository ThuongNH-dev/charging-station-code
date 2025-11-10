import { useAuth } from "../../context/AuthContext";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import ChargersCard from "../../components/station/ChargersCard";
import ChargersGun from "../../components/station/ChargersGun";
import FeedbackSection from "../../components/feedback/FeedbackSection";
import "./BookingPorts.css";
import { fetchJSON, fetchAuthJSON, getToken, getApiBase } from "../../utils/api";
const API_BASE = getApiBase();

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const VI_TIME_RANGE = { Low: "Thấp điểm", Normal: "Bình thường", Peak: "Cao điểm" };
const viTimeRange = (tr) => VI_TIME_RANGE[tr] || tr;

// ---------- Helpers nhận diện loại xe ----------
function isCarType(t = "") {
  const s = String(t).toLowerCase();
  return ["car", "oto", "ô tô", "ôto", "auto", "four-wheeler"].some(k => s.includes(k));
}
function isBikeType(t = "") {
  const s = String(t).toLowerCase();
  return ["bike", "xe máy", "xemay", "motor", "scooter", "moped", "two-wheeler"].some(k => s.includes(k));
}

function normalizeStation(s = {}) {
  return {
    id: s.id ?? s.stationId ?? s.StationId,
    name: s.name ?? s.stationName ?? s.StationName ?? "",
    address: s.address ?? s.Address ?? "",
    city: s.city ?? s.City ?? "",
    lat: parseFloat(s.lat ?? s.latitude ?? s.Latitude),
    lng: parseFloat(s.lng ?? s.longitude ?? s.Longitude),
    imageUrl: s.imageUrl ?? s.ImageUrl ?? "",
    status: s.status ?? s.Status ?? "Active",
  };
}

function normalizeCharger(c = {}) {
  const id = c.id ?? c.chargerId ?? c.ChargerId;
  const p = c.powerKw ?? c.PowerKW ?? c.power ?? c.Power;
  const powerText = (p !== undefined && p !== null && String(p) !== "") ? `${p} kW` : "";

  const rawStatus = (c.status ?? c.Status ?? "").toString().toLowerCase();
  const status =
    rawStatus.includes("available") ? "available" :
      rawStatus.includes("busy") ? "busy" :
        rawStatus.includes("maint") ? "maintenance" :
          rawStatus || "unknown";
  const typeRaw = c.type ?? c.Type ?? "";
  return {
    id,
    stationId: c.stationId ?? c.StationId,
    title: c.code ?? c.Code ?? `Trụ #${id}`,
    // typeRaw: AC/DC hoặc speed (raw); typeStd: đã chuẩn hóa AC/DC
    typeRaw,
    typeStd: normTypeACDC(typeRaw),
    connector: c.connector ?? c.Connector ?? "", // connector thực từ BE nếu có
    power: powerText,
    powerKw: (p != null && p !== "") ? Number(p) : undefined,
    status,
    price: c.price ?? c.Price ?? "",
    imageUrl: c.imageUrl ?? c.ImageUrl ?? "",
  };
}

function normalizePort(p = {}) {
  const id = p.id ?? p.PortId ?? p.portId;
  const code = p.code ?? p.Code ?? `P-${id}`;
  const connector = p.connector ?? p.connectorType ?? p.ConnectorType ?? p.Connector ?? "";
  const pw = p.power ?? p.maxPowerKW ?? p.MaxPowerKW;
  const powerText = (pw !== undefined && pw !== null && String(pw) !== "") ? `${pw} kW` : "";

  const rawStatus = (p.status ?? p.Status ?? "").toString().toLowerCase();
  const status =
    rawStatus.includes("available") || rawStatus === "1" ? "available" :
      rawStatus.includes("busy") || rawStatus === "2" ? "busy" :
        rawStatus.includes("inactive") || rawStatus === "0" ? "inactive" :
          rawStatus.includes("maint") ? "maintenance" :
            "unknown";

  return {
    id,
    name: code,
    connector,
    power: powerText,
    status,
    chargerId: p.chargerId ?? p.ChargerId,
    _raw: p,
  };
}

// ===== Helper: chọn bookingId từ nhiều kiểu response khác nhau
function pickBookingId(created) {
  if (!created) return null;

  const keys = ["bookingId", "BookingId", "bookingID", "BookingID", "id", "Id", "ID"];

  for (const k of keys) {
    if (created?.[k] != null && created?.[k] !== "") return created[k];
  }

  const nests = ["data", "result", "value", "item", "payload", "booking"];
  for (const n of nests) {
    const obj = created?.[n];
    if (obj && typeof obj === "object") {
      for (const k of keys) {
        if (obj?.[k] != null && obj?.[k] !== "") return obj[k];
      }
    }
  }

  if (Array.isArray(created) && created.length) {
    const first = created[0];
    for (const k of keys) {
      if (first?.[k] != null && first?.[k] !== "") return first[k];
    }
  }

  if (typeof created === "string" && created.trim()) return created.trim();

  return null;
}

// ===== Helpers lấy items / chọn booking vừa tạo =====
function extractItems(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (Array.isArray(obj.items)) return obj.items;
  if (obj.data && Array.isArray(obj.data.items)) return obj.data.items;
  return [];
}

function pickJustCreatedFromList(items, { customerId, portId, startLocal }) {
  if (!Array.isArray(items) || !items.length) return null;
  const wantStartMs = +startLocal;

  const candidates = items.filter(b =>
    String(b.customerId ?? b.CustomerId) === String(customerId) &&
    String(b.portId ?? b.PortId) === String(portId)
  );

  if (!candidates.length) return null;

  let best = null, bestDiff = Infinity;
  for (const b of candidates) {
    const st = b.startTime ?? b.StartTime ?? b.start ?? b.Start ?? "";
    const t = st ? Date.parse(st) : NaN;
    const diff = Number.isFinite(t) ? Math.abs(t - wantStartMs) : 1e15;
    if (diff < bestDiff) { best = b; bestDiff = diff; }
  }
  return (best && bestDiff <= 5 * 60 * 1000) ? best : null;
}

const idFromItem = (b) => (b?.bookingId ?? b?.BookingId ?? b?.id ?? b?.Id ?? null);

// ====== TZ helpers & formatting ======
function pad(n) { return String(n).padStart(2, "0"); }
function tzOffset(dt) {
  const off = -dt.getTimezoneOffset(); // phút so với UTC
  const sign = off >= 0 ? "+" : "-";
  const hh = pad(Math.floor(Math.abs(off) / 60));
  const mm = pad(Math.abs(off) % 60);
  return `${sign}${hh}:${mm}`;
}
// ISO local có offset (KHÔNG phải Z)
function fmtLocal(dt) {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
    + `T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}${tzOffset(dt)}`;
}

// ISO UTC có 'Z' (không mili giây) — dùng để gửi lên BE
function fmtUtcZ(dt) {
  const z = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return z.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// ====== BOOKING CONFLICT DETECTION ======
function normalizeBooking(b = {}) {
  return {
    id: b.id ?? b.bookingId ?? b.BookingId,
    portId: b.portId ?? b.PortId,
    startTime: b.startTime ?? b.StartTime ?? b.start ?? b.Start,
    endTime: b.endTime ?? b.EndTime ?? b.end ?? b.End,
    status: b.status ?? b.Status ?? "Unknown",
    customerId: b.customerId ?? b.CustomerId,
  };
}

function checkTimeConflict(newStart, newEnd, existingBookings) {
  const newStartMs = newStart.getTime();
  const newEndMs = newEnd.getTime();

  for (const booking of existingBookings) {
    const existingStart = new Date(booking.startTime);
    const existingEnd = new Date(booking.endTime);

    // Kiểm tra overlap: (newStart < existingEnd) && (newEnd > existingStart)
    if (newStartMs < existingEnd.getTime() && newEndMs > existingStart.getTime()) {
      return {
        conflict: true,
        conflictingBooking: booking,
        message: `Khung giờ này đã được đặt từ ${existingStart.toLocaleString("vi-VN")} đến ${existingEnd.toLocaleString("vi-VN")}`
      };
    }
  }

  return { conflict: false };
}

const low = (s) => String(s ?? "").trim().toLowerCase();
const mkKey = (typeRaw, powerKw) => `${low(typeRaw)}|${Number(powerKw) || 0}`;

function parseKwFromText(txt) {
  const m = String(txt ?? "").match(/([\d.]+)/);
  return m ? Number(m[1]) : undefined;
}

// Xác định khung giờ theo H:M (local)
// Low: 22:00–06:00 ; Peak: 17:00–22:00 ; còn lại Normal
function timeRangeOfHM(h, m) {
  const t = h * 60 + m;
  const inRange = (a, b, x) => (a <= b ? (x >= a && x < b) : (x >= a || x < b));
  if (inRange(22 * 60, 6 * 60, t)) return "Low";
  if (inRange(17 * 60, 22 * 60, t)) return "Peak";
  return "Normal";
}

function normTypeACDC(s = "") {
  const t = String(s).toLowerCase();
  if (/(^|\W)dc(\W|$)|fast|rapid|ultra/.test(t)) return "DC";
  if (/(^|\W)ac(\W|$)|slow|normal/.test(t)) return "AC";
  return s || ""; // giữ nguyên nếu không đoán được
}

function priceRangeLabelForCharger(ch, mp) {
  if (!ch) return "";
  const types = [ch.typeStd, ch.typeRaw].filter(Boolean);
  let kw = ch.powerKw ?? parseKwFromText(ch.power);
  if (!Number.isFinite(kw)) kw = undefined;

  const pickBucket = () => {
    for (const tp of types) {
      if (!tp) continue;
      let b = null;
      if (Number.isFinite(kw)) b = mp.get(mkKey(tp, kw));
      if (!b) b = mp.get(mkKey(tp, 0));
      if (b) return b;
    }
    return null;
  };
  const bucket = pickBucket();
  if (!bucket) return "";
  const vals = [bucket.low?.pricePerKwh, bucket.normal?.pricePerKwh, bucket.peak?.pricePerKwh]
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (!vals.length) return "";
  if (vals.length === 1) return `${vnd(vals[0])}/kWh`;
  return `${vnd(vals[0])} - ${vnd(vals[vals.length - 1])} /kWh`;
}


export default function BookingPorts() {
  // === User/Vehicle ===
  const [me, setMe] = useState(null);
  const [myVehicleId, setMyVehicleId] = useState(null);
  const [myVehicleType, setMyVehicleType] = useState("");
  const [myVehicleCompanyId, setMyVehicleCompanyId] = useState(null); // NEW
  const [authError, setAuthError] = useState("");
  const { id, cid } = useParams(); // stationId & chargerId
  const navigate = useNavigate();
  const { user } = useAuth();

  const [station, setStation] = useState(null);
  const [charger, setCharger] = useState(null);
  const [ports, setPorts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [portsLoading, setPortsLoading] = useState(true);
  const [portsError, setPortsError] = useState("");

  const [selectedGun, setSelectedGun] = useState(null);
  const [allConnectorTypes, setAllConnectorTypes] = useState([]);  // NEW
  const [connectorText, setConnectorText] = useState("");          // NEW
  // ---- PricingRule state ----
  const [pricingRules, setPricingRules] = useState([]);
  const [pricingMap, setPricingMap] = useState(() => new Map());

  // ====== EXISTING BOOKINGS & CONFLICT DETECTION ======
  const [existingBookings, setExistingBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingConflict, setBookingConflict] = useState(null);


  // ====== THỜI GIAN (cập nhật từng phút) ======
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const nowHour = now.getHours();
  const nowMinute = now.getMinutes();

  const ceilNowToNextMinute = () => {
    let h = nowHour;
    let m = nowMinute + 1;
    if (m >= 60) {
      h = nowHour + 1;
      m = 0;
    }
    return { h, m };
  };
  const baseline = ceilNowToNextMinute();

  const MIN_GAP_MINUTES = 60;
  const LAST_ABS_MIN = 23 * 60 + 59;

  const minStartAbsMin = (baseline.h * 60 + baseline.m) + MIN_GAP_MINUTES;
  const minStartHour = Math.min(Math.floor(minStartAbsMin / 60), 23);
  const minStartMinute = minStartAbsMin % 60;

  const canBookToday = minStartAbsMin <= LAST_ABS_MIN;

  // State chọn thời điểm bắt đầu
  const [startHour, setStartHour] = useState(() => minStartHour);
  const [startMinute, setStartMinute] = useState(() => minStartMinute);

  useEffect(() => {
    if (!canBookToday) return;
    const startAbs = startHour * 60 + startMinute;
    if (startAbs < minStartAbsMin) {
      setStartHour(minStartHour);
      setStartMinute(minStartMinute);
    }
  }, [nowHour, nowMinute, minStartHour, minStartMinute, canBookToday]); // eslint-disable-line

  // ==== TÙY CHỌN GIỜ/PHÚT BẮT ĐẦU ====
  const startHourOptions = useMemo(() => {
    const arr = [];
    for (let h = minStartHour; h <= 23; h++) arr.push(h);
    return arr;
  }, [minStartHour]);

  const startMinuteOptionsForHour = (h) => {
    const all = Array.from({ length: 60 }, (_, i) => i);
    if (h > minStartHour) return all;
    return all.filter((m) => m >= minStartMinute);
  };

  // ====== CHỌN GIỜ KẾT THÚC (>= start + 60 phút) ======
  const startAbsMin = useMemo(() => startHour * 60 + startMinute, [startHour, startMinute]);
  const minEndAbsMin = startAbsMin + MIN_GAP_MINUTES;
  const endCapAbsMin = LAST_ABS_MIN;

  const defEnd = useMemo(() => {
    const abs = Math.min(minEndAbsMin, endCapAbsMin);
    return { h: Math.floor(abs / 60), m: abs % 60 };
  }, [minEndAbsMin, endCapAbsMin]);

  const [endHour, setEndHour] = useState(defEnd.h);
  const [endMinute, setEndMinute] = useState(defEnd.m);


  useEffect(() => {
    const curEndAbs = endHour * 60 + endMinute;
    if (curEndAbs < minEndAbsMin) {
      setEndHour(defEnd.h);
      setEndMinute(defEnd.m);
    } else if (curEndAbs > endCapAbsMin) {
      setEndHour(Math.floor(endCapAbsMin / 60));
      setEndMinute(endCapAbsMin % 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minEndAbsMin, endCapAbsMin, defEnd.h, defEnd.m]);

  const endHourOptions = useMemo(() => {
    const minH = Math.floor(minEndAbsMin / 60);
    const arr = [];
    for (let h = minH; h <= 23; h++) arr.push(h);
    return arr;
  }, [minEndAbsMin]);

  const endMinuteOptionsForHour = (h) => {
    const minH = Math.floor(minEndAbsMin / 60);
    const minM = minEndAbsMin % 60;

    const all = Array.from({ length: 60 }, (_, i) => i);
    if (h > minH) return all;
    return all.filter((m) => m >= minM);
  };

  // 🔄 Đồng bộ phút kết thúc theo phút bắt đầu
  useEffect(() => {
    // Nếu giờ kết thúc nhỏ hơn giờ bắt đầu, giữ nguyên (để người dùng chọn lại)
    setEndMinute(startMinute);
  }, [startMinute]);



  // ====== TÍNH TỔNG PHÚT (chỉ để kiểm tra hợp lệ)
  const totalMinutes = useMemo(() => {
    const endAbs = endHour * 60 + endMinute;
    const gap = endAbs - (startHour * 60 + startMinute);
    return Math.max(0, gap);
  }, [startHour, startMinute, endHour, endMinute]);

  // ---- Xác định rule áp dụng cho (typeRaw, powerKw) và thời điểm bắt đầu đã chọn ----
  const currentPricing = useMemo(() => {
    if (!charger) return null;

    const typeCandidates = [charger.typeStd, charger.typeRaw].filter(Boolean);
    let kw = charger.powerKw ?? parseKwFromText(charger.power);
    if (!Number.isFinite(kw)) kw = undefined;

    let bucket = null;
    for (const tp of typeCandidates) {
      if (!tp) continue;
      if (bucket) break;
      // 1) type + exact kW
      if (Number.isFinite(kw)) bucket = pricingMap.get(mkKey(tp, kw));
      // 2) type + 0 (BE không ràng công suất)
      if (!bucket) bucket = pricingMap.get(mkKey(tp, 0));
    }
    if (!bucket) return null;

    const tr = timeRangeOfHM(startHour, startMinute); // "Low" | "Normal" | "Peak"
    const r = bucket[low(tr)];
    if (!r) return null;

    return {
      ...r,
      timeRange: tr,
      label: `${viTimeRange(tr)} • ${vnd(r.pricePerKwh)}/kWh`,
    };
  }, [charger, pricingMap, startHour, startMinute]);

  // ====== LOAD STATION + CHARGER ======
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const stationRaw = await fetchJSON(`${API_BASE}/Stations/${id}`);
        if (!alive) return;
        setStation(normalizeStation(stationRaw));

        const chRaw = await fetchJSON(`${API_BASE}/Chargers/${cid}`);
        if (!alive) return;
        setCharger(normalizeCharger(chRaw));
        // ---------- Tải PricingRule ----------
        // Dùng fetchAuthJSON cho chắc (nếu API cần token)
        const pr = await fetchAuthJSON(`/PricingRule`);
        const items = Array.isArray(pr?.items) ? pr.items : (Array.isArray(pr) ? pr : []);
        const active = items.filter(r => low(r.status) === "active");
        setPricingRules(active);

        // Build map: key = "ac|120", value = { low, normal, peak }
        const mp = new Map();
        for (const r of active) {
          const key = mkKey(r.chargerType, r.powerKw);
          const bucket = mp.get(key) || {};
          bucket[low(r.timeRange)] = r;
          mp.set(key, bucket);
        }
        setPricingMap(mp);
      } catch (e) {
        if (!alive) return;
        const msg = /404|không tìm/i.test(String(e?.message))
          ? "Không tìm thấy trạm hoặc trụ!"
          : `Không tải được dữ liệu. ${e?.message ?? ""}`;
        setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, cid]);

  const priceText = useMemo(() => {
    return currentPricing
      ? `${vnd(currentPricing.pricePerKwh)}/kWh (${viTimeRange(currentPricing.timeRange)})`
      : (priceRangeLabelForCharger(charger, pricingMap) || charger?.price || "—");
  }, [currentPricing, charger, pricingMap]);


  // ====== LOAD PORTS THEO CHARGER ======
  useEffect(() => {
    let alive = true;
    if (!cid) return;
    (async () => {
      try {
        setPortsLoading(true);
        setPortsError("");

        const data = await fetchJSON(`${API_BASE}/Ports?chargerId=${encodeURIComponent(cid)}`);
        if (!alive) return;

        let arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        const same = (a, b) => String(a) === String(b);
        arr = arr.filter(p => same(p.chargerId ?? p.ChargerId, cid));

        const mapped = arr.map(normalizePort);
        setPorts(mapped);

        // NEW: gom connector types của trụ này
        const typesSet = new Set(mapped.map(p => String(p.connector || p.connectorType || p.ConnectorType || "").trim()).filter(Boolean));
        const typesArr = Array.from(typesSet);
        setAllConnectorTypes(typesArr);
        setConnectorText(typesArr.join(", "));

        // Đồng bộ cho ChargersCard giống StationDetail
        setCharger(prev => prev ? {
          ...prev,
          connector: typesArr.join(", "),      // text gộp
          connectorTypes: typesArr,          // mảng, nếu card dùng dạng list
          price: prev.price
        } : prev);

        if (arr.length === 0 && Array.isArray(data) && data.length > 0) {
          console.warn("[Ports] API trả rộng, FE đã lọc client-side theo chargerId =", cid);
        }
      } catch (e) {
        setPortsError(e?.message || "Lỗi tải cổng.");
        setPorts([]);
      } finally {
        if (alive) setPortsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cid]);

  // Auto-chọn cổng khả dụng đầu tiên
  useEffect(() => {
    if (!ports.length) { setSelectedGun(null); return; }
    if (selectedGun && ports.some(p => p.id === selectedGun.id && p.status === "available")) return;
    const firstAvail = ports.find(p => p.status === "available") || null;
    setSelectedGun(firstAvail);
  }, [ports, selectedGun]);


  // ====== FETCH EXISTING BOOKINGS FOR SELECTED PORT ======
  useEffect(() => {
    if (!selectedGun?.id) {
      setExistingBookings([]);
      setBookingConflict(null);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setBookingsLoading(true);
        setBookingConflict(null);

        // Fetch bookings cho port này
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const url = `/Booking?portId=${selectedGun.id}&startTime=${startOfDay.toISOString()}&endTime=${endOfDay.toISOString()}`;
        const data = await fetchAuthJSON(url, { method: "GET" });

        if (!alive) return;

        const bookings = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        const normalizedBookings = bookings
          .filter(b => b.status !== "Cancelled" && b.status !== "Completed")
          .map(normalizeBooking);

        setExistingBookings(normalizedBookings);
      } catch (e) {
        if (!alive) return;
        console.warn("Không thể tải danh sách booking:", e.message);
        setExistingBookings([]);
      } finally {
        if (alive) setBookingsLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [selectedGun?.id]);

  // ====== CHECK CONFLICT WHEN TIME CHANGES ======
  useEffect(() => {
    if (!selectedGun || !existingBookings.length) {
      setBookingConflict(null);
      return;
    }

    const today = new Date();
    const startLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMinute, 0, 0);
    const endLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMinute, 0, 0);

    const conflict = checkTimeConflict(startLocal, endLocal, existingBookings);
    setBookingConflict(conflict.conflict ? conflict : null);
  }, [selectedGun, startHour, startMinute, endHour, endMinute, existingBookings]);


  // ====== BOOK (để BE tính phí; FE không gửi amount)
  const handleBook = async () => {
    const MIN_GAP_MINUTES = 60;
    if (!selectedGun || totalMinutes < MIN_GAP_MINUTES) return;

    if (!me?.customerId) { alert("Chưa đăng nhập hoặc không lấy được customerId."); return; }
    console.debug("[BookingPorts] me =", me, "user =", user, "myVehicleId =", myVehicleId);
    if (!myVehicleId) { alert("Tài khoản chưa có xe. Hãy thêm xe trước khi đặt."); return; }

    // Kiểm tra conflict trước khi đặt
    if (bookingConflict) {
      alert(`Không thể đặt chỗ: ${bookingConflict.message}`);
      return;
    }

    const today = new Date();
    const startLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMinute, 0, 0);
    const endLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMinute, 0, 0);

    const bookingDto = {
      customerId: Number(me.customerId),
      companyId: myVehicleCompanyId || null, // lấy từ Vehicle
      vehicleId: Number(myVehicleId),
      portId: Number(selectedGun.id),
      startTime: fmtUtcZ(startLocal), // gửi UTC Z
      endTime: fmtUtcZ(endLocal),     // gửi UTC Z
      status: "Pending",
    };
    console.debug("[BookingPorts] bookingDto =", bookingDto);
    console.log("[POST /Booking] payload =", bookingDto);

    try {
      // Guard theo giờ LOCAL
      const startMs = startLocal.getTime();
      const endMs = endLocal.getTime();
      const nowMs = Date.now();

      if (startMs < nowMs + 60 * 60 * 1000) {
        alert("Giờ bắt đầu phải cách hiện tại ít nhất 60 phút.");
        return;
      }
      if (endMs - startMs < 60 * 60 * 1000) {
        alert("Thời lượng phải tối thiểu 60 phút.");
        return;
      }

      // const created = await fetchAuthJSON(`${API_BASE}/Booking`, {
      const created = await fetchAuthJSON(`/Booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Accept": "application/json",
        },
        body: JSON.stringify(bookingDto),
      });

      let bookingId = idFromItem(created);
      if (!bookingId) {
        const list = extractItems(created);
        if (list.length) {
          const matched = pickJustCreatedFromList(list, {
            customerId: me.customerId,
            portId: selectedGun.id,
            startLocal,
          });
          bookingId = idFromItem(matched) || idFromItem(list[0]);
        }
      }
      if (!bookingId) {
        try {
          const url = `/Booking?customerId=${encodeURIComponent(me.customerId)}&page=1&pageSize=10`;
          const latest = await fetchAuthJSON(url, { method: "GET" });
          const items = extractItems(latest);
          const matched = pickJustCreatedFromList(items, {
            customerId: me.customerId,
            portId: selectedGun.id,
            startLocal,
          });
          bookingId = idFromItem(matched) || idFromItem(items[0]);
        } catch { }
      }
      if (!bookingId) throw new Error("Tạo booking xong nhưng không có bookingId.");

      // --- Poll giá từ BE cho tới khi có price ---
      let price = 0;
      const startedAt = Date.now();
      while (Date.now() - startedAt < 15000) { // tối đa 15s
        try {
          const b = await fetchAuthJSON(`/Booking/${bookingId}`, { method: "GET" });
          price = Number(b?.price ?? b?.Price ?? 0);
          if (price > 0) break;
        } catch { }
        await new Promise(r => setTimeout(r, 800));
      }
      if (price <= 0) {
        console.warn("Booking chưa có price, vẫn tiếp tục tạo Payment nhưng UI sẽ hiển thị 'đang tính...'");
      }

      const orderId = "ORD" + Date.now();
      const payload = {
        bookingId,
        orderId,
        returnUrl: `${window.location.origin}/vnpay-bridge.html?order=${orderId}`,
      };

      const payRes = await fetchAuthJSON(`/Payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!payRes?.success || !payRes?.paymentUrl) {
        throw new Error(payRes?.message || "API /Payment/create không trả về paymentUrl.");
      }

      navigate("/payment", {
        state: {
          orderId,
          bookingId,
          booking: created,
          // vnpayUrl: payRes.paymentUrl,
          vnpayUrl: (typeof payRes.paymentUrl === "string"
            ? payRes.paymentUrl
            : payRes.paymentUrl?.result || ""),
          startTime: fmtLocal(startLocal),
          endTime: fmtLocal(endLocal),
          station: { id, name: station?.name, address: station?.address },
          charger: {
            id: cid,
            connector: selectedGun?.connector || charger?.connector,
            power: selectedGun?.power || charger?.power,
            price: charger?.price,
            title: charger?.title,
            status: charger?.status,
          },
          gun: { id: selectedGun?.id, name: selectedGun?.name || `Súng ${selectedGun?.id}` },
          totalMinutes,
          baseline: { startHour, startMinute, endHour, endMinute },
        },
      });
    } catch (e) {
      alert(`Tạo booking hoặc phiên thanh toán thất bại: ${e.message}`);
    }
  };

  // === NẠP USER & VEHICLE (từ AuthContext, không đoán mò) ===
  useEffect(() => {
    // CHỈ kiểm tra token lưu trong storage — tránh redirect sớm do user context chưa kịp sẵn sàng
    if (!getToken()) {
      navigate("/login", { replace: true });
      return;
    }

    // Log để chắc chắn đang dùng đúng user/customer
    console.debug("[BookingPorts] user from context =", user);
    const cidFromStorage = Number(localStorage.getItem("customerId") || sessionStorage.getItem("customerId"));
    if (user?.customerId) {
      setMe({ customerId: Number(user.customerId) });
    } else if (Number.isFinite(cidFromStorage)) {
      setMe({ customerId: cidFromStorage });
    } else {
      setAuthError("Không tìm thấy customerId trong phiên đăng nhập.");
    }



    let alive = true;
    (async () => {
      try {
        // 🚩 ĐỪNG trông chờ BE filter theo customerId; ép pageSize lớn để chắc chắn có trong trang đầu
        const url = `/Vehicles?page=1&pageSize=200`; // <= đủ lớn để gom hết
        const res = await fetchAuthJSON(url);

        // Log raw response để xem đúng shape
        console.debug("[BookingPorts] /Vehicles raw =", res);

        let vehicles = Array.isArray(res)
          ? res
          : (Array.isArray(res?.items) ? res.items : []);

        // Log sau khi đọc items
        console.debug("[BookingPorts] vehicles (all) =", vehicles?.length, vehicles);

        // Fallback lọc client-side theo customerId
        const myCid = String(
          user?.customerId ??
          me?.customerId ??
          localStorage.getItem("customerId") ??
          sessionStorage.getItem("customerId") ??
          ""
        );
        vehicles = vehicles.filter(v =>
          String(v.customerId ?? v.CustomerId ?? v.userId ?? v.UserId) === myCid
        );

        console.debug("[BookingPorts] vehicles (mine) =", vehicles?.length, vehicles);

        if (!alive) return;
        if (!vehicles.length) {
          // Cho thêm log rõ ràng để debug khi BE có xe nhưng FE không thấy
          console.warn("[BookingPorts] KHÔNG THẤY XE thuộc customerId =", myCid);
          throw new Error("Không tìm thấy xe nào thuộc tài khoản của bạn.");
        }

        const first = vehicles[0];
        // BE dùng key vehicleId (không phải id)
        const vid = first?.vehicleId ?? first?.id ?? null;
        setMyVehicleId(vid);

        const vtype =
          first?.vehicleType ?? first?.VehicleType ??
          first?.type ?? first?.Type ??
          first?.category ?? first?.Category ?? "";
        setMyVehicleType(String(vtype || "").trim());

        // Lấy companyId từ chính Vehicle (ưu tiên số dương; 0/null coi như không có)
        const rawCompanyId = first?.companyId ?? first?.CompanyId ?? null;
        const normalizedCompanyId =
          Number.isFinite(Number(rawCompanyId)) && Number(rawCompanyId) > 0
            ? Number(rawCompanyId)
            : null;
        setMyVehicleCompanyId(normalizedCompanyId);
        console.debug("[BookingPorts] vehicle companyId =", normalizedCompanyId);

        console.debug("[BookingPorts] picked vehicleId =", vid, "type =", vtype);
      } catch (e) {
        if (!alive) return;
        console.error("[BookingPorts] Load vehicles error:", e);
        setAuthError(e?.message || "Không thể nạp phương tiện.");
      }
    })();

    return () => { alive = false; };
  }, [navigate, user]);


  // ====== RENDER ======
  if (loading) {
    return (
      <MainLayout>
        <div className="bp-container"><div>Đang tải dữ liệu...</div></div>
      </MainLayout>
    );
  }
  if (error) {
    return (
      <MainLayout>
        <div className="bp-container"><div className="error-text">Lỗi: {error}</div></div>
      </MainLayout>
    );
  }
  if (!station) {
    return (
      <MainLayout>
        <div className="bp-container"><div>Không có dữ liệu trạm.</div></div>
      </MainLayout>
    );
  }
  if (!charger) {
    return (
      <MainLayout>
        <div className="bp-container"><div>Không tìm thấy trụ để đặt.</div></div>
      </MainLayout>
    );
  }

  const startDisabled = !canBookToday;
  const endDisabled = !canBookToday;

  return (
    <MainLayout>
      <div className="bp-container">
        <Link to={`/stations/${id}`} className="bp-back">← Quay về trạm</Link>

        <div className="bp-grid">
          {/* Cột trái */}
          <div className="bp-left-col">
            <div className="bp-panel">
              <div className="bp-title">{station.name}</div>
              <div className="bp-subtle">{station.address}</div>
            </div>

            <div className="bp-panel-chargers">
              <ChargersCard charger={{
                ...charger,
                connector: connectorText || charger?.connector || "—",
                connectorTypes: allConnectorTypes,
                price: priceText
              }} />
              <div className="bp-charger-grid">
                <div className="bp-panel-note">
                  <div className="bp-note">Biểu giá dịch vụ sạc điện</div>
                  <div className="bp-price">
                    {currentPricing
                      ? currentPricing.label
                      : (priceRangeLabelForCharger(charger, pricingMap) || charger.price || "—")}
                  </div>
                  {currentPricing && (
                    <div className="bp-subtle">
                      Áp dụng theo giờ bắt đầu: <b>{String(startHour).padStart(2, "0")}:{String(startMinute).padStart(2, "0")}</b>
                    </div>
                  )}
                  <div className="bp-footnote">© Biểu giá có thể thay đổi theo từng trạm và khung giờ.</div>
                </div>

                <div className="bp-section">
                  <div className="bp-label">Chọn súng sạc</div>

                  {portsLoading ? (
                    <div className="bp-hint">Đang tải cổng…</div>
                  ) : portsError ? (
                    <div className="error-text">Lỗi: {portsError}</div>
                  ) : (
                    <ChargersGun
                      guns={ports}
                      value={selectedGun}
                      onChange={setSelectedGun}
                      autoSelect={true}
                    />
                  )}

                  {!selectedGun && !portsLoading && (
                    <div className="bp-hint" style={{ marginTop: 8 }}>
                      Hiện không còn súng rảnh để đặt.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bp-panel">
              <div className="bp-title">Khung giá</div>
              <div className="bp-table-wrapper">
                <table className="bp-table">
                  <thead>
                    <tr><th>Loại giá</th><th>Thời gian</th><th>Ngày</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><b>Thấp điểm</b></td><td>22:00 – 06:00</td><td>Tất cả các ngày</td></tr>
                    <tr><td><b>Bình thường</b></td><td>06:00 – 17:00</td><td>Thứ 2 – Thứ 7</td></tr>
                    <tr><td><b>Cao điểm</b></td><td>17:00 – 22:00</td><td>Thứ 2 – Thứ 7</td></tr>
                    <tr><td><b>CN</b></td><td>08:00 – 17:00</td><td>Chủ nhật</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cột phải */}
          <div>
            <div className="bp-panel">
              <div className="bp-title">Đặt trước trụ sạc</div>

              {/* Bắt đầu */}
              <div className="bp-section">
                <div className="bp-label">Giờ bắt đầu hôm nay</div>

                {!canBookToday && (
                  <div className="bp-hint" style={{ marginBottom: 8 }}>
                    Hiện đã quá muộn trong ngày. Vui lòng quay lại vào ngày mai.
                  </div>
                )}

                <div className="bp-time-row">
                  <div className="bp-time-col">
                    <div className="bp-subtle" style={{ marginBottom: 6 }}>Giờ</div>
                    <select
                      className="bp-input-select"
                      value={startHour}
                      onChange={(e) => {
                        const h = Number(e.target.value) || minStartHour;
                        const mins = startMinuteOptionsForHour(h);
                        // nếu phút hiện tại không còn hợp lệ với giờ mới -> chọn phút hợp lệ nhỏ nhất
                        const nextMinute = mins.includes(startMinute) ? startMinute : (mins[0] ?? 0);
                        setStartHour(h);
                        setStartMinute(nextMinute);
                      }}
                      disabled={startDisabled}
                    >
                      {startHourOptions.map(h => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                      ))}
                    </select>

                  </div>

                  <div className="bp-time-col">
                    <div className="bp-subtle" style={{ marginBottom: 6 }}>Phút</div>
                    <select
                      className="bp-input-select"
                      value={startMinute}
                      onChange={(e) => {
                        const m = Number(e.target.value) || 0;
                        const mins = startMinuteOptionsForHour(startHour);
                        setStartMinute(mins.includes(m) ? m : (mins[0] ?? 0));
                      }}
                      disabled={startDisabled}
                    >
                      {startMinuteOptionsForHour(startHour).map(m => (
                        <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bp-hint">
                  Mốc nhỏ nhất: {String(minStartHour).padStart(2, "0")}:
                  {String(minStartMinute).padStart(2, "0")} (đặt sau thời điểm hiện tại ít nhất 1 giờ).
                </div>
              </div>

              {/* Kết thúc */}
              <div className="bp-section">
                <div className="bp-label">Giờ kết thúc hôm nay</div>

                <div className="bp-time-row">
                  <div className="bp-time-col">
                    <div className="bp-subtle" style={{ marginBottom: 6 }}>Giờ</div>
                    <select
                      className="bp-input-select"
                      value={endHour}
                      onChange={(e) => {
                        let h = Number(e.target.value) || Math.floor(minEndAbsMin / 60);
                        const mins = endMinuteOptionsForHour(h);
                        let m = endMinute;
                        if (!mins.includes(m)) m = mins[0] ?? 0;
                        setEndHour(h);
                        setEndMinute(m);
                      }}
                      disabled={endDisabled}
                    >
                      {endHourOptions.map(h => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bp-time-col">
                    <div className="bp-subtle" style={{ marginBottom: 6 }}>Phút</div>
                    <select
                      className="bp-input-select"
                      value={startMinute}   // luôn hiển thị giống phút bắt đầu
                      disabled              // khóa, không cho chọn
                    >
                      <option value={startMinute}>
                        {String(startMinute).padStart(2, "0")}
                      </option>
                    </select>
                  </div>

                </div>

                <div className="bp-hint">
                  Thời lượng phải ≥ 60 phút. Kết thúc hợp lệ từ&nbsp;
                  {String(Math.floor(minEndAbsMin / 60)).padStart(2, "0")}:
                  {String(minEndAbsMin % 60).padStart(2, "0")} trở đi.
                </div>
              </div>

              {/* Phương tiện + Ghi chú giá */}
              <div className="bp-section">
                <div className="bp-vehicle-box">
                  {myVehicleType ? (
                    <>
                      <div className="bp-subtle" style={{ marginTop: 6 }}>
                        Giá hiển thị chỉ mang tính tham khảo. <br />
                        <b>Giá cuối cùng do hệ thống tính tại thời điểm đặt</b>.
                      </div>
                    </>
                  ) : (
                    <div className="bp-vehicle-display">⏳ Đang xác định phương tiện...</div>
                  )}
                </div>
              </div>

              {/* Tổng hợp (không hiển thị tiền FE tính) */}
              <div className="bp-summary">
                <RowKV
                  k="Cổng sạc"
                  v={`${(selectedGun?.connector || connectorText || charger?.connector || "—")} • ${(selectedGun?.power || charger?.power || "—")}`}
                />
                <RowKV k="Súng" v={selectedGun ? (selectedGun.name || `Súng ${selectedGun.id}`) : "—"} />
                <RowKV
                  k="Tổng thời gian (phút)"
                  v={`${totalMinutes} phút (${(totalMinutes / 60).toFixed(2)} giờ)`}
                />
                <RowKV
                  k="Giá áp dụng"
                  v={currentPricing ? `${vnd(currentPricing.pricePerKwh)}/kWh (${viTimeRange(currentPricing.timeRange)})` : "—"}
                />
                <RowKV k="Chi phí" v={<i>Sẽ tính và hiển thị ở bước thanh toán</i>} />
              </div>

              {/* Conflict Warning */}
              {bookingConflict && (
                <div className="bp-conflict-warning" style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: "#fee",
                  border: "1px solid #fcc",
                  borderRadius: 6,
                  color: "#c33"
                }}>
                  <strong>⚠️ Khung giờ đã được đặt:</strong><br />
                  {bookingConflict.message}
                </div>
              )}

              {/* Available Slots Display */}
              {existingBookings.length > 0 && (
                <div className="bp-available-slots" style={{ marginTop: 12 }}>
                  <div className="bp-label">Khung giờ đã được đặt hôm nay:</div>
                  <div style={{ fontSize: "0.9em", color: "#666" }}>
                    {existingBookings.map((booking, idx) => (
                      <div key={idx} style={{ margin: "4px 0" }}>
                        • {new Date(booking.startTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })} -
                        {new Date(booking.endTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        <span style={{ color: "#999", marginLeft: 8 }}>
                          ({booking.status})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              <button
                className="bp-btn-primary"
                disabled={!canBookToday || totalMinutes < MIN_GAP_MINUTES || !selectedGun || bookingConflict}
                onClick={handleBook}
                style={{
                  backgroundColor: bookingConflict ? "#ccc" : undefined,
                  cursor: bookingConflict ? "not-allowed" : undefined
                }}
              >
                {bookingConflict ? "Khung giờ đã được đặt" : "Đặt ngay"}
              </button>

              {totalMinutes < MIN_GAP_MINUTES && (
                <div className="bp-hint" style={{ marginTop: 8 }}>
                  Vui lòng chọn giờ kết thúc muộn hơn ít nhất 60 phút so với giờ bắt đầu.
                </div>
              )}
            </div>

            <FeedbackSection
              apiBase={API_BASE}          // để component tự fetch
              stationId={id}              // id trạm hiện tại từ useParams()
              chargerId={cid}             // id trụ hiện tại từ useParams()
              portId={selectedGun?.id}    // id cổng đã chọn (có thể null -> component tự xử)
              // optional:
              pageSize={10}               // modal lớn mỗi trang 10
              initialCount={3}            // hiển thị 3 đánh giá mới nhất
              className="bp-feedback"     // nếu cần áp style bên BookingPorts
              style={{ marginTop: "10px" }}
            />

          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function RowKV({ k, v }) {
  return (
    <div className="bp-row-kv">
      <span className="bp-row-kv-key">{k}</span>
      <span className="bp-row-kv-val">{v}</span>
    </div>
  );
}

function Review({ name, text }) {
  return (
    <div className="bp-review">
      <div className="bp-avatar" />
      <div>
        <div className="bp-review-head">
          <b>{name}</b><span>⭐️⭐️⭐️⭐️⭐️</span>
        </div>
        <div className="bp-subtle">{text}</div>
      </div>
    </div>
  );
}

