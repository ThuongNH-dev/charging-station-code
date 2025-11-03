// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "antd/dist/reset.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google"; // ✅ thêm dòng này

// === NAV DEBUG: log có chọn lọc ===
// main.jsx  (DEBUG an toàn – KHÔNG ném lỗi nữa)
const _push = history.pushState;
history.pushState = function (state, title, url) {
  try {
    console.log("[NAV pushState] to:", url);
  } catch {}
  return _push.apply(this, arguments);
};

const _replace = history.replaceState;
history.replaceState = function (state, title, url) {
  try {
    console.log("[NAV replaceState] to:", url);
  } catch {}
  return _replace.apply(this, arguments);
};

// ✅ Dán clientId bạn lấy trong Google Cloud Console
const clientId = "146566535357-hkhvmq3osejt8f5d4c1mcqmiedjn2568.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}> {/* ✅ Bọc toàn app */}
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
