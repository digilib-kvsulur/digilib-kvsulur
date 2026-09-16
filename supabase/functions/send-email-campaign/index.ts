import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] || c));

const fmtNote = (v: string) => esc(v || "").replace(/\n/g, "<br/>");

// ─── Template Registry ────────────────────────────────────────────────────────
interface TemplateData {
  subject: string;
  heading: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  body: (name: string, note: string, details?: any) => string;
}

const PRESETS: Record<string, TemplateData> = {
  first_login: {
    subject: "Welcome to KV Sulur Digital Library — Setup Complete",
    heading: "First Login Setup Complete",
    badgeText: "Account Activated",
    badgeBg: "#dcfce7",
    badgeColor: "#166534",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Congratulations! You have successfully completed your first login setup at the <strong>PM SHRI KV AFS Sulur Digital Library</strong> 🎉</p>
      <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;font-size:15px;color:#15803d;font-weight:700;">🚀 What You Can Do Now</p>
        <ul style="margin:8px 0 0 0;padding-left:20px;font-size:14px;color:#0f172a;line-height:1.6;">
          <li>📖 Search &amp; request books from the online catalog</li>
          <li>📝 Participate in daily library quizzes and earn points</li>
          <li>🏆 Earn achievement badges and track your rank on the Leaderboard</li>
          <li>⚡ Express Circulation barcode borrowing at the library counter</li>
        </ul>
      </div>
      <p style="margin-bottom:0;">Happy Reading!<br/><strong>— PM SHRI KV AFS Sulur Library Team</strong></p>`,
  },

  email_verified: {
    subject: "Email Address Verified — KV Sulur Digital Library",
    heading: "Email Address Confirmed",
    badgeText: "Email Verified",
    badgeBg: "#ccfbf1",
    badgeColor: "#0f766e",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Your notification email address has been <strong>successfully verified and confirmed</strong> ✅</p>
      <div style="background:#f0fdfa;border-left:4px solid #14b8a6;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#0f766e;font-weight:600;">📧 Notification Preferences</p>
        <p style="margin:6px 0 0 0;font-size:14px;color:#1e293b;">${esc(note || "You will now receive automatic receipts for book issues, returns, due reminders, and achievement updates.")}</p>
      </div>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  book_issued: {
    subject: "Book Issued — KV Sulur Digital Library",
    heading: "Book Issue Receipt",
    badgeText: "Book Issued",
    badgeBg: "#dbeafe",
    badgeColor: "#1e40af",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>A book has been issued to your account at the <strong>PM SHRI KV AFS Sulur Digital Library</strong>.</p>
      <div style="background:#f0f9ff;border-left:4px solid #0284c7;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;font-size:15px;color:#0369a1;font-weight:700;">📖 Borrow Details</p>
        <p style="margin:8px 0 0 0;font-size:14px;color:#0f172a;">${esc(note || "Please check your account for return due date.")}</p>
      </div>
      <p style="color:#475569;font-size:13px;">Please handle the book with care and return or renew on time.</p>
      <p style="margin-bottom:0;">Happy Reading!<br/><strong>— PM SHRI KV AFS Sulur Library Team</strong></p>`,
  },

  book_returned: {
    subject: "Book Return Receipt — KV Sulur Library",
    heading: "Book Return Confirmed",
    badgeText: "Book Returned",
    badgeBg: "#dcfce7",
    badgeColor: "#166534",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Thank you for returning your library book! We have updated your account status.</p>
      <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;font-size:15px;color:#15803d;font-weight:700;">✅ Return Summary</p>
        <p style="margin:8px 0 0 0;font-size:14px;color:#0f172a;">${esc(note || "Book safely returned into library collection.")}</p>
      </div>
      <p style="color:#475569;font-size:13px;">You are now eligible to borrow your next favorite book from the catalog!</p>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  badge_awarded: {
    subject: "🏆 Congratulations! You Earned a New Badge — KV Sulur Library",
    heading: "New Badge Unlocked!",
    badgeText: "Achievement Unlocked",
    badgeBg: "#fef3c7",
    badgeColor: "#92400e",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Congratulations! You have been awarded a new achievement badge in the <strong>Digital Library</strong> 🎉</p>
      <div style="background:#fffbeb;border:2px dashed #f59e0b;padding:20px;border-radius:12px;margin:20px 0;text-align:center;">
        <div style="font-size:48px;line-height:1;margin-bottom:10px;">🏆</div>
        <p style="margin:0;font-size:18px;color:#b45309;font-weight:700;">${esc(note || "Special Achievement Badge")}</p>
        <p style="margin:6px 0 0 0;font-size:12px;color:#78350f;">View your showcase on the Digital Library Student Dashboard.</p>
      </div>
      <p style="color:#475569;font-size:13px;">Keep participating in library activities, reading books, and taking quizzes to unlock more badges!</p>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  level_up: {
    subject: "🌟 Level Up! You Reached a New Rank — KV Sulur Library",
    heading: "Level Up Achieved!",
    badgeText: "Level Up",
    badgeBg: "#f3e8ff",
    badgeColor: "#6b21a8",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Awesome progress! Your reading activity and library points have leveled up your rank 🚀</p>
      <div style="background:#faf5ff;border-left:4px solid #9333ea;padding:18px 22px;border-radius:10px;margin:20px 0;">
        <p style="margin:0;font-size:16px;color:#7e22ce;font-weight:700;">🌟 New Rank Unlocked</p>
        <p style="margin:8px 0 0 0;font-size:15px;color:#1e1b4b;font-weight:600;">${esc(note || "New Reader Rank Reached!")}</p>
      </div>
      <p style="color:#475569;font-size:13px;">Check the Leaderboard on the Digital Library to see your standing among classmates!</p>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  library_update: {
    subject: "KV Sulur Library — Important Announcement",
    heading: "Library Announcement",
    badgeText: "Notice",
    badgeBg: "#dbeafe",
    badgeColor: "#1e40af",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>There is an update from the <strong>PM SHRI KV AFS Sulur Digital Library</strong>.</p>
      ${note ? `<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:16px 20px;border-radius:8px;margin:20px 0;"><p style="margin:0;color:#0f172a;font-size:14px;line-height:1.6;">${esc(note)}</p></div>` : ""}
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  due_reminder: {
    subject: "Reminder: Library Book Return Due Soon",
    heading: "Book Return Reminder",
    badgeText: "Due Reminder",
    badgeBg: "#fef3c7",
    badgeColor: "#92400e",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>This is a friendly reminder that you have <strong>one or more library books due for return or renewal</strong>.</p>
      <div style="background:#fffbeb;border-left:4px solid #eab308;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#854d0e;font-weight:600;">⏰ Due Details</p>
        <p style="margin:6px 0 0 0;font-size:14px;color:#1e293b;">${esc(note || "Please check your account on the Digital Library to renew online or return to the counter.")}</p>
      </div>
      <p style="color:#475569;font-size:13px;">Returning books on time ensures other students can enjoy them too!</p>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  event_invite: {
    subject: "You're Invited: Upcoming Library Event at KV Sulur",
    heading: "Special Event Invitation",
    badgeText: "Event Invite",
    badgeBg: "#f3e8ff",
    badgeColor: "#6b21a8",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>We are delighted to invite you to an upcoming activity at the <strong>Digital Library</strong>!</p>
      ${note ? `<div style="background:#faf5ff;border-left:4px solid #a855f7;padding:16px 20px;border-radius:8px;margin:20px 0;"><p style="margin:0;color:#1e1b4b;font-size:14px;line-height:1.6;">${esc(note)}</p></div>` : "<p>Please log in to the Digital Library for full details and schedule.</p>"}
      <p style="margin-bottom:0;">We look forward to seeing you there!<br/>— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  certificate_notice: {
    subject: "Your Library Certificate is Ready to Download",
    heading: "Certificate Issued",
    badgeText: "Certificate Ready",
    badgeBg: "#fef3c7",
    badgeColor: "#92400e",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Congratulations! A <strong>Library Certificate</strong> has been issued for you. 📜</p>
      ${note ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:8px;margin:20px 0;"><p style="margin:0;color:#78350f;font-size:14px;">${esc(note)}</p></div>` : ""}
      <p style="color:#475569;font-size:13px;">Sign in to the Digital Library to view and print your official certificate.</p>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  welcome: {
    subject: "Welcome to PM SHRI KV AFS Sulur Digital Library!",
    heading: "Welcome Aboard!",
    badgeText: "Welcome",
    badgeBg: "#dcfce7",
    badgeColor: "#166534",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Welcome to the <strong>PM SHRI KV AFS Sulur Digital Library</strong>! 🎉</p>
      <p>Your account is fully approved and active. You can now browse catalog books, participate in daily quizzes, earn points, and unlock achievements.</p>
      ${note ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:8px;margin:20px 0;"><p style="margin:0;color:#14532d;font-size:14px;">${esc(note)}</p></div>` : ""}
      <p style="margin-bottom:0;">Happy Reading!<br/>— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  fine_notice: {
    subject: "Outstanding Library Fine Notice — Action Required",
    heading: "Library Fine Notice",
    badgeText: "Action Required",
    badgeBg: "#fee2e2",
    badgeColor: "#991b1b",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Our records indicate an <strong>outstanding fine balance</strong> on your library account.</p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">⚠️ Fine Details</p>
        <p style="margin:6px 0 0 0;font-size:14px;color:#1e293b;">${esc(note || "Please clear the outstanding amount at the library counter or online to resume book issues.")}</p>
      </div>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  book_available: {
    subject: "Your Reserved Book is Ready for Pickup!",
    heading: "Book Available for Pickup",
    badgeText: "Ready for Pickup",
    badgeBg: "#ccfbf1",
    badgeColor: "#115e59",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Good news! A book you reserved is now <strong>available for collection</strong> at the library counter.</p>
      <div style="background:#f0fdfa;border-left:4px solid #14b8a6;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#0f766e;font-weight:600;">📍 Collection Info</p>
        <p style="margin:6px 0 0 0;font-size:14px;color:#1e293b;">${esc(note || "Please pick up within 2 working days to hold your reservation.")}</p>
      </div>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  quiz_result: {
    subject: "Your Quiz Result & Score — KV Sulur Library",
    heading: "Quiz Performance",
    badgeText: "Quiz Score",
    badgeBg: "#e0e7ff",
    badgeColor: "#3730a3",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Results for the recent <strong>Digital Library Quiz</strong> have been updated!</p>
      <div style="background:#eef2ff;border-left:4px solid #6366f1;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#3730a3;font-weight:600;">📊 Score Summary</p>
        <p style="margin:6px 0 0 0;font-size:14px;color:#1e293b;">${esc(note || "Check the Leaderboard to see your updated rank and points.")}</p>
      </div>
      <p style="margin-bottom:0;">Keep learning & reading!<br/>— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  book_club: {
    subject: "Book Club Update — KV Sulur Library",
    heading: "Book Club Notice",
    badgeText: "Book Club",
    badgeBg: "#ffedd5",
    badgeColor: "#9a3412",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Your <strong>Library Book Club</strong> has a new update and discussion schedule!</p>
      ${note ? `<div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px 20px;border-radius:8px;margin:20px 0;"><p style="margin:0;color:#9a3412;font-size:14px;">${esc(note)}</p></div>` : ""}
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  event_winner: {
    subject: "🏆 Congratulations! You Won an Award in Library Event — KV Sulur",
    heading: "Event Award Winner Announcement",
    badgeText: "Event Winner",
    badgeBg: "#fef3c7",
    badgeColor: "#92400e",
    body: (name, note, details) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Heartiest Congratulations! We are thrilled to celebrate your outstanding accomplishment in the <strong>PM SHRI KV AFS Sulur Digital Library Event</strong>! 🎉</p>
      <div style="background:#fffbeb;border:2px solid #f59e0b;padding:20px;border-radius:12px;margin:20px 0;">
        <div style="font-size:44px;line-height:1;margin-bottom:10px;text-align:center;">🏆</div>
        <p style="margin:0;font-size:18px;color:#b45309;font-weight:800;text-align:center;">${esc(details?.positionTitle || "Award Winner")}</p>
        <p style="margin:4px 0 0 0;font-size:14px;color:#78350f;font-weight:600;text-align:center;">${esc(details?.eventTitle || "Library Event")}</p>
        ${note ? `<div style="margin-top:14px;padding-top:14px;border-top:1px dashed #fcd34d;font-size:13px;color:#451a03;line-height:1.6;">${fmtNote(note)}</div>` : ""}
      </div>
      <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:8px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#1e40af;font-weight:700;">📜 Digital Certificate Available</p>
        <p style="margin:4px 0 0 0;font-size:13px;color:#334155;">Your official bilingual e-certificate is available under your <strong>Student Dashboard → Certificates</strong>.</p>
      </div>
      <p style="color:#475569;font-size:13px;">Keep up the inspiring participation and excellence in reading!</p>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  rotational_badge: {
    subject: "👑 Congratulations! You Won the Rotational Badge — KV Sulur Library",
    heading: "Rotational Badge Awarded",
    badgeText: "Rotational Honour",
    badgeBg: "#fef3c7",
    badgeColor: "#92400e",
    body: (name, note, details) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Outstanding reading achievement! You have been awarded the prestigious <strong>Rotational Library Honour</strong> for your standard/section! 🌟</p>
      <div style="background:#fffbeb;border:2px solid #f59e0b;padding:22px;border-radius:12px;margin:20px 0;text-align:center;">
        <div style="font-size:48px;line-height:1;margin-bottom:10px;">👑</div>
        <p style="margin:0;font-size:20px;color:#b45309;font-weight:800;">${esc(details?.badgeName || "Best Library User")}</p>
        <p style="margin:6px 0 0 0;font-size:14px;color:#92400e;font-weight:700;">${esc(details?.scopeValue || "Class/Section")}${details?.cycleLabel ? ` · ${esc(details?.cycleLabel)}` : ""}</p>
        ${note ? `<div style="margin-top:16px;padding-top:14px;border-top:1px dashed #fcd34d;font-size:13px;color:#451a03;text-align:left;line-height:1.6;">${fmtNote(note)}</div>` : ""}
      </div>
      <p style="color:#475569;font-size:13px;">Wear your honour proudly and continue setting a wonderful example for your fellow students!</p>
      <p style="margin-bottom:0;">— PM SHRI KV AFS Sulur Library Team</p>`,
  },

  newsletter: {
    subject: "KV Sulur Digital Library — Monthly Newsletter",
    heading: "Library Digest",
    badgeText: "Newsletter",
    badgeBg: "#fce7f3",
    badgeColor: "#9d174d",
    body: (name, note) => `
      <p style="margin-top:0;">Dear <strong>${esc(name)}</strong>,</p>
      <p>Check out the latest edition of the <strong>PM SHRI KV AFS Sulur Library Newsletter</strong>!</p>
      ${note ? `<div style="background:#fdf2f8;border-left:4px solid #ec4899;padding:16px 20px;border-radius:8px;margin:20px 0;"><p style="margin:0;color:#9d174d;font-size:14px;line-height:1.6;">${esc(note)}</p></div>` : "<p>Discover new book additions, top readers, upcoming events, and quiz champions.</p>"}
      <p style="margin-bottom:0;">Happy Reading!<br/>— PM SHRI KV AFS Sulur Library Team</p>`,
  },
};

// ─── High-End Responsive HTML Email Template ─────────────────────────────────
function buildHtml(heading: string, badgeText: string, badgeBg: string, badgeColor: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
          
          <!-- Header Banner with Gradient and KV Emblem Logo DP -->
          <tr>
            <td style="background:linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%);padding:24px 30px;text-align:left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="56" style="vertical-align:middle;padding-right:16px;">
                    <img src="https://dlms.kvsulur.in/logos/kv-square.png" alt="KV Sulur Logo" width="52" height="52" style="display:block;border-radius:50%;background:#ffffff;padding:2px;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:2px solid #ffffff;object-fit:cover;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;color:#bfdbfe;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">PM SHRI KENDRIYA VIDYALAYA AFS SULUR</p>
                    <h1 style="margin:4px 0 0 0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">📚 Digital Library System</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Category Badge Strip -->
          <tr>
            <td style="background-color:#f8fafc;padding:14px 32px;border-bottom:1px solid #f1f5f9;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <span style="display:inline-block;background-color:${badgeBg};color:${badgeColor};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${esc(badgeText)}</span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:#64748b;font-weight:500;">${esc(heading)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding:32px;color:#1e293b;font-size:15px;line-height:1.7;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td align="center" style="padding:0 32px 32px 32px;">
              <a href="https://dlms.kvsulur.in" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                Open Digital Library Portal →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;font-weight:600;">PM SHRI Kendriya Vidyalaya AFS Sulur</p>
              <p style="margin:4px 0 0 0;font-size:11px;color:#94a3b8;">Coimbatore, Tamil Nadu · Official Library Automation Portal</p>
              <p style="margin:8px 0 0 0;font-size:10px;color:#cbd5e1;">Sent via Digital Library Notification Service · <a href="https://dlms.kvsulur.in" style="color:#64748b;text-decoration:underline;">dlms.kvsulur.in</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Edge Function Handler ───────────────────────────────────────────────────
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!token) throw new Error("Unauthorized");

    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: adminProfile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (adminProfile?.role !== "admin" && adminProfile?.role !== "teacher") throw new Error("Forbidden");

    const { recipientIds, preset, customMessage, details } = await request.json();

    if (
      !Array.isArray(recipientIds) ||
      recipientIds.length < 1 ||
      recipientIds.length > 300 ||
      !PRESETS[preset]
    ) {
      throw new Error("Invalid campaign payload or unknown preset");
    }

    const { data: recipients } = await admin
      .from("profiles")
      .select("id, first_name, email, notification_email")
      .in("id", recipientIds);

    const valid = (recipients || [])
      .map((p: any) => ({
        ...p,
        targetEmail: (p.notification_email || p.email || "").trim(),
      }))
      .filter((p: any) => Boolean(p.targetEmail));

    const key = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("LIBRARY_FROM_EMAIL") || "PM SHRI KV Sulur Library <dlms@kvsulur.in>";
    if (!key) throw new Error("Email sender is not configured (RESEND_API_KEY missing)");

    const template = PRESETS[preset];
    const note = String(customMessage || "").trim().slice(0, 2000);

    const errors: string[] = [];

    const results = await Promise.all(
      valid.map(async (p: any) => {
        const recipientName = p.first_name || "Library Member";
        const bodyHtml = template.body(recipientName, note, details);
        const html = buildHtml(
          template.heading,
          template.badgeText,
          template.badgeBg,
          template.badgeColor,
          bodyHtml,
        );

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [p.targetEmail],
            subject: template.subject,
            html,
          }),
        });

        const resBody = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = resBody?.message || resBody?.error?.message || `HTTP ${res.status}`;
          console.error(`Resend send failed for ${p.targetEmail}:`, msg);
          errors.push(msg);
          return false;
        }
        return true;
      }),
    );

    const sent = results.filter(Boolean).length;

    if (sent === 0 && valid.length > 0 && errors.length > 0) {
      throw new Error(`Resend error: ${errors[0]}`);
    }

    await admin.from("email_campaigns").insert({
      sent_by: user.id,
      preset,
      subject: template.subject,
      recipient_count: sent,
    });

    return new Response(
      JSON.stringify({ sent, skipped: recipientIds.length - valid.length }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Unable to send email" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
