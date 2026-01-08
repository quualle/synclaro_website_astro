import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

interface LPApplicationFormData {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  company?: string | null;
  position?: string | null;
  program: 'gruppen_coaching' | 'mastermind' | 'beide';
  questionnaireAnswers: Record<string, unknown>;
  motivation?: string | null;
  source?: string | null;
  formVersion?: string | null;
  form_variant?: 'v1' | 'v2_short' | 'v3_single_page' | null;
}

const WEBHOOK_URL = 'https://quualle.app.n8n.cloud/webhook/7db9cded-9fef-4e36-a3c5-75c46739789f';

// Program display names
const programNames: Record<string, string> = {
  'gruppen_coaching': 'Gruppen-Coaching',
  'mastermind': 'Mastermind',
  'beide': 'Gruppen-Coaching & Mastermind'
};

// Generate confirmation email HTML
function generateConfirmationEmail(firstName: string, program: string): string {
  const programDisplay = programNames[program] || program;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bewerbung eingegangen - Synclaro Academy</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <div style="font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: -1px;">
                SYNCLARO<span style="color: #FF4F00;">.</span>
              </div>
              <div style="font-size: 11px; color: #666666; letter-spacing: 3px; margin-top: 4px;">
                ACADEMY
              </div>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #111111; border-left: 4px solid #FF4F00;">
                <tr>
                  <td style="padding: 50px 40px;">

                    <!-- Check Icon -->
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="display: inline-block; width: 64px; height: 64px; background-color: rgba(255, 79, 0, 0.15); border-radius: 50%; line-height: 64px; text-align: center;">
                        <span style="font-size: 32px; color: #FF4F00;">✓</span>
                      </div>
                    </div>

                    <!-- Greeting -->
                    <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: #FFFFFF; text-align: center; line-height: 1.3;">
                      Hallo ${firstName},
                    </h1>

                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #CCCCCC; text-align: center;">
                      deine Bewerbung für das <strong style="color: #FF4F00;">${programDisplay}</strong> ist bei uns eingegangen.
                    </p>

                    <!-- Divider -->
                    <div style="width: 60px; height: 2px; background-color: #FF4F00; margin: 30px auto;"></div>

                    <!-- Next Steps -->
                    <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #FFFFFF; text-align: center;">
                      Wie geht es weiter?
                    </h2>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 16px 20px; background-color: rgba(255, 79, 0, 0.08); border-radius: 8px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="40" valign="top">
                                <div style="width: 32px; height: 32px; background-color: #FF4F00; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; color: #000000; font-size: 14px;">1</div>
                              </td>
                              <td style="padding-left: 16px;">
                                <p style="margin: 0; font-size: 15px; color: #FFFFFF; line-height: 1.5;">
                                  <strong>Wir prüfen deine Bewerbung</strong><br>
                                  <span style="color: #999999;">Wir schauen uns deine Angaben an und prüfen, ob das Programm zu dir passt.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height: 12px;"></td></tr>
                      <tr>
                        <td style="padding: 16px 20px; background-color: rgba(255, 79, 0, 0.08); border-radius: 8px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="40" valign="top">
                                <div style="width: 32px; height: 32px; background-color: #FF4F00; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; color: #000000; font-size: 14px;">2</div>
                              </td>
                              <td style="padding-left: 16px;">
                                <p style="margin: 0; font-size: 15px; color: #FFFFFF; line-height: 1.5;">
                                  <strong>Dein Termin wartet</strong><br>
                                  <span style="color: #999999;">Hast du schon deinen 15-Minuten-Call gebucht? Wähle jetzt deinen Wunschtermin im Kalender.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Promise Box -->
                    <div style="background-color: #1A1A1A; padding: 24px; border-radius: 8px; text-align: center; border: 1px solid #333333;">
                      <p style="margin: 0; font-size: 15px; color: #CCCCCC; line-height: 1.6;">
                        📅 <strong style="color: #FFFFFF;">Vergiss nicht, deinen Termin zu wählen</strong> – direkt nach der Bewerbung im Kalender.
                      </p>
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666; text-align: center; line-height: 1.6;">
                Du hast Fragen? Antworte einfach auf diese E-Mail.
              </p>
              <p style="margin: 0; font-size: 13px; color: #444444; text-align: center;">
                Synclaro Academy<br>
                KI-Ausbildung für Macher
              </p>
            </td>
          </tr>

          <!-- Legal Footer -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0; font-size: 11px; color: #444444; text-align: center; line-height: 1.5;">
                Diese E-Mail wurde automatisch versendet, weil du dich für das KI-Coaching beworben hast.<br>
                © 2025 Synclaro. Alle Rechte vorbehalten.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: LPApplicationFormData = await request.json();

    // Validation
    if (!data.email) {
      return new Response(
        JSON.stringify({ error: 'Email ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // V2 Short: firstName and lastName are optional
    // V1: firstName and lastName are required
    const isV2Short = data.form_variant === 'v2_short' || data.formVersion === 'v2_short';
    if (!isV2Short && (!data.firstName || !data.lastName)) {
      return new Response(
        JSON.stringify({ error: 'Name ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.program) {
      return new Response(
        JSON.stringify({ error: 'Programm-Auswahl ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables - use CRM Supabase (where lp_coaching_applications lives)
    const supabaseUrl = import.meta.env.CRM_SUPABASE_URL || 'https://xmlrqsyzmnuidjsxghco.supabase.co';
    const supabaseKey = import.meta.env.CRM_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[LP Application API] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get session ID from sessionStorage (passed via cookie or header)
    const sessionId = request.headers.get('x-session-id') || null;

    // Get UTM parameters from request
    const utmSource = request.headers.get('x-utm-source') || null;
    const utmMedium = request.headers.get('x-utm-medium') || null;
    const utmCampaign = request.headers.get('x-utm-campaign') || null;

    // Get Facebook Click ID for attribution
    const fbclid = request.headers.get('x-fbclid') || null;

    // Insert into lp_coaching_applications table
    const applicationPayload = {
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      position: data.position || null,
      program_interest: data.program,
      questionnaire_answers: data.questionnaireAnswers || {},
      motivation: data.motivation || null,
      source: data.source || 'lp_coaching',
      form_version: data.formVersion || 'v2_multistep',
      form_variant: data.form_variant || 'v1',
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      fbclid: fbclid,
      session_id: sessionId,
      status: 'pending',
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/lp_coaching_applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(applicationPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LP Application API] Supabase error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Speichern der Bewerbung' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const applicationId = result[0]?.id;

    // Send confirmation email via Resend
    const resendApiKey = import.meta.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const displayName = data.firstName || 'Interessent';
        const emailHtml = generateConfirmationEmail(displayName, data.program);

        const { error: emailError } = await resend.emails.send({
          from: 'Synclaro Academy <academy@synclaro.de>',
          to: [data.email],
          replyTo: 'marcoheer@synclaro.de',
          subject: `${displayName}, deine Bewerbung ist eingegangen`,
          html: emailHtml,
          text: `Hallo ${displayName},\n\ndeine Bewerbung für das ${programNames[data.program] || data.program} ist bei uns eingegangen.\n\nWie geht es weiter?\n1. Wir prüfen deine Bewerbung\n2. Wähle deinen Kennenlern-Termin im Kalender\n\nVergiss nicht, deinen Termin direkt nach der Bewerbung zu wählen!\n\nDu hast Fragen? Antworte einfach auf diese E-Mail.\n\nSynclaro Academy\nKI-Ausbildung für Macher`
        });

        if (emailError) {
          console.error('[LP Application API] Resend error:', emailError);
        } else {
          console.log('[LP Application API] Confirmation email sent to:', data.email);
        }
      } catch (emailErr) {
        console.error('[LP Application API] Email sending failed:', emailErr);
      }
    } else {
      console.warn('[LP Application API] RESEND_API_KEY not configured, skipping email');
    }

    // Send webhook notification
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'application_submitted',
          application_id: applicationId,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          company: data.company,
          position: data.position,
          program: data.program,
          questionnaire_answers: data.questionnaireAnswers,
          motivation: data.motivation,
          source: data.source || 'lp_coaching',
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          fbclid: fbclid,
          session_id: sessionId,
          timestamp: new Date().toISOString()
        })
      });
    } catch (webhookError) {
      // Log but don't fail the request if webhook fails
      console.error('[LP Application API] Webhook error:', webhookError);
    }

    return new Response(
      JSON.stringify({ success: true, id: applicationId, emailSent: !!resendApiKey }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[LP Application API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Ein Fehler ist aufgetreten' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
