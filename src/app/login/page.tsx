"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, Gender, Orientation, Post, UserResponse } from "../../lib/api";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

const orientations = [
  { value: "HETEROSEXUAL", label: "Heterossexual" },
  { value: "HOMOSEXUAL", label: "Homossexual" },
  { value: "BISEXUAL", label: "Bissexual" },
  { value: "ASEXUAL", label: "Assexual" },
  { value: "PANSEXUAL", label: "Pansexual" },
] as const;

const genders = [
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Feminino" },
  { value: "TRANSGENDER", label: "Transgênero" },
  { value: "NON_BINARY", label: "Não binário" },
  { value: "OTHER", label: "Outro" },
] as const;

const genderLabels: Record<string, string> = Object.fromEntries(genders.map((gender) => [gender.value, gender.label]));
const orientationLabels: Record<string, string> = Object.fromEntries(orientations.map((orientation) => [orientation.value, orientation.label]));
const postCategoryLabels: Record<string, string> = { CRUSH: "Crush", RELATIONSHIP: "Relacionamentos", ACADEMIC: "Acadêmico", PARTY: "Festa", DRAMA: "Drama", CONFESSION: "Confissão", LOST_AND_FOUND: "Achados e perdidos", MEME: "Meme", ALERT: "Alerta", CAFETERIA: "Bandejão" };

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profileEmail, setProfileEmail] = useState("");
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [deletingPostId, setDeletingPostId] = useState("");

  async function loadMyPosts(token: string) {
    try {
      setMyPosts(await api.myPosts(token));
    } catch {
      setMyPosts([]);
    }
  }

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      await Promise.resolve();
      if (!active) return;

      const token = localStorage.getItem("gossipuerj_token");
      const savedEmail = localStorage.getItem("gossipuerj_email") ?? "";

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
        await loadMyPosts(token);
        setAuthenticated(true);
      } catch {
        if (!active) return;
        localStorage.removeItem("gossipuerj_token");
        localStorage.removeItem("gossipuerj_email");
        setAuthenticated(false);
      }
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");

    try {
      if (mode === "login") {
        const response = await api.login(email, String(form.get("password") ?? ""));
        localStorage.setItem("gossipuerj_token", response.token);
        localStorage.setItem("gossipuerj_email", email);
        const user = await api.me(response.token);
        setProfile(user);
        setProfileEmail(user.email ?? email);
        await loadMyPosts(response.token);
        setAuthenticated(true);
        router.push("/perfil");
        return;
      }

      await api.register({
        username: email.split("@")[0],
        email,
        password: String(form.get("password") ?? ""),
        gender: String(form.get("gender") ?? "") as Gender,
        orientation: String(form.get("orientation") ?? "") as Orientation,
      });
      setVerificationEmail(email);
      setNeedsVerification(true);
      setMessage("Conta criada. Confira seu email para obter o código de verificação.");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.message.toLowerCase().includes("não foi encontrado")) {
        setError("Não encontramos uma conta com esse email. Clique em CRIAR AGORA para criar seu perfil.");
      } else {
        setError(requestError instanceof ApiError ? requestError.message : "Não foi possível concluir a solicitação.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      await api.verify(verificationEmail, String(form.get("verificationCode") ?? ""));
      setNeedsVerification(false);
      setMode("login");
      setMessage("Email verificado. Você já pode entrar.");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Não foi possível verificar seu email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      await api.resendVerification(verificationEmail);
      setMessage("Um novo código foi enviado para seu email.");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Não foi possível reenviar o código.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("gossipuerj_token");
    localStorage.removeItem("gossipuerj_email");
    setProfileEmail("");
    setProfile(null);
    setMyPosts([]);
    setAuthenticated(false);
  }

  async function handleDeletePost(postId: string) {
    const token = localStorage.getItem("gossipuerj_token");
    if (!token || deletingPostId) return;

    setDeletingPostId(postId);
    try {
      await api.deletePost(token, postId);
      setMyPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Não foi possível excluir a publicação.");
    } finally {
      setDeletingPostId("");
    }
  }

  function handleRequiredFieldInvalid(event: FormEvent<HTMLInputElement | HTMLSelectElement>) {
    if (event.currentTarget.validity.valueMissing) {
      event.currentTarget.setCustomValidity("Preencha este campo para continuar.");
    }
  }

  function clearFieldValidity(event: FormEvent<HTMLInputElement | HTMLSelectElement>) {
    event.currentTarget.setCustomValidity("");
  }

  if (authenticated === null) {
    return (
      <div className="site-shell">
        <SiteHeader active="login" authenticated />
        <section className="pink-page login-page">
          <div className="login-card profile-loading" role="status" aria-live="polite">
            <div className="login-logo">GOSSIP<span>UERJ</span></div>
            <div className="loading-spinner" aria-hidden="true" />
            <h1>Carregando seu perfil...</h1>
            <p>Aguarde só um instante.</p>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="site-shell">
        <SiteHeader active="perfil" authenticated />
        <section className="pink-page login-page">
          <div className="login-card" style={{ maxWidth: "460px" }}>
            <div className="login-logo">GOSSIP<span>UERJ</span></div>
            <div style={{ fontSize: "52px", margin: "16px 0 6px" }}>🎉</div>
            <h1 style={{ fontSize: "24px", margin: "8px 0" }}>Você já está conectado!</h1>
            <p style={{ color: "#666", fontSize: "13px", lineHeight: "1.5", marginBottom: "22px" }}>
              Conectado como <strong>@{profile?.username || profileEmail}</strong>. Acesse seu perfil para ver sua Carteirinha Digital e suas fofocas.
            </p>
            <Link className="pink-button" href="/perfil" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
              IR PARA O PERFIL COMPLETO
            </Link>
            <button className="profile-logout" type="button" onClick={handleLogout} style={{ marginTop: "16px" }}>
              SAIR DA CONTA
            </button>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="site-shell">
      <SiteHeader active="login" />
      <section className="pink-page login-page">
        <form className="login-card" onSubmit={needsVerification ? handleVerification : handleSubmit}>
          <div className="login-logo">GOSSIP<span>UERJ</span></div>
          <h1>{needsVerification ? "Verifique seu email" : mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
          <p>{needsVerification ? `Digite o código enviado para ${verificationEmail}.` : mode === "login" ? "Entre com sua conta para participar do Gossip UERJ." : "Crie seu perfil para interagir com a comunidade UERJ."}</p>
          {!needsVerification && mode === "register" && <>
            <label>Gênero<select name="gender" defaultValue="" required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity}><option value="" disabled>Selecione seu gênero</option>{genders.map((gender) => <option key={gender.value} value={gender.value}>{gender.label}</option>)}</select></label>
            <label>Orientação<select name="orientation" defaultValue="" required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity}><option value="" disabled>Selecione sua orientação</option>{orientations.map((orientation) => <option key={orientation.value} value={orientation.value}>{orientation.label}</option>)}</select></label>
          </>}
          {needsVerification ? <label>Código de verificação<input name="verificationCode" inputMode="numeric" required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity} /></label> : <>
            <label>Email<input name="email" type="email" placeholder="voce@graduacao.uerj.br" required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity} /></label>
            {mode === "register" && <p className="username-hint">Seu nome de usuário será a parte do email antes do @.</p>}
            <label>Senha<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} minLength={6} required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity} /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? "◉" : "◌"}</button></div></label>
          </>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="pink-button" type="submit" disabled={isSubmitting}>{isSubmitting ? needsVerification ? "VERIFICANDO..." : mode === "login" ? "ENTRANDO..." : "CRIANDO..." : needsVerification ? "VERIFICAR EMAIL" : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}</button>
          {needsVerification && <button className="resend-button" type="button" onClick={handleResendVerification} disabled={isSubmitting}>{isSubmitting ? "REENVIANDO..." : "REENVIAR CÓDIGO"}</button>}
          {!needsVerification && <div className="register">{mode === "login" ? "Não tem conta? " : "Já tem conta? "}<button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); setError(""); }}>{mode === "login" ? "CRIAR AGORA" : "VOLTAR AO LOGIN"}</button></div>}
          <Link className="back-link" href="/">← Voltar para o feed</Link>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}
