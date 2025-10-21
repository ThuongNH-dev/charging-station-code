import React, { useState } from "react";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import "./StationManagement.css";

export default function StationManagement() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <div className="station-page">
      <h2 className="admin-title">Quản lý Trạm & Điểm sạc</h2>

      {/* Thanh công cụ */}
      <div className="station-actions">
        <select>
          <option>Tất cả</option>
          <option>Đang hoạt động</option>
          <option>Bảo trì</option>
          <option>Ngoại tuyến</option>
        </select>
        <input type="text" placeholder="Tìm kiếm trạm..." />
        <button className="btn primary">
          <PlusOutlined /> Thêm trạm mới
        </button>
      </div>

      {/* Danh sách trạm */}
      <div className="station-list">
        <div className="station-card">
          <div className="station-header">
            <div>
              <h3>Trạm Q1-01</h3>
              <p>12 Lê Lợi, Quận 1, TP.HCM</p>
              <p>
                Công suất: 50kW | Giờ hoạt động: 06:00 - 23:00 | Giá: 5.000đ/kWh
              </p>
            </div>
            <span className="status-badge offline">Offline</span>
          </div>

          {/* --- Trụ P1 --- */}
          <div className="pole-section">
            <div className="pole-header">
              <h4>Trụ P1</h4>
              <div className="pole-actions">
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("editPole")}
                >
                  <EditOutlined />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("deletePole")}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>

            <div className="port-card">
              <div>
                <b>CCS - 50kW</b>
                <p>Công suất đỉnh: 50kW · Tải/ngày: 120kW</p>
              </div>
              <div className="status-row">
                <span className="badge ready">Sẵn sàng</span>

                {/* ✅ Thêm nút bắt đầu phiên sạc */}
                <button
                  className="btn small green"
                  onClick={() => setActiveModal("startSession")}
                >
                  Bắt đầu
                </button>

                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("editPort")}
                >
                  <EditOutlined />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("deleteConfirm")}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>

            <div className="port-card">
              <div>
                <b>CHAdeMO - 40kW</b>
                <p>Công suất đỉnh: 40kW · Tải/ngày: 25kW</p>
              </div>
              <div className="status-row">
                <span className="badge maintenance">Bảo trì</span>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("editPort")}
                >
                  <EditOutlined />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("deleteConfirm")}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>

            <button
              className="link-btn"
              onClick={() => setActiveModal("addPort")}
            >
              + Thêm cổng sạc
            </button>
          </div>

          {/* --- Trụ P2 --- */}
          <div className="pole-section">
            <div className="pole-header">
              <h4>Trụ P1</h4>
              <div className="pole-actions">
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("editPole")}
                >
                  <EditOutlined />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("deletePole")}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>

            <div className="port-card">
              <div>
                <b>Type 2 - 22kW</b>
                <p>Công suất đỉnh: 22kW · Tải/ngày: 30kW</p>
              </div>
              <div className="status-row">
                <span className="badge ready">Sẵn sàng</span>
                <button
                  className="btn small red"
                  onClick={() => setActiveModal("endSession")}
                >
                  Tổng kết
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("editPort")}
                >
                  <EditOutlined />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("deleteConfirm")}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>

            <div className="port-card">
              <div>
                <b>CCS - 22kW</b>
                <p>Công suất đỉnh: 22kW · Tải/ngày: 35kW</p>
              </div>
              <div className="status-row">
                <span className="badge maintenance">Bảo trì</span>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("editPort")}
                >
                  <EditOutlined />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setActiveModal("deleteConfirm")}
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>

            <button
              className="link-btn"
              onClick={() => setActiveModal("addPort")}
            >
              + Thêm cổng sạc
            </button>
          </div>

          <div className="station-footer">
            <button
              className="btn secondary"
              onClick={() => setActiveModal("deleteConfirm")}
            >
              Xóa trạm
            </button>
            <button
              className="btn primary"
              onClick={() => setActiveModal("addPole")}
            >
              Thêm trụ
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Modal hiển thị */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {activeModal === "startSession" && (
              <>
                <h3>Bắt đầu phiên sạc (Remote)</h3>
                <input type="text" placeholder="Biển số xe (VD: 51A-123.45)" />
                <input type="text" placeholder="Tên người dùng (tuỳ chọn)" />
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button
                    className="save green"
                    onClick={() => setActiveModal("endSession")}
                  >
                    Bắt đầu
                  </button>
                </div>
              </>
            )}

            {activeModal === "endSession" && (
              <>
                <h3>Tổng kết phiên sạc</h3>
                <p>Trạm: Q1-01 · Trụ: P2 · Cổng: CCS - 22kW</p>
                <p>Bắt đầu: 10:40:48 - 28/9/2025</p>
                <p>Kết thúc: 10:45:50 - 28/9/2025</p>
                <p>Thời lượng: 5 phút</p>
                <p>Năng lượng: 0.047 kWh</p>
                <p>Chi phí: 329đ</p>
                <div className="modal-actions">
                  <button
                    className="save blue"
                    onClick={() => setActiveModal(null)}
                  >
                    Đóng
                  </button>
                </div>
              </>
            )}

            {activeModal === "editPort" && (
              <>
                <h3>Sửa Cổng</h3>
                <select>
                  <option>CCS - 150kW</option>
                  <option>Type 2 - 22kW</option>
                </select>
                <input type="number" placeholder="Công suất (kW)" />
                <select>
                  <option>Sẵn sàng</option>
                  <option>Đang bận</option>
                  <option>Bảo trì</option>
                </select>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save">Lưu</button>
                </div>
              </>
            )}

            {activeModal === "addPort" && (
              <>
                <h3>Thêm Cổng Sạc</h3>
                <input type="text" placeholder="Mô tả (vd: CCS - 50kW)" />
                <input type="number" placeholder="Công suất (kW)" />
                <select>
                  <option>Sẵn sàng</option>
                  <option>Đang bận</option>
                  <option>Bảo trì</option>
                </select>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save">Tạo</button>
                </div>
              </>
            )}

            {activeModal === "addPole" && (
              <>
                <h3>Thêm Trụ</h3>
                <input type="text" placeholder="Tên trụ" />
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save">Lưu</button>
                </div>
              </>
            )}

            {activeModal === "deleteConfirm" && (
              <>
                <h3>Xác nhận xoá</h3>
                <p>Bạn có chắc muốn xoá? Hành động này không thể hoàn tác.</p>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="delete">Xoá</button>
                </div>
              </>
            )}

            {activeModal === "editPole" && (
              <>
                <h3>Sửa Trụ</h3>
                <input type="text" placeholder="Tên trụ (VD: P2)" />
                <input type="text" placeholder="Vị trí (VD: gần cổng chính)" />
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="save">Lưu</button>
                </div>
              </>
            )}

            {activeModal === "deletePole" && (
              <>
                <h3>Xác nhận xoá Trụ</h3>
                <p>
                  Bạn có chắc muốn xoá trụ này? Mọi cổng sạc bên trong sẽ bị
                  xóa.
                </p>
                <div className="modal-actions">
                  <button onClick={() => setActiveModal(null)}>Hủy</button>
                  <button className="delete">Xoá</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
