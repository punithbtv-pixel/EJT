export function isUiOnlyMode() {
  return String(process.env.UI_ONLY || "").toLowerCase() === "true";
}
