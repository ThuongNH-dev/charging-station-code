import React from "react";
import { Layout, Card } from "antd";
import Head from "../components/head/header";
import Foot from "../components/foot/footer";
import InfoDriver from "../pages/EnterInfo/InfoDriver";
import InfoEnterprise from "../pages/EnterInfo/InfoEnterprise";
import "./RegisterInfo.css";

const { Content } = Layout;

export default function RegisterInfo() {
  // Lấy role từ localStorage (hoặc mặc định là driver)
  const role = localStorage.getItem("role") || "driver";

  return (
    <Layout className="register-info">
      <Head />
      <Content
        style={{
          maxWidth: 1200,
          margin: "24px auto",
          padding: "0 16px",
          width: "100%",
        }}
      >
          {role === "enterprise" ? <InfoEnterprise /> : <InfoDriver />}
      </Content>
      <Foot />
    </Layout>
  );
}
