import { redirect } from 'next/navigation';

/** Public pricing was replaced by a custom-quote model. */
export default function PricingPage() {
  redirect('/quote');
}
