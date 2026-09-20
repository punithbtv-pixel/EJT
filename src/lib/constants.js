export const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export const PRIORITY_INFO = {
  Low: { color: "#94a3b8", note: "Attend when convenient" },
  Medium: { color: "#3b82f6", note: "Within the week" },
  High: { color: "#f97316", note: "Same day" },
  Critical: { color: "#ef4444", note: "Immediate — production stopped or safety risk" },
};

export const NT_STATUSES = ["Raised", "Under Review", "Accepted", "Rejected", "Converted to Work Order", "Closed"];
export const NT_STATUS_COLOR = {
  Raised: "#64748b",
  "Under Review": "#3b82f6",
  Accepted: "#10b981",
  Rejected: "#ef4444",
  "Converted to Work Order": "#0e7490",
  Closed: "#475569",
};

export const WO_STATUSES = ["Pending", "Assigned", "In Progress", "On Hold", "Completed", "Closed", "Cancelled"];
export const WO_STATUS_COLOR = {
  Pending: "#64748b",
  Assigned: "#3b82f6",
  "In Progress": "#f59e0b",
  "On Hold": "#f97316",
  Completed: "#16a34a",
  Closed: "#475569",
  Cancelled: "#94a3b8",
};
export const WO_OPEN = ["Pending", "Assigned", "In Progress", "On Hold"];
