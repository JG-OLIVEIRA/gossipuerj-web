"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, Post, UserResponse } from "../../lib/api";
import PostCard from "../components/post-card";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

const genderLabels: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  TRANSGENDER: "Transgênero",
  NON_BINARY: "Não-binário",
  OTHER: "Outro",
};

const orientationLabels: Record<string, string> = {
  HETEROSEXUAL: "Heterossexual",
  HOMOSEXUAL: "Homossexual",
  BISEXUAL: "Bissexual",
  ASEXUAL: "Assexual",
  PANSEXUAL: "Pansexual",
};

const postCategoryLabels: Record<string, string> = {
  CRUSH: "Crush",
  RELATIONSHIP: "Relacionamentos",
  ACADEMIC: "Acadêmico",
  PARTY: "Festa",
  DRAMA: "Drama",
  CONFESSION: "Confissão",
  LOST_AND_FOUND: "Achados e Perdidos",
  MEME: "Meme",
  ALERT: "Alerta",
  CAFETERIA: "Bandejão",
};

type CampusVibe = {
  id: string;
  label: string;
  icon: string;
  desc: string;
};

const CAMPUS_VIBES: CampusVibe[] = [
  { id: "uerj_raiz", label: "UERJiano Raiz", icon: "✨", desc: "Orgulho do Pavilhão João Lyra Filho" },
  { id: "spy", label: "Modo Espião", icon: "🕶️", desc: "De olho em tudo que rola no 5º andar" },
  { id: "crush", label: "Caçando Crush", icon: "💘", desc: "Procurando meu par na Concha Acústica" },
  { id: "p1", label: "Semana de P1/P2", icon: "📚", desc: "Estudando na base do desespero" },
  { id: "cafe", label: "Movido a Café", icon: "☕", desc: "4 expressos antes das 10h da manhã" },
  { id: "bandejao", label: "Fila do Bandejão", icon: "🍽️", desc: "Guerreiro da rampa e do estrogonofe" },
  { id: "sextou", label: "Sextou no Chope", icon: "🍹", desc: "Presença confirmada no Bar dos Estudantes" },
  { id: "drama", label: "Drama Queen", icon: "🎭", desc: "A faculdade é um filme e eu sou o caos" },
];

export default function PerfilPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [profileEmail, setProfileEmail] = useState("");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [totalLikesCount, setTotalLikesCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"posts" | "carteirinha" | "conquistas">("posts");
  const [currentVibeId, setCurrentVibeId] = useState<string>("uerj_raiz");
  const [isVibePickerOpen, setIsVibePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);

  function triggerToast(message: string, icon = "✓") {
    setToast({ message, icon });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  }

  useEffect(() => {
    let active = true;

    async function initProfile() {
      await Promise.resolve();
      if (!active) return;

      const token = localStorage.getItem("gossipuerj_token");
      const savedEmail = localStorage.getItem("gossipuerj_email") ?? "";
      const savedVibe = localStorage.getItem("gossipuerj_vibe");

      if (savedVibe) setCurrentVibeId(savedVibe);

      if (!token) {
        if (active) setAuthenticated(false);
        return;
      }

      if (active) setProfileEmail(savedEmail);

      try {
        const user = await api.me(token);
        if (!active) return;
        setProfile(user);
        setProfileEmail(user.email ?? savedEmail);

        try {
          const posts = await api.myPosts(token);
          if (active) {
            setMyPosts(posts);

            // Buscar contagem de curtidas acumuladas em paralelo
            const likesPromises = posts.map(async (p) => {
              try {
                const count = await api.getTotalPostLikes(p.id);
                return typeof count === "number" ? count : 0;
              } catch {
                return 0;
              }
            });
            const likesResults = await Promise.all(likesPromises);
            const sum = likesResults.reduce((acc, curr) => acc + curr, 0);
            if (active) setTotalLikesCount(sum);
          }
        } catch {
          if (active) setMyPosts([]);
        }

        setAuthenticated(true);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          localStorage.removeItem("gossipuerj_token");
          localStorage.removeItem("gossipuerj_email");
          setAuthenticated(false);
        } else {
          // Backend em cold-start ou offline momentâneo: mantém sessão com dados locais salvos
          setProfile({
            username: savedEmail.split("@")[0] || "uerjiano",
            email: savedEmail || "estudante@graduacao.uerj.br",
          });
          setAuthenticated(true);
        }
      }
    }

    void initProfile();

    return () => {
      active = false;
    };
  }, []);

  function handleSelectVibe(vibeId: string) {
    setCurrentVibeId(vibeId);
    localStorage.setItem("gossipuerj_vibe", vibeId);
    setIsVibePickerOpen(false);
    const vibe = CAMPUS_VIBES.find((v) => v.id === vibeId);
    if (vibe) {
      triggerToast(`Status atualizado para: ${vibe.label}!`, vibe.icon);
    }
  }

  function handleCopyText(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    triggerToast(`${label} copiado para a área de transferência!`, "📋");
  }

  function handleLogout() {
    localStorage.removeItem("gossipuerj_token");
    localStorage.removeItem("gossipuerj_email");
    localStorage.removeItem("gossipuerj_vibe");
    setAuthenticated(false);
    router.push("/login");
  }

  async function handleConfirmDelete() {
    if (!postToDelete) return;
    const token = localStorage.getItem("gossipuerj_token");
    if (!token) return;

    setIsDeleting(true);
    try {
      await api.deletePost(token, postToDelete.id);
      setMyPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
      setPostToDelete(null);
      triggerToast("Fofoca excluída com sucesso!", "🗑️");
    } catch {
      triggerToast("Erro ao excluir publicação.", "⚠️");
    } finally {
      setIsDeleting(false);
    }
  }

  const currentVibe = useMemo(() => {
    return CAMPUS_VIBES.find((v) => v.id === currentVibeId) ?? CAMPUS_VIBES[0];
  }, [currentVibeId]);

  const username = profile?.username || profileEmail.split("@")[0] || "estudante";
  const matriculaCode = useMemo(() => {
    const raw = username.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return `2026.1-UERJ-${raw.slice(0, 5) || "VIP"}`;
  }, [username]);

  const filteredPosts = useMemo(() => {
    return myPosts.filter((post) => {
      const matchesCategory = selectedCategory === "ALL" || post.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [myPosts, selectedCategory, searchQuery]);

  // Sistema de Insígnias & Conquistas
  const achievements = useMemo(() => {
    const hasPosts = myPosts.length > 0;
    const hasHighLikes = totalLikesCount >= 5;
    const hasManyPosts = myPosts.length >= 3;
    const hasBandejaoPost = myPosts.some((p) => p.category === "CAFETERIA" || p.title.toLowerCase().includes("bandejão"));
    const hasCrushPost = myPosts.some((p) => p.category === "CRUSH");

    return [
      {
        id: "membro_uerj",
        title: "Discente UERJ Raiz",
        desc: "Cadastro verificado com e-mail institucional.",
        icon: "🎓",
        unlocked: true,
      },
      {
        id: "primeiro_babado",
        title: "Primeiro Babado",
        desc: "Publicou sua primeira fofoca no Gossip UERJ.",
        icon: "📢",
        unlocked: hasPosts,
      },
      {
        id: "fofoqueiro_ativo",
        title: "Correspondente do 5º Andar",
        desc: "Publicou 3 ou mais fofocas para a comunidade.",
        icon: "🗞️",
        unlocked: hasManyPosts,
      },
      {
        id: "famosinho",
        title: "Bomba do Campus",
        desc: "Conquistou 5 ou mais curtidas acumuladas em suas publicações.",
        icon: "🔥",
        unlocked: hasHighLikes,
      },
      {
        id: "bandejao_lover",
        title: "Sobrevivente da Rampa",
        desc: "Publicou sobre o bandejão da UERJ.",
        icon: "🍽️",
        unlocked: hasBandejaoPost,
      },
      {
        id: "cupido",
        title: "Cupido do Maracanã",
        desc: "Postou na categoria de Crushes do campus.",
        icon: "💘",
        unlocked: hasCrushPost,
      },
    ];
  }, [myPosts, totalLikesCount]);

  if (authenticated === null) {
    return (
      <div className="site-shell">
        <SiteHeader active="perfil" authenticated />
        <section className="pink-page login-page">
          <div className="login-card profile-loading" role="status" aria-live="polite">
            <div className="login-logo">GOSSIP<span>UERJ</span></div>
            <div className="loading-spinner" aria-hidden="true" />
            <h1>Carregando seu perfil...</h1>
            <p>Conectando ao sistema acadêmico do Gossip UERJ.</p>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  if (authenticated === false) {
    return (
      <div className="site-shell">
        <SiteHeader active="login" />
        <section className="pink-page login-page">
          <div className="login-card" style={{ maxWidth: "480px" }}>
            <div className="login-logo">GOSSIP<span>UERJ</span></div>
            <div style={{ fontSize: "56px", margin: "16px 0 8px" }}>🔒</div>
            <h1 style={{ fontSize: "26px", margin: "10px 0" }}>Você não está logado</h1>
            <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.5", marginBottom: "28px" }}>
              Para acessar sua Carteirinha Digital UERJ, ver suas fofocas e gerenciar suas preferências, entre com sua conta institucional.
            </p>
            <Link className="pink-button" href="/login" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
              ENTRAR OU CRIAR CONTA
            </Link>
            <Link className="back-link" href="/">← Voltar para o feed</Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="site-shell">
      <SiteHeader active="perfil" authenticated />

      <section className="pink-page" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        <div className="profile-hub">

          {/* ========================================================
              HERO / BANNER DA IDENTIDADE DO ESTUDANTE
             ======================================================== */}
          <div className="profile-hero">
            <div className="profile-cover">
              <div className="cover-stamps">
                <span className="stamp-tag">📍 CAMPUS MARACANÃ</span>
                <span className="stamp-tag pink">✦ GOSSIP VIP 2026</span>
                <span className="stamp-tag cyan">PAVILHÃO JOÃO LYRA FILHO</span>
              </div>
            </div>

            <div className="profile-hero-body">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-box">
                  <span>{username.charAt(0).toUpperCase()}</span>
                  <div className="avatar-uerj-badge">UERJ</div>
                </div>

                <div className="profile-user-headline">
                  <div className="profile-handle-bar">
                    <span className="profile-handle">@{username}</span>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => handleCopyText(`@${username}`, "Username")}
                      title="Copiar @username"
                      aria-label="Copiar nome de usuário"
                    >
                      Copiar @
                    </button>
                    <span className="verified-chip" title="E-mail universitário verificado">
                      ✓ UERJ Verificado
                    </span>
                  </div>
                </div>
              </div>

              {/* Vibe / Status do Campus */}
              <div className="profile-vibe-box">
                <span className="vibe-label">Status no Campus:</span>
                <button
                  type="button"
                  className="vibe-button"
                  onClick={() => setIsVibePickerOpen(!isVibePickerOpen)}
                  title="Alterar seu humor/vibe no campus"
                  aria-expanded={isVibePickerOpen}
                >
                  <span>{currentVibe.icon}</span>
                  <strong>{currentVibe.label}</strong>
                  <span style={{ fontSize: "10px" }}>▼</span>
                </button>

                {isVibePickerOpen && (
                  <div className="vibe-picker">
                    {CAMPUS_VIBES.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`vibe-opt ${v.id === currentVibeId ? "active" : ""}`}
                        onClick={() => handleSelectVibe(v.id)}
                      >
                        <span>{v.icon}</span>
                        <span>{v.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================
              GRID DE ESTATÍSTICAS / MÉTRICAS
             ======================================================== */}
          <div className="profile-stats-grid">
            <div className="stat-card yellow">
              <span className="stat-icon">📢</span>
              <div className="stat-number">{myPosts.length}</div>
              <div className="stat-label">{myPosts.length === 1 ? "Fofoca Postada" : "Fofocas Postadas"}</div>
            </div>
            <div className="stat-card pink">
              <span className="stat-icon">❤️</span>
              <div className="stat-number">{totalLikesCount}</div>
              <div className="stat-label">Curtidas Conquistadas</div>
            </div>
            <div className="stat-card cyan">
              <span className="stat-icon">🎓</span>
              <div className="stat-number">UERJ</div>
              <div className="stat-label">Membro Oficial</div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🗓️</span>
              <div className="stat-number">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).toUpperCase() : "2026"}
              </div>
              <div className="stat-label">Membro Desde</div>
            </div>
          </div>

          {/* ========================================================
              LAYOUT PRINCIPAL EM 2 COLUNAS
             ======================================================== */}
          <div className="profile-content-grid">

            {/* COLUNA ESQUERDA: CARTEIRINHA DIGITAL & ATALHOS */}
            <aside className="carteirinha-container">
              <div className="carteirinha-title">
                <span>CREDENCIAL DIGITAL</span>
                <strong>CARTEIRINHA UERJ</strong>
              </div>

              {/* CARD ESTILO IDENTIDADE ESTUDANTIL */}
              <div className="carteirinha-card">
                <div className="carteirinha-top-stripe">
                  <div className="uerj-brand">
                    <span>🏛️</span>
                    <span>UERJ • DISCENTE</span>
                  </div>
                  <span>GOSSIP PASS</span>
                </div>

                <div className="carteirinha-body">
                  <div className="carteirinha-photo">
                    <span className="carteirinha-photo-initial">{username.charAt(0).toUpperCase()}</span>
                    <span className="carteirinha-photo-label">FOTO 3X4</span>
                  </div>

                  <div className="carteirinha-info">
                    <div className="carteirinha-field">
                      <small>NOME DO ESTUDANTE</small>
                      <strong title={username}>{username}</strong>
                    </div>

                    <div className="carteirinha-field">
                      <small>MATRÍCULA FOFOQUEIRA</small>
                      <strong style={{ fontFamily: "monospace", color: "var(--pink)" }}>{matriculaCode}</strong>
                    </div>

                    <div className="carteirinha-field">
                      <small>E-MAIL INSTITUCIONAL</small>
                      <span
                        style={{ fontSize: "11px", color: "#555", overflowWrap: "anywhere", cursor: "pointer" }}
                        onClick={() => handleCopyText(profile?.email || profileEmail, "E-mail")}
                        title="Clique para copiar e-mail"
                      >
                        {profile?.email || profileEmail || "uerjiano@graduacao.uerj.br"}
                      </span>
                    </div>

                    <div className="carteirinha-badges">
                      <span className="carteirinha-badge yellow">
                        {profile?.gender ? genderLabels[profile.gender] ?? profile.gender : "Gênero Discente"}
                      </span>
                      <span className="carteirinha-badge cyan">
                        {profile?.orientation ? orientationLabels[profile.orientation] ?? profile.orientation : "Orientação"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="carteirinha-barcode-strip">
                  <div className="fake-barcode">||| | |||| || ||| |</div>
                  <span className="carteirinha-status-pill">100% ATIVA</span>
                </div>
              </div>

              {/* ATALHOS RÁPIDOS */}
              <div className="carteirinha-title" style={{ marginTop: "10px" }}>
                <span>AÇÕES RÁPIDAS</span>
                <strong>CAMPUS HUB</strong>
              </div>

              <div className="quick-actions-panel">
                <Link className="quick-action-btn" href="/">
                  <span>⚡ Soltar Fofoca no Feed</span>
                  <span>→</span>
                </Link>
                <Link className="quick-action-btn" href="/crushes">
                  <span>💘 Galeria de Crushes</span>
                  <span>→</span>
                </Link>
                <Link className="quick-action-btn" href="/vendas">
                  <span>🛍️ Desapegos & Vendas</span>
                  <span>→</span>
                </Link>
                <Link className="quick-action-btn" href="/grupos">
                  <span>👥 Grupos de WhatsApp</span>
                  <span>→</span>
                </Link>
                <button
                  type="button"
                  className="quick-action-btn danger"
                  onClick={() => setShowLogoutConfirm(true)}
                >
                  <span>🚪 Sair da Conta</span>
                  <span>✕</span>
                </button>
              </div>
            </aside>

            {/* COLUNA DIREITA: ABAS INTERATIVAS */}
            <main className="profile-tabs-wrapper">
              <div className="profile-tabs-nav">
                <button
                  type="button"
                  className={`profile-tab-btn ${activeTab === "posts" ? "active" : ""}`}
                  onClick={() => setActiveTab("posts")}
                >
                  <span>💬 Minhas Fofocas</span>
                  <span className="tab-count">{myPosts.length}</span>
                </button>
                <button
                  type="button"
                  className={`profile-tab-btn ${activeTab === "carteirinha" ? "active" : ""}`}
                  onClick={() => setActiveTab("carteirinha")}
                >
                  <span>🪪 Carteirinha VIP</span>
                </button>
                <button
                  type="button"
                  className={`profile-tab-btn ${activeTab === "conquistas" ? "active" : ""}`}
                  onClick={() => setActiveTab("conquistas")}
                >
                  <span>🏅 Conquistas</span>
                  <span className="tab-count">{achievements.filter((a) => a.unlocked).length}</span>
                </button>
              </div>

              <div className="profile-tab-content">
                {/* ========================================================
                    ABA 1: MINHAS FOFOCAS
                   ======================================================== */}
                {activeTab === "posts" && (
                  <div>
                    <div className="profile-posts-filter-bar">
                      <input
                        type="text"
                        className="profile-search-input"
                        placeholder="⌕ Filtrar nas suas publicações..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Buscar nas suas publicações"
                      />
                      <select
                        className="profile-category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        aria-label="Filtrar por categoria"
                      >
                        <option value="ALL">Todas as Categorias</option>
                        {Object.entries(postCategoryLabels).map(([catValue, catLabel]) => (
                          <option key={catValue} value={catValue}>
                            {catLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    {filteredPosts.length === 0 ? (
                      <div className="profile-empty-state">
                        <div className="profile-empty-icon">🤫</div>
                        <h3>
                          {myPosts.length === 0
                            ? "Você ainda não soltou nenhuma fofoca!"
                            : "Nenhuma fofoca encontrada com esses filtros."}
                        </h3>
                        <p>
                          {myPosts.length === 0
                            ? "Viu algo bizarro no elevador do 10º andar ou tem um desabafo sobre a semana de provas? Vá até o feed e seja a Gossip Girl da UERJ!"
                            : "Tente buscar por outro termo ou mude o filtro de categoria."}
                        </p>
                        {myPosts.length === 0 && (
                          <Link className="pink-button" href="/" style={{ maxWidth: "260px", marginTop: "14px" }}>
                            PUBLICAR NO FEED
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "16px" }}>
                        {filteredPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            categoryLabel={postCategoryLabels[post.category] ?? post.category}
                            isMyPost={true}
                            isDeleting={isDeleting && postToDelete?.id === post.id}
                            onDelete={() => setPostToDelete(post)}
                            onError={(msg) => triggerToast(msg, "⚠️")}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================
                    ABA 2: CARTEIRINHA VIP EXPANDIDA
                   ======================================================== */}
                {activeTab === "carteirinha" && (
                  <div className="carteirinha-expanded-view">
                    <div className="carteirinha-hero-card">
                      <div className="carteirinha-expanded-header">
                        <div>
                          <h2>CREDENCIAL OFICIAL DO DISCENTE</h2>
                          <p>Universidade do Estado do Rio de Janeiro • Diretoria de Fofocas e Entretenimento</p>
                        </div>
                        <span className="stamp-tag cyan">VÁLIDO 2026</span>
                      </div>

                      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                        <div
                          style={{
                            width: "110px",
                            height: "140px",
                            border: "4px solid var(--ink)",
                            background: "linear-gradient(135deg, var(--cyan) 0%, var(--yellow) 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "52px",
                            fontWeight: 900,
                            boxShadow: "4px 4px 0 var(--ink)",
                          }}
                        >
                          {username.charAt(0).toUpperCase()}
                        </div>

                        <div style={{ flex: 1, minWidth: "240px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #ddd", paddingBottom: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#777" }}>ESTUDANTE:</span>
                            <strong style={{ fontSize: "14px" }}>{username}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #ddd", paddingBottom: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#777" }}>MATRÍCULA:</span>
                            <strong style={{ fontFamily: "monospace", color: "var(--pink)" }}>{matriculaCode}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #ddd", paddingBottom: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#777" }}>CAMPUS:</span>
                            <strong>Maracanã • Pavilhão João Lyra Filho</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #ddd", paddingBottom: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#777" }}>NÍVEL DE REPUTAÇÃO:</span>
                            <span className="stamp-tag pink" style={{ fontSize: "10px", padding: "2px 6px" }}>FOFOQUEIRO VIP</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: "3px dashed var(--ink)", paddingTop: "16px", marginTop: "8px" }}>
                        <h4 style={{ margin: "0 0 10px", fontSize: "14px", textTransform: "uppercase" }}>
                          📜 Estatuto Moral do Fofoqueiro UERJiano
                        </h4>
                        <div className="carteirinha-rules-grid">
                          <div className="rule-item">
                            <strong>Cláusula 1:</strong> Reclamar calorosamente da velocidade dos elevadores nos horários de pico.
                          </div>
                          <div className="rule-item">
                            <strong>Cláusula 2:</strong> Defender o bandejão com unhas e dentes quando alguém de outra faculdade criticar.
                          </div>
                          <div className="rule-item">
                            <strong>Cláusula 3:</strong> Toda fofoca iniciada na Concha Acústica pertence ao domínio público do campus.
                          </div>
                          <div className="rule-item">
                            <strong>Cláusula 4:</strong> Amar a UERJ incondicionalmente, mesmo na época mais tenebrosa das P2.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================
                    ABA 3: CONQUISTAS & INSÍGNIAS
                   ======================================================== */}
                {activeTab === "conquistas" && (
                  <div>
                    <p style={{ margin: "0 0 18px", color: "#555", fontSize: "13px" }}>
                      Desbloqueie insígnias exclusivas interagindo com a comunidade, publicando bombas e participando do campus!
                    </p>

                    <div className="achievements-grid">
                      {achievements.map((ach) => (
                        <div
                          key={ach.id}
                          className={`achievement-card ${ach.unlocked ? "unlocked" : "locked"}`}
                        >
                          <div className="achievement-icon">{ach.icon}</div>
                          <div className="achievement-details">
                            <h4>{ach.title}</h4>
                            <p>{ach.desc}</p>
                            <span className="achievement-status">
                              {ach.unlocked ? "DESBLOQUEADA" : "BLOQUEADA"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </section>

      {/* ========================================================
          MODAIS DE CONFIRMAÇÃO
         ======================================================== */}

      {/* Modal de Logout */}
      {showLogoutConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box">
            <span className="modal-icon">🚪</span>
            <h3>Encerrar sessão?</h3>
            <p>Você terá que fazer login novamente com seu e-mail institucional para postar ou gerenciar seus dados.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="modal-btn confirm"
                onClick={handleLogout}
              >
                Sim, Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Excluir Post */}
      {postToDelete && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box">
            <span className="modal-icon">🗑️</span>
            <h3>Excluir fofoca?</h3>
            <p>
              Tem certeza que deseja apagar a publicação <strong>&quot;{postToDelete.title}&quot;</strong>? Esta ação é irreversível.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn cancel"
                onClick={() => setPostToDelete(null)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="modal-btn confirm"
                onClick={() => void handleConfirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-badge" role="status" aria-live="polite">
          <span>{toast.icon}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
