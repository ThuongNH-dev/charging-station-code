import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input, Button, message } from "antd";
import { ThunderboltOutlined, SearchOutlined } from "@ant-design/icons";
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
const fmtAddress = (s = {}) =>
    s.address || s.Address || s.fullAddress || s.FullAddress || "—";

async function fetchOne(paths) {
    const list = Array.isArray(paths) ? paths : [paths];
    for (const p of list) {
        try {
            const url = p.startsWith("http") ? p : `${API_ABS}${p.startsWith("/") ? "" : "/"}${p}`;
            const res = await fetchAuthJSON(url, { method: "GET" });
            if (res) return res;
        } catch { /* try next */ }
    }
    throw new Error("Not found");
}

const pickCompanyId = (st, ch, g) => {
    const fromState = st?.companyId ?? st?.CompanyId ?? ch?.companyId ?? ch?.CompanyId ?? g?.companyId ?? g?.CompanyId;
    const fromStorage = Number(localStorage.getItem("companyId")) || Number(sessionStorage.getItem("companyId"));
    const n = toNumId(fromState ?? fromStorage);
    return Number.isFinite(n) ? n : null;
};

/* ===== Component ===== */
export default function ChargingSessionStart() {
    const navigate = useNavigate();
    const { state } = useLocation();

    const [station, setStation] = useState(state?.station || {});
    const [charger, setCharger] = useState(state?.charger || {});
    const [gun, setGun] = useState(state?.gun || state?.port || {});
    const [infoReady, setInfoReady] = useState(!!normId(gun) || !!normId(charger));

    const stationName = normText(station.name || station.StationName || station.title);
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

    // === STEP 1: Tra cứu từ BE (Port -> Charger -> Station)
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
            message.success("Đã tải thông tin trụ/đầu sạc từ máy chủ.");
        } catch (e) {
            console.error("[lookupInfo]", e);
            setInfoReady(false);
            setStation({});
            setCharger({});
            setGun({});
            message.error(e?.message || "Không tra cứu được thông tin từ máy chủ.");
        } finally {
            setLoadingLookup(false);
        }
    }

    // === STEP 2: Bắt đầu sạc (BE only)
    // Thêm helper nhẹ trong ChargingSessionStart:
    async function resolveFirstVehicleIdForCustomer(customerId) {
        try {
            // Nếu BE có filter theo customerId thì ưu tiên:
            const tryUrls = [
                `${API_ABS}/Vehicles?page=1&pageSize=10&customerId=${encodeURIComponent(customerId)}`,
                `${API_ABS}/Vehicles?page=1&pageSize=50`,
            ];
            for (const url of tryUrls) {
                const r = await fetchAuthJSON(url, { method: "GET" });
                const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
                if (!items.length) continue;
                const mine =
                    items.find(v =>
                        String(v?.customerId ?? v?.CustomerId) === String(customerId)
                    ) || items[0];
                const vid = Number(mine?.vehicleId ?? mine?.VehicleId ?? mine?.id ?? mine?.Id);
                if (Number.isFinite(vid) && vid > 0) return vid;
            }
        } catch { }
        return null;
    }

    async function handleStart() {
        if (!infoReady) {
            message.error("Vui lòng tra cứu ID trước khi bắt đầu sạc.");
            return;
        }

        const portId = toNumId(normId(gun));
        let vehicleId =
            toNumId(state?.vehicleId ?? state?.vehicle?.id ?? state?.vehicle?.vehicleId);
        let customerId = toNumId(
            state?.customerId ??
            state?.customer?.id ??
            (await resolveCustomerIdFromAuth(API_ABS))
        );
        const bookingRaw = state?.bookingId ?? state?.booking?.id ?? state?.booking?.bookingId ?? null;
        const nBooking = toNumId(bookingRaw);
        const bookingId = Number.isFinite(nBooking) ? nBooking : null;
        const companyId = pickCompanyId(state, charger, gun);

        if (!Number.isFinite(portId)) return message.error("Thiếu portId hợp lệ.");
        if (!Number.isFinite(customerId)) return message.error("Thiếu customerId hợp lệ.");

        // Nếu chưa có vehicleId thì cố lấy chiếc đầu tiên của customer:
        if (!Number.isFinite(vehicleId)) {
            vehicleId = await resolveFirstVehicleIdForCustomer(customerId);
        }
        if (!Number.isFinite(vehicleId)) {
            return message.error("Không tìm được vehicleId cho khách hàng này.");
        }

        // ✅ Không gọi BE ở đây; chỉ điều hướng kèm state để ChargingProgress tự POST /start
        navigate("/charging", {
            replace: true,
            state: {
                // context hiển thị
                station,
                charger,
                gun,
                // ids cần cho POST
                customerId,
                companyId: Number.isFinite(companyId) ? companyId : undefined,
                vehicleId,
                bookingId,          // có thể null
                portId,
                // optional: thông tin UI
                carModel: state?.carModel ?? undefined,
                plate: state?.plate ?? undefined,
                startedAt: Date.now(),
            },
        });
    }


    return (
        <MainLayout>
            <div className="cs-root">
                {/* Form nhập ID + TRA CỨU */}
                <div className="cs-start">
                    <label className="cs-input-label">Nhập ID trụ hoặc súng để tra cứu</label>
                    <div className="cs-input-row">
                        <Input
                            placeholder={`VD: ${idHints[0] || "P-1"}`}
                            value={typedId}
                            onChange={(e) => setTypedId(e.target.value)}
                            onPressEnter={lookupInfo}  // Enter chỉ tra cứu
                            size="large"
                        />
                        <Button size="large" icon={<SearchOutlined />} loading={loadingLookup} onClick={lookupInfo}>
                            Tra cứu
                        </Button>
                    </div>
                    <div className="cs-hints">
                        Gợi ý:&nbsp;
                        {idHints.map((h, i) => (
                            <React.Fragment key={h}>
                                <a
                                    href="#!"
                                    onClick={(e) => { e.preventDefault(); setTypedId(h); }}
                                    className="cs-hint"
                                >
                                    {h}
                                </a>
                                {i < idHints.length - 1 ? <span className="cs-dot"> • </span> : null}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Thông tin sau khi tra cứu */}
                <div className="cs-card">
                    <h3 className="cs-section-title">Thông tin đặt chỗ</h3>

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
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                        <Button
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
            </div>
        </MainLayout>
    );
}
