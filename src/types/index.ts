// ============================================
// Phase 1: 型定義
// ============================================

// Cloudflare Bindings（環境変数とサービス）
export type Bindings = {
  DB: D1Database
  R2: R2Bucket // Phase 2: 画像ストレージ（アバター、サムネイル）
  JWT_SECRET: string
  RESEND_API_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  PLATFORM_DOMAIN: string // commons.com
}

// --------------------------------------------
// Database Models
// --------------------------------------------

export interface User {
  id: number
  email: string
  password_hash: string
  nickname: string
  avatar_url: string | null
  status: 'active' | 'suspended' | 'deleted'
  created_at: string
  last_login_at: string | null
}

export interface Tenant {
  id: number
  subdomain: string
  name: string
  subtitle: string | null
  owner_user_id: number
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'canceled'
  storage_used: number
  storage_limit: number
  member_count: number
  is_public: number // 1: 公開, 0: 非公開
  created_at: string
}

export interface TenantMembership {
  id: number
  tenant_id: number
  user_id: number
  role: 'owner' | 'admin' | 'member'
  plan_id: number | null
  member_number: string | null
  status: 'pending' | 'active' | 'suspended'
  joined_at: string
  expires_at: string | null
}

export interface TenantCustomization {
  id: number
  tenant_id: number
  theme_preset: 'modern-business' | 'wellness-nature' | 'creative-studio' | 'tech-innovation'
  updated_at: string
}

export interface TenantFeatures {
  id: number
  tenant_id: number
  max_members: number
  max_storage_gb: number
  max_posts_per_month: number
  enable_file_sharing: boolean
  enable_events: boolean
  enable_polls: boolean
  enable_custom_domain: boolean
  updated_at: string
}

export interface Post {
  id: number
  tenant_id: number
  author_id: number
  title: string
  content: string
  excerpt: string | null
  thumbnail_url: string | null
  status: 'draft' | 'published' | 'scheduled'
  published_at: string | null
  scheduled_at: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: number
  tenant_id: number
  post_id: number
  user_id: number
  content: string
  created_at: string
}

export interface Plan {
  id: number
  tenant_id: number
  name: string
  description: string | null
  price: number
  billing_interval: 'monthly' | 'yearly'
  features: string | null // JSON string
  is_active: boolean
  stripe_price_id: string | null
  created_at: string
}

export interface Subscription {
  id: number
  tenant_id: number
  user_id: number
  plan_id: number
  stripe_subscription_id: string
  stripe_customer_id: string
  status: string // Stripe の status をそのまま保存
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
}

export interface PaymentHistory {
  id: number
  tenant_id: number
  user_id: number
  subscription_id: number | null
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'refunded'
  stripe_payment_id: string | null
  stripe_invoice_id: string | null
  created_at: string
}

// --------------------------------------------
// JWT Payload
// --------------------------------------------

export interface JWTPayload {
  userId: number
  tenantId: number
  role: 'owner' | 'admin' | 'member'
  iat: number // 発行日時
  exp: number // 有効期限
}

// --------------------------------------------
// API Request/Response Types
// --------------------------------------------

// 認証
export interface RegisterRequest {
  email: string
  password: string
  subdomain: string
  communityName: string
  subtitle?: string
  theme?: 'modern-business' | 'wellness-nature' | 'creative-studio' | 'tech-innovation'
  isPublic?: number // 1: 公開, 0: 非公開（デフォルト: 1）
}

export interface LoginRequest {
  email: string
  password: string
  tenantId?: number
}

export interface AuthResponse {
  success: boolean
  token: string
  user: Omit<User, 'password_hash'>
  tenant?: Tenant
  membership?: TenantMembership
}

// 投稿
export interface CreatePostRequest {
  title: string
  content: string
  status?: 'draft' | 'published' | 'scheduled'
  scheduledAt?: string
  thumbnailUrl?: string
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {}

// コメント
export interface CreateCommentRequest {
  content: string
}

// 決済
export interface CreateCheckoutSessionRequest {
  planId: number
}

export interface CreateCheckoutSessionResponse {
  success: boolean
  sessionId: string
  url: string
}

// プロフィール（Week 5-6）
export interface UpdateProfileRequest {
  nickname?: string
  bio?: string
  avatar?: File | null // フロントエンドで File として扱う
}

export interface UpdateProfileResponse {
  success: boolean
  user: Omit<User, 'password_hash'>
  message?: string
}

// --------------------------------------------
// Hono Context Type
// --------------------------------------------

export type AppContext = {
  Bindings: Bindings
  Variables: {
    tenantId: number
    userId: number
    role: 'owner' | 'admin' | 'member'
  }
}
