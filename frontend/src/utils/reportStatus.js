export const STATUS_META = {
  NOT_STARTED: { label: 'Not started', color: 'default' },
  IN_PROGRESS: { label: 'In progress', color: 'warning' },
  COMPLETED: { label: 'Completed', color: 'info' },
  SENDING: { label: 'Sending…', color: 'info' },
  SENT: { label: 'Sent', color: 'success' },
  SEND_FAILED: { label: 'Send failed', color: 'error' },
};

export function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.NOT_STARTED;
}

// Dashboard grouping: "READY" means the child has left and the report can be sent.
export function getDashboardGroup(report) {
  const status = report?.status || 'NOT_STARTED';
  if (status === 'SENT') return 'SENT';
  if (status === 'SEND_FAILED') return 'FAILED';
  if (status === 'NOT_STARTED') return 'NOT_STARTED';
  // An absent child has nothing more to record, so the absence notice can go out.
  if (report?.timeOut || report?.attendance === 'Absent') return 'READY';
  return 'IN_PROGRESS';
}

export function getAttendanceLabel(report) {
  if (!report || report.status === 'NOT_STARTED') return 'Not marked';
  return report.attendance || 'Present';
}

export const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'NOT_STARTED', label: 'Not started' },
  { key: 'IN_PROGRESS', label: 'In daycare' },
  { key: 'READY', label: 'Ready to send' },
  { key: 'FAILED', label: 'Needs attention' },
  { key: 'SENT', label: 'Sent' },
];
