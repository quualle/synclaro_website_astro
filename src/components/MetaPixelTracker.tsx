'use client'

import { useEffect, useRef, useCallback } from 'react'

// Meta Pixel ID
const PIXEL_ID = '1497847851628194'

// Tracking Configuration
const HEARTBEAT_INTERVAL_MS = 10000 // Send heartbeat every 10 seconds
const BOUNCE_THRESHOLD_SECONDS = 5 // Less than 5s = bounce
const VIEW_CONTENT_THRESHOLD_SECONDS = 10 // ViewContent fires at 10s (was 30s)

interface MetaPixelTrackerProps {
  pagePath: string
}

// Declare fbq for TypeScript
declare global {
  interface Window {
    fbq: any
    _fbq: any
  }
}

// Generate unique event ID for deduplication
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Get device type
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// Get browser name
function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return 'Other'
}

// Check if this is internal/test traffic that should not be tracked
function isInternalTraffic(): boolean {
  if (typeof window === 'undefined') return false

  const urlParams = new URLSearchParams(window.location.search)

  // Check URL params first - allow toggling
  if (urlParams.get('notrack') === '1' || urlParams.get('internal') === '1') {
    localStorage.setItem('synclaro_notrack', '1')
    console.log('[Tracking] Internal traffic flag SET - tracking disabled')
    return true
  }

  if (urlParams.get('track') === '1') {
    localStorage.removeItem('synclaro_notrack')
    console.log('[Tracking] Internal traffic flag REMOVED - tracking enabled')
    return false
  }

  // Check persistent flag
  if (localStorage.getItem('synclaro_notrack') === '1') {
    console.log('[Tracking] Internal traffic detected - tracking disabled')
    return true
  }

  return false
}

export default function MetaPixelTracker({ pagePath }: MetaPixelTrackerProps) {
  const initializedRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const visitorIdRef = useRef<string | null>(null)
  const fbclidRef = useRef<string | null>(null)
  const utmParamsRef = useRef<{
    source: string | null
    medium: string | null
    campaign: string | null
    content: string | null
    term: string | null
  }>({ source: null, medium: null, campaign: null, content: null, term: null })

  // Meta Pixel state
  const viewContentSentRef = useRef(false)

  // Granular tracking state
  const scrollDepthRef = useRef(0)
  const timeOnPageRef = useRef(0)
  const entryTimeRef = useRef<number>(Date.now())
  const lastHeartbeatRef = useRef<number>(0)
  const sessionCreatedRef = useRef(false)

  // Callback refs - stable references for event handlers
  const trackSessionRef = useRef<typeof trackSession | null>(null)
  const trackEventRef = useRef<typeof trackEvent | null>(null)

  // ========== GRANULAR SESSION TRACKING (NEW) ==========

  const trackSession = useCallback(async (
    action: 'create' | 'heartbeat' | 'form_open' | 'form_submit' | 'end'
  ) => {
    if (!sessionIdRef.current) return

    try {
      await fetch('/api/lp-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          session_id: sessionIdRef.current,
          visitor_id: visitorIdRef.current,
          page_path: pagePath,
          page_url: window.location.href,
          device_type: getDeviceType(),
          browser: getBrowser(),
          user_agent: navigator.userAgent,
          utm_source: utmParamsRef.current.source,
          utm_medium: utmParamsRef.current.medium,
          utm_campaign: utmParamsRef.current.campaign,
          utm_content: utmParamsRef.current.content,
          utm_term: utmParamsRef.current.term,
          fbclid: fbclidRef.current,
          referrer: document.referrer || null,
          time_on_page_seconds: timeOnPageRef.current,
          max_scroll_depth: scrollDepthRef.current,
        })
      })
      console.log(`[Session] ${action}: ${timeOnPageRef.current}s, ${scrollDepthRef.current}% scroll`)
    } catch (error) {
      console.error('[Session] Error:', error)
    }
  }, [pagePath])

  // ========== META PIXEL TRACKING (EXISTING) ==========

  const trackToSupabase = useCallback(async (
    eventName: string,
    eventId: string,
    additionalData: Record<string, any> = {}
  ) => {
    try {
      await fetch('/api/meta-pixel-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: eventName,
          event_id: eventId,
          session_id: sessionIdRef.current,
          visitor_id: visitorIdRef.current,
          fbclid: fbclidRef.current,
          utm_source: utmParamsRef.current.source,
          utm_medium: utmParamsRef.current.medium,
          utm_campaign: utmParamsRef.current.campaign,
          utm_content: utmParamsRef.current.content,
          utm_term: utmParamsRef.current.term,
          page_url: window.location.href,
          page_path: pagePath,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          browser: getBrowser(),
          scroll_depth: scrollDepthRef.current,
          time_on_page: timeOnPageRef.current,
          ...additionalData
        })
      })
    } catch (error) {
      console.error('[MetaPixel] Error tracking to Supabase:', error)
    }
  }, [pagePath])

  const trackPixelEvent = useCallback((
    eventName: string,
    eventId: string,
    params: Record<string, any> = {}
  ) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, params, { eventID: eventId })
      console.log(`[MetaPixel] Tracked: ${eventName}`, { eventId, params })
    }
  }, [])

  const trackEvent = useCallback((
    eventName: string,
    pixelParams: Record<string, any> = {},
    supabaseData: Record<string, any> = {}
  ) => {
    const eventId = generateEventId()
    trackPixelEvent(eventName, eventId, pixelParams)
    trackToSupabase(eventName, eventId, supabaseData)
    return eventId
  }, [trackPixelEvent, trackToSupabase])

  // Keep refs in sync with callbacks (prevents stale closures in event handlers)
  useEffect(() => {
    trackSessionRef.current = trackSession
    trackEventRef.current = trackEvent
  }, [trackSession, trackEvent])

  // ========== INITIALIZATION ==========

  useEffect(() => {
    if (initializedRef.current || typeof window === 'undefined') return

    // Skip ALL tracking for internal traffic
    if (isInternalTraffic()) {
      initializedRef.current = true
      return
    }

    initializedRef.current = true

    // Initialize session
    const sessionId = sessionStorage.getItem('meta_session_id') || generateEventId()
    sessionStorage.setItem('meta_session_id', sessionId)
    sessionIdRef.current = sessionId

    // Get or create visitor ID (persistent)
    let visitorId = localStorage.getItem('meta_visitor_id')
    if (!visitorId) {
      visitorId = generateEventId()
      localStorage.setItem('meta_visitor_id', visitorId)
    }
    visitorIdRef.current = visitorId

    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search)

    // Get fbclid (Facebook Click ID)
    const fbclid = urlParams.get('fbclid')
    if (fbclid) {
      fbclidRef.current = fbclid
      sessionStorage.setItem('fbclid', fbclid)
    } else {
      fbclidRef.current = sessionStorage.getItem('fbclid')
    }

    // Get UTM parameters
    const utmSource = urlParams.get('utm_source') || sessionStorage.getItem('utm_source')
    const utmMedium = urlParams.get('utm_medium') || sessionStorage.getItem('utm_medium')
    const utmCampaign = urlParams.get('utm_campaign') || sessionStorage.getItem('utm_campaign')
    const utmContent = urlParams.get('utm_content') || sessionStorage.getItem('utm_content')
    const utmTerm = urlParams.get('utm_term') || sessionStorage.getItem('utm_term')

    // Store UTM parameters
    if (urlParams.get('utm_source')) sessionStorage.setItem('utm_source', urlParams.get('utm_source')!)
    if (urlParams.get('utm_medium')) sessionStorage.setItem('utm_medium', urlParams.get('utm_medium')!)
    if (urlParams.get('utm_campaign')) sessionStorage.setItem('utm_campaign', urlParams.get('utm_campaign')!)
    if (urlParams.get('utm_content')) sessionStorage.setItem('utm_content', urlParams.get('utm_content')!)
    if (urlParams.get('utm_term')) sessionStorage.setItem('utm_term', urlParams.get('utm_term')!)

    utmParamsRef.current = {
      source: utmSource,
      medium: utmMedium,
      campaign: utmCampaign,
      content: utmContent,
      term: utmTerm
    }

    // ========== META PIXEL INIT ==========

    if (!window.fbq) {
      const n = (window.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }) as any
      if (!window._fbq) window._fbq = n
      n.push = n
      n.loaded = true
      n.version = '2.0'
      n.queue = []

      const script = document.createElement('script')
      script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      document.head.appendChild(script)
    }

    window.fbq('init', PIXEL_ID)

    // Track PageView (Meta Pixel)
    const pageViewEventId = generateEventId()
    window.fbq('track', 'PageView', {}, { eventID: pageViewEventId })
    trackToSupabase('PageView', pageViewEventId)

    // ========== GRANULAR SESSION TRACKING ==========

    entryTimeRef.current = Date.now()

    // Create session in new tracking table
    if (!sessionCreatedRef.current) {
      sessionCreatedRef.current = true
      trackSession('create')
    }

    // Update time every second (for accurate tracking)
    const timeInterval = window.setInterval(() => {
      timeOnPageRef.current = Math.floor((Date.now() - entryTimeRef.current) / 1000)
    }, 1000)

    // Send heartbeat every 10 seconds
    const heartbeatInterval = window.setInterval(() => {
      const now = Date.now()
      if (now - lastHeartbeatRef.current >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatRef.current = now
        trackSessionRef.current?.('heartbeat')
      }
    }, HEARTBEAT_INTERVAL_MS)

    // Track scroll depth continuously
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) {
        const scrollPercent = Math.round((scrollTop / docHeight) * 100)
        if (scrollPercent > scrollDepthRef.current) {
          scrollDepthRef.current = scrollPercent
        }
      }

      // ViewContent: 10s + 50% scroll (for Meta Pixel optimization)
      if (!viewContentSentRef.current &&
          scrollDepthRef.current >= 50 &&
          timeOnPageRef.current >= VIEW_CONTENT_THRESHOLD_SECONDS) {
        viewContentSentRef.current = true
        trackEventRef.current?.('ViewContent', {
          content_name: 'KI-Coaching Landing Page',
          content_category: 'coaching',
          content_type: 'landing_page'
        }, {
          scroll_depth: scrollDepthRef.current,
          time_on_page: timeOnPageRef.current
        })
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Also check ViewContent criteria periodically
    const viewContentInterval = window.setInterval(() => {
      if (!viewContentSentRef.current &&
          scrollDepthRef.current >= 50 &&
          timeOnPageRef.current >= VIEW_CONTENT_THRESHOLD_SECONDS) {
        viewContentSentRef.current = true
        trackEventRef.current?.('ViewContent', {
          content_name: 'KI-Coaching Landing Page',
          content_category: 'coaching',
          content_type: 'landing_page'
        }, {
          scroll_depth: scrollDepthRef.current,
          time_on_page: timeOnPageRef.current
        })
        clearInterval(viewContentInterval)
      }
    }, 2000)

    // ========== PAGE LEAVE TRACKING ==========

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Send final heartbeat when tab becomes hidden
        trackSessionRef.current?.('heartbeat')
      }
    }

    const handleBeforeUnload = () => {
      // Send end session signal
      // Using sendBeacon for reliability during page unload
      const data = JSON.stringify({
        action: 'end',
        session_id: sessionIdRef.current,
        time_on_page_seconds: timeOnPageRef.current,
        max_scroll_depth: scrollDepthRef.current,
      })
      navigator.sendBeacon('/api/lp-session', data)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // ========== FORM EVENTS ==========
    // Using refs to avoid stale closures when dependencies change

    const handleFormOpen = () => {
      trackSessionRef.current?.('form_open')
    }

    const handleLeadEvent = (e: CustomEvent) => {
      const { applicationId } = e.detail || {}

      // Track to granular session
      trackSessionRef.current?.('form_submit')

      // Track to Meta Pixel (existing)
      trackEventRef.current?.('Lead', {
        content_name: 'KI-Coaching Bewerbung',
        content_category: 'coaching',
        currency: 'EUR',
        value: 0
      }, {
        application_id: applicationId,
        scroll_depth: scrollDepthRef.current,
        time_on_page: timeOnPageRef.current
      })
    }

    const handleScheduleEvent = (e: CustomEvent) => {
      const { applicationId, appointmentDatetime } = e.detail || {}
      trackEventRef.current?.('Schedule', {
        content_name: 'KI-Coaching Termin',
        content_category: 'coaching',
        currency: 'EUR',
        value: 0
      }, {
        application_id: applicationId,
        appointment_date: appointmentDatetime,
        scroll_depth: scrollDepthRef.current,
        time_on_page: timeOnPageRef.current
      })
    }

    window.addEventListener('form_modal_open' as any, handleFormOpen)
    window.addEventListener('meta_lead' as any, handleLeadEvent)
    window.addEventListener('meta_schedule' as any, handleScheduleEvent)

    // ========== CTA TRACKING SYSTEM ==========
    // Centralized cta_impression + cta_click tracking with sessionStorage deduping
    // Use window-level storage to persist across React re-mounts
    const CTA_TRACKING_KEY = '__synclaro_cta_tracking__'

    // Check if already initialized - if so, skip entirely (no cleanup of existing observers)
    if ((window as any)[CTA_TRACKING_KEY]?.initialized) {
      console.log('[CTA] Already initialized, reusing existing observers')
    } else {
      // Initialize tracking state on window
      (window as any)[CTA_TRACKING_KEY] = { initialized: true }
      console.log('[CTA] Initializing CTA tracking system...')

      const CTA_IMPRESSIONS_KEY = 'synclaro_cta_impressions'
      let ctaObserver: IntersectionObserver
      let stickyMutationObserver: MutationObserver | null = null
      let handleCtaClick: (e: MouseEvent) => void

      // Get already-impressed CTAs from sessionStorage
      function getImpressedCtaIds(): Set<string> {
        try {
          const stored = sessionStorage.getItem(CTA_IMPRESSIONS_KEY)
          return stored ? new Set(JSON.parse(stored)) : new Set()
        } catch {
          return new Set()
        }
      }

      // Save impressed CTA to sessionStorage
      function saveImpressedCtaId(ctaId: string) {
        try {
          const impressed = getImpressedCtaIds()
          impressed.add(ctaId)
          sessionStorage.setItem(CTA_IMPRESSIONS_KEY, JSON.stringify([...impressed]))
        } catch {
          // Ignore storage errors
        }
      }

      // Check if CTA was already impressed this session
      function wasCtaImpressed(ctaId: string): boolean {
        return getImpressedCtaIds().has(ctaId)
      }

      // Send CTA event to API
      async function sendCtaEvent(eventType: 'cta_impression' | 'cta_click', ctaId: string, ctaPosition: string, extraData: Record<string, any> = {}) {
        const payload = {
          action: eventType,
          session_id: sessionIdRef.current,
          visitor_id: visitorIdRef.current,
          event_payload: {
            cta_id: ctaId,
            cta_position: ctaPosition,
            path: pagePath,
            ts: Date.now(),
            scroll_depth: scrollDepthRef.current,
            viewport_h: window.innerHeight,
            viewport_w: window.innerWidth,
            form_variant: 'v3_single_page',
            user_agent: navigator.userAgent,
            ...extraData,
          },
        }

        try {
          await fetch('/api/lp-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          console.log(`[CTA] ${eventType}: ${ctaId} (session: ${sessionIdRef.current?.slice(-8)})`)
        } catch (e) {
          console.error(`[CTA] Failed to send ${eventType}:`, e)
        }
      }

      // Track CTA impression (with sessionStorage dedupe)
      function trackCtaImpression(ctaId: string, ctaPosition: string) {
        if (wasCtaImpressed(ctaId)) {
          console.log(`[CTA] Skip impression (already tracked): ${ctaId}`)
          return
        }
        saveImpressedCtaId(ctaId)
        sendCtaEvent('cta_impression', ctaId, ctaPosition)
      }

      // Track CTA click (no dedupe - each click counts)
      function trackCtaClick(ctaId: string, ctaPosition: string, buttonText?: string) {
        sendCtaEvent('cta_click', ctaId, ctaPosition, { button_text: buttonText })
      }

      // IntersectionObserver for CTA impressions
      ctaObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target as HTMLElement
            const ctaId = el.dataset.ctaId

            if (entry.isIntersecting) {
              const ctaPosition = el.dataset.ctaPosition

              // Check if element is truly visible (not hidden via transform/display)
              const style = getComputedStyle(el)
              const rect = el.getBoundingClientRect()
              const isHidden = style.display === 'none' ||
                              style.visibility === 'hidden' ||
                              style.opacity === '0' ||
                              rect.height === 0

              if (ctaId && ctaPosition && !isHidden) {
                trackCtaImpression(ctaId, ctaPosition)
              }
            }
          })
        },
        { threshold: 0.5 }
      )

      // Observe all CTAs with data-cta-id (except sticky - handled separately)
      const ctaElements = document.querySelectorAll('[data-cta-id]:not([data-cta-id="sticky_cta"])')
      console.log(`[CTA] Found ${ctaElements.length} CTA elements to observe`)
      ctaElements.forEach((el) => {
        ctaObserver!.observe(el)
      })

      // Special handling for sticky CTA - only observe when visible
      const stickyCtaEl = document.querySelector('[data-cta-id="sticky_cta"]') as HTMLElement
      let stickyObserved = false

      function updateStickyObservation() {
        if (!stickyCtaEl || !ctaObserver) return
        const container = stickyCtaEl.closest('#sticky-cta-container') as HTMLElement
        if (!container) return

        const isVisible = container.style.transform === 'translateY(0)' ||
                         container.style.transform === 'translateY(0px)'

        if (isVisible && !stickyObserved) {
          stickyObserved = true
          ctaObserver.observe(stickyCtaEl)
          console.log('[CTA] Sticky CTA now observed')
        } else if (!isVisible && stickyObserved) {
          stickyObserved = false
          ctaObserver.unobserve(stickyCtaEl)
          console.log('[CTA] Sticky CTA unobserved')
        }
      }

      // MutationObserver to watch for sticky visibility changes
      const stickyContainer = document.getElementById('sticky-cta-container')

      if (stickyContainer) {
        stickyMutationObserver = new MutationObserver(() => {
          updateStickyObservation()
        })
        stickyMutationObserver.observe(stickyContainer, {
          attributes: true,
          attributeFilter: ['style']
        })
        // Initial check
        updateStickyObservation()
      }

      // Global click handler for all CTAs
      handleCtaClick = (e: MouseEvent) => {
        const target = (e.target as HTMLElement).closest('[data-cta-id]') as HTMLElement
        if (target) {
          const ctaId = target.dataset.ctaId
          const ctaPosition = target.dataset.ctaPosition
          const buttonText = target.textContent?.trim().split('\n')[0] || ''
          if (ctaId && ctaPosition) {
            trackCtaClick(ctaId, ctaPosition, buttonText)
          }
        }
      }

      document.addEventListener('click', handleCtaClick)
    }
    // Note: CTA observers are NOT cleaned up - they persist globally across re-mounts

    // ========== CLEANUP ==========

    return () => {
      clearInterval(timeInterval)
      clearInterval(heartbeatInterval)
      clearInterval(viewContentInterval)
      window.removeEventListener('scroll', handleScroll)
      // Note: CTA observers persist globally - don't disconnect them here
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('form_modal_open' as any, handleFormOpen)
      window.removeEventListener('meta_lead' as any, handleLeadEvent)
      window.removeEventListener('meta_schedule' as any, handleScheduleEvent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagePath]) // Only re-run if pagePath changes, callbacks are accessed via refs

  return null
}

// Export helper functions for triggering events from other components
export function triggerMetaLeadEvent(applicationId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meta_lead', {
      detail: { applicationId }
    }))
  }
}

export function triggerMetaScheduleEvent(applicationId: string, appointmentDatetime: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meta_schedule', {
      detail: { applicationId, appointmentDatetime }
    }))
  }
}

export function triggerFormModalOpen() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('form_modal_open'))
  }
}
