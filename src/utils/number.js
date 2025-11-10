// src/utils/number.js
export function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
