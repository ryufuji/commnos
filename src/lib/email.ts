// ============================================
// メール送信ヘルパー（Cloudflare Email Routing）
// ============================================

/**
 * メール送信設定
 */
export interface EmailConfig {
  from: string
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * パスワードリセットメールを送信
 * 
 * Cloudflare Workers環境では、fetch APIを使用してメール送信サービスを呼び出す
 * 
 * 実装オプション:
 * 1. Cloudflare Email Routing（推奨）
 * 2. SendGrid API
 * 3. Mailgun API
 * 4. Resend API
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = 'パスワードリセットのご案内 - Commons'
    const html = generatePasswordResetEmailHTML(resetLink, userName)
    const text = generatePasswordResetEmailText(resetLink, userName)

    // TODO: 実際のメール送信実装
    // 現在は console.log のみ（開発用）
    console.log('[Email] Password reset email would be sent to:', to)
    console.log('[Email] Reset link:', resetLink)
    
    // Phase 1: ログのみ（本番ではメール送信APIを使用）
    // Phase 2: 実際のメール送信実装
    
    return { success: true }
  } catch (error) {
    console.error('[Email Error]', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email sending failed' 
    }
  }
}

/**
 * パスワードリセットメールのHTML生成
 */
function generatePasswordResetEmailHTML(resetLink: string, userName: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>パスワードリセット</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            padding: 40px;
            color: white;
        }
        .content {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-top: 20px;
            color: #333;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 パスワードリセット</h1>
        <p>Commons コミュニティプラットフォーム</p>
    </div>
    
    <div class="content">
        <p>こんにちは、${userName} さん</p>
        
        <p>パスワードリセットのリクエストを受け付けました。</p>
        
        <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>
        
        <center>
            <a href="${resetLink}" class="button">パスワードをリセット</a>
        </center>
        
        <div class="warning">
            <strong>⚠️ 重要な注意事項</strong>
            <ul>
                <li>このリンクは <strong>24時間のみ有効</strong> です</li>
                <li>リンクは <strong>1回のみ使用可能</strong> です</li>
                <li>リクエストした覚えがない場合は、このメールを無視してください</li>
            </ul>
        </div>
        
        <p>ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：</p>
        <p style="word-break: break-all; font-size: 12px; color: #666;">
            ${resetLink}
        </p>
        
        <div class="footer">
            <p>このメールに心当たりがない場合は、無視していただいて問題ありません。</p>
            <p>© 2026 Commons. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}

/**
 * パスワードリセットメールのプレーンテキスト生成
 */
function generatePasswordResetEmailText(resetLink: string, userName: string): string {
  return `
こんにちは、${userName} さん

パスワードリセットのリクエストを受け付けました。

以下のリンクにアクセスして、新しいパスワードを設定してください：

${resetLink}

【重要な注意事項】
- このリンクは24時間のみ有効です
- リンクは1回のみ使用可能です
- リクエストした覚えがない場合は、このメールを無視してください

このメールに心当たりがない場合は、無視していただいて問題ありません。

© 2026 Commons. All rights reserved.
  `.trim()
}

/**
 * ウェルカムメール送信（将来的な拡張用）
 */
export async function sendWelcomeEmail(
  to: string,
  userName: string,
  tenantName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Email] Welcome email would be sent to:', to)
    return { success: true }
  } catch (error) {
    console.error('[Email Error]', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email sending failed' 
    }
  }
}

/**
 * 汎用メール送信（既存コード互換性のため）
 */
export async function sendEmail(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Email] Email would be sent to:', config.to)
    console.log('[Email] Subject:', config.subject)
    return { success: true }
  } catch (error) {
    console.error('[Email Error]', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email sending failed' 
    }
  }
}

/**
 * 会員申請受信メールテンプレート取得（既存コード互換性のため）
 */
export function getMemberApplicationReceivedEmail(params: any): { subject: string; html: string; text: string } {
  return {
    subject: '会員申請を受け付けました',
    html: '<p>会員申請を受け付けました。審査結果をお待ちください。</p>',
    text: '会員申請を受け付けました。審査結果をお待ちください。'
  }
}

/**
 * 新規申請通知メールテンプレート取得（既存コード互換性のため）
 */
export function getNewApplicationNotificationEmail(params: any): { subject: string; html: string; text: string } {
  return {
    subject: '新しい会員申請がありました',
    html: '<p>新しい会員申請がありました。</p>',
    text: '新しい会員申請がありました。'
  }
}

/**
 * 会員承認メールテンプレート取得（既存コード互換性のため）
 */
export function getMemberApprovedEmail(params: any): { subject: string; html: string; text: string } {
  return {
    subject: '会員申請が承認されました',
    html: '<p>会員申請が承認されました。</p>',
    text: '会員申請が承認されました。'
  }
}

/**
 * 会員却下メールテンプレート取得（既存コード互換性のため）
 */
export function getMemberRejectedEmail(params: any): { subject: string; html: string; text: string } {
  return {
    subject: '会員申請について',
    html: '<p>会員申請を見送らせていただきました。</p>',
    text: '会員申請を見送らせていただきました。'
  }
}
