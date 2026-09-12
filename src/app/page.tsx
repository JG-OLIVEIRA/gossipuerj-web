"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api, ApiError, CrushResponse, Post, PostCategory } from "../lib/api";
import PostCard from "./components/post-card";
import SiteFooter from "./components/site-footer";
import SiteHeader from "./components/site-header";
import UerjBuildingSidebar from "./components/uerj-building-sidebar";

const categories: { value: PostCategory; label: string; icon: string }[] = [
  { value: "CONFESSION", label: "Confissão", icon: "🤫" },
  { value: "CRUSH", label: "Crush", icon: "💘" },
  { value: "RELATIONSHIP", label: "Relacionamentos", icon: "💔" },
  { value: "ACADEMIC", label: "Acadêmico", icon: "📚" },
  { value: "CAFETERIA", label: "Bandejão", icon: "🍽️" },
  { value: "PARTY", label: "Festa", icon: "🍹" },
  { value: "DRAMA", label: "Drama", icon: "🎭" },
  { value: "LOST_AND_FOUND", label: "Achados & Perdidos", icon: "🔍" },
  { value: "MEME", label: "Meme", icon: "😂" },
  { value: "ALERT", label: "Alerta", icon: "⚠️" },
];

const categoryIcons = Object.fromEntries(categories.map((c) => [c.value, c.icon]));
const categoryLabels = Object.fromEntries(categories.map((c) => [c.value, c.label]));


export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPostIds, setMyPostIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("CONFESSION");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [deletingPostId, setDeletingPostId] = useState("");
  const [postLikesMap, setPostLikesMap] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  // Filtros, Busca e Ordenação
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "likes">("recent");

  // Sessão do Usuário
  const [userSession, setUserSession] = useState<{
    token: string | null;
    email: string | null;
    username: string | null;
    vibe: string | null;
  }>({ token: null, email: null, username: null, vibe: null });
  const [userCrushCourse, setUserCrushCourse] = useState<string | null>(null);
  const [buildingCrushes, setBuildingCrushes] = useState<CrushResponse[]>([]);

  // Feedback Toast
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);

  function triggerToast(message: string, icon = "✓") {
    setToast({ message, icon });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  }

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      await Promise.resolve();
      if (!active) return;

      // Carregar dados de sessão local
      const token = localStorage.getItem("gossipuerj_token");
      const savedEmail = localStorage.getItem("gossipuerj_email");
      const savedVibe = localStorage.getItem("gossipuerj_vibe");
      setUserSession({
        token,
        email: savedEmail,
        username: savedEmail ? savedEmail.split("@")[0] : null,
        vibe: savedVibe,
      });

      if (!token) {
        if (active) setIsLoading(false);
        return;
      }

      if (token) {
        try {
          const myCrush = await api.getMyCrush(token);
          if (active && myCrush?.courseName) {
            setUserCrushCourse(myCrush.courseName);
          } else {
            const me = await api.me(token);
            if (active && me?.courseName) setUserCrushCourse(me.courseName);
          }
        } catch {
          try {
            const me = await api.me(token);
            if (active && me?.courseName) {
              setUserCrushCourse(me.courseName);
            } else if (active) {
              setUserCrushCourse(null);
            }
          } catch {
            if (active) setUserCrushCourse(null);
          }
        }
        try {
          const crushPage = await api.getAllCrushes(0, 100, undefined, token);
          if (active) setBuildingCrushes(crushPage.content ?? []);
        } catch {
          if (active) setBuildingCrushes([]);
        }
      }

      try {
        const pageData = await api.getAll(0, PAGE_SIZE, undefined, token ?? undefined);
        if (!active) return;
        const loadedPosts = pageData.content;
        setPosts(loadedPosts);
        setCurrentPage(0);
        setHasMore(!pageData.last);

        // Carregar contagem inicial de likes para ordenação em lotes suaves
        const likesMap: Record<string, number> = {};
        const slice = loadedPosts.slice(0, 20);
        for (let i = 0; i < slice.length; i += 5) {
          if (!active) break;
          const batch = slice.slice(i, i + 5);
          await Promise.all(
            batch.map(async (p) => {
              try {
                const count = await api.getTotalPostLikes(p.id);
                likesMap[p.id] = typeof count === "number" ? count : 0;
              } catch {
                likesMap[p.id] = 0;
              }
            })
          );
        }
        if (active) setPostLikesMap(likesMap);

        if (token) {
          try {
            const myPage = await api.getAllByUserId(token);
            if (active) setMyPostIds(new Set(myPage.content.map((post) => post.id)));
          } catch {
            if (active) setMyPostIds(new Set());
          }
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof ApiError ? requestError.message : "Não foi possível carregar as publicações.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  async function loadMorePosts() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const pageData = await api.getAll(nextPage, PAGE_SIZE, undefined, userSession.token ?? undefined);
      setPosts((prev) => [...prev, ...pageData.content]);
      setCurrentPage(nextPage);
      setHasMore(!pageData.last);
    } catch {
      // falha silenciosa no load more
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("gossipuerj_token");
    if (!token) {
      setError("Entre na sua conta institucional para publicar uma fofoca.");
      triggerToast("Faça login para soltar sua fofoca!", "🔒");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const post = await api.create(token, { title, content, category });
      setPosts((currentPosts) => [post, ...currentPosts]);
      setMyPostIds((currentIds) => new Set(currentIds).add(post.id));
      setTitle("");
      setContent("");
      setCategory("CONFESSION");
      triggerToast("Fofoca publicada no campus com sucesso!", "📢");
    } catch (requestError) {
      if (requestError instanceof ApiError && (requestError.status === 401 || requestError.status === 403)) {
        setError("Sua sessão expirou. Entre novamente para publicar.");
        triggerToast("Sessão expirada. Entre novamente.", "⚠️");
      } else {
        setError(requestError instanceof ApiError ? requestError.message : "Não foi possível publicar sua fofoca.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(postId: string) {
    const token = localStorage.getItem("gossipuerj_token");
    if (!token || deletingPostId) return;

    setDeletingPostId(postId);
    setError("");
    try {
      await api.delete(token, postId);
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
      setMyPostIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(postId);
        return nextIds;
      });
      triggerToast("Publicação excluída com sucesso!", "🗑️");
    } catch (requestError) {
      if (requestError instanceof ApiError && (requestError.status === 401 || requestError.status === 403)) {
        setError("Sua sessão expirou. Entre novamente para excluir esta publicação.");
      } else {
        setError(requestError instanceof ApiError ? requestError.message : "Não foi possível excluir a publicação.");
      }
    } finally {
      setDeletingPostId("");
    }
  }

  // Filtragem e Ordenação
  const filteredAndSortedPosts = useMemo(() => {
    const result = posts.filter((post) => {
      const matchesCategory = selectedCategory === "ALL" || post.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    if (sortBy === "likes") {
      return [...result].sort((a, b) => {
        const likesA = postLikesMap[a.id] ?? 0;
        const likesB = postLikesMap[b.id] ?? 0;
        return likesB - likesA;
      });
    }

    // Default: Mais recentes
    return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, selectedCategory, searchQuery, sortBy, postLikesMap]);

  // Contagem por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const post of posts) {
      counts[post.category] = (counts[post.category] || 0) + 1;
    }
    return counts;
  }, [posts]);

  // Letreiro dinâmico alimentado pelas fofocas reais publicadas no campus
  const tickerItems = useMemo(() => {
    if (posts.length === 0) {
      return [
        "🤫 Nenhuma fofoca postada ainda no campus. Seja o primeiro a soltar um babado no formulário abaixo!",
        "⚡ PLANTÃO UERJ: O feed 100% anônimo do Pavilhão João Lyra Filho",
        "🔒 TOTALMENTE ANÔNIMO: Seu segredo está a salvo com o Gossip UERJ",
      ];
    }

    const postItems = posts.slice(0, 10).map((post) => {
      const icon = categoryIcons[post.category] || "📢";
      const cat = categoryLabels[post.category] || post.category;
      const cleanContent = post.content.replace(/\s+/g, " ").trim();
      const snippet = cleanContent.length > 70 ? `${cleanContent.slice(0, 70)}...` : cleanContent;
      return `${icon} ${cat.toUpperCase()}: "${post.title}" — ${snippet}`;
    });

    let items = [...postItems];
    while (items.length < 4) {
      items = [...items, ...postItems];
    }
    return items;
  }, [posts]);

  if (!isLoading && !userSession.token) {
    return (
      <div className="site-shell">
        <SiteHeader active="feed" />
        <div className="campus-ticker-wrap">
          <div className="ticker-badge"><span>⚡</span><span>PLANTÃO UERJ</span></div>
          <div className="ticker-scroll-box"><div className="ticker-track"><span>🔒 O feed do campus é exclusivo para quem tem uma conta</span><span>💬 Entre para ler, comentar e publicar fofocas</span></div></div>
        </div>
        <main className="pink-page feed-page feed-login-gate-page">
          <div className="feed-login-gate">
            <div className="feed-login-gate-icon">👀</div>
            <span className="site-guide-kicker">A COMUNIDADE ESTÁ AQUI</span>
            <h1>Tem coisa rolando na UERJ.</h1>
            <p>Crie sua conta para ler as fofocas, comentar anonimamente, curtir as bombas do campus e soltar a sua.</p>
            <div className="feed-login-gate-actions">
              <Link className="pink-button" href="/login">ENTRAR OU CRIAR CONTA</Link>
              <Link className="feed-login-guide-link" href="/como-usar">Como funciona o site?</Link>
            </div>
            <small>O cadastro começa com email institucional verificado. Depois, você pode atualizar seus dados no perfil.</small>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="site-shell">
      <SiteHeader active="feed" authenticated={Boolean(userSession.token)} />

      {/* ========================================================
          CAMPUS BREAKING NEWS TICKER (FOFOCAS REAIS DO SITE)
         ======================================================== */}
      <div className="campus-ticker-wrap">
        <div className="ticker-badge">
          <span>⚡</span>
          <span>PLANTÃO UERJ</span>
        </div>
        <div className="ticker-scroll-box">
          <div className="ticker-track">
            {tickerItems.map((item, idx) => (
              <span key={`ticker-${idx}`}>{item}</span>
            ))}
            {tickerItems.map((item, idx) => (
              <span key={`ticker-repeat-${idx}`} aria-hidden="true">{item}</span>
            ))}
          </div>
        </div>
      </div>

      <section className="pink-page feed-page" style={{ paddingTop: "32px", paddingBottom: "70px" }}>
        <div className="feed-hub">

          {/* ========================================================
              HERO DO CAMPUS UERJ
             ======================================================== */}
          <div className="feed-hero-box">
            <div className="feed-hero-banner">
              <div className="feed-hero-title">
                <h1>
                  O QUE ESTÁ<br />
                  ROLANDO NA <span>UERJ?</span>
                </h1>
                <p>FOFOCAS ANÔNIMAS, SEGREDOS E CRUSHES DO CAMPUS MARACANÃ</p>
              </div>

              <div className="cover-stamps">
                <span className="stamp-tag">📍 PAVILHÃO JOÃO LYRA</span>
                <span className="stamp-tag pink">✦ 100% ANÔNIMO</span>
                <span className="stamp-tag cyan">EST. 2026</span>
              </div>
            </div>

            {/* Barra de Saudação do Usuário */}
            <div className="feed-user-bar">
              {userSession.token ? (
                <div className="feed-user-greeting">
                  <div className="feed-user-mini-avatar">
                    {(userSession.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <span>
                    Conectado como <strong>@{userSession.username}</strong>
                  </span>
                  <span className="verified-chip" style={{ fontSize: "10px", padding: "2px 6px" }}>
                    ✓ Discente UERJ
                  </span>
                </div>
              ) : (
                <div className="feed-user-greeting">
                  <span>👀 Navegando em modo visitante.</span>
                  <span style={{ color: "#666", fontSize: "12px" }}>
                    Para votar e ter sua carteirinha, conecte-se.
                  </span>
                </div>
              )}

              <div>
                {userSession.token ? (
                  <Link
                    href="/perfil"
                    className="quick-action-btn"
                    style={{ padding: "6px 12px", fontSize: "11px", display: "inline-flex", gap: "6px" }}
                  >
                    <span>🪪 Ver Minha Carteirinha</span>
                    <span>→</span>
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="pink-button"
                    style={{ padding: "8px 14px", fontSize: "11px", margin: 0, width: "auto", display: "inline-block" }}
                  >
                    ENTRAR / CRIAR CONTA
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================
              CAIXA DE CONFISSÃO ANÔNIMA (SECRET DROP BOX)
             ======================================================== */}
          <form className="feed-create-card" onSubmit={handleSubmit}>
            <div className="feed-create-header">
              <div className="feed-create-title">
                <span>🤫</span>
                <span>Soltar Fofoca no Campus</span>
              </div>
              <div className="anonymous-badge">
                <span>🔒</span>
                <span>Garantia de Anonimato: Seu nome nunca aparece no post</span>
              </div>
            </div>

            {/* Seletor de Categoria em Chips */}
            <div style={{ marginBottom: "8px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#666" }}>
              Escolha a Categoria:
            </div>
            <div className="category-chips-row">
              {categories.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`category-chip-btn ${category === item.value ? "active" : ""}`}
                  onClick={() => setCategory(item.value)}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <input
              className="post-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={250}
              placeholder="Dê um título chamativo para a fofoca (ex: 'O que aconteceu hoje na rampa do 3º andar...')"
              aria-label="Título da publicação"
              required
            />

            <textarea
              className="post-content-textarea"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={280}
              placeholder="Conta o babado completo! Lembra de não inventar fake news absurda e respeitar os colegas..."
              aria-label="Conteúdo da publicação"
              required
            />

            <div className="feed-create-footer">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`char-counter-pill ${content.length >= 260 ? "warning" : ""}`}>
                  {content.length}/280 caracteres
                </span>
                <span style={{ fontSize: "11px", color: "#777" }}>
                  Categoria: <strong>{categoryLabels[category]}</strong>
                </span>
              </div>

              <button className="pink-button" type="submit" disabled={isSubmitting} style={{ margin: 0, width: "auto" }}>
                {isSubmitting ? "PUBLICANDO..." : "PUBLICAR FOFOCA ↗"}
              </button>
            </div>

            {error && <p className="form-error" role="alert" style={{ marginTop: "14px" }}>{error}</p>}
          </form>

          {/* ========================================================
              BARRA DE BUSCA, FILTROS E ORDENAÇÃO
             ======================================================== */}
          <div className="feed-filter-card">
            <div className="feed-filter-top-row">
              <div className="feed-search-wrap">
                <input
                  type="text"
                  className="feed-search-bar"
                  placeholder="⌕ Pesquisar por fofoca, curso, apelido, professor, andar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Pesquisar fofocas no feed"
                />
              </div>

              <div className="feed-sort-actions">
                <button
                  type="button"
                  className={`sort-toggle-btn ${sortBy === "recent" ? "active" : ""}`}
                  onClick={() => setSortBy("recent")}
                  title="Ordenar por publicações mais recentes"
                >
                  <span>⚡</span>
                  <span>Mais Recentes</span>
                </button>
                <button
                  type="button"
                  className={`sort-toggle-btn ${sortBy === "likes" ? "active" : ""}`}
                  onClick={() => setSortBy("likes")}
                  title="Ordenar por publicações com mais curtidas"
                >
                  <span>🔥</span>
                  <span>Em Alta</span>
                </button>
              </div>
            </div>

            {/* Chips de Categoria com Contadores */}
            <div className="feed-category-pills-row">
              <button
                type="button"
                className={`filter-pill ${selectedCategory === "ALL" ? "active" : ""}`}
                onClick={() => setSelectedCategory("ALL")}
              >
                <span>✨ Todos</span>
                <span className="filter-pill-count">{posts.length}</span>
              </button>

              {categories.map((c) => {
                const count = categoryCounts[c.value] || 0;
                return (
                  <button
                    key={c.value}
                    type="button"
                    className={`filter-pill ${selectedCategory === c.value ? "active" : ""}`}
                    onClick={() => setSelectedCategory(c.value)}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                    <span className="filter-pill-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================
              GRID PRINCIPAL DO FEED COM SIDEBAR RADAR UERJ
             ======================================================== */}
          <div className="feed-main-layout">

            {/* Coluna Principal: Feed de Postagens */}
            <main className="feed-stream">
              {isLoading ? (
                <div className="feed-loading" role="status" style={{ padding: "40px", textAlign: "center" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
                  <h3 style={{ margin: 0 }}>Sintonizando as fofocas da UERJ...</h3>
                  <p style={{ color: "#777", fontSize: "13px", marginTop: "6px" }}>Buscando as últimas bombas do Maracanã.</p>
                </div>
              ) : filteredAndSortedPosts.length === 0 ? (
                <div className="profile-empty-state">
                  <div className="profile-empty-icon">🤫</div>
                  <h3>
                    {posts.length === 0
                      ? "Ainda não há nenhuma publicação no Gossip UERJ!"
                      : "Nenhuma fofoca encontrada para essa pesquisa."}
                  </h3>
                  <p>
                    {posts.length === 0
                      ? "Seja o primeiro a soltar um babado anônimo no campus preenchendo a caixa acima!"
                      : "Tente limpar os filtros ou pesquisar por outros termos como 'elevador' ou 'bandejão'."}
                  </p>
                  {(searchQuery || selectedCategory !== "ALL") && (
                    <button
                      type="button"
                      className="pink-button"
                      style={{ maxWidth: "220px", marginTop: "14px" }}
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("ALL");
                      }}
                    >
                      LIMPAR FILTROS
                    </button>
                  )}
                </div>
              ) : (
                filteredAndSortedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    categoryLabel={categoryLabels[post.category] ?? post.category}
                    isMyPost={myPostIds.has(post.id)}
                    onDelete={handleDelete}
                    isDeleting={deletingPostId === post.id}
                    onError={setError}
                  />
                ))
              )}
            </main>

            {/* Botão Carregar Mais Fofocas */}
            {hasMore && !isLoading && (
              <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
                <button
                  type="button"
                  className="pink-button"
                  onClick={loadMorePosts}
                  disabled={isLoadingMore}
                  style={{ margin: 0, width: "auto", minWidth: "220px", fontSize: "13px" }}
                >
                  {isLoadingMore ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span className="loading-spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
                      Carregando...
                    </span>
                  ) : (
                    "📜 Carregar mais fofocas"
                  )}
                </button>
              </div>
            )}

            {/* Coluna Lateral: Radar do Campus UERJ */}
            <aside className="campus-sidebar">

              <UerjBuildingSidebar userCourse={userCrushCourse} posts={posts} crushes={buildingCrushes} />


              {/* CARD 2: Estatuto do Fofoqueiro UERJ */}
              <div className="sidebar-card">
                <div className="sidebar-card-title">
                  <strong>📜 ESTATUTO DO CAMPUS</strong>
                  <span>REGRAS</span>
                </div>
                <div className="rules-list">
                  <div className="rule-point">
                    <strong>1. 100% Anônimo:</strong> O sigilo da sua identidade é sagrado.
                  </div>
                  <div className="rule-point">
                    <strong>2. Respeito Mútuo:</strong> Fofoca universitária saudável, sem ofensas gratuitas.
                  </div>
                  <div className="rule-point">
                    <strong>3. Verdade no Bandejão:</strong> Se o suco for de caju, avise a galera com antecedência.
                  </div>
                </div>
              </div>

              {/* CARD 3: Atalhos Rápidos */}
              <div className="sidebar-card">
                <div className="sidebar-card-title">
                  <strong>🚀 ATALHOS RÁPIDOS</strong>
                  <span>HUB</span>
                </div>
                <Link className="sidebar-shortcut-btn" href="/crushes">
                  <span>💘 Galeria de Crushes</span>
                  <span>→</span>
                </Link>
                <Link className="sidebar-shortcut-btn" href="/vendas">
                  <span>🛍️ Desapegos & Vendas</span>
                  <span>→</span>
                </Link>
                <Link className="sidebar-shortcut-btn" href="/eventos">
                  <span>📅 Calendário de Festas</span>
                  <span>→</span>
                </Link>
                <Link className="sidebar-shortcut-btn" href="/grupos">
                  <span>👥 Grupos de WhatsApp</span>
                  <span>→</span>
                </Link>
                <Link className="sidebar-shortcut-btn" href="/como-usar">
                  <span>📖 Como usar o site</span>
                  <span>→</span>
                </Link>
              </div>

            </aside>
          </div>

        </div>
      </section>

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


