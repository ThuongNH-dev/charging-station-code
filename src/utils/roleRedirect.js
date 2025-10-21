// src/utils/roleRedirect.js
export function roleToPath(role) {
  switch ((role || "").toLowerCase()) {
    case "admin":
      return "/admin/stations";
    case "staff":
      return "/staff/stations";
    case "customer":
      return "/stations";
    default:
      return "/homepage";
  }
}
