import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, Input, Button, message, Card, Typography, Alert } from "antd";
import { LockOutlined, SafetyOutlined } from "@ant-design/icons";
import { resetPassword } from "../../api/passwordRecoveryApi";

const { Title, Paragraph, Text } = Typography;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Lấy token từ URL (?token=...)
  const tokenFromUrl = useMemo(() => params.get("token") || "", [params]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // ĐÚNG PAYLOAD: { resetToken, newPassword, confirmPassword }
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
      if (!value || getFieldValue("newPassword") === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error("Xác nhận mật khẩu không khớp"));
    },
  });

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
      <Card style={{ width: 520 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          Đặt lại mật khẩu
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Nhập mật khẩu mới cho tài khoản của bạn. Liên kết đặt lại có thể hết
          hạn sau một thời gian.
        </Paragraph>

        {!tokenFromUrl && (
          <Alert
            type="warning"
            showIcon
            message="Thiếu token"
            description="Không tìm thấy token trong đường dẫn. Vui lòng mở lại liên kết từ email."
            style={{ marginBottom: 16 }}
          />
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
              placeholder="Token từ đường link email"
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
              type="primary"
              htmlType="submit"
              size="large"
              loading={submitting}
              block
            >
              Đặt lại mật khẩu
            </Button>
          </Form.Item>

          <Button type="link" block onClick={() => navigate("/login")}>
            Quay lại đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}
