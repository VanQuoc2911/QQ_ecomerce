import {
  Box,
  Chip,
  CircularProgress,
  Container,
  Fade,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import { productService } from "../../api/productService";
import ProductCard from "../../components/user/ProductCard";
import type { ProductResponse } from "../../types/Product";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

export default function Home() {
  const [productResponse, setProductResponse] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService
      .getProducts({ page: 1, limit: 12, status: "approved" })
      .then(setProductResponse)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'moveBackground 20s linear infinite',
        },
        '@keyframes moveBackground': {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(50px, 50px)' }
        }
      }}>
        <Stack alignItems="center" spacing={4} sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ position: 'relative' }}>
            <CircularProgress 
              size={90} 
              thickness={3.5}
              sx={{
                color: '#fff',
                filter: 'drop-shadow(0 8px 32px rgba(126, 34, 206, 0.6))'
              }}
            />
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
            }} />
          </Box>
          <Stack spacing={1} alignItems="center">
            <Typography 
              variant="h5"
              sx={{ 
                color: 'white',
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase'
              }}
            >
              Đang tải
            </Typography>
            <Typography 
              sx={{ 
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.95rem',
                fontWeight: 500
              }}
            >
              Chuẩn bị trải nghiệm mua sắm tuyệt vời...
            </Typography>
          </Stack>
        </Stack>
      </Box>
    );
  }

  const products = productResponse?.items || [];
  const hotProducts = products.filter((p) => p.stock < 5 || (p.stock < 5 && p.title.includes("Hot"))).slice(0, 5);

  const bannerSettings = {
    dots: true,
    infinite: true,
    autoplay: true,
    speed: 1200,
    autoplaySpeed: 6000,
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: true,
    cssEase: 'cubic-bezier(0.87, 0, 0.13, 1)',
    pauseOnHover: true,
    appendDots: (dots: React.ReactNode) => (
      <Box sx={{ 
        bottom: { xs: 15, md: 40 },
        '& li': {
          margin: '0 6px',
        },
        '& li button': {
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
          transition: 'all 0.3s ease',
        },
        '& li.slick-active button': {
          width: 40,
          borderRadius: 6,
          background: 'white',
        }
      }}>
        <ul style={{ margin: 0, padding: 0, display: 'flex', justifyContent: 'center' }}>{dots}</ul>
      </Box>
    ),
  };

  return (
    <Box sx={{ 
      background: 'linear-gradient(180deg, #f0f4ff 0%, #ffffff 40%, #fafbff 100%)',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Background Pattern */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '100%',
        background: `
          radial-gradient(circle at 20% 30%, rgba(30, 60, 114, 0.03) 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(126, 34, 206, 0.03) 0%, transparent 40%)
        `,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Premium Hero Banner */}
      <Box sx={{ 
        mb: { xs: 6, md: 10 },
        position: 'relative',
        zIndex: 1
      }}>
        {hotProducts.length > 0 && (
          <Box sx={{ 
            position: 'relative',
            '& .slick-slider': {
              overflow: 'hidden'
            }
          }}>
            <Slider {...bannerSettings}>
              {hotProducts.map((product) => (
                <Box key={product._id}>
                  <Box
                    sx={{
                      height: { xs: 350, sm: 500, md: 600 },
                      position: 'relative',
                      background: `
                        linear-gradient(135deg, 
                          rgba(30, 60, 114, 0.92) 0%, 
                          rgba(42, 82, 152, 0.88) 35%,
                          rgba(126, 34, 206, 0.85) 100%
                        ), 
                        url(${product.images?.[0] || 'https://via.placeholder.com/1920x600'}) center/cover
                      `,
                      display: 'flex',
                      alignItems: 'center',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `
                          radial-gradient(circle at 30% 40%, rgba(255,255,255,0.15) 0%, transparent 50%),
                          radial-gradient(circle at 70% 60%, rgba(126, 34, 206, 0.2) 0%, transparent 50%)
                        `,
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '30%',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
                      }
                    }}
                  >
                    <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 3 }}>
                      <Grid container alignItems="center" spacing={4}>
                        <Grid item xs={12} md={7}>
                          <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          >
                            <Stack spacing={3}>
                              {/* Premium Badge */}
                              <Box>
                                <Chip 
                                  label="🔥 GIỚI HẠN - ĐANG HOT" 
                                  sx={{ 
                                    bgcolor: 'rgba(255, 59, 48, 0.95)',
                                    color: 'white',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    px: 2.5,
                                    py: 0.3,
                                    height: 36,
                                    backdropFilter: 'blur(10px)',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    boxShadow: '0 4px 20px rgba(255, 59, 48, 0.4)',
                                    letterSpacing: 1
                                  }}
                                />
                              </Box>

                              {/* Product Title */}
                              <Typography
                                variant="h1"
                                sx={{
                                  color: 'white',
                                  fontWeight: 900,
                                  fontSize: { xs: '2.2rem', sm: '3.5rem', md: '4.5rem' },
                                  textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                                  letterSpacing: '-1.5px',
                                  lineHeight: 1.1,
                                  maxWidth: '700px',
                                  mb: 2
                                }}
                              >
                                {product.title}
                              </Typography>

                              {/* Description */}
                              <Typography
                                variant="h6"
                                sx={{
                                  color: 'rgba(255,255,255,0.95)',
                                  fontWeight: 400,
                                  fontSize: { xs: '1rem', md: '1.2rem' },
                                  maxWidth: '600px',
                                  lineHeight: 1.6,
                                  textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                                }}
                              >
                                {product.description?.slice(0, 120)}...
                              </Typography>

                              {/* Price & CTA */}
                              <Stack direction="row" spacing={3} alignItems="center" sx={{ mt: 2 }}>
                                <Paper
                                  elevation={0}
                                  sx={{ 
                                    bgcolor: 'white',
                                    px: 4,
                                    py: 2,
                                    borderRadius: 3,
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                                    border: '3px solid rgba(126, 34, 206, 0.3)'
                                  }}
                                >
                                  <Typography 
                                    sx={{ 
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color: 'text.secondary',
                                      mb: 0.5,
                                      textTransform: 'uppercase',
                                      letterSpacing: 1
                                    }}
                                  >
                                    Chỉ từ
                                  </Typography>
                                  <Typography
                                    sx={{
                                      background: 'linear-gradient(135deg, #1e3c72 0%, #7e22ce 100%)',
                                      WebkitBackgroundClip: 'text',
                                      WebkitTextFillColor: 'transparent',
                                      fontWeight: 900,
                                      fontSize: { xs: '1.8rem', md: '2.5rem' },
                                      lineHeight: 1
                                    }}
                                  >
                                    {product.price.toLocaleString('vi-VN')}₫
                                  </Typography>
                                </Paper>

                                {product.stock < 10 && (
                                  <Chip
                                    label={`Chỉ còn ${product.stock} sản phẩm`}
                                    sx={{
                                      bgcolor: 'rgba(255, 204, 0, 0.95)',
                                      color: '#1e3c72',
                                      fontWeight: 700,
                                      fontSize: '0.9rem',
                                      height: 40,
                                      px: 2,
                                      backdropFilter: 'blur(10px)',
                                      boxShadow: '0 4px 15px rgba(255, 204, 0, 0.4)'
                                    }}
                                  />
                                )}
                              </Stack>
                            </Stack>
                          </motion.div>
                        </Grid>
                      </Grid>
                    </Container>

                    {/* Floating Decorative Elements */}
                    <motion.div
                      animate={{ 
                        y: [0, -20, 0],
                        rotate: [0, 5, 0]
                      }}
                      transition={{ 
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        position: 'absolute',
                        top: '10%',
                        right: '10%',
                        zIndex: 1
                      }}
                    >
                      <Box sx={{
                        width: { xs: 80, md: 120 },
                        height: { xs: 80, md: 120 },
                        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }} />
                    </motion.div>

                    <motion.div
                      animate={{ 
                        y: [0, 20, 0],
                        rotate: [0, -5, 0]
                      }}
                      transition={{ 
                        duration: 7,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '15%',
                        right: '5%',
                        zIndex: 1
                      }}
                    >
                      <Box sx={{
                        width: { xs: 60, md: 90 },
                        height: { xs: 60, md: 90 },
                        borderRadius: '50%',
                        background: 'rgba(126, 34, 206, 0.2)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }} />
                    </motion.div>
                  </Box>
                </Box>
              ))}
            </Slider>
          </Box>
        )}
      </Box>

      {/* Main Products Section */}
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 8 }, position: 'relative', zIndex: 1 }}>
        <Fade in timeout={800}>
          <Box>
            {/* Premium Section Header */}
            <Box sx={{ 
              textAlign: 'center',
              mb: { xs: 5, md: 8 },
              position: 'relative'
            }}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <Stack spacing={2} alignItems="center">
                  {/* Small label */}
                  <Typography
                    sx={{
                      color: '#7e22ce',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      textTransform: 'uppercase',
                      letterSpacing: 3
                    }}
                  >
                    Bộ sưu tập
                  </Typography>

                  {/* Main Title */}
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 900,
                      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontSize: { xs: '2.5rem', md: '4rem' },
                      letterSpacing: '-2px',
                      lineHeight: 1.1
                    }}
                  >
                    Sản phẩm nổi bật
                  </Typography>

                  {/* Subtitle */}
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'text.secondary',
                      fontWeight: 400,
                      fontSize: { xs: '1rem', md: '1.2rem' },
                      maxWidth: '700px',
                      lineHeight: 1.7
                    }}
                  >
                    Khám phá những sản phẩm được tuyển chọn kỹ lưỡng, đáp ứng mọi nhu cầu của bạn với chất lượng vượt trội
                  </Typography>
                </Stack>
              </motion.div>
              
              {/* Decorative Accent */}
              <Box sx={{
                width: 100,
                height: 5,
                background: 'linear-gradient(90deg, transparent, #7e22ce, transparent)',
                margin: '30px auto 0',
                borderRadius: 10,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -3,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 11,
                  background: '#7e22ce',
                  borderRadius: '50%',
                  filter: 'blur(3px)'
                }
              }} />
            </Box>

            {/* Products Grid */}
            {products.length === 0 ? (
              <Paper 
                elevation={0}
                sx={{ 
                  textAlign: 'center', 
                  py: 12,
                  background: 'rgba(255,255,255,0.6)',
                  borderRadius: 4,
                  border: '2px dashed rgba(30, 60, 114, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 500,
                    mb: 1
                  }}
                >
                  Không có sản phẩm nào
                </Typography>
                <Typography 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '1rem'
                  }}
                >
                  Vui lòng quay lại sau để khám phá các sản phẩm mới
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                {products.map((product, index) => {
                  const productCard: ProductCardType = {
                    id: String(product._id),
                    name: product.title,
                    price: product.price,
                    images: product.images,
                    category: Array.isArray(product.categories)
                      ? product.categories.join(", ")
                      : product.categories ?? "",
                    description: product.description,
                    stock: product.stock,
                    rating: product.Rating ?? 0,
                    features: product.stock < 5 ? ["Hot"] : [],
                  };

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                      <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.6,
                          delay: index * 0.08,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                        whileHover={{ 
                          y: -12,
                          transition: { duration: 0.3, ease: "easeOut" }
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            height: '100%',
                            background: 'rgba(255,255,255,0.9)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(30, 60, 114, 0.08)',
                            border: '1px solid rgba(30, 60, 114, 0.05)',
                            transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                            backdropFilter: 'blur(10px)',
                            position: 'relative',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '4px',
                              background: 'linear-gradient(90deg, #1e3c72, #7e22ce)',
                              opacity: 0,
                              transition: 'opacity 0.3s'
                            },
                            '&:hover': {
                              boxShadow: '0 20px 60px rgba(30, 60, 114, 0.15), 0 0 0 1px rgba(126, 34, 206, 0.1)',
                              transform: 'translateY(-2px)',
                              '&::before': {
                                opacity: 1
                              }
                            }
                          }}
                        >
                          <ProductCard product={productCard} />
                        </Paper>
                      </motion.div>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Fade>
      </Container>

      {/* Premium Floating Background Elements */}
      <Box sx={{
        position: 'fixed',
        top: '10%',
        right: '-5%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(126, 34, 206, 0.05) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'floatSlow 15s ease-in-out infinite',
        '@keyframes floatSlow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-30px, -30px) scale(1.1)' }
        }
      }} />

      <Box sx={{
        position: 'fixed',
        bottom: '5%',
        left: '-10%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(30, 60, 114, 0.04) 0%, transparent 70%)',
        filter: 'blur(90px)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'floatReverse 18s ease-in-out infinite',
        '@keyframes floatReverse': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(40px, 40px) scale(1.15)' }
        }
      }} />
    </Box>
  );
}