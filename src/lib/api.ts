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

// Enums & Types from OpenAPI Contract
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

export type UpdateUserRequest = {
  username: string;
  email: string;
};

export type UserDetail = UserResponse;

export type Course = {
  id: string;
  name: string;
};

export type CourseResponse = {
  id: string;
  name: string;
};

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
  first?: boolean;
  last: boolean;
};

export type PageResponsePostResponse = PageResponse<PostResponse>;
export type PageResponseCommentResponse = PageResponse<CommentResponse>;
export type PageResponseCourseResponse = PageResponse<CourseResponse>;
export type PageResponseCrushResponse = PageResponse<CrushResponse>;
export type PageResponseMatchResponse = PageResponse<MatchResponse>;

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
  // Optional backwards compatibility fields if provided by UI
  gender?: Gender;
  orientation?: Orientation;
};

export type RegisterRequest = RegisterUserRequest;

export type VerifyUserRequest = {
  email: string;
  verificationCode: string;
};

export type ResetPasswordUserRequest = {
  email: string;
  password: string;
  verificationCode: string;
};

export type ForgetPasswordRequest = {
  email: string;
};

// Crush schemas
export type Crush = {
  id: string;
  user?: User;
  photoUrl?: string;
  course?: Course;
  description?: string;
  gender?: Gender;
  orientation?: Orientation;
  createdAt?: string;
  updatedAt?: string;
};

export type CrushRequest = {
  photoUrl: string;
  courseName: string;
  description: string;
  gender: Gender;
  orientation: Orientation;
};

export type CrushResponse = {
  id: string;
  photoUrl: string;
  courseName: string;
  description: string;
  gender: Gender;
  orientation: Orientation;
};

// Match schemas
export type MatchStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type MatchResponse = {
  id: string;
  crush?: Crush;
  likedCrush?: Crush;
  status: MatchStatus;
  unmatchedAt?: string;
  createdAt?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
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
  // ==========================================
  // Post Controller (/api/v1/posts)
  // ==========================================
  getAll(page = 0, size = 50, sort?: string[], token?: string): Promise<PageResponsePostResponse> {
    const sortQuery = sort && sort.length ? `&${sort.map((s) => `sort=${encodeURIComponent(s)}`).join("&")}` : "";
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return request<PageResponsePostResponse>(
      `/api/v1/posts?page=${page}&size=${size}${sortQuery}`,
      { method: "GET", headers }
    );
  },
  posts(page = 0, size = 50, token?: string): Promise<PageResponsePostResponse> {
    return this.getAll(page, size, undefined, token);
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

  getAllByUserId(token: string, page = 0, size = 200, sort?: string[]): Promise<PageResponsePostResponse> {
    const sortQuery = sort && sort.length ? `&${sort.map((s) => `sort=${encodeURIComponent(s)}`).join("&")}` : "";
    return request<PageResponsePostResponse>(
      `/api/v1/posts/me?page=${page}&size=${size}${sortQuery}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
  myPosts(token: string): Promise<PageResponsePostResponse> {
    return this.getAllByUserId(token);
  },

  // ==========================================
  // Like Controller (/api/v1/posts/.../likes)
  // ==========================================
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

  // ==========================================
  // Comment Controller (/api/v1/posts/.../comments)
  // ==========================================
  getPostComments(postId: string, page = 0, size = 100, sort?: string[]): Promise<PageResponseCommentResponse> {
    const sortQuery = sort && sort.length ? `&${sort.map((s) => `sort=${encodeURIComponent(s)}`).join("&")}` : "";
    return request<PageResponseCommentResponse>(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments?page=${page}&size=${size}${sortQuery}`,
      { method: "GET" }
    );
  },
  comments(postId: string): Promise<PageResponseCommentResponse> {
    return this.getPostComments(postId);
  },

  getComment(postId: string, commentId: string): Promise<CommentResponse> {
    return request<CommentResponse>(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      { method: "GET" }
    );
  },

  createComment(token: string, postId: string, data: CommentRequest): Promise<CommentResponse> {
    return request<CommentResponse>(`/api/v1/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  getReplies(postId: string, commentId: string, page = 0, size = 50, sort?: string[]): Promise<PageResponseCommentResponse> {
    const sortQuery = sort && sort.length ? `&${sort.map((s) => `sort=${encodeURIComponent(s)}`).join("&")}` : "";
    return request<PageResponseCommentResponse>(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/replies?page=${page}&size=${size}${sortQuery}`,
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

  // ==========================================
  // Crush Controller (/api/v1/crushes)
  // ==========================================
  getAllCrushes(page = 0, size = 50, sort?: string[], token?: string): Promise<PageResponseCrushResponse> {
    const sortQuery = sort && sort.length ? `&${sort.map((s) => `sort=${encodeURIComponent(s)}`).join("&")}` : "";
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return request<PageResponseCrushResponse>(
      `/api/v1/crushes?page=${page}&size=${size}${sortQuery}`,
      { method: "GET", headers }
    );
  },
  crushes(page = 0, size = 50, sort?: string[], token?: string): Promise<PageResponseCrushResponse> {
    return this.getAllCrushes(page, size, sort, token);
  },

  createCrush(token: string, data: CrushRequest): Promise<CrushResponse> {
    return request<CrushResponse>("/api/v1/crushes", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  updateCrush(token: string, data: CrushRequest): Promise<CrushResponse> {
    return request<CrushResponse>("/api/v1/crushes", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  deleteCrush(token: string, crushId: string): Promise<void> {
    return request<void>(`/api/v1/crushes/${encodeURIComponent(crushId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getMyCrush(token: string): Promise<CrushResponse> {
    return request<CrushResponse>("/api/v1/crushes/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getCrush(crushId: string, token?: string): Promise<CrushResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return request<CrushResponse>(`/api/v1/crushes/${encodeURIComponent(crushId)}`, {
      method: "GET",
      headers,
    });
  },

  // ==========================================
  // Match Controller (/api/v1/crushes/.../matches & /api/v1/matches/...)
  // ==========================================
  createMatch(token: string, crushId: string): Promise<MatchResponse> {
    return request<MatchResponse>(`/api/v1/crushes/${encodeURIComponent(crushId)}/matches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  likeCrush(token: string, crushId: string): Promise<MatchResponse> {
    return this.createMatch(token, crushId);
  },

  acceptMatch(token: string, crushId: string, matchId: string): Promise<MatchResponse> {
    return request<MatchResponse>(
      `/api/v1/crushes/${encodeURIComponent(crushId)}/matches/${encodeURIComponent(matchId)}/accept`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  rejectMatch(token: string, crushId: string, matchId: string): Promise<MatchResponse> {
    return request<MatchResponse>(
      `/api/v1/crushes/${encodeURIComponent(crushId)}/matches/${encodeURIComponent(matchId)}/reject`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  getSentMatches(token: string, page = 0, size = 50, sort?: string[]): Promise<PageResponseMatchResponse> {
    const sortQuery = sort && sort.length ? `&${sort.map((s) => `sort=${encodeURIComponent(s)}`).join("&")}` : "";
    return request<PageResponseMatchResponse>(
      `/api/v1/matches/sent?page=${page}&size=${size}${sortQuery}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  getReceivedMatches(token: string, page = 0, size = 50, sort?: string[]): Promise<PageResponseMatchResponse> {
    const sortQuery = sort && sort.length ? `&${sort.map((s) => `sort=${encodeURIComponent(s)}`).join("&")}` : "";
    return request<PageResponseMatchResponse>(
      `/api/v1/matches/received?page=${page}&size=${size}${sortQuery}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  // ==========================================
  // Course Controller (/api/v1/courses)
  // ==========================================
  getCourses(page = 0, size = 100, sort?: string[], token?: string): Promise<PageResponseCourseResponse> {
    const sortQuery = sort && sort.length ? `&${sort.map((s) => `sort=${encodeURIComponent(s)}`).join("&")}` : "";
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return request<PageResponseCourseResponse>(
      `/api/v1/courses?page=${page}&size=${size}${sortQuery}`,
      { method: "GET", headers }
    );
  },

  getCourse(courseId: string, token?: string): Promise<CourseResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return request<CourseResponse>(`/api/v1/courses/${encodeURIComponent(courseId)}`, {
      method: "GET",
      headers,
    });
  },

  // ==========================================
  // Auth Controller (/api/v1/auth)
  // ==========================================
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
    const payload = {
      username: data.username,
      email: data.email,
      password: data.password,
    };
    return request<void>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
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

  forgetPassword(emailOrRequest: string | ForgetPasswordRequest): Promise<void> {
    const body: ForgetPasswordRequest =
      typeof emailOrRequest === "string" ? { email: emailOrRequest } : emailOrRequest;
    return request<void>("/api/v1/auth/forget-password", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  resetPassword(data: ResetPasswordUserRequest): Promise<void> {
    return request<void>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  me(token: string): Promise<UserResponse> {
    return request<UserResponse>("/api/v1/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  updateUser(token: string, data: UpdateUserRequest): Promise<void> {
    return request<void>("/api/v1/auth/update", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },
};
