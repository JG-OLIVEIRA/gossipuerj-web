const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
// Use the Next.js BFF proxy (/api/backend) by default to avoid browser CORS errors on Vercel
const API_URL =
  !rawApiUrl || rawApiUrl === "https://gossipuerj-api.onrender.com"
    ? "/api/backend"
    : rawApiUrl;

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type PostCategory =
  | "CRUSH"
  | "RELATIONSHIP"
  | "ACADEMIC"
  | "PARTY"
  | "DRAMA"
  | "CONFESSION"
  | "LOST_AND_FOUND"
  | "MEME"
  | "ALERT"
  | "CAFETERIA";

export type Gender = "MALE" | "FEMALE" | "TRANSGENDER" | "NON_BINARY" | "OTHER";

export type Orientation =
  | "HETEROSEXUAL"
  | "HOMOSEXUAL"
  | "BISEXUAL"
  | "ASEXUAL"
  | "PANSEXUAL";

export type UserRole = "ROLE_USER" | "ROLE_ADMIN";

export type GrantedAuthority = {
  authority?: string;
};

export type User = {
  id?: string;
  username: string;
  email: string;
  password?: string;
  verificationCode?: string;
  verificationCodeExpiresAt?: string;
  enabled?: boolean;
  roles?: UserRole[];
  gender?: Gender;
  orientation?: Orientation;
  createdAt?: string;
  updatedAt?: string;
  authorities?: GrantedAuthority[];
  accountNonExpired?: boolean;
  accountNonLocked?: boolean;
  credentialsNonExpired?: boolean;
};

export type UserResponse = {
  username?: string;
  email?: string;
  gender?: Gender;
  orientation?: Orientation;
  createdAt?: string;
  updatedAt?: string;
};

export type UserDetail = UserResponse;

export type PostRequest = {
  title: string;
  content: string;
  category: PostCategory;
};

export type PostResponse = {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  createdAt: string;
  updatedAt: string;
};

export type Post = PostResponse;

export type CommentRequest = {
  postId?: string;
  content: string;
};

export type CommentResponse = {
  id: string;
  content: string;
  createdAt: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type PageResponsePostResponse = PageResponse<PostResponse>;
export type PageResponseCommentResponse = PageResponse<CommentResponse>;

export type Comment = {
  id?: string;
  content?: string;
  author?: User;
  post?: PostResponse;
  parent?: Comment;
  replies?: Comment[];
  createdAt?: string;
  updatedAt?: string;
};

export type Like = {
  id?: string;
  author?: User;
  post?: PostResponse;
  comment?: Comment;
  createdAt?: string;
  updatedAt?: string;
  liked?: boolean;
  totalLikes?: number;
};

export type LikeToggleResponse = {
  liked?: boolean;
  totalLikes?: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};

export type RegisterUserRequest = {
  username: string;
  email: string;
  password: string;
  gender: Gender;
  orientation: Orientation;
};

export type RegisterRequest = RegisterUserRequest;

export type VerifyUserRequest = {
  email: string;
  verificationCode: string;
};

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    let message = "A API recusou a solicitação.";
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(response.status, message);
  }

  const text = await response.text();
  if (!text) {
    return undefined as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  // Post Controller
  getAll(page = 0, size = 50): Promise<PageResponsePostResponse> {
    return request<PageResponsePostResponse>(
      `/api/v1/posts?page=${page}&size=${size}`,
      { method: "GET" }
    );
  },
  posts(page = 0, size = 50): Promise<PageResponsePostResponse> {
    return this.getAll(page, size);
  },

  create(token: string, data: PostRequest): Promise<PostResponse> {
    return request<PostResponse>("/api/v1/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },
  createPost(token: string, data: PostRequest): Promise<PostResponse> {
    return this.create(token, data);
  },

  getById(postId: string): Promise<PostResponse> {
    return request<PostResponse>(`/api/v1/posts/${encodeURIComponent(postId)}`, {
      method: "GET",
    });
  },
  getPost(postId: string): Promise<PostResponse> {
    return this.getById(postId);
  },

  delete(token: string, postId: string): Promise<void> {
    return request<void>(`/api/v1/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  deletePost(token: string, postId: string): Promise<void> {
    return this.delete(token, postId);
  },

  getAllByUserId(token: string, page = 0, size = 200): Promise<PageResponsePostResponse> {
    return request<PageResponsePostResponse>(
      `/api/v1/posts/me?page=${page}&size=${size}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
  myPosts(token: string): Promise<PageResponsePostResponse> {
    return this.getAllByUserId(token);
  },

  // Like Controller
  getTotalPostLikes(postId: string): Promise<number> {
    return request<number>(`/api/v1/posts/${encodeURIComponent(postId)}/likes`, {
      method: "GET",
    });
  },
  getPostLikes(postId: string): Promise<number> {
    return this.getTotalPostLikes(postId);
  },

  togglePostLike(token: string, postId: string): Promise<LikeToggleResponse> {
    return request<LikeToggleResponse>(`/api/v1/posts/${encodeURIComponent(postId)}/likes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getTotalCommentLikes(postId: string, commentId: string): Promise<number> {
    return request<number>(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/likes`,
      { method: "GET" }
    );
  },
  getCommentLikes(postId: string, commentId: string): Promise<number> {
    return this.getTotalCommentLikes(postId, commentId);
  },

  toggleCommentLike(token: string, postId: string, commentId: string): Promise<LikeToggleResponse> {
    return request<LikeToggleResponse>(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/likes`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  // Comment Controller
  getPostComments(postId: string, page = 0, size = 100): Promise<PageResponseCommentResponse> {
    return request<PageResponseCommentResponse>(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments?page=${page}&size=${size}`,
      { method: "GET" }
    );
  },
  comments(postId: string): Promise<PageResponseCommentResponse> {
    return this.getPostComments(postId);
  },

  createComment(token: string, postId: string, data: CommentRequest): Promise<CommentResponse> {
    return request<CommentResponse>(`/api/v1/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  getReplies(postId: string, commentId: string, page = 0, size = 50): Promise<PageResponseCommentResponse> {
    return request<PageResponseCommentResponse>(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/replies?page=${page}&size=${size}`,
      { method: "GET" }
    );
  },
  getCommentReplies(postId: string, commentId: string): Promise<PageResponseCommentResponse> {
    return this.getReplies(postId, commentId);
  },

  replyComment(token: string, postId: string, commentId: string, data: CommentRequest): Promise<CommentResponse> {
    return request<CommentResponse>(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/replies`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }
    );
  },

  // Auth Controller
  login(dataOrEmail: LoginRequest | string, maybePassword?: string): Promise<LoginResponse> {
    const body: LoginRequest =
      typeof dataOrEmail === "string"
        ? { email: dataOrEmail, password: maybePassword ?? "" }
        : dataOrEmail;
    return request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  register(data: RegisterUserRequest): Promise<void> {
    return request<void>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  verify(dataOrEmail: VerifyUserRequest | string, maybeCode?: string): Promise<void> {
    const body: VerifyUserRequest =
      typeof dataOrEmail === "string"
        ? { email: dataOrEmail, verificationCode: maybeCode ?? "" }
        : dataOrEmail;
    return request<void>("/api/v1/auth/verify", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  resend(email: string): Promise<void> {
    return request<void>(`/api/v1/auth/resend?email=${encodeURIComponent(email)}`, {
      method: "POST",
    });
  },
  resendVerification(email: string): Promise<void> {
    return this.resend(email);
  },

  me(token: string): Promise<UserResponse> {
    return request<UserResponse>("/api/v1/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};