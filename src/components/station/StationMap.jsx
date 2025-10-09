// src/components/station/StationMap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "@goongmaps/goong-js/dist/goong-js.css";
import goongjs from "@goongmaps/goong-js";

export default function StationMap({ stations = [], onMarkerClick }) {
  const [err, setErr] = useState("");
  const mapRef = useRef(null);
  const elRef = useRef(null);

  // Lấy các điểm hợp lệ
  const points = useMemo(() =>
    (stations || [])
      .map(s => ({
        id: s.id,
        name: s.name,
        lat: Number(s.lat),
        lng: Number(s.lng),
      }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
  [stations]);

  // Chưa có điểm hoặc thiếu KEY → không render map để tránh crash
  const accessToken = import.meta.env?.VITE_GOONG_MAPTILES_KEY;
  const canRenderMap = Boolean(accessToken) && points.length > 0;

  useEffect(() => {
    if (!canRenderMap) return;              // đợi đủ điều kiện
    if (!elRef.current) return;

    try {
      goongjs.accessToken = accessToken;

      // Khởi tạo map
      const map = new goongjs.Map({
        container: elRef.current,
        style: "https://tiles.goong.io/assets/goong_map_web.json",
        center: [points[0].lng, points[0].lat],
        zoom: 11,
      });
      map.addControl(new goongjs.NavigationControl(), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        // Render markers
        try {
          const bounds = new goongjs.LngLatBounds();
          points.forEach(p => {
            const el = document.createElement("div");
            el.textContent = "⚡";
            el.style.cssText = `
              width:28px;height:28px;border-radius:50%;
              background:#2563eb;color:#fff;display:grid;place-items:center;
              box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer;font-weight:700;
            `;
            el.addEventListener("click", () => onMarkerClick && onMarkerClick(p.id));

            const mk = new goongjs.Marker(el).setLngLat([p.lng, p.lat]).addTo(map);
            (map._markers || (map._markers = [])).push(mk);
            bounds.extend([p.lng, p.lat]);
          });

          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
          }
        } catch (e) {
          console.error(e);
          setErr("Không thể hiển thị marker.");
        }
      });

      return () => {
        try { map.remove(); } catch {}
        mapRef.current = null;
      };
    } catch (e) {
      console.error(e);
      setErr("Khởi tạo bản đồ thất bại.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRenderMap, accessToken, points.map(p => `${p.lng},${p.lat}`).join("|")]);

  // UI: nếu không đủ điều kiện, trả ra khung placeholder thay vì crash
  if (!accessToken) {
    return (
      <div style={boxStyle}>
        <small style={{opacity:.7}}>Thiếu VITE_GOONG_MAPTILES_KEY trong .env</small>
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div style={boxStyle}>
        <small style={{opacity:.7}}>Không có toạ độ hợp lệ để vẽ bản đồ</small>
      </div>
    );
  }
  return (
    <>
      <div ref={elRef} style={boxStyle} />
      {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
    </>
  );
}

const boxStyle = {
  width: "100%",
  height: 420,
  borderRadius: 14,
  overflow: "hidden",
  background: "#f3f4f6",
  boxShadow: "0 8px 24px rgba(16,24,40,.08)",
};
