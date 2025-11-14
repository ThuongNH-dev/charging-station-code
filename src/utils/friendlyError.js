export function getFriendlyErrorMessage(error, fallback = "Đã xảy ra lỗi. Vui lòng thử lại.") {
  if (!error) return fallback;

  const normalize = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if (value.message) return value.message;
      if (value.error) return value.error;
      if (Array.isArray(value.errors) && value.errors.length) return value.errors[0];
    }
    return "";
  };

  let text =
    normalize(error?.response?.data) ||
    normalize(error?.data) ||
    normalize(error?.body) ||
    "";

  if (!text) {
    if (typeof error === "string") {
      text = error;
    } else if (typeof error?.message === "string") {
      text = error.message;
    } else if (typeof error?.detail === "string") {
      text = error.detail;
    }
  }

  if (!text && typeof error === "object") {
    try {
      text = normalize(JSON.parse(error));
    } catch {
      // ignore
    }
  }

  if (!text) return fallback;

  let cleaned = text;
  if (cleaned.includes("\n")) cleaned = cleaned.split("\n")[0];
  cleaned = cleaned.replace(/^System\.Exception:\s*/i, "");
  cleaned = cleaned.replace(/^Error:\s*/i, "");
  cleaned = cleaned.replace(/^\[[^\]]+\]\s*/i, "");
  cleaned = cleaned.trim();

  cleaned = cleaned.replace(/^[{[]\s*"?message"?\s*:\s*/i, "");
  cleaned = cleaned.replace(/["}>\]]+$/g, "");

  if (!cleaned || cleaned.trim() === "" || cleaned.trim() === "{") {
    return fallback;
  }
  if (cleaned.length > 200) cleaned = `${cleaned.slice(0, 200)}…`;
  return cleaned;
}

