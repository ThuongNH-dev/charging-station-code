import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Avatar,
  Typography,
  Box,
} from "@mui/material";

import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../utils/api";

const API_BASE = (getApiBase() || "").replace(/\/+$/, "");
const ME_URL = `${API_BASE}/Auth`;

/* ================= Helpers ================= */
function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
function pickName(obj = {}) {
  return (
    obj.fullName ||
    obj.name ||
    obj.userName ||
    obj.username ||
    obj.displayName ||
    obj.email ||
    obj.preferred_username ||
    obj.given_name ||
    obj.unique_name ||
    obj.sub ||
    ""
  );
}
function pickRole(obj = {}) {
  const claimRole =
    obj.role ||
    obj.roles ||
    obj["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    obj["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"];
  if (Array.isArray(claimRole)) return claimRole[0] || "";
  return claimRole || "";
}
function decodeJwtClaims(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return {};
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    try {
      const [, payload] = token.split(".");
      return JSON.parse(atob(payload));
    } catch {
      return {};
    }
  }
}

function getStoredUser() {
  try {
    const s =
      sessionStorage.getItem("user") || localStorage.getItem("user") || "";
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
function getStoredToken() {
  const u = getStoredUser();
  return u?.token || localStorage.getItem("token") || "";
}
function getStoredCustomerId() {
  const s1 = sessionStorage.getItem("customerId");
  const s2 = localStorage.getItem("customerId");
  return (s1 && +s1) || (s2 && +s2) || null;
}

/** Lấy accountId đồng bộ từ storage/JWT; KHÔNG dùng fallback số cứng */
function resolveAccountIdSync() {
  const s1 = sessionStorage.getItem("accountId");
  const s2 = localStorage.getItem("accountId");
  if (s1 && !isNaN(+s1)) return +s1;
  if (s2 && !isNaN(+s2)) return +s2;

  const token = getStoredToken();
  const claims = decodeJwtClaims(token) || {};
  const idFromClaim =
    claims?.nameid || claims?.nameId || claims?.sub || claims?.accountId;
  if (idFromClaim && !isNaN(+idFromClaim)) return +idFromClaim;

  // Thiếu accountId ⇒ để effect async dò bằng customerId
  return null;
}

/** Nếu thiếu accountId mà có customerId → gọi GET /Auth (list) để match */
async function findAccountIdByCustomerId(token, customerId) {
  if (!customerId || !API_BASE) return null;
  try {
    const res = await fetch(`${ME_URL}`, {
      headers: {
        accept: "application/json",
        authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];
    const mine = list.find(
      (acc) =>
        Array.isArray(acc?.customers) &&
        acc.customers.some((c) => Number(c?.customerId) === Number(customerId))
    );
    const accId = Number(mine?.accountId ?? mine?.id ?? mine?.userId);
    return Number.isFinite(accId) ? accId : null;
  } catch {
    return null;
  }
}

/* =============== Component =============== */
export default function AccountMenu() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const { user, userName, userRole, token: ctxToken, logout } = useAuth();

  const [displayName, setDisplayName] = React.useState(
    userName || pickName(user) || ""
  );
  const [roleText, setRoleText] = React.useState(userRole || user?.role || "");
  const [avatarUrl, setAvatarUrl] = React.useState("");

  // NEW: quản lý accountId cục bộ, tự tìm nếu thiếu
  const [accountId, setAccountId] = React.useState(() =>
    resolveAccountIdSync()
  );

  const normRole = React.useMemo(() => {
    return (roleText || userRole || user?.role || "").toString().toLowerCase();
  }, [roleText, userRole, user]);

  /* ======= Sync name/role từ context (giống code cũ) ======= */
  React.useEffect(() => {
    if (userName && !displayName) setDisplayName(userName);
    if (userRole && !roleText) setRoleText(userRole);
    if (user) {
      if (!displayName) setDisplayName(pickName(user));
      if (!roleText) setRoleText(user.role || pickRole(user));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userName, userRole]);

  /* ======= Fallback: lấy name/role/avatar từ /Auth (không id) như cũ ======= */
  React.useEffect(() => {
    let ignore = false;
    async function fetchMe() {
      const token = ctxToken || getStoredToken();
      if (!token) return;
      if (displayName && roleText && avatarUrl) return;
      try {
        const res = await fetch(ME_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!res.ok) return;
        let data = null;
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) data = await res.json();
        else {
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = null;
          }
        }
        if (ignore || !data) return;

        const src =
          data.data || data.result || data.user || data.payload || data || {};
        const apiName = pickName(src) || pickName(src.profile || {});
        const apiRole = pickRole(src) || pickRole(src.profile || {});
        if (apiName && !displayName) setDisplayName(apiName);
        if (apiRole && !roleText) setRoleText(apiRole);
        const apiAvatar =
          src.avatarUrl || src.avatar || src.profile?.avatarUrl || "";
        if (apiAvatar && !avatarUrl) setAvatarUrl(apiAvatar);
      } catch {
        /* ignore */
      }
    }
    fetchMe();
    return () => {
      ignore = true;
    };
  }, [ctxToken, displayName, roleText, avatarUrl]);

  /* ======= Fallback: lấy name/role từ JWT claims ======= */
  React.useEffect(() => {
    const token = ctxToken || getStoredToken();
    if (!token) return;
    if (displayName && roleText) return;
    const claims = decodeJwtClaims(token);
    if (!displayName) {
      const jwtName = pickName(claims);
      if (jwtName) setDisplayName(jwtName);
    }
    if (!roleText) {
      const jwtRole = pickRole(claims);
      if (jwtRole) setRoleText(jwtRole);
    }
  }, [ctxToken, displayName, roleText]);

  /* ======= NEW: nếu thiếu accountId, dùng customerId để tra /Auth (list) ======= */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (accountId) return;
      const token = ctxToken || getStoredToken();
      const customerId = getStoredCustomerId();
      if (!token || !customerId) return;
      const accId = await findAccountIdByCustomerId(token, customerId);
      if (alive && Number.isFinite(accId)) {
        setAccountId(accId);
        try {
          localStorage.setItem("accountId", String(accId));
          sessionStorage.setItem("accountId", String(accId));
        } catch {}
      }
    })();
    return () => {
      alive = false;
    };
  }, [accountId, ctxToken]);

  /* ======= NEW: khi đã có accountId → GET /Auth/{accountId} để lấy avatarUrl thật ======= */
  React.useEffect(() => {
    let ignore = false;
    async function fetchAccountById() {
      if (!accountId) return;
      const token = ctxToken || getStoredToken();
      try {
        const res = await fetch(`${ME_URL}/${accountId}`, {
          headers: {
            accept: "application/json",
            authorization: token ? `Bearer ${token}` : undefined,
          },
        });
        if (!res.ok) return;
        const acc = await res.json();
        if (ignore || !acc) return;

        const realAvatar = acc?.avatarUrl || "";
        if (realAvatar) setAvatarUrl(realAvatar);

        // có thể cập nhật name/role “chuẩn” nếu muốn
        if (!displayName) {
          const name =
            acc?.customers?.[0]?.fullName || acc?.userName || acc?.email || "";
          if (name) setDisplayName(name);
        }
        if (!roleText) {
          const r = acc?.role || "";
          if (r) setRoleText(r);
        }
      } catch {
        /* ignore */
      }
    }
    fetchAccountById();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, ctxToken]);

  /* ============== UI handlers ============== */
  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const manageAccountPath = () => {
    const role = (roleText || userRole || user?.role || "")
      .toString()
      .toLowerCase();

    switch (role) {
      case "company":
        return "/profile/enterprise-info";
      case "staff":
        return "/profile/staff-info";
      case "admin":
        return "/profile/admin-info";
      case "customer":
        return "/profile/update-info";
      default:
        return "/profile/update-info";
    }
  };

  return (
    <Box>
      <Button
        id="account-menu-button"
        onClick={handleClick}
        aria-controls={open ? "account-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        endIcon={<KeyboardArrowDownRoundedIcon />}
        sx={{
          textTransform: "none",
          borderRadius: "999px",
          pl: 1,
          pr: 1.25,
          py: 0.5,
          fontWeight: 600,
          color: "text.primary",
          backgroundColor: "white",
          p: "8px !important",
          width: "160px !important",
          border: "0.1px solid rgba(6, 92, 42, 0.17)",
          boxShadow: "0 2px 50px rgba(0,0,0,0.08) ",
          "&:hover": {
            backgroundColor: "#f5f7fa",
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          },
          gap: 1,
        }}
      >
        <Avatar
          alt={displayName || "User"}
          src={avatarUrl}
          sx={{ width: 28, height: 28, fontSize: 13, bgcolor: "primary.main" }}
        >
          {getInitials(displayName) || "U"}
        </Avatar>
        <Typography component="span" sx={{ maxWidth: 160 }} noWrap>
          {displayName || "Tài khoản"}
        </Typography>
      </Button>

      <Menu
        id="account-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.2,
            minWidth: 240,
            borderRadius: "14px",
            p: 0.5,
            boxShadow:
              "0 8px 20px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
          },
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.2,
          }}
        >
          <Avatar
            alt={displayName || "User"}
            src={avatarUrl}
            sx={{ width: 38, height: 38, bgcolor: "primary.main" }}
          >
            {getInitials(displayName) || "U"}
          </Avatar>
          <Box>
            <Typography fontWeight={600} fontSize={14} noWrap>
              {displayName || "Tài khoản"}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontSize={12}>
              {roleText || "User"}
            </Typography>
          </Box>
        </Box>

        <Divider />

        <MenuItem
          onClick={() => {
            handleClose();
            navigate(manageAccountPath());
          }}
          sx={{
            borderRadius: "10px",
            mx: 0.5,
            margin: "5px 0px",
            "&:hover": { background: "#f5f7fa" },
          }}
        >
          Quản lý tài khoản
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            navigate("/company/reports");
          }}
          sx={{
            borderRadius: "10px",
            mx: 0.5,
            margin: "5px 0px",
            "&:hover": { background: "#f5f7fa" },
          }}
        >
          Thống kê theo tháng
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            navigate("/charging");
          }}
          sx={{
            borderRadius: "10px",
            mx: 0.5,
            margin: "5px 0px",
            "&:hover": { background: "#f5f7fa" },
          }}
        >
          Phiên đang sạc
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            navigate("/manageSubcription");
          }}
          sx={{
            borderRadius: "10px",
            mx: 0.5,
            margin: "5px 0px",
            "&:hover": { background: "#f5f7fa" },
          }}
        >
          Quản lý gói dịch vụ
        </MenuItem>

        {normRole === "customer" && (
          <MenuItem
            onClick={() => {
              handleClose();
              navigate("/my-feedback");
            }}
            sx={{
              borderRadius: "10px",
              mx: 0.5,
              margin: "5px 0px",
              "&:hover": { background: "#f5f7fa" },
            }}
          >
            Đánh giá của tôi
          </MenuItem>
        )}

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={() => {
            handleClose();
            logout();
            navigate("/");
          }}
          sx={{
            borderRadius: "10px",
            mx: 0.5,
            color: "error.main",
            "& .MuiSvgIcon-root": { color: "error.main" },
            "&:hover": { backgroundColor: "#fff2f2" },
          }}
        >
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          Đăng xuất
        </MenuItem>
      </Menu>
    </Box>
  );
}
