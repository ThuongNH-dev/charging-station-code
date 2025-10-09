import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import ChargersCard from "../../components/station/ChargersCard";
import "./BookingPorts.css";
// ⬇️ Sửa: dùng đúng tên component đã import
import ChargersGun from "../../components/station/ChargersGun";

const API_URL = "http://127.0.0.1:4000/stations";

// helper định dạng tiền
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function BookingPorts() {
  const { id, cid } = useParams(); // station id & charger id
  const [station, setStation] = useState(null);
  const [selectedGun, setSelectedGun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ================== PHẦN THỜI GIAN (đúng theo mô tả) ==================
  const MINUTE_STEPS = [0, 10, 20, 30, 40, 50];

  // "Bây giờ" cập nhật mỗi phút để luôn thời gian thực
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const nowHour = now.getHours();
  const nowMinute = now.getMinutes();

  // Ceil "bây giờ" lên mốc 10 phút kế tiếp (baseline)
  const ceilNowToNext10 = () => {
    let h = nowHour;
    let next10 = Math.ceil((nowMinute + 1) / 10) * 10; // +1 để chắc chắn > hiện tại
    if (next10 >= 60) {
      h = nowHour + 1;
      next10 = 0;
    }
    return { h, m: next10 };
  };

  const baseline = ceilNowToNext10(); // ví dụ 3:47 -> baseline 3:50
  // Min selectable = baseline + 60' (tối thiểu 1 giờ)
  const minSelAbsMin = (baseline.h * 60 + baseline.m) + 60;
  const minSelHour = Math.floor(minSelAbsMin / 60);
  const minSelMinute = minSelAbsMin % 60;

  // Còn đặt trong hôm nay không? (tối đa tới 23:50)
  const LAST_ABS_MIN = 23 * 60 + 50;
  const canBookToday = minSelAbsMin <= LAST_ABS_MIN;

  // Khởi tạo giờ/phút chọn = mốc nhỏ nhất hợp lệ (từng 10')
  const [startHour, setStartHour] = useState(() => Math.min(minSelHour, 23));
  const [startMinute, setStartMinute] = useState(() => minSelMinute);

  // Nếu "bây giờ" trôi khiến min chọn tăng → đẩy selection lên cho hợp lệ
  useEffect(() => {
    if (!canBookToday) return;
    if (startHour < minSelHour || (startHour === minSelHour && startMinute < minSelMinute)) {
      setStartHour(minSelHour);
      setStartMinute(minSelMinute);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowHour, nowMinute, minSelHour, minSelMinute, canBookToday]);

  // Minutes abs
  const nowAbsMin = nowHour * 60 + nowMinute;
  const baselineAbsMin = baseline.h * 60 + baseline.m;

  // Options: giờ từ minSelHour..23, phút theo bước 10' (giờ min thì phút >= minSelMinute)
  const hourOptions = useMemo(() => {
    const arr = [];
    for (let h = minSelHour; h <= 23; h++) arr.push(h);
    return arr;
  }, [minSelHour]);

  const minuteOptionsForHour = (h) => {
    if (h > minSelHour) return MINUTE_STEPS;
    // h === minSelHour -> chỉ những phút >= minSelMinute
    return MINUTE_STEPS.filter((m) => m >= minSelMinute);
  };

  // Tổng phút tính phí = max(60, selected - baseline)
  // -> đúng ví dụ: 3:47 (baseline 3:50) chọn 5:00 -> (300 - 230) = 70' (1h10)
  const totalMinutes = useMemo(() => {
    if (!canBookToday) return 0;
    const selAbs = startHour * 60 + startMinute;
    const diff = Math.max(0, selAbs - baselineAbsMin);
    if (diff === 0) return 0;
    return Math.max(60, diff);
  }, [startHour, startMinute, baselineAbsMin, canBookToday]);

  const totalHoursFloat = useMemo(() => (totalMinutes / 60), [totalMinutes]);
  // ================== HẾT PHẦN THỜI GIAN =================================

  // ================== TÍNH PHÍ (đơn giá theo phút) =======================
  const [parkingFee, setParkingFee] = useState(20000); // đ/giờ
  const perMinute = useMemo(() => parkingFee / 60, [parkingFee]);
  const bookingFee = useMemo(() => Math.round(totalMinutes * perMinute), [totalMinutes, perMinute]);
  // =======================================================================

  // load trạm
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/${id}`);
        if (!res.ok) throw new Error("Không tìm thấy trạm!");
        const data = await res.json();
        setStation(data);
      } catch (e) {
        setError(e.message || "Đã có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // lấy trụ theo cid
  const charger = useMemo(() => {
    return station?.chargers?.find((c) => String(c.id) === String(cid));
  }, [station, cid]);

  // Auto-chọn súng rảnh (và giữ nguyên nếu lựa chọn cũ vẫn còn rảnh)
  useEffect(() => {
    const guns = charger?.guns || [];
    if (!guns.length) {
      setSelectedGun(null);
      return;
    }
    if (selectedGun && guns.some(g => g.id === selectedGun.id && g.status === "available")) {
      return;
    }
    const firstAvail = guns.find(g => g.status === "available") || null;
    setSelectedGun(firstAvail);
  }, [charger, selectedGun]);

  // Action đặt chỗ (demo)
  const handleBook = async () => {
    if (!selectedGun || totalMinutes <= 0) return;
    try {
      const hh = String(startHour).padStart(2, "0");
      const mm = String(startMinute).padStart(2, "0");
      const hoursPretty = Math.floor(totalMinutes / 60);
      const minsPretty = totalMinutes % 60;
      alert(
        `Đặt chỗ thành công!\n` +
        `Giờ bắt đầu: ${hh}:${mm} hôm nay\n` +
        `Súng: ${selectedGun.name || selectedGun.id}\n` +
        `Thời lượng tính phí: ${hoursPretty} giờ ${minsPretty} phút\n` +
        `Tổng phí: ${vnd(bookingFee)}`
      );
    } catch (e) {
      alert("Có lỗi khi đặt chỗ!");
    }
  };

  if (loading) return <MainLayout><div>Đang tải dữ liệu...</div></MainLayout>;
  if (error) return <MainLayout><div className="error-text">Lỗi: {error}</div></MainLayout>;
  if (!station) return <MainLayout><div>Không có dữ liệu trạm.</div></MainLayout>;
  if (!charger) return <MainLayout><div>Không tìm thấy trụ để đặt.</div></MainLayout>;

  return (
    <MainLayout>
      <div className="bp-container">
        <Link to="/" className="bp-back">← Quay về</Link>
        <Link to={`/stations/${id}`} className="bp-back">← Quay về trạm</Link>

        <div className="bp-grid">
          {/* Cột trái */}
          <div className="bp-left-col">
            {/* Tóm tắt trạm */}
            <div className="bp-panel">
              <div className="bp-title">{station.name}</div>
              <div className="bp-subtle">{station.address}</div>
            </div>

            {/* Trụ đã chọn + biểu giá */}
            <div className="bp-panel-chargers">
              <ChargersCard charger={charger} />
              <div className="bp-charger-grid">
                <div className="bp-panel-note">
                  <div className="bp-note">Biểu giá dịch vụ sạc điện</div>
                  <div className="bp-price">{charger.price || "—"}</div>
                  <div className="bp-footnote">
                    © Biểu giá có thể thay đổi theo từng trạm và khung giờ.
                  </div>
                </div>

                {/* Chọn súng sạc */}
                <div className="bp-section">
                  <div className="bp-label">Chọn súng sạc</div>
                  <ChargersGun
                    guns={charger?.guns || []}
                    value={selectedGun}
                    onChange={setSelectedGun}
                    autoSelect={true}
                  />
                  {!selectedGun && (
                    <div className="bp-hint" style={{ marginTop: 8 }}>
                      Hiện không còn súng rảnh để đặt.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Khung giá demo */}
            <div className="bp-panel">
              <div className="bp-title">Khung giá</div>
              <div className="bp-table-wrapper">
                <table className="bp-table">
                  <thead>
                    <tr><th>Loại giá</th><th>Thời gian</th><th>Ngày</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Giờ thấp điểm</td><td>22:00 – 06:00</td><td>Tất cả các ngày</td></tr>
                    <tr><td>Giờ bình thường</td><td>06:00 – 17:00</td><td>Thứ 2–7</td></tr>
                    <tr><td>Giờ cao điểm</td><td>17:00 – 22:00</td><td>Thứ 2–7</td></tr>
                    <tr><td>Giờ CN</td><td>08:00 – 17:00</td><td>Chủ nhật</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cột phải */}
          <div>
            <div className="bp-panel">
              <div className="bp-title">Đặt trước trụ sạc</div>

              {/* Chọn giờ bắt đầu (bước 10', sau 4:50 nếu now=3:47) */}
              <div className="bp-section">
                <div className="bp-label">Giờ bắt đầu hôm nay</div>

                {!canBookToday && (
                  <div className="bp-hint" style={{ marginBottom: 8 }}>
                    Hiện đã quá muộn trong ngày. Vui lòng quay lại vào ngày mai.
                  </div>
                )}

                <div className="bp-time-row">
                  <div className="bp-time-col">
                    <div className="bp-subtle" style={{ marginBottom: 6 }}>Giờ</div>
                    <select
                      className="bp-input-select"
                      value={startHour}
                      onChange={(e) => {
                        let h = Number(e.target.value) || minSelHour;
                        // nếu chọn đúng giờ min, đảm bảo phút >= minSelMinute
                        const mins = minuteOptionsForHour(h);
                        let m = startMinute;
                        if (!mins.includes(m)) m = mins[0] ?? 0;
                        setStartHour(h);
                        setStartMinute(m);
                      }}
                      disabled={!canBookToday}
                    >
                      {hourOptions.map(h => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bp-time-col">
                    <div className="bp-subtle" style={{ marginBottom: 6 }}>Phút</div>
                    <select
                      className="bp-input-select"
                      value={startMinute}
                      onChange={(e) => {
                        const m = Number(e.target.value) || 0;
                        const mins = minuteOptionsForHour(startHour);
                        setStartMinute(mins.includes(m) ? m : (mins[0] ?? 0));
                      }}
                      disabled={!canBookToday}
                    >
                      {minuteOptionsForHour(startHour).map(m => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bp-hint">
                  Mốc nhỏ nhất: {String(minSelHour).padStart(2,"0")}:{String(minSelMinute).padStart(2,"0")}.
                  Phí tính từ {String(baseline.h).padStart(2,"0")}:{String(baseline.m).padStart(2,"0")} → giờ đã chọn, tối thiểu 60 phút.
                </div>
              </div>

              {/* Phí đặt chỗ (đ/giờ) */}
              <div className="bp-section">
                <div className="bp-label">Phí đặt chỗ</div>
                <select
                  value={parkingFee}
                  onChange={e => setParkingFee(Number(e.target.value))}
                  className="bp-input-select"
                >
                  <option value={20000}>20,000 đ/giờ (xe máy)</option>
                  <option value={40000}>40,000 đ/giờ (ô tô)</option>
                </select>
              </div>

              {/* Tổng phí */}
              <div className="bp-summary">
                <RowKV k="Cổng sạc" v={`${charger?.connector || "—"} • ${charger?.power || "—"}`} />
                <RowKV k="Súng" v={selectedGun ? (selectedGun.name || `Súng ${selectedGun.id}`) : "—"} />
                <RowKV k="Phí đặt chỗ / phút" v={vnd(perMinute)} />
                <RowKV
                  k="Tổng thời gian (phút)"
                  v={`${totalMinutes} phút (${totalHoursFloat.toFixed(2)} giờ)`}
                />
                <RowKV k="Tổng chi phí" v={<b>{vnd(bookingFee)}</b>} />
              </div>

              <button
                className="bp-btn-primary"
                disabled={!canBookToday || totalMinutes <= 0 || !selectedGun}
                onClick={handleBook}
              >
                Đặt ngay
              </button>
            </div>

            {/* Đánh giá demo */}
            <div className="bp-panel">
              <div className="bp-title with-mb">Đánh giá</div>
              <Review name="N***n" text="Nhân viên hỗ trợ tốt. Dịch vụ okie." />
              <Review name="Q***h" text="Sạc nhanh, vị trí dễ tìm." />
              <Review name="B***n" text="Nên đặt trước cuối tuần." />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function RowKV({ k, v }) {
  return (
    <div className="bp-row-kv">
      <span className="bp-row-kv-key">{k}</span>
      <span className="bp-row-kv-val">{v}</span>
    </div>
  );
}

function Review({ name, text }) {
  return (
    <div className="bp-review">
      <div className="bp-avatar" />
      <div>
        <div className="bp-review-head">
          <b>{name}</b><span>⭐️⭐️⭐️⭐️⭐️</span>
        </div>
        <div className="bp-subtle">{text}</div>
      </div>
    </div>
  );
}
