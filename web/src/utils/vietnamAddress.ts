// Vietnamese provinces, districts, and wards data
export const vietnamAddressData = {
  "Hà Nội": {
    "Ba Đình": ["Phường Cống Vị", "Phường Trúc Bạch", "Phường Liễu Giai", "Phường Ngọc Khánh", "Phường Quán Thánh"],
    "Hoàn Kiếm": ["Phường Hàng Bạc", "Phường Hàng Bột", "Phường Hàng Gai", "Phường Hàng Mã", "Phường Hoàn Kiếm"],
    "Tây Hồ": ["Phường Nhật Tân", "Phường Tây Hồ", "Phường Quảng An", "Phường Thục Lâm", "Phường Bạch Đằng"],
    "Long Biên": ["Phường Gia Thụy", "Phường Ngô Quyền", "Phường Yên Phụ", "Phường Đồng Tâm", "Phường Việt Hùng"],
    "Thanh Xuân": ["Phường Nhân Chính", "Phường Phương Liên", "Phường Thanh Xuân Bắc", "Phường Thanh Xuân Nam", "Phường Thạch Bàn"],
  },
  "Hồ Chí Minh": {
    "Quận 1": ["Phường Bến Nghé", "Phường Bến Thành", "Phường Cầu Ông Lãnh", "Phường Cô Giang", "Phường Dạ Kao"],
    "Quận 2": ["Phường An Lợi Đông", "Phường An Phú", "Phường Bàu Bàng", "Phường Cát Lái", "Phường Thảo Điền"],
    "Quận 3": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5"],
    "Quận 4": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5"],
    "Quận 5": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5"],
  },
  "Đà Nẵng": {
    "Hải Châu": ["Phường Nại Hiên Đông", "Phường Mân Thái", "Phường Thạch Thang", "Phường Hòa Cường Bắc", "Phường Hòa Cường Nam"],
    "Thanh Khê": ["Phường Thạch Thang", "Phường Tân Chính", "Phường Tam Thuận", "Phường Thạc Gián", "Phường Vĩnh Trung"],
    "Sơn Trà": ["Phường Mỹ An", "Phường Nộm", "Phường Thọ Quang", "Phường An Hải Bắc", "Phường An Hải Đông"],
  },
  "Cần Thơ": {
    "Ninh Kiều": ["Phường Cái Khế", "Phường Phú Thứ", "Phường Tân An", "Phường An Hòa", "Phường An Khánh"],
    "Bình Thủy": ["Phường Bình Thủy", "Phường Long Hồ", "Phường An Thới", "Phường Trần Hưng Đạo"],
    "Cốc Dương": ["Phường Cốc Dương", "Phường Lê Bình", "Phường Thới Long"],
  },
};

export const getProvinces = (): string[] => {
  return Object.keys(vietnamAddressData).sort();
};

export const getDistricts = (province: string): string[] => {
  const data = vietnamAddressData as Record<string, Record<string, string[]>>;
  return province && data[province] ? Object.keys(data[province]).sort() : [];
};

export const getWards = (province: string, district: string): string[] => {
  const data = vietnamAddressData as Record<string, Record<string, string[]>>;
  return province && district && data[province] && data[province][district]
    ? data[province][district].sort()
    : [];
};
