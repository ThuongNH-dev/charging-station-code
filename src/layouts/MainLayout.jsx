import React from "react";
import { Layout } from "antd";
import Head from "../components/header/header";
import Foot from "../components/footer/footer";

const { Content } = Layout;

export default function MainLayout({ children }) {
  return (
    <Layout className="station-info">
      <Head />
      <Content>
        {children} {/* CHỈ render children, KHÔNG import/không render StationInfo ở đây */}
      </Content>
      <Foot />
    </Layout>
  );
}
