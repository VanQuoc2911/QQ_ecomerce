import AddAlertIcon from "@mui/icons-material/AddAlert";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { ChipProps } from "@mui/material";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type {
    ReportItem,
    ReportRole,
    ReportSeverity,
    ReportStatus,
} from "../../api/reportService";
import { createReport, fetchReports, updateReportStatus } from "../../api/reportService";

const roleTabs: { label: string; value: ReportRole | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Users", value: "user" },
  { label: "Sellers", value: "seller" },
  { label: "Shippers", value: "shipper" },
];

const severityOptions: ReportSeverity[] = ["low", "medium", "high", "critical"];
const statusOptions: ReportStatus[] = ["open", "in_progress", "resolved"];
const severityColors: Record<ReportSeverity, ChipProps["color"]> = {
  low: "success",
  medium: "warning",
  high: "error",
  critical: "error",
};

const statusLabels: Record<ReportStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const AdminReports = () => {
  const [roleFilter, setRoleFilter] = useState<ReportRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("open");
  const [severityFilter, setSeverityFilter] = useState<ReportSeverity | "all">("all");
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "medium" as ReportSeverity,
    reportedRole: "user" as ReportRole,
    category: "general",
  });

  const loadReports = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await fetchReports({
        role: roleFilter,
        status: statusFilter,
        severity: severityFilter,
        search: search || undefined,
      });
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports", err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter, severityFilter, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports(false);
  };

  const handleStatusChange = async (reportId: string, status: ReportStatus) => {
    setStatusUpdatingId(reportId);
    try {
      await updateReportStatus(reportId, status);
      toast.success("Status updated");
      await loadReports(false);
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Unable to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleCreateReport = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.warn("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      await createReport(form);
      toast.success("Report logged");
      setForm({ title: "", description: "", severity: "medium", reportedRole: "user", category: "general" });
      setCreateDialogOpen(false);
      await loadReports(false);
    } catch (err) {
      console.error("Failed to create report", err);
      toast.error("Unable to log report");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: string) => new Date(value).toLocaleString();

  return (
    <Box sx={{ backgroundColor: "#f5f7fb", minHeight: "100vh", py: 4 }}>
      <Card sx={{ maxWidth: 1200, mx: "auto", borderRadius: 4, boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                Incident & Role Reports
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor platform issues submitted by each role and escalate quickly when something looks critical.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={handleRefresh}
                disabled={refreshing}
              >
                Refresh
              </Button>
              <Button variant="contained" startIcon={<AddAlertIcon />} onClick={() => setCreateDialogOpen(true)}>
                Log Issue
              </Button>
            </Stack>
          </Stack>

          <Box mt={4}>
            <Tabs
              value={roleFilter}
              onChange={(_, val) => setRoleFilter(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: "1px solid", borderColor: "divider" }}
            >
              {roleTabs.map((tab) => (
                <Tab key={tab.value} value={tab.value} label={`${tab.label}`} />
              ))}
            </Tabs>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={3} alignItems={{ xs: "flex-start", md: "center" }}>
            <FormControl sx={{ minWidth: 160 }} size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "all")}> 
                <MenuItem value="all">All</MenuItem>
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {statusLabels[status]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 160 }} size="small">
              <InputLabel>Severity</InputLabel>
              <Select value={severityFilter} label="Severity" onChange={(e) => setSeverityFilter(e.target.value as ReportSeverity | "all")}>
                <MenuItem value="all">All</MenuItem>
                {severityOptions.map((severity) => (
                  <MenuItem key={severity} value={severity} sx={{ textTransform: "capitalize" }}>
                    {severity}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Search"
              placeholder="Title, description, reporter"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearch(searchValue.trim());
              }}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <Button variant="outlined" onClick={() => setSearch(searchValue.trim())}>
              Apply
            </Button>
          </Stack>

          <Box mt={4}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={6}>
                <CircularProgress />
              </Box>
            ) : reports.length === 0 ? (
              <Box textAlign="center" py={6}>
                <WarningAmberIcon color="warning" sx={{ fontSize: 40 }} />
                <Typography variant="subtitle1" fontWeight={600} mt={1}>
                  No reports for this filter
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try switching role or severity to see other incidents.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Reporter</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report._id} hover>
                        <TableCell>
                          <Box>
                            <Typography fontWeight={700}>{report.title}</Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {report.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={report.reportedRole} sx={{ textTransform: "capitalize" }} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={severityColors[report.severity]}
                            label={report.severity}
                            sx={{ textTransform: "capitalize", color: "white" }}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={report.status}
                              onChange={(e) => handleStatusChange(report._id, e.target.value as ReportStatus)}
                              disabled={statusUpdatingId === report._id}
                            >
                              {statusOptions.map((status) => (
                                <MenuItem key={status} value={status}>
                                  {statusLabels[status]}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDate(report.createdAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {report.createdByName || "Unknown"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.createdByEmail || "--"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            icon={<AssignmentTurnedInIcon fontSize="small" />}
                            label={statusLabels[report.status]}
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log platform issue</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              multiline
              minRows={3}
              required
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={form.severity}
                  label="Severity"
                  onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value as ReportSeverity }))}
                >
                  {severityOptions.map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={form.reportedRole}
                  label="Role"
                  onChange={(e) => setForm((prev) => ({ ...prev, reportedRole: e.target.value as ReportRole }))}
                >
                  {roleTabs
                    .filter((tab) => tab.value !== "all")
                    .map((tab) => (
                      <MenuItem key={tab.value} value={tab.value}>
                        {tab.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Category"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleCreateReport} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReports;
