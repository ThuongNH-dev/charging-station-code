import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentPage.css';

const PaymentResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Lấy data từ PaymentPage (hoặc dùng default nếu không có)
  const { chargingData, costBreakdown } = location.state || {
    chargingData: {
      stationName: 'Trạm Vincom Thủ Đức - Trụ sạc AC – 1 pha',
      congSuat: 60,
      loaiCongSac: 'DC',
      thoiGianSac: '03:33:34',
      nangLuong: 34.3
    },
    costBreakdown: {
      phiSac: 143750,
      phiPhat: 15000,
      phiDatCho: -40000,
      tamTinh: 118750,
      tienThue: 11875,
      giamGia: 0,
      tong: 130625
    }
  };

  useEffect(() => {
    // Simulate payment processing
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3;
      setPaymentStatus(isSuccess ? 'success' : 'failed');
    }, 1500);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);
    const date = now.toLocaleDateString('vi-VN');
    return `${time} ${date}`;
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRetry = () => {
    navigate('/payment');
  };

  return (
    <div className="payment-page">
      <div className="payment-container-center">
        <div className="status-page">
          <div className="invoice-card-status">
            <h2 className="invoice-title">Hoá đơn thanh toán</h2>
            
            <div className="invoice-section">
              <h3>1. Thông tin phiên sạc</h3>
              <div className="station-name">{chargingData.stationName}</div>
              <div className="info-row">
                <span>Công suất:</span>
                <span>{chargingData.congSuat} kW {chargingData.loaiCongSac}</span>
              </div>
              <div className="info-row">
                <span>Loại cổng sạc:</span>
                <span>{chargingData.loaiCongSac}</span>
              </div>
              <div className="info-row">
                <span>Thời gian sạc:</span>
                <span>{chargingData.thoiGianSac}</span>
              </div>
              <div className="info-row">
                <span>Năng lượng:</span>
                <span>{chargingData.nangLuong} kWh</span>
              </div>
            </div>

            <div className="invoice-section">
              <h3>2. Chi phí</h3>
              <div className="cost-row">
                <span>Phí sạc</span>
                <span>{formatCurrency(costBreakdown.phiSac)}</span>
              </div>
              <div className="cost-row">
                <span>Phí phạt</span>
                <span>{formatCurrency(costBreakdown.phiPhat)}</span>
              </div>
              <div className="cost-row">
                <span>Phí đặt chỗ</span>
                <span>{formatCurrency(costBreakdown.phiDatCho)}</span>
              </div>
              <div className="cost-row subtotal">
                <span>Tạm tính</span>
                <span>{formatCurrency(costBreakdown.tamTinh)}</span>
              </div>
              <div className="cost-row">
                <span>Tiền thuế</span>
                <span>{formatCurrency(costBreakdown.tienThue)}</span>
              </div>
              <div className="cost-row">
                <span>Giảm giá</span>
                <span>{costBreakdown.giamGia}%</span>
              </div>
              <div className="cost-row total">
                <span>Tổng</span>
                <span>{formatCurrency(costBreakdown.tong)}</span>
              </div>
            </div>
          </div>

          <div className="status-result-card">
            {paymentStatus === null && (
              <div className="loading-status">
                <div className="spinner-large"></div>
                <h2>Đang xử lý thanh toán...</h2>
              </div>
            )}
            
            {paymentStatus === 'success' && (
              <div className="status-content-page success">
                <div className="status-icon-large">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="#10b981" opacity="0.1"/>
                    <circle cx="60" cy="60" r="46" fill="#10b981"/>
                    <path d="M35 60 L52 77 L85 44" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="status-title success">Thanh toán thành công</h2>
                <p className="status-time">{getCurrentDateTime()}</p>
                <p className="status-message">Hoá đơn đã được gửi về email của bạn</p>
                <button className="status-button" onClick={handleGoHome}>
                  Quay về trang chủ
                </button>
              </div>
            )}
            
            {paymentStatus === 'failed' && (
              <div className="status-content-page failed">
                <div className="status-icon-large">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="#ef4444" opacity="0.1"/>
                    <circle cx="60" cy="60" r="46" fill="#ef4444"/>
                    <path d="M45 45 L75 75 M75 45 L45 75" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="status-title failed">Thanh toán thất bại</h2>
                <p className="status-time">{getCurrentDateTime()}</p>
                <p className="status-message">Đã có trục trặc trong quá trình thanh toán</p>
                <button className="status-button" onClick={handleRetry}>
                  Quay lại trang thanh toán
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;