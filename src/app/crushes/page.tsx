"use client";

import { useMemo, useState } from "react";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

const profiles = [
  ["M", "Mari S.", "Comunicação", "Ela sempre está na fila do bandejão. Alguém avisa que o sorriso foi notado?", "rosa"],
  ["A", "Ana C.", "Direito", "Vista na biblioteca terça-feira, com uma pilha de livros e uma jaqueta incrível.", "amarelo"],
  ["J", "Jorge L.", "História", "A pessoa mais estilosa do corredor do 9º andar. Fica a dica.", "ciano"],
  ["L", "Lucas R.", "Engenharia", "Presença garantida nos eventos e dono do melhor bom humor do campus.", "laranja"],
];

export default function CrushesPage() {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => profiles.filter((profile) => profile[1].toLowerCase().includes(query.toLowerCase()) || profile[2].toLowerCase().includes(query.toLowerCase())), [query]);
  return <div className="site-shell"><SiteHeader active="crushes" /><section className="pink-page inner-page"><h1>Galeria de <span>Crushes</span></h1><p className="yellow-label centered-label">ENCONTRE OUTROS ALUNOS DA UERJ E DEMONSTRE SEU INTERESSE.</p><div className="login-notice"><span>Você precisa estar logado para dar like nos perfis.</span><a className="black-button" href="/login">ENTRAR / REGISTRAR</a></div><div className="filters-panel"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="⌕  Procurar por nome ou @..." aria-label="Procurar crush" /><div className="selects"><label>CURSO<select><option>Todos</option><option>Comunicação</option><option>Direito</option></select></label><label>GÊNERO<select><option>Todos</option><option>Feminino</option><option>Masculino</option></select></label><label>ORIENTAÇÃO<select><option>Todos</option><option>Bi</option><option>Pan</option></select></label></div></div><div className="profile-grid">{visible.map((profile) => <article className={`profile-card ${profile[4]}`} key={profile[1]}><div className="avatar">{profile[0]}</div><h2>{profile[1]}</h2><span>{profile[2]}</span><p>{profile[3]}</p><button type="button" aria-label={`Curtir perfil de ${profile[1]}`}>♡ CURTIR</button></article>)}</div></section><SiteFooter /></div>;
}
