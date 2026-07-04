import axios from 'axios'

const feedbackClient = axios.create({
  baseURL: '/api/feedback',
  withCredentials: true,
})

export type FeedbackTargetType = 'analysis' | 'clause' | 'chat_message'
export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'report'
export type ReportCategory = 'inaccurate' | 'offensive' | 'unclear' | 'other'

export interface SubmitFeedbackPayload {
  targetType: FeedbackTargetType
  targetId: string
  feedbackType: FeedbackType
  comment?: string
  category?: ReportCategory
  contractId?: string
  analysisId?: string
}

export interface FeedbackResponse {
  _id: string
  userId: string
  targetType: FeedbackTargetType
  targetId: string
  feedbackType: FeedbackType
  comment?: string
  category?: ReportCategory
  contractId?: string
  analysisId?: string
  createdAt: string
}

export interface FeedbackStats {
  daily: {
    date: string
    thumbsUp: number
    thumbsDown: number
    reports: number
    total: number
  }[]
  totals: {
    totalThumbsUp: number
    totalThumbsDown: number
    totalReports: number
    total: number
  }
  byTarget: {
    targetType: string
    count: number
    thumbsUp: number
    thumbsDown: number
  }[]
}

export interface LowRatedItem {
  _id: string
  targetType: string
  targetId: string
  feedbackType: string
  comment?: string
  category?: string
  createdAt: string
  userEmail?: string
}

const feedbackApi = {
  submit: (payload: SubmitFeedbackPayload) =>
    feedbackClient.post<{ success: boolean; data: FeedbackResponse }>(
      '/',
      payload
    ),

  getUserFeedback: (params?: { targetType?: string; targetId?: string }) =>
    feedbackClient.get<{ success: boolean; data: FeedbackResponse[] }>('/', {
      params,
    }),

  getStats: () =>
    feedbackClient.get<{ success: boolean; data: FeedbackStats }>('/stats'),

  getLowRated: () =>
    feedbackClient.get<{ success: boolean; data: LowRatedItem[] }>(
      '/low-rated'
    ),

  delete: (id: string) =>
    feedbackClient.delete<{ success: boolean; message: string }>(`/${id}`),
}

export default feedbackApi
