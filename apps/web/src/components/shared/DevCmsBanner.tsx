/**
 * Development-only banner that warns when a page is rendering fallback
 * content instead of CMS data. Completely stripped in production builds.
 */
export function DevCmsBanner({ page }: { page: string }) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 shadow-lg">
      <p className="font-semibold">CMS fallback active</p>
      <p className="mt-1">
        <span className="font-mono">{page}</span> is using hardcoded default
        content — Strapi CMS was unreachable or returned an error.
      </p>
    </div>
  );
}
