/**
 * メール送信ライブラリ
 * Resend APIを使用してメールを送信
 */

export interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

/**
 * Resend APIを使ってメールを送信
 */
export async function sendEmail(options: EmailOptions, resendApiKey?: string): Promise<boolean> {
  if (!resendApiKey) {
    console.error('[Email] RESEND_API_KEY is not configured')
    return false
  }

  const from = options.from || 'Commons <noreply@commons.com>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Email] Failed to send email:', error)
      return false
    }

    const result = await response.json()
    console.log('[Email] Email sent successfully:', result.id)
    return true
  } catch (error) {
    console.error('[Email] Error sending email:', error)
    return false
  }
}

/**
 * 会員申請受付メール（申請者へ）
 */
export function getMemberApplicationReceivedEmail(params: {
  nickname: string
  communityName: string
}): { subject: string; html: string } {
  return {
    subject: `【${params.communityName}】会員申請を受け付けました`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">会員申請を受け付けました</h1>
          </div>
          <div class="content">
            <p>${params.nickname} 様</p>
            <p><strong>${params.communityName}</strong> への会員申請を受け付けました。</p>
            <p>管理者が申請内容を確認し、承認が完了次第、あらためてご連絡いたします。</p>
            <p>今しばらくお待ちください。</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #6b7280;">
              このメールに心当たりがない場合は、破棄していただいて構いません。
            </p>
          </div>
          <div class="footer">
            <p>© 2025 ${params.communityName}. Powered by Commons.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

/**
 * 会員承認通知メール（申請者へ）
 */
export function getMemberApprovedEmail(params: {
  nickname: string
  communityName: string
  memberNumber: string
  loginUrl: string
}): { subject: string; html: string } {
  return {
    subject: `【${params.communityName}】会員申請が承認されました`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎉 会員申請が承認されました</h1>
          </div>
          <div class="content">
            <p>${params.nickname} 様</p>
            <p>おめでとうございます！<strong>${params.communityName}</strong> への会員申請が承認されました。</p>
            <div class="info-box">
              <p style="margin: 0;"><strong>会員番号:</strong> ${params.memberNumber}</p>
            </div>
            <p>今すぐログインして、コミュニティの機能をお楽しみください。</p>
            <center>
              <a href="${params.loginUrl}" class="button">ログインする</a>
            </center>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #6b7280;">
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
          </div>
          <div class="footer">
            <p>© 2025 ${params.communityName}. Powered by Commons.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

/**
 * 会員拒否通知メール（申請者へ）
 */
export function getMemberRejectedEmail(params: {
  nickname: string
  communityName: string
}): { subject: string; html: string } {
  return {
    subject: `【${params.communityName}】会員申請について`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">会員申請について</h1>
          </div>
          <div class="content">
            <p>${params.nickname} 様</p>
            <p><strong>${params.communityName}</strong> への会員申請について、慎重に検討いたしましたが、今回は見送らせていただくことになりました。</p>
            <p>何卒ご理解いただけますようお願い申し上げます。</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #6b7280;">
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
          </div>
          <div class="footer">
            <p>© 2025 ${params.communityName}. Powered by Commons.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

/**
 * 新規申請通知メール（管理者へ）
 */
export function getNewApplicationNotificationEmail(params: {
  applicantNickname: string
  applicantEmail: string
  communityName: string
  dashboardUrl: string
}): { subject: string; html: string } {
  return {
    subject: `【${params.communityName}】新しい会員申請があります`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🔔 新しい会員申請</h1>
          </div>
          <div class="content">
            <p><strong>${params.communityName}</strong> に新しい会員申請がありました。</p>
            <div class="info-box">
              <p style="margin: 0 0 10px 0;"><strong>申請者:</strong> ${params.applicantNickname}</p>
              <p style="margin: 0;"><strong>メールアドレス:</strong> ${params.applicantEmail}</p>
            </div>
            <p>ダッシュボードから申請内容を確認し、承認または却下してください。</p>
            <center>
              <a href="${params.dashboardUrl}" class="button">ダッシュボードを開く</a>
            </center>
          </div>
          <div class="footer">
            <p>© 2025 ${params.communityName}. Powered by Commons.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
}
