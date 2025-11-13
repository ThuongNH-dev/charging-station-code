import React, { useEffect, useState } from "react";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Pagination } from "antd";
import { message as antdMessage } from "antd";
import MessageBox from "../../components/staff/MessageBox";
import ConfirmDialog from "../../components/staff/ConfirmDialog";
import "./SessionManager.css";

const API_BASE = getApiBase();

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const mon = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${hh}:${mm}:${ss} ${day}/${mon}/${year}`;
}

function vnd(n) {
  if (!n && n !== 0) return "—";
  return (Number(n) || 0).toLocaleString("vi-VN") + " ₫";
}

function toArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.data?.items)) return raw.data.items;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.$values)) return raw.$values;
  if (Array.isArray(raw.value)) return raw.value; // 🧩 fallback nếu API trả về { value: [...] }

  if (typeof raw === "object") return [raw];
  try {
    return toArray(JSON.parse(raw));
  } catch {
    return [];
  }
}


// ==== Helper: tính tốc độ tăng phần trăm pin mỗi giây ====
function calcRate(powerKw = 7, capacityKwh = 60) {
  // (kW / 3600) / capacity × 100 = %/giây
  const pctPerSec = ((powerKw / 3600) / capacityKwh) * 100;
  return pctPerSec * 8; // mô phỏng nhanh gấp 8 lần thực tế
}

export default function SessionManager() {
  const { user } = useAuth();
  const currentAccountId = user?.accountId || localStorage.getItem("accountId");

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [err, setErr] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, session: null });
  // ⚡ Tăng % pin realtime
const [liveProgress, setLiveProgress] = useState({});

  const pageSize = 8;
  const navigate = useNavigate();

  // ✅ Trạm staff phụ trách
  const [stations, setStations] = useState([]);
  const [users, setUsers] = useState([]);

  const [myStations, setMyStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);

  // 🟢 Theo dõi phiên vừa khởi động (nếu ChargerManager đã lưu ID)
useEffect(() => {
  const liveId = sessionStorage.getItem("staffLiveSessionId");
  if (liveId) {
    console.log("🔋 Bắt đầu theo dõi phiên:", liveId);
    startTrackingSession(Number(liveId));
  }
}, []);


  /* ---------------- Load danh sách trạm staff ---------------- */
  useEffect(() => {
    async function loadStations() {
      try {
        const allStations = await fetchAuthJSON(`${API_BASE}/Stations`);
const stationsArr = toArray(allStations);

// === Tải danh sách tài khoản từ /Auth ===
const allUsers = await fetchAuthJSON(`${API_BASE}/Auth`);
const authList = toArray(allUsers);

// Lọc tất cả loại người dùng có thể xuất hiện (Customer, Company, Staff, Admin)
const mappedUsers = authList
  .filter((a) =>
    ["Customer", "Company", "Staff", "Admin"].includes(a.role)
  )
  .map((a) => ({
    accountId: a.accountId,
    fullName:
      a.company?.companyName ||
      a.customers?.[0]?.fullName ||
      a.userName,
    role: a.role,
    avatar: a.avatarUrl || null,
  }));

setUsers(mappedUsers);

const myStationIds = [];


        for (const st of stationsArr) {
          try {
            const res = await fetchAuthJSON(`${API_BASE}/station-staffs?stationId=${st.stationId}`);
            const staffs = toArray(res);
            const found = staffs.some((s) => String(s.staffId) === String(currentAccountId));
            if (found) myStationIds.push(st.stationId);
          } catch {
            console.warn("Không lấy được staff của trạm:", st.stationId);
          }
        }

        const mine = stationsArr.filter((s) => myStationIds.includes(s.stationId));
        setStations(stationsArr);
        setMyStations(mine);
        if (mine.length > 0) setSelectedStationId(mine[0].stationId);
      } catch (err) {
        console.error("Lỗi khi tải danh sách trạm:", err);
      }
    }
    loadStations();
  }, [currentAccountId]);

  /* ---------------- Load danh sách phiên sạc theo trạm ---------------- */
  useEffect(() => {
    if (!selectedStationId) return;
    loadSessions();
  }, [selectedStationId]);

  async function loadSessions() {
    if (!isInitialLoad) setLoading(true);
    try {
      const res = await fetchAuthJSON(`${API_BASE}/ChargingSessions`);
      let sessionArr = res?.data ?? res?.$values ?? res?.items ?? res ?? [];
      if (!Array.isArray(sessionArr)) sessionArr = [sessionArr];

      // Lọc phiên theo stationId
      const portsRes = await fetchAuthJSON(`${API_BASE}/Ports`);
      const ports = toArray(portsRes);
      const chargersRes = await fetchAuthJSON(`${API_BASE}/Chargers`);
      const chargers = toArray(chargersRes);

      const portToCharger = {};
      for (const p of ports) {
        portToCharger[p.portId] = p.chargerId;
      }
      const chargerToStation = {};
      for (const c of chargers) {
        chargerToStation[c.chargerId] = c.stationId;
      }

      // ✅ Giới hạn session chỉ thuộc trạm hiện tại
      sessionArr = sessionArr.filter((s) => {
        const portId = s.portId ?? s.PortId;
        const chargerId = portToCharger[portId];
        const stationId = chargerToStation[chargerId];
        return String(stationId) === String(selectedStationId);
      });

      // 🚗 Lấy danh sách xe (trả về { items: [...] })
const vehiclesRaw = await fetchAuthJSON(`${API_BASE}/Vehicles?page=1&pageSize=1000`);
const vehicles = toArray(
  vehiclesRaw?.data?.items ?? vehiclesRaw?.items ?? vehiclesRaw
);

      const vehicleMap = {};
for (const v of vehicles) {
  const id = v.vehicleId || v.VehicleId;
  if (id !== undefined && id !== null) {
    vehicleMap[String(id)] = v; // dùng key string cho chắc
  }
}
console.log("🚗 Tổng số xe lấy được:", Object.keys(vehicleMap).length);
console.log("🔧 Mẫu xe đầu tiên:", Object.values(vehicleMap)[0]);



      const invRes = await fetchAuthJSON(`${API_BASE}/Invoices`);
      let invoices = toArray(invRes);

      const sessionToInvoiceStatus = {};
      for (const inv of invoices) {
        try {
          const invDetail = await fetchAuthJSON(`${API_BASE}/Invoices/${inv.invoiceId || inv.id}`);
          const invoiceData = invDetail?.data || invDetail;
          const sessionsList =
            invoiceData?.chargingSessions || invoiceData?.$values?.chargingSessions || [];

          sessionsList.forEach((session) => {
            const sessionId = session.chargingSessionId || session.id;
            if (sessionId) {
              sessionToInvoiceStatus[sessionId] = {
                status: (inv.status || "UNPAID").toUpperCase(),
                invoiceId: inv.invoiceId || inv.id,
              };
            }
          });
        } catch {}
      }

      const detailed = await Promise.all(
        sessionArr.map(async (s) => {
          try {
            const det = await fetchAuthJSON(`${API_BASE}/ChargingSessions/${s.chargingSessionId || s.id}`);
            return { ...s, ...det };
          } catch {
            return s;
          }
        })
      );

      const merged = detailed
        .map((s) => {
          const sessionId = s.chargingSessionId || s.id;
          const invoiceInfo = sessionToInvoiceStatus[sessionId];
          const invoiceStatus = invoiceInfo?.status || "UNPAID";

          const vId =
            s.vehicleId ??
            s.VehicleId ??
            s.vehicle?.vehicleId ??
            s.vehicle?.VehicleId ??
            null;
          const v = vehicleMap[vId] || {};

          let licensePlate = "—";
const vid = s.vehicleId ?? s.VehicleId;
const vFound = vehicleMap[String(vid)] || vehicleMap[vid];
if (vid && vehicleMap[String(vid)]) {
  licensePlate = vehicleMap[String(vid)].licensePlate || "—";
} else if (s.vehicle?.licensePlate) {
  licensePlate = s.vehicle.licensePlate;
}
console.log(
  `🔎 Phiên ${s.chargingSessionId}: vehicleId=${s.vehicleId} -> biển số=${licensePlate}`
);



          const companyId =
            s.companyId ??
            v.companyId ??
            v.CompanyId ??
            null;

          const custId = s.customerId ?? s.CustomerId;
          let customerType = "Khách bình thường";
          if (!custId || custId === 0) customerType = "Khách vãng lai";
          else if (companyId) customerType = "Xe công ty";

          if (customerType === "Xe công ty" && (!licensePlate || licensePlate === "—")) {
            const fallback = vehicleMap[vId];
            if (fallback && fallback.licensePlate) {
              licensePlate = fallback.licensePlate;
            }
          }

          return {
            ...s,
            energyKwh: s.energyKwh ?? s.energyUsed ?? 0,
            total: s.total ?? s.amount ?? 0,
            startedAt: s.startedAt ?? s.startTime,
            endedAt: s.endedAt ?? s.endTime,
            invoiceStatus,
            invoiceId: invoiceInfo?.invoiceId || null,
            customerType,
            licensePlate,
          };
        })
        .sort((a, b) => (b.chargingSessionId || 0) - (a.chargingSessionId || 0));

      setSessions(merged);
      setIsInitialLoad(false);
      // ==== Khởi tạo mô phỏng % pin nếu đang sạc ====
merged.forEach((s) => {
  const id = s.chargingSessionId;
  if (String(s.status).toLowerCase() === "charging" && s.startSoc != null) {
    // Giả định mỗi trụ có công suất và dung lượng
    const rate = calcRate(s.powerKw || 7, s.vehicleCapacityKwh || 60);
    const intervalId = setInterval(() => {
      setLiveProgress((prev) => {
        const current = prev[id]?.currentSoc ?? s.startSoc ?? 0;
        const nextSoc = Math.min(100, current + rate);
        return {
          ...prev,
          [id]: { currentSoc: nextSoc, timer: intervalId },
        };
      });
    }, 1000);
  }
});

    } catch (e) {
      console.error(e);
      setErr("Không thể tải danh sách phiên hoặc dữ liệu kWh!");
      setIsInitialLoad(false);
    } finally {
      setLoading(false);
    }
  }

  // 🟢 Hàm theo dõi session thực tế bằng API (GET /ChargingSessions/{id})
async function startTrackingSession(id) {
  try {
    const data = await fetchAuthJSON(`${API_BASE}/ChargingSessions/${id}`);
    const startSoc = data.startSoc ?? 0;
    setLiveProgress((prev) => ({ ...prev, [id]: { currentSoc: startSoc } }));

    const interval = setInterval(async () => {
      const info = await fetchAuthJSON(`${API_BASE}/ChargingSessions/${id}`);
      if (info.status === "Completed" || info.endedAt) {
        clearInterval(interval);
        console.log("✅ Phiên sạc", id, "đã hoàn tất");
        sessionStorage.removeItem("staffLiveSessionId");
      } else {
        setLiveProgress((prev) => {
          const current = prev[id]?.currentSoc ?? startSoc;
          const next = Math.min(100, current + 1);
          return { ...prev, [id]: { currentSoc: next } };
        });
      }
    }, 2000);
  } catch (err) {
    console.error("❌ Không thể theo dõi phiên:", err);
  }
}


  async function handleStopSession(s) {
    setConfirmDialog({ open: true, session: s });
  }

  async function confirmStopSession() {
    const s = confirmDialog.session;
    if (!s) return;
    setConfirmDialog({ open: false, session: null });

    try {
      const isGuest = !s.customerId || s.customerId === 0;
      const endpoint = isGuest
        ? `${API_BASE}/ChargingSessions/guest/end`
        : `${API_BASE}/ChargingSessions/end`;

      // 🔧 Lấy phần trăm hiện tại (mô phỏng thực tế)
// ✅ Lấy phần trăm pin cuối cùng (mô phỏng hoặc từ BE)
const finalSoc =
  liveProgress[s.chargingSessionId]?.currentSoc ??
  s.endSoc ??
  80;

// ✅ Tạo payload chính xác theo loại khách
const payload = isGuest
  ? {
      chargingSessionId: s.chargingSessionId,
      endSoc: Math.min(100, Math.round(finalSoc)), // /guest/end chỉ cần 2 field
    }
  : {
      chargingSessionId: s.chargingSessionId,
      endSoc: Math.min(100, Math.round(finalSoc)), // /end cần thêm idleMin
      idleMin: 0,
    };

// 🪶 Ghi log để kiểm tra dễ dàng
console.log("🛑 Gửi yêu cầu dừng phiên:", endpoint, payload);



      const res = await fetchAuthJSON(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const beData = res?.data || res;
      if (!beData) {
        setMessage({ type: "error", text: "❌ Không thể dừng phiên sạc!" });
        setTimeout(() => setMessage({ type: "", text: "" }), 5000);
        return;
      }

      // 🧾 Nếu là xe công ty → tự lấy companyId và tạo hóa đơn
try {
  // 🔍 Lấy companyId (ưu tiên từ beData hoặc session, fallback bằng Vehicles)
  let companyIdFinal = beData.companyId || s.companyId;

  if (!companyIdFinal && s.vehicleId) {
    try {
      const vInfo = await fetchAuthJSON(`${API_BASE}/Vehicles/${s.vehicleId}`);
      companyIdFinal =
        vInfo?.companyId || vInfo?.CompanyId || vInfo?.data?.companyId || null;
      console.log("🚗 CompanyId lấy từ xe:", companyIdFinal);
    } catch (err) {
      console.warn("Không lấy được thông tin xe:", err);
    }
  }

  if (companyIdFinal && Number(companyIdFinal) > 0) {
    const amount = beData.total || s.total || 0;
    const payloadInvoice = {
      companyId: companyIdFinal,
      billingMonth: new Date().getMonth() + 1,
      billingYear: new Date().getFullYear(),
      subtotal: amount,
      tax: Math.round(amount * 0.1),
      total: amount + Math.round(amount * 0.1),
      notes: `Tự động tạo từ phiên sạc #${s.chargingSessionId}`,
    };

    console.log("🧾 Gửi hóa đơn công ty:", payloadInvoice);

    const invRes = await fetchAuthJSON(`${API_BASE}/Invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadInvoice),
    });

    if (invRes?.invoiceId || invRes?.id || invRes?.success) {
      antdMessage.success(`✅ Đã tạo hóa đơn cho công ty ID ${companyIdFinal}`);
    } else {
      antdMessage.warning("⚠️ Đã gửi yêu cầu nhưng server không trả mã hóa đơn!");
    }
  }
} catch (err) {
  console.error("❌ Lỗi khi tạo hóa đơn công ty:", err);
  antdMessage.error("Không thể gửi hóa đơn cho công ty!");
}


      const orderId = `CHG${beData.chargingSessionId || Date.now()}`;
      const finalPayload = {
        orderId,
        ...beData,
        chargingSessionId: beData.chargingSessionId ?? s.chargingSessionId,
        customerId: beData.customerId ?? s.customerId ?? "—",
        licensePlate: s.licensePlate ?? "—",
        startedAt: beData.startedAt ?? s.startedAt ?? new Date().toISOString(),
        endedAt: beData.endedAt ?? new Date().toISOString(),
        energyKwh: beData.energyKwh ?? s.energyKwh ?? 0,
        total: beData.total ?? s.total ?? 0,
        invoiceStatus: "UNPAID",
      };

      sessionStorage.setItem(`chargepay:${orderId}`, JSON.stringify(finalPayload));
      setMessage({ type: "success", text: "✅ Phiên sạc đã dừng! Đang chuyển đến hóa đơn..." });
      // 🛑 Ngừng tăng % realtime khi dừng phiên
const sid = s.chargingSessionId;
if (liveProgress[sid]?.timer) {
  clearInterval(liveProgress[sid].timer);
  setLiveProgress((prev) => {
    const { [sid]: _, ...rest } = prev;
    return rest;
  });
}

      setTimeout(() => {
        navigate(`/staff/invoice?order=${orderId}`, {
          state: finalPayload,
          replace: true,
        });
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: `❌ Lỗi khi dừng phiên: ${err.message}` });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    } finally {
      // 🟢 Xóa ID khi staff dừng phiên
sessionStorage.removeItem("staffLiveSessionId");

      await loadSessions();
    }
  }

  /* ===== Filtering + Search ===== */
  const filteredSessions = sessions.filter((s) => {
    const matchSearch = search
      ? String(s.chargingSessionId)
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        String(s.licensePlate).toLowerCase().includes(search.toLowerCase())
      : true;
    const matchStatus =
      filterStatus === "all"
        ? true
        : filterStatus === "charging"
        ? (s.status || "").toLowerCase() === "charging"
        : (s.status || "").toLowerCase() !== "charging";
    return matchSearch && matchStatus;
  });

  const total = sessions.length;
  const chargingCount = sessions.filter(
    (s) => (s.status || "").toLowerCase() === "charging"
  ).length;
  const stoppedCount = total - chargingCount;

  const totalPages = Math.ceil(filteredSessions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSessions = filteredSessions.slice(
    startIndex,
    startIndex + pageSize
  );

  useEffect(() => {
  return () => {
    // Dọn các interval mô phỏng khi unmount
    Object.values(liveProgress).forEach((p) => {
      if (p?.timer) clearInterval(p.timer);
    });
  };
}, [liveProgress]);

  return (
    <div className="sess-wrap">
      <MessageBox
        type={message.type}
        message={message.text}
        visible={!!message.text}
        onClose={() => setMessage({ type: "", text: "" })}
      />
      
      <ConfirmDialog
        open={confirmDialog.open}
        title="Xác nhận dừng phiên sạc"
        message={`Bạn có chắc chắn muốn dừng phiên sạc #${confirmDialog.session?.chargingSessionId}?`}
        onConfirm={confirmStopSession}
        onCancel={() => setConfirmDialog({ open: false, session: null })}
        confirmText="Xác nhận"
        cancelText="Hủy"
        type="warning"
      />

      <div className="sess-card">
        <div className="sess-head">
          <h3>Phiên sạc (đang chạy / lịch sử)</h3>

          {myStations.length > 1 && (
            <select
              value={selectedStationId || ""}
              onChange={(e) => setSelectedStationId(Number(e.target.value))}
              className="station-select"
            >
              {myStations.map((st) => (
                <option key={st.stationId} value={st.stationId}>
                  {st.stationName}
                </option>
              ))}
            </select>
          )}

          <div className="sess-filters">
            <input
              type="text"
              placeholder="🔍 Tìm mã hoặc biển số..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">Tất cả</option>
              <option value="charging">Đang sạc</option>
              <option value="stopped">Đã dừng</option>
            </select>
            <button className="btn-light" onClick={loadSessions}>
              🔄 Làm mới
            </button>
          </div>
        </div>

        <div className="sess-summary">
          <span>🧾 Tổng số phiên: <strong>{total}</strong></span>
          <span>⚡ Đang sạc: <strong>{chargingCount}</strong></span>
          <span>✅ Đã dừng: <strong>{stoppedCount}</strong></span>
        </div>

        <div className="sess-table">
          <table>
            <thead>
              <tr>
                <th>Mã phiên</th>
                <th>Trụ</th>
                <th>Khách hàng</th>
                <th>Biển số</th>
                <th>Loại</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>% Bắt đầu</th>
<th>% Hiện tại</th>
                <th>kWh</th>
                <th>Chi phí</th>
                <th>TT</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="center muted">
                    Đang tải…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={11} className="center error">{err}</td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="center muted">
                    Không tìm thấy phiên phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((s) => (
                  <tr key={s.chargingSessionId}>
                    <td className="strong">S-{s.chargingSessionId}</td>
                    <td>{s.portId ?? "—"}</td>
                    <td>
  {(() => {
    const matched = users.find(
      (u) => String(u.accountId) === String(s.customerId)
    );
    return matched
      ? matched.fullName
      : s.customerId
      ? `#${s.customerId}`
      : "—";
  })()}
</td>


                    <td>{s.licensePlate}</td>
                    <td>
                      <span
                        className={`cust-type ${
                          s.customerType === "Khách vãng lai"
                            ? "guest"
                            : s.customerType === "Xe công ty"
                            ? "company"
                            : "normal"
                        }`}
                      >
                        {s.customerType}
                      </span>
                    </td>
                    <td>{fmtTime(s.startedAt)}</td>
                    <td>{fmtTime(s.endedAt)}</td>
                    <td>{s.startSoc != null ? `${Math.floor(s.startSoc)}%` : "—"}</td>
<td>
  {String(s.status).toLowerCase() === "charging"
    ? `${Math.floor(liveProgress[s.chargingSessionId]?.currentSoc ?? s.startSoc ?? 0)}%`
    : `${s.endSoc ?? s.startSoc ?? 0}%`}
</td>

                    <td>{s.energyKwh?.toFixed(2) ?? "—"}</td>
                    <td>{vnd(s.total)}</td>
                    <td>
                      <span
                        className={`pill ${
                          s.invoiceStatus === "PAID"
                            ? "paid"
                            : s.invoiceStatus === "UNPAID"
                            ? "unpaid"
                            : "charging"
                        }`}
                      >
                        {s.invoiceStatus}
                      </span>
                    </td>
                    <td>
                      {s.status?.toLowerCase() === "charging" ? (
                        <button
                          className="btn-dark"
                          onClick={() => handleStopSession(s)}
                        >
                          Dừng
                        </button>
                      ) : (
                        <button
                          className="btn-light"
                          onClick={() =>
                            navigate(
                              `/staff/invoice?order=S${s.chargingSessionId}`,
                              { state: s }
                            )
                          }
                        >
                          Chi tiết
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Thanh phân trang Ant Design */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredSessions.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      </div>
    </div>
  );
}
