"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getClientSession() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("gossipuerj_token"));
}

function getServerSession() {
  return false;
}

export default function SiteHeader({ active, authenticated = false }: { active: string; authenticated?: boolean }) {
  const hasStorageToken = useSyncExternalStore(subscribe, getClientSession, getServerSession);
  const hasSession = authenticated || hasStorageToken;

  return (
    <header className="site-header">
      <Link className="logo-box" href="/">GOSSIP<span>UERJ</span></Link>
      <nav className="site-nav" aria-label="Navegação principal">
        <Link className={active === "feed" ? "nav-active" : ""} href="/">FEED</Link>
        <Link className={active === "crushes" ? "nav-active" : ""} href="/crushes">CRUSHES</Link>
        <Link className={active === "eventos" ? "nav-active" : ""} href="/eventos">EVENTOS</Link>
        <Link className={active === "vendas" ? "nav-active" : ""} href="/vendas">VENDAS</Link>
        <Link className={active === "grupos" ? "nav-active" : ""} href="/grupos">GRUPOS</Link>
        <Link className={active === "login" || active === "perfil" ? "nav-active" : ""} href={hasSession ? "/perfil" : "/login"}>{hasSession ? "PERFIL" : "LOGIN"}</Link>
      </nav>
    </header>
  );
}

