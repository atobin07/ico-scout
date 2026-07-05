import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export default function Card({ children, className, glow }: CardProps) {
  return (
    <div
      className={clsx("rounded-xl p-5", className)}
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: glow ? "0 0 0 1px rgba(99,102,241,0.2), 0 4px 24px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </div>
  );
}
