"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, UserResponse } from "../../lib/api";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

function getFriendlyError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  const message = error.message.toLowerCase();

  if (error.status === 401 || message.includes("senha") || message.includes("credencial")) {
    return "Email ou senha incorretos. Confira os dados e tente novamente.";
  }
  if (error.status === 404) return "Não encontramos uma conta com esse email.";
  if (error.status === 409) return "Esse email já está cadastrado. Tente entrar na sua conta.";
  if (error.status >= 500) return "O servidor está indisponível no momento. Tente novamente em instantes.";
  if (message.includes("código") || message.includes("verification")) {
    return "Esse código não é válido ou já expirou. Solicite um novo código.";
  }
  return fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [passwordResetRequested, setPasswordResetRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profileEmail, setProfileEmail] = useState("");
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      if (mode === "forgot") {
        await api.forgetPassword(email);
          setVerificationEmail(email);
        setPasswordResetRequested(true);
        setMessage("Confira seu email para obter o código de recuperação.");
        return;
      }

      if (mode === "login") {
        const response = await api.login(email, String(form.get("password") ?? ""));
        localStorage.setItem("gossipuerj_token", response.token);
        localStorage.setItem("gossipuerj_email", email);
        const user = await api.me(response.token);
        setProfile(user);
        setProfileEmail(user.email ?? email);
        setAuthenticated(true);
        router.push("/perfil");
        return;
      }

      const inputUsername = String(form.get("username") ?? "").trim();
      const username = inputUsername || email.split("@")[0] || "uerjiano";

      await api.register({
        username,
        email,
        password: String(form.get("password") ?? ""),
      });
      setVerificationEmail(email);
      setNeedsVerification(true);
      setMessage("Conta criada. Confira seu email para obter o código de verificação.");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.message.toLowerCase().includes("não foi encontrado")) {
        setError("Não encontramos uma conta com esse email. Você pode criar uma conta agora.");
      } else {
        setError(getFriendlyError(requestError, "Não foi possível concluir a solicitação."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      await api.resetPassword({
        email: verificationEmail,
        verificationCode: String(form.get("verificationCode") ?? ""),
        password: String(form.get("newPassword") ?? ""),
      });
      setPasswordResetRequested(false);
      setMode("login");
      setMessage("Senha redefinida. Você já pode entrar com a nova senha.");
    } catch (requestError) {
      setError(getFriendlyError(requestError, "Não foi possível redefinir sua senha."));
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
      setError(getFriendlyError(requestError, "Não foi possível verificar seu email."));
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
      setError(getFriendlyError(requestError, "Não foi possível reenviar o código."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("gossipuerj_token");
    localStorage.removeItem("gossipuerj_email");
    setProfileEmail("");
    setProfile(null);
    setAuthenticated(false);
  }

  function handleRequiredFieldInvalid(event: FormEvent<HTMLInputElement | HTMLSelectElement>) {
    const field = event.currentTarget;
    if (field.validity.valueMissing) field.setCustomValidity("Preencha este campo para continuar.");
    else if (field.validity.typeMismatch) field.setCustomValidity("Digite um email válido, como voce@uerj.br.");
    else if (field.validity.tooShort) field.setCustomValidity("Use pelo menos 6 caracteres.");
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
        <form className="login-card" onSubmit={needsVerification ? handleVerification : passwordResetRequested ? handlePasswordReset : handleSubmit}>
          <div className="login-logo">GOSSIP<span>UERJ</span></div>
          <h1>{needsVerification ? "Verifique seu email" : passwordResetRequested ? "Redefina sua senha" : mode === "forgot" ? "Recupere sua senha" : mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
          <p>{needsVerification ? `Digite o código enviado para ${verificationEmail}.` : passwordResetRequested ? "Digite o código recebido e escolha uma nova senha." : mode === "forgot" ? "Enviaremos um código para você criar uma nova senha." : mode === "login" ? "Entre com sua conta para participar do Gossip UERJ." : "Crie seu perfil para interagir com a comunidade UERJ."}</p>
          {needsVerification ? (
            <label>Código de verificação<input name="verificationCode" inputMode="numeric" required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity} /></label>
          ) : passwordResetRequested ? (
            <>
              <label>Código de recuperação<input name="verificationCode" inputMode="numeric" required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity} /></label>
              <label>Nova senha<input name="newPassword" type="password" minLength={6} required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity} /></label>
            </>
          ) : mode === "forgot" ? (
            <label>
              Email institucional
              <input
                name="email"
                type="email"
                placeholder="voce@graduacao.uerj.br"
                required
                onInvalid={handleRequiredFieldInvalid}
                onInput={clearFieldValidity}
              />
            </label>
          ) : (
            <>
              {mode === "register" && (
                <label>
                  Seu @ do Instagram
                  <input name="username" type="text" placeholder="ex: jorgeuerj (opcional)" aria-describedby="instagram-username-help" onInput={clearFieldValidity} />
                  <small id="instagram-username-help" className="field-help-text">
                    Será liberado para a outra pessoa somente depois que vocês derem match.
                  </small>
                </label>
              )}
              <label>
                Email institucional
                <input name="email" type="email" placeholder="voce@graduacao.uerj.br" required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity} />
              </label>
              <label>
                Senha
                <div className="password-field">
                  <input name="password" type={showPassword ? "text" : "password"} minLength={6} required onInvalid={handleRequiredFieldInvalid} onInput={clearFieldValidity} />
                  <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? "◉" : "◌"}
                  </button>
                </div>
              </label>
            </>
          )}
          {error && <p className="form-error login-feedback" role="alert">{error}</p>}
          {message && <p className="form-success login-feedback" role="status">{message}</p>}
          <button className="pink-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "AGUARDE..." : needsVerification ? "VERIFICAR EMAIL" : passwordResetRequested ? "REDEFINIR SENHA" : mode === "forgot" ? "ENVIAR CÓDIGO" : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
          </button>
          {needsVerification && (
            <button className="resend-button" type="button" onClick={handleResendVerification} disabled={isSubmitting}>
              {isSubmitting ? "REENVIANDO..." : "REENVIAR CÓDIGO"}
            </button>
          )}
          {!needsVerification && !passwordResetRequested && (
            <div className="register">
              {mode === "forgot" ? "Lembrou sua senha? " : mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); setError(""); }}>
                {mode === "forgot" || mode === "register" ? "VOLTAR AO LOGIN" : "CRIAR AGORA"}
              </button>
            </div>
          )}
          {mode === "login" && !needsVerification && !passwordResetRequested && (
            <button className="forgot-password-link" type="button" onClick={() => { setMode("forgot"); setMessage(""); setError(""); }}>
              ESQUECI MINHA SENHA
            </button>
          )}
          <Link className="back-link" href="/">← Voltar para o feed</Link>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}
