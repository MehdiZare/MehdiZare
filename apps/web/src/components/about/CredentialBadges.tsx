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
          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
            <span className="text-sm font-bold text-primary">
              {credential.title.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{credential.title}</p>
            <p className="text-sm text-gray-500">{credential.issuer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
