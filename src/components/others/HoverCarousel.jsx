import React, { useEffect, useRef, useState } from "react";

/**
 * HoverCarousel - smooth auto-play fade version ✨
 * Props:
 * - images: string[]  => danh sách URL ảnh
 * - width, height: kích thước ảnh
 * - interval: thời gian đổi ảnh (ms)
 */
export default function HoverCarousel({
  images = [],
  width = 320,
  height = 140,
  interval = 2000, // ⏱️ đổi ảnh mỗi 2 giây (chậm hơn)
  radius = 14,
}) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  // ⏳ Tự động chạy
  useEffect(() => {
    if (images.length <= 1) return;

    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, interval);

    // Dọn dẹp khi unmount
    return () => clearInterval(timerRef.current);
  }, [images, interval]);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        position: "relative",
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* Lặp qua tất cả ảnh, ảnh nào đang active thì fade in */}
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            top: 0,
            left: 0,
            opacity: i === index ? 1 : 0,
            transition: "opacity 1.2s ease-in-out", // ⛅ chuyển mượt và chậm hơn
          }}
        />
      ))}
    </div>
  );
}
