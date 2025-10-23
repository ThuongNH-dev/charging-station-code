// src/utils/roleRedirect.js
export function roleToPath(role) {
  switch ((role || "").toLowerCase()) {
    case "admin":
      return "/admin";
    case "staff":
      return "/staff";
    case "customer":
      return "/stations";
    default:
      return "/homepage";
  }
}
