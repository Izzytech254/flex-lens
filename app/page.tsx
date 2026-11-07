import FixLensApp from '@/components/FixLensApp';
import SiteInfo from '@/components/SiteInfo';

// Server component: renders the interactive app plus crawlable content for SEO.
export default function Page() {
  return (
    <>
      <FixLensApp />
      <SiteInfo />
    </>
  );
}
