'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UserBehaviorTrackerProps {
  websiteDomain: 'synclaro.de' | 'academy.synclaro.de' | 'solutions.synclaro.de' | 'advisory.synclaro.de'
}

// Check if this is internal/test traffic that should not be tracked
function isInternalTraffic(): boolean {
  if (typeof window === 'undefined') return false

  const urlParams = new URLSearchParams(window.location.search)

  // Check URL params first - allow toggling
  if (urlParams.get('notrack') === '1' || urlParams.get('internal') === '1') {
    localStorage.setItem('synclaro_notrack', '1')
    console.log('[UserBehavior] Internal traffic flag SET - tracking disabled')
    return true
  }

  if (urlParams.get('track') === '1') {
    localStorage.removeItem('synclaro_notrack')
    console.log('[UserBehavior] Internal traffic flag REMOVED - tracking enabled')
    return false
  }

  // Check persistent flag
  if (localStorage.getItem('synclaro_notrack') === '1') {
    console.log('[UserBehavior] Internal traffic detected - tracking disabled')
    return true
  }

  return false
}

interface SessionData {
  sessionId: string
  websiteDomain: string
  pagePath: string
  entryTime: string
  clickCount: number
  sectionsViewed: Set<string>
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

export default function UserBehaviorTracker({ websiteDomain }: UserBehaviorTrackerProps) {
  const sessionRef = useRef<SessionData | null>(null)
  const observedElements = useRef<Set<Element>>(new Set())
  const visibilityObserverRef = useRef<IntersectionObserver | null>(null)
  const activeSessionRef = useRef<boolean>(false)

  // Send tracking data
  const sendTrackingData = useCallback(async (eventType: 'pageview' | 'click' | 'section_view', data: Record<string, unknown> = {}) => {
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          page: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          browser: getBrowser(),
          utm_source: sessionRef.current?.utmSource || null,
          utm_medium: sessionRef.current?.utmMedium || null,
          utm_campaign: sessionRef.current?.utmCampaign || null,
          session_id: sessionRef.current?.sessionId || null,
          timestamp: new Date().toISOString(),
          website_domain: websiteDomain,
          ...data
        })
      })
    } catch (error) {
      console.error('[UserBehaviorTracker] Error sending tracking data:', error)
    }
  }, [websiteDomain])

  // Initialize session
  const initializeSession = useCallback(() => {
    if (typeof window === 'undefined') return

    const sessionId = sessionStorage.getItem('user_behavior_session_id') || generateUUID()
    sessionStorage.setItem('user_behavior_session_id', sessionId)

    const pagePath = window.location.pathname

    // Extract UTM parameters from URL
    const urlParams = new URLSearchParams(window.location.search)
    const utmSource = urlParams.get('utm_source')
    const utmMedium = urlParams.get('utm_medium')
    const utmCampaign = urlParams.get('utm_campaign')

    // Store UTM parameters in sessionStorage (persist for entire session)
    if (utmSource) sessionStorage.setItem('utm_source', utmSource)
    if (utmMedium) sessionStorage.setItem('utm_medium', utmMedium)
    if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign)

    // Retrieve UTM parameters (either from URL or sessionStorage)
    const storedUtmSource = utmSource || sessionStorage.getItem('utm_source')
    const storedUtmMedium = utmMedium || sessionStorage.getItem('utm_medium')
    const storedUtmCampaign = utmCampaign || sessionStorage.getItem('utm_campaign')

    sessionRef.current = {
      sessionId,
      websiteDomain,
      pagePath,
      entryTime: new Date().toISOString(),
      clickCount: 0,
      sectionsViewed: new Set(),
      utmSource: storedUtmSource,
      utmMedium: storedUtmMedium,
      utmCampaign: storedUtmCampaign
    }

    activeSessionRef.current = true

    // Send initial page view
    sendTrackingData('pageview')
  }, [websiteDomain, sendTrackingData])

  // Track section visibility
  const trackSectionView = useCallback((sectionId: string, sectionName: string, isVisible: boolean) => {
    if (!sessionRef.current || !isVisible) return

    if (!sessionRef.current.sectionsViewed.has(sectionId)) {
      sessionRef.current.sectionsViewed.add(sectionId)
      sendTrackingData('section_view', {
        section_id: sectionId,
        section_name: sectionName
      })
    }
  }, [sendTrackingData])

  // Setup intersection observer for sections
  const observeSection = useCallback((element: Element) => {
    if (!visibilityObserverRef.current) {
      visibilityObserverRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const sectionId = entry.target.getAttribute('data-section-id')
            const sectionName = entry.target.getAttribute('data-section-name')

            if (sectionId && sectionName) {
              trackSectionView(sectionId, sectionName, entry.isIntersecting)
            }
          })
        },
        { threshold: 0.5 } // 50% visible
      )
    }

    visibilityObserverRef.current.observe(element)
  }, [trackSectionView])

  // Cleanup observer
  const unobserveSection = useCallback((element: Element) => {
    if (visibilityObserverRef.current) {
      visibilityObserverRef.current.unobserve(element)
    }
  }, [])

  // Find and observe sections
  const findAndObserveSections = useCallback(() => {
    const sections = document.querySelectorAll('[data-section-id]')

    sections.forEach((section) => {
      if (!observedElements.current.has(section)) {
        observeSection(section)
        observedElements.current.add(section)
      }
    })
  }, [observeSection])

  // Initialize tracking on mount
  useEffect(() => {
    // Skip ALL tracking for internal traffic
    if (isInternalTraffic()) {
      return // Don't initialize session, don't track anything
    }

    initializeSession()

    // Initial observation
    findAndObserveSections()

    // Re-observe after a delay (in case sections are rendered dynamically)
    const timeoutId = setTimeout(findAndObserveSections, 1000)

    // Setup mutation observer to detect new sections
    const mutationObserver = new MutationObserver(() => {
      findAndObserveSections()
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Track global clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const elementId = target.id || target.closest('[id]')?.id
      const elementType = target.tagName.toLowerCase()
      const elementLabel = target.textContent?.trim().substring(0, 100)
      const section = target.closest('[data-section-id]')
      const sectionId = section?.getAttribute('data-section-id')

      // Check if it's a CTA
      const isCTA = target.closest('a[href*="beratung"], button[type="submit"], a[href*="kontakt"], a[href*="tel:"], a[href*="mailto:"]')

      if (sessionRef.current) {
        sessionRef.current.clickCount++
      }

      sendTrackingData('click', {
        element_id: elementId,
        element_type: elementType,
        element_label: elementLabel,
        section_id: sectionId,
        is_cta: !!isCTA
      })
    }

    document.addEventListener('click', handleClick)

    // Cleanup
    return () => {
      clearTimeout(timeoutId)
      mutationObserver.disconnect()
      document.removeEventListener('click', handleClick)

      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect()
      }

      // Unobserve all sections
      observedElements.current.forEach((element) => {
        unobserveSection(element)
      })
      observedElements.current.clear()
    }
  }, [initializeSession, sendTrackingData, findAndObserveSections, unobserveSection])

  return null // This component doesn't render anything
}
