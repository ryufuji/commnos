/**
 * アンケート機能のAPIルート
 * 
 * Phase 1: 基本機能（MVP）
 * - アンケートの作成・取得・更新・削除
 * - アンケート回答の保存・取得
 */

import { Hono } from 'hono'
import type { Context } from 'hono'

const surveys = new Hono()

// --------------------------------------------
// アンケート管理API
// --------------------------------------------

/**
 * GET /api/surveys
 * アンケート一覧取得
 */
surveys.get('/', async (c: Context) => {
  try {
    const tenantId = c.req.query('tenant_id')
    const type = c.req.query('type') // 'join' or 'leave'
    const activeOnly = c.req.query('active') === 'true'

    if (!tenantId) {
      return c.json({ success: false, error: 'tenant_id is required' }, 400)
    }

    let query = `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM survey_questions WHERE survey_id = s.id) as question_count,
        (SELECT COUNT(DISTINCT user_id) FROM survey_responses WHERE survey_id = s.id) as response_count
      FROM surveys s
      WHERE s.tenant_id = ?
    `
    const params: any[] = [tenantId]

    if (type) {
      query += ' AND s.type = ?'
      params.push(type)
    }

    if (activeOnly) {
      query += ' AND s.is_active = 1'
    }

    query += ' ORDER BY s.created_at DESC'

    const surveyList = await c.env.DB.prepare(query).bind(...params).all()

    // 各アンケートの質問を取得
    const surveysWithQuestions = await Promise.all(
      surveyList.results.map(async (survey: any) => {
        const questions = await c.env.DB.prepare(`
          SELECT * FROM survey_questions
          WHERE survey_id = ?
          ORDER BY display_order ASC
        `).bind(survey.id).all()

        return {
          ...survey,
          questions: questions.results.map((q: any) => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : null
          }))
        }
      })
    )

    return c.json({
      success: true,
      surveys: surveysWithQuestions
    })
  } catch (error: any) {
    console.error('[Surveys API] Error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * GET /api/surveys/:id
 * 特定のアンケート取得
 */
surveys.get('/:id', async (c: Context) => {
  try {
    const surveyId = c.req.param('id')

    const survey = await c.env.DB.prepare(`
      SELECT * FROM surveys WHERE id = ?
    `).bind(surveyId).first()

    if (!survey) {
      return c.json({ success: false, error: 'Survey not found' }, 404)
    }

    const questions = await c.env.DB.prepare(`
      SELECT * FROM survey_questions
      WHERE survey_id = ?
      ORDER BY display_order ASC
    `).bind(surveyId).all()

    return c.json({
      success: true,
      survey: {
        ...survey,
        questions: questions.results.map((q: any) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null
        }))
      }
    })
  } catch (error: any) {
    console.error('[Surveys API] Error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * POST /api/surveys
 * アンケート作成
 */
surveys.post('/', async (c: Context) => {
  try {
    const { tenant_id, type, title, description, is_active, questions } = await c.req.json()

    // バリデーション
    if (!tenant_id || !type || !title) {
      return c.json({ success: false, error: 'tenant_id, type, and title are required' }, 400)
    }

    if (!['join', 'leave'].includes(type)) {
      return c.json({ success: false, error: 'type must be "join" or "leave"' }, 400)
    }

    // アンケート作成
    const result = await c.env.DB.prepare(`
      INSERT INTO surveys (tenant_id, type, title, description, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      tenant_id,
      type,
      title,
      description || null,
      is_active !== undefined ? is_active : 1
    ).run()

    const surveyId = result.meta.last_row_id

    // 質問を追加
    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        await c.env.DB.prepare(`
          INSERT INTO survey_questions 
          (survey_id, question_type, question_text, options, scale_min, scale_max, is_required, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          surveyId,
          q.question_type,
          q.question_text,
          q.options ? JSON.stringify(q.options) : null,
          q.scale_min || null,
          q.scale_max || null,
          q.is_required ? 1 : 0,
          q.display_order !== undefined ? q.display_order : i
        ).run()
      }
    }

    return c.json({
      success: true,
      survey_id: surveyId,
      message: 'アンケートを作成しました'
    })
  } catch (error: any) {
    console.error('[Surveys API] Error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * PUT /api/surveys/:id
 * アンケート更新
 */
surveys.put('/:id', async (c: Context) => {
  try {
    const surveyId = c.req.param('id')
    const { title, description, is_active, questions } = await c.req.json()

    // アンケート情報を更新
    await c.env.DB.prepare(`
      UPDATE surveys
      SET title = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title,
      description || null,
      is_active !== undefined ? is_active : 1,
      surveyId
    ).run()

    // 既存の質問を削除
    await c.env.DB.prepare(`
      DELETE FROM survey_questions WHERE survey_id = ?
    `).bind(surveyId).run()

    // 新しい質問を追加
    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        await c.env.DB.prepare(`
          INSERT INTO survey_questions 
          (survey_id, question_type, question_text, options, scale_min, scale_max, is_required, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          surveyId,
          q.question_type,
          q.question_text,
          q.options ? JSON.stringify(q.options) : null,
          q.scale_min || null,
          q.scale_max || null,
          q.is_required ? 1 : 0,
          q.display_order !== undefined ? q.display_order : i
        ).run()
      }
    }

    return c.json({
      success: true,
      message: 'アンケートを更新しました'
    })
  } catch (error: any) {
    console.error('[Surveys API] Error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * DELETE /api/surveys/:id
 * アンケート削除
 */
surveys.delete('/:id', async (c: Context) => {
  try {
    const surveyId = c.req.param('id')

    await c.env.DB.prepare(`
      DELETE FROM surveys WHERE id = ?
    `).bind(surveyId).run()

    return c.json({
      success: true,
      message: 'アンケートを削除しました'
    })
  } catch (error: any) {
    console.error('[Surveys API] Error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// --------------------------------------------
// アンケート回答API
// --------------------------------------------

/**
 * POST /api/survey-responses
 * アンケート回答を保存
 */
surveys.post('/responses', async (c: Context) => {
  try {
    const { survey_id, user_id, tenant_id, response_type, responses } = await c.req.json()

    // バリデーション
    if (!survey_id || !user_id || !tenant_id || !response_type || !responses) {
      return c.json({ success: false, error: 'All fields are required' }, 400)
    }

    // 各質問の回答を保存
    for (const response of responses) {
      await c.env.DB.prepare(`
        INSERT INTO survey_responses 
        (survey_id, question_id, user_id, tenant_id, response_type, answer)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        survey_id,
        response.question_id,
        user_id,
        tenant_id,
        response_type,
        typeof response.answer === 'object' ? JSON.stringify(response.answer) : response.answer
      ).run()
    }

    return c.json({
      success: true,
      message: 'アンケート回答を保存しました'
    })
  } catch (error: any) {
    console.error('[Survey Responses API] Error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * GET /api/survey-responses
 * アンケート回答一覧取得
 */
surveys.get('/responses', async (c: Context) => {
  try {
    const surveyId = c.req.query('survey_id')
    const tenantId = c.req.query('tenant_id')

    if (!surveyId || !tenantId) {
      return c.json({ success: false, error: 'survey_id and tenant_id are required' }, 400)
    }

    // 回答者のリストを取得
    const respondents = await c.env.DB.prepare(`
      SELECT DISTINCT 
        sr.user_id,
        u.nickname as user_name,
        u.email as user_email,
        MIN(sr.submitted_at) as submitted_at
      FROM survey_responses sr
      LEFT JOIN users u ON sr.user_id = u.id
      WHERE sr.survey_id = ? AND sr.tenant_id = ?
      GROUP BY sr.user_id
      ORDER BY submitted_at DESC
    `).bind(surveyId, tenantId).all()

    // 各回答者の詳細な回答を取得
    const responsesWithDetails = await Promise.all(
      respondents.results.map(async (respondent: any) => {
        const answers = await c.env.DB.prepare(`
          SELECT 
            sr.id,
            sr.question_id,
            sq.question_text,
            sq.question_type,
            sr.answer,
            sr.submitted_at
          FROM survey_responses sr
          LEFT JOIN survey_questions sq ON sr.question_id = sq.id
          WHERE sr.survey_id = ? AND sr.user_id = ?
          ORDER BY sq.display_order ASC
        `).bind(surveyId, respondent.user_id).all()

        return {
          user_id: respondent.user_id,
          user_name: respondent.user_name,
          user_email: respondent.user_email,
          submitted_at: respondent.submitted_at,
          answers: answers.results.map((a: any) => ({
            ...a,
            answer: tryParseJSON(a.answer)
          }))
        }
      })
    )

    return c.json({
      success: true,
      total: respondents.results.length,
      responses: responsesWithDetails
    })
  } catch (error: any) {
    console.error('[Survey Responses API] Error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

/**
 * GET /api/survey-responses/stats
 * アンケート統計データ取得
 */
surveys.get('/responses/stats', async (c: Context) => {
  try {
    const surveyId = c.req.query('survey_id')
    const tenantId = c.req.query('tenant_id')

    if (!surveyId || !tenantId) {
      return c.json({ success: false, error: 'survey_id and tenant_id are required' }, 400)
    }

    // 総回答数
    const totalResult = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as total
      FROM survey_responses
      WHERE survey_id = ? AND tenant_id = ?
    `).bind(surveyId, tenantId).first()

    const total = totalResult?.total || 0

    // 質問ごとの統計
    const questions = await c.env.DB.prepare(`
      SELECT * FROM survey_questions
      WHERE survey_id = ?
      ORDER BY display_order ASC
    `).bind(surveyId).all()

    const statistics = await Promise.all(
      questions.results.map(async (question: any) => {
        const responses = await c.env.DB.prepare(`
          SELECT answer
          FROM survey_responses
          WHERE survey_id = ? AND question_id = ?
        `).bind(surveyId, question.id).all()

        let stats: any = {}

        if (question.question_type === 'radio' || question.question_type === 'checkbox') {
          // 選択式の集計
          const answerCounts: Record<string, number> = {}
          
          responses.results.forEach((r: any) => {
            const answer = tryParseJSON(r.answer)
            if (Array.isArray(answer)) {
              answer.forEach(a => {
                answerCounts[a] = (answerCounts[a] || 0) + 1
              })
            } else {
              answerCounts[answer] = (answerCounts[answer] || 0) + 1
            }
          })

          stats = Object.entries(answerCounts).map(([option, count]) => ({
            option,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0
          }))
        } else if (question.question_type === 'scale') {
          // スケールの集計
          const values = responses.results.map((r: any) => parseFloat(r.answer)).filter(v => !isNaN(v))
          const sum = values.reduce((a, b) => a + b, 0)
          const average = values.length > 0 ? sum / values.length : 0

          const distribution: Record<number, number> = {}
          values.forEach(v => {
            distribution[v] = (distribution[v] || 0) + 1
          })

          stats = {
            average: Math.round(average * 10) / 10,
            distribution: Object.entries(distribution).map(([value, count]) => ({
              value: parseInt(value),
              count,
              percentage: total > 0 ? (count / total) * 100 : 0
            }))
          }
        } else {
          // テキスト回答は集計しない
          stats = {
            response_count: responses.results.length
          }
        }

        return {
          question_id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          stats
        }
      })
    )

    return c.json({
      success: true,
      survey_id: surveyId,
      total_responses: total,
      statistics
    })
  } catch (error: any) {
    console.error('[Survey Stats API] Error:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ヘルパー関数
function tryParseJSON(str: string): any {
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

export default surveys
