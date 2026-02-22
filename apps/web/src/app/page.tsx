import { Hero } from "@/components/home/Hero";
import { PositioningStatement } from "@/components/home/PositioningStatement";
import { CredentialsBanner } from "@/components/home/CredentialsBanner";
import { FeaturedPosts } from "@/components/home/FeaturedPosts";
import { AnimatedSection } from "@/components/shared/AnimatedSection";

export default function Home() {
  return (
    <>
      <Hero />

      <AnimatedSection>
        <PositioningStatement />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <CredentialsBanner />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <FeaturedPosts />
      </AnimatedSection>
    </>
  );
}
