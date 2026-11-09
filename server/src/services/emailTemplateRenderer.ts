import path from 'path';
import fs from 'fs';
import BRAND_CONFIG from '../config/brandConfig';

export interface EmailRenderOptions {
  title: string;
  preheader?: string;
  recipientName?: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  bannerType?: 'default' | 'success' | 'alert' | 'green';
}

/**
 * Universal Brand Email Wrapper for SkillUp
 * Follows the official SkillUp design system:
 * - Brand Green (#5DBA58), Black (#111111), White (#FFFFFF), Light Background (#F7F9FC), Slate (#64748B)
 * - Professional Header with SkillUp Logo and Green Subtitle Accent
 * - Responsive 600px email table layout
 * - Official Social Media Icons (LinkedIn, YouTube, Instagram)
 * - Comprehensive Footer with Links and 2026 Copyright
 */
export const renderSkillUpEmailWrapper = (options: EmailRenderOptions): string => {
  const {
    title,
    preheader = 'SkillUp – Student Skill Development Platform',
    recipientName,
    contentHtml,
    ctaText,
    ctaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
  } = options;

  const brandGreen = '#5DBA58';
  const brandDark = '#111111';
  const brandBg = '#F7F9FC';
  const brandText = '#2D3748';
  const brandMuted = '#64748B';
  const brandBorder = '#E2E8F0';

  // Logo URL: Publicly accessible HTTPS URL pointing directly to official website asset
  const logoUrl = BRAND_CONFIG.logoUrl;

  // Social Icon URLs (Publicly hosted high-resolution icons)
  const linkedinIcon = 'https://cdn-icons-png.flaticon.com/512/3536/3536505.png';
  const youtubeIcon = 'https://cdn-icons-png.flaticon.com/512/3670/3670147.png';
  const instagramIcon = 'https://cdn-icons-png.flaticon.com/512/3955/3955024.png';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0; padding: 0; min-width: 100%; background-color: ${brandBg}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-spacing: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    td { padding: 0; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a { color: ${brandGreen}; text-decoration: none; }
    .btn-primary:hover { background-color: #4da548 !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 24px 20px !important; }
      .header-padding { padding: 24px 20px !important; }
      .footer-padding { padding: 24px 20px !important; }
      .stack-column { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${brandBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <!-- Hidden Preheader -->
  <div style="display: none; font-size: 1px; color: ${brandBg}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>

  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${brandBg}; padding: 32px 0;">
    <tr>
      <td align="center">
        <!-- Main Email Container (600px Max) -->
        <table class="email-container" width="600" border="0" cellpadding="0" cellspacing="0" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid ${brandBorder}; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);">
          
          <!-- ==============================================
               1. HEADER: BRAND LOGO & OFFICIAL SUBTITLE
          =============================================== -->
          <tr>
            <td class="header-padding" align="center" style="background-color: #FFFFFF; padding: 32px 30px 24px 30px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${BRAND_CONFIG.websiteUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="padding-right: 12px;">
                            <img src="${logoUrl}" alt="SkillUp Logo" width="44" height="44" style="display: block; width: 44px; height: 44px; object-contain;" />
                          </td>
                          <td valign="middle">
                            <span style="font-size: 28px; font-weight: 900; color: ${brandDark}; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                              Skill<span style="color: ${brandGreen};">Up</span>
                            </span>
                          </td>
                        </tr>
                      </table>
                    </a>
                    <div style="font-size: 11px; color: ${brandMuted}; font-weight: 700; margin-top: 6px; letter-spacing: 1.2px; text-transform: uppercase;">
                      STUDENT SKILL DEVELOPMENT PLATFORM
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Subtle Green Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height: 2px; background: linear-gradient(90deg, rgba(93,186,88,0.1) 0%, #5DBA58 50%, rgba(93,186,88,0.1) 100%);"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ==============================================
               2. BODY: CLEAN PROFESSIONAL WHITE CARD
          =============================================== -->
          <tr>
            <td class="content-padding" style="padding: 36px 36px; background-color: #FFFFFF;">
              ${recipientName ? `
              <div style="font-size: 16px; font-weight: 700; color: ${brandDark}; margin-bottom: 16px;">
                Hello ${recipientName},
              </div>` : ''}

              <div style="font-size: 14px; line-height: 1.7; color: ${brandText};">
                ${contentHtml}
              </div>

              <!-- Primary Call-to-Action Button -->
              ${ctaText && ctaUrl ? `
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 32px; margin-bottom: 14px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" style="border-radius: 10px; background-color: ${brandGreen}; box-shadow: 0 4px 14px rgba(93, 186, 88, 0.35);">
                      <tr>
                        <td align="center" style="border-radius: 10px; background-color: ${brandGreen};">
                          <a href="${ctaUrl}" target="_blank" class="btn-primary" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                            ${ctaText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <!-- Secondary Link / Support Option -->
              ${secondaryCtaText && secondaryCtaUrl ? `
              <div style="text-align: center; margin-top: 12px;">
                <a href="${secondaryCtaUrl}" target="_blank" style="font-size: 13px; font-weight: 600; color: ${brandGreen}; text-decoration: underline;">
                  ${secondaryCtaText} &rarr;
                </a>
              </div>` : ''}
            </td>
          </tr>

          <!-- ==============================================
               3. FOOTER: SOCIAL MEDIA & CORPORATE IDENTITY
          =============================================== -->
          <tr>
            <td class="footer-padding" style="background-color: #FAFCF9; padding: 32px 36px; border-top: 1px solid ${brandBorder}; text-align: center;">
              
              <!-- Company Title & Mission -->
              <div style="font-size: 14px; font-weight: 800; color: ${brandDark}; margin-bottom: 6px;">
                SkillUp – Student Skill Development Platform
              </div>
              <div style="font-size: 12px; color: ${brandMuted}; max-width: 460px; margin: 0 auto 22px auto; line-height: 1.6;">
                Empowering students through practical learning, expert mentorship and industry-focused training.
              </div>

              <!-- Social Media Icons (Official Brand Colors & Links) -->
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 24px auto;">
                <tr>
                  <!-- LinkedIn -->
                  <td align="center" style="padding: 0 8px;">
                    <a href="${BRAND_CONFIG.socialLinks.linkedin.url}" target="_blank" title="SkillUp on LinkedIn" style="display: inline-block; text-decoration: none;">
                      <table border="0" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 50%; width: 38px; height: 38px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                        <tr>
                          <td align="center" valign="middle" style="width: 38px; height: 38px;">
                            <img src="${linkedinIcon}" alt="LinkedIn" width="18" height="18" style="display: block; width: 18px; height: 18px; border: 0;" />
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>

                  <!-- YouTube -->
                  <td align="center" style="padding: 0 8px;">
                    <a href="${BRAND_CONFIG.socialLinks.youtube.url}" target="_blank" title="SkillUp on YouTube" style="display: inline-block; text-decoration: none;">
                      <table border="0" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 50%; width: 38px; height: 38px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                        <tr>
                          <td align="center" valign="middle" style="width: 38px; height: 38px;">
                            <img src="${youtubeIcon}" alt="YouTube" width="18" height="18" style="display: block; width: 18px; height: 18px; border: 0;" />
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>

                  <!-- Instagram -->
                  <td align="center" style="padding: 0 8px;">
                    <a href="${BRAND_CONFIG.socialLinks.instagram.url}" target="_blank" title="SkillUp on Instagram" style="display: inline-block; text-decoration: none;">
                      <table border="0" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 50%; width: 38px; height: 38px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                        <tr>
                          <td align="center" valign="middle" style="width: 38px; height: 38px;">
                            <img src="${instagramIcon}" alt="Instagram" width="18" height="18" style="display: block; width: 18px; height: 18px; border: 0;" />
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 18px 0;">
                <tr>
                  <td style="border-top: 1px solid ${brandBorder};"></td>
                </tr>
              </table>

              <!-- Legal & Support Details -->
              <div style="font-size: 11px; color: ${brandMuted}; line-height: 1.8;">
                <a href="${BRAND_CONFIG.websiteUrl}" target="_blank" style="color: ${brandMuted}; font-weight: 600; text-decoration: none;">Website</a> &nbsp;&bull;&nbsp; 
                <a href="mailto:${BRAND_CONFIG.supportEmail}" style="color: ${brandMuted}; font-weight: 600; text-decoration: none;">Support Email (${BRAND_CONFIG.supportEmail})</a> &nbsp;&bull;&nbsp; 
                <a href="${BRAND_CONFIG.privacyPolicyUrl}" target="_blank" style="color: ${brandMuted}; font-weight: 600; text-decoration: none;">Privacy Policy</a> &nbsp;&bull;&nbsp; 
                <a href="${BRAND_CONFIG.termsUrl}" target="_blank" style="color: ${brandMuted}; font-weight: 600; text-decoration: none;">Terms &amp; Conditions</a>
                <br />
                Copyright &copy; ${BRAND_CONFIG.copyrightYear} SkillUp. All rights reserved.
              </div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
