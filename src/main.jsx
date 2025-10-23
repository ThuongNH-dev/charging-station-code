import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "antd/dist/reset.css"
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'

// === NAV DEBUG: log có chọn lọc ===
// main.jsx  (DEBUG an toàn – KHÔNG ném lỗi nữa)
const _push = history.pushState;
history.pushState = function (state, title, url) {
  try { console.log("[NAV pushState] to:", url); } catch {}
  return _push.apply(this, arguments);
};

const _replace = history.replaceState;
history.replaceState = function (state, title, url) {
  try { console.log("[NAV replaceState] to:", url); } catch {}
  return _replace.apply(this, arguments);
};

// main.jsx
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

