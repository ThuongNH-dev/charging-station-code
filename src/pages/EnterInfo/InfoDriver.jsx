import React from "react";
import {
  Typography,
  Card,
  Form,
  Row,
  Col,
  Button,
  Checkbox,
  message,
  ConfigProvider,
} from "antd";
import CarField from "../../components/form/Info/CarField";
import PaymentField from "../../components/form/Info/PaymentField";

const { Title } = Typography;

// API mock
const API_URL = "https://68e218228943bf6bb3c59976.mockapi.io/Account/driver";

export default function InfoDriver() {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  // ✅ dùng hook để hiển thị message đúng context/theme
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Gửi dữ liệu thất bại!");

      const data = await res.json();
      console.log("MockAPI response:", data);
      messageApi.success("Đã lưu dữ liệu thành công!");
      form.resetFields();
    } catch (err) {
      console.error(err);
      messageApi.error(err.message || "Có lỗi xảy ra khi gửi dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Disable nút khi chưa tick + có lỗi
  const values = Form.useWatch([], form);
  const [submittable, setSubmittable] = React.useState(false);
  React.useEffect(() => {
    const hasErrors = form.getFieldsError().some(({ errors }) => errors.length);
    const agreed = form.getFieldValue("agree");
    setSubmittable(!hasErrors && !!agreed);
  }, [values, form]);

  return (
    <div style={{ padding: "30px 16px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 1080 }}>
        {/* 👇 phải render cái này để message hoạt động */}
        {contextHolder}

        <Card
          style={{
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 6px 24px rgba(0,0,0,0.15)",
            background: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(3px)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
          }}
          bodyStyle={{ padding: 28 }}
        >
          <Title
            level={3}
            style={{ textAlign: "center", marginBottom: 25, paddingBottom: 20, color: "#dcdcdcff" }}
          >
            Thông số xe và liên kết thanh toán
          </Title>

          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Row gutter={64} justify="center">
              {/* Cột thông tin xe */}
              <Col xs={24} md={14}>
                <ConfigProvider
                  theme={{
                    token: {
                      colorPrimary: "#dcdcdcff",
                      colorTextHeading: "#dcdcdcff",
                    },
                    components: {
                      Form: { labelColor: "#dcdcdcff" },
                      Input: { activeBorderColor: "#dcdcdcff", hoverBorderColor: "#dcdcdcff" },
                      Select: { colorBorder: "#dcdcdcff" },
                      DatePicker: { activeBorderColor: "#dcdcdcff", hoverBorderColor: "#dcdcdcff" },
                    },
                  }}
                >
                  <CarField />
                </ConfigProvider>
              </Col>

              {/* Cột thanh toán */}
              <Col xs={24} md={8}>
                <ConfigProvider
                  theme={{
                    token: {
                      colorPrimary: "#dcdcdcff",
                      colorTextHeading: "#dcdcdcff",
                    },
                    components: {
                      Form: { labelColor: "#dcdcdcff" },
                      Input: { activeBorderColor: "#dcdcdcff", hoverBorderColor: "#dcdcdcff" },
                      Select: { colorBorder: "#dcdcdcff" },
                      DatePicker: { activeBorderColor: "#dcdcdcff", hoverBorderColor: "#dcdcdcff" },
                    },
                  }}
                >
                  <PaymentField />
                </ConfigProvider>

                {/* Đồng ý điều khoản */}
                <Form.Item
                  name="agree"
                  valuePropName="checked"
                  style={{ margin: "8px 0 12px" }}
                  rules={[
                    {
                      validator: (_, v) =>
                        v ? Promise.resolve() : Promise.reject(new Error("Bạn cần đồng ý với điều khoản & Chính sách")),
                    },
                  ]}
                >
                  <Checkbox style={{ color: "#dcdcdcff" }}>
                    Tôi đồng ý với điều khoản &amp; Chính sách
                  </Checkbox>
                </Form.Item>

                {/* Nút submit */}
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    disabled={!submittable}
                    loading={loading}
                    style={{ height: 44, borderRadius: 10, marginTop: 4, color: "#dcdcdcff" }}
                  >
                    Xác nhận
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      </div>
    </div>
  );
}
