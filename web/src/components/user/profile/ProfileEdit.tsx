import {
    Avatar,
    Box,
    Button,
    TextField,
    Typography,
} from "@mui/material";
import { type ChangeEvent, useEffect, useState } from "react";
import { api } from "../../../api/axios";
import type { User } from "../../../types/User";

export default function ProfileEdit() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.get<User>("/profile");
      setUser(res.data);
      setName(res.data.name);
      setPhone(res.data.phone || "");
      setAddress(res.data.address || "");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setAvatar(e.target.files[0]);
  };

  const handleSave = async () => {
    try {
      let avatarUrl: string | undefined;
      if (avatar) {
        // convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(avatar);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
        avatarUrl = base64;
      }

      const res = await api.put("/profile", {
        name,
        phone,
        address,
        avatar: avatarUrl,
      });

      alert("Profile updated");
      setUser(res.data.user);
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  if (!user) return <Typography>Loading...</Typography>;

  return (
    <Box display="flex" flexDirection="column" gap={2} width={400}>
      <Avatar src={user.avatar} sx={{ width: 120, height: 120 }} />
      <Button variant="contained" component="label">
        Upload Avatar
        <input type="file" hidden onChange={handleAvatarChange} />
      </Button>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <Button variant="contained" color="primary" onClick={handleSave}>
        Save Changes
      </Button>
    </Box>
  );
}
