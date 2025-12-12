'use client'

import { useEffect, useRef, useCallback } from 'react'

interface LPUserBehaviorTrackerProps {
  webhookUrl: string
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

export default function LPUserBehaviorTracker({ webhookUrl, pagePath }: LPUserBehaviorTrackerProps) {
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
  const webhookSentRef = useRef<boolean>(false)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Send webhook for page visit
  const sendPageVisitWebhook = useCallback(async () => {
    if (!sessionRef.current || webhookSentRef.current) return

    webhookSentRef.current = true

    const session = sessionRef.current

    try {
      await fetch(webhookUrl, {
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
  }, [webhookUrl])

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
  }, [pagePath, sendTrackingData, sendPageVisitWebhook])

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

    // Send final update before page unload
    const handleBeforeUnload = () => {
      sendSessionUpdate()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      observer.disconnect()
      document.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      clearInterval(updateInterval)
    }
  }, [initializeSession, trackSectionView, sendTrackingData, sendSessionUpdate])

  return null // This component doesn't render anything
}
