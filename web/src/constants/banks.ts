// Danh sách ngân hàng Việt Nam với mã ngân hàng
export const VIETNAM_BANKS = [
  { code: "970405", name: "Ngân hàng TMCP Công Thương Việt Nam - VietcomBank" },
  { code: "970406", name: "Ngân hàng TMCP Phát Triển Nhân Lực Việt Nam - HDBank" },
  { code: "970407", name: "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam - Eximbank" },
  { code: "970408", name: "Ngân hàng TMCP Tiên Phong - TPBank" },
  { code: "970409", name: "Ngân hàng TMCP Á Châu - ACB" },
  { code: "970410", name: "Ngân hàng TMCP Quốc Tế Việt Nam - VIB" },
  { code: "970412", name: "Ngân hàng TMCP Xu Hướng Việt Nam - TCB" },
  { code: "970414", name: "Ngân hàng TMCP Kỹ Thương Việt Nam - Techcombank" },
  { code: "970415", name: "Ngân hàng TMCP Bưu Điện Liên Việt - LPBank" },
  { code: "970416", name: "Ngân hàng TMCP Hàng Hải Việt Nam - MaritimeBank" },
  { code: "970417", name: "Ngân hàng TMCP Quân Đội - MBBank" },
  { code: "970418", name: "Ngân hàng TMCP Nam Á - Nam A Bank" },
  { code: "970419", name: "Ngân hàng TMCP Quốc Dân - NCB" },
  { code: "970420", name: "Ngân hàng TMCP Sacombank - SCB" },
  { code: "970421", name: "Ngân hàng TMCP Sài Gòn - SGB" },
  { code: "970422", name: "Ngân hàng TMCP Đông Á - DongA Bank" },
  { code: "970423", name: "Ngân hàng TMCP Bắc Á - BacABank" },
  { code: "970424", name: "Ngân hàng Thương Mại Cổ Phần Bản Việt - BVBank" },
  { code: "970425", name: "Ngân hàng TMCP Shinhan Việt Nam" },
  { code: "970426", name: "Ngân hàng TMCP Công Nghiệp Hàn Quốc - KEB" },
  { code: "970427", name: "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam - BIDV" },
  { code: "970428", name: "Ngân hàng TMCP Quốc Tế Hàn Quốc - IBK" },
  { code: "970430", name: "Ngân hàng TMCP Dầu Khí Toàn Cầu - Globalbank" },
  { code: "970431", name: "Ngân hàng TMCP Xây Dựng Việt Nam - CBB" },
  { code: "970432", name: "Ngân hàng TMCP Agribank" },
  { code: "970433", name: "Ngân hàng TMCP Ôm Việt Nam" },
  { code: "970434", name: "Ngân hàng TMCP Ngoại Thương Việt Nam - VietExim" },
  { code: "970435", name: "Ngân hàng TMCP Công Nghiệp Việt Nam - VietInBank" },
  { code: "970436", name: "Ngân hàng TMCP Ngoại Thương Việt Nam - Vietcombank (Thương Mại)" },
  { code: "970437", name: "Ngân hàng Phát Triển Việt Nam - VDB" },
  { code: "970438", name: "Ngân hàng Xuất Nhập Khẩu Việt Nam - VBSP" },
  { code: "970439", name: "Ngân hàng Nông Nghiệp Việt Nam - Agribank" },
  { code: "970440", name: "Ngân hàng Lĩnh Kiệm Việt Nam - VCCB" },
];

// Hàm tìm tên ngân hàng theo mã
export const getBankNameByCode = (code: string): string => {
  const bank = VIETNAM_BANKS.find(b => b.code === code);
  return bank ? bank.name : code;
};

// Hàm tìm mã ngân hàng theo tên
export const getBankCodeByName = (name: string): string => {
  const bank = VIETNAM_BANKS.find(b => b.name.toLowerCase().includes(name.toLowerCase()));
  return bank ? bank.code : "";
};
