import React, { useState } from "react";
import { Form, Input, Button, message, Card, Typography } from "antd";
import { MailOutlined, UserOutlined } from "@ant-design/icons";
import { forgotPassword } from "../../api/passwordRecoveryApi";

const { Title, Paragraph, Text } = Typography;

export default function ForgotPassword() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // ĐÚNG PAYLOAD: { userNameOrEmail }
      await forgotPassword({ userNameOrEmail: values.userNameOrEmail });
      message.success(
        "Nếu tài khoản tồn tại, email hướng dẫn đặt lại mật khẩu đã được gửi."
      );
      form.resetFields();
    } catch (err) {
      message.error(err?.message || "Gửi yêu cầu quên mật khẩu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
      <Card style={{ width: 480 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          Quên mật khẩu
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Nhập <Text strong>Email</Text> hoặc <Text strong>Tên đăng nhập</Text>{" "}
          bạn đã dùng. Chúng tôi sẽ gửi đường dẫn đặt lại mật khẩu nếu tài khoản
          tồn tại.
        </Paragraph>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ userNameOrEmail: "" }}
        >
          <Form.Item
            label="Email hoặc Tên đăng nhập"
            name="userNameOrEmail"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập email hoặc tên đăng nhập",
              },
              { min: 3, message: "Tối thiểu 3 ký tự" },
            ]}
          >
            <Input
              size="large"
              placeholder="vd: user@gmail.com hoặc username"
              prefix={<MailOutlined />}
              suffix={<UserOutlined />}
              autoComplete="username email"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={submitting}
              block
            >
              Gửi yêu cầu
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
