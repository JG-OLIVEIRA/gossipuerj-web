"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  ApiError,
  CrushRequest,
  CrushResponse,
  Gender,
  MatchResponse,
  Orientation,
} from "../../lib/api";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { UERJ_COURSES_BY_AREA } from "../../lib/uerj-courses";

function getPrivatePhotoUrl(photoUrl: string): string {
  return `/api/upload?url=${encodeURIComponent(photoUrl)}`;
}

function getCrushErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 401 || error.status === 403) return "Sua sessão expirou. Entre novamente para continuar.";
  if (error.status === 409) return "Você já possui um perfil de Crush.";
  if (error.status >= 500) return "O servidor está indisponível. Tente novamente em instantes.";
  return fallback;
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

export default function CrushesPage() {
  const [crushes, setCrushes] = useState<CrushResponse[]>([]);
  const [receivedMatches, setReceivedMatches] = useState<MatchResponse[]>([]);
  const [discardedCrushIds, setDiscardedCrushIds] = useState<Set<string>>(new Set());
  const [myCrushId, setMyCrushId] = useState<string | null>(null);
  const [myCrushPhotoUrl, setMyCrushPhotoUrl] = useState<string | null>(null);
  const [deckIndex, setDeckIndex] = useState(0);

  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gallery" | "received">("gallery");
  const [accessState, setAccessState] = useState<"loading" | "unauthenticated" | "no-crush" | "ready">("loading");

  const [isLoadingCrushes, setIsLoadingCrushes] = useState(true);
  const [crushError, setCrushError] = useState("");
  const [matchingCrushId, setMatchingCrushId] = useState<string | null>(null);
  const [revealedInstagram, setRevealedInstagram] = useState<string | null>(null);
  const [isDeletingCrush, setIsDeletingCrush] = useState(false);

  // Modal de cadastro de perfil
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModalCourse, setSelectedModalCourse] = useState("");
  const [customCourseName, setCustomCourseName] = useState("");
  const [isSubmittingCrush, setIsSubmittingCrush] = useState(false);
  const [modalError, setModalError] = useState("");

  // Upload de Foto via @vercel/blob
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  function resetModalForm() {
    setSelectedModalCourse("");
    setCustomCourseName("");
    setPhotoUrl("");
    setPhotoPreview(null);
    setIsUploadingPhoto(false);
    setUploadSuccessMessage("");
    setModalError("");
  }

  async function uploadToVercelBlob(file: File) {
    if (!file.type.startsWith("image/")) {
      setModalError("Selecione um arquivo de imagem válido (PNG, JPG, WEBP, etc).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setModalError("A imagem deve ter no máximo 5MB.");
      return;
    }

    setModalError("");
    setIsUploadingPhoto(true);
    setUploadSuccessMessage("");

    // Prévia visual imediata
    const localPreviewUrl = URL.createObjectURL(file);
    setPhotoPreview(localPreviewUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.missingToken) {
          setPhotoPreview(null);
          setModalError("BLOB_READ_WRITE_TOKEN não configurado no Vercel. O perfil só pode ser criado após configurar o armazenamento de fotos.");
          return;
        }
        throw new Error(data.error || "Erro no upload da foto.");
      }

      setPhotoUrl(data.url);
      setPhotoPreview(getPrivatePhotoUrl(data.url));
      setUploadSuccessMessage("Foto armazenada com sucesso no Vercel Blob! ☁️");
    } catch (err: unknown) {
      console.error("Erro no upload:", err);
      setModalError("Não conseguimos enviar sua foto. Confira o arquivo e tente novamente.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  // Toast
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);

  function showToast(message: string, icon = "💘") {
    setToast({ message, icon });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }

  // Only users with an authenticated crush profile can enter the gallery.
  useEffect(() => {
    let active = true;

    async function initialize() {
      const savedToken = typeof window !== "undefined" ? localStorage.getItem("gossipuerj_token") : null;
      if (!active) return;
      setToken(savedToken);
      if (!savedToken) {
        setAccessState("unauthenticated");
        setIsLoadingCrushes(false);
        return;
      }
      setIsLoadingCrushes(true);
      setCrushError("");
      try {
        const myCrush = await api.getMyCrush(savedToken);
        setMyCrushId(myCrush.id);
        setMyCrushPhotoUrl(myCrush.photoUrl);
        const crushesPage = await api.getAllCrushes(0, 60, undefined, savedToken);

        if (!active) return;
        setCrushes(crushesPage?.content ?? []);
        setAccessState("ready");
      } catch (err: unknown) {
        if (active) {
          setCrushes([]);
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            setAccessState("unauthenticated");
          } else if (err instanceof ApiError && err.status === 404) {
            setAccessState("no-crush");
          } else {
            setCrushError(getCrushErrorMessage(err, "Não conseguimos carregar os Crushes agora."));
          }
        }
      } finally {
        if (active) setIsLoadingCrushes(false);
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, []);

  // Recarregar crushes manualmente
  async function reloadCrushes() {
    setIsLoadingCrushes(true);
    setCrushError("");
    try {
      const data = await api.getAllCrushes(0, 60, undefined, token || undefined);
      setCrushes(data?.content || []);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403 && !token) {
        setCrushError("AUTH_REQUIRED");
      } else {
        setCrushError(getCrushErrorMessage(err, "Não conseguimos carregar os Crushes agora."));
      }
      setCrushes([]);
    } finally {
      setIsLoadingCrushes(false);
    }
  }

  // Carregar Matches do usuário se autenticado
  useEffect(() => {
    if (!token) return;
    let active = true;

    async function loadMatches() {
      try {
        const [sentRes, receivedRes] = await Promise.allSettled([
          api.getSentMatches(token!),
          api.getReceivedMatches(token!),
        ]);

        if (!active) return;

        if (receivedRes.status === "fulfilled" && receivedRes.value?.content) {
          setReceivedMatches(receivedRes.value.content);
        }

        const acceptedMatches = [
          ...(sentRes.status === "fulfilled" ? sentRes.value.content : []),
          ...(receivedRes.status === "fulfilled" ? receivedRes.value.content : []),
        ].filter((match) => match.status === "ACCEPTED");
        const instagramUsername = acceptedMatches[0]?.likedCrush?.user?.username || acceptedMatches[0]?.crush?.user?.username;
        if (instagramUsername) setRevealedInstagram(instagramUsername.replace(/^@/, ""));
      } catch {
        // Ignora falhas de match se servidor estiver frio
      } finally {
        // Matches remain intentionally hidden behind the curiosity panel.
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

    setMatchingCrushId(crush.id);
    try {
      const match = await api.createMatch(token, crush.id);
      setDiscardedCrushIds((prev) => new Set([...prev, crush.id]));
      setDeckIndex((prev) => prev + 1);
      const matchedProfile = match.likedCrush || match.crush;
      const instagramUsername = matchedProfile?.user?.username;
      if (match.status === "ACCEPTED" && instagramUsername) {
        setRevealedInstagram(instagramUsername.replace(/^@/, ""));
        showToast("Deu match! O Instagram foi liberado.", "💖");
      } else {
        showToast("Interesse enviado! Se for recíproco, o Instagram será liberado.", "🎉");
      }
    } catch (err) {
      showToast(getCrushErrorMessage(err, "Não foi possível enviar o interesse."), "⚠️");
    } finally {
      setMatchingCrushId(null);
    }
  }

  function handleDiscardCrush(crushId: string) {
    setDiscardedCrushIds((prev) => new Set([...prev, crushId]));
    setDeckIndex((prev) => prev + 1);
  }


  // Ação: Criar Perfil de Crush
  async function handleCreateCrush(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setModalError("Faça login para cadastrar seu perfil de crush.");
      return;
    }

    if (isUploadingPhoto) {
      setModalError("Aguarde a finalização do upload da foto no Vercel Blob.");
      return;
    }

    setIsSubmittingCrush(true);
    setModalError("");
    const form = new FormData(e.currentTarget);

    const formCourse = String(form.get("courseName") ?? "").trim();
    const formCustomCourse = String(form.get("customCourseName") ?? "").trim();
    const resolvedCourseName = formCourse === "__OTHER__" ? formCustomCourse : (formCourse || selectedModalCourse);
    const resolvedPhotoUrl = (photoUrl || String(form.get("photoUrl") ?? "")).trim();

    const payload: CrushRequest = {
      photoUrl: resolvedPhotoUrl,
      courseName: resolvedCourseName,
      description: String(form.get("description") ?? "").trim(),
      gender: String(form.get("gender") ?? "OTHER") as Gender,
      orientation: String(form.get("orientation") ?? "BISEXUAL") as Orientation,
    };

    if (!payload.photoUrl || !payload.courseName || !payload.description) {
      setModalError("Por favor escolha uma foto, selecione seu curso da UERJ e preencha os campos obrigatórios.");
      setIsSubmittingCrush(false);
      return;
    }

    try {
      const newCrush = await api.createCrush(token, payload);
      setCrushes((prev) => [newCrush, ...prev]);
      setMyCrushId(newCrush.id);
      setMyCrushPhotoUrl(newCrush.photoUrl);
      setAccessState("ready");
      resetModalForm();
      setIsModalOpen(false);
      showToast("Seu perfil de Crush foi publicado na vitrine da UERJ!", "✨");
    } catch (err) {
      setModalError(getCrushErrorMessage(err, "Não foi possível publicar seu perfil. Confira os dados e tente novamente."));
    } finally {
      setIsSubmittingCrush(false);
    }
  }

  async function handleDeleteCrush() {
    if (!token || !myCrushId || isDeletingCrush) return;
    if (!window.confirm("Apagar seu perfil de Crush e sua foto permanentemente?")) return;

    setIsDeletingCrush(true);
    try {
      await api.deleteCrush(token, myCrushId);
      if (myCrushPhotoUrl) {
        const blobResponse = await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ url: myCrushPhotoUrl }),
        });
        if (!blobResponse.ok) {
          throw new Error("O perfil foi apagado, mas não foi possível remover a foto do Blob.");
        }
      }
      setMyCrushId(null);
      setMyCrushPhotoUrl(null);
      setCrushes([]);
      setAccessState("no-crush");
      showToast("Perfil e foto apagados.", "🗑️");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Não foi possível apagar seu perfil.", "⚠️");
    } finally {
      setIsDeletingCrush(false);
    }
  }

  // Filtros aplicados
  const deckCrushes = crushes.filter((crush) => crush.id !== myCrushId && !discardedCrushIds.has(crush.id));
  const activeCrush = deckCrushes[deckIndex];

  const pendingReceivedCount = receivedMatches.filter((m) => m.status === "PENDING").length;

  if (accessState !== "ready") {
    const isUnauthenticated = accessState === "unauthenticated";
    return (
      <div className="site-shell">
        <SiteHeader active="crushes" authenticated={Boolean(token)} />
        <main className="pink-page inner-page">
          <div className="crush-access-card">
            <div className="crush-access-icon">{isUnauthenticated ? "🔒" : "💘"}</div>
            <h1>{accessState === "loading" ? "Abrindo a área de Crushes..." : isUnauthenticated ? "Entre para acessar os Crushes" : "Crie seu perfil de Crush primeiro"}</h1>
            <p>
              {accessState === "loading"
                ? "Só um instante..."
                : isUnauthenticated
                ? "A galeria é exclusiva para estudantes logados que também têm um perfil de Crush."
                : "Para ver perfis e enviar curtidas, você precisa publicar seu próprio perfil de Crush."}
            </p>
            {isUnauthenticated ? (
              <Link className="create-crush-btn" href="/login">
                ENTRAR AGORA
              </Link>
            ) : accessState === "no-crush" ? (
              <form className="crush-inline-form" onSubmit={handleCreateCrush}>
                {modalError && <p className="form-error" role="alert">{modalError}</p>}
                <label className="crush-file-field">
                  Foto do perfil
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPhoto}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadToVercelBlob(file);
                    }}
                  />
                </label>
                <label>
                  Seu curso na UERJ
                  <select name="courseName" defaultValue="" required>
                    <option value="" disabled>Selecione seu curso...</option>
                    {Object.entries(UERJ_COURSES_BY_AREA).map(([area, courseList]) => (
                      <optgroup key={area} label={`Área: ${area}`}>
                        {courseList.map((course) => <option key={course} value={course}>{course}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label>
                  Uma descrição sobre você
                  <textarea name="description" placeholder="Ex: Sempre no pilotis depois da aula..." required />
                </label>
                <div className="crush-inline-form-row">
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
                <button type="submit" className="create-crush-btn" disabled={isSubmittingCrush || isUploadingPhoto}>
                  {isUploadingPhoto ? "ENVIANDO FOTO..." : isSubmittingCrush ? "PUBLICANDO..." : "PUBLICAR MEU PERFIL"}
                </button>
              </form>
            ) : null}
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

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

          {/* Navegação entre galeria e matches recebidos */}
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

            </div>
            <button
              type="button"
              className="delete-crush-btn"
              onClick={() => void handleDeleteCrush()}
              disabled={isDeletingCrush}
            >
              {isDeletingCrush ? "APAGANDO..." : "🗑️ APAGAR MEU PERFIL"}
            </button>
          </div>

          {/* ABA 1: GALERIA DE CRUSHES */}
          {activeTab === "gallery" && (
            <div className="crush-deck-area">
              {isLoadingCrushes ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "40px", textAlign: "center" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
                  <p style={{ fontWeight: 800, margin: 0 }}>Carregando os crushes da UERJ...</p>
                </div>
              ) : crushError ? (
                <div style={{ background: "#fff", border: "4px solid var(--ink)", padding: "40px 24px", textAlign: "center", boxShadow: "4px 4px 0 var(--ink)" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
                  <h3 style={{ fontSize: "20px", fontWeight: 900, margin: "0 0 6px" }}>Erro ao carregar crushes</h3>
                  <p style={{ color: "#666", fontSize: "14px", margin: "0 0 16px" }}>
                    {crushError}
                  </p>
                  <button type="button" className="create-crush-btn" onClick={() => reloadCrushes()}>
                    Tentar Novamente
                  </button>
                </div>
              ) : activeCrush ? (
                <div className="crush-deck">
                      <div className="crush-card-modern tinder-card">
                        <div className="crush-card-photo-wrap">
                          {activeCrush.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={getPrivatePhotoUrl(activeCrush.photoUrl)}
                              alt={activeCrush.courseName ? `Crush de ${activeCrush.courseName}` : "Crush da UERJ"}
                              className="crush-card-img"
                              onError={(e) => {
                                // Fallback visual limpo se imagem quebrar
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="crush-card-avatar-fallback" style={{ background: "var(--yellow)" }}>
                              {(activeCrush.courseName?.charAt(0) || "U").toUpperCase()}
                            </div>
                          )}
                          {activeCrush.courseName && (
                            <span className="crush-card-course-badge">
                              {activeCrush.courseName}
                            </span>
                          )}
                        </div>

                        <div className="crush-card-body">
                          <div className="crush-card-tags">
                            {activeCrush.gender && (
                              <span className="crush-tag gender">
                                {genderLabels[activeCrush.gender] || activeCrush.gender}
                              </span>
                            )}
                            {activeCrush.orientation && (
                              <span className="crush-tag orientation">
                                {orientationLabels[activeCrush.orientation] || activeCrush.orientation}
                              </span>
                            )}
                          </div>

                          <p className="crush-card-desc">
                            &ldquo;{activeCrush.description}&rdquo;
                          </p>

                          <p className="crush-instagram-note">
                            📸 O username exibido aqui é o @ do Instagram. Ele só fica disponível depois do match.
                          </p>

                          <div className="crush-deck-actions">
                            <button type="button" className="crush-discard-btn" onClick={() => handleDiscardCrush(activeCrush.id)} aria-label="Descartar perfil">
                              ✕ <span>DESCARTAR</span>
                            </button>
                            <button type="button" className="crush-like-btn" disabled={matchingCrushId === activeCrush.id} onClick={() => handleSendMatch(activeCrush)} aria-label="Curtir perfil">
                              {matchingCrushId === activeCrush.id ? "..." : "♥"} <span>CURTIR</span>
                            </button>
                          </div>
                        </div>
                      </div>
                </div>
              ) : (
                <div className="crush-empty-state">
                  <div>✨</div>
                  <h3>Você viu tudo por enquanto!</h3>
                  <p>Novos perfis podem aparecer a qualquer momento. Volte depois para continuar a descobrir.</p>
                </div>
              )}
              {revealedInstagram && (
                <div className="crush-instagram-reveal">
                  <span>💖 MATCH CONFIRMADO</span>
                  <strong>O Instagram foi liberado:</strong>
                  <a href={`https://instagram.com/${encodeURIComponent(revealedInstagram)}`} target="_blank" rel="noreferrer">
                    @{revealedInstagram} ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: MATCHES RECEBIDOS */}
          {activeTab === "received" && (
            <div className="matches-list">
              <div className="received-matches-teaser">
                <div className="received-matches-blur" aria-hidden="true">
                  {receivedMatches.length > 0 ? receivedMatches.slice(0, 3).map((match) => (
                    <div key={match.id} className="received-match-silhouette">💘 &nbsp; alguém curtiu seu perfil</div>
                  )) : <div className="received-match-silhouette">💘 &nbsp; alguém pode estar te esperando</div>}
                </div>
                <div className="received-matches-overlay">
                  <span>👀</span>
                  <strong>Tem gente curiosa sobre você...</strong>
                  <small>Continue curtindo para descobrir quem deu match.</small>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL: CADASTRAR PERFIL DE CRUSH */}
      {isModalOpen && (
        <div
          className="crush-modal-backdrop"
          onClick={() => {
            if (!isSubmittingCrush && !isUploadingPhoto) {
              resetModalForm();
              setIsModalOpen(false);
            }
          }}
        >
          <div className="crush-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="crush-modal-close"
              onClick={() => {
                resetModalForm();
                setIsModalOpen(false);
              }}
              disabled={isSubmittingCrush || isUploadingPhoto}
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
              {/* Seletor e Upload da Foto com @vercel/blob */}
              <div className="crush-photo-uploader-section">
                <label style={{ marginBottom: "6px" }}>Foto do Perfil *</label>
                
                <div
                    className={`crush-dropzone ${isDragOver ? "drag-over" : ""} ${photoPreview ? "has-file" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) uploadToVercelBlob(file);
                    }}
                  >
                    {photoPreview ? (
                      <div className="crush-photo-preview-container">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoPreview} alt="Prévia da foto" className="crush-photo-preview-img" />
                        <div className="crush-photo-preview-meta">
                          {isUploadingPhoto ? (
                            <span className="crush-upload-status uploading">
                              Salvando no Vercel Blob... ⏳
                            </span>
                          ) : uploadSuccessMessage ? (
                            <span className="crush-upload-status success">
                              {uploadSuccessMessage}
                            </span>
                          ) : (
                            <span className="crush-upload-status ready">Foto carregada</span>
                          )}
                          <label className="crush-change-photo-btn">
                            Trocar foto
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingPhoto}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadToVercelBlob(f);
                              }}
                              style={{ display: "none" }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="crush-dropzone-inner">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingPhoto}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadToVercelBlob(f);
                          }}
                          style={{ display: "none" }}
                        />
                        <span className="crush-dropzone-icon">📷</span>
                        <span className="crush-dropzone-text">
                          <strong>Clique para selecionar</strong> ou arraste sua foto aqui
                        </span>
                        <span className="crush-dropzone-hint">
                          Armazenamento em nuvem via @vercel/blob (PNG, JPG, WEBP até 5MB)
                        </span>
                      </label>
                    )}
                </div>
                <input type="hidden" name="photoUrl" value={photoUrl} />
              </div>

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
