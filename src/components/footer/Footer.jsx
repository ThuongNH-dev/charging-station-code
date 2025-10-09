import React from "react";
import { Layout } from "antd";
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FacebookFilled,
  LinkedinFilled,
  InstagramFilled,
  YoutubeFilled,
} from "@ant-design/icons";

const { Footer } = Layout;

const Foot = () => {
  return (
    <Footer
      style={{
        background: "#fff",
        borderTop: "1px solid #f0f0f0",
        padding: "40px 80px 20px",
        color: "#333",
      }}
    >
      {/* --- Phần nội dung chính --- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1.5fr 1fr",
          gap: "40px",
          marginBottom: 20,
        }}
      >
        {/* Giới thiệu */}
        <div>
          <h3 style={{ color: "#006d32", marginBottom: 12 }}>Giới Thiệu</h3>
          <p style={{ marginBottom: 8 }}>
            Hệ thống quản lý trạm sạc điện mang đến trải nghiệm sạc nhanh, dễ dàng
            và minh bạch cho khách hàng.
          </p>
          <p>
            Đồng thời hỗ trợ nhân viên và quản trị viên giám sát, vận hành và tối ưu
            hiệu quả hoạt động.
          </p>
        </div>

        {/* Liên kết */}
        <div>
          <h3 style={{ color: "#006d32", marginBottom: 12 }}>Liên Kết</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: "2" }}>
            <li>
              <a href="#" style={{ color: "#333", textDecoration: "none" }}>
                Chính sách & thủ tục thuê
              </a>
            </li>
            <li>
              <a href="#" style={{ color: "#333", textDecoration: "none" }}>
                Chính sách bảo mật
              </a>
            </li>
            <li>
              <a href="#" style={{ color: "#333", textDecoration: "none" }}>
                Điều khoản dịch vụ
              </a>
            </li>
          </ul>
        </div>

        {/* Thông tin liên hệ */}
        <div>
          <h3 style={{ color: "#006d32", marginBottom: 12 }}>Thông tin liên hệ</h3>
          <p style={{ marginBottom: 8 }}>
            <EnvironmentOutlined style={{ marginRight: 8, color: "#006d32" }} />
            Văn phòng: 123 Đường Trạm Sạc, Quận 7, TP.HCM
          </p>
          <p style={{ marginBottom: 8 }}>
            <MailOutlined style={{ marginRight: 8, color: "#006d32" }} />
            Email: tramsac@gmail.com
          </p>
          <p>
            <PhoneOutlined style={{ marginRight: 8, color: "#006d32" }} />
            SĐT: 0912 345 678
          </p>
        </div>

        {/* Fanpage */}
        <div>
          <h3 style={{ color: "#006d32", marginBottom: 12 }}>Fanpage</h3>
          <div style={{ display: "flex", gap: 12 }}>
            <a href="#" style={{ color: "#333" }}>
              <FacebookFilled style={{ fontSize: 22 }} />
            </a>
            <a href="#" style={{ color: "#333" }}>
              <LinkedinFilled style={{ fontSize: 22 }} />
            </a>
            <a href="#" style={{ color: "#333" }}>
              <InstagramFilled style={{ fontSize: 22 }} />
            </a>
            <a href="#" style={{ color: "#333" }}>
              <YoutubeFilled style={{ fontSize: 22 }} />
            </a>
          </div>
        </div>
      </div>

      {/* --- Dòng bản quyền --- */}
      <div
        style={{
          borderTop: "1px solid #f0f0f0",
          paddingTop: 12,
          textAlign: "center",
          fontSize: 14,
          color: "#666",
        }}
      >
        © Copyright {new Date().getFullYear()} | Charge Station
      </div>
    </Footer>
  );
};

export default Foot;
