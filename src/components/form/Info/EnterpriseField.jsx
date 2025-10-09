import React from "react";
import { Row, Col, Form, Input, Select, Typography } from "antd";

const { Option } = Select;
const { Title } = Typography;

export default function EnterpriseField() {
    return (
        <>
            <Title level={5} style={{ marginBottom: 12 }}>
                Thông tin doanh nghiệp
            </Title>


            <Form.Item
                label={<strong>Tên doanh nghiệp</strong>}
                name="enterpriseName"
                rules={[{ required: true, message: "Vui lòng nhập tên doanh nghiệp" }]}
            >
                <Input placeholder="VD: Công ty TNHH ABC" />
            </Form.Item>

            <Form.Item
                label={<strong>Ngành nghề</strong>}
                name="industry"
                rules={[{ required: true, message: "Vui lòng chọn ngành nghề" }]}
            >
                <Select placeholder="Chọn ngành nghề">
                    <Option value="IT">Công nghệ thông tin</Option>
                    <Option value="Finance">Tài chính</Option>
                    <Option value="Manufacturing">Sản xuất</Option>
                    <Option value="Healthcare">Chăm sóc sức khỏe</Option>
                    <Option value="Education">Giáo dục</Option>
                    <Option value="Retail">Bán lẻ</Option>
                    <Option value="Other">-Khác-</Option>
                </Select>
            </Form.Item>

            <Form.Item
                label={<strong>Họ tên người đại diện</strong>}
                name="representativeName"
                rules={[{ required: true, message: "Vui lòng nhập họ tên người đại diện" }]}
            >
                <Input placeholder="VD: Nguyễn Văn A" />
            </Form.Item>

            <Form.Item
                label={<strong>Số điện thoại</strong>}
                name="phone"
                rules={[{ required: true, message: "Vui lòng nhập số điện thoại" },
                    { pattern: /^\d{10,11}$/, message: "Số điện thoại phải gồm 10-11 chữ số" }
                ]}
            >
                <Input placeholder="VD: 0123456789" />
            </Form.Item>

            <Form.Item
                label={<strong>Mã số thuế</strong>}
                name="taxCode"
                rules={[{ required: true, message: "Vui lòng nhập mã số thuế" }]}
            >
                <Input placeholder="VD: 0123456789" />
            </Form.Item>

            <Form.Item
                label={<strong>Địa chỉ doanh nghiệp</strong>}
                name="address"
                rules={[{ required: true, message: "Vui lòng nhập địa chỉ doanh nghiệp" }]}
            >
                <Input placeholder="VD: 123 Đường ABC, Phường 1, Quận 1" />
            </Form.Item> 

        </>
    );
}
