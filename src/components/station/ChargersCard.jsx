import React from "react";

export default function ChargersCard({ charger }) {
  if (!charger) return null;

  // map connector -> AC/DC/Khác
  const getPortType = (connector = "") => {
    if (/type\s*2/i.test(connector)) return "AC";
    if (/(ccs|chademo)/i.test(connector)) return "DC";
    return connector || "—";
  };

  // map status -> nhãn tiếng Việt
  const statusLabel =
    charger.status === "available" ? "Trống" :
    charger.status === "busy" ? "Đang dùng" :
    charger.status === "full" ? "Đầy trụ" :
    charger.status === "maintenance" ? "Bảo trì":
    charger.status || "—";

  return (
    <div className="chargerItem">
      {/* Ảnh (nếu có), không thì placeholder */}
      {charger.imageUrl ? (
        <img className="thumb" src={charger.imageUrl} alt={charger.title || "Charger"} />
      ) : (
        <div className="thumb" />
      )}

      <div className="chargerBody">
        <div className="chargerTitle">{charger.title}</div>

        <div className="row">
          <span className="label">Công suất:</span>
          <span>{charger.power || "—"}</span>
        </div>

        <div className="row">
          <span className="label">Tình trạng trụ:</span>
          <span>{statusLabel}</span>
        </div>

        <div className="row">
          <span className="label">Loại cổng sạc:</span>
          <span>{getPortType(charger.connector)}</span>
        </div>

        <div className="groupTitle">Tốc độ sạc:</div>
        <ul className="bullets">
          <li>8 – 12 tiếng cho ô tô</li>
          <li>4 – 6 tiếng cho xe máy điện</li>
        </ul>

        <div className="row priceRow">
          <span className="label">Giá cả:</span>
          <span className="price">{charger.price || "—"}</span>
        </div>
      </div>
    </div>
  );
}
