"use client";

import { useState } from "react";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

const days = Array.from({ length: 30 }, (_, index) => index + 1);
const events: Record<number, { tag: string; title: string; description: string }> = { 10: { tag: "SOCIAL", title: "CHOPPADA DE DIREITO", description: "A melhor choppada da UERJ está de volta! Open bar e DJs convidados." }, 17: { tag: "FESTA", title: "SEXTA NO CAMPUS", description: "Música, encontros e aquele babado que só começa depois das 22h." } };

export default function EventosPage() {
  const [selected, setSelected] = useState(10);
  return <div className="site-shell"><SiteHeader active="eventos" /><section className="pink-page inner-page events-page"><h1>Calendário de <span>Eventos</span></h1><p className="yellow-label centered-label">FIQUE POR DENTRO DE TUDO O QUE ACONTECE NA UERJ.</p><div className="events-layout"><div className="calendar-panel"><div className="calendar-head"><button type="button" aria-label="Mês anterior">‹</button><h2>ABRIL 2026</h2><button type="button" aria-label="Próximo mês">›</button></div><div className="weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map((day) => <button className={selected === day ? "day selected" : events[day] ? "day has-event" : "day"} key={day} onClick={() => setSelected(day)} type="button">{day}</button>)}</div></div><aside className="day-panel"><div className="day-title"><span>▣</span><div>EVENTOS DO DIA<strong>10/04/2026</strong></div><button type="button" aria-label="Adicionar evento">＋</button></div>{events[selected] ? <article className="event-card"><span>{events[selected].tag}</span><h2>{events[selected].title}</h2><p>{events[selected].description}</p></article> : <p className="no-event">Nenhum evento cadastrado nesta data.</p>}</aside></div></section><SiteFooter /></div>;
}
