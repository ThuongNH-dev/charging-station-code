import React, { useEffect, useRef } from "react";
import "./GoongMiniMap.css";

export default function GoongMiniMap({ lat, lng, title="", height=220, zoom=15, mapKey }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const resolvedKey =
    mapKey ||
    (typeof import.meta !== "undefined"
      ? import.meta.env.VITE_GOONG_MAP_KEY
      : process.env.REACT_APP_GOONG_MAP_KEY);

  useEffect(() => {
    if (!window.goongjs || !mapDivRef.current || !resolvedKey) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    // Khởi tạo 1 lần
    if (!mapRef.current) {
      window.goongjs.accessToken = resolvedKey;
      mapRef.current = new window.goongjs.Map({
        container: mapDivRef.current,
        style: "https://tiles.goong.io/assets/goong_map_web.json",
        center: [lng, lat],
        zoom,
      });

      mapRef.current.on("error", (e) => console.error("Goong error:", e?.error || e));

      // 🔧 Quan trọng: quan sát kích thước container -> resize map
      resizeObserverRef.current = new ResizeObserver(() => {
        mapRef.current && mapRef.current.resize();
      });
      resizeObserverRef.current.observe(mapDivRef.current);

      // đảm bảo resize sau khi mount xong (tránh khung ban đầu là 0 width)
      requestAnimationFrame(() => mapRef.current && mapRef.current.resize());
    } else {
      // cập nhật viewport khi đổi toạ độ/zoom
      mapRef.current.flyTo({ center: [lng, lat], zoom, essential: true });
      // đảm bảo reflow đúng khi bạn đổi height prop
      mapRef.current.resize();
    }

    // marker/popup
    if (!markerRef.current) {
      markerRef.current = new window.goongjs.Marker().setLngLat([lng, lat]).addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
    if (title) {
      const popup = markerRef.current.getPopup?.() || new window.goongjs.Popup({ offset: 12 });
      popup.setHTML(
        `<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
           <div style="font-weight:600;margin-bottom:2px">${title}</div>
         </div>`
      );
      markerRef.current.setPopup(popup);
    }

    return () => {
      // ngừng quan sát khi unmount
      resizeObserverRef.current?.disconnect();
      // nếu muốn dọn tài nguyên hẳn:
      // markerRef.current?.remove();
      // mapRef.current?.remove();
    };
  }, [lat, lng, title, zoom, resolvedKey, height]);

  if (!resolvedKey) return <div style={{ color: "red" }}>Thiếu GOONG_MAP_KEY</div>;

  return (
    <div
      ref={mapDivRef}
      className="goong-mini-map"
      style={{ height }}          // height theo prop
      aria-label="Bản đồ trạm"
    />
  );
}
