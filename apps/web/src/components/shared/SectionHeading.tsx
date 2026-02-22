import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export function SectionHeading({
  title,
  subtitle,
  centered = true,
}: SectionHeadingProps) {
  return (
    <div className={cn(centered && "text-center")}>
      <h2 className="font-serif text-3xl text-ink lg:text-4xl">{title}</h2>
      {subtitle && (
        <p className="mt-4 text-lg text-mid-gray">{subtitle}</p>
      )}
    </div>
  );
}
