// src/components/admin/pages/pricing/PricingRulesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Space, Tag, message, Select, Input } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { pricingRuleApi } from "../../../../api/pricingRulesApi";

import PricingRuleModal from "./PricingRuleModal";
import PricingRuleAssignmentModal from "./PricingRuleAssignmentModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

const formatVND = (amount) => Number(amount || 0).toLocaleString("vi-VN");

export default function PricingRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    status: "Active",
  });

  // States cho Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentData, setCurrentData] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pricingRuleApi.getRules(query);
      setRules(result.items);
      setPagination({
        page: result.page,
        pageSize: result.pageSize,
        total: result.totalItems,
      });
    } catch (error) {
      message.error("Lỗi khi tải danh sách quy tắc giá.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // --- Handlers ---
  const handleAdd = () => {
    setIsEdit(false);
    // Khởi tạo giá trị mặc định cho form
    setCurrentData({
      Status: "Active",
      PricePerKwh: 0,
      IdleFeePerMin: 0,
      PowerKw: 0,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setIsEdit(true);
    setCurrentData(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await pricingRuleApi.deleteRule(deleteTargetId);
      message.success(`Đã xóa thành công Quy tắc #${deleteTargetId}`);
      fetchRules();
    } catch (error) {
      message.error(error.message || "Lỗi khi xóa quy tắc giá.");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleSave = async (values) => {
    try {
      if (isEdit) {
        await pricingRuleApi.updateRule(currentData.PricingRuleId, values);
        message.success(
          `Cập nhật Quy tắc #${currentData.PricingRuleId} thành công!`
        );
      } else {
        await pricingRuleApi.createRule(values);
        message.success("Tạo Quy tắc giá mới thành công!");
      }
      setIsModalOpen(false);
      fetchRules();
    } catch (error) {
      message.error(error.message || "Lỗi khi lưu quy tắc giá.");
    }
  };

  const handleTableChange = (newPagination, filters, sorter) => {
    const sortBy = sorter.field === "pricePerKwh" ? "Price" : "CreatedAt";
    const sortDir = sorter.order === "ascend" ? "asc" : "desc";

    setQuery((prev) => ({
      ...prev,
      page: newPagination.current,
      pageSize: newPagination.pageSize,
      SortBy: sortBy,
      SortDir: sortDir,
    }));
  };

  const handleSearch = (value) => {
    setQuery((prev) => ({ ...prev, search: value, page: 1 }));
  };

  // --- Columns ---
  const columns = [
    {
      title: "ID",
      dataIndex: "PricingRuleId",
      key: "id",
      sorter: true,
      width: 80,
    },
    {
      title: "Loại sạc",
      dataIndex: "ChargerType",
      key: "chargerType",
      width: 100,
    },
    {
      title: "Công suất (kW)",
      dataIndex: "PowerKw",
      key: "powerKw",
      width: 120,
      sorter: true,
    },
    {
      title: "Thời gian",
      dataIndex: "TimeRange",
      key: "timeRange",
      width: 100,
    },
    {
      title: "Giá/kWh",
      dataIndex: "PricePerKwh",
      key: "pricePerKwh",
      sorter: true,
      render: (price) => `${formatVND(price)} đ`,
      width: 120,
    },
    {
      title: "Phí chờ/phút",
      dataIndex: "IdleFeePerMin",
      key: "idleFeePerMin",
      render: (fee) => `${formatVND(fee)} đ`,
      width: 120,
    },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      key: "status",
      width: 100,
      render: (status) => (
        <Tag color={status === "Active" ? "green" : "red"}>{status}</Tag>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Sửa Rule"
          />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record.PricingRuleId)}
            title="Xóa Rule"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="pricing-rules-page">
      <h1 style={{ marginBottom: 20 }}>Quản lý Quy tắc Giá ✨</h1>

      {/* Bộ lọc và Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Space>
          <Input.Search
            placeholder="Tìm kiếm theo Loại sạc/Khung giờ"
            allowClear
            style={{ width: 250 }}
            onSearch={handleSearch}
            onChange={(e) => {
              if (e.target.value === "") handleSearch("");
            }}
          />
          <Select
            placeholder="Lọc theo Trạng thái"
            style={{ width: 150 }}
            value={query.status}
            onChange={(val) =>
              setQuery((prev) => ({ ...prev, status: val, page: 1 }))
            }
            options={[
              { value: "All", label: "Tất cả trạng thái" },
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
        </Space>
        <Space>
          <Button
            type="default"
            icon={<SwapOutlined />}
            onClick={() => setIsAssignmentModalOpen(true)}
          >
            Gán Rule Hàng loạt
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Tạo Rule Mới
          </Button>
        </Space>
      </div>

      {/* Bảng dữ liệu */}
      <Table
        columns={columns}
        dataSource={rules}
        rowKey="PricingRuleId"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
      />

      {/* Modal Thêm/Sửa */}
      <PricingRuleModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEdit={isEdit}
        initialData={currentData}
        onSave={handleSave}
      />

      {/* Modal Xóa */}
      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        targetId={deleteTargetId}
        targetType="quy tắc giá"
        onConfirm={confirmDelete}
      />

      {/* Modal Gán Rule Hàng loạt */}
      <PricingRuleAssignmentModal
        open={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        rules={rules.filter((r) => r.Status === "Active")} // Chỉ gán rule đang Active
      />
    </div>
  );
}
