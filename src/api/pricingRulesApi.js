// Giả định fetchAuthJSON và resolveUrl được import từ thư mục utils bên ngoài
import { fetchAuthJSON, resolveUrl } from "../utils/api";

// === HÀM CHUẨN HÓA DỮ LIỆU ===
function normalizeRule(r = {}) {
  if (!r || typeof r !== "object") {
    return {};
  }
  return {
    PricingRuleId: r.id ?? r.pricingRuleId ?? r.PricingRuleId ?? "",
    ChargerType: r.chargerType ?? r.ChargerType ?? "",
    PowerKw: Number(r.powerKw ?? r.PowerKw ?? 0),
    TimeRange: r.timeRange ?? r.TimeRange ?? "",
    PricePerKwh: Number(r.pricePerKwh ?? r.PricePerKwh ?? 0),
    IdleFeePerMin: Number(r.idleFeePerMin ?? r.IdleFeePerMin ?? 0),
    Status: r.status ?? r.Status ?? "Active",
    CreatedAt: r.createdAt ?? r.CreatedAt ?? null,
    UpdatedAt: r.updatedAt ?? r.UpdatedAt ?? null,
  };
}

// === CÁC HÀM API CHÍNH (CRUD + QUERY) ===
export const pricingRuleApi = {
  // 1. LẤY DANH SÁCH (GetAllAsync)
  async getRules(query = { page: 1, pageSize: 10, status: "All" }) {
    try {
      const params = new URLSearchParams({
        Page: query.page,
        PageSize: query.pageSize,
        Search: query.search || "",
        Status: query.status === "All" ? "" : query.status,
      }).toString();

      const res = await fetchAuthJSON(resolveUrl(`/PricingRule?${params}`));

      if (res && Array.isArray(res.items)) {
        return {
          ...res,
          items: res.items.map(normalizeRule),
        };
      }
      return { items: [], totalItems: 0, page: 1, pageSize: 10, totalPages: 0 };
    } catch (error) {
      console.error("API Error: Lấy danh sách Pricing Rule thất bại.", error);
      throw new Error(
        `Lấy danh sách thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  // 2. TẠO MỚI (CreateAsync)
  async createRule(ruleData) {
    try {
      const res = await fetchAuthJSON(resolveUrl("/PricingRule"), {
        method: "POST",
        body: JSON.stringify(ruleData),
      });

      if (res && res.message && res.message.includes("tồn tại")) {
        throw new Error(res.message);
      }
      return normalizeRule(res);
    } catch (error) {
      throw new Error(error.message || `Tạo Rule thất bại: Lỗi không xác định`);
    }
  },

  // 3. CẬP NHẬT (UpdateAsync)
  async updateRule(ruleId, ruleData) {
    try {
      const res = await fetchAuthJSON(resolveUrl(`/PricingRule/${ruleId}`), {
        method: "PUT",
        body: JSON.stringify(ruleData),
      });
      if (!res) {
        // Xử lý trường hợp BE trả về 204 No Content
        return { ...ruleData, PricingRuleId: ruleId };
      }
      return normalizeRule(res);
    } catch (error) {
      throw new Error(
        `Cập nhật Rule thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  // 4. XÓA (DeleteAsync)
  async deleteRule(ruleId) {
    try {
      await fetchAuthJSON(resolveUrl(`/PricingRule/${ruleId}`), {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      throw new Error(
        `Xóa Rule thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },

  // 5. GÁN RULE HÀNG LOẠT (API GIẢ ĐỊNH)
  async assignRules(assignmentData) {
    try {
      const res = await fetchAuthJSON(resolveUrl("/PricingRules/Assign"), {
        method: "POST",
        body: JSON.stringify(assignmentData), // { ruleId, targetIds: [] }
      });
      return res || { success: true, message: "Gán quy tắc thành công!" };
    } catch (error) {
      throw new Error(
        `Gán Rule thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  },
};
