import { SiteNav } from '@/components/marketing/SiteNav';
import { Hero } from '@/components/marketing/Hero';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import {
  ProblemSection,
  HowItWorks,
  DemoTeaser,
  Testimonials,
  FinalCTA,
} from '@/components/marketing/HomeSections';
import { PricingSection } from '@/components/marketing/PricingSection';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <main>
        <Hero />
        <TrustStrip />
        <ProblemSection />
        <HowItWorks />
        <DemoTeaser />
        <Testimonials />
        <PricingSection />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
