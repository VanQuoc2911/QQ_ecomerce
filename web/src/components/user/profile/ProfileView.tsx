import { Avatar, Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { userService } from "../../../api/userService";
import type { UserProfile } from "../../../types/User";

export default function ProfileView() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getProfile();
        setProfile(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);

  if (!profile) return <Typography>Loading...</Typography>;

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
      <Avatar src={profile.avatar} sx={{ width: 120, height: 120 }} />
      <Typography variant="h5">{profile.name}</Typography>
      <Typography>{profile.email}</Typography>
      <Typography>{profile.phone}</Typography>
      <Typography>{profile.address}</Typography>
    </Box>
  );
}
