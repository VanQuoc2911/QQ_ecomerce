import { Box, Button, TextField, Typography } from "@mui/material";
import type { AxiosError } from "axios";
import { useState } from "react";
import { userService } from "../../../api/userService";

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

    const handleChangePassword = async () => {
    try {
        await userService.changePassword(oldPassword, newPassword);
        alert("Password changed successfully");
        setOldPassword("");
        setNewPassword("");
    } catch (err: unknown) {
        let message = "Change password failed";
        if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as AxiosError<{ message: string }>;
        message = axiosErr.response?.data?.message ?? message;
        }
        alert(message);
    }
    };


  return (
    <Box display="flex" flexDirection="column" gap={2} width={400}>
      <Typography variant="h6">Change Password</Typography>
      <TextField
        label="Old Password"
        type="password"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
      />
      <TextField
        label="New Password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Button variant="contained" color="secondary" onClick={handleChangePassword}>
        Change Password
      </Button>
    </Box>
  );
}
