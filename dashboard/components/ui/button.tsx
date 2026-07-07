import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4a90e2] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#4a90e2] text-white hover:bg-[#3a80d2]",
        outline: "border border-[#30363d] bg-transparent text-[#e6edf3] hover:bg-[#21262d]",
        ghost: "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]",
        destructive: "bg-[#f85149]/10 text-[#f85149] hover:bg-[#f85149]/20",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 px-2 py-1 text-xs",
        lg: "h-10 px-4",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
