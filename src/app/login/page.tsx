"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

export default function LoginPage() {
  const [submitted, setSubmitted] = useState(false);
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitted(true); }
  return <div className="site-shell"><SiteHeader active="login" /><section className="pink-page login-page"><form className="login-card" onSubmit={handleSubmit}><div className="login-logo">GOSSIP<span>UERJ</span></div><h1>Bem-vindo de volta</h1><p>Acesse com seu email institucional para receber<br />um link de entrada.</p><label>Email<input type="email" placeholder="voce@graduacao.uerj.br" required /></label><button className="pink-button" type="submit">{submitted ? "LINK ENVIADO ✓" : "ENTRAR"}</button><div className="register">Não tem conta? <a href="#criar">Crie agora</a></div><Link className="back-link" href="/">Voltar ao Feed</Link></form></section><SiteFooter /></div>;
}
