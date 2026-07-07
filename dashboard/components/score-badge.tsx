import { cn } from "@/lib/utils";

function scoreVariant(score: number | null | undefined) {
  if (!score && score !== 0) return "cold";
  if (score >= 85) return "hot";
  if (score >= 70) return "warm";
  if (score >= 50) return "neutral";
  return "cold";
}

const variantStyles = {
  hot: "bg-[#3fb950]/10 text-[#3fb950] ring-[#3fb950]/20",
  warm: "bg-[#4a90e2]/10 text-[#4a90e2] ring-[#4a90e2]/20",
  neutral: "bg-[#d29922]/10 text-[#d29922] ring-[#d29922]/20",
  cold: "bg-[#8b949e]/10 text-[#8b949e] ring-[#8b949e]/20",
};

export function ScoreBadge({
  score,
  label,
  size = "default",
  className,
}: {
  score: number | null | undefined;
  label?: string;
  size?: "default" | "sm";
  className?: string;
}) {
  const variant = scoreVariant(score);
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono ring-1 ring-inset",
        size === "sm" ? "text-[11px]" : "text-xs",
        styles,
        className
      )}
    >
      {label && <span className="opacity-60">{label}</span>}
      <span className="font-semibold">{score ?? "—"}</span>
    </span>
  );
}
