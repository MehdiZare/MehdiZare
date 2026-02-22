import { cn } from "@/lib/utils";

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

export function Label({ children, className }: LabelProps) {
  return (
    <p
      className={cn(
        "font-mono text-xs uppercase tracking-[0.25em] text-mid-gray",
        className
      )}
    >
      {children}
    </p>
  );
}
