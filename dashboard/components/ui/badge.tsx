import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-[#21262d] text-[#e6edf3] ring-[#30363d]",
        outline: "bg-transparent text-[#8b949e] ring-[#30363d]",
        hot: "bg-[#3fb950]/10 text-[#3fb950] ring-[#3fb950]/20",
        warm: "bg-[#4a90e2]/10 text-[#4a90e2] ring-[#4a90e2]/20",
        neutral: "bg-[#d29922]/10 text-[#d29922] ring-[#d29922]/20",
        cold: "bg-[#8b949e]/10 text-[#8b949e] ring-[#8b949e]/20",
        source: "bg-[#21262d] text-[#8b949e] ring-[#30363d]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
