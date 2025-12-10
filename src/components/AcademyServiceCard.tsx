'use client'

import { useState } from 'react'

interface AcademyServiceCardProps {
  title: string
  category: string
  description: string
  href: string
  videoSrc?: string
}

export default function AcademyServiceCard({
  title,
  category,
  description,
  href,
  videoSrc
}: AcademyServiceCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isTouched, setIsTouched] = useState(false)

  const handleTouch = (e: React.MouseEvent) => {
    // Only toggle on touch devices (not on click that follows hover)
    if ('ontouchstart' in window) {
      e.preventDefault()
      setIsTouched(!isTouched)
    }
  }

  const isExpanded = isHovered || isTouched

  return (
    <a href={href} onClick={handleTouch}>
      <div
        className="relative w-full overflow-hidden bg-gray-900 group cursor-pointer border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300"
        style={{ aspectRatio: '2.5 / 1.7' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Video Background */}
        <div className="absolute inset-0">
          {videoSrc ? (
            <video
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-swiss-orange/40 to-black/60" />
          )}

          {/* Gradient Overlay - Darkens on Hover */}
          <div
            className={`absolute inset-0 bg-gradient-to-b transition-all duration-300 ${
              isExpanded
                ? 'from-black/90 via-black/50 to-black/90'
                : 'from-black/70 via-transparent to-black/30'
            }`}
          />
        </div>

        {/* Orange Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-swiss-orange z-30" />

        {/* Always-Visible Title */}
        <div className="absolute inset-x-0 top-0 p-4 sm:p-6 md:p-8 text-white z-20">
          <div className="inline-block px-3 py-1 bg-swiss-orange/90 border border-white/20 mb-3">
            <span className="font-mono text-[10px] tracking-widest uppercase text-white">
              {category}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight">{title}</h3>
        </div>

        {/* Description - Slides Up on Hover/Touch */}
        <div
          className={`absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-6 text-white z-20 transition-all duration-500 ease-out ${
            isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
          <div className="bg-black/95 border-2 border-black p-4 sm:p-5 md:p-6 shadow-[4px_4px_0px_0px_rgba(255,79,0,0.5)]">
            <p className="text-sm sm:text-base text-gray-200 leading-relaxed mb-3 sm:mb-4">{description}</p>

            {/* CTA */}
            <div className="flex items-center text-swiss-orange group-hover:text-white transition-colors">
              <span className="text-sm sm:text-base font-bold">Mehr erfahren</span>
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-2 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </a>
  )
}
