import { useState } from 'react';

type CompanySize = '10-50' | '51-100' | '101-250' | '250+';
type Package = 'essential' | 'growth' | 'enterprise';
type ImplementationSpeed = 'standard' | 'priority' | 'express';
type SupportLevel = 'basic' | 'premium' | 'enterprise';

interface Configuration {
  companySize?: CompanySize;
  package?: Package;
  implementationSpeed?: ImplementationSpeed;
  supportLevel?: SupportLevel;
}

const PACKAGES = {
  essential: {
    label: 'Essential',
    description: 'Perfekt für den Einstieg',
    features: [
      'Grundlegende Integrationen für kleine Teams',
      'RAG-System der 2. Generation',
      'Benutzerfreundliches Admin Dashboard',
      'E-Mail Support mit 48h Reaktionszeit',
    ],
    bestFor: 'Kleine Unternehmen (10-50 Mitarbeiter)',
    popular: false,
  },
  growth: {
    label: 'Growth',
    description: 'Für wachsende Unternehmen',
    features: [
      'Erweiterte Integrationen mit CRM-Anbindung',
      'Individueller Agent mit Unternehmenspersönlichkeit',
      'Detaillierte Analytics & Reporting',
      'Priority E-Mail Support (24h)',
    ],
    bestFor: 'Mittlere Unternehmen (51-250 Mitarbeiter)',
    popular: true,
  },
  enterprise: {
    label: 'Enterprise',
    description: 'Maximale Flexibilität',
    features: [
      'Vollumfängliche Systemintegrationen (CRM + ERP)',
      'Mehrere spezialisierte Agents',
      'Maßgeschneiderte Dashboards',
      'Dedicated Support Manager',
    ],
    bestFor: 'Große Unternehmen (250+ Mitarbeiter)',
    popular: false,
  },
};

const IMPLEMENTATION_SPEEDS = {
  standard: { label: 'Standard (14 Wochen)', description: 'Bewährter Implementierungsprozess' },
  priority: { label: 'Priorität (10 Wochen)', description: 'Beschleunigte Implementierung' },
  express: { label: 'Express (6 Wochen)', description: 'Schnellste Implementierung' },
};

const SUPPORT_LEVELS = {
  basic: { label: 'Standard Support', description: 'E-Mail Support, 48h Reaktionszeit', included: true },
  premium: { label: 'Premium Support', description: 'E-Mail + Telefon, 8h Reaktionszeit', included: false },
  enterprise: { label: 'Enterprise Support', description: '24/7 Support, Dedicated Manager', included: false },
};

export default function ExpressConfigurator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [configuration, setConfiguration] = useState<Configuration>({});
  const [showSummary, setShowSummary] = useState(false);

  const handleStepComplete = (key: keyof Configuration, value: string) => {
    // Handle enterprise redirect
    if (key === 'companySize' && value === '250+') {
      window.location.href = 'https://cal.com/marcoheer/erstgesprach?notes=Enterprise+Company+GPT+Anfrage';
      return;
    }

    setConfiguration((prev) => ({ ...prev, [key]: value }));

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowSummary(true);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <h2 className="text-2xl md:text-3xl font-black mb-2">Wie groß ist Ihr Unternehmen?</h2>
            <p className="text-gray-600 mb-8">Unternehmensgröße in Mitarbeitern</p>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { value: '10-50', title: '10-50 Mitarbeiter', desc: 'Startups und kleine Unternehmen' },
                { value: '51-100', title: '51-100 Mitarbeiter', desc: 'Mittlere Unternehmen' },
                { value: '101-250', title: '101-250 Mitarbeiter', desc: 'Größere Mittelständler' },
                { value: '250+', title: 'Über 250 Mitarbeiter', desc: 'Individuelle Enterprise-Lösung' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStepComplete('companySize', option.value)}
                  className="p-6 bg-white border border-black/10 hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 text-left"
                >
                  <h3 className="text-xl font-bold mb-1">{option.title}</h3>
                  <p className="text-gray-600">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div>
            <h2 className="text-2xl md:text-3xl font-black mb-2">Welche Lösung passt zu Ihnen?</h2>
            <p className="text-gray-600 mb-8">Wählen Sie Ihre Company GPT Variante</p>

            <div className="grid lg:grid-cols-3 gap-6">
              {Object.entries(PACKAGES).map(([key, pkg]) => (
                <button
                  key={key}
                  onClick={() => handleStepComplete('package', key)}
                  className={`relative p-6 bg-white border-2 ${pkg.popular ? 'border-swiss-orange' : 'border-black/10'} hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 text-left`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="px-3 py-1 bg-swiss-orange text-white text-xs font-bold">BELIEBT</span>
                    </div>
                  )}
                  <h3 className="text-2xl font-black mb-2">{pkg.label}</h3>
                  <p className="text-gray-600 mb-4">{pkg.description}</p>
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-swiss-orange font-semibold mb-1">Ideal für:</p>
                    <p className="text-sm text-gray-600">{pkg.bestFor}</p>
                  </div>
                  <ul className="space-y-2">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-swiss-orange">✓</span>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl md:text-3xl font-black mb-2">Wie schnell soll es gehen?</h2>
            <p className="text-gray-600 mb-8">Wählen Sie Ihre Implementierungsgeschwindigkeit</p>

            <div className="space-y-4">
              {Object.entries(IMPLEMENTATION_SPEEDS).map(([key, speed]) => (
                <button
                  key={key}
                  onClick={() => handleStepComplete('implementationSpeed', key)}
                  className="w-full p-6 bg-white border border-black/10 hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 text-left"
                >
                  <h3 className="text-xl font-bold mb-1">⚡ {speed.label}</h3>
                  <p className="text-gray-600">{speed.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-2xl md:text-3xl font-black mb-2">Welchen Support benötigen Sie?</h2>
            <p className="text-gray-600 mb-8">Wählen Sie Ihr Support-Level</p>

            <div className="space-y-4">
              {Object.entries(SUPPORT_LEVELS).map(([key, support]) => (
                <button
                  key={key}
                  onClick={() => handleStepComplete('supportLevel', key)}
                  className="w-full p-6 bg-white border border-black/10 hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 text-left flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-xl font-bold mb-1">{support.label}</h3>
                    <p className="text-gray-600">{support.description}</p>
                  </div>
                  {support.included ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-bold">Inklusive</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-bold">Optional</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (showSummary) {
    const pkg = PACKAGES[configuration.package || 'essential'];
    const speed = IMPLEMENTATION_SPEEDS[configuration.implementationSpeed || 'standard'];
    const support = SUPPORT_LEVELS[configuration.supportLevel || 'basic'];

    return (
      <div className="bg-white p-8 border border-black">
        <h2 className="text-3xl font-black mb-6">Ihre Konfiguration</h2>

        <div className="space-y-6 mb-8">
          <div className="p-4 border-l-4 border-swiss-orange bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Unternehmensgröße</p>
            <p className="font-bold">{configuration.companySize} Mitarbeiter</p>
          </div>

          <div className="p-4 border-l-4 border-swiss-orange bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Gewähltes Paket</p>
            <p className="font-bold">{pkg.label}</p>
            <p className="text-gray-600 text-sm">{pkg.description}</p>
          </div>

          <div className="p-4 border-l-4 border-swiss-orange bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Implementierung</p>
            <p className="font-bold">{speed.label}</p>
          </div>

          <div className="p-4 border-l-4 border-swiss-orange bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Support</p>
            <p className="font-bold">{support.label}</p>
          </div>
        </div>

        <div className="bg-swiss-orange/10 p-6 mb-8">
          <h3 className="font-bold mb-2">Nächster Schritt</h3>
          <p className="text-gray-600 mb-4">
            Basierend auf Ihrer Konfiguration erstellen wir gerne ein individuelles Angebot für Sie.
            Buchen Sie jetzt ein kostenloses Beratungsgespräch.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/termin"
            className="inline-block bg-swiss-orange text-white px-8 py-4 font-bold text-center hover:bg-black transition-colors"
          >
            Beratungsgespräch buchen
          </a>
          <button
            onClick={() => {
              setShowSummary(false);
              setCurrentStep(0);
              setConfiguration({});
            }}
            className="inline-block border-2 border-black px-8 py-4 font-bold text-center hover:bg-black hover:text-white transition-colors"
          >
            Neu konfigurieren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">Schritt {currentStep + 1} von 4</span>
          <span className="text-sm text-gray-500">{((currentStep + 1) / 4) * 100}% abgeschlossen</span>
        </div>
        <div className="h-2 bg-gray-200">
          <div
            className="h-full bg-swiss-orange transition-all duration-300"
            style={{ width: `${((currentStep + 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Back Button */}
      {currentStep > 0 && (
        <button
          onClick={() => setCurrentStep(currentStep - 1)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Zurück
        </button>
      )}

      {/* Current Step */}
      {renderStep()}
    </div>
  );
}
