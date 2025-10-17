import React, { useEffect, useState } from "react";
import {
  CheckCircleFilled,
  ArrowUpOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import "./ServicePlans.css"; // ✅ vì file nằm cùng thư mục
import MainLayout from "../../layouts/MainLayout";

const ServicePlans = () => {
  const [businessPlans, setBusinessPlans] = useState([]);
  const [personalPlans, setPersonalPlans] = useState([]);

  //   // ✅ Kết nối API với Backend
  //   useEffect(() => {
  //     const fetchPlans = async () => {
  //       try {
  //         const response = await fetch("http://localhost:8080/api/plans");
  //         const data = await response.json();

  //         // Giả sử BE trả về: { business: [...], personal: [...] }
  //         setBusinessPlans(data.business || []);
  //         setPersonalPlans(data.personal || []);
  //       } catch (error) {
  //         console.error("Lỗi khi tải dữ liệu:", error);
  //       }
  //     };

  //     fetchPlans();
  //   }, []);

  useEffect(() => {
    // ✅ Dữ liệu ảo (mock data) để test UI
    const mockData = {
      business: [
        {
          id: 1,
          name: "Basic",
          price: 199000,
          discount: "Giảm 10% khi thanh toán năm",
          benefit: "Bao gồm 300 kWh/tháng, hỗ trợ ưu tiên 24/7",
        },
        {
          id: 2,
          name: "Pro",
          price: 399000,
          discount: "Giảm 15% cho khách hàng thân thiết",
          benefit: "Bao gồm 600 kWh/tháng, hỗ trợ kỹ thuật tận nơi",
        },
        {
          id: 3,
          name: "Plus",
          price: 699000,
          discount: "Miễn phí bảo trì trạm sạc 6 tháng",
          benefit: "Không giới hạn kWh, báo cáo chi tiết theo tháng",
        },
      ],
      personal: [
        {
          id: 4,
          name: "Silver",
          price: 99000,
          discount: "Tặng thêm 50 kWh tháng đầu tiên",
          benefit: "Phù hợp nhu cầu di chuyển ngắn, linh hoạt",
        },
        {
          id: 5,
          name: "Gold",
          price: 159000,
          discount: "Giảm 10% khi thanh toán năm",
          benefit: "Bao gồm 150 kWh/tháng, sạc nhanh ưu tiên",
        },
        {
          id: 6,
          name: "Diamond",
          price: 259000,
          discount: "Miễn phí 1 lần kiểm tra pin/năm",
          benefit: "Không giới hạn số lần sạc, hỗ trợ 24/7",
        },
      ],
    };

    // ✅ Mô phỏng độ trễ gọi API
    setTimeout(() => {
      setBusinessPlans(mockData.business);
      setPersonalPlans(mockData.personal);
    }, 800);
  }, []);

  return (
    <MainLayout>
      <div className="service-page">
        {/* Header */}
        <h2 className="title">Sạc thoải mái – Chi phí nhẹ nhàng</h2>
        <p className="subtitle">
          Gói sạc linh hoạt, ưu đãi giá tốt cho mọi chuyến đi
        </p>

        {/* Gói doanh nghiệp */}
        <section className="section">
          <h3 className="section-title">Gói Thuê Bao Dành Cho Doanh Nghiệp</h3>
          <div className="toggle">
            <button className="toggle-btn active">Tháng</button>
            <button className="toggle-btn">Năm -15%</button>
          </div>

          <div className="card-container">
            {businessPlans.length > 0 ? (
              businessPlans.map((plan) => (
                <div className="card" key={plan.id}>
                  <p className="name">{plan.name}</p>
                  <p className="price">
                    {plan.price.toLocaleString("vi-VN")} ₫
                  </p>
                  <p>{plan.discount}</p>
                  <p>{plan.benefit}</p>
                  <button className="upgrade-btn">
                    <ArrowUpOutlined /> Nâng cấp
                  </button>
                </div>
              ))
            ) : (
              <p>Đang tải gói doanh nghiệp...</p>
            )}
          </div>
        </section>

        {/* Gói cá nhân */}
        <section className="section">
          <h3 className="section-title">Gói Cước Dành Cho Cá Nhân</h3>
          <div className="toggle">
            <button className="toggle-btn active">Tháng</button>
            <button className="toggle-btn">Năm -15%</button>
          </div>

          <h4 className="subsection-title">Gói Hội Viên</h4>

          <div className="card-container">
            {personalPlans.length > 0 ? (
              personalPlans.map((plan) => (
                <div className="card" key={plan.id}>
                  <h4>{plan.name}</h4>
                  <p className="price">
                    {plan.price.toLocaleString("vi-VN")} ₫
                  </p>
                  <p>{plan.discount}</p>
                  <p>{plan.benefit}</p>
                  <button className="upgrade-btn">
                    <CheckCircleFilled /> Nâng cấp
                  </button>
                </div>
              ))
            ) : (
              <p>Đang tải gói cá nhân...</p>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default ServicePlans;
