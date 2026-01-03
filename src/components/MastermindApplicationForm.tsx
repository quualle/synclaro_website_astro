'use client';

import { useState } from 'react';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  currentChallenges: string;
  goals: string;
}

export default function MastermindApplicationForm() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    currentChallenges: '',
    goals: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/mastermind-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          seminarDate: 'Q1 2026 (25.-27.02.2026)'
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Absenden der Bewerbung');
      }

      setSubmitStatus('success');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        currentChallenges: '',
        goals: ''
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="bg-white p-8 md:p-12 border border-black">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-3xl font-black mb-4">Bewerbung eingegangen!</h3>
          <p className="text-gray-600 mb-6">
            Vielen Dank für Ihre Bewerbung zum Mastermind-Retreat.
            Buchen Sie jetzt Ihren Kennenlern-Call, um den nächsten Schritt zu gehen.
          </p>
          <div className="bg-gray-50 p-6 text-left mb-6">
            <h4 className="font-bold mb-3">Wie geht es weiter?</h4>
            <ol className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-swiss-orange font-bold">1.</span>
                <span>Wir prüfen Ihre Bewerbung</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-swiss-orange font-bold">2.</span>
                <span>Bei Interesse vereinbaren wir ein kurzes Kennenlerngespräch</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-swiss-orange font-bold">3.</span>
                <span>Nach Zusage erhalten Sie alle Details zur Buchung</span>
              </li>
            </ol>
          </div>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="bg-black text-white px-8 py-4 font-bold hover:bg-swiss-orange transition-colors duration-300"
          >
            Weitere Bewerbung
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 border border-black">
      <div className="mb-8">
        <h3 className="text-2xl font-black mb-2">Ihre Bewerbung</h3>
        <p className="text-gray-600">
          Füllen Sie das Formular aus, um sich für das Mastermind-Retreat zu bewerben.
          Wählen Sie direkt Ihren Wunschtermin.
        </p>
      </div>

      {submitStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700">
          Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
        </div>
      )}

      {/* Personal Information */}
      <div className="mb-8">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-swiss-orange">01</span>
          Persönliche Informationen
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vorname *
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-3 border border-black/20 focus:border-swiss-orange focus:outline-none transition-colors"
              placeholder="Max"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nachname *
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-3 border border-black/20 focus:border-swiss-orange focus:outline-none transition-colors"
              placeholder="Mustermann"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            E-Mail-Adresse *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 border border-black/20 focus:border-swiss-orange focus:outline-none transition-colors"
            placeholder="max@beispiel.de"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefonnummer *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 border border-black/20 focus:border-swiss-orange focus:outline-none transition-colors"
            placeholder="+49 123 456789"
          />
        </div>
      </div>

      {/* Business Information */}
      <div className="mb-8 pt-8 border-t border-black/10">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-swiss-orange">02</span>
          Unternehmen
        </h4>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unternehmen *
          </label>
          <input
            type="text"
            required
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full px-4 py-3 border border-black/20 focus:border-swiss-orange focus:outline-none transition-colors"
            placeholder="Beispiel GmbH"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Position *
          </label>
          <input
            type="text"
            required
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            className="w-full px-4 py-3 border border-black/20 focus:border-swiss-orange focus:outline-none transition-colors"
            placeholder="Geschäftsführer"
          />
        </div>
      </div>

      {/* Application Details */}
      <div className="mb-8 pt-8 border-t border-black/10">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-swiss-orange">03</span>
          Ihre Motivation
        </h4>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Welche aktuellen Herausforderungen haben Sie in Bezug auf KI? *
          </label>
          <textarea
            required
            value={formData.currentChallenges}
            onChange={(e) => setFormData({ ...formData, currentChallenges: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-black/20 focus:border-swiss-orange focus:outline-none transition-colors resize-none"
            placeholder="z.B. Wo stehen Sie gerade? Was blockiert Sie?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Was möchten Sie in den nächsten 90 Tagen erreichen? *
          </label>
          <textarea
            required
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-black/20 focus:border-swiss-orange focus:outline-none transition-colors resize-none"
            placeholder="Ihre konkreten Ziele..."
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-swiss-orange text-white font-bold hover:bg-black transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Wird gesendet...
          </span>
        ) : (
          'Bewerbung absenden'
        )}
      </button>

      {/* Privacy Notice */}
      <div className="mt-6 p-4 bg-gray-50">
        <p className="text-xs text-gray-500">
          Mit dem Absenden dieser Bewerbung stimmen Sie zu, dass Synclaro Sie bezüglich
          Ihrer Bewerbung kontaktieren darf. Ihre Daten werden vertraulich behandelt und
          nicht an Dritte weitergegeben. Sie können Ihre Bewerbung jederzeit zurückziehen.
        </p>
      </div>
    </form>
  );
}
