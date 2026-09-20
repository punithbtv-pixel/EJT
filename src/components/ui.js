import { NT_STATUS_COLOR, WO_STATUS_COLOR, PRIORITY_INFO } from "@/lib/constants";

export function StatusPill({ status, kind }) {
  const color = (kind === "wo" ? WO_STATUS_COLOR : NT_STATUS_COLOR)[status] || "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}

export function PriorityTag({ priority }) {
  const color = PRIORITY_INFO[priority]?.color || "#94a3b8";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
      <span className="inline-block w-0.5 h-3.5 rounded" style={{ background: color }} />
      {priority}
    </span>
  );
}

export function Panel({ title, sub, right, children, className = "" }) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 ${className}`}>
      {(title || right) && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 flex-wrap">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
          </div>
          <div className="flex-1" />
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, body }) {
  return (
    <div className="py-12 text-center text-slate-500">
      <p className="font-medium text-slate-800 mb-1">{title}</p>
      {body && <p className="text-sm">{body}</p>}
    </div>
  );
}

export function Field({ label, children, wide, required }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500";

export function Btn({ children, variant = "default", className = "", ...props }) {
  const styles = {
    default: "border border-slate-300 bg-white hover:bg-slate-50 text-slate-700",
    primary: "bg-sky-600 hover:bg-sky-700 text-white",
    danger: "border border-red-200 text-red-600 hover:bg-red-50",
  };
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16" />
      <path d="M12 3v13" />
      <path d="m7 11 5 5 5-5" />
    </svg>
  );
}

export function IconLock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function IconBtn({ title, variant = "default", disabled, onClick, children }) {
  const styles = {
    default: "border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-50",
    danger: "border-red-200 text-red-500 hover:text-red-700 hover:bg-red-50",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-xl border border-slate-200 shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"} my-8`}>
        <div className="flex items-center px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
