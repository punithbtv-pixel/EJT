import { STATUS_LABEL } from "@/lib/inventory";

const STYLE = {
  OK: "bg-green-100 text-green-700",
  LOW: "bg-amber-100 text-amber-700",
  OUT: "bg-red-100 text-red-700",
};

// In stock / Low stock / Out of stock, encoded in colour as well as words.
export default function StockPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${STYLE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
