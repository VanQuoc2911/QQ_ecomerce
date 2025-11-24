import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SaveIcon from "@mui/icons-material/Save";
import { Box, Button, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axios";

interface BankAccount {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  branch?: string;
}

export default function BankAccountSettings() {
  const [bankAccount, setBankAccount] = useState<BankAccount>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBankAccount = async () => {
      setLoading(true);
      try {
        const res = await api.get("/auth/profile", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        if (res.data.bankAccount) {
          setBankAccount(res.data.bankAccount);
        }
      } catch (err) {
        console.error("Error fetching bank account:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBankAccount();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankAccount((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!bankAccount.accountNumber) {
      toast.warning("Vui lòng nhập số tài khoản ngân hàng");
      return;
    }

    setSaving(true);
    try {
      await api.put(
        "/auth/profile",
        { bankAccount },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }
      );
      toast.success("✅ Cập nhật thông tin ngân hàng thành công!");
    } catch (err) {
      console.error("Error saving bank account:", err);
      toast.error("❌ Cập nhật thất bại!");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 600 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <AccountBalanceIcon sx={{ mr: 2, fontSize: 32, color: "primary.main" }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>
            🏦 Thông tin tài khoản ngân hàng
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Thông tin này sẽ hiển thị cho khách hàng khi thanh toán
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
        <TextField
          label="Tên ngân hàng"
          placeholder="VCB, TCB, Vietcombank, etc."
          name="bankName"
          value={bankAccount.bankName || ""}
          onChange={handleInputChange}
          fullWidth
          size="small"
        />

        <TextField
          label="Số tài khoản"
          placeholder="Nhập số tài khoản ngân hàng"
          name="accountNumber"
          value={bankAccount.accountNumber || ""}
          onChange={handleInputChange}
          fullWidth
          size="small"
          required
        />

        <TextField
          label="Chủ tài khoản"
          placeholder="Tên chủ tài khoản"
          name="accountHolder"
          value={bankAccount.accountHolder || ""}
          onChange={handleInputChange}
          fullWidth
          size="small"
        />

        <TextField
          label="Chi nhánh"
          placeholder="Chi nhánh ngân hàng (tùy chọn)"
          name="branch"
          value={bankAccount.branch || ""}
          onChange={handleInputChange}
          fullWidth
          size="small"
        />
      </Box>

      <Button
        variant="contained"
        startIcon={<SaveIcon />}
        onClick={handleSave}
        disabled={saving}
        fullWidth
      >
        {saving ? "Đang lưu..." : "💾 Lưu thông tin ngân hàng"}
      </Button>

      <Box sx={{ mt: 2, p: 2, bgcolor: "#e3f2fd", borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          💡 <strong>Lưu ý:</strong> Thông tin này sẽ được hiển thị cho khách hàng khi họ thanh toán qua VNPAY.
          Hãy đảm bảo thông tin chính xác để khách hàng có thể chuyển khoản trực tiếp nếu cần.
        </Typography>
      </Box>
    </Paper>
  );
}
