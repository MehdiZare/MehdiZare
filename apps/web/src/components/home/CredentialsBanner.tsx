import type {
  HomeCredibilityItem,
  HomeFeaturedOnItem,
} from "@/types/strapi";

interface CredentialsBannerProps {
  credibilityItems: HomeCredibilityItem[];
  featuredOnItems: HomeFeaturedOnItem[];
}

export function CredentialsBanner({
  credibilityItems,
  featuredOnItems,
}: CredentialsBannerProps) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Credibility Signals
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {credibilityItems.map((cred) => (
            <div
              key={cred.id}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center"
            >
              <p className="text-sm font-semibold text-slate-900">{cred.organization}</p>
              {cred.detail ? (
                <p className="mt-1 text-xs text-slate-600">{cred.detail}</p>
              ) : null}
            </div>
          ))}
        </div>

        {featuredOnItems.length > 0 ? (
          <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Featured On
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {featuredOnItems.map((item) => (
                <a
                  key={item.id}
                  href={item.url || "#"}
                  target={item.url ? "_blank" : undefined}
                  rel={item.url ? "noopener noreferrer" : undefined}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {item.platform}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
