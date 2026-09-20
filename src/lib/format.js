const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmt(n, dp = 0) {
  if (n == null || n === "" || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// Accepts a Date, an ISO string, or "YYYY-MM-DD".
export function fmtD(d) {
  if (!d) return "—";
  const s = typeof d === "string" ? d : d.toISOString();
  const [y, m, day] = s.slice(0, 10).split("-");
  if (!y || !m || !day) return "—";
  return `${day}-${MON[Number(m) - 1]}-${y}`;
}

export function fmtDT(d) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  const time = dt.toISOString().slice(11, 16);
  return `${fmtD(dt)} ${time}`;
}

export function toDateInput(d) {
  if (!d) return "";
  const s = typeof d === "string" ? d : d.toISOString();
  return s.slice(0, 10);
}

export function toDateTimeInput(d) {
  if (!d) return "";
  const s = typeof d === "string" ? d : d.toISOString();
  return s.slice(0, 16);
}

export function initials(name) {
  return String(name || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
