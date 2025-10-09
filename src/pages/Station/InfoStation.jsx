import React, { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import StationListItem from "../../components/station/StationListItem";
import "./InfoStation.css";

const API_URL = "http://127.0.0.1:4000/stations";

export default function InfoStation() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Lỗi khi tải dữ liệu!");
        return res.json();
      })
      .then((data) => setStations(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MainLayout>
      {loading && <div>Đang tải dữ liệu...</div>}
      {error && <div className="is-error">Lỗi: {error}</div>}

      {!loading && !error && (
        <>
          <h2 className="is-heading">Danh sách trạm sạc</h2>
          {stations.length === 0 ? (
            <p>Không có dữ liệu trạm sạc</p>
          ) : (
            <div className="stationListGrid">
              {stations.map((station) => (
                <StationListItem key={station.id} station={station} />
              ))}
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
}
