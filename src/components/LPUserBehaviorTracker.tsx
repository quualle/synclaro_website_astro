'use client'

import { useEffect, useRef, useCallback } from 'react'

interface LPUserBehaviorTrackerProps {
  pagePath: string
}

interface SessionData {
  sessionId: string
  pagePath: string
  entryTime: Date
  lastActivity: Date
  totalDurationSeconds: number
  clickCount: number
  sectionsViewed: Set<string>
  maxScrollDepth: number
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
}

// Generate a simple UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Helper functions
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

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
    console.log('[LPTracker] Internal traffic flag SET - tracking disabled')
    return true
  }

  if (urlParams.get('track') === '1') {
    localStorage.removeItem('synclaro_notrack')
    console.log('[LPTracker] Internal traffic flag REMOVED - tracking enabled')
    return false
  }

  // Check persistent flag
  if (localStorage.getItem('synclaro_notrack') === '1') {
    console.log('[LPTracker] Internal traffic detected - tracking disabled')
    return true
  }

  return false
}

export default function LPUserBehaviorTracker({ pagePath }: LPUserBehaviorTrackerProps) {
  const sessionRef = useRef<SessionData | null>(null)
  const clicksRef = useRef<Array<{
    elementId?: string
    elementType: string
    elementLabel?: string
    sectionId?: string
    timestamp: string
    isCta: boolean
  }>>([])
  const sectionsViewedRef = useRef<Array<{
    sectionId: string
    sectionName: string
    timestamp: string
  }>>([])
  const formFieldsRef = useRef<Array<{
    fieldName: string
    fieldType: string
    action: 'focus' | 'blur' | 'input' | 'filled'
    valueLength?: number
    timestamp: string
  }>>([])
  const formSubmittedRef = useRef<boolean>(false)
  const webhookSentRef = useRef<boolean>(false)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Send webhook for page visit via server-side proxy to avoid CORS
  const sendPageVisitWebhook = useCallback(async () => {
    if (!sessionRef.current || webhookSentRef.current) return

    webhookSentRef.current = true

    const session = sessionRef.current

    try {
      // Use server-side API route to proxy webhook call (avoids CORS issues)
      await fetch('/api/lp-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_visit',
          session_id: session.sessionId,
          page_path: session.pagePath,
          entry_time: session.entryTime.toISOString(),
          device_type: getDeviceType(),
          browser: getBrowser(),
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          utm_source: session.utmSource,
          utm_medium: session.utmMedium,
          utm_campaign: session.utmCampaign,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('[LPTracker] Error sending page visit webhook:', error)
    }
  }, [])

  // Send tracking data to API
  const sendTrackingData = useCallback(async (eventType: 'pageview' | 'click' | 'section_view', data: Record<string, unknown> = {}) => {
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          page: pagePath,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          browser: getBrowser(),
          utm_source: sessionRef.current?.utmSource || null,
          utm_medium: sessionRef.current?.utmMedium || null,
          utm_campaign: sessionRef.current?.utmCampaign || null,
          session_id: sessionRef.current?.sessionId || null,
          timestamp: new Date().toISOString(),
          website_domain: 'synclaro.de',
          ...data
        })
      })
    } catch (error) {
      console.error('[LPTracker] Error sending tracking data:', error)
    }
  }, [pagePath])

  // Send session update (duration, clicks, etc.)
  const sendSessionUpdate = useCallback(async () => {
    if (!sessionRef.current) return

    const session = sessionRef.current
    const now = new Date()
    const durationSeconds = Math.floor((now.getTime() - session.entryTime.getTime()) / 1000)

    try {
      // Update session in Supabase via API
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'session_update',
          page: pagePath,
          session_id: session.sessionId,
          website_domain: 'synclaro.de',
          total_duration_seconds: durationSeconds,
          total_clicks: session.clickCount,
          total_sections_viewed: session.sectionsViewed.size,
          max_scroll_depth: session.maxScrollDepth,
          timestamp: now.toISOString()
        })
      })
    } catch (error) {
      console.error('[LPTracker] Error sending session update:', error)
    }
  }, [pagePath])

  // Send LP behavior data (with form interactions) to lp_user_behavior table
  const sendLPBehaviorData = useCallback(async (eventType: string = 'session_end') => {
    if (!sessionRef.current) return

    const session = sessionRef.current
    const now = new Date()
    const durationSeconds = Math.floor((now.getTime() - session.entryTime.getTime()) / 1000)

    try {
      await fetch('/api/lp-behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.sessionId,
          page_path: pagePath,
          event_type: eventType,
          scroll_depth: session.maxScrollDepth,
          time_on_page: durationSeconds,
          interactions: {
            clicks: clicksRef.current.map(c => ({
              element_id: c.elementId,
              element_type: c.elementType,
              element_label: c.elementLabel,
              section_id: c.sectionId,
              is_cta: c.isCta,
              timestamp: c.timestamp
            })),
            form_fields: formFieldsRef.current.map(f => ({
              field_name: f.fieldName,
              field_type: f.fieldType,
              action: f.action,
              value_length: f.valueLength,
              timestamp: f.timestamp
            })),
            sections_viewed: Array.from(session.sectionsViewed),
            form_submitted: formSubmittedRef.current,
            form_submission_time: formSubmittedRef.current ? new Date().toISOString() : undefined
          },
          device_type: getDeviceType(),
          referrer: document.referrer || null,
          user_agent: navigator.userAgent
        })
      })
    } catch (error) {
      console.error('[LPTracker] Error sending LP behavior data:', error)
    }
  }, [pagePath])

  // Initialize session
  const initializeSession = useCallback(() => {
    if (typeof window === 'undefined') return

    const sessionId = sessionStorage.getItem('lp_session_id') || generateUUID()
    sessionStorage.setItem('lp_session_id', sessionId)

    // Extract UTM parameters from URL
    const urlParams = new URLSearchParams(window.location.search)
    const utmSource = urlParams.get('utm_source') || sessionStorage.getItem('utm_source')
    const utmMedium = urlParams.get('utm_medium') || sessionStorage.getItem('utm_medium')
    const utmCampaign = urlParams.get('utm_campaign') || sessionStorage.getItem('utm_campaign')

    // Store UTM parameters
    if (urlParams.get('utm_source')) sessionStorage.setItem('utm_source', urlParams.get('utm_source')!)
    if (urlParams.get('utm_medium')) sessionStorage.setItem('utm_medium', urlParams.get('utm_medium')!)
    if (urlParams.get('utm_campaign')) sessionStorage.setItem('utm_campaign', urlParams.get('utm_campaign')!)

    sessionRef.current = {
      sessionId,
      pagePath,
      entryTime: new Date(),
      lastActivity: new Date(),
      totalDurationSeconds: 0,
      clickCount: 0,
      sectionsViewed: new Set(),
      maxScrollDepth: 0,
      utmSource,
      utmMedium,
      utmCampaign
    }

    // Send initial page view to Supabase
    sendTrackingData('pageview')

    // Send webhook for page visit
    sendPageVisitWebhook()

    // Send initial LP behavior data immediately
    setTimeout(() => sendLPBehaviorData('page_view'), 1000)
  }, [pagePath, sendTrackingData, sendPageVisitWebhook, sendLPBehaviorData])

  // Track section visibility
  const trackSectionView = useCallback((sectionId: string, sectionName: string) => {
    if (!sessionRef.current) return
    if (sessionRef.current.sectionsViewed.has(sectionId)) return

    sessionRef.current.sectionsViewed.add(sectionId)

    sectionsViewedRef.current.push({
      sectionId,
      sectionName,
      timestamp: new Date().toISOString()
    })

    sendTrackingData('section_view', {
      section_id: sectionId,
      section_name: sectionName
    })
  }, [sendTrackingData])

  // Initialize tracking on mount
  useEffect(() => {
    // Skip ALL tracking for internal traffic
    if (isInternalTraffic()) {
      return // Don't initialize session, don't track anything
    }

    initializeSession()

    // Setup intersection observer for sections
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id')
            const sectionName = entry.target.getAttribute('data-section-name')
            if (sectionId && sectionName) {
              trackSectionView(sectionId, sectionName)
            }
          }
        })
      },
      { threshold: 0.5 }
    )

    // Observe all sections
    const observeSections = () => {
      document.querySelectorAll('[data-section-id]').forEach(section => {
        observer.observe(section)
      })
    }

    observeSections()
    // Re-observe after a delay for dynamic content
    setTimeout(observeSections, 1000)

    // Track clicks
    const handleClick = (e: MouseEvent) => {
      if (!sessionRef.current) return

      const target = e.target as HTMLElement
      const elementId = target.id || target.closest('[id]')?.id
      const elementType = target.tagName.toLowerCase()
      const elementLabel = target.textContent?.trim().substring(0, 100)
      const section = target.closest('[data-section-id]')
      const sectionId = section?.getAttribute('data-section-id')

      // Check if it's a CTA
      const isCTA = !!(target.closest('a[href*="bewerbung"], a[href*="beratung"], button[type="submit"], a[href*="kontakt"]') ||
                      target.closest('[class*="bg-swiss-orange"]'))

      sessionRef.current.clickCount++
      sessionRef.current.lastActivity = new Date()

      clicksRef.current.push({
        elementId,
        elementType,
        elementLabel,
        sectionId: sectionId || undefined,
        timestamp: new Date().toISOString(),
        isCta: isCTA
      })

      sendTrackingData('click', {
        element_id: elementId,
        element_type: elementType,
        element_label: elementLabel,
        section_id: sectionId,
        is_cta: isCTA
      })
    }

    document.addEventListener('click', handleClick)

    // Track scroll depth
    const handleScroll = () => {
      if (!sessionRef.current) return

      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = Math.round((scrollTop / docHeight) * 100)

      if (scrollPercent > sessionRef.current.maxScrollDepth) {
        sessionRef.current.maxScrollDepth = scrollPercent
      }

      sessionRef.current.lastActivity = new Date()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Track form field interactions
    const trackFormField = (e: Event, action: 'focus' | 'blur' | 'input') => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      if (!target.name && !target.id) return // Skip fields without identifiers

      const fieldName = target.name || target.id || 'unknown'
      const fieldType = target.type || target.tagName.toLowerCase()

      // For 'input' events, only track significant changes (debounced by checking if value changed)
      if (action === 'input') {
        const lastField = formFieldsRef.current[formFieldsRef.current.length - 1]
        if (lastField?.fieldName === fieldName && lastField?.action === 'input') {
          // Update the last entry instead of adding new one
          lastField.valueLength = target.value?.length || 0
          lastField.timestamp = new Date().toISOString()
          return
        }
      }

      formFieldsRef.current.push({
        fieldName,
        fieldType,
        action,
        valueLength: target.value?.length || 0,
        timestamp: new Date().toISOString()
      })

      // If field has content on blur, mark as 'filled'
      if (action === 'blur' && target.value?.length > 0) {
        formFieldsRef.current.push({
          fieldName,
          fieldType,
          action: 'filled',
          valueLength: target.value.length,
          timestamp: new Date().toISOString()
        })
      }
    }

    const handleFormFocus = (e: Event) => trackFormField(e, 'focus')
    const handleFormBlur = (e: Event) => trackFormField(e, 'blur')
    const handleFormInput = (e: Event) => trackFormField(e, 'input')

    // Track form submissions
    const handleFormSubmit = (e: Event) => {
      formSubmittedRef.current = true
      // Send LP behavior data immediately on form submit
      sendLPBehaviorData('form_submit')
    }

    // Add form listeners to all form elements
    const setupFormTracking = () => {
      const forms = document.querySelectorAll('form')
      const inputs = document.querySelectorAll('input, textarea, select') as NodeListOf<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>

      forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit)
      })

      inputs.forEach(input => {
        input.addEventListener('focus', handleFormFocus)
        input.addEventListener('blur', handleFormBlur)
        input.addEventListener('input', handleFormInput)
      })
    }

    setupFormTracking()
    // Re-setup after a delay for dynamically loaded forms
    setTimeout(setupFormTracking, 2000)

    // Update duration periodically
    durationIntervalRef.current = setInterval(() => {
      if (sessionRef.current) {
        const now = new Date()
        sessionRef.current.totalDurationSeconds = Math.floor(
          (now.getTime() - sessionRef.current.entryTime.getTime()) / 1000
        )
      }
    }, 1000)

    // Send session update every 30 seconds
    const updateInterval = setInterval(sendSessionUpdate, 30000)

    // Send LP behavior data every 30 seconds (always, for reliable tracking)
    const lpBehaviorInterval = setInterval(() => {
      sendLPBehaviorData('heartbeat')
    }, 30000)

    // Send final update before page unload (use sendBeacon for reliability)
    const handleBeforeUnload = () => {
      if (!sessionRef.current) return

      const session = sessionRef.current
      const now = new Date()
      const durationSeconds = Math.floor((now.getTime() - session.entryTime.getTime()) / 1000)

      // Use sendBeacon for reliable delivery on page close
      const data = JSON.stringify({
        session_id: session.sessionId,
        page_path: pagePath,
        event_type: 'session_end',
        scroll_depth: session.maxScrollDepth,
        time_on_page: durationSeconds,
        interactions: {
          clicks: clicksRef.current,
          form_fields: formFieldsRef.current,
          sections_viewed: Array.from(session.sectionsViewed),
          form_submitted: formSubmittedRef.current
        },
        device_type: getDeviceType(),
        referrer: document.referrer || null,
        user_agent: navigator.userAgent
      })

      navigator.sendBeacon('/api/lp-behavior', new Blob([data], { type: 'application/json' }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Also track visibility changes (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendLPBehaviorData('session_end')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      observer.disconnect()
      document.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      clearInterval(updateInterval)
      clearInterval(lpBehaviorInterval)

      // Remove form listeners
      document.querySelectorAll('form').forEach(form => {
        form.removeEventListener('submit', handleFormSubmit)
      })
      ;(document.querySelectorAll('input, textarea, select') as NodeListOf<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>).forEach(input => {
        input.removeEventListener('focus', handleFormFocus)
        input.removeEventListener('blur', handleFormBlur)
        input.removeEventListener('input', handleFormInput)
      })
    }
  }, [initializeSession, trackSectionView, sendTrackingData, sendSessionUpdate, sendLPBehaviorData])

  return null // This component doesn't render anything
}
