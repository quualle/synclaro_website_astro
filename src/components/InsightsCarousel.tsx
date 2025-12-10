'use client'

import { useState, useRef, useEffect } from 'react'

interface Insight {
  id: string
  category: string
  title: string
  subtitle: string
  description: string
  videoSrc?: string
  hoverVideoSrc?: string
  gradient: string
}

const insights: Insight[] = [
  {
    id: 'companygpt',
    category: 'USE CASE',
    title: 'Use Case: Wissensmanagement durch Company GPT',
    subtitle: 'Für informationslastige Jobs ab 10 Mitarbeitern.',
    description: 'Speziell für KMUs entwickelt: Ihr gesamtes Firmenwissen rechtssicher in einem System. Keine Cloud-Risiken, volle Kontrolle. Unsere Lösung berücksichtigt Betriebsvereinbarungen und deutsche Datenschutzstandards. Sinnvoll ab 10 Mitarbeitern bei informationslastigen Jobs - nach oben ohne Limit.',
    videoSrc: '/ai-automation-consultancy.mp4',
    gradient: 'from-orange-500 to-red-600'
  },
  {
    id: 'smartbuero',
    category: 'USE CASE',
    title: 'Use Case: KI-Integration im Dokumentenmanagement',
    subtitle: 'GoBD-konform, revisionssicher, KI-unterstützt.',
    description: 'Viele Mittelständler haben bereits ein DMS – aber nutzen Sie dessen KI-Potenzial? Wir integrieren intelligente Suche und Automatisierung in Ihre bestehende Infrastruktur. 100% compliant mit GoBD, DSGVO und kommenden AI Act.',
    videoSrc: '/dms-before.mp4',
    hoverVideoSrc: '/dms-after.mp4',
    gradient: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'schattendaten',
    category: 'USE CASE',
    title: 'Use Case: Schattendaten',
    subtitle: 'Warum KMUs hier einen Vorteil gegenüber Konzernen haben.',
    description: 'Als Mittelständler haben Sie einen entscheidenden Vorteil: überschaubare Datenmengen, klare Strukturen. Wir helfen Ihnen, aus E-Mails, Chats und Dokumenten verwertbare KPIs zu generieren – ohne millionenschwere BI-Systeme.',
    videoSrc: '/ai-study.mp4',
    gradient: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'ki-readiness-study',
    category: 'MITTELSTANDS-STUDIE',
    title: 'KI-Readiness im digitalen Mittelstand 2025',
    subtitle: 'Warum digitalisierte KMUs bei KI zögern.',
    description: 'Paradox: Gerade digital fortgeschrittene Mittelständler scheuen KI-Integration. Gründe: Rechtsunsicherheit (67%), fehlendes Know-how (54%), Angst vor Kontrollverlust (41%). Unsere Studie zeigt Lösungswege speziell für Unternehmen mit 10-250 Mitarbeitern.',
    videoSrc: '/consulting.mp4',
    gradient: 'from-orange-600 to-red-600'
  },
  {
    id: 'synclaro-weg',
    category: 'KMU-METHODIK',
    title: 'Der Synclaro-Weg: KI-Integration für den Mittelstand',
    subtitle: 'Pragmatisch, rechtssicher, messbar.',
    description: 'Konzernmethoden funktionieren nicht im Mittelstand. Unser Ansatz: Schnelle Piloten, überschaubare Budgets, klare Meilensteine. Durchschnittliche Projektdauer: 8 Wochen. Durchschnittliches Investment: 15-30k€. Durchschnittlicher ROI: 6 Monate.',
    videoSrc: '/social_u3151352297_Front_eines_White_Papers_fr_Unternehmens-GPTs_--a_53d860be-a5b4-4a87-b0f4-1a9f922fb700_3.mp4',
    gradient: 'from-indigo-500 to-purple-600'
  },
  {
    id: 'ai-act-dsgvo',
    category: 'RECHTSSICHERHEIT',
    title: 'AI Act & DSGVO: Praxisleitfaden für KMUs',
    subtitle: 'Was Mittelständler wirklich beachten müssen.',
    description: 'Der AI Act kommt – aber keine Panik! 90% der KMU-Anwendungen fallen unter "minimales Risiko". Wir zeigen Ihnen, welche Dokumentation Sie wirklich brauchen, wie Sie Betriebsräte einbinden und warum "Made in Germany" Ihr Wettbewerbsvorteil wird.',
    videoSrc: '/document-management.mp4',
    gradient: 'from-rose-500 to-pink-600'
  }
]

function InsightCard({ insight }: { insight: Insight }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isTapped, setIsTapped] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hoverVideoRef = useRef<HTMLVideoElement>(null)

  const isActive = isHovered || isTapped

  return (
    <div
      className="relative w-[320px] sm:w-[340px] h-[420px] sm:h-[460px] flex-shrink-0 overflow-hidden cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsTapped(!isTapped)}
    >
      {/* Card Container with Swiss Design */}
      <div className={`relative w-full h-full bg-white border-2 border-black transition-all duration-500 ${isActive ? 'shadow-none' : 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>

        {/* Video/Gradient Background */}
        <div className={`absolute inset-0 transition-transform duration-700 ${isActive ? 'scale-110' : 'scale-100'}`}>
          {insight.videoSrc ? (
            <>
              {/* Default video */}
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isActive && insight.hoverVideoSrc ? 'opacity-0' : 'opacity-100'}`}
                autoPlay
                loop
                muted
                playsInline
              >
                <source src={insight.videoSrc} type="video/mp4" />
              </video>
              {/* Hover video (if exists) */}
              {insight.hoverVideoSrc && (
                <video
                  ref={hoverVideoRef}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                  autoPlay
                  loop
                  muted
                  playsInline
                >
                  <source src={insight.hoverVideoSrc} type="video/mp4" />
                </video>
              )}
            </>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${insight.gradient}`} />
          )}

          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60" />
        </div>

        {/* Swiss Design Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-swiss-orange z-20" />

        {/* Title (disappears on hover/tap) */}
        <div
          className={`absolute inset-x-0 top-0 p-6 text-white z-20 transition-all duration-300 ${isActive ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}
        >
          {/* Category Badge */}
          <div className="inline-block px-3 py-1 bg-swiss-orange/90 border border-white/20 mb-4">
            <span className="font-mono text-[10px] tracking-widest uppercase text-white">
              {insight.category}
            </span>
          </div>

          <h3 className="text-xl font-black leading-tight tracking-tight">
            {insight.title.includes(':') ? (
              <>
                <span className="text-swiss-orange text-sm font-mono">{insight.title.split(':')[0]}:</span>
                <span className="block mt-1">{insight.title.split(':')[1]}</span>
              </>
            ) : (
              insight.title
            )}
          </h3>

          <p className="text-sm text-white/70 mt-2 font-medium">
            {insight.subtitle}
          </p>
        </div>

        {/* Hover/Tap Content (slides in from bottom) */}
        <div
          className={`absolute inset-0 bg-black/95 p-6 flex flex-col justify-center z-30 transition-transform duration-500 ease-out ${isActive ? 'translate-y-0' : 'translate-y-full'}`}
        >
          {/* Orange accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-swiss-orange" />

          <p className="text-white/90 text-sm leading-relaxed mb-6">
            {insight.description}
          </p>

          <div className="flex items-center justify-between">
            <a
              href="/kontakt"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-swiss-orange text-white font-bold text-sm border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-200"
            >
              Mehr erfahren
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsTapped(false)
                setIsHovered(false)
              }}
              className="p-2 text-white/60 hover:text-white transition-colors"
              aria-label="Schließen"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-[10px] text-white/40 mt-4 font-mono">
            Tippen oder klicken zum Schließen
          </p>
        </div>
      </div>
    </div>
  )
}

export default function InsightsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-scroll effect (desktop only)
  useEffect(() => {
    if (isMobile) return

    const scrollContainer = scrollRef.current
    if (!scrollContainer || isPaused) return

    const scrollSpeed = 0.6
    let animationFrameId: number

    const animate = () => {
      scrollContainer.scrollLeft += scrollSpeed

      // Reset to start when reaching halfway (for infinite effect)
      if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
        scrollContainer.scrollLeft = 0
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isPaused, isMobile])

  // Duplicate insights for infinite scroll
  const allInsights = isMobile ? insights : [...insights, ...insights]

  return (
    <div className="relative">
      {/* Desktop Carousel */}
      {!isMobile ? (
        <div
          className="relative -mx-4 md:-mx-12 lg:-mx-24 xl:-mx-32"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            ref={scrollRef}
            className="overflow-x-hidden"
          >
            <div className="flex gap-6 py-4 px-4 md:px-12 lg:px-24 xl:px-32">
              {allInsights.map((insight, index) => (
                <InsightCard key={`${insight.id}-${index}`} insight={insight} />
              ))}
            </div>
          </div>

          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 lg:w-32 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 lg:w-32 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />

          {/* Pause indicator */}
          <div
            className={`absolute top-4 right-4 bg-black/80 backdrop-blur-sm px-4 py-2 text-xs text-white font-mono uppercase tracking-wider transition-opacity duration-300 border-2 border-black ${isPaused ? 'opacity-100' : 'opacity-0'}`}
          >
            ⏸ Pausiert
          </div>
        </div>
      ) : (
        /* Mobile Carousel */
        <div className="relative">
          <div
            ref={scrollRef}
            className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-4">
              {insights.map((insight, index) => (
                <div key={insight.id} className="flex-shrink-0 w-[85vw] max-w-[340px] snap-center">
                  <InsightCard insight={insight} />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {insights.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (scrollRef.current) {
                    const cardWidth = scrollRef.current.offsetWidth * 0.85
                    scrollRef.current.scrollTo({
                      left: index * cardWidth,
                      behavior: 'smooth'
                    })
                  }
                  setCurrentIndex(index)
                }}
                className={`h-2 rounded-full transition-all duration-300 border border-black ${
                  currentIndex === index
                    ? 'w-8 bg-swiss-orange'
                    : 'w-2 bg-gray-300'
                }`}
                aria-label={`Zu Slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Swipe hint */}
          <p className="text-xs text-gray-400 text-center mt-4 font-mono">
            ← Wischen für weitere Lösungen →
          </p>
        </div>
      )}

      {/* Desktop control hint */}
      {!isMobile && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 font-mono">
            Bewegen Sie die Maus über die Karten, um das Karussell zu pausieren
          </p>
        </div>
      )}
    </div>
  )
}
