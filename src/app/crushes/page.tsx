"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  api,
  ApiError,
  CrushRequest,
  CrushResponse,
  Gender,
  MatchResponse,
  Orientation,
  UserResponse,
} from "../../lib/api";
import { ALL_UERJ_COURSES } from "../../lib/uerj-courses";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

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

function normalizeInstagramUsername(value?: string | null): string {
  return (value ?? "").replace(/^@/, "").trim().toLowerCase();
}

function getMatchInstagramUsername(match: MatchResponse | null | undefined, currentUsername?: string | null): string | null {
  if (!match) return null;

  const candidates = [match.crush?.user?.username, match.likedCrush?.user?.username].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  const normalizedCurrentUsername = normalizeInstagramUsername(currentUsername);
  const selectedCandidate = candidates.find(
    (username) => normalizeInstagramUsername(username) !== normalizedCurrentUsername
  );

  const finalUsername = selectedCandidate ?? candidates[0];
  return finalUsername ? finalUsername.replace(/^@/, "") : null;
}

function getMatchProfile(match: MatchResponse, myCrushId?: string | null): CrushResponse | null {
  const selectedProfile =
    (match.crush && match.crush.id !== myCrushId ? match.crush : null) ??
    match.likedCrush ??
    match.crush ??
    null;

  if (!selectedProfile) return null;

  return {
    id: selectedProfile.id,
    photoUrl: selectedProfile.photoUrl ?? "",
    description: selectedProfile.description ?? "",
    gender: selectedProfile.gender ?? "OTHER",
    orientation: selectedProfile.orientation ?? "BISEXUAL",
    courseName: selectedProfile.course?.name ?? selectedProfile.user?.course?.name,
  };
}

function getMatchCrushIds(matches: MatchResponse[]): Set<string> {
  return new Set(
    matches.flatMap((match) =>
      [match.crush?.id, match.likedCrush?.id].filter((crushId): crushId is string => Boolean(crushId))
    )
  );
}

function getVisibleCrushes(crushes: CrushResponse[], myCrushId: string): CrushResponse[] {
  return crushes.filter((crush) => crush.id !== myCrushId);
}

const genderLabels: Record<Gender, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  TRANSGENDER: "Transgênero",
  NON_BINARY: "Não-binário",
  OTHER: "Outro",
};

const genderIcons: Record<Gender, string> = {
  MALE: "👨",
  FEMALE: "👩",
  TRANSGENDER: "⚧️",
  NON_BINARY: "🧑",
  OTHER: "✨",
};

const orientationLabels: Record<Orientation, string> = {
  HETEROSEXUAL: "Heterossexual",
  HOMOSEXUAL: "Homossexual",
  BISEXUAL: "Bissexual",
  ASEXUAL: "Assexual",
  PANSEXUAL: "Pansexual",
};

const orientationIcons: Record<Orientation, string> = {
  HETEROSEXUAL: "👫",
  HOMOSEXUAL: "👬",
  BISEXUAL: "🌈",
  ASEXUAL: "💜",
  PANSEXUAL: "💖",
};

export default function CrushesPage() {
  const [crushes, setCrushes] = useState<CrushResponse[]>([]);
  const [sentMatches, setSentMatches] = useState<MatchResponse[]>([]);
  const [receivedMatches, setReceivedMatches] = useState<MatchResponse[]>([]);
  const [myCrush, setMyCrush] = useState<CrushResponse | null>(null);
  const [myCrushId, setMyCrushId] = useState<string | null>(null);
  const [myCrushPhotoUrl, setMyCrushPhotoUrl] = useState<string | null>(null);
  // Filtros da Galeria
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [orientationFilter, setOrientationFilter] = useState<string>("ALL");
  const [genderFilter, setGenderFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "MATCHES">("ALL");
  const [rejectedCrushIds, setRejectedCrushIds] = useState<Set<string>>(new Set());

  const [token, setToken] = useState<string | null>(null);
  const [accountProfile, setAccountProfile] = useState<UserResponse | null>(null);
  const [accessState, setAccessState] = useState<"loading" | "unauthenticated" | "no-crush" | "ready">("loading");

  const [isLoadingCrushes, setIsLoadingCrushes] = useState(true);
  const [crushError, setCrushError] = useState("");
  const [matchingCrushId, setMatchingCrushId] = useState<string | null>(null);
  const [isDeletingCrush, setIsDeletingCrush] = useState(false);
  const crushAccountIdentity = `${accountProfile?.email ?? ""}|${accountProfile?.username ?? ""}`;

  // Modal de cadastro de perfil
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingCrush, setIsEditingCrush] = useState(false);
  const [isSubmittingCrush, setIsSubmittingCrush] = useState(false);
  const [modalError, setModalError] = useState("");

  // Upload de Foto via @vercel/blob
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  function resetModalForm() {
    setPhotoUrl("");
    setPhotoPreview(null);
    setIsUploadingPhoto(false);
    setUploadSuccessMessage("");
    setModalError("");
    setIsEditingCrush(false);
  }

  function openEditCrushModal() {
    if (!myCrush) return;
    setIsEditingCrush(true);
    setPhotoUrl(myCrush.photoUrl || "");
    setPhotoPreview(myCrush.photoUrl ? getPrivatePhotoUrl(myCrush.photoUrl) : null);
    setUploadSuccessMessage("");
    setModalError("");
    setIsModalOpen(true);
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

  // Qualquer usuário autenticado pode ver a galeria — perfil próprio é opcional.
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
        try {
          const account = await api.me(savedToken);
          if (active) setAccountProfile(account);
        } catch {
          const savedEmail = localStorage.getItem("gossipuerj_email") ?? "";
          if (active && savedEmail) setAccountProfile({ email: savedEmail, username: savedEmail.split("@")[0] });
        }

        // Tenta carregar perfil próprio — OK se não existir ainda (404)
        let resolvedMyCrushId = "";
        try {
          const myCrush = await api.getMyCrush(savedToken);
          resolvedMyCrushId = myCrush.id;
          setMyCrush(myCrush);
          setMyCrushId(myCrush.id);
          setMyCrushPhotoUrl(myCrush.photoUrl);
        } catch (profileErr) {
          if (!(profileErr instanceof ApiError && profileErr.status === 404)) {
            throw profileErr;
          }
          // 404 = sem perfil ainda, continua normalmente
        }

        const [crushesPage, rejectedMatchesPage] = await Promise.all([
          api.getAllCrushes(0, 60, undefined, savedToken),
          api.getRejectedMatches(savedToken),
        ]);

        if (!active) return;

        const rejectedIds = getMatchCrushIds(rejectedMatchesPage?.content ?? []);
        setRejectedCrushIds(rejectedIds);

        const visibleCrushes = getVisibleCrushes(
          crushesPage?.content ?? [],
          resolvedMyCrushId
        );

        setCrushes(visibleCrushes);
        setAccessState("ready");
      } catch (err: unknown) {
        if (active) {
          setCrushes([]);
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            setAccessState("unauthenticated");
          } else {
            setCrushError(getCrushErrorMessage(err, "Não conseguimos carregar os Crushes agora."));
            setAccessState("ready"); // mostra galeria mesmo com erro parcial
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
      if (!token) {
        setCrushes([]);
        return;
      }

      const [data, rejectedMatchesPage] = await Promise.all([
        api.getAllCrushes(0, 60, undefined, token),
        api.getRejectedMatches(token),
      ]);
      const rejectedIds = getMatchCrushIds(rejectedMatchesPage?.content ?? []);
      setRejectedCrushIds(rejectedIds);

      const visibleCrushes = getVisibleCrushes(
        data?.content ?? [],
        myCrushId ?? ""
      );

      setCrushes(visibleCrushes);
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

        const receivedMatchesContent = receivedRes.status === "fulfilled" ? (receivedRes.value?.content ?? []) : [];
        const sentMatchesContent = sentRes.status === "fulfilled" ? (sentRes.value?.content ?? []) : [];

        setReceivedMatches(receivedMatchesContent);

        if (sentRes.status === "fulfilled" && sentRes.value?.content) {
          setSentMatches(sentMatchesContent);
        }

        const acceptedMatches = [
          ...(sentRes.status === "fulfilled" ? sentRes.value.content : []),
          ...(receivedRes.status === "fulfilled" ? receivedRes.value.content : []),
        ].filter((match) => match.status === "ACCEPTED");

        const currentUsername = crushAccountIdentity.split("|")[1] ||
          (typeof window !== "undefined" ? localStorage.getItem("gossipuerj_email")?.split("@")[0] ?? null : null);
        const instagramUsername = getMatchInstagramUsername(acceptedMatches[0] ?? null, currentUsername);
        if (instagramUsername) {
          // Sem banner na galeria: a revelação acontece somente na aba de matches aceitos.
        }
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
  }, [token, crushAccountIdentity]);

  // Ação: Demonstrar Interesse / Match
  async function handleSendMatch(crush: CrushResponse) {
    if (!token) {
      showToast("Entre na sua conta para demonstrar interesse!", "🔒");
      return;
    }

    setMatchingCrushId(crush.id);
    try {
      const match = await api.createMatch(token, crush.id);
      setRejectedCrushIds((prev) => {
        const next = new Set(prev);
        next.delete(crush.id);
        return next;
      });

      const currentUsername = accountProfile?.username ??
        (typeof window !== "undefined" ? localStorage.getItem("gossipuerj_email")?.split("@")[0] ?? null : null);
      const instagramUsername = getMatchInstagramUsername(match, currentUsername);
      if (match.status === "ACCEPTED") {
        setReceivedMatches((prev) => [match, ...prev.filter((m) => m.id !== match.id)]);
        if (instagramUsername) {
          showToast(`Deu match! O Instagram @${instagramUsername} foi revelado!`, "💖");
        } else {
          showToast("Deu match! O Instagram foi liberado.", "💖");
        }
      } else {
        setSentMatches((prev) => [match, ...prev.filter((m) => m.id !== match.id)]);
        showToast("Interesse enviado! Se for recíproco, o match acontece.", "🎉");
      }
    } catch (err) {
      showToast(getCrushErrorMessage(err, "Não foi possível enviar o interesse."), "⚠️");
    } finally {
      setMatchingCrushId(null);
    }
  }

  async function handleDiscardCrush(crushId: string) {
    if (!token) return;

    try {
      await api.createMatch(token, crushId, "REJECTED");
      setRejectedCrushIds((prev) => new Set([...prev, crushId]));
      showToast("Marcado como passado. Ele continua visível na galeria!", "✕");
    } catch (err) {
      showToast(getCrushErrorMessage(err, "Não foi possível registrar a ação."), "⚠️");
    }
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

    const resolvedPhotoUrl = (photoUrl || String(form.get("photoUrl") ?? "")).trim();

    const payload: CrushRequest = {
      photoUrl: resolvedPhotoUrl,
      description: String(form.get("description") ?? "").trim(),
      gender: String(form.get("gender") ?? "OTHER") as Gender,
      orientation: String(form.get("orientation") ?? "BISEXUAL") as Orientation,
    };

    if (!payload.photoUrl || !payload.description) {
      setModalError("Por favor escolha uma foto e preencha a descrição do seu perfil.");
      setIsSubmittingCrush(false);
      return;
    }

    try {
      const savedCrush = isEditingCrush
        ? await api.updateCrush(token, payload)
        : await api.createCrush(token, payload);
      setCrushes((prev) => isEditingCrush
        ? prev.map((crush) => (crush.id === savedCrush.id ? savedCrush : crush))
        : [savedCrush, ...prev]);
      setMyCrushId(savedCrush.id);
      setMyCrush(savedCrush);
      setMyCrushPhotoUrl(savedCrush.photoUrl);
      const crushesPage = await api.getAllCrushes(0, 60, undefined, token);
      setCrushes(crushesPage?.content ?? []);
      setAccessState("ready");
      const wasEditingCrush = isEditingCrush;
      resetModalForm();
      setIsModalOpen(false);
      showToast(wasEditingCrush ? "Seu perfil de Crush foi atualizado!" : "Seu perfil de Crush foi publicado na vitrine da UERJ!", "✨");
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
      setSentMatches([]);
      setReceivedMatches([]);
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

  function getCrushInteraction(crushId: string) {
    const acceptedMatch = [...sentMatches, ...receivedMatches].find(
      (m) =>
        m.status === "ACCEPTED" &&
        (m.crush?.id === crushId || m.likedCrush?.id === crushId)
    );
    if (acceptedMatch) {
      const currentUsername =
        accountProfile?.username ??
        (typeof window !== "undefined"
          ? localStorage.getItem("gossipuerj_email")?.split("@")[0] ?? null
          : null);
      const instagramUsername = getMatchInstagramUsername(acceptedMatch, currentUsername);
      return { status: "ACCEPTED" as const, match: acceptedMatch, instagramUsername };
    }

    const pendingSent = sentMatches.find(
      (m) => m.status === "PENDING" && (m.crush?.id === crushId || m.likedCrush?.id === crushId)
    );
    if (pendingSent) {
      return { status: "PENDING_SENT" as const, match: pendingSent, instagramUsername: null };
    }

    const pendingReceived = receivedMatches.find(
      (m) => m.status === "PENDING" && (m.crush?.id === crushId || m.likedCrush?.id === crushId)
    );
    if (pendingReceived) {
      return { status: "PENDING_RECEIVED" as const, match: pendingReceived, instagramUsername: null };
    }

    if (rejectedCrushIds.has(crushId)) {
      return { status: "REJECTED" as const, match: undefined, instagramUsername: null };
    }

    return { status: "NONE" as const, match: undefined, instagramUsername: null };
  }

  const acceptedMatchCrushIds = useMemo(() => {
    return new Set(
      [...sentMatches, ...receivedMatches]
        .filter((match) => match.status === "ACCEPTED")
        .flatMap((match) => [match.crush?.id, match.likedCrush?.id])
        .filter((crushId): crushId is string => Boolean(crushId))
    );
  }, [sentMatches, receivedMatches]);

  // Galeria completa com TODOS os crushes da UERJ!
  const allGalleryCrushes = useMemo(() => {
    return crushes.filter((crush) => crush.id !== myCrushId);
  }, [crushes, myCrushId]);

  // Contagem de estudantes por curso ativo na galeria
  const availableCoursesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allGalleryCrushes.forEach((c) => {
      if (c.courseName && c.courseName.trim()) {
        const name = c.courseName.trim();
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return counts;
  }, [allGalleryCrushes]);

  const filteredDeckCrushes = useMemo(() => {
    return allGalleryCrushes.filter((c) => {
      const matchesCourse =
        courseFilter === "ALL" ||
        !courseFilter ||
        Boolean(
          c.courseName &&
            (c.courseName.trim().toLowerCase() === courseFilter.trim().toLowerCase() ||
             c.courseName.toLowerCase().includes(courseFilter.toLowerCase()))
        );

      const matchesGender =
        genderFilter === "ALL" || c.gender === genderFilter;

      const matchesOrientation =
        orientationFilter === "ALL" || c.orientation === orientationFilter;

      const matchesStatus =
        statusFilter === "ALL" || (statusFilter === "MATCHES" && acceptedMatchCrushIds.has(c.id));

      return matchesCourse && matchesGender && matchesOrientation && matchesStatus;
    });
  }, [allGalleryCrushes, courseFilter, genderFilter, orientationFilter, statusFilter, acceptedMatchCrushIds]);

  const acceptedMatchesForMe = useMemo(() => {
    return [...sentMatches, ...receivedMatches].filter((match) => {
      if (match.status !== "ACCEPTED") return false;
      const participantIds = [match.crush?.id, match.likedCrush?.id].filter((id): id is string => Boolean(id));
      return participantIds.includes(myCrushId ?? "") || !myCrushId;
    });
  }, [sentMatches, receivedMatches, myCrushId]);

  const acceptedReceivedMatches = useMemo(() => {
    return acceptedMatchesForMe.filter((match) => {
      const profileIds = [match.crush?.id, match.likedCrush?.id].filter((id): id is string => Boolean(id));
      return profileIds.some((id) => id !== myCrushId);
    });
  }, [acceptedMatchesForMe, myCrushId]);

  if (accessState !== "ready") {
    const isUnauthenticated = accessState === "unauthenticated";

    if (isUnauthenticated) {
      return (
        <div className="site-shell">
          <SiteHeader active="crushes" authenticated={Boolean(token)} />
          <main className="pink-page inner-page">
            <div className="crush-public-landing">
              <div className="crush-public-hero">
                <div className="crush-public-hero-copy">
                  <span className="site-guide-kicker">A GALERIA DOS CRUSHES</span>
                  <h1>Descubra quem está dando match na UERJ.</h1>
                  <p>
                    A área de crushes reúne perfis de estudantes, interesses em comum e aquele toque de mistério que faz o campus ficar mais interessante.
                  </p>

                  <div className="feed-login-gate-actions">
                    <Link className="pink-button" href="/login">ENTRAR E VER PERFIS</Link>
                    <Link className="feed-login-guide-link" href="/como-usar">Como funciona?</Link>
                  </div>

                  <ul className="public-proof-list" aria-label="Destaques da galeria de crushes">
                    <li>💘 Perfis de estudantes da UERJ com visual e curiosidade</li>
                    <li>📸 Match com Instagram liberado só após interesse recíproco</li>
                    <li>🎯 Curiosidade real, sem exposição vazia e sem drama</li>
                  </ul>
                </div>

                <div className="crush-public-preview" aria-label="Pré-visualização da galeria de crushes">
                  <div className="crush-mock-card">
                    <div className="crush-mock-photo" />
                    <div className="crush-mock-body">
                      <div className="crush-mock-header">
                        <span className="crush-mock-course">Ciência da Computação</span>
                        <span className="crush-mock-badge">♥ Match</span>
                      </div>
                      <span className="crush-mock-bio-label">SOBRE MIM</span>
                      <h3>Sempre estou no pavilhão cedo e adoro uma boa conversa depois da aula.</h3>
                      <div className="crush-mock-tags">
                        <span>Feminino</span>
                        <span>Bissexual</span>
                      </div>
                      <button type="button" className="crush-public-card-btn" disabled>
                        ENTRAR PARA CURTIR
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="feature-showcase-grid">
                <article className="feature-showcase-card">
                             <span>Matches</span>
                  <h2>Sem pressão</h2>
                  <p>Você curte e decide se quer revelar o Instagram só quando houver match real.</p>
                </article>
                <article className="feature-showcase-card">
                  <div className="feature-icon">🎓</div>
                  <h2>Só da UERJ</h2>
                  <p>Perfis filtrados pelo ambiente universitário e pela energia do campus.</p>
                </article>
                <article className="feature-showcase-card">
                  <div className="feature-icon">🔒</div>
                  <h2>Mais discreto</h2>
                  <p>O contato só aparece quando o interesse é recíproco e confiável.</p>
                </article>
                <article className="feature-showcase-card">
                  <div className="feature-icon">✨</div>
                  <h2>Curiosidade em alta</h2>
                  <p>É a forma mais simples de descobrir se a química existe sem muita exposição.</p>
                </article>
              </div>

              <div className="feed-public-proof-bar">
                <span>O campus inteiro</span>
                <span>Perfis reais</span>
                <span>Match certeiro</span>
              </div>
            </div>
          </main>
          <SiteFooter />
        </div>
      );
    }
  }
  // Todos os estados que não são "ready" ou "unauthenticated" exibem a tela completa
  // O estado "loading" é tratado pelo isLoadingCrushes spinner dentro da galeria

  return (
    <div className="site-shell">
      <SiteHeader active="crushes" authenticated={Boolean(token)} />

      <main className="pink-page inner-page">
        <div className="crushes-container">
          {/* Hero Header Modernizado com Ação de Perfil */}
          <div className="crush-hero-banner">
            <div className="crush-hero-stamps">
              <span className="stamp-tag">🏛️ PAVILHÃO JOÃO LYRA</span>
              <span className="stamp-tag pink">🔒 INSTA APENAS NO MATCH</span>
              <span className="stamp-tag cyan">✦ 100% UERJ</span>
            </div>
            <h1 className="crush-hero-title">
              GALERIA DE <span>CRUSHES</span> DA UERJ
            </h1>
            <p className="crush-hero-subtitle">
              Todos os estudantes reunidos na vitrine do campus. Descubra quem estuda perto de você, veja todos os perfis e desbloqueie o @ do Instagram quando rolar química recíproca!
            </p>
            <div className="crush-hero-actions-bar">
              {myCrushId ? (
                <button type="button" className="crush-hero-profile-btn" onClick={openEditCrushModal}>
                  <span>✏️</span> <span>EDITAR MEU PERFIL DE CRUSH</span>
                </button>
              ) : (
                <button type="button" className="crush-hero-profile-btn" onClick={openEditCrushModal}>
                  <span>💘</span> <span>CADASTRAR MEU PERFIL DE CRUSH</span>
                </button>
              )}
            </div>
          </div>

          <div className="crush-gallery-section">
            {/* Toolbar: Filtros da Galeria */}
            <div className="crush-toolbar">
              {/* Seletores de Curso e Sexualidade */}
              <div className="crush-toolbar-bottom" style={{ borderTop: "none", paddingTop: 0 }}>
                <div className="crush-select-wrap">
                  <label htmlFor="crush-course-select" className="crush-select-label">
                    🏛️ Curso:
                  </label>
                  <select
                    id="crush-course-select"
                    className={`crush-filter-select ${courseFilter !== "ALL" ? "active" : ""}`}
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    aria-label="Filtrar por curso"
                  >
                    <option value="ALL">✨ Todos os Cursos</option>
                    {Object.keys(availableCoursesWithCounts).length > 0 && (
                      <optgroup label="Cursos com Estudantes no Campus">
                        {Object.entries(availableCoursesWithCounts)
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([name, count]) => (
                            <option key={`active-${name}`} value={name}>
                              {name} ({count} {count === 1 ? "crush" : "crushes"})
                            </option>
                          ))}
                      </optgroup>
                    )}
                    <optgroup label="Demais Cursos da UERJ">
                      {ALL_UERJ_COURSES.filter((name) => !availableCoursesWithCounts[name]).map((name) => (
                        <option key={`other-${name}`} value={name}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="crush-select-wrap">
                  <label htmlFor="crush-orientation-select" className="crush-select-label">
                    🌈 Sexualidade:
                  </label>
                  <select
                    id="crush-orientation-select"
                    className={`crush-filter-select ${orientationFilter !== "ALL" ? "active" : ""}`}
                    value={orientationFilter}
                    onChange={(e) => setOrientationFilter(e.target.value)}
                    aria-label="Filtrar por sexualidade"
                  >
                    <option value="ALL">🌈 Todas as Sexualidades</option>
                    <option value="HETEROSEXUAL">👫 Heterossexual</option>
                    <option value="HOMOSEXUAL">👬 Homossexual</option>
                    <option value="BISEXUAL">🌈 Bissexual</option>
                    <option value="PANSEXUAL">💖 Pansexual</option>
                    <option value="ASEXUAL">💜 Assexual</option>
                  </select>
                </div>

                {(courseFilter !== "ALL" || orientationFilter !== "ALL") && (
                  <button
                    type="button"
                    className="crush-clear-all-btn"
                    onClick={() => {
                      setCourseFilter("ALL");
                      setOrientationFilter("ALL");
                    }}
                    title="Limpar todos os filtros ativos"
                  >
                    <span>✕</span> <span>Limpar Filtros</span>
                  </button>
                )}
              </div>
            </div>

            {isLoadingCrushes ? (
              <div className="crush-loading-card">
                <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
                <p style={{ fontWeight: 800, margin: 0 }}>Carregando a galeria de crushes da UERJ...</p>
              </div>
            ) : crushError ? (
              <div className="crush-error-card">
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
                <h3 style={{ fontSize: "20px", fontWeight: 900, margin: "0 0 6px" }}>Erro ao carregar crushes</h3>
                <p style={{ color: "#666", fontSize: "14px", margin: "0 0 16px" }}>
                  {crushError}
                </p>
                <button type="button" className="create-crush-btn" onClick={() => reloadCrushes()}>
                  Tentar Novamente
                </button>
              </div>
            ) : statusFilter === "MATCHES" && acceptedReceivedMatches.length === 0 ? (
              <div className="crush-empty-state">
                <div className="crush-empty-icon">💖</div>
                <h3>Ainda sem matches confirmados</h3>
                <p>
                  Curta as pessoas que você achar interessantes na Galeria! Quando alguém curtir você de volta, o match confirmado e o Instagram liberado aparecem aqui.
                </p>
                <button
                  type="button"
                  className="create-crush-btn"
                  onClick={() => setStatusFilter("ALL")}
                >
                  Ver Todos os Crushes da UERJ
                </button>
              </div>
            ) : statusFilter === "MATCHES" && acceptedReceivedMatches.length > 0 ? (
              /* MODO POLAROID MATCHES */
              <div className="polaroid-matches-grid">
                {acceptedReceivedMatches.map((match) => {
                  const matchedProfile = getMatchProfile(match, myCrushId);
                  const instagramUsername = getMatchInstagramUsername(match, accountProfile?.username);

                  return (
                    <article key={match.id} className="polaroid-match-card">
                      <div className="polaroid-stamp">
                        <span>💖 MATCH CONFIRMADO!</span>
                      </div>

                      <div className="polaroid-frame">
                        <div className="polaroid-photo-wrap">
                          {matchedProfile?.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={getPrivatePhotoUrl(matchedProfile.photoUrl)}
                              alt="Foto do crush com match"
                              className="polaroid-img"
                            />
                          ) : (
                            <div className="polaroid-fallback">💘</div>
                          )}
                        </div>
                      </div>

                      <div className="polaroid-body">
                        {matchedProfile?.courseName && (
                          <span className="polaroid-course">
                            🏛️ {matchedProfile.courseName}
                          </span>
                        )}

                        <h3 className="polaroid-bio">
                          &ldquo;{matchedProfile?.description || "Alguém curtiu você!"}&rdquo;
                        </h3>

                        <div className="crush-hero-tags-row" style={{ justifyContent: "center" }}>
                          {matchedProfile?.gender && (
                            <span className="crush-tag-pill gender">
                              {genderIcons[matchedProfile.gender] || "👤"} {genderLabels[matchedProfile.gender] || matchedProfile.gender}
                            </span>
                          )}
                          {matchedProfile?.orientation && (
                            <span className="crush-tag-pill orientation">
                              {orientationIcons[matchedProfile.orientation] || "🌈"} {orientationLabels[matchedProfile.orientation] || matchedProfile.orientation}
                            </span>
                          )}
                        </div>

                        {instagramUsername ? (
                          <a
                            href={`https://instagram.com/${encodeURIComponent(instagramUsername)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="instagram-connect-btn"
                          >
                            <span className="insta-icon">📸</span>
                            <span>Abrir @{instagramUsername} no Instagram ↗</span>
                          </a>
                        ) : (
                          <div className="polaroid-pending-insta">
                            <span>🔒 Instagram em processamento</span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : filteredDeckCrushes.length === 0 ? (
              <div className="crush-empty-state">
                <div className="crush-empty-icon">💘</div>
                <h3>Nenhum crush encontrado por aqui!</h3>
                <p>
                  {courseFilter || genderFilter !== "ALL"
                    ? "Tente ajustar ou limpar os filtros de busca para ver mais estudantes da UERJ."
                    : "Ainda não há outros perfis cadastrados. Volte em breve!"}
                </p>
                {(courseFilter !== "ALL" || orientationFilter !== "ALL" || genderFilter !== "ALL" || statusFilter !== "ALL") && (
                  <button
                    type="button"
                    className="create-crush-btn"
                    onClick={() => {
                      setCourseFilter("ALL");
                      setOrientationFilter("ALL");
                      setGenderFilter("ALL");
                      setStatusFilter("ALL");
                    }}
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            ) : (
              /* MODO VITRINE PADRÃO (GRID SHOWCASE) COM TODOS OS CRUSHES */
              <div className="crush-grid-showcase">
                {filteredDeckCrushes.map((crush) => {
                  const interaction = getCrushInteraction(crush.id);
                  return (
                    <article key={crush.id} className="crush-grid-card">
                      <div className="crush-grid-photo-wrap">
                        {crush.photoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={getPrivatePhotoUrl(crush.photoUrl)}
                            alt={crush.courseName ? `Crush de ${crush.courseName}` : "Crush da UERJ"}
                            className="crush-grid-photo"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="crush-grid-fallback">
                            {(crush.courseName?.charAt(0) || "U").toUpperCase()}
                          </div>
                        )}

                        {/* Status Chip no topo da foto */}
                        {interaction.status === "ACCEPTED" && (
                          <span className="crush-grid-status-badge accepted">
                            💖 MATCH!
                          </span>
                        )}
                        {interaction.status === "PENDING_SENT" && (
                          <span className="crush-grid-status-badge pending">
                            ⏳ ENVIADO
                          </span>
                        )}
                        {interaction.status === "PENDING_RECEIVED" && (
                          <span className="crush-grid-status-badge received">
                            💘 CURTIU VOCÊ!
                          </span>
                        )}
                        {interaction.status === "REJECTED" && (
                          <span className="crush-grid-status-badge rejected">
                            ✕ NÃO ROLOU
                          </span>
                        )}

                        {crush.courseName && (
                          <span className="crush-grid-course-badge">
                            🏛️ {crush.courseName}
                          </span>
                        )}
                      </div>

                      <div className="crush-grid-body">
                        <div className="crush-grid-tags">
                          {crush.gender && (
                            <span className="crush-tag-pill mini gender">
                              {genderIcons[crush.gender] || "👤"} {genderLabels[crush.gender] || crush.gender}
                            </span>
                          )}
                          {crush.orientation && (
                            <span className="crush-tag-pill mini orientation">
                              {orientationIcons[crush.orientation] || "🌈"} {orientationLabels[crush.orientation] || crush.orientation}
                            </span>
                          )}
                        </div>

                        <p className="crush-grid-bio">&ldquo;{crush.description}&rdquo;</p>

                        {interaction.status === "ACCEPTED" && interaction.instagramUsername ? (
                          <a
                            href={`https://instagram.com/${encodeURIComponent(interaction.instagramUsername)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="instagram-connect-btn mini"
                          >
                            <span className="insta-icon">📸</span>
                            <span>@{interaction.instagramUsername} ↗</span>
                          </a>
                        ) : (
                          <div className="crush-grid-actions">
                            <button
                              type="button"
                              className="crush-grid-discard-btn"
                              onClick={() => handleDiscardCrush(crush.id)}
                              title="Passar perfil"
                            >
                              ✕ {interaction.status === "REJECTED" ? "Passado" : "Passar"}
                            </button>
                            <button
                              type="button"
                              className={`crush-grid-like-btn ${interaction.status === "PENDING_SENT" ? "pending" : ""}`}
                              disabled={matchingCrushId === crush.id}
                              onClick={() => handleSendMatch(crush)}
                              title="Dar match"
                            >
                              {matchingCrushId === crush.id
                                ? "⏳"
                                : interaction.status === "PENDING_RECEIVED"
                                ? "💘 MATCH DE VOLTA"
                                : interaction.status === "PENDING_SENT"
                                ? "⏳ ENVIADO"
                                : interaction.status === "REJECTED"
                                ? "💖 TENTAR NOVO"
                                : "💖 MATCH"}
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
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

            <div className="crush-modal-heading">
              <h2 className="crush-modal-title" style={{ margin: 0 }}>{isEditingCrush ? "Editar Perfil de Crush" : "Cadastrar Perfil de Crush"}</h2>
              {isEditingCrush && (
                <button
                  type="button"
                  className="delete-crush-btn"
                  onClick={() => void handleDeleteCrush()}
                  disabled={isDeletingCrush || isSubmittingCrush || isUploadingPhoto}
                >
                  {isDeletingCrush ? "APAGANDO..." : "🗑️ APAGAR"}
                </button>
              )}
            </div>
            <p className="crush-modal-subtitle">
              {isEditingCrush
                ? "Atualize sua foto, descrição e preferências exibidas na vitrine de Crushes."
                : "Adicione suas informações para aparecer na vitrine de crushes da UERJ e receber matches de outros alunos."}
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
                Descrição / Fofoca sobre você *
                <textarea
                  name="description"
                  defaultValue={isEditingCrush ? myCrush?.description : ""}
                  placeholder="Ex: Alguém do 6º andar me notou na aula de Introdução? Sempre no pilotis ou na choppada..."
                  required
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Gênero
                    <select name="gender" defaultValue={isEditingCrush ? myCrush?.gender : "OTHER"}>
                    <option value="FEMALE">Feminino</option>
                    <option value="MALE">Masculino</option>
                    <option value="TRANSGENDER">Transgênero</option>
                    <option value="NON_BINARY">Não-binário</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </label>

                <label>
                  Orientação
                    <select name="orientation" defaultValue={isEditingCrush ? myCrush?.orientation : "BISEXUAL"}>
                    <option value="HETEROSEXUAL">Heterossexual</option>
                    <option value="HOMOSEXUAL">Homossexual</option>
                    <option value="BISEXUAL">Bissexual</option>
                    <option value="ASEXUAL">Assexual</option>
                    <option value="PANSEXUAL">Pansexual</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="crush-modal-submit" disabled={isSubmittingCrush}>
                {isSubmittingCrush ? (isEditingCrush ? "SALVANDO..." : "PUBLICANDO...") : isEditingCrush ? "SALVAR ALTERAÇÕES" : "PUBLICAR MEU PERFIL DE CRUSH"}
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
