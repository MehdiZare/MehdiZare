import { TrackedLink } from "@/components/analytics/TrackedLink";
import { cn } from "@/lib/utils";

interface AiEngineerProfileLinkProps {
  section: string;
  className?: string;
}

export function AiEngineerProfileLink({
  section,
  className,
}: AiEngineerProfileLinkProps) {
  return (
    <p className={cn("max-w-3xl text-sm text-mid-gray", className)}>
      Looking for the{" "}
      <TrackedLink
        href="/ai-engineer"
        eventName="funnel_cta_click"
        eventProperties={{
          section,
          cta_label: "AI engineer landing",
          destination: "/ai-engineer",
          interaction_type: "link_click",
        }}
        className="text-ink underline underline-offset-4 transition-colors hover:text-mid-gray"
      >
        AI engineer
      </TrackedLink>{" "}
      profile instead?
    </p>
  );
}
