// src/utils/chargeSessionCtx.js

const KEY_LAST = "charge:ctx:last"; // tiện xem gần nhất
const KEY_BY_ORDER = (orderId) => `charge:ctx:${orderId}`;

// Chỉ nhận số > 0
const asId = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function setChargeContext(ctx = {}) {
  try {
    const safe = {
      orderId: ctx.orderId ?? null,

      // IDs
      stationId: asId(ctx.stationId),
      chargerId: asId(ctx.chargerId),
      portId: asId(ctx.portId),

      // Codes (để fallback API by-code nếu có)
      stationCode: ctx.stationCode ?? null,
      chargerCode: ctx.chargerCode ?? null,
      portCode: ctx.portCode ?? null,

      // Thời điểm
      startedAt: ctx.startedAt ?? null,
      endedAt: ctx.endedAt ?? null,
    };

    // Lưu theo orderId nếu có
    if (safe.orderId) {
      sessionStorage.setItem(KEY_BY_ORDER(safe.orderId), JSON.stringify(safe));
    }
    sessionStorage.setItem(KEY_LAST, JSON.stringify(safe));
  } catch {}
}

export function getChargeContext(orderId) {
  try {
    if (orderId) {
      const s = sessionStorage.getItem(KEY_BY_ORDER(orderId));
      if (s) return JSON.parse(s);
    }
    const last = sessionStorage.getItem(KEY_LAST);
    return last ? JSON.parse(last) : null;
  } catch {
    return null;
  }
}

// Hỗ trợ merge: ưu tiên endData nếu có ID hợp lệ; thiếu thì lấy từ ctx
export function mergeIds(endData = {}, ctx = {}) {
  const pick = (k) =>
    (endData[k] ?? endData[k[0].toUpperCase() + k.slice(1)] ?? null);

  const merged = { ...endData };

  const stationId =
    asId(pick("stationId")) ?? asId(endData?.port?.stationId) ?? asId(ctx?.stationId);
  const chargerId =
    asId(pick("chargerId")) ?? asId(endData?.charger?.chargerId) ?? asId(ctx?.chargerId);
  const portId =
    asId(pick("portId")) ?? asId(endData?.port?.portId) ?? asId(ctx?.portId);

  const stationCode =
    endData?.stationCode ?? endData?.station?.code ?? ctx?.stationCode ?? null;
  const chargerCode =
    endData?.chargerCode ?? endData?.charger?.code ?? ctx?.chargerCode ?? null;
  const portCode =
    endData?.portCode ?? endData?.port?.code ?? ctx?.portCode ?? null;

  // Ghi thẳng về endData để các component khác dùng chung
  if (stationId) merged.stationId = stationId;
  if (chargerId) merged.chargerId = chargerId;
  if (portId) merged.portId = portId;

  if (stationCode) merged.stationCode = stationCode;
  if (chargerCode) merged.chargerCode = chargerCode;
  if (portCode) merged.portCode = portCode;

  return merged;
}
