import React from "react";
import { Layout } from "antd";
import Head from "../components/header/header";
import Foot from "../components/footer/footer";

const { Content } = Layout;

export default function MainLayout({ children }) {
  return (
    <Layout style={{ width: "100%", minHeight: "100vh", margin: 0 }}>
      <Head />
      <Content style={{ width: "100%", minWidth: 0, margin: 0, padding: 0 }}>
        {children}
      </Content>
      <Foot />
    </Layout>
  );
}
