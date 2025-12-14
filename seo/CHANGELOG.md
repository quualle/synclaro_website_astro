# SEO Changelog für synclaro.de

## [2024-12-14] SEO-Engineering Sprint

### Übersicht
Umfassende SEO-Verbesserungen für besseres Ranking der Money-Pages (Mastermind, Gruppencoaching) und Beseitigung von Index-/Qualitätsbremsen.

---

## B) SOFORT-FIXES

### B1: NOINDEX für Danke-Seiten ✅
**Was:** X-Robots-Tag Header für alle Danke-Seiten gesetzt
**Warum:** Index-Bloat vermeiden, keine "Thin Content" Seiten im Index
**Betroffene URLs:**
- `/danke` → noindex, follow
- `/appointment_thankyou` → noindex, follow
- `/ki-beratung/danke` → noindex, follow
- `/ki-automatisierung/danke` → noindex, follow
- `/dsgvo-ki/danke` → noindex, follow
- `/*/danke` (Pattern) → noindex, follow

**Datei:** `netlify.toml`

---

### B2: Subdomain-Konsolidierung ✅
**Was:** 301 Redirects für Subdomains auf Hauptdomain
**Warum:** Link Equity bündeln, Signals nicht splitten
**Redirects:**
- `academy.synclaro.de/*` → `synclaro.de/academy/:splat`
- `solutions.synclaro.de/*` → `synclaro.de/solutions/:splat`
- `advisory.synclaro.de/*` → `synclaro.de/advisory/:splat`

**Datei:** `netlify.toml`

**Hinweis:** Subdomain-Redirects funktionieren nur, wenn die Subdomains auf denselben Netlify-Site zeigen.

---

### B3: Blog-URLs bereinigen ✅
**Was:** 301 Redirects von Prompt-Artefakt-Slugs auf saubere Slugs
**Warum:** User Experience, SEO-freundliche URLs, CTR verbessern

**Alte → Neue Slugs:**
1. `which-primary-keyword-should-the-title-target-provisional-using-n8n-monitoring-...`
   → `n8n-monitoring-logging-fehlerhandling-ki-workflows`

2. `what-exact-keyword-should-the-title-target-for-example-n8n-hosting-deutschland-...`
   → `n8n-hosting-deutschland-n8n-selbst-hosten-dsgvo`

3. `bitte-nenne-das-fokus-keyword-bis-dahin-ein-vorschlag-mit-on-premise-llms-...`
   → `on-premise-llms-deutsche-kmu-datenschutz-praxis-2025`

4. `welches-fokus-keyword-soll-der-titel-enthalten-falls-keins-vorliegt-...`
   → `ki-projekt-scopen-vom-business-problem-zum-lastenheft`

5. `welches-ziel-keyword-soll-der-titel-enthalten-bis-dahin-...`
   → `ki-weiterbildung-kmu-von-chatgpt-zur-automation`

**Datei:** `netlify.toml`

**TODO (Supabase):**
- [ ] Slugs in `blog_articles` Tabelle aktualisieren
- [ ] Content von Artikel 4 bereinigen (Prompt-Artefakte entfernen)
- [ ] Meta-Descriptions aktualisieren

---

### B4: Interne Subdomain-Links ⏳
**Status:** Vorbereitet, Ausführung erfordert Supabase-Zugriff
**Was:** Links zu `academy.synclaro.de`, `solutions.synclaro.de`, `advisory.synclaro.de` im Blog-Content ersetzen
**Warum:** Link Equity nicht auf Subdomains verlieren

**TODO (Supabase):**
```sql
-- Beispiel-Query zur Aktualisierung
UPDATE blog_articles
SET content = REPLACE(content, 'academy.synclaro.de', 'synclaro.de/academy')
WHERE content LIKE '%academy.synclaro.de%';
```

---

### B5: Canonical/SEO-Basics ✅
**Was:** Zentrale SEOHead-Komponente implementiert
**Features:**
- `<link rel="canonical">` auf allen Seiten
- OpenGraph Meta Tags
- Twitter Card Meta Tags
- Robots Meta (default: index, follow)

**Neue Dateien:**
- `src/components/SEOHead.astro`

**Geänderte Dateien:**
- `src/layouts/MainLayout.astro` (SEOHead integriert)

---

### B6: NOINDEX für interne Bereiche ✅
**Was:** X-Robots-Tag für interne/private Seiten
**Betroffene URLs:**
- `/intern/*` → noindex, nofollow
- `/intern/dashboard` → noindex, nofollow
- `/academy/portal/*` → noindex, nofollow

**Datei:** `netlify.toml`

---

## C) MONEY-PAGES OPTIMIERUNG

### C1: Mastermind-Seite ✅
**Änderungen:**
- Teilnehmerzahl konsistent auf "12" (statt 8-12/6-10)
- FAQ erweitert auf 8 Fragen (Zeit, Ort, Zielgruppe, Ergebnisse, Follow-up, Storno, Mitbringen, Datenschutz)
- Event JSON-LD Schema hinzugefügt
- Bewerbungs-CTA hinzugefügt → `/academy/mastermind/bewerbung`
- 4 Termine pro Jahr kommuniziert

**Geänderte Dateien:**
- `src/pages/academy/mastermind.astro`

**Hinweis:** Preise werden NICHT öffentlich angezeigt (Vertriebsprozess).

---

### C2: Cohort-Seiten ✅
**Was:** Dynamische Seiten für Mastermind-Kohorten
**Neue Dateien:**
- `src/content/mastermind-cohorts.json` (Datenquelle)
- `src/pages/academy/mastermind/[cohort].astro` (Dynamische Route)
- `src/pages/academy/mastermind/bewerbung.astro` (Bewerbungsformular)

**Features:**
- Event JSON-LD Schema pro Kohorte
- Dynamisches Rendering aus JSON
- Platzhalter für 4 Kohorten 2025

---

### C3: Gruppencoaching-Seite ✅
**Was:** Dedizierte SEO-Seite für Gruppencoaching
**Neue Datei:** `src/pages/academy/gruppen-coaching.astro`

**Features:**
- Course JSON-LD Schema
- 4-Modul Curriculum
- 8 FAQs
- Zielgruppe & Voraussetzungen
- CTAs zu Beratung

**Redirect:** `/lp/coaching` → `/academy/gruppen-coaching`

---

### C4: OfferCTA-Komponente ✅
**Was:** Tag-basierte CTA am Ende von Blogartikeln
**Neue Datei:** `src/components/OfferCTA.astro`

**Mapping-Logik:**
- Tags: kmu, gf, c-level, strategie, ai-act, governance → Mastermind CTA
- Tags: selbstständig, macher, agent-coding, n8n, tutorial → Gruppencoaching CTA
- Default: Generischer CTA

**TODO:** Integration in `src/pages/blog/[slug].astro`

---

## D) E-E-A-T / AUTORITÄT

### D1: Autoren-System ✅
**Was:** Autoren-Datenquelle und Mapping für Legacy-Autoren
**Neue Datei:** `src/content/authors.json`

**Autoren:**
- Marco Heer (Gründer)
- Phil Kempter (Co-Founder)
- Synclaro Redaktion (für "AI Tech Writer" etc.)

**Legacy Mapping:**
- "AI Tech Writer" → "synclaro-redaktion"
- "AI Marketing Strategist" → "synclaro-redaktion"
- "AI Content Team" → "synclaro-redaktion"

**TODO (Supabase):**
- [ ] `author` Feld in blog_articles aktualisieren
- [ ] `reviewed_by` Feld hinzufügen (falls nicht vorhanden)

---

### D2: Case-Study-Template ✅
**Was:** Strukturierte Referenz-Seiten mit Platzhaltern
**Neue Datei:** `src/pages/referenzen/[slug].astro`

**Struktur:**
- Branche
- Ausgangslage
- Lösung + Stack
- Ergebnis (mit Platzhalter-Hinweis)
- Quote (optional)
- CTA zu Mastermind/Coaching

**Platzhalter-Case:** `/referenzen/beispiel-projekt`

---

## E) DEPLOYMENT & TEST

### Audit-Script ✅
**Neue Datei:** `seo/audit.mjs`

**Features:**
- HTTP Status Check
- Redirect-Verification
- Canonical-Check
- noindex Header Check
- Markdown Report Generation

**Usage:**
```bash
node seo/audit.mjs          # Basic test
node seo/audit.mjs --report # Mit Report-Generierung
```

---

## Checkliste vor Deployment

### Netlify
- [ ] `netlify.toml` deployed
- [ ] Subdomain-DNS auf Netlify Site zeigen (falls gewünscht)

### Supabase (Blog-Datenbank)
- [ ] Neue Slugs in `blog_articles` gesetzt
- [ ] Content-Artefakte in Artikel 4 entfernt
- [ ] Subdomain-Links im Content ersetzt
- [ ] Author-Felder aktualisiert

### Nach Deployment
- [ ] `node seo/audit.mjs --report` ausführen
- [ ] Google Search Console: URL-Prüfung für neue URLs
- [ ] Alte URLs zur Indexierung entfernen lassen

---

## Offene Punkte

1. **Supabase Blog-Zugriff:** Für B3 Content-Fix und B4 Link-Ersetzung wird Zugriff auf die richtige Supabase-Instanz benötigt (nicht die CRM-Instanz)

2. **Subdomain-Setup:** Die Subdomain-Redirects funktionieren nur, wenn academy/solutions/advisory.synclaro.de auf dieselbe Netlify-Site zeigen

3. **OG-Image:** `/og-image.png` und `/og-mastermind.png` sollten erstellt werden

4. **Echte Case Studies:** Template ist da, echte Daten müssen nach Projektabschluss eingefügt werden
