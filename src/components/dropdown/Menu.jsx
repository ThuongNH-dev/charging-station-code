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

const ME_URL = "https://localhost:7268/api/users/me"; // endpoint lấy thông tin người dùng

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

  const { user, logout } = useAuth(); // user: { id, name, email, role, token }
  const [displayName, setDisplayName] = React.useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = React.useState("");

  // Lấy tên từ API nếu chưa có trong token/response login
  React.useEffect(() => {
    let ignore = false;

    async function fetchMe() {
      if (!user?.token) return;
      if (user?.name) {
        setDisplayName(user.name);
        return;
      }
      try {
        const res = await fetch(ME_URL, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          const name =
            data?.fullName ||
            data?.name ||
            data?.user?.fullName ||
            data?.user?.name ||
            "";
          const avatar =
            data?.avatarUrl || data?.user?.avatarUrl || data?.avatar || "";
          setDisplayName(name || displayName);
          setAvatarUrl(avatar || "");
        }
      } catch (e) {
        // im lặng nếu lỗi
      }
    }

    fetchMe();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <Box>
      {/* Nút chính */}
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

      {/* Menu dropdown */}
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
        {/* Header profile */}
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
              {user?.role || "User"}
            </Typography>
          </Box>
        </Box>

        <Divider />

        <MenuItem
          onClick={() => {
            handleClose();
            navigate("/profile");
          }}
          sx={{ borderRadius: "10px", mx: 0.5, "&:hover": { background: "#f5f7fa" } }}
        >
          <ListItemIcon>
            <PersonOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          Hồ sơ cá nhân
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            navigate("/settings");
          }}
          sx={{ borderRadius: "10px", mx: 0.5, "&:hover": { background: "#f5f7fa" } }}
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
          sx={{ borderRadius: "10px", mx: 0.5, "&:hover": { background: "#f5f7fa" } }}
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
            logout(); // dùng logout thật từ AuthContext
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
