import { SiteNav } from '@/components/marketing/SiteNav';
import { Hero } from '@/components/marketing/Hero';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import {
  ProblemSection,
  HowItWorks,
  DemoTeaser,
  FinalCTA,
} from '@/components/marketing/HomeSections';
import { QuoteSection } from '@/components/marketing/QuoteSection';
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
        <QuoteSection />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
