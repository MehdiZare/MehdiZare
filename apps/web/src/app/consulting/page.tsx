import type { Metadata } from "next";
import { TierCard } from "@/components/consulting/TierCard";
import { FAQ } from "@/components/consulting/FAQ";
import { CalendlyEmbed } from "@/components/consulting/CalendlyEmbed";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { SectionHeading } from "@/components/shared/SectionHeading";

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const tiers = [
  {
    name: "Advisory",
    priceRange: "$5K\u2013$10K/mo",
    hoursPerMonth: "5\u201310 hrs/mo",
    scope: "AI strategy & architecture review",
    features: [
      "AI readiness assessment",
      "Architecture review",
      "Technology recommendations",
      "Monthly strategy sessions",
      "Email support",
    ],
    ctaText: "Get Started",
  },
  {
    name: "Comprehensive",
    priceRange: "$10K\u2013$20K/mo",
    hoursPerMonth: "15\u201325 hrs/mo",
    scope: "Hands-on implementation + strategy",
    features: [
      "Everything in Advisory",
      "Hands-on development",
      "Code review & best practices",
      "Team mentoring",
      "Weekly syncs",
      "Priority support",
    ],
    ctaText: "Get Started",
  },
  {
    name: "Fractional AI Lead",
    priceRange: "$20K\u2013$50K/mo",
    hoursPerMonth: "25\u201340 hrs/mo",
    scope: "Embedded AI leadership",
    features: [
      "Everything in Comprehensive",
      "Team leadership",
      "Hiring & talent strategy",
      "Stakeholder management",
      "Architecture ownership",
      "Dedicated Slack channel",
    ],
    ctaText: "Contact Me",
  },
];

const faqs = [
  {
    question: "What types of companies do you work with?",
    answer:
      "I primarily work with financial institutions, fintech startups, and government agencies looking to integrate AI and machine learning into their operations. My experience spans hedge funds, banks, federal cybersecurity agencies, and technology companies.",
  },
  {
    question: "How does a typical engagement begin?",
    answer:
      "Every engagement starts with a free 30-minute discovery call where we discuss your goals, current capabilities, and challenges. From there, I provide a tailored proposal outlining the scope, timeline, and expected outcomes.",
  },
  {
    question: "What is the minimum engagement duration?",
    answer:
      "I recommend a minimum of three months for any engagement to ensure meaningful impact. Most advisory clients work with me for 6\u201312 months, while Fractional AI Lead engagements typically run 6+ months.",
  },
  {
    question: "Can you work with our existing team?",
    answer:
      "Absolutely. A core part of my approach is upskilling your existing team while delivering results. I integrate with your engineers, data scientists, and product managers to build internal capabilities that last beyond our engagement.",
  },
  {
    question: "What makes your consulting different?",
    answer:
      "My unique combination of CFA expertise and hands-on AI engineering means I understand both the financial domain and the technical implementation. I do not just advise \u2014 I build. You get a consultant who can architect a solution, write the code, and explain the ROI to your board.",
  },
  {
    question: "Do you offer project-based pricing?",
    answer:
      "Yes, for well-defined projects with clear deliverables, I can offer fixed-price engagements. Contact me to discuss your specific needs and I will put together a custom proposal.",
  },
];

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export function generateMetadata(): Metadata {
  return {
    title: "AI Consulting | Mehdi Zare",
    description:
      "AI consulting for financial institutions. Strategy, implementation, and fractional AI leadership from a CFA Charterholder and Principal AI Engineer.",
    openGraph: {
      title: "AI Consulting | Mehdi Zare",
      description:
        "AI consulting for financial institutions. Strategy, implementation, and fractional AI leadership.",
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ConsultingPage() {
  return (
    <div className="bg-gray-50">
      {/* Header Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 pb-16 pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              AI Consulting for Financial Institutions
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-gray-600">
              Whether you need strategic guidance, hands-on implementation, or
              embedded AI leadership, I bring a rare combination of deep
              financial expertise and production ML engineering to help your
              organization harness the power of artificial intelligence.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {tiers.map((tier, index) => (
              <AnimatedSection key={tier.name} delay={index * 0.15}>
                <TierCard tier={tier} highlighted={index === 1} />
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Calendly Section */}
      <section id="calendly" className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              title="Schedule a Discovery Call"
              subtitle="Book a free 30-minute consultation to discuss your AI needs"
            />
          </AnimatedSection>
          <AnimatedSection delay={0.2} className="mt-10">
            <CalendlyEmbed />
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pb-24 pt-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              title="Frequently Asked Questions"
              subtitle="Common questions about working together"
            />
          </AnimatedSection>
          <AnimatedSection delay={0.2} className="mt-10">
            <div className="rounded-2xl border border-gray-100 bg-white px-6 shadow-sm">
              <FAQ faqs={faqs} />
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
