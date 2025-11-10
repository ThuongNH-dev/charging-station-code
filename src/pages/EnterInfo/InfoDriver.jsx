// src/pages/enterInfo/InfoDriver.jsx
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
import { getApiBase } from "../../utils/api";

const { Title } = Typography;

/* ========== Helpers ========== */
function normalizeApiBase(s) {
  const raw = String(s || "").trim();
  if (!raw) return "https://localhost:7268/api"; // ✅ fallback dev
  return raw.replace(/\/+$/, "");
}
const API_BASE = normalizeApiBase(getApiBase());

function getToken() {
  try {
    const u = JSON.parse(
      localStorage.getItem("user") ||
        sessionStorage.getItem("user") ||
        "null"
    );
    if (u?.token) return u.token;
  } catch {}
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    null
  );
}
function getIdentityFromStorage() {
  const customerId = Number(
    localStorage.getItem("customerId") ||
      sessionStorage.getItem("customerId")
  );
  const companyId = Number(
    localStorage.getItem("companyId") || sessionStorage.getItem("companyId")
  );
  return {
    customerId: Number.isFinite(customerId) ? customerId : null,
    companyId: Number.isFinite(companyId) ? companyId : null,
  };
}
// FE (lowercase) -> BE (TitleCase)
function toTitleStatus(s) {
  const v = String(s || "").trim().toLowerCase();
  if (v === "active") return "Active";
  if (v === "inactive") return "Inactive";
  if (v === "blacklisted") return "Blacklisted";
  if (v === "retired") return "Retired";
  return "Active";
}
// cố gắng đọc nội dung lỗi BE để show ra
async function readError(res) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");
  try {
    if (ct.includes("application/json")) {
      const obj = JSON.parse(text);
      if (obj?.errors) {
        // ASP.NET ModelState
        const msgs = Object.entries(obj.errors)
          .map(([k, arr]) => `${k}: ${(arr || []).join(", ")}`)
          .join(" | ");
        return msgs || obj.title || obj.detail || text || `HTTP ${res.status}`;
      }
      return obj.title || obj.detail || JSON.stringify(obj);
    }
  } catch {}
  return text || `HTTP ${res.status}`;
}

/* ========== Component ========== */
export default function InfoDriver() {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // bật nút khi tick agree + form không lỗi
  const values = Form.useWatch([], form);
  const [submittable, setSubmittable] = React.useState(false);
  React.useEffect(() => {
    const hasErrors = form.getFieldsError().some(({ errors }) => errors.length);
    const agreed = form.getFieldValue("agree");
    setSubmittable(!hasErrors && !!agreed);
  }, [values, form]);

  const onFinish = async (values) => {
    const iden = getIdentityFromStorage();
    const token = getToken();

    // Build payload đúng spec BE
    const payload = {
      customerId:
        Number.isFinite(iden.customerId) ? Number(iden.customerId) : 0,
      companyId:
        Number.isFinite(iden.companyId) ? Number(iden.companyId) : 0,
      carMaker: String(values.carMaker || "").trim(),
      model: String(values.model || "").trim(),
      licensePlate: String(values.licensePlate || "").trim(),
      batteryCapacity: Number(values.batteryCapacity || 0),
      currentSoc: Number(values.currentSoc || 0),
      connectorType: String(values.connectorType || "").trim(),
      manufactureYear: Number(values.manufactureYear || 0),
      vehicleType: String(values.vehicleType || "Car").trim(), // "Car" | "Motorbike"
      status: toTitleStatus(values.status || "active"),
    };

    console.groupCollapsed(
      "%c[InfoDriver] Submit -> POST /Vehicles",
      "color:#52c41a;font-weight:bold;"
    );
    console.log("API_BASE =", API_BASE);
    console.log("payload =", payload);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/Vehicles`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errMsg = await readError(res);
        console.error("POST /Vehicles failed:", res.status, errMsg);
        throw new Error(errMsg || `POST /Vehicles ${res.status}`);
      }

      const data = await res.json().catch(() => null);
      console.log("created vehicle =", data);

      // lưu vehicleId nếu BE trả về
      const vid = Number(
        data?.vehicleId ?? data?.VehicleId ?? data?.id ?? data?.Id
      );
      if (Number.isFinite(vid)) {
        try {
          localStorage.setItem("vehicleId", String(vid));
          sessionStorage.setItem("vehicleId", String(vid));
        } catch {}
      }

      messageApi.success("Đăng ký xe thành công!");
      form.resetFields();
    } catch (err) {
      messageApi.error(err.message || "Không đăng ký được xe.");
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  return (
    <div style={{ padding: "30px 16px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 1080 }}>
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

          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#dcdcdcff",
                colorTextHeading: "#dcdcdcff",
                colorBgContainerDisabled: "rgba(255,255,255,0.9)",
                colorTextDisabled: "#000000d9",
              },
              components: {
                Form: { labelColor: "#dcdcdcff" },
                Input: {
                  activeBorderColor: "#dcdcdcff",
                  hoverBorderColor: "#dcdcdcff",
                  colorBgContainerDisabled: "rgba(255,255,255,0.9)",
                },
                Select: {
                  colorBorder: "#dcdcdcff",
                  colorBgContainerDisabled: "rgba(255,255,255,0.9)",
                },
                DatePicker: {
                  activeBorderColor: "#dcdcdcff",
                  hoverBorderColor: "#dcdcdcff",
                },
              },
            }}
          >
            <Form
              form={form}
              layout="vertical"
              size="middle"
              onFinish={onFinish}
              initialValues={{ status: "active" }} // FE giữ lowercase
            >
              {/* CarField tự 2 cột bên trong */}
              <Row gutter={[64, 0]}>
                <Col span={24}>
                  <CarField hideStatus={false} lockStatus={true} />
                </Col>
              </Row>

              {/* Dưới 2 cột: checkbox + nút */}
              <Row justify="center" style={{ marginTop: 16 }}>
                <Col xs={24} sm={20} md={18} lg={14}>
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

                  <Form.Item style={{ marginTop: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      disabled={!submittable}
                      loading={loading}
                      ghost={false}
                      className="confirm-btn"
                      style={{ height: 44, borderRadius: 10, marginTop: 4 }}
                    >
                      Xác nhận
                    </Button>
                  </Form.Item>
                  
                </Col>
              </Row>
            </Form>
          </ConfigProvider>
        </Card>
      </div>
    </div>
  );
}
