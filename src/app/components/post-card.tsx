"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, CommentResponse, PostResponse } from "../../lib/api";

type PostCardProps = {
  post: PostResponse;
  categoryLabel: string;
  isMyPost: boolean;
  onDelete: (postId: string) => void;
  isDeleting: boolean;
  onError: (msg: string) => void;
};

export default function PostCard({
  post,
  categoryLabel,
  isMyPost,
  onDelete,
  isDeleting,
  onError,
}: PostCardProps) {
  const [likesCount, setLikesCount] = useState<number>(0);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({});
  const [isLikingComment, setIsLikingComment] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function loadLikes() {
      await Promise.resolve();
      if (!active) return;
      try {
        const total = await api.getTotalPostLikes(post.id);
        if (active) setLikesCount(typeof total === "number" ? total : 0);
      } catch {
        // Falhas ao carregar contagem inicial de likes são ignoradas
      }
    }

    void loadLikes();
    return () => {
      active = false;
    };
  }, [post.id]);

  async function handleToggleLike() {
    const token = localStorage.getItem("gossipuerj_token");
    if (!token) {
      onError("Entre na sua conta para curtir fofocas.");
      return;
    }

    const previousHasLiked = hasLiked;
    const previousLikesCount = likesCount;
    const nextHasLiked = !previousHasLiked;
    const nextLikesCount = nextHasLiked ? previousLikesCount + 1 : Math.max(0, previousLikesCount - 1);

    // Atualização otimista imediata na interface
    setHasLiked(nextHasLiked);
    setLikesCount(nextLikesCount);
    setIsLiking(true);

    try {
      const res = await api.togglePostLike(token, post.id);
      if (typeof res?.liked === "boolean") {
        setHasLiked(res.liked);
      }
      if (typeof res?.totalLikes === "number") {
        setLikesCount(res.totalLikes);
      } else {
        const total = await api.getTotalPostLikes(post.id);
        if (typeof total === "number") setLikesCount(total);
      }
    } catch (err) {
      // Reverter se a requisição falhar
      setHasLiked(previousHasLiked);
      setLikesCount(previousLikesCount);
      onError(err instanceof ApiError ? err.message : "Não foi possível curtir a publicação.");
    } finally {
      setIsLiking(false);
    }
  }

  async function loadComments() {
    setIsLoadingComments(true);
    try {
      const data = await api.getPostComments(post.id);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Não foi possível carregar os comentários.");
    } finally {
      setIsLoadingComments(false);
    }
  }

  function handleToggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      void loadComments();
    }
  }

  async function handleAddComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem("gossipuerj_token");
    if (!token) {
      onError("Entre na sua conta para comentar.");
      return;
    }

    if (!newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const created = await api.createComment(token, post.id, {
        postId: post.id,
        content: newCommentText.trim(),
      });
      setComments((prev) => [...prev, created]);
      setNewCommentText("");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Não foi possível enviar seu comentário.");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleReplyComment(commentId: string) {
    const token = localStorage.getItem("gossipuerj_token");
    if (!token) {
      onError("Entre na sua conta para responder.");
      return;
    }

    if (!replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      await api.replyComment(token, post.id, commentId, {
        postId: post.id,
        content: replyText.trim(),
      });
      setReplyText("");
      setReplyingToCommentId(null);
      await loadComments();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Não foi possível responder ao comentário.");
    } finally {
      setIsSubmittingReply(false);
    }
  }

  async function handleToggleCommentLike(commentId: string) {
    const token = localStorage.getItem("gossipuerj_token");
    if (!token) {
      onError("Entre na sua conta para curtir este comentário.");
      return;
    }

    const currentLikes = commentLikes[commentId] ?? 0;
    setCommentLikes((prev) => ({ ...prev, [commentId]: currentLikes + 1 }));
    setIsLikingComment((prev) => ({ ...prev, [commentId]: true }));

    try {
      const res = await api.toggleCommentLike(token, post.id, commentId);
      if (typeof res?.totalLikes === "number") {
        setCommentLikes((prev) => ({ ...prev, [commentId]: res.totalLikes! }));
      } else {
        const total = await api.getTotalCommentLikes(post.id, commentId);
        setCommentLikes((prev) => ({ ...prev, [commentId]: typeof total === "number" ? total : 0 }));
      }
    } catch (err) {
      setCommentLikes((prev) => ({ ...prev, [commentId]: currentLikes }));
      onError(err instanceof ApiError ? err.message : "Não foi possível curtir o comentário.");
    } finally {
      setIsLikingComment((prev) => ({ ...prev, [commentId]: false }));
    }
  }

const categoryIcons: Record<string, string> = {
  CONFESSION: "🤫",
  CRUSH: "💘",
  RELATIONSHIP: "💔",
  ACADEMIC: "📚",
  CAFETERIA: "🍽️",
  PARTY: "🍹",
  DRAMA: "🎭",
  LOST_AND_FOUND: "🔍",
  MEME: "😂",
  ALERT: "⚠️",
};

function formatPostDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

  const icon = categoryIcons[post.category] || "📢";

  return (
    <article className="post-card" key={post.id}>
      <div className="post-card-header">
        <div className="post-tags-row">
          <span className={`tag post-category-tag ${post.category ? post.category.toLowerCase() : ""}`}>
            <span>{icon}</span>
            <span>{categoryLabel}</span>
          </span>
          <span className="post-anonymous-badge">
            🔒 ANÔNIMO
          </span>
        </div>

        <div className="post-meta-right">
          <small className="post-date-badge">
            🕒 {formatPostDate(post.createdAt)}
          </small>
          {isMyPost && (
            <button
              className="delete-post"
              type="button"
              onClick={() => onDelete(post.id)}
              disabled={isDeleting}
              aria-label={`Excluir publicação ${post.title}`}
              title="Excluir publicação"
            >
              {isDeleting ? "..." : "🗑️ Excluir"}
            </button>
          )}
        </div>
      </div>

      <h2 className="post-title">{post.title}</h2>
      <p className="post-content">{post.content}</p>

      <div className="post-footer">
        <div className="post-actions">
          <button
            className={`action-btn ${hasLiked ? "liked" : ""}`}
            type="button"
            onClick={handleToggleLike}
            disabled={isLiking}
            aria-label="Curtir publicação"
          >
            <span>{hasLiked ? "❤️" : "🤍"}</span>
            <span>{likesCount}</span>
            <span style={{ fontSize: "11px", fontWeight: 600 }}>{likesCount === 1 ? "curtida" : "curtidas"}</span>
          </button>
          <button
            className={`action-btn ${showComments ? "active" : ""}`}
            type="button"
            onClick={handleToggleComments}
            aria-label="Ver ou ocultar comentários"
          >
            <span>💬</span>
            <span>{comments.length > 0 ? `${comments.length} comentários` : "Comentários"}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <section className="comments-container" aria-label={`Comentários de ${post.title}`}>
          <div className="comments-header-row">
            <h3 className="comments-title">
              💬 Comentários ({comments.length})
            </h3>
            <button
              type="button"
              className="comments-close-btn"
              onClick={() => setShowComments(false)}
              aria-label="Fechar comentários"
            >
              ✕
            </button>
          </div>

          {isLoadingComments ? (
            <p className="comment-empty">Carregando comentários do campus...</p>
          ) : comments.length === 0 ? (
            <p className="comment-empty">Nenhum comentário ainda. Seja o primeiro a opinar!</p>
          ) : (
            <div className="comment-list">
              {comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-item-header">
                    <div className="comment-author-badge">
                      <span className="comment-author-avatar">
                        {(comment.authorName || "A").charAt(0).toUpperCase()}
                      </span>
                      <span className="comment-author">@{comment.authorName || "anônimo"}</span>
                    </div>
                    <span className="comment-time">
                      {comment.createdAt ? formatPostDate(comment.createdAt) : ""}
                    </span>
                  </div>
                  <p className="comment-body">{comment.content}</p>
                  <div className="comment-item-actions">
                    <button
                      className="comment-action-link"
                      type="button"
                      onClick={() => handleToggleCommentLike(comment.id)}
                      disabled={isLikingComment[comment.id]}
                    >
                      ❤️ {commentLikes[comment.id] ?? 0} curtir
                    </button>
                    <button
                      className="comment-action-link"
                      type="button"
                      onClick={() =>
                        setReplyingToCommentId(
                          replyingToCommentId === comment.id ? null : comment.id
                        )
                      }
                    >
                      ↩️ {replyingToCommentId === comment.id ? "cancelar" : "responder"}
                    </button>
                  </div>

                  {comment.replies && comment.replies.length > 0 && (
                    <div className="replies-list">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="reply-item">
                          <div className="comment-item-header">
                            <span className="comment-author">@{reply.authorName || "anônimo"}</span>
                            <span className="comment-time">
                              {reply.createdAt ? formatPostDate(reply.createdAt) : ""}
                            </span>
                          </div>
                          <p className="comment-body">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingToCommentId === comment.id && (
                    <div className="reply-form">
                      <input
                        className="reply-input"
                        placeholder="Escreva sua resposta..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        maxLength={200}
                      />
                      <button
                        className="reply-submit"
                        type="button"
                        onClick={() => handleReplyComment(comment.id)}
                        disabled={isSubmittingReply || !replyText.trim()}
                      >
                        {isSubmittingReply ? "..." : "Enviar"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <form className="comment-form" onSubmit={handleAddComment}>
            <input
              className="comment-input"
              placeholder="Solte sua opinião respeitosa sobre o babado..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              maxLength={280}
              required
            />
            <button
              className="comment-submit"
              type="submit"
              disabled={isSubmittingComment || !newCommentText.trim()}
            >
              {isSubmittingComment ? "ENVIANDO..." : "COMENTAR ↗"}
            </button>
          </form>
        </section>
      )}
    </article>
  );

}
