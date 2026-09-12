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
  selectedFloor?: string | null;
  onSelectFloor?: (floor: string | null) => void;
  selectedCourse?: string | null;
  onSelectCourse?: (course: string | null) => void;
};

export default function UerjBuildingSidebar({
  userCourse,
  posts = [],
  crushes = [],
  selectedFloor,
  onSelectFloor,
  selectedCourse,
  onSelectCourse,
}: Props) {
  const [openFloor, setOpenFloor] = useState<string | null>(selectedFloor ?? null);
  const userFloor = findFloorForCourse(userCourse);

  const floorStats = UERJ_BUILDING_FLOORS.map((floor) => {
    const searchableTerms = [...floor.courses, ...floor.places, floor.label].map(normalize);
    const floorPosts = posts.filter((post) => {
      if (post.courseName) {
        const pFloor = findFloorForCourse(post.courseName);
        if (pFloor?.floor === floor.floor) return true;
      }
      const text = normalize(`${post.title} ${post.content}`);
      return searchableTerms.some((term) => term.length > 2 && text.includes(term));
    });
    const crushCount = crushes.filter((crush) => findFloorForCourse(crush.courseName)?.floor === floor.floor).length;
    return { floor, gossipCount: floorPosts.length, crushCount, posts: floorPosts };
  });

  const topGossipFloor = [...floorStats].sort((a, b) => b.gossipCount - a.gossipCount)[0];
  const topCrushFloor = [...floorStats].sort((a, b) => b.crushCount - a.crushCount)[0];

  const activeFloorObj = selectedFloor
    ? UERJ_BUILDING_FLOORS.find((f) => f.floor === selectedFloor)
    : null;

  function handleToggleFloor(floorNumber: string) {
    if (openFloor === floorNumber) {
      setOpenFloor(null);
    } else {
      setOpenFloor(floorNumber);
    }
  }

  function handleFilterFloor(floorNumber: string) {
    if (selectedFloor === floorNumber) {
      onSelectFloor?.(null);
    } else {
      onSelectFloor?.(floorNumber);
      onSelectCourse?.(null);
      setOpenFloor(floorNumber);
    }
  }

  function handleFilterCourse(courseName: string) {
    if (selectedCourse === courseName) {
      onSelectCourse?.(null);
    } else {
      onSelectCourse?.(courseName);
      onSelectFloor?.(null);
    }
  }

  return (
    <div className="uerj-building-sidebar sidebar-card">
      <div className="sidebar-card-title">
        <strong>🏛️ PAVILHÃO JOÃO LYRA</strong>
        <span>13 NÍVEIS</span>
      </div>
      <p className="building-sidebar-intro">
        O prédio da UERJ conectado às fofocas! Clique em um andar ou curso para filtrar o feed do campus em tempo real.
      </p>

      {/* Banner de Filtro Ativo no Feed */}
      {(selectedFloor || selectedCourse) && (
        <div className="building-active-filter-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <span style={{ fontSize: "14px" }}>🎯</span>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: 800, color: "#666", display: "block" }}>
                Filtrando o Feed:
              </span>
              <strong style={{ fontSize: "11px", color: "var(--ink)" }}>
                {selectedCourse ? selectedCourse : activeFloorObj?.label}
              </strong>
            </div>
          </div>
          <button
            type="button"
            className="clear-building-filter-btn"
            onClick={() => {
              onSelectFloor?.(null);
              onSelectCourse?.(null);
            }}
            title="Remover filtro e mostrar todas as fofocas"
          >
            ✕ Limpar
          </button>
        </div>
      )}

      <div className="building-ranking" aria-label="Ranking de andares">
        <div>
          <span>🔥 Mais fofocas</span>
          <strong>{topGossipFloor.gossipCount > 0 ? topGossipFloor.floor.label : "Sem localização"}</strong>
          <small>{topGossipFloor.gossipCount} no campus</small>
        </div>
        <div>
          <span>💘 Mais Crushes</span>
          <strong>{topCrushFloor.crushCount > 0 ? topCrushFloor.floor.label : "Ainda sem dados"}</strong>
          <small>{topCrushFloor.crushCount} perfis</small>
        </div>
      </div>

      {userCourse && (
        <div className="building-origin-badge">
          <span>📍 Seu Curso / Perfil</span>
          <strong>{userCourse}</strong>
          <small>{userFloor ? `Localizado no: ${userFloor.label}` : "Andar ainda não mapeado"}</small>
        </div>
      )}

      <div className="building-floor-list">
        {floorStats.map(({ floor, gossipCount, crushCount, posts: floorPosts }) => {
          const isUserFloor = userFloor?.floor === floor.floor;
          const isOpen = openFloor === floor.floor;
          const isFilterActive = selectedFloor === floor.floor;

          return (
            <div
              key={floor.floor}
              className={`building-floor ${isUserFloor ? "user-floor" : ""} ${isFilterActive ? "active-filter" : ""}`}
            >
              <button
                type="button"
                className="building-floor-button"
                onClick={() => handleToggleFloor(floor.floor)}
                aria-expanded={isOpen}
              >
                <span className="floor-number">{floor.floor}</span>
                <span className="floor-label">{floor.label}</span>
                {isUserFloor && <span className="floor-user-mark" title="Andar do seu curso">você</span>}
                {isFilterActive && <span className="floor-active-mark" title="Feed filtrado neste andar">ativo</span>}
                {(gossipCount > 0 || crushCount > 0) && (
                  <span className="floor-counts">
                    {gossipCount > 0 && <span title={`${gossipCount} fofocas deste andar`}>{gossipCount} 🔥</span>}
                    {gossipCount > 0 && crushCount > 0 && " · "}
                    {crushCount > 0 && <span title={`${crushCount} crushes cadastrados`}>{crushCount} 💘</span>}
                  </span>
                )}
                <span className="floor-chevron">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="building-floor-details">
                  <strong>{floor.places.join(" · ")}</strong>

                  {/* Cursos como tags interativas */}
                  {floor.courses.length > 0 && (
                    <div style={{ marginTop: "4px" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color: "#666" }}>
                        Cursos (clique para filtrar):
                      </span>
                      <div className="floor-course-chips">
                        {floor.courses.map((course) => {
                          const isCourseSelected = selectedCourse === course;
                          return (
                            <button
                              key={course}
                              type="button"
                              className={`floor-course-chip ${isCourseSelected ? "active" : ""}`}
                              onClick={() => handleFilterCourse(course)}
                              title={`Filtrar fofocas de ${course}`}
                            >
                              <span>🎓</span>
                              <span>{course}</span>
                              {isCourseSelected && <span>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Botão de Ação para Filtrar Todo o Andar */}
                  <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      className={`floor-filter-action-btn ${isFilterActive ? "is-active" : ""}`}
                      onClick={() => handleFilterFloor(floor.floor)}
                    >
                      {isFilterActive ? "✕ Desativar Filtro do Andar" : `🔍 Filtrar Feed no ${floor.label}`}
                    </button>
                  </div>

                  {/* Prévia de Fofocas Atuais do Andar */}
                  {floorPosts.length > 0 && (
                    <div className="floor-recent-posts">
                      <span style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color: "#777" }}>
                        Fofocas recentes deste nível ({floorPosts.length}):
                      </span>
                      {floorPosts.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="floor-post-mini"
                          onClick={() => handleFilterFloor(floor.floor)}
                          title="Clique para focar no feed deste andar"
                        >
                          <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.title}
                          </span>
                          <span style={{ fontSize: "9px", color: "#888", whiteSpace: "nowrap" }}>
                            {p.courseName ? p.courseName.split(" ")[0] : "UERJ"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
