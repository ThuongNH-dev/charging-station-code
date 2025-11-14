import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, Input, Button, message, Card } from "antd";
import { LockOutlined, SafetyOutlined } from "@ant-design/icons";
import { resetPassword } from "../../api/passwordRecoveryApi";
import "./auth.css";
// <- nhớ import file CSS ở mục (3)

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const tokenFromUrl = useMemo(() => params.get("token") || "", [params]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await resetPassword({
        resetToken: values.resetToken,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      message.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
      navigate("/login", { replace: true });
    } catch (err) {
      message.error(err?.message || "Đặt lại mật khẩu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const validateConfirm = ({ getFieldValue }) => ({
    validator(_, value) {
      if (!value || getFieldValue("newPassword") === value)
        return Promise.resolve();
      return Promise.reject(new Error("Xác nhận mật khẩu không khớp"));
    },
  });

  return (
    <div className="login-wrapper">
      <Card className="login-card auth-card">
        <h3 className="login-title">Đặt lại mật khẩu</h3>
        <p className="auth-subtitle">
          Nhập mật khẩu mới cho tài khoản của bạn. Liên kết đặt lại có thể hết
          hạn sau một thời gian.
        </p>

        {!tokenFromUrl && (
          <div className="alert-warning" style={{ marginBottom: 16 }}>
            Không tìm thấy token trong đường dẫn. Vui lòng quay lại trang Quên
            mật khẩu để tạo token.
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            resetToken: tokenFromUrl,
            newPassword: "",
            confirmPassword: "",
          }}
        >
          <Form.Item
            label="Token đặt lại"
            name="resetToken"
            rules={[
              { required: true, message: "Thiếu token đặt lại mật khẩu" },
            ]}
          >
            <Input
              size="large"
              placeholder="Token từ email hoặc từ màn hình Quên mật khẩu"
              prefix={<SafetyOutlined />}
              readOnly={!!tokenFromUrl}
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu tối thiểu 6 ký tự" },
            ]}
            hasFeedback
          >
            <Input.Password
              size="large"
              placeholder="••••••"
              prefix={<LockOutlined />}
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu" },
              validateConfirm,
            ]}
            hasFeedback
          >
            <Input.Password
              size="large"
              placeholder="••••••"
              prefix={<LockOutlined />}
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 8 }}>
            <Button
              htmlType="submit"
              size="large"
              loading={submitting}
              className="auth-submit"
              block
            >
              Đặt lại mật khẩu
            </Button>
          </Form.Item>

          <Button
            type="link"
            className="auth-link-btn"
            block
            onClick={() => navigate("/login")}
          >
            Quay lại đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}
