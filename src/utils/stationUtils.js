// src/utils/stationUtils.js
export const AVAILABLE_CONNECTOR_TYPES = ["CCS2", "CHAdeMO", "Type2", "GB/T"];

export const normalizeStatus = (status) =>
  (status ?? "").toString().trim().toLowerCase();

export const isPortBusy = (status) => {
  const s = normalizeStatus(status);
  return ["busy", "charging", "inuse", "occupied"].includes(s);
};
