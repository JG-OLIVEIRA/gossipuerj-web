"use client";

import { useState } from "react";
import type { CrushResponse, Post } from "../../lib/api";

export type UerjFloor = {
  floor: string;
  label: string;
  places: string[];
  courses: string[];
};

export const UERJ_BUILDING_FLOORS: UerjFloor[] = [
  { floor: "12", label: "12º andar", places: ["Faculdade de Educação", "Instituto de Nutrição", "Laboratórios de Nutrição"], courses: ["Pedagogia", "Nutrição"] },
  { floor: "11", label: "11º andar", places: ["Instituto de Letras", "Instituto de Artes", "LICOM / PEDIC"], courses: ["Letras", "Artes Visuais", "História da Arte"] },
  { floor: "10", label: "10º andar", places: ["Faculdade de Comunicação Social", "Instituto de Psicologia", "Centro de Educação e Humanidades"], courses: ["Jornalismo", "Relações Públicas", "Psicologia"] },
  { floor: "9", label: "9º andar", places: ["Instituto de Filosofia e Ciências Humanas", "Instituto de Educação Física e Desportos"], courses: ["Filosofia", "Ciências Sociais", "Educação Física", "Serviço Social"] },
  { floor: "8", label: "8º andar", places: ["Faculdade de Administração e Finanças", "Faculdade de Ciências Econômicas", "Centro de Ciências Sociais"], courses: ["Administração", "Ciências Contábeis", "Ciências Econômicas", "Serviço Social"] },
  { floor: "7", label: "7º andar", places: ["Faculdade de Direito", "Escritório Modelo", "Instituto de Medicina Social"], courses: ["Direito", "Medicina"] },
  { floor: "6", label: "6º andar", places: ["Instituto de Matemática e Estatística", "Laboratórios do IME"], courses: ["Matemática", "Estatística", "Ciência da Computação", "Ciências Atuariais"] },
  { floor: "5", label: "5º andar", places: ["Faculdade de Engenharia", "Laboratórios de Engenharia"], courses: ["Engenharia Ambiental e Sanitária", "Engenharia Civil", "Engenharia Elétrica", "Engenharia Mecânica", "Engenharia Química", "Engenharia de Produção", "Engenharia de Computação"] },
  { floor: "4", label: "4º andar", places: ["Instituto de Geociências", "Faculdade de Geologia", "Laboratórios de Geociências"], courses: ["Geologia", "Geografia"] },
  { floor: "3", label: "3º andar", places: ["Instituto de Física", "Laboratórios de Física"], courses: ["Física"] },
  { floor: "2", label: "2º andar", places: ["PROINICIAR", "Laboratório de Políticas Públicas", "Herbarium", "Diretoria Financeira"], courses: [] },
  { floor: "1", label: "1º andar", places: ["DINFO", "DSEA", "DEP", "CETREINA", "DCE", "CEPUERJ"], courses: [] },
  { floor: "T", label: "Térreo", places: ["Reitoria", "Vice-Reitoria", "Subreitorias", "Prefeitura", "Departamento Cultural"], courses: [] },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function findFloorForCourse(courseName?: string | null) {
  if (!courseName) return null;
  const normalizedCourse = normalize(courseName);
  return UERJ_BUILDING_FLOORS.find((floor) =>
    floor.courses.some((course) => normalizedCourse.includes(normalize(course)) || normalize(course).includes(normalizedCourse))
  ) ?? null;
}

type Props = {
  userCourse?: string | null;
  posts?: Post[];
  crushes?: CrushResponse[];
};

export default function UerjBuildingSidebar({ userCourse, posts = [], crushes = [] }: Props) {
  const [openFloor, setOpenFloor] = useState<string | null>(null);
  const userFloor = findFloorForCourse(userCourse);

  const floorStats = UERJ_BUILDING_FLOORS.map((floor) => {
    const searchableTerms = [...floor.courses, ...floor.places, floor.label].map(normalize);
    const gossipCount = posts.filter((post) => {
      const text = normalize(`${post.title} ${post.content}`);
      return searchableTerms.some((term) => term.length > 2 && text.includes(term));
    }).length;
    const crushCount = crushes.filter((crush) => findFloorForCourse(crush.courseName)?.floor === floor.floor).length;
    return { floor, gossipCount, crushCount };
  });
  const topGossipFloor = [...floorStats].sort((a, b) => b.gossipCount - a.gossipCount)[0];
  const topCrushFloor = [...floorStats].sort((a, b) => b.crushCount - a.crushCount)[0];

  return (
    <div className="uerj-building-sidebar sidebar-card">
      <div className="sidebar-card-title">
        <strong>🏛️ PAVILHÃO JOÃO LYRA</strong>
        <span>13 NÍVEIS</span>
      </div>
      <p className="building-sidebar-intro">O prédio da UERJ contado como um feed. Escolha um andar para ver o que vive ali.</p>

      <div className="building-ranking" aria-label="Ranking de andares">
        <div><span>🔥 Mais fofocas</span><strong>{topGossipFloor.gossipCount > 0 ? topGossipFloor.floor.label : "Sem localização"}</strong><small>{topGossipFloor.gossipCount} identificadas</small></div>
        <div><span>💘 Mais Crushes</span><strong>{topCrushFloor.crushCount > 0 ? topCrushFloor.floor.label : "Ainda sem dados"}</strong><small>{topCrushFloor.crushCount} perfis</small></div>
      </div>

      {userCourse && (
        <div className="building-origin-badge">
          <span>📍 Seu Crush</span>
          <strong>{userCourse}</strong>
          <small>{userFloor ? `Origem estimada: ${userFloor.label}` : "Andar ainda não mapeado"}</small>
        </div>
      )}

      <div className="building-floor-list">
        {floorStats.map(({ floor, gossipCount, crushCount }) => {
          const isUserFloor = userFloor?.floor === floor.floor;
          const isOpen = openFloor === floor.floor;
          return (
            <div key={floor.floor} className={`building-floor ${isUserFloor ? "user-floor" : ""}`}>
              <button type="button" className="building-floor-button" onClick={() => setOpenFloor(isOpen ? null : floor.floor)} aria-expanded={isOpen}>
                <span className="floor-number">{floor.floor}</span>
                <span className="floor-label">{floor.label}</span>
                {isUserFloor && <span className="floor-user-mark" title="Andar estimado pelo seu curso">você</span>}
                {(gossipCount > 0 || crushCount > 0) && <span className="floor-counts">{gossipCount} 🔥 · {crushCount} 💘</span>}
                <span className="floor-chevron">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="building-floor-details">
                  <strong>{floor.places.join(" · ")}</strong>
                  {floor.courses.length > 0 && <span>Cursos: {floor.courses.join(", ")}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
