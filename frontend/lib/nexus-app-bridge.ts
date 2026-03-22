/**
 * Nexus App Bridge -- Plugin Client SDK
 *
 * Enables seamless communication between a plugin's frontend (running in an iframe)
 * and the Nexus Dashboard (parent window). Handles:
 *
 * - Authentication: Receives JWT token from parent
 * - Theme sync: Matches dashboard dark/light mode in real-time
 * - Navigation: Bi-directional URL sync between parent and plugin
 * - Resize: Auto-reports content height to eliminate iframe scrollbars
 * - UI: Toast notifications, page title updates
 * - Context: User info, locale, organization
 *
 * Usage:
 *   const bridge = NexusAppBridge.init('{{PLUGIN_SLUG}}')
 *   if (bridge.isEmbedded()) {
 *     const token = bridge.getToken()
 *     bridge.onThemeChange((theme) => applyTheme(theme))
 *   }
 *
 * When running standalone (not in iframe), all methods are safe no-ops.
 *
 * CUSTOMIZE: Replace {{PLUGIN_SLUG}} with your plugin slug (e.g., 'nexus-crm')
 * CUSTOMIZE: Add your plugin's domain to ALLOWED_ORIGINS
 */

// ============================================================================
// Types
// ============================================================================

export type ThemeMode = 'dark' | 'light'

export interface ThemeConfig {
  mode: ThemeMode
  cssVariables?: Record<string, string>
}

export interface UserContext {
  userId: string
  email: string
  tier: string
  organizationId?: string
  permissions?: string[]
}

export interface BridgeContext {
  user: UserContext | null
  theme: ThemeConfig
  locale: string
  route: string
}

/** Messages sent FROM the dashboard TO the plugin */
interface NexusToPluginMessage {
  source: 'nexus-dashboard'
  type:
    | 'nexus:auth'
    | 'nexus:theme'
    | 'nexus:navigate'
    | 'nexus:context'
    | 'nexus:locale'
    | 'nexus:activeProject'
  payload: unknown
}

/** Messages sent FROM the plugin TO the dashboard */
interface PluginToNexusMessage {
  source: 'nexus-plugin'
  pluginSlug: string
  type:
    | 'plugin:ready'
    | 'plugin:resize'
    | 'plugin:navigate'
    | 'plugin:toast'
    | 'plugin:title'
    | 'plugin:open-terminal'
    | 'plugin:auth-required'
  payload: unknown
}

type ThemeChangeCallback = (theme: ThemeConfig) => void
type NavigateCallback = (path: string) => void
type TokenRefreshCallback = (token: string) => void
type ContextCallback = (ctx: BridgeContext) => void
type ActiveProjectCallback = (project: unknown) => void

// ============================================================================
// Allowed origins for message validation
// ============================================================================

// CUSTOMIZE: Add your plugin's standalone domain here
const ALLOWED_ORIGINS = [
  'https://dashboard.adverant.ai',
  'https://api.adverant.ai',
  // 'https://your-plugin-domain.com',       // <-- Add your domain
  // 'https://www.your-plugin-domain.com',   // <-- Add www variant
  'http://localhost:3000', // development
  'http://localhost:3001',
]

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (typeof window !== 'undefined' && origin === window.location.origin) return true
  return false
}

// ============================================================================
// NexusAppBridge
// ============================================================================

export class NexusAppBridge {
  private static instance: NexusAppBridge | null = null

  private readonly embedded: boolean
  private readonly pluginSlug: string
  private token: string | null = null
  private theme: ThemeConfig = { mode: 'dark' }
  private user: UserContext | null = null
  private locale: string = 'en'
  private currentRoute: string = '/'

  private themeCallbacks: ThemeChangeCallback[] = []
  private navigateCallbacks: NavigateCallback[] = []
  private tokenCallbacks: TokenRefreshCallback[] = []
  private contextCallbacks: ContextCallback[] = []
  private activeProjectCallbacks: ActiveProjectCallback[] = []

  private resizeObserver: ResizeObserver | null = null
  private lastReportedHeight: number = 0
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null

  private constructor(pluginSlug: string) {
    this.pluginSlug = pluginSlug
    this.embedded = this.detectEmbedded()

    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('auth_token')
    const urlTheme = params.get('theme') as ThemeMode | null
    const urlRoute = params.get('route')

    if (urlToken) this.token = urlToken
    if (urlTheme) this.theme = { mode: urlTheme }
    if (urlRoute) this.currentRoute = urlRoute

    if (urlToken || urlTheme || urlRoute) {
      params.delete('auth_token')
      params.delete('theme')
      params.delete('route')
      const remaining = params.toString()
      const newUrl = remaining
        ? `${window.location.pathname}?${remaining}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }

    if (this.embedded) {
      this.setupMessageListener()
      this.setupResizeObserver()
      this.sendReady()
    }
  }

  // CUSTOMIZE: Change default pluginSlug to your plugin's slug
  static init(pluginSlug: string = '{{PLUGIN_SLUG}}'): NexusAppBridge {
    if (!NexusAppBridge.instance) {
      NexusAppBridge.instance = new NexusAppBridge(pluginSlug)
    }
    return NexusAppBridge.instance
  }

  static getInstance(): NexusAppBridge {
    if (!NexusAppBridge.instance) {
      throw new Error('NexusAppBridge not initialized. Call NexusAppBridge.init() first.')
    }
    return NexusAppBridge.instance
  }

  static reset(): void {
    if (NexusAppBridge.instance) {
      NexusAppBridge.instance.destroy()
      NexusAppBridge.instance = null
    }
  }

  isEmbedded(): boolean {
    return this.embedded
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleMessage)
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer)
    }
    this.themeCallbacks = []
    this.navigateCallbacks = []
    this.tokenCallbacks = []
    this.contextCallbacks = []
    this.activeProjectCallbacks = []
  }

  // -- Auth --
  getToken(): string | null { return this.token }
  onTokenRefresh(cb: TokenRefreshCallback): () => void {
    this.tokenCallbacks.push(cb)
    return () => { this.tokenCallbacks = this.tokenCallbacks.filter((c) => c !== cb) }
  }

  // -- Theme --
  getTheme(): ThemeConfig { return this.theme }
  onThemeChange(cb: ThemeChangeCallback): () => void {
    this.themeCallbacks.push(cb)
    return () => { this.themeCallbacks = this.themeCallbacks.filter((c) => c !== cb) }
  }

  // -- Navigation --
  navigate(path: string): void { this.sendToParent('plugin:navigate', { path }) }
  onNavigate(cb: NavigateCallback): () => void {
    this.navigateCallbacks.push(cb)
    return () => { this.navigateCallbacks = this.navigateCallbacks.filter((c) => c !== cb) }
  }
  getRoute(): string { return this.currentRoute }

  // -- UI --
  setTitle(title: string): void { this.sendToParent('plugin:title', { title }) }
  showToast(message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.sendToParent('plugin:toast', { message, variant })
  }
  resize(): void { this.reportHeight() }
  requestAuth(): void { this.sendToParent('plugin:auth-required', { reason: 'token_expired' }) }

  // -- Context --
  getUser(): UserContext | null { return this.user }
  getLocale(): string { return this.locale }
  onContextChange(cb: ContextCallback): () => void {
    this.contextCallbacks.push(cb)
    return () => { this.contextCallbacks = this.contextCallbacks.filter((c) => c !== cb) }
  }

  // -- Active Project --
  onActiveProjectChange(cb: ActiveProjectCallback): () => void {
    this.activeProjectCallbacks.push(cb)
    return () => { this.activeProjectCallbacks = this.activeProjectCallbacks.filter((c) => c !== cb) }
  }

  // -- Private --
  private detectEmbedded(): boolean {
    if (typeof window === 'undefined') return false
    try { return window.self !== window.top } catch { return true }
  }

  private setupMessageListener(): void {
    window.addEventListener('message', this.handleMessage)
  }

  private handleMessage = (event: MessageEvent): void => {
    if (!isAllowedOrigin(event.origin)) return
    const data = event.data as NexusToPluginMessage
    if (!data || data.source !== 'nexus-dashboard') return

    switch (data.type) {
      case 'nexus:auth': this.handleAuth(data.payload as { token: string }); break
      case 'nexus:theme': this.handleThemeUpdate(data.payload as ThemeConfig); break
      case 'nexus:navigate': this.handleNavigate(data.payload as { path: string }); break
      case 'nexus:context': this.handleContext(data.payload as BridgeContext); break
      case 'nexus:locale': this.handleLocale(data.payload as { locale: string }); break
      case 'nexus:activeProject': this.handleActiveProject(data.payload as { project: unknown }); break
    }
  }

  private handleAuth(payload: { token: string }): void {
    this.token = payload.token
    this.tokenCallbacks.forEach((cb) => cb(payload.token))
  }
  private handleThemeUpdate(payload: ThemeConfig): void {
    this.theme = payload
    this.themeCallbacks.forEach((cb) => cb(payload))
  }
  private handleNavigate(payload: { path: string }): void {
    this.currentRoute = payload.path
    this.navigateCallbacks.forEach((cb) => cb(payload.path))
  }
  private handleContext(payload: BridgeContext): void {
    this.user = payload.user
    this.theme = payload.theme
    this.locale = payload.locale
    this.currentRoute = payload.route
    this.contextCallbacks.forEach((cb) => cb(payload))
    this.themeCallbacks.forEach((cb) => cb(payload.theme))
  }
  private handleLocale(payload: { locale: string }): void { this.locale = payload.locale }
  private handleActiveProject(payload: { project: unknown }): void {
    this.activeProjectCallbacks.forEach((cb) => cb(payload.project))
  }

  private sendToParent(type: PluginToNexusMessage['type'], payload: unknown): void {
    if (!this.embedded || typeof window === 'undefined') return
    try {
      window.parent.postMessage(
        { source: 'nexus-plugin', pluginSlug: this.pluginSlug, type, payload } satisfies PluginToNexusMessage,
        '*'
      )
    } catch { /* parent frame destroyed */ }
  }

  private sendReady(): void {
    this.sendToParent('plugin:ready', { pluginSlug: this.pluginSlug, version: '1.0.0' })
  }

  private setupResizeObserver(): void {
    if (typeof document === 'undefined' || typeof ResizeObserver === 'undefined') return
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer)
      this.resizeDebounceTimer = setTimeout(() => this.reportHeight(), 100)
    })
    if (document.body) {
      this.resizeObserver.observe(document.body)
    } else {
      document.addEventListener('DOMContentLoaded', () => { this.resizeObserver?.observe(document.body) })
    }
  }

  private reportHeight(): void {
    if (typeof document === 'undefined') return
    const rawHeight = document.documentElement.scrollHeight
    const height = this.embedded ? Math.min(rawHeight, window.innerHeight) : rawHeight
    if (height !== this.lastReportedHeight) {
      this.lastReportedHeight = height
      this.sendToParent('plugin:resize', { height })
    }
  }
}
