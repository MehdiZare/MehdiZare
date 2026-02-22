interface CredentialItem {
  label: string;
  value: string;
}

const credentials: CredentialItem[] = [
  { label: "Role", value: "Principal AI Engineer" },
  { label: "Domains", value: "Finance · Defense · Health" },
  { label: "Credential", value: "CFA Charterholder" },
  { label: "Clearance", value: "Active Secret" },
  { label: "Cloud", value: "AWS Solutions Architect" },
];

export function CredentialsStrip() {
  return (
    <section className="border-y border-warm-gray">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-warm-gray sm:grid-cols-3 lg:grid-cols-5">
        {credentials.map((item) => (
          <div key={item.label} className="px-6 py-6 text-center">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-mid-gray">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
