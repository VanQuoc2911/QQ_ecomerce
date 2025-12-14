import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
    Box,
    Button,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { bannerService, type ApiBanner, type BannerGenerateOpts, type BannerGenerateResponse } from "../../api/bannerService";

export default function AdminBanners() {
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [form, setForm] = useState<Partial<ApiBanner>>({ active: true, priority: 0, kind: 'banner' });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiOpts, setAiOpts] = useState<BannerGenerateOpts>({ kind: 'banner' });
  const [aiPreview, setAiPreview] = useState<BannerGenerateResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetch = async () => {
    try {
      const items = await bannerService.list();
      console.debug("[AdminBanners] fetched banners:", items);
      setBanners(items);
    } catch (e) {
      console.error(e);
    }
  };

  const getErrorMessage = (err: unknown): string => {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message;
    if (typeof err === "object" && err !== null) {
      const o = err as Record<string, unknown>;
      const resp = o.response as Record<string, unknown> | undefined;
      const data = resp?.data as Record<string, unknown> | undefined;
      const msg = data?.message ?? o.message ?? o?.toString?.();
      if (typeof msg === "string") return msg;
    }
    return "Unknown error";
  };

  const resolveImage = (img?: string) => {
    if (!img) return undefined;
    if (/^https?:\/\//i.test(img) || img.startsWith("data:")) return img;
    const base = (import.meta.env.VITE_API_BASE as string) || window.location.origin;
    return `${base.replace(/\/$/, "")}/${img.replace(/^\/+/, "")}`;
  };

  useEffect(() => {
    void fetch();
  }, []);

  const handleCreate = async () => {
    try {
      await bannerService.create(form as ApiBanner);
      setForm({ active: true, priority: 0, kind: 'banner' });
      await fetch();
    } catch (e) {
      console.error(e);
      // show backend error message if available
      const err = e as unknown;
      let msg = 'Tạo banner thất bại';
      if (typeof err === 'string') {
        msg = err;
      } else if (err instanceof Error) {
        msg = err.message || msg;
      } else if (typeof err === 'object' && err !== null) {
        const o = err as { response?: { data?: { message?: string } }; message?: string | undefined };
        msg = o.response?.data?.message || o.message || msg;
      }
      alert(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá banner này?")) return;
    await bannerService.delete(id);
    await fetch();
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ fontWeight: 800, my: 3 }}>
        Quản lý Banner & Quảng cáo
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <TextField label="Tiêu đề" value={form.title || ""} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          <TextField label="Image URL" value={form.image || ""} onChange={(e) => setForm((s) => ({ ...s, image: e.target.value }))} />
          <TextField select label="Loại" value={form.kind || 'banner'} onChange={(e) => setForm((s) => ({ ...s, kind: e.target.value }))}>
            <MenuItem value="banner">Banner</MenuItem>
            <MenuItem value="ad">Quảng cáo (Ad)</MenuItem>
          </TextField>
          <TextField label="Link (internal or external)" value={form.link || ""} onChange={(e) => setForm((s) => ({ ...s, link: e.target.value }))} />
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography>Active</Typography>
            <Switch checked={!!form.active} onChange={(e) => setForm((s) => ({ ...s, active: e.target.checked }))} />
            <Button onClick={handleCreate} variant="contained">Tạo</Button>
            <Button variant="outlined" onClick={() => setAiOpen(true)}>Sinh banner bằng AI</Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={aiOpen} onClose={() => setAiOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Sinh banner với AI</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Từ khoá / Sản phẩm" value={aiOpts.keywords || ""} onChange={(e) => setAiOpts((s) => ({ ...s, keywords: e.target.value }))} fullWidth />
            <TextField label="Đối tượng (ví dụ: nam 18-35)" value={aiOpts.audience || ""} onChange={(e) => setAiOpts((s) => ({ ...s, audience: e.target.value }))} fullWidth />
            <TextField label="Phong cách (ví dụ: minimal, vibrant)" value={aiOpts.style || ""} onChange={(e) => setAiOpts((s) => ({ ...s, style: e.target.value }))} fullWidth />
            <TextField select label="Loại" value={aiOpts.kind || 'banner'} onChange={(e) => setAiOpts((s) => ({ ...s, kind: e.target.value }))}>
              <MenuItem value="banner">Banner</MenuItem>
              <MenuItem value="ad">Quảng cáo (Ad)</MenuItem>
            </TextField>
            <Box>
              <Button
                disabled={aiLoading}
                onClick={async () => {
                  setAiLoading(true);
                  try {
                    const res = await bannerService.generate(aiOpts);
                    setAiPreview(res);
                  } catch (err) {
                    console.error(err);
                    const msg = getErrorMessage(err);
                    alert(`Không thể sinh banner bằng AI: ${msg}`);
                  } finally {
                    setAiLoading(false);
                  }
                }}
                variant="contained"
              >
                Sinh
              </Button>
            </Box>
                  {aiPreview && (
              <Paper sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>{aiPreview.bannerDraft?.title || 'Preview'}</Typography>
                  {aiPreview.bannerDraft?.image ? (
                    <Box component="img" src={resolveImage(aiPreview.bannerDraft.image)} alt={aiPreview.bannerDraft.title} sx={{ width: '100%', maxHeight: 300, objectFit: 'cover', mt: 1 }} />
                  ) : (
                    <Typography color="text.secondary">No image generated. Prompt: {aiPreview.bannerDraft?.meta?.imagePrompt}</Typography>
                  )}
                  <Typography sx={{ mt: 1 }}>{aiPreview.bannerDraft?.meta?.raw || aiPreview.ai_raw}</Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiOpen(false)}>Đóng</Button>
          <Button
            onClick={async () => {
              const draft = aiPreview?.bannerDraft;
              if (!draft) return alert('Chưa có preview để lưu');
              try {
                await bannerService.create({ title: draft.title, image: draft.image || '', link: draft.link || '', active: true, type: draft.type || 'ai', position: draft.position || 'hero', kind: (draft.kind || aiOpts.kind || 'banner') });
                setAiOpen(false);
                await fetch();
              } catch (err) {
                console.error(err);
                const msg = getErrorMessage(err);
                alert(`Lưu banner thất bại: ${msg}`);
              }
            }}
            variant="contained"
          >
            Lưu banner
          </Button>
        </DialogActions>
      </Dialog>

      <Stack spacing={3}>
        {/* Group by kind */}
        {['banner', 'ad'].map((k) => {
          const items = banners.filter((b) => (b.kind || 'banner') === k);
          return (
            <Box key={k}>
              <Typography variant="h6" sx={{ mb: 1 }}>{k === 'banner' ? 'Banners' : 'Quảng cáo (Ads)'}</Typography>
              <Stack spacing={2}>
                {items.map((b) => (
                  <Paper key={b._id} sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{b.title}</Typography>
                      <Typography variant="caption">{b.image}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconButton onClick={() => navigator.clipboard?.writeText(b.image)} title="Copy image URL"><EditIcon /></IconButton>
                      <Switch checked={!!b.active} onChange={async () => { await bannerService.update(b._id, { active: !b.active }); await fetch(); }} />
                      <IconButton onClick={() => handleDelete(b._id)}><DeleteIcon /></IconButton>
                    </Stack>
                  </Paper>
                ))}
                {items.length === 0 && <Typography color="text.secondary">Không có mục nào.</Typography>}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Container>
  );
}
