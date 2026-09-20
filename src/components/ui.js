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
