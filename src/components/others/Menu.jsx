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

const ME_URL = "https://localhost:7268/api/Auth";

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

export default function AccountMenu() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const { user, userName, userRole, token, logout } = useAuth();

  const [displayName, setDisplayName] = React.useState(
    userName || pickName(user) || ""
  );
  const [roleText, setRoleText] = React.useState(userRole || user?.role || "");
  const [avatarUrl, setAvatarUrl] = React.useState("");

  // ngay sau các useState/useAuth:
  const normRole = React.useMemo(() => {
    return (roleText || userRole || user?.role || "").toString().toLowerCase();
  }, [roleText, userRole, user]);


  React.useEffect(() => {
    if (userName && !displayName) setDisplayName(userName);
    if (userRole && !roleText) setRoleText(userRole);
    if (user) {
      if (!displayName) setDisplayName(pickName(user));
      if (!roleText) setRoleText(user.role || pickRole(user));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userName, userRole]);

  React.useEffect(() => {
    let ignore = false;
    async function fetchMe() {
      if (!token) return;
      if (displayName && roleText) return;
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
        if (apiAvatar) setAvatarUrl(apiAvatar);
      } catch {
        /* ignore */
      }
    }
    fetchMe();
    return () => {
      ignore = true;
    };
  }, [token, displayName, roleText]);

  React.useEffect(() => {
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
  }, [token, displayName, roleText]);

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
            navigate(manageAccountPath()); // ✅ dùng hàm chọn theo role
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
