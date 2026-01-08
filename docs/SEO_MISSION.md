# SEO Mission - synclaro.de

## Phase 1: Technisches SEO-Fundament (Abgeschlossen)

**Datum:** 2025-01-07

### Umgesetzte Maßnahmen:
1. robots.txt konfiguriert (Sitemap-Referenz, Block von /api/, /intern/)
2. sitemap-index.xml generiert via @astrojs/sitemap
3. Schema.org Organization + WebSite JSON-LD implementiert
4. Canonical URLs für alle Seiten
5. OG Tags + Twitter Cards
6. Meta robots Tags (index, follow)
7. Sprachliche Deklaration (lang="de", og:locale="de_DE")

---

## Phase 2: On-Page SEO & Core Web Vitals

**Datum:** 2025-01-08

### GSC-Analyse Ergebnisse:
- **289 Klicks**, 4.068 Impressionen, **7.1% CTR**, Position 21.6
- **19 duplizierte Seiten** durch Trailing-Slash-Varianten
- **6 404-Seiten**
- **42 Seiten** in Indexierungs-Warteschlange

### Umgesetzte Maßnahmen:

#### 1. Trailing Slash Normalisierung
- `trailingSlash: 'never'` in astro.config.mjs
- Netlify Redirect: `/*/ → /:splat` (301)
- www → non-www Redirect (301)

**Dateien:**
- `astro.config.mjs`
- `netlify.toml`

#### 2. CTR-Optimierung für Money-Pages

**ki-beratung-mittelstand (vorher: 0.28% CTR bei 1.066 Impressionen)**
```
Title: KI-Beratung Mittelstand: Kostenlose Erstanalyse in 30 Min | Synclaro
Description: ✓ 50+ Mittelständler beraten ✓ 87% Zeitersparnis ✓ 100% DSGVO-konform. Kostenlose 30-Min. Erstanalyse für Ihre KI-Strategie. Konkrete Einsparpotenziale und ROI-Schätzung.
```

**workflow-automatisierung**
```
Title: Workflow-Automatisierung: 80% Zeitersparnis mit KI | Synclaro
Description: ✓ 80% Zeitersparnis ✓ 95% weniger Fehler ✓ 3x ROI in 12 Monaten. Automatisieren Sie Rechnungen, E-Mails & Reports mit KI.
```

#### 3. LCP-Optimierung: Google Fonts Self-Hosting
- @fontsource/inter und @fontsource/jetbrains-mono installiert
- Google Fonts Links entfernt aus:
  - `MainLayout.astro`
  - `lp/coaching.astro`
  - `lp/mastermind.astro`
  - `lp/coaching-v1.astro`
- Lokale Font-Imports in `global.css`
- **Erwartete LCP-Verbesserung:** ~2s

#### 4. FAQ-Schema (FAQPage JSON-LD)
- Implementiert auf `/` (Homepage)
- Nutzt existierendes `faqs` Array
- Rich Snippets in SERPs ermöglicht

**Datei:** `src/pages/index.astro`

#### 5. Breadcrumb-Schema (BreadcrumbList JSON-LD)
- Dynamisch generiert basierend auf URL-Pfad
- Nur auf Unterseiten (nicht Homepage)
- Automatische Segment-Kapitalisierung

**Datei:** `src/layouts/MainLayout.astro`

#### 6. BlogPosting Schema
- Implementiert für `/blog/[slug]` und `/academy/blog/[slug]`
- Enthält: headline, author, publisher, datePublished, wordCount, timeRequired
- Open Graph type="article" für Blog-Seiten

**Dateien:**
- `src/pages/blog/[slug].astro`
- `src/pages/academy/blog/[slug].astro`

---

## KRITISCH: Blog-URL Fix erforderlich

### Problem:
Ein Blog-Artikel hat eine katastrophale URL, die wie ein KI-Prompt aussieht:

```
/blog/which-exact-keyword-should-the-title-target-if-the-keyword-is-e-rechnung-pflicht-2026-a-short-seo-friendly-title-could-be-e-rechnung-pflicht-2026-eingangsrechnungen-automatisieren
```

### Warum das schlecht ist:
1. **URL-Länge:** 200+ Zeichen (optimal: <60)
2. **Kein Keyword-Fokus:** Enthält Prompt-Fragmente statt Keywords
3. **Unprofessionell:** Sieht nach technischem Fehler aus
4. **Google-Penalty-Risiko:** Unnatürliche URL-Struktur

### Lösung (manuell in Supabase):
```sql
UPDATE articles
SET slug = 'e-rechnung-pflicht-2026'
WHERE slug LIKE '%which-exact-keyword%';
```

**Supabase Projekt:** ouqhysemcldamthpuqqq (nicht das CRM-Projekt!)

### 301 Redirect nach Fix:
Netlify Redirect hinzufügen:
```toml
[[redirects]]
  from = "/blog/which-exact-keyword-should-the-title-target-if-the-keyword-is-e-rechnung-pflicht-2026-a-short-seo-friendly-title-could-be-e-rechnung-pflicht-2026-eingangsrechnungen-automatisieren"
  to = "/blog/e-rechnung-pflicht-2026"
  status = 301
  force = true
```

---

## Phase 3: TODO (Content & Backlinks)

- [ ] Blog-Artikel URL fixen (siehe oben)
- [ ] Interne Verlinkung optimieren
- [ ] Bilder mit Alt-Tags versehen
- [ ] Weitere Money-Pages CTR-optimieren
- [ ] Lokales SEO (Google Business Profile)
- [ ] Backlink-Strategie entwickeln

---

## Monitoring

- **Google Search Console:** https://search.google.com/search-console/index?resource_id=sc-domain:synclaro.de
- **PageSpeed Insights:** https://pagespeed.web.dev/analysis/https-synclaro-de

---

*Letzte Aktualisierung: 2025-01-08*
