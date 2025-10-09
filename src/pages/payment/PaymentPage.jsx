import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentPage.css';

/**
 * Component trang thanh toán cho hệ thống sạc xe điện
 * Hiển thị thông tin phiên sạc, form nhập thông tin thanh toán và hóa đơn
 */
const PaymentPage = () => {
  // Hook điều hướng trang
  const navigate = useNavigate();
  
  // State lưu phương thức thanh toán được chọn (mastercard, visa, vnpay, qr)
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  // State lưu thông tin form người dùng nhập
  const [formData, setFormData] = useState({
    hoTen: '',           // Họ tên khách hàng
    email: '',           // Email khách hàng
    sdt: '',             // Số điện thoại
    cardNumber: '',      // Số thẻ ngân hàng
    cardHolder: '',      // Tên chủ thẻ
    expiryDate: '',      // Ngày hết hạn thẻ (MM/YY)
    cvv: ''              // Mã bảo mật CVV
  });

  // State lưu thông tin phiên sạc xe điện
  const [chargingData, setChargingData] = useState({
    stationName: 'Trạm Vincom Thủ Đức - Trụ sạc AC – 1 pha',  // Tên trạm sạc
    congSuat: 60,        // Công suất sạc (kW)
    loaiCongSac: 'DC',   // Loại cổng sạc (AC/DC)
    thoiGianSac: '03:33:34',  // Thời gian sạc (hh:mm:ss)
    nangLuong: 34.3,     // Năng lượng tiêu thụ (kWh)
    phiSac: 4200,        // Đơn giá phí sạc (₫/kWh)
    phiPhat: 15000,      // Phí phạt (nếu có)
    phiDatCho: -40000,   // Phí đặt chỗ (âm là hoàn trả)
    giaGiam: 0           // Phần trăm giảm giá
  });

  // State lưu chi tiết các khoản phí đã tính toán
  const [costBreakdown, setCostBreakdown] = useState({
    phiSac: 0,      // Tổng phí sạc = năng lượng * đơn giá
    phiPhat: 0,     // Phí phạt
    phiDatCho: 0,   // Phí đặt chỗ
    tamTinh: 0,     // Tạm tính (chưa có thuế)
    tienThue: 0,    // Tiền thuế (10% tạm tính)
    giamGia: 0,     // Phần trăm giảm giá
    tong: 0         // Tổng cộng cuối cùng
  });

  // Effect tự động tính toán lại chi phí khi dữ liệu sạc thay đổi
  useEffect(() => {
    calculateCosts();
  }, [chargingData]);

  /**
   * Hàm tính toán tất cả các khoản phí
   * Công thức:
   * - Phí sạc = Năng lượng (kWh) × Đơn giá (₫/kWh)
   * - Tạm tính = Phí sạc + Phí phạt + Phí đặt chỗ
   * - Thuế = 10% × Tạm tính
   * - Tổng = Tạm tính + Thuế
   */
  const calculateCosts = () => {
    const phiSac = Math.round(chargingData.nangLuong * chargingData.phiSac);
    const phiPhat = chargingData.phiPhat;
    const phiDatCho = chargingData.phiDatCho;
    const tamTinh = phiSac + phiPhat + phiDatCho;
    const tienThue = Math.round(tamTinh * 0.1);  // Thuế VAT 10%
    const giamGia = chargingData.giaGiam;
    const tong = tamTinh + tienThue;

    // Cập nhật state với các giá trị đã tính
    setCostBreakdown({
      phiSac,
      phiPhat,
      phiDatCho,
      tamTinh,
      tienThue,
      giamGia,
      tong
    });
  };

  /**
   * Xử lý sự kiện thay đổi giá trị input trong form
   * @param {Event} e - Sự kiện change từ input
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Xử lý khi người dùng chọn phương thức thanh toán
   * @param {string} method - Phương thức thanh toán (mastercard, visa, vnpay, qr)
   */
  const handlePaymentSelect = (method) => {
    setSelectedPayment(method);
  };

  /**
   * Xử lý submit form thanh toán
   * Kiểm tra validation và chuyển sang trang kết quả
   * @param {Event} e - Sự kiện submit form
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Kiểm tra thông tin liên hệ bắt buộc
    if (!formData.hoTen || !formData.email || !formData.sdt) {
      alert('Vui lòng điền đầy đủ thông tin liên hệ');
      return;
    }

    // Kiểm tra thông tin thẻ nếu không thanh toán qua QR
    if (selectedPayment && selectedPayment !== 'qr' && 
        (!formData.cardNumber || !formData.cardHolder || !formData.expiryDate || !formData.cvv)) {
      alert('Vui lòng điền đầy đủ thông tin thẻ');
      return;
    }

    // Chuyển sang trang kết quả thanh toán, truyền dữ liệu qua state
    navigate('/payment-result', {
      state: {
        chargingData,
        costBreakdown
      }
    });
  };

  /**
   * Hàm format số tiền theo định dạng Việt Nam
   * @param {number} amount - Số tiền cần format
   * @returns {string} Chuỗi số tiền đã format (VD: 144,060 ₫)
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  return (
    <div className="payment-page">
      {/* Nút quay lại trang trước */}
      <div className="back-button">
        <button onClick={() => window.history.back()}>
          ← Quay về
        </button>
      </div>

      <div className="payment-container">
        {/* Cột trái: Form nhập thông tin thanh toán */}
        <div className="payment-left">
          <div className="payment-card">
            <h2 className="section-title">Xác nhận thông tin</h2>
            
            {/* Phần 1: Chọn phương thức thanh toán */}
            <div className="payment-methods">
              <h3>1. Phương thức thanh toán</h3>
              <div className="method-grid">
                {/* Mastercard */}
                <div 
                  className={`method-item ${selectedPayment === 'mastercard' ? 'active' : ''}`}
                  onClick={() => handlePaymentSelect('mastercard')}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" />
                </div>
                
                {/* Visa */}
                <div 
                  className={`method-item ${selectedPayment === 'visa' ? 'active' : ''}`}
                  onClick={() => handlePaymentSelect('visa')}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" />
                </div>
                
                {/* VNPAY */}
                <div 
                  className={`method-item ${selectedPayment === 'vnpay' ? 'active' : ''}`}
                  onClick={() => handlePaymentSelect('vnpay')}
                >
                  <div className="vnpay-logo">VNPAY</div>
                </div>
                
                {/* Thanh toán QR/Ví điện tử */}
                <div 
                  className={`method-item ${selectedPayment === 'qr' ? 'active' : ''}`}
                  onClick={() => handlePaymentSelect('qr')}
                >
                  <div className="qr-icon">📱 VÍ</div>
                </div>
              </div>
            </div>

            {/* Form nhập thông tin thẻ - chỉ hiện khi không chọn QR */}
            {selectedPayment && selectedPayment !== 'qr' && (
              <div className="card-info-section">
                <h3>Thông tin thẻ</h3>
                
                {/* Số thẻ */}
                <div className="form-group">
                  <input
                    type="text"
                    name="cardNumber"
                    placeholder="Số thẻ"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    maxLength="16"
                  />
                </div>
                
                {/* Tên chủ thẻ */}
                <div className="form-group">
                  <input
                    type="text"
                    name="cardHolder"
                    placeholder="Tên chủ thẻ"
                    value={formData.cardHolder}
                    onChange={handleInputChange}
                  />
                </div>
                
                {/* Ngày hết hạn và CVV trên cùng 1 hàng */}
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      name="expiryDate"
                      placeholder="MM/YY"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      maxLength="5"
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      name="cvv"
                      placeholder="CVV"
                      value={formData.cvv}
                      onChange={handleInputChange}
                      maxLength="3"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Phần 2: Thông tin liên hệ */}
            <div className="contact-info">
              <h3>2. Thông tin liên hệ</h3>
              
              {/* Họ tên */}
              <div className="form-group">
                <label>Họ tên</label>
                <input
                  type="text"
                  name="hoTen"
                  placeholder="Họ tên"
                  value={formData.hoTen}
                  onChange={handleInputChange}
                />
              </div>
              
              {/* Email */}
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              
              {/* Số điện thoại */}
              <div className="form-group">
                <label>SĐT</label>
                <input
                  type="tel"
                  name="sdt"
                  placeholder="Số điện thoại"
                  value={formData.sdt}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Hóa đơn thanh toán */}
        <div className="payment-right">
          <div className="invoice-card">
            <h2 className="invoice-title">Hoá đơn thanh toán</h2>
            
            {/* Phần 1: Thông tin phiên sạc */}
            <div className="invoice-section">
              <h3>1. Thông tin phiên sạc</h3>
              <div className="station-name">{chargingData.stationName}</div>
              
              {/* Công suất */}
              <div className="info-row">
                <span>Công suất:</span>
                <span>{chargingData.congSuat} kW {chargingData.loaiCongSac}</span>
              </div>
              
              {/* Loại cổng sạc */}
              <div className="info-row">
                <span>Loại cổng sạc:</span>
                <span>{chargingData.loaiCongSac}</span>
              </div>
              
              {/* Thời gian sạc */}
              <div className="info-row">
                <span>Thời gian sạc:</span>
                <span>{chargingData.thoiGianSac}</span>
              </div>
              
              {/* Năng lượng tiêu thụ */}
              <div className="info-row">
                <span>Năng lượng:</span>
                <span>{chargingData.nangLuong} kWh</span>
              </div>
            </div>

            {/* Phần 2: Chi tiết chi phí */}
            <div className="invoice-section">
              <h3>2. Chi phí</h3>
              
              {/* Phí sạc */}
              <div className="cost-row">
                <span>Phí sạc</span>
                <span>{formatCurrency(costBreakdown.phiSac)}</span>
              </div>
              
              {/* Phí phạt */}
              <div className="cost-row">
                <span>Phí phạt</span>
                <span>{formatCurrency(costBreakdown.phiPhat)}</span>
              </div>
              
              {/* Phí đặt chỗ */}
              <div className="cost-row">
                <span>Phí đặt chỗ</span>
                <span>{formatCurrency(costBreakdown.phiDatCho)}</span>
              </div>
              
              {/* Tạm tính (trước thuế) */}
              <div className="cost-row subtotal">
                <span>Tạm tính</span>
                <span>{formatCurrency(costBreakdown.tamTinh)}</span>
              </div>
              
              {/* Tiền thuế VAT */}
              <div className="cost-row">
                <span>Tiền thuế</span>
                <span>{formatCurrency(costBreakdown.tienThue)}</span>
              </div>
              
              {/* Giảm giá */}
              <div className="cost-row">
                <span>Giảm giá</span>
                <span>{costBreakdown.giamGia}%</span>
              </div>
              
              {/* Tổng cộng */}
              <div className="cost-row total">
                <span>Tổng</span>
                <span>{formatCurrency(costBreakdown.tong)}</span>
              </div>
            </div>

            {/* Phần QR Code để thanh toán */}
            <div className="qr-section">
              <div className="qr-placeholder">
                <div className="qr-text">QR Code</div>
                <small>Quét mã QR để thanh toán</small>
              </div>
            </div>

            {/* Nút thanh toán - disabled nếu chưa chọn phương thức */}
            <button 
              className="payment-button"
              onClick={handleSubmit}
              disabled={!selectedPayment}
            >
              Thanh Toán
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;