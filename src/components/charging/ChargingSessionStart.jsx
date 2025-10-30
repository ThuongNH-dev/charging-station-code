import React, { useEffect, useMemo, useState } from "react"; // NEW: +useEffect
import { useNavigate, useLocation } from "react-router-dom";
import { Input, Button, message } from "antd";
import { ThunderboltOutlined, CheckOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import { resolveCustomerIdFromAuth } from "../../api/authHelpers";
import "./ChargingSessionStart.css";

/* ===== Helpers ===== */
function normalizeApiBase(s) {
    const raw = (s || "").trim();
    if (!raw) return "https://localhost:7268/api";
    return raw.replace(/\/+$/, "");
}
const API_ABS = normalizeApiBase(getApiBase()) || "https://localhost:7268/api";

const toNumId = (v) => {
    const s = String(v ?? "").trim();
    if (!/^\d+$/.test(s)) return NaN;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : NaN;
};
const normId = (x) =>
    x?.id ?? x?.Id ?? x?.stationId ?? x?.StationId ?? x?.chargerId ?? x?.ChargerId ?? x?.portId ?? x?.PortId;
const normText = (x) => (x == null || x === "" ? "—" : x);
const fmtAddress = (s = {}) => s.address || s.Address || s.fullAddress || s.FullAddress || "—";

async function fetchOne(paths) {
    const list = Array.isArray(paths) ? paths : [paths];
    for (const p of list) {
        try {
            const url = p.startsWith("http") ? p : `${API_ABS}${p.startsWith("/") ? "" : "/"}${p}`;
            const res = await fetchAuthJSON(url, { method: "GET" });
            if (res) return res;
        } catch { }
    }
    throw new Error("Not found");
}

const pickCompanyId = (st, ch, g) => {
    const fromState = st?.companyId ?? st?.CompanyId ?? ch?.companyId ?? ch?.CompanyId ?? g?.companyId ?? g?.CompanyId;
    const fromStorage = Number(localStorage.getItem("companyId")) || Number(sessionStorage.getItem("companyId"));
    const n = toNumId(fromState ?? fromStorage);
    return Number.isFinite(n) ? n : null;
};

/* ===== Pricing helpers (copied/adapted from BookingPorts) ===== */
// NEW ↓↓↓
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const VI_TIME_RANGE = { Low: "Thấp điểm", Normal: "Bình thường", Peak: "Cao điểm" };
const viTimeRange = (tr) => VI_TIME_RANGE[tr] || tr;
const low = (s) => String(s ?? "").trim().toLowerCase();
const mkKey = (typeRaw, powerKw) => `${low(typeRaw)}|${Number(powerKw) || 0}`;
function parseKwFromText(txt) {
    const m = String(txt ?? "").match(/([\d.]+)/);
    return m ? Number(m[1]) : undefined;
}
// Low: 22:00–06:00 ; Peak: 17:00–22:00 ; còn lại Normal
function timeRangeOfHM(h, m) {
    const t = h * 60 + m;
    const inRange = (a, b, x) => (a <= b ? (x >= a && x < b) : (x >= a || x < b));
    if (inRange(22 * 60, 6 * 60, t)) return "Low";
    if (inRange(17 * 60, 22 * 60, t)) return "Peak";
    return "Normal";
}
// NEW ↑↑↑

/* ===== Component ===== */
export default function ChargingSessionStart() {
    const navigate = useNavigate();
    const { state } = useLocation();

    const [station, setStation] = useState(state?.station || {});
    const [charger, setCharger] = useState(state?.charger || {});
    const [gun, setGun] = useState(state?.gun || state?.port || {});
    const [infoReady, setInfoReady] = useState(!!normId(gun) || !!normId(charger));
    const [showInfo, setShowInfo] = useState(false); // 👈 chỉ hiện card sau khi xác nhận

    const stationName = normText(
        station.stationName || station.StationName || station.name || station.title
    );
    const stationAddress = fmtAddress(station);
    const chargerCode = normText(charger.code || charger.Code);
    const chargerType = normText(charger.type || charger.Type);
    const chargerPower =
        charger.powerLabel ||
        charger.power ||
        (Number.isFinite(charger.powerKw) ? `${charger.powerKw} kW` : charger.Power || charger.PowerKW || "—");
    const gunCode = gun.code || gun.Code || gun.name;
    const gunDisplay = gunCode || (normId(gun) ? `P-${normId(gun)}` : "—");

    // Gợi ý
    const idHints = useMemo(() => {
        const gid = normId(gun);
        const cid = normId(charger);
        const rawId = gid || cid || "1";
        const pish = `P-${gid || 1}`;
        const dash = `${cid || 1}-${gid || 1}`;
        return [String(rawId), pish, dash].filter(Boolean);
    }, [gun, charger]);

    const [typedId, setTypedId] = useState("");
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [starting, setStarting] = useState(false);

    /* ===== Pricing states & timers ===== */
    // NEW ↓↓↓
    const [pricingMap, setPricingMap] = useState(() => new Map());
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(t);
    }, []);
    // Tải PricingRule 1 lần khi mở trang (hoặc khi đã có token)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const pr = await fetchAuthJSON(`/PricingRule`);
                const items = Array.isArray(pr?.items) ? pr.items : (Array.isArray(pr) ? pr : []);
                const active = items.filter(r => low(r.status) === "active");

                const mp = new Map();
                for (const r of active) {
                    const key = mkKey(r.chargerType, r.powerKw);
                    const bucket = mp.get(key) || {};
                    bucket[low(r.timeRange)] = r;
                    mp.set(key, bucket);
                }
                if (alive) setPricingMap(mp);
            } catch (e) {
                console.warn("[ChargingSessionStart] Không tải được PricingRule:", e?.message);
                if (alive) setPricingMap(new Map());
            }
        })();
        return () => { alive = false; };
    }, []);
    // Xác định pricing hiện tại theo giờ “bắt đầu sạc ngay bây giờ”
    const currentPricing = useMemo(() => {
        if (!charger) return null;
        const typeRaw = charger.type ?? charger.Type ?? "";
        const kw = Number.isFinite(charger.powerKw)
            ? charger.powerKw
            : parseKwFromText(chargerPower);
        if (!typeRaw || !Number.isFinite(kw)) return null;

        const key = mkKey(typeRaw, kw);
        const bucket = pricingMap.get(key);
        if (!bucket) return null;

        const h = now.getHours();
        const m = now.getMinutes();
        const tr = timeRangeOfHM(h, m); // "Low" | "Normal" | "Peak"
        const r = bucket[low(tr)];
        if (!r) return null;

        return {
            ...r,
            timeRange: tr,
            label: `${viTimeRange(tr)} • ${vnd(r.pricePerKwh)}/kWh`,
        };
    }, [charger, chargerPower, pricingMap, now]);
    // NEW ↑↑↑

    // === XÁC NHẬN + TRA CỨU ===
    async function lookupInfo() {
        const parsePort = (s) => {
            if (!s) return null;
            const m = String(s).match(/(\d+)$/);
            return m ? Number(m[1]) : Number(s);
        };
        const portId = toNumId(parsePort(typedId) ?? normId(gun));
        if (!Number.isFinite(portId)) {
            message.error("Vui lòng nhập ID trụ/súng hợp lệ.");
            return;
        }

        setLoadingLookup(true);
        try {
            // Port
            const port = await fetchOne([`/Ports/${portId}`, `/ChargingPorts/${portId}`]);
            const resolvedPortId = port?.portId ?? port?.PortId ?? portId;
            setGun({ ...(port || {}), portId: resolvedPortId, id: resolvedPortId });

            // Charger
            const chId = port?.chargerId ?? port?.ChargerId ?? gun?.chargerId ?? gun?.ChargerId ?? normId(charger);
            if (!Number.isFinite(toNumId(chId))) throw new Error("Không tìm thấy trụ sạc từ port.");
            const chg = await fetchOne([`/Chargers/${chId}`, `/api/Chargers/${chId}`]);
            setCharger(chg || {});

            // Station
            const stId = chg?.stationId ?? chg?.StationId ?? normId(station);
            if (!Number.isFinite(toNumId(stId))) throw new Error("Không tìm thấy trạm từ trụ sạc.");
            const st = await fetchOne([`/Stations/${stId}`, `/api/Stations/${stId}`]);
            setStation(st || {});

            setInfoReady(true);
            setShowInfo(true); // 👈 hiện card sau khi xác nhận thành công
            message.success("Đã xác nhận và tải thông tin từ máy chủ.");
        } catch (e) {
            console.error("[lookupInfo]", e);
            setInfoReady(false);
            setShowInfo(false);
            setStation({});
            setCharger({});
            setGun({});
            message.error(e?.message || "Không tra cứu được thông tin từ máy chủ.");
        } finally {
            setLoadingLookup(false);
        }
    }

    // === BẮT ĐẦU SẠC (điều hướng để trang /charging tự POST /start) ===
    async function resolveFirstVehicleIdForCustomer(customerId) {
        try {
            const tryUrls = [
                `${API_ABS}/Vehicles?page=1&pageSize=10&customerId=${encodeURIComponent(customerId)}`,
                `${API_ABS}/Vehicles?page=1&pageSize=50`,
            ];
            for (const url of tryUrls) {
                const r = await fetchAuthJSON(url, { method: "GET" });
                const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
                if (!items.length) continue;
                const mine =
                    items.find((v) => String(v?.customerId ?? v?.CustomerId) === String(customerId)) || items[0];
                const vid = Number(mine?.vehicleId ?? mine?.VehicleId ?? mine?.id ?? mine?.Id);
                if (Number.isFinite(vid) && vid > 0) return vid;
            }
        } catch { }
        return null;
    }

    async function handleStart() {
        if (!infoReady) {
            message.error("Vui lòng xác nhận ID trước khi bắt đầu sạc.");
            return;
        }

        const portId = toNumId(normId(gun));
        let vehicleId = toNumId(state?.vehicleId ?? state?.vehicle?.id ?? state?.vehicle?.vehicleId);
        let customerId = toNumId(
            state?.customerId ?? state?.customer?.id ?? (await resolveCustomerIdFromAuth(API_ABS))
        );
        const bookingRaw = state?.bookingId ?? state?.booking?.id ?? state?.booking?.bookingId ?? null;
        const nBooking = toNumId(bookingRaw);
        const bookingId = Number.isFinite(nBooking) ? nBooking : null;
        const companyId = pickCompanyId(state, charger, gun);

        if (!Number.isFinite(portId)) return message.error("Thiếu portId hợp lệ.");
        if (!Number.isFinite(customerId)) return message.error("Thiếu customerId hợp lệ.");

        if (!Number.isFinite(vehicleId)) {
            vehicleId = await resolveFirstVehicleIdForCustomer(customerId);
        }
        if (!Number.isFinite(vehicleId)) {
            return message.error("Không tìm được vehicleId cho khách hàng này.");
        }

        navigate("/charging", {
            replace: true,
            state: {
                station,
                charger,
                gun,
                customerId,
                companyId: Number.isFinite(companyId) ? companyId : undefined,
                vehicleId,
                bookingId,
                portId,
                carModel: state?.carModel ?? undefined,
                plate: state?.plate ?? undefined,
                startedAt: Date.now(),
            },
        });
    }

    return (
        <MainLayout>
            <div className="cs-root">
                {/* Ô nhập + XÁC NHẬN */}
                <div className="cs-start">
                    <label className="cs-input-label">Nhập ID trụ hoặc súng để bắt đầu phiên sạc</label>
                    <div className="cs-input-row">
                        <Input
                            placeholder={`VD: ${idHints[0] || "1"}`}
                            value={typedId}
                            onChange={(e) => setTypedId(e.target.value)}
                            onPressEnter={() => {
                                if (typedId.trim()) lookupInfo();
                            }}
                            size="large"
                        />
                        <Button
                            className="cs-btn-green"
                            size="large"
                            icon={<CheckOutlined />}
                            loading={loadingLookup}
                            onClick={lookupInfo}
                            disabled={!typedId.trim()}
                            type="primary"
                        >
                            Xác nhận
                        </Button>
                    </div>

                    <div className="cs-hints">
                        Gợi ý:&nbsp;
                        {idHints.map((h, i) => (
                            <React.Fragment key={h}>
                                <a
                                    href="#!"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setTypedId(h);
                                    }}
                                    className="cs-hint"
                                >
                                    {h}
                                </a>
                                {i < idHints.length - 1 ? <span className="cs-dot"> • </span> : null}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Thông tin: chỉ hiện sau khi XÁC NHẬN thành công */}
                {showInfo && infoReady && (
                    <div className="cs-card">
                        <h3 className="cs-section-title">Xác nhận thông tin</h3>

                        <div className="cs-subcard">
                            <div className="cs-subtitle">Trạm sạc</div>
                            <div className="cs-rows">
                                <div className="cs-row">
                                    <div className="cs-label">Trạm</div>
                                    <div className="cs-value">{stationName}</div>
                                </div>
                                <div className="cs-row">
                                    <div className="cs-label">Địa chỉ</div>
                                    <div className="cs-value">{stationAddress}</div>
                                </div>
                            </div>
                        </div>

                        <div className="cs-subcard">
                            <div className="cs-subtitle">Trụ sạc</div>
                            <div className="cs-rows">
                                <div className="cs-row">
                                    <div className="cs-label">Mã trụ</div>
                                    <div className="cs-value">{normText(chargerCode)}</div>
                                </div>
                                <div className="cs-row">
                                    <div className="cs-label">Loại</div>
                                    <div className="cs-value">{normText(chargerType)}</div>
                                </div>
                                <div className="cs-row">
                                    <div className="cs-label">Công suất</div>
                                    <div className="cs-value">{normText(chargerPower)}</div>
                                </div>
                                <div className="cs-row">
                                    <div className="cs-label">Súng/Cổng</div>
                                    <div className="cs-value">{normText(gunDisplay)}</div>
                                </div>

                                {/* NEW: Giá áp dụng */}
                                <div className="cs-row">
                                    <div className="cs-label">Giá áp dụng</div>
                                    <div className="cs-value">
                                        {currentPricing
                                            ? `${vnd(currentPricing.pricePerKwh)}/kWh (${viTimeRange(currentPricing.timeRange)})`
                                            : (charger.price ? charger.price : "—")}
                                    </div>
                                </div>
                                {currentPricing && (
                                    <div className="cs-footnote">
                                        Áp dụng theo thời điểm bắt đầu sạc: <b>{String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}</b>. Giá chỉ mang tính tham khảo; hệ thống sẽ tính cuối cùng.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                            {/* Nút Bắt đầu sạc */}
                            <Button
                                className="cs-btn-green"
                                type="primary"
                                size="large"
                                icon={<ThunderboltOutlined />}
                                disabled={!infoReady}
                                loading={starting}
                                onClick={handleStart}
                            >
                                Bắt đầu sạc
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
