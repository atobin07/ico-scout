import { SiteNav } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { PricingSection } from '@/components/marketing/PricingSection';
import { FinalCTA } from '@/components/marketing/HomeSections';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-midnight">
      <SiteNav />
      <main>
        <div className="relative overflow-hidden pt-10">
          <div className="pointer-events-none absolute inset-0 glow-signal" />
          <div className="relative">
            <PricingSection />
          </div>
        </div>
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
