import React, { useState } from "react";
import { ItalicOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { HiOutlineUserGroup } from "react-icons/hi";
import "./Register.css";
<link
  href="https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap"
  rel="stylesheet"
/>;

const RegisterSelect = () => {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const handleSelect = (role) => {
    setSelected(role);
    navigate(`/register/${role}`);
  };

  return (
    <div className="register-bg">
      <div className="register-card register-card-select text-white ">
        <h2
          className="font-Sử mb-2"
          style={{
            fontSize: 30,
          }}
        >
          CHÀO MỪNG BẠN!
        </h2>
        <p className="mb-8" style={{ fontSize: 16 }}>
          Hãy chọn vai trò để bắt đầu hành trình cùng chúng tôi
        </p>

        <div className="register-options">
          <button
            aria-label="Chọn vai trò cá nhân"
            onClick={() => handleSelect("personal")}
            className={`register-option ${
              selected === "personal" ? "selected" : ""
            }`}
          >
            <UserOutlined className="register-option-icon" />
            <p className="mt-2 font-medium">Cá nhân</p>
          </button>

          <button
            aria-label="Chọn vai trò doanh nghiệp"
            onClick={() => handleSelect("business")}
            className={`register-option ${
              selected === "business" ? "selected" : ""
            }`}
          >
            <HiOutlineUserGroup className="register-option-icon" />
            <p className="mt-2 font-medium">Doanh nghiệp</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterSelect;
