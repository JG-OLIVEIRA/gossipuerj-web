"use client";

import { useState } from "react";
import SiteFooter from "./components/site-footer";
import SiteHeader from "./components/site-header";

export default function FeedPage() {
  const [sent, setSent] = useState(false);
  return <div className="site-shell"><SiteHeader active="feed" /><section className="pink-page feed-page">
    <div className="feed-intro"><div><h1>O QUE ESTÁ<br />ROLANDO NA <span>UERJ?</span></h1><p className="yellow-label">FOFOCAS ANÔNIMAS, SEGREDOS E CRUSHES DO CAMPUS.</p></div></div>
    <form className="post-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}><input maxLength={250} placeholder="Título da publicação" aria-label="Título da publicação" required /><textarea maxLength={280} placeholder="O que está acontecendo no campus?" aria-label="O que está acontecendo no campus?" required /><div className="form-actions"><span>{sent ? "Sua fofoca foi enviada para moderação." : "Sua identidade fica em segredo."}</span><button className="black-button" type="submit">{sent ? "ENVIADO ✓" : "PUBLICAR FOFOCA ↗"}</button></div></form>
    <div className="feed-list"><article><span className="tag">AGORA</span><h2>Quem mais reparou no movimento estranho perto da Reitoria?</h2><p>Uma fonte anônima mandou a fofoca e o campus inteiro já está comentando.</p></article><article><span className="tag cyan-tag">CONFIRMADO</span><h2>A festa de sexta já tem local e promete render.</h2><p>Os detalhes estão na agenda. Não diga que não avisamos.</p></article></div>
  </section><SiteFooter /></div>;
}
