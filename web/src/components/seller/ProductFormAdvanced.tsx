import { CameraAlt, CloudUpload, PhotoLibrary } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { Product } from '../../types/Product';
import { uploadImageToCloudinary } from '../../utils/cloudinary';

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (productData: Omit<Product, 'id' | '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  product?: Product | null;
  title: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`image-tabpanel-${index}`}
      aria-labelledby={`image-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ProductForm({ open, onClose, onSubmit, product, title }: ProductFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    price: 0,
    description: '',
    stock: 0,
    image: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        price: product.price || 0,
        description: product.description || '',
        stock: product.stock || 0,
        image: product.image || ''
      });
    } else {
      setFormData({
        title: '',
        price: 0,
        description: '',
        stock: 0,
        image: ''
      });
    }
    setError('');
    setTabValue(0);
  }, [product, open]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'price' || field === 'stock' ? Number(event.target.value) : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const imageUrl = await uploadImageToCloudinary(file);
      setFormData(prev => ({
        ...prev,
        image: imageUrl
      }));
    } catch (err) {
      setError('Upload ảnh thất bại. Vui lòng thử lại.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
            await handleFileUpload(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.title.trim()) {
        throw new Error('Tên sản phẩm không được để trống');
      }
      if (formData.price <= 0) {
        throw new Error('Giá sản phẩm phải lớn hơn 0');
      }
      if (formData.stock < 0) {
        throw new Error('Số lượng tồn kho không được âm');
      }

      await onSubmit({
        ...formData,
        sellerId: product?.sellerId || 2, // Use existing sellerId or default to 2
        status: product?.status || 'pending' as const
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Tên sản phẩm"
              value={formData.title}
              onChange={handleChange('title')}
              required
              fullWidth
            />
            
            <TextField
              label="Giá (VNĐ)"
              type="number"
              value={formData.price}
              onChange={handleChange('price')}
              required
              fullWidth
              inputProps={{ min: 0 }}
            />
            
            <TextField
              label="Số lượng tồn kho"
              type="number"
              value={formData.stock}
              onChange={handleChange('stock')}
              required
              fullWidth
              inputProps={{ min: 0 }}
            />
            
            <TextField
              label="Mô tả"
              value={formData.description}
              onChange={handleChange('description')}
              multiline
              rows={3}
              fullWidth
            />

            {/* Image Upload Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Hình ảnh sản phẩm
              </Typography>
              
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                  <Tab icon={<PhotoLibrary />} label="Từ thiết bị" />
                  <Tab icon={<CameraAlt />} label="Chụp ảnh" />
                  <Tab icon={<CloudUpload />} label="URL" />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <Card>
                  <CardContent>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                    
                    <Box
                      sx={{
                        border: '2px dashed #ccc',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        opacity: uploading ? 0.6 : 1,
                        '&:hover': {
                          borderColor: uploading ? '#ccc' : '#1976d2',
                        }
                      }}
                      onClick={() => {
                        if (!uploading) {
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      {uploading ? (
                        <Typography>Đang upload...</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <PhotoLibrary sx={{ fontSize: 48, color: '#ccc' }} />
                          <Typography variant="body2" color="text.secondary">
                            Nhấp để chọn ảnh từ thiết bị
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Tối đa 5MB
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{
                          width: '100%',
                          maxHeight: '300px',
                          borderRadius: '8px',
                          backgroundColor: '#000'
                        }}
                      />
                      <canvas
                        ref={canvasRef}
                        style={{ display: 'none' }}
                      />
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                          variant="contained"
                          startIcon={<CameraAlt />}
                          onClick={startCamera}
                          disabled={uploading}
                        >
                          Bật Camera
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CameraAlt />}
                          onClick={capturePhoto}
                          disabled={uploading || !streamRef.current}
                        >
                          Chụp ảnh
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={stopCamera}
                        >
                          Tắt Camera
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <TextField
                  label="URL hình ảnh"
                  value={formData.image}
                  onChange={handleChange('image')}
                  fullWidth
                  placeholder="https://example.com/image.jpg"
                />
              </TabPanel>

              {/* Preview Image */}
              {formData.image && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Xem trước:
                  </Typography>
                  <img
                    src={formData.image}
                    alt="Preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid #ddd'
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" variant="contained" disabled={loading || uploading}>
            {loading ? 'Đang xử lý...' : (product ? 'Cập nhật' : 'Thêm mới')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}