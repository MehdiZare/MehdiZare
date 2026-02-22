const credentials = [
  { company: "CFA Institute", role: "CFA Charterholder" },
  { company: "AWS", role: "Solutions Architect" },
  { company: "Capital One", role: "Senior AI Engineer" },
  { company: "Booz Allen Hamilton", role: "AI Consultant" },
  { company: "Sev1Tech / CISA", role: "Principal AI Engineer" },
  { company: "Bina Capital", role: "CIO" },
];

export function CredentialsBanner() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Trusted Experience
        </h2>

        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {credentials.map((cred) => (
            <div
              key={cred.company}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <p className="font-semibold text-gray-900">{cred.company}</p>
              <p className="mt-1 text-sm text-gray-500">{cred.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
