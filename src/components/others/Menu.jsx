// src/components/AccountMenu.jsx
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
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
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

export default function AccountMenu() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  // 🔧 Lấy đúng field phẳng từ AuthContext
  const { userName, userRole, token, logout } = useAuth();

  const [displayName, setDisplayName] = React.useState(userName || "");
  const [avatarUrl, setAvatarUrl] = React.useState("");

  // Nếu chưa có tên trong storage/token thì gọi /me
  React.useEffect(() => {
    let ignore = false;

    async function fetchMe() {
      if (!token) return;

      // nếu đã có userName từ context thì ưu tiên dùng
      if (userName) {
        setDisplayName(userName);
        return;
      }

      try {
        const res = await fetch(ME_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          console.warn("ME fetch failed:", res.status);
          return;
        }

        // an toàn với 204/empty/body không phải JSON
        let data = null;
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch {
            /* để data = null */
          }
        }

        if (ignore) return;

        // gom đủ kiểu envelope phổ biến: data, result, user, payload...
        const src =
          data?.data ||
          data?.result ||
          data?.user ||
          data?.payload ||
          data ||
          {};

        const name =
          src.fullName ||
          src.name ||
          src.userName ||
          src.displayName ||
          src.profile?.fullName ||
          src.profile?.name ||
          "";

        const avatar =
          src.avatarUrl ||
          src.avatar ||
          src.user?.avatarUrl ||
          src.profile?.avatarUrl ||
          "";

        if (name) setDisplayName(name);
        if (avatar) setAvatarUrl(avatar);

        // fallback cuối cùng: lấy từ JWT nếu BE không trả tên
        if (!name && token) {
          try {
            const [, payload] = token.split(".");
            const obj = JSON.parse(atob(payload));
            const jwtName =
              obj.name ||
              obj.unique_name ||
              obj.given_name ||
              obj.preferred_username ||
              "";
            if (jwtName) setDisplayName(jwtName);
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        console.warn("ME fetch error:", e);
      }
    }

    fetchMe();
    return () => {
      ignore = true;
    };
  }, [token, userName]);

  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

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
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
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
        <Typography component="span" sx={{ maxWidth: 140 }} noWrap>
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
            px: 2,
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
              {userRole || "User"}
            </Typography>
          </Box>
        </Box>

        <Divider />

        <MenuItem
          onClick={() => {
            handleClose();
            if (userRole === "Enterprise" || userRole === "Business") {
              navigate("/profile/enterprise-info");
            } else {
              navigate("/profile/update-info");
            }
          }}
          sx={{
            borderRadius: "10px",
            mx: 0.5,
            "&:hover": { background: "#f5f7fa" },
          }}
        >
          <ListItemIcon>
            <PersonOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          {userRole === "Enterprise" || userRole === "Business"
            ? "Hồ sơ doanh nghiệp"
            : "Hồ sơ cá nhân"}
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            navigate("/update");
          }}
          sx={{
            borderRadius: "10px",
            mx: 0.5,
            "&:hover": { background: "#f5f7fa" },
          }}
        >
          <ListItemIcon>
            <ManageAccountsRoundedIcon fontSize="small" />
          </ListItemIcon>
          Cài đặt tài khoản
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            navigate("/dashboard");
          }}
          sx={{
            borderRadius: "10px",
            mx: 0.5,
            "&:hover": { background: "#f5f7fa" },
          }}
        >
          <ListItemIcon>
            <DashboardCustomizeRoundedIcon fontSize="small" />
          </ListItemIcon>
          Bảng điều khiển
        </MenuItem>

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
