'use client'

import { useEffect, useRef, useCallback } from 'react'

// Meta Pixel ID
const PIXEL_ID = '1497847851628194'

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

// Hash function for IP (simple hash for privacy)
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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
  const viewContentSentRef = useRef(false)
  const scrollDepthRef = useRef(0)
  const timeOnPageRef = useRef(0)
  const entryTimeRef = useRef<number>(Date.now())

  // Track event to Supabase
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

  // Track Meta Pixel event (client-side)
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

  // Combined tracking function
  const trackEvent = useCallback((
    eventName: string,
    pixelParams: Record<string, any> = {},
    supabaseData: Record<string, any> = {}
  ) => {
    const eventId = generateEventId()

    // Track to Meta Pixel (client-side)
    trackPixelEvent(eventName, eventId, pixelParams)

    // Track to Supabase (for CVL analysis)
    trackToSupabase(eventName, eventId, supabaseData)

    return eventId
  }, [trackPixelEvent, trackToSupabase])

  // Initialize Meta Pixel
  useEffect(() => {
    if (initializedRef.current || typeof window === 'undefined') return
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

    // Get fbclid (Facebook Click ID) - critical for attribution
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

    // Initialize Meta Pixel
    if (!window.fbq) {
      const n = (window.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }) as any
      if (!window._fbq) window._fbq = n
      n.push = n
      n.loaded = true
      n.version = '2.0'
      n.queue = []

      // Load pixel script
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      document.head.appendChild(script)
    }

    // Initialize pixel with advanced matching
    window.fbq('init', PIXEL_ID)

    // Track PageView
    const pageViewEventId = generateEventId()
    window.fbq('track', 'PageView', {}, { eventID: pageViewEventId })
    trackToSupabase('PageView', pageViewEventId)

    // Entry time for time on page calculation
    entryTimeRef.current = Date.now()

    // Update time on page every second
    const timeInterval = setInterval(() => {
      timeOnPageRef.current = Math.floor((Date.now() - entryTimeRef.current) / 1000)
    }, 1000)

    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = Math.round((scrollTop / docHeight) * 100)

      if (scrollPercent > scrollDepthRef.current) {
        scrollDepthRef.current = scrollPercent
      }

      // ViewContent: 30s + 50% scroll (Engaged Visitor)
      if (!viewContentSentRef.current &&
          scrollDepthRef.current >= 50 &&
          timeOnPageRef.current >= 30) {
        viewContentSentRef.current = true
        trackEvent('ViewContent', {
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
    const viewContentInterval = setInterval(() => {
      if (!viewContentSentRef.current &&
          scrollDepthRef.current >= 50 &&
          timeOnPageRef.current >= 30) {
        viewContentSentRef.current = true
        trackEvent('ViewContent', {
          content_name: 'KI-Coaching Landing Page',
          content_category: 'coaching',
          content_type: 'landing_page'
        }, {
          scroll_depth: scrollDepthRef.current,
          time_on_page: timeOnPageRef.current
        })
        clearInterval(viewContentInterval)
      }
    }, 5000)

    // Listen for custom events from form submission
    const handleLeadEvent = (e: CustomEvent) => {
      const { applicationId } = e.detail || {}
      trackEvent('Lead', {
        content_name: 'KI-Coaching Bewerbung',
        content_category: 'coaching',
        currency: 'EUR',
        value: 0 // Lead value for ROAS tracking
      }, {
        application_id: applicationId,
        scroll_depth: scrollDepthRef.current,
        time_on_page: timeOnPageRef.current
      })
    }

    const handleScheduleEvent = (e: CustomEvent) => {
      const { applicationId, appointmentDatetime } = e.detail || {}
      trackEvent('Schedule', {
        content_name: 'KI-Coaching Termin',
        content_category: 'coaching',
        currency: 'EUR',
        value: 0 // Can be set to estimated value
      }, {
        application_id: applicationId,
        appointment_date: appointmentDatetime,
        scroll_depth: scrollDepthRef.current,
        time_on_page: timeOnPageRef.current
      })
    }

    window.addEventListener('meta_lead' as any, handleLeadEvent)
    window.addEventListener('meta_schedule' as any, handleScheduleEvent)

    // Cleanup
    return () => {
      clearInterval(timeInterval)
      clearInterval(viewContentInterval)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('meta_lead' as any, handleLeadEvent)
      window.removeEventListener('meta_schedule' as any, handleScheduleEvent)
    }
  }, [trackEvent, trackToSupabase])

  return null // This component doesn't render anything
}

// Export helper function to trigger events from other components
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
