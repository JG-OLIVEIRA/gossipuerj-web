import SiteFooter from "../components/site-footer";
import SiteGuide from "../components/site-guide";
import SiteHeader from "../components/site-header";

export default function ComoUsarPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="feed" />
      <main className="pink-page guide-page">
        <SiteGuide />
      </main>
      <SiteFooter />
    </div>
  );
}
