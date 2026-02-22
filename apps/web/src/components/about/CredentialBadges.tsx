import type { Credential } from "@/types/strapi";

interface CredentialBadgesProps {
  credentials: Credential[];
}

export function CredentialBadges({ credentials }: CredentialBadgesProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {credentials.map((credential) => (
        <div
          key={credential.id}
          className="flex items-center gap-3 border border-warm-gray bg-paper p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-accent-warm/10">
            <span className="font-mono text-sm font-medium text-accent-warm">
              {credential.title.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink">{credential.title}</p>
            <p className="text-sm text-mid-gray">{credential.issuer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
