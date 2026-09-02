import Link from "next/link";

export default function SiteHeader({ active }: { active: string }) {
  return (
    <header className="site-header">
      <Link className="logo-box" href="/">GLOSSIP<span>UERJ</span></Link>
      <nav className="site-nav" aria-label="Navegação principal">
        <Link className={active === "feed" ? "nav-active" : ""} href="/">FEED</Link>
        <Link className={active === "crushes" ? "nav-active" : ""} href="/crushes">CRUSHES</Link>
        <Link className={active === "eventos" ? "nav-active" : ""} href="/eventos">EVENTOS</Link>
        <Link className={active === "login" ? "nav-active" : ""} href="/login">LOGIN</Link>
      </nav>
    </header>
  );
}
