/**
 * Shared branded email template builder for Scorz.
 *
 * Brand tokens:
 *  - Charcoal primary: #1a1b25
 *  - Orange accent:    #f59e0b
 *  - Font stack:       Inter, system-ui, sans-serif
 *  - Email body bg:    #ffffff (required for dark-mode compatibility)
 */

export interface EmailOptions {
  /** Used only for plain-text fallback / subject context — not rendered in body */
  subject?: string;
  /** Hidden preheader text shown in inbox previews */
  preheader?: string;
  /** Inner HTML content for the email body */
  body: string;
}

export function buildEmail({ preheader, body }: EmailOptions): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0; mso-table-rspace: 0; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#1a1b25;padding:24px 32px;text-align:center;">
              <span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#ffffff;">SCOR</span><span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#f59e0b;">Z</span>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px 32px 24px;color:#1a1b25;font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#a1a1aa;font-family:'JetBrains Mono','Courier New',monospace;letter-spacing:1px;">
                &copy; 2026 SCORZ &nbsp;|&nbsp; Powered by phnyx.dev
              </p>
              <p style="margin:0;font-size:11px;color:#a1a1aa;">
                <a href="{{manage_preferences_url}}" style="color:#a1a1aa;text-decoration:underline;">Manage Preferences</a>
                &nbsp;&middot;&nbsp;
                <a href="{{unsubscribe_url}}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Helper: generates a branded CTA button */
export function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="background-color:#1a1b25;border-radius:8px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

/** Helper: generates an orange accent badge */
export function accentBadge(text: string): string {
  return `<span style="display:inline-block;background-color:#f59e0b;color:#1a1b25;font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;letter-spacing:0.5px;">${text}</span>`;
}

/** Helper: key-value detail row for info tables */
export function detailRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:8px 0;color:#71717a;width:120px;font-size:14px;">${label}</td>
  <td style="padding:8px 0;font-weight:600;font-size:14px;color:#1a1b25;">${value}</td>
</tr>`;
}
