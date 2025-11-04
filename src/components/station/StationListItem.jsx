import React from "react";
import { Link } from "react-router-dom";
import "./style/StationListItem.css";

export default function StationListItem({ station }) {
  // Hỗ trợ cả dữ liệu cũ và từ API mới
  const id = station?.id ?? station?.stationId;
  const name = station?.name ?? station?.stationName ?? "—";
  const address = station?.address ?? "Đang cập nhật";
  const status = station?.status ?? "";
  const image =
    station?.coverImage ??
    station?.imageUrl ??
    "/assets/images/station-fallback.jpg"; // đặt 1 ảnh fallback local

  return (
    <Link
      to={`/stations/${id}`}
      className="sli-link"
      title={`Xem chi tiết ${name}`}
    >
      <article className="sli-card">
        <div className="sli-hero">
          <img
            src={image}
            alt={name}
            loading="lazy"
            onError={(e) => { e.currentTarget.src = "/assets/images/station-fallback.jpg"; }}
          />

          <div className="sli-gradient" />

          <div className="sli-info">
            <h3 className="sli-title">{name}</h3>
            <p className="sli-sub">{address}</p>
          </div>

          {!!status && <span className={`sli-badge sli-${status.toLowerCase()}`}>{status}</span>}

          <div className="sli-cta" aria-hidden>›</div>
        </div>
      </article>
    </Link>
  );
}
