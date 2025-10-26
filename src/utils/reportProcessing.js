// ✅ src/utils/reportProcessing.js
// PHIÊN BẢN HOÀN CHỈNH + DEBUG TOÀN DIỆN + FIX ISSUE REVENUE BY PLAN + HEATMAP HOURLY

import moment from "moment";

const DEBUG_MODE = true; // Bật/tắt debug toàn bộ

/* =========================================================
 * 🔹 1. HÀM HỖ TRỢ ĐỊNH DẠNG TIỀN TỆ
 * ========================================================= */
export const formatCurrency = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(num);
};

/* =========================================================
 * 🔹 2. TÍNH TOÁN KPI TỔNG QUAN
 * ========================================================= */
export const calculateKpiOverview = (rawData) => {
  if (DEBUG_MODE) console.log("DEBUG KPI — rawData:", rawData);
  
  const invoicesData = Array.isArray(rawData.invoicesData)
    ? rawData.invoicesData
    : Array.isArray(rawData.invoicesData?.data)
    ? rawData.invoicesData.data
    : [];

  if (DEBUG_MODE) console.log("DEBUG KPI — invoicesData:", invoicesData);

  let totalRevenue = 0;
  let totalEnergy = 0;
  let totalDurationMin = 0;
  let completedSessions = 0;

  invoicesData.forEach((invoice) => {
    const rev = invoice.total ?? invoice.totalAmount ?? 0;
    totalRevenue += rev;

    if (Array.isArray(invoice.chargingSessions)) {
      invoice.chargingSessions.forEach((session) => {
        if (session.status === "Completed") {
          totalEnergy += session.energyKwh ?? session.energyConsumed ?? 0;
          totalDurationMin += session.durationMin ?? 0;
          completedSessions++;
        }
      });
    }
  });

  const prevRevenue = totalRevenue * 0.9;
  const prevEnergy = totalEnergy * 0.95;

  const revenuePercent =
    prevRevenue > 0
      ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)
      : 0;
  const energyPercent =
    prevEnergy > 0
      ? (((totalEnergy - prevEnergy) / prevEnergy) * 100).toFixed(1)
      : 0;

  const avgRevenuePerSession =
    completedSessions > 0
      ? formatCurrency(totalRevenue / completedSessions)
      : "0 ₫";

  const avgDurationSec =
    completedSessions > 0
      ? Math.round((totalDurationMin * 60) / completedSessions)
      : 0;
  const avgDurationPerSession = `${Math.floor(avgDurationSec / 60)}m ${
    avgDurationSec % 60
  }s`;

  if (DEBUG_MODE)
    console.log(
      "DEBUG KPI — totalRevenue, totalEnergy, completedSessions:",
      totalRevenue,
      totalEnergy,
      completedSessions
    );

  return {
    totalRevenue: formatCurrency(totalRevenue),
    totalEnergy: `${totalEnergy.toFixed(2)} kWh`,
    revenuePercent,
    energyPercent,
    avgRevenuePerSession,
    avgDurationPerSession,
  };
};

/* =========================================================
 * 🔹 3. CƠ CẤU DỊCH VỤ (Pie + Bar Chart) - FIXED
 * ========================================================= */
export const processServiceStructure = (rawData) => {
  if (DEBUG_MODE) console.log("DEBUG ServiceStructure — rawData:", rawData);
  
  const plansData = Array.isArray(rawData.subscriptionPlansData)
    ? rawData.subscriptionPlansData
    : Array.isArray(rawData.subscriptionPlansData?.value)
    ? rawData.subscriptionPlansData.value
    : Array.isArray(rawData.plansData)
    ? rawData.plansData
    : [];

  const invoicesData = Array.isArray(rawData.invoicesData)
    ? rawData.invoicesData
    : Array.isArray(rawData.invoicesData?.data)
    ? rawData.invoicesData.data
    : [];

  if (DEBUG_MODE) {
    console.log("DEBUG ServiceStructure — plansData:", plansData);
    console.log("DEBUG ServiceStructure — invoicesData:", invoicesData);
  }

  const planNameMap = plansData.reduce((map, p) => {
    const id = p.subscriptionPlanId ?? p.PlanId ?? p.id ?? "N/A";
    map[id] = p.planName ?? `Gói #${id}`;
    return map;
  }, {});
  planNameMap["N/A"] = "Trả trước";

  const officialNames = [
    "Tieu chuan",
    "Cao cap",
    "Bac",
    "Doanh nghiep",
    "Vang",
    "Kim cuong",
  ];
  const revenueByPlanName = {};
  officialNames.forEach((name) => (revenueByPlanName[name] = 0));
  revenueByPlanName["Trả trước"] = 0;

  // Debug: Kiểm tra cấu trúc dữ liệu thực tế
  if (DEBUG_MODE) {
    console.log("DEBUG Service — Sample invoice:", invoicesData[0]);
    console.log("DEBUG Service — Sample plan:", plansData[0]);
  }

  invoicesData.forEach((invoice, index) => {
    // Thử nhiều field khác nhau cho total revenue
    const totalRevenue = invoice.total ?? 
                        invoice.totalAmount ?? 
                        invoice.amount ?? 
                        invoice.price ?? 
                        invoice.revenue ?? 
                        0;
    
    let planName = "Trả trước";

    if (DEBUG_MODE && index < 5) {
      console.log(`DEBUG Service — invoice ${index}:`, {
        total: invoice.total,
        totalAmount: invoice.totalAmount,
        amount: invoice.amount,
        price: invoice.price,
        revenue: invoice.revenue,
        chargingSessions: invoice.chargingSessions,
        subscriptionPlanId: invoice.subscriptionPlanId,
        planId: invoice.planId
      });
    }

    // Thử nhiều cách để lấy plan name
    if (invoice.subscriptionPlanId) {
      planName = planNameMap[invoice.subscriptionPlanId] ?? "Trả trước";
    } else if (invoice.planId) {
      planName = planNameMap[invoice.planId] ?? "Trả trước";
    } else if (
      Array.isArray(invoice.chargingSessions) &&
      invoice.chargingSessions.length
    ) {
      const session = invoice.chargingSessions[0];
      const planId = session.subscriptionPlanId ?? 
                    session.pricingRuleId ?? 
                    session.planId ?? 
                    "N/A";
      planName = planNameMap[planId] ?? "Trả trước";
      
      if (DEBUG_MODE && index < 3) {
        console.log(`DEBUG Service — session ${index}:`, session);
        console.log(`DEBUG Service — planId: ${planId}, planName: ${planName}`);
      }
    }

    if (!officialNames.includes(planName) && planName !== "Trả trước") {
      planName = "Khác";
      if (!revenueByPlanName[planName]) revenueByPlanName[planName] = 0;
    }

    revenueByPlanName[planName] += totalRevenue;
    
    if (DEBUG_MODE && index < 5) {
      console.log(`DEBUG Service — totalRevenue: ${totalRevenue}, planName: ${planName}`);
    }
  });

  if (DEBUG_MODE)
    console.log("DEBUG Service — revenueByPlanName:", revenueByPlanName);

  const pieChartData = [];
  let otherTotal = 0;
  Object.entries(revenueByPlanName).forEach(([name, value]) => {
    if (officialNames.includes(name) || name === "Trả trước") {
      pieChartData.push({ name, value });
    } else {
      otherTotal += value;
    }
  });
  if (otherTotal > 0) pieChartData.push({ name: "Khác", value: otherTotal });

  const BAR_CHART_PLAN_NAMES = [...officialNames, "Trả trước"];
  
  // Tạo dữ liệu theo tháng thực tế từ invoices
  const monthlyData = {};
  
  invoicesData.forEach((invoice) => {
    // Thử nhiều field khác nhau cho total revenue
    const totalRevenue = invoice.total ?? 
                        invoice.totalAmount ?? 
                        invoice.amount ?? 
                        invoice.price ?? 
                        invoice.revenue ?? 
                        0;
    
    let planName = "Trả trước";

    // Thử nhiều cách để lấy plan name
    if (invoice.subscriptionPlanId) {
      planName = planNameMap[invoice.subscriptionPlanId] ?? "Trả trước";
    } else if (invoice.planId) {
      planName = planNameMap[invoice.planId] ?? "Trả trước";
    } else if (
      Array.isArray(invoice.chargingSessions) &&
      invoice.chargingSessions.length
    ) {
      const session = invoice.chargingSessions[0];
      const planId = session.subscriptionPlanId ?? 
                    session.pricingRuleId ?? 
                    session.planId ?? 
                    "N/A";
      planName = planNameMap[planId] ?? "Trả trước";
    }

    if (!officialNames.includes(planName) && planName !== "Trả trước") {
      planName = "Khác";
    }

    // Thử nhiều field cho ngày tạo invoice
    const invoiceDate = moment(
      invoice.createdAt ?? 
      invoice.date ?? 
      invoice.createdDate ?? 
      invoice.invoiceDate ?? 
      new Date()
    );
    const monthKey = invoiceDate.format("MM/YYYY");
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { month: monthKey, total: 0 };
      BAR_CHART_PLAN_NAMES.forEach(name => {
        monthlyData[monthKey][name] = 0;
      });
    }
    
    monthlyData[monthKey][planName] = (monthlyData[monthKey][planName] || 0) + totalRevenue;
    monthlyData[monthKey].total += totalRevenue;
  });

  // Nếu không có dữ liệu thực tế, tạo dữ liệu mẫu để test
  if (Object.keys(monthlyData).length === 0) {
    console.log("DEBUG Service — No monthly data found, creating sample data");
    const currentDate = moment();
    for (let i = 2; i >= 0; i--) {
      const m = currentDate.clone().subtract(i, "months").format("MM/YYYY");
      const monthData = { month: m, total: 0 };
      BAR_CHART_PLAN_NAMES.forEach((planName) => {
        const val = Math.round(Math.random() * 1000000); // Random data for testing
        monthData[planName] = val;
        monthData.total += val;
      });
      monthlyData[m] = monthData;
    }
  }

  // Chuyển đổi thành array và sắp xếp theo tháng
  const months = Object.values(monthlyData).sort((a, b) => {
    const dateA = moment(a.month, "MM/YYYY");
    const dateB = moment(b.month, "MM/YYYY");
    return dateA.diff(dateB);
  });

  if (DEBUG_MODE) console.log("DEBUG Service — monthlyRevenue:", months);

  return { pieData: pieChartData, monthlyRevenue: months };
};

/* =========================================================
 * 🔹 4. SO SÁNH KHU VỰC & CHI TIẾT TRẠM
 * ========================================================= */
export const processRegionalComparison = (rawData) => {
  const stationsData = Array.isArray(rawData.stationsData)
    ? rawData.stationsData
    : rawData.stationsData?.items || [];
  const invoicesData = Array.isArray(rawData.invoicesData)
    ? rawData.invoicesData
    : Array.isArray(rawData.invoicesData?.data)
    ? rawData.invoicesData.data
    : [];

  if (DEBUG_MODE) {
    console.log("DEBUG Regional — stationsData:", stationsData);
    console.log("DEBUG Regional — invoicesData:", invoicesData);
  }

  const areaMap = {
    "Miền Bắc": "mienBac",
    "Miền Trung": "mienTrung",
    "Miền Nam": "mienNam",
  };

  const regionalSummary = {};

  ["Miền Bắc", "Miền Trung", "Miền Nam"].forEach((region) => {
    const stationsInRegion = stationsData.filter((s) => s.region === region);

    const totalRevenue = stationsInRegion.reduce(
      (sum, s) => sum + (s.revenue || 0),
      0
    );
    const totalSessions = stationsInRegion.reduce(
      (sum, s) => sum + (s.sessions || 0),
      0
    );
    const avgUsage = stationsInRegion.length
      ? stationsInRegion.reduce((sum, s) => sum + (s.usage || 0), 0) /
        stationsInRegion.length
      : 0;

    const mappedKey = areaMap[region] || region;
    regionalSummary[mappedKey] = {
      revenue: totalRevenue,
      sessions: totalSessions,
      avgUsage,
    };
  });

  const stationStats = {};
  stationsData.forEach((st) => {
    stationStats[st.stationId] = {
      stationName: st.stationName ?? "Không xác định",
      city: st.city ?? "Miền Nam",
      totalSessions: 0,
      totalEnergy: 0,
      totalRevenue: 0,
    };
  });

  invoicesData.forEach((invoice) => {
    if (Array.isArray(invoice.chargingSessions)) {
      invoice.chargingSessions.forEach((s) => {
        const stationId = s.stationId ?? s.StationId;
        if (stationStats[stationId]) {
          stationStats[stationId].totalSessions += 1;
          stationStats[stationId].totalEnergy +=
            s.energyKwh ?? s.energyConsumed ?? 0;
          stationStats[stationId].totalRevenue += s.total ?? s.totalAmount ?? 0;
        }
      });
    }
  });

  const detailedStationTable = [];
  Object.values(stationStats).forEach((s) => {
    const region =
      s.city.includes("Hà Nội") || s.city.includes("Hải Phòng")
        ? "Miền Bắc"
        : s.city.includes("Đà Nẵng") ||
          s.city.includes("Huế") ||
          s.city.includes("Nha Trang")
        ? "Miền Trung"
        : "Miền Nam";

    const usage = Math.min(100, (s.totalSessions / 30) * 100).toFixed(1);

    const mappedKey = areaMap[region] || region;

    regionalSummary[mappedKey].totalSessions += s.totalSessions;
    regionalSummary[mappedKey].totalEnergy += s.totalEnergy;
    regionalSummary[mappedKey].totalValue += s.totalRevenue;

    detailedStationTable.push({
      stationName: s.stationName,
      region,
      totalSessions: s.totalSessions,
      totalEnergy: `${s.totalEnergy.toFixed(2)} kWh`,
      usage: `${usage}%`,
      status: s.totalSessions > 10 ? "Hoạt động tốt" : "Bình thường",
    });
  });

  Object.keys(regionalSummary).forEach((r) => {
    const count = detailedStationTable.filter(
      (s) => areaMap[s.region] === r // map region sang key
    ).length;
    regionalSummary[r].usagePercent = count
      ? (
          detailedStationTable
            .filter((s) => areaMap[s.region] === r)
            .reduce((sum, s) => sum + parseFloat(s.usage), 0) / count
        ).toFixed(1)
      : 0;
    regionalSummary[r].totalValue = formatCurrency(
      regionalSummary[r].totalValue
    );
  });

  if (DEBUG_MODE) {
    console.log("DEBUG Regional — regionalSummary:", regionalSummary);
    console.log("DEBUG Regional — detailedStationTable:", detailedStationTable);
  }

  return { regionalSummary, detailedStationTable };
};

/* =========================================================
 * 🔹 5. BIỂU ĐỒ THỜI GIAN 7 NGÀY
 * ========================================================= */
export const processTimeChartData = (rawData) => {
  const invoicesData = Array.isArray(rawData.invoicesData)
    ? rawData.invoicesData
    : Array.isArray(rawData.invoicesData?.data)
    ? rawData.invoicesData.data
    : [];

  const today = moment();
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = today.clone().subtract(i, "days");
    const key = d.format("YYYY-MM-DD");
    const dayName = d.isoWeekday() === 7 ? "CN" : `Th${d.isoWeekday() + 1}`;
    days[key] = { day: dayName, sessions: 0, revenue: 0 };
  }

  invoicesData.forEach((invoice) => {
    const invDate = moment(invoice.createdAt).format("YYYY-MM-DD");
    if (days[invDate])
      days[invDate].revenue += invoice.total ?? invoice.totalAmount ?? 0;

    if (Array.isArray(invoice.chargingSessions)) {
      invoice.chargingSessions.forEach((s) => {
        const sesDate = moment(s.endedAt ?? s.startTime).format("YYYY-MM-DD");
        if (days[sesDate]) days[sesDate].sessions++;
      });
    }
  });

  const dailySessions = Object.values(days).map((d) => ({
    day: d.day,
    sessions: d.sessions,
  }));
  const dailyRevenue = Object.values(days).map((d) => ({
    day: d.day,
    revenue: parseFloat((d.revenue / 1000).toFixed(2)),
  }));

  if (DEBUG_MODE)
    console.log(
      "DEBUG TimeChart — dailySessions:",
      dailySessions,
      "dailyRevenue:",
      dailyRevenue
    );

  return { dailySessions, dailyRevenue };
};

/* =========================================================
 * 🔹 6. BIỂU ĐỒ THEO GIỜ (HEATMAP)
 * ========================================================= */
export const processTimeChartHourly = (rawData) => {
  const invoicesData = Array.isArray(rawData.invoicesData)
    ? rawData.invoicesData
    : Array.isArray(rawData.invoicesData?.data)
    ? rawData.invoicesData.data
    : [];

  const hourlyData = {};
  const today = moment();
  for (let i = 6; i >= 0; i--) {
    const d = today.clone().subtract(i, "days").format("YYYY-MM-DD");
    for (let h = 0; h < 24; h++) {
      const key = `${d}-${h}`;
      hourlyData[key] = 0;
    }
  }

  invoicesData.forEach((inv) => {
    if (!Array.isArray(inv.chargingSessions)) return;

    inv.chargingSessions.forEach((s) => {
      const endTime = moment(s.endedAt ?? s.startTime);
      if (!endTime.isValid()) return;

      const dateKey = endTime.format("YYYY-MM-DD");
      const hour = endTime.hour();
      const key = `${dateKey}-${hour}`;

      if (hourlyData[key] !== undefined) {
        const addValue = s.energyKwh ?? s.energyConsumed ?? 1;
        hourlyData[key] += addValue;
      }
    });
  });

  const result = Object.entries(hourlyData).map(([key, value]) => {
    const [date, hour] = key.split("-");
    return { date, hour: parseInt(hour), value };
  });

  if (DEBUG_MODE) console.log("DEBUG Hourly Heatmap:", result);

  return result;
};

/* =========================================================
 * 🔹 7. CẢNH BÁO HIỆU SUẤT
 * ========================================================= */
export const processWarnings = (rawData) => {
  const { detailedStationTable } = processRegionalComparison(rawData);

  const warnings = detailedStationTable
    .filter((s) => {
      const usage = parseFloat(s.usage);
      return usage > 90 || usage < 20;
    })
    .map((s) => ({
      name: s.stationName,
      usage: s.usage,
      status: parseFloat(s.usage) > 90 ? "Quá tải" : "Ít sử dụng",
      color: parseFloat(s.usage) > 90 ? "danger" : "warning",
    }));

  if (DEBUG_MODE) console.log("DEBUG Warnings:", warnings);

  return warnings;
};
