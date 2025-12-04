export const vietnamAddressData: Record<string, Record<string, string[]>> = {
  'Hà Nội': {
    'Ba Đình': ['Phường Cống Vị', 'Phường Trúc Bạch', 'Phường Liễu Giai', 'Phường Ngọc Khánh', 'Phường Quán Thánh'],
    'Hoàn Kiếm': ['Phường Hàng Bạc', 'Phường Hàng Bột', 'Phường Hàng Gai', 'Phường Hàng Mã', 'Phường Hoàn Kiếm'],
    'Tây Hồ': ['Phường Nhật Tân', 'Phường Tây Hồ', 'Phường Quảng An', 'Phường Thục Lâm', 'Phường Bạch Đằng'],
    'Long Biên': ['Phường Gia Thụy', 'Phường Ngô Quyền', 'Phường Yên Phụ', 'Phường Đồng Tâm', 'Phường Việt Hùng'],
    'Thanh Xuân': ['Phường Nhân Chính', 'Phường Phương Liên', 'Phường Thanh Xuân Bắc', 'Phường Thanh Xuân Nam', 'Phường Thạch Bàn'],
  },
  'Hồ Chí Minh': {
    'Quận 1': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Ông Lãnh', 'Phường Cô Giang', 'Phường Đa Kao'],
    'Quận 2': ['Phường An Lợi Đông', 'Phường An Phú', 'Phường Bình An', 'Phường Cát Lái', 'Phường Thảo Điền'],
    'Quận 3': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5'],
    'Quận 4': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5'],
    'Quận 5': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5'],
  },
  'Đà Nẵng': {
    'Hải Châu': ['Phường Nại Hiên Đông', 'Phường Mân Thái', 'Phường Thạch Thang', 'Phường Hòa Cường Bắc', 'Phường Hòa Cường Nam'],
    'Thanh Khê': ['Phường Thạch Thang', 'Phường Tân Chính', 'Phường Tam Thuận', 'Phường Thạc Gián', 'Phường Vĩnh Trung'],
    'Sơn Trà': ['Phường Mỹ An', 'Phường Nại Hiên Đông', 'Phường Thọ Quang', 'Phường An Hải Bắc', 'Phường An Hải Đông'],
  },
  'Cần Thơ': {
    'Ninh Kiều': ['Phường Cái Khế', 'Phường Phú Thứ', 'Phường Tân An', 'Phường An Hòa', 'Phường An Khánh'],
    'Bình Thủy': ['Phường Bình Thủy', 'Phường Long Hòa', 'Phường An Thới', 'Phường Trà An'],
    'Cái Răng': ['Phường Lê Bình', 'Phường Thường Thạnh', 'Phường Phú Thứ'],
  },
};

export const getProvinces = () => Object.keys(vietnamAddressData).sort();

export const getDistricts = (province: string) => {
  if (!province || !vietnamAddressData[province]) return [];
  return Object.keys(vietnamAddressData[province]).sort();
};

export const getWards = (province: string, district: string) => {
  if (!province || !district) return [];
  const districts = vietnamAddressData[province];
  if (!districts || !districts[district]) return [];
  return districts[district].slice().sort();
};
