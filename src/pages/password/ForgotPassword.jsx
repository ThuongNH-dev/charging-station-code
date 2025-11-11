import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  message,
  Card,
  Typography,
  Alert,
  Space,
} from "antd";
import {
  MailOutlined,
  UserOutlined,
  CopyOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../api/passwordRecoveryApi";
import "./auth.css";
// <- nhớ import file CSS ở mục (3)

const { Text } = Typography;

export default function ForgotPassword() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setSubmitting(true);
    setServerMsg("");
    setResetToken(null);
    try {
      const { message: msg, token } = await forgotPassword({
        userNameOrEmail: values.userNameOrEmail,
      });

      setServerMsg(msg || "");
      setResetToken(token || null);

      if (!token) {
        message.success(
          "Nếu tài khoản tồn tại, email hướng dẫn đặt lại mật khẩu đã được gửi."
        );
        form.resetFields();
      } else {
        message.success("Đã tạo token đặt lại mật khẩu.");
      }
    } catch (err) {
      message.error(err?.message || "Gửi yêu cầu quên mật khẩu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const toResetPage = () => {
    if (!resetToken) return;
    navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`);
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(resetToken || "");
      message.success("Đã sao chép token");
    } catch {
      message.warning("Không thể sao chép token, vui lòng copy thủ công.");
    }
  };

  return (
    <div className="login-wrapper">
      <Card className="login-card auth-card">
        <h3 className="login-title">Quên mật khẩu</h3>
        <p className="auth-subtitle">
          Nhập <strong>Email</strong> hoặc <strong>Tên đăng nhập</strong>. Nếu
          đúng, hệ thống sẽ tạo token đặt lại và/hoặc gửi hướng dẫn qua email.
        </p>

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
              htmlType="submit"
              size="large"
              loading={submitting}
              className="auth-submit"
              block
            >
              Gửi yêu cầu
            </Button>
          </Form.Item>
        </Form>

        {/* Phản hồi từ BE */}
        {serverMsg ? (
          <Alert
            type="info"
            showIcon
            message="Phản hồi hệ thống"
            description={
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {serverMsg}
              </pre>
            }
            style={{ marginTop: 8 }}
          />
        ) : null}

        {/* Nếu có token thì show panel hành động */}
        {resetToken ? (
          <div className="token-panel">
            <span className="token-label">Token đặt lại:</span>
            <code className="token-badge">{resetToken}</code>
            <div className="inline-actions">
              <Button
                icon={<LinkOutlined />}
                type="primary"
                onClick={toResetPage}
              >
                Dùng token để đặt lại
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={copyToken}
                className="btn-ghost"
              >
                Sao chép token
              </Button>
              <Space size={0} />
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
