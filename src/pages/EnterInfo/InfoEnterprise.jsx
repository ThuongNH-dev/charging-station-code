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
    Divider,
    ConfigProvider,
} from "antd";
import EnterpriseField from "../../components/form/Info/EnterpriseField";
import EnterprisePaymentField from "../../components/form/Info/EnterprisePaymentField";
import PaymentField from "../../components/form/Info/PaymentField";

const { Title } = Typography;

// API mock
const API_URL = "https://68e218228943bf6bb3c59976.mockapi.io/Account/enterprise";

export default function InfoEnterprise() {
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);

    // ✅ DÙNG HOOK CHO message
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

            // ✅ DÙNG messageApi THAY message
            messageApi.success("Đã lưu dữ liệu thành công!");
            form.resetFields();
        } catch (err) {
            console.error(err);
            messageApi.error(err.message || "Có lỗi xảy ra khi gửi dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    // Disable nút khi chưa tick + khi có lỗi
    const values = Form.useWatch([], form);
    const [submittable, setSubmittable] = React.useState(false);
    React.useEffect(() => {
        const hasErrors = form.getFieldsError().some(({ errors }) => errors.length);
        const agreed = form.getFieldValue("agree");
        setSubmittable(!hasErrors && !!agreed);
    }, [values, form]);

    return (
        <div style={{ padding: "50px 16px", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 1500 }}>
                {/* ✅ PHẢI RENDER contextHolder TRONG CÂY */}
                {contextHolder}

                <Card
                    style={{
                        borderRadius: 16,
                        padding: 20,
                        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.15)",
                        background: "rgba(255, 255, 255, 0.06)",
                        backdropFilter: "blur(3px)",
                        border: "1px solid rgba(255, 255, 255, 0.4)",
                    }}
                >
                    <Title
                        level={3}
                        style={{ textAlign: "center", marginBottom: 25, paddingBottom: 20, color: "#dcdcdcff" }}
                    >
                        Thông số doanh nghiệp và liên kết thanh toán
                    </Title>

                    <Form form={form} layout="vertical" onFinish={onFinish}>
                        <Row gutter={64} justify="center">
                            <Col xs={24} md={11}>
                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorPrimary: "#dcdcdcff",
                                            colorTextHeading: "#dcdcdcff",
                                        },
                                        components: {
                                            Form: {
                                                labelColor: "#dcdcdcff",
                                            },
                                            Input: {
                                                activeBorderColor: "#dcdcdcff",
                                                hoverBorderColor: "#dcdcdcff",
                                            },
                                            Select: { colorBorder: "#dcdcdcff" },
                                            DatePicker: {
                                                activeBorderColor: "#dcdcdcff",
                                                hoverBorderColor: "#dcdcdcff",
                                            },
                                        },
                                    }}
                                >
                                    <EnterpriseField />
                                </ConfigProvider>
                            </Col>

                            <Col xs={24} md={12}>
                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorPrimary: "#dcdcdcff",
                                            colorTextHeading: "#dcdcdcff",
                                        },
                                        components: {
                                            Form: { labelColor: "#dcdcdcff" },
                                            Typography: { colorText: "#dcdcdcff" },
                                            Input: {
                                                activeBorderColor: "#dcdcdcff",
                                                hoverBorderColor: "#dcdcdcff",
                                            },
                                            Select: { colorBorder: "#dcdcdcff" },
                                            DatePicker: {
                                                activeBorderColor: "#dcdcdcff",
                                                hoverBorderColor: "#dcdcdcff",
                                            },
                                        },
                                    }}
                                >
                                    <div style={{ width: "110%", transform: "translateX(-5%)" }}>
                                    <PaymentField />
                                        <EnterprisePaymentField />
                                        <Divider style={{ backgroundColor: "#dcdcdc5d" }} />
                                    </div>
                                </ConfigProvider>

                               

                                <Form.Item name="agree" valuePropName="checked">
                                    <Checkbox style={{ color: "#dcdcdcff" }}>
                                        Tôi đồng ý với các điều khoản và điều kiện
                                    </Checkbox>
                                </Form.Item>

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
