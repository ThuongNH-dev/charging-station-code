import React from "react";
import { Link } from "react-router-dom";
import "./style/StationListItem.css";

export default function StationListItem({ station }) {
  return (
    <Link
      to={`/stations/${station.id}`}
      className="sli-link"
      title={`Xem chi tiết ${station.name}`}
    >
      <article className="sli-card">
        <div className="sli-hero">
          <img
            src={station.coverImage}
            alt={station.name}
            loading="lazy"
          />
          <div className="sli-gradient" />
          <div className="sli-info">
            <h3 className="sli-title">{station.name}</h3>
            <p className="sli-sub">{station.address}</p>
          </div>

          <div className="sli-cta" aria-hidden>›</div>
        </div>
      </article>
    </Link>
  );
}
