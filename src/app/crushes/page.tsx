"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  ApiError,
  CourseResponse,
  Crush,
  CrushRequest,
  CrushResponse,
  Gender,
  MatchResponse,
  Orientation,
} from "../../lib/api";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { ALL_UERJ_COURSES, UERJ_COURSES_BY_AREA } from "../../lib/uerj-courses";

function getCrushCourseName(crush?: Crush | CrushResponse): string {
  if (!crush) return "UERJ";
  if ("courseName" in crush && crush.courseName) return crush.courseName;
  if ("course" in crush && crush.course?.name) return crush.course.name;
  return "UERJ";
}

const genderLabels: Record<Gender, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  TRANSGENDER: "Transgênero",
  NON_BINARY: "Não-binário",
  OTHER: "Outro",
};

const orientationLabels: Record<Orientation, string> = {
  HETEROSEXUAL: "Heterossexual",
  HOMOSEXUAL: "Homossexual",
  BISEXUAL: "Bissexual",
  ASEXUAL: "Assexual",
  PANSEXUAL: "Pansexual",
};

const INITIAL_FALLBACK_CRUSHES: CrushResponse[] = [
  {
    id: "demo-crush-1",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
    courseName: "Comunicação Social",
    description: "Sempre na fila do bandejão ou lendo perto do bosque com fone de ouvido. Procurando alguém pra rachar um açaí.",
    gender: "FEMALE",
    orientation: "BISEXUAL",
  },
  {
    id: "demo-crush-2",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
    courseName: "Direito",
    description: "Visto na biblioteca do 7º andar com pilha de livros de Constitucional. Fã de MPB e choppada pós-aula.",
    gender: "MALE",
    orientation: "HETEROSEXUAL",
  },
  {
    id: "demo-crush-3",
    photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
    courseName: "História da Arte",
    description: "Look vintage impecável no pilotis. Se você também ama filmes cult e feirinhas, manda seu match!",
    gender: "FEMALE",
    orientation: "PANSEXUAL",
  },
  {
    id: "demo-crush-4",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
    courseName: "Engenharia Elétrica",
    description: "Presença confirmada no Centro Acadêmico e nas noites de karaokê. Prometo que não falo só de exatas.",
    gender: "MALE",
    orientation: "HOMOSEXUAL",
  },
];

export default function CrushesPage() {
  const [crushes, setCrushes] = useState<CrushResponse[]>([]);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [sentMatches, setSentMatches] = useState<MatchResponse[]>([]);
  const [receivedMatches, setReceivedMatches] = useState<MatchResponse[]>([]);
  const [sentCrushIds, setSentCrushIds] = useState<Set<string>>(new Set());

  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gallery" | "received" | "sent">("gallery");

  const [isLoadingCrushes, setIsLoadingCrushes] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchingCrushId, setMatchingCrushId] = useState<string | null>(null);
  const [processingMatchId, setProcessingMatchId] = useState<string | null>(null);

  // Filtros
  const [query, setQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("Todos");
  const [selectedGender, setSelectedGender] = useState("Todos");
  const [selectedOrientation, setSelectedOrientation] = useState("Todos");

  // Modal de cadastro de perfil
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModalCourse, setSelectedModalCourse] = useState("");
  const [customCourseName, setCustomCourseName] = useState("");
  const [isSubmittingCrush, setIsSubmittingCrush] = useState(false);
  const [modalError, setModalError] = useState("");

  // Toast
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);

  function showToast(message: string, icon = "💘") {
    setToast({ message, icon });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }

  // Verificar autenticação
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const savedToken = localStorage.getItem("gossipuerj_token");
      setToken(savedToken);
    });
    return () => {
      active = false;
    };
  }, []);

  // Carregar Cursos e Crushes
  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [crushesPage, coursesPage] = await Promise.allSettled([
          api.getAllCrushes(0, 60),
          api.getCourses(0, 100),
        ]);

        if (!active) return;

        if (crushesPage.status === "fulfilled" && crushesPage.value?.content?.length) {
          setCrushes(crushesPage.value.content);
        } else {
          setCrushes(INITIAL_FALLBACK_CRUSHES);
        }

        if (coursesPage.status === "fulfilled" && coursesPage.value?.content?.length) {
          setCourses(coursesPage.value.content);
        }
      } catch {
        if (active) setCrushes(INITIAL_FALLBACK_CRUSHES);
      } finally {
        if (active) setIsLoadingCrushes(false);
      }
    }

    void loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  // Carregar Matches do usuário se autenticado
  useEffect(() => {
    if (!token) return;
    let active = true;

    async function loadMatches() {
      setIsLoadingMatches(true);
      try {
        const [sentRes, receivedRes] = await Promise.allSettled([
          api.getSentMatches(token!),
          api.getReceivedMatches(token!),
        ]);

        if (!active) return;

        if (sentRes.status === "fulfilled" && sentRes.value?.content) {
          setSentMatches(sentRes.value.content);
          const ids = new Set<string>();
          sentRes.value.content.forEach((m) => {
            if (m.likedCrush?.id) ids.add(m.likedCrush.id);
            if (m.crush?.id) ids.add(m.crush.id);
          });
          setSentCrushIds(ids);
        }

        if (receivedRes.status === "fulfilled" && receivedRes.value?.content) {
          setReceivedMatches(receivedRes.value.content);
        }
      } catch {
        // Ignora falhas de match se servidor estiver frio
      } finally {
        if (active) setIsLoadingMatches(false);
      }
    }

    void loadMatches();
    return () => {
      active = false;
    };
  }, [token]);

  // Ação: Demonstrar Interesse / Match
  async function handleSendMatch(crush: CrushResponse) {
    if (!token) {
      showToast("Entre na sua conta para demonstrar interesse!", "🔒");
      return;
    }

    if (sentCrushIds.has(crush.id)) {
      showToast("Você já demonstrou interesse nesse perfil!", "💌");
      return;
    }

    setMatchingCrushId(crush.id);
    try {
      // Se for id de demonstração inicial
      if (crush.id.startsWith("demo-")) {
        setSentCrushIds((prev) => new Set([...prev, crush.id]));
        showToast("Demonstração de interesse enviada com sucesso!", "💖");
        return;
      }

      const match = await api.createMatch(token, crush.id);
      setSentCrushIds((prev) => new Set([...prev, crush.id]));
      setSentMatches((prev) => [match, ...prev]);
      showToast("Interesse enviado! Se for recíproco, vai dar Match!", "🎉");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Não foi possível enviar o interesse.", "⚠️");
    } finally {
      setMatchingCrushId(null);
    }
  }

  // Ação: Aceitar Match
  async function handleAcceptMatch(match: MatchResponse) {
    if (!token) return;
    const crushId = match.crush?.id || match.likedCrush?.id;
    if (!crushId) return;

    setProcessingMatchId(match.id);
    try {
      await api.acceptMatch(token, crushId, match.id);
      setReceivedMatches((prev) =>
        prev.map((item) => (item.id === match.id ? { ...item, status: "ACCEPTED" } : item))
      );
      showToast("DEU MATCH! Vocês demonstraram interesse mútuo! 🎉", "💖");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Não foi possível aceitar o match.", "⚠️");
    } finally {
      setProcessingMatchId(null);
    }
  }

  // Ação: Recusar Match
  async function handleRejectMatch(match: MatchResponse) {
    if (!token) return;
    const crushId = match.crush?.id || match.likedCrush?.id;
    if (!crushId) return;

    setProcessingMatchId(match.id);
    try {
      await api.rejectMatch(token, crushId, match.id);
      setReceivedMatches((prev) =>
        prev.map((item) => (item.id === match.id ? { ...item, status: "REJECTED" } : item))
      );
      showToast("Pedido recusado.", "✕");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Não foi possível recusar o match.", "⚠️");
    } finally {
      setProcessingMatchId(null);
    }
  }

  // Ação: Criar Perfil de Crush
  async function handleCreateCrush(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setModalError("Faça login para cadastrar seu perfil de crush.");
      return;
    }

    setIsSubmittingCrush(true);
    setModalError("");
    const form = new FormData(e.currentTarget);

    const formCourse = String(form.get("courseName") ?? "").trim();
    const formCustomCourse = String(form.get("customCourseName") ?? "").trim();
    const resolvedCourseName = formCourse === "__OTHER__" ? formCustomCourse : (formCourse || selectedModalCourse);

    const payload: CrushRequest = {
      photoUrl: String(form.get("photoUrl") ?? "").trim(),
      courseName: resolvedCourseName,
      description: String(form.get("description") ?? "").trim(),
      gender: String(form.get("gender") ?? "OTHER") as Gender,
      orientation: String(form.get("orientation") ?? "BISEXUAL") as Orientation,
    };

    if (!payload.photoUrl || !payload.courseName || !payload.description) {
      setModalError("Por favor selecione seu curso da UERJ e preencha todos os campos obrigatórios.");
      setIsSubmittingCrush(false);
      return;
    }

    try {
      const newCrush = await api.createCrush(token, payload);
      setCrushes((prev) => [newCrush, ...prev]);
      setIsModalOpen(false);
      showToast("Seu perfil de Crush foi publicado na vitrine da UERJ!", "✨");
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Não foi possível criar o perfil de crush.");
    } finally {
      setIsSubmittingCrush(false);
    }
  }

  // Filtros aplicados
  const filteredCrushes = crushes.filter((crush) => {
    if (selectedCourse !== "Todos" && crush.courseName !== selectedCourse) {
      return false;
    }
    if (selectedGender !== "Todos" && crush.gender !== selectedGender) {
      return false;
    }
    if (selectedOrientation !== "Todos" && crush.orientation !== selectedOrientation) {
      return false;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchCourse = crush.courseName.toLowerCase().includes(q);
      const matchDesc = crush.description.toLowerCase().includes(q);
      if (!matchCourse && !matchDesc) return false;
    }
    return true;
  });

  const pendingReceivedCount = receivedMatches.filter((m) => m.status === "PENDING").length;

  return (
    <div className="site-shell">
      <SiteHeader active="crushes" authenticated={Boolean(token)} />

      <main className="pink-page inner-page">
        <div className="crushes-container">
          {/* Título & Hero */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h1 style={{ color: "#fff", fontSize: "clamp(36px, 5vw, 64px)", letterSpacing: "-0.06em", margin: "0 0 10px", textShadow: "4px 4px 0 var(--ink)" }}>
              Galeria de <span>Crushes</span>
            </h1>
            <span className="yellow-label centered-label" style={{ margin: "0 auto", fontSize: "11px", fontWeight: 900 }}>
              CONECTE-SE COM OUTROS ESTUDANTES DA UERJ E ENCONTRE SEU MATCH
            </span>
          </div>

          {/* Barra de Ações Superiores & Abas */}
          <div className="crushes-header-bar">
            <div className="crushes-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "gallery"}
                className={`crush-tab-btn ${activeTab === "gallery" ? "active" : ""}`}
                onClick={() => setActiveTab("gallery")}
              >
                <span>💘 Galeria de Crushes</span>
                <span className="tab-counter">{crushes.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "received"}
                className={`crush-tab-btn tab-received ${activeTab === "received" ? "active" : ""}`}
                onClick={() => setActiveTab("received")}
              >
                <span>📬 Matches Recebidos</span>
                {pendingReceivedCount > 0 && (
                  <span className="tab-counter" style={{ background: "var(--yellow)", color: "var(--ink)" }}>
                    {pendingReceivedCount} novos
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "sent"}
                className={`crush-tab-btn tab-sent ${activeTab === "sent" ? "active" : ""}`}
                onClick={() => setActiveTab("sent")}
              >
                <span>🚀 Pedidos Enviados</span>
                <span className="tab-counter">{sentMatches.length}</span>
              </button>
            </div>

            <button
              type="button"
              className="create-crush-btn"
              onClick={() => {
                if (!token) {
                  showToast("Faça login para cadastrar seu perfil de crush!", "🔒");
                } else {
                  setIsModalOpen(true);
                }
              }}
            >
              ✨ Cadastrar Meu Perfil
            </button>
          </div>

          {/* Aviso de Login se Desconectado */}
          {!token && (
            <div className="login-notice" style={{ marginBottom: "28px" }}>
              <div>
                <strong style={{ fontSize: "16px", display: "block", marginBottom: "4px" }}>
                  Quer demonstrar interesse ou receber matches?
                </strong>
                <p style={{ margin: 0, fontSize: "13px" }}>
                  Entre com seu email institucional da UERJ para enviar pedidos e descobrir quem curtiu você.
                </p>
              </div>
              <Link className="black-button" href="/login" style={{ whiteSpace: "nowrap" }}>
                ENTRAR AGORA
              </Link>
            </div>
          )}

          {/* ABA 1: GALERIA DE CRUSHES */}
          {activeTab === "gallery" && (
            <div>
              {/* Filtros e Busca */}
              <div className="crushes-filter-card">
                <div className="crushes-search-row">
                  <input
                    type="text"
                    className="crushes-search-input"
                    placeholder="🔍 Buscar por descrição, características ou curso..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      style={{ background: "#eee", border: "3px solid var(--ink)", padding: "0 14px", fontWeight: 800, cursor: "pointer" }}
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="crushes-selects-grid">
                  <label>
                    Filtrar por Curso
                    <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                      <option value="Todos">Todos os cursos ({Object.values(UERJ_COURSES_BY_AREA).flat().length} cursos)</option>
                      {Object.entries(UERJ_COURSES_BY_AREA).map(([area, courseList]) => (
                        <optgroup key={area} label={`Área: ${area}`}>
                          {courseList.map((course) => (
                            <option key={course} value={course}>
                              {course}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      {courses.filter((c) => !ALL_UERJ_COURSES.includes(c.name)).length > 0 && (
                        <optgroup label="Outros Cursos Cadastrados">
                          {courses
                            .filter((c) => !ALL_UERJ_COURSES.includes(c.name))
                            .map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                  </label>

                  <label>
                    Filtrar por Gênero
                    <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)}>
                      <option value="Todos">Todos os gêneros</option>
                      <option value="FEMALE">Feminino</option>
                      <option value="MALE">Masculino</option>
                      <option value="TRANSGENDER">Transgênero</option>
                      <option value="NON_BINARY">Não-binário</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </label>

                  <label>
                    Orientação
                    <select value={selectedOrientation} onChange={(e) => setSelectedOrientation(e.target.value)}>
                      <option value="Todos">Todas as orientações</option>
                      <option value="HETEROSEXUAL">Heterossexual</option>
                      <option value="HOMOSEXUAL">Homossexual</option>
                      <option value="BISEXUAL">Bissexual</option>
                      <option value="ASEXUAL">Assexual</option>
                      <option value="PANSEXUAL">Pansexual</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Grid de Cards de Crush */}
              {isLoadingCrushes ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "40px", textAlign: "center" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
                  <p style={{ fontWeight: 800, margin: 0 }}>Carregando os crushes da UERJ...</p>
                </div>
              ) : filteredCrushes.length === 0 ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "50px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>💔</div>
                  <h3 style={{ fontSize: "20px", fontWeight: 900, margin: "0 0 6px" }}>Nenhum crush encontrado</h3>
                  <p style={{ color: "#666", fontSize: "13px", margin: "0 0 18px" }}>
                    Tente ajustar os filtros ou seja o primeiro a cadastrar seu perfil de crush!
                  </p>
                  <button
                    type="button"
                    className="create-crush-btn"
                    onClick={() => {
                      setSelectedCourse("Todos");
                      setSelectedGender("Todos");
                      setSelectedOrientation("Todos");
                      setQuery("");
                    }}
                  >
                    Resetar Filtros
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
                  {filteredCrushes.map((crush) => {
                    const isLiked = sentCrushIds.has(crush.id);
                    const isProcessing = matchingCrushId === crush.id;

                    return (
                      <div key={crush.id} className="crush-card-modern">
                        <div className="crush-card-photo-wrap">
                          {crush.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={crush.photoUrl}
                              alt={`Crush de ${crush.courseName}`}
                              className="crush-card-img"
                              onError={(e) => {
                                // Fallback visual limpo se imagem quebrar
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="crush-card-avatar-fallback" style={{ background: "var(--yellow)" }}>
                              {crush.courseName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="crush-card-course-badge">
                            {crush.courseName}
                          </span>
                        </div>

                        <div className="crush-card-body">
                          <div className="crush-card-tags">
                            {crush.gender && (
                              <span className="crush-tag gender">
                                {genderLabels[crush.gender] || crush.gender}
                              </span>
                            )}
                            {crush.orientation && (
                              <span className="crush-tag orientation">
                                {orientationLabels[crush.orientation] || crush.orientation}
                              </span>
                            )}
                          </div>

                          <p className="crush-card-desc">
                            &ldquo;{crush.description}&rdquo;
                          </p>

                          <button
                            type="button"
                            className={`crush-card-btn ${isLiked ? "liked" : ""}`}
                            disabled={isLiked || isProcessing}
                            onClick={() => handleSendMatch(crush)}
                          >
                            {isProcessing
                              ? "ENVIANDO..."
                              : isLiked
                              ? "✓ INTERESSE ENVIADO"
                              : "♡ DEMONSTRAR INTERESSE"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: MATCHES RECEBIDOS */}
          {activeTab === "received" && (
            <div className="matches-list">
              {!token ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "40px", textAlign: "center" }}>
                  <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔒</div>
                  <h3 style={{ fontSize: "20px", fontWeight: 900, margin: "0 0 8px" }}>Conecte-se para ver seus matches</h3>
                  <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
                    Você precisa estar conectado com sua conta institucional para visualizar quem demonstrou interesse em você.
                  </p>
                  <Link className="pink-button" href="/login" style={{ display: "inline-block", maxWidth: "200px" }}>
                    FAZER LOGIN
                  </Link>
                </div>
              ) : isLoadingMatches ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "40px", textAlign: "center" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
                  <p style={{ fontWeight: 800, margin: 0 }}>Buscando pedidos recebidos...</p>
                </div>
              ) : receivedMatches.length === 0 ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "44px", marginBottom: "12px" }}>📬</div>
                  <h3 style={{ fontSize: "20px", fontWeight: 900, margin: "0 0 6px" }}>Nenhum pedido de match recebido ainda</h3>
                  <p style={{ color: "#666", fontSize: "13px", maxWidth: "420px", margin: "0 auto 16px" }}>
                    Cadastre ou compartilhe seu perfil de crush para que outros alunos da UERJ encontrem você!
                  </p>
                  <button type="button" className="create-crush-btn" onClick={() => setIsModalOpen(true)}>
                    Cadastrar Meu Perfil
                  </button>
                </div>
              ) : (
                receivedMatches.map((match) => {
                  const matchCrush = match.crush || match.likedCrush;
                  const matchCourse = getCrushCourseName(matchCrush);
                  const isProcessing = processingMatchId === match.id;
                  const isAccepted = match.status === "ACCEPTED";
                  const isRejected = match.status === "REJECTED";

                  return (
                    <div key={match.id} className={`match-item-card ${isAccepted ? "accepted" : ""}`}>
                      <div className="match-info-group">
                        <div className="match-avatar-mini">
                          {matchCrush?.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={matchCrush.photoUrl} alt="Foto do crush" />
                          ) : (
                            <span>{matchCourse.charAt(0) || "💘"}</span>
                          )}
                        </div>

                        <div className="match-details">
                          <h4>
                            {matchCourse}
                          </h4>
                          {matchCrush?.description && (
                            <p>&ldquo;{matchCrush.description}&rdquo;</p>
                          )}
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span
                              className={`match-status-badge ${
                                isAccepted ? "accepted" : isRejected ? "rejected" : "pending"
                              }`}
                            >
                              {isAccepted
                                ? "🎉 DEU MATCH!"
                                : isRejected
                                ? "RECUSADO"
                                : "AGUARDANDO SUA RESPOSTA"}
                            </span>
                            {match.createdAt && (
                              <span style={{ fontSize: "11px", color: "#666" }}>
                                {new Date(match.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="match-actions-group">
                        {match.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              className="btn-accept-match"
                              disabled={isProcessing}
                              onClick={() => handleAcceptMatch(match)}
                            >
                              {isProcessing ? "SALVANDO..." : "✓ ACEITAR MATCH"}
                            </button>
                            <button
                              type="button"
                              className="btn-reject-match"
                              disabled={isProcessing}
                              onClick={() => handleRejectMatch(match)}
                            >
                              ✕ RECUSAR
                            </button>
                          </>
                        )}
                        {isAccepted && (
                          <span style={{ fontSize: "12px", fontWeight: 900, color: "#009955" }}>
                            Vocês deram match! 💖
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ABA 3: PEDIDOS ENVIADOS */}
          {activeTab === "sent" && (
            <div className="matches-list">
              {!token ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "40px", textAlign: "center" }}>
                  <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔒</div>
                  <h3 style={{ fontSize: "20px", fontWeight: 900, margin: "0 0 8px" }}>Conecte-se para ver seus envios</h3>
                  <Link className="pink-button" href="/login" style={{ display: "inline-block", maxWidth: "200px" }}>
                    FAZER LOGIN
                  </Link>
                </div>
              ) : isLoadingMatches ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "40px", textAlign: "center" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
                  <p style={{ fontWeight: 800, margin: 0 }}>Buscando pedidos enviados...</p>
                </div>
              ) : sentMatches.length === 0 ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "44px", marginBottom: "12px" }}>🚀</div>
                  <h3 style={{ fontSize: "20px", fontWeight: 900, margin: "0 0 6px" }}>Nenhum pedido enviado ainda</h3>
                  <p style={{ color: "#666", fontSize: "13px", margin: "0 0 16px" }}>
                    Explore a galeria e clique em &ldquo;Demonstrar Interesse&rdquo; quando encontrar alguém interessante!
                  </p>
                  <button type="button" className="crush-tab-btn active" onClick={() => setActiveTab("gallery")}>
                    Ir para a Galeria de Crushes
                  </button>
                </div>
              ) : (
                sentMatches.map((match) => {
                  const targetCrush = match.likedCrush || match.crush;
                  const targetCourse = getCrushCourseName(targetCrush);
                  const isAccepted = match.status === "ACCEPTED";
                  const isRejected = match.status === "REJECTED";

                  return (
                    <div key={match.id} className={`match-item-card ${isAccepted ? "accepted" : ""}`}>
                      <div className="match-info-group">
                        <div className="match-avatar-mini" style={{ background: "var(--yellow)" }}>
                          {targetCrush?.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={targetCrush.photoUrl} alt="Foto do crush" />
                          ) : (
                            <span>{targetCourse.charAt(0) || "💘"}</span>
                          )}
                        </div>

                        <div className="match-details">
                          <h4>
                            Crush de {targetCourse}
                          </h4>
                          {targetCrush?.description && (
                            <p>&ldquo;{targetCrush.description}&rdquo;</p>
                          )}
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span
                              className={`match-status-badge ${
                                isAccepted ? "accepted" : isRejected ? "rejected" : "pending"
                              }`}
                            >
                              {isAccepted
                                ? "💖 MATCH CONFIRMADO!"
                                : isRejected
                                ? "NÃO FOI DESSA VEZ"
                                : "AGUARDANDO RESPOSTA ⏳"}
                            </span>
                            {match.createdAt && (
                              <span style={{ fontSize: "11px", color: "#666" }}>
                                {new Date(match.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isAccepted && (
                          <span style={{ background: "#00d084", color: "#fff", border: "2px solid var(--ink)", padding: "6px 10px", fontSize: "11px", fontWeight: 900 }}>
                            DEU MATCH! 🎉
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: CADASTRAR PERFIL DE CRUSH */}
      {isModalOpen && (
        <div className="crush-modal-backdrop" onClick={() => !isSubmittingCrush && setIsModalOpen(false)}>
          <div className="crush-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="crush-modal-close"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmittingCrush}
            >
              ✕
            </button>

            <h2 className="crush-modal-title">Cadastrar Perfil de Crush</h2>
            <p className="crush-modal-subtitle">
              Adicione suas informações para aparecer na vitrine de crushes da UERJ e receber matches de outros alunos.
            </p>

            {modalError && (
              <p className="form-error" role="alert" style={{ marginBottom: "14px" }}>
                {modalError}
              </p>
            )}

            <form className="crush-modal-form" onSubmit={handleCreateCrush}>
              <label>
                URL da sua foto (ou imagem de perfil) *
                <input
                  name="photoUrl"
                  type="url"
                  placeholder="https://exemplo.com/sua-foto.jpg"
                  required
                />
              </label>

              <label>
                Seu Curso de Graduação na UERJ *
                <select
                  name="courseName"
                  value={selectedModalCourse}
                  onChange={(e) => setSelectedModalCourse(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Selecione seu curso oficial da UERJ...
                  </option>
                  {Object.entries(UERJ_COURSES_BY_AREA).map(([area, courseList]) => (
                    <optgroup key={area} label={`Área: ${area}`}>
                      {courseList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__OTHER__">✨ Outro curso / Digitar manualmente...</option>
                </select>
              </label>

              {selectedModalCourse === "__OTHER__" && (
                <label>
                  Nome do Curso na UERJ *
                  <input
                    name="customCourseName"
                    type="text"
                    placeholder="Digite o nome do seu curso..."
                    value={customCourseName}
                    onChange={(e) => setCustomCourseName(e.target.value)}
                    required
                  />
                </label>
              )}

              <label>
                Descrição / Fofoca sobre você *
                <textarea
                  name="description"
                  placeholder="Ex: Alguém do 6º andar me notou na aula de Introdução? Sempre no pilotis ou na choppada..."
                  required
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Gênero
                  <select name="gender" defaultValue="OTHER">
                    <option value="FEMALE">Feminino</option>
                    <option value="MALE">Masculino</option>
                    <option value="TRANSGENDER">Transgênero</option>
                    <option value="NON_BINARY">Não-binário</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </label>

                <label>
                  Orientação
                  <select name="orientation" defaultValue="BISEXUAL">
                    <option value="HETEROSEXUAL">Heterossexual</option>
                    <option value="HOMOSEXUAL">Homossexual</option>
                    <option value="BISEXUAL">Bissexual</option>
                    <option value="ASEXUAL">Assexual</option>
                    <option value="PANSEXUAL">Pansexual</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="crush-modal-submit" disabled={isSubmittingCrush}>
                {isSubmittingCrush ? "PUBLICANDO..." : "PUBLICAR MEU PERFIL DE CRUSH"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Flutuante */}
      {toast && (
        <div className="floating-toast" role="status">
          <span style={{ fontSize: "20px" }}>{toast.icon}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
