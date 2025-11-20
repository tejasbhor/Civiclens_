"use client";

import React, { useState, useEffect } from 'react';
import { Report, SatisfactionLevel } from '@/types';
import { X, Star, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onSuccess?: () => void;
}

export interface FeedbackData {
  report_id: number;
  rating: number;
  satisfaction_level: SatisfactionLevel;
  comment?: string;
  resolution_time_acceptable: boolean;
  work_quality_acceptable: boolean;
  officer_behavior_acceptable: boolean;
  would_recommend: boolean;
  requires_followup: boolean;
  followup_reason?: string;
}

export function FeedbackModal({ isOpen, onClose, report, onSuccess }: FeedbackModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [resolutionTimeAcceptable, setResolutionTimeAcceptable] = useState(true);
  const [workQualityAcceptable, setWorkQualityAcceptable] = useState(true);
  const [officerBehaviorAcceptable, setOfficerBehaviorAcceptable] = useState(true);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [requiresFollowup, setRequiresFollowup] = useState(false);
  const [followupReason, setFollowupReason] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setRating(0);
      setComment('');
      setResolutionTimeAcceptable(true);
      setWorkQualityAcceptable(true);
      setOfficerBehaviorAcceptable(true);
      setWouldRecommend(true);
      setRequiresFollowup(false);
      setFollowupReason('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const getSatisfactionLevel = (): SatisfactionLevel => {
    if (rating === 5) return SatisfactionLevel.VERY_SATISFIED;
    if (rating === 4) return SatisfactionLevel.SATISFIED;
    if (rating === 3) return SatisfactionLevel.NEUTRAL;
    if (rating === 2) return SatisfactionLevel.DISSATISFIED;
    return SatisfactionLevel.VERY_DISSATISFIED;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    if (requiresFollowup && !followupReason.trim()) {
      setError('Please provide a reason for followup');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const feedbackData: FeedbackData = {
        report_id: report.id,
        rating,
        satisfaction_level: getSatisfactionLevel(),
        comment: comment.trim() || undefined,
        resolution_time_acceptable: resolutionTimeAcceptable,
        work_quality_acceptable: workQualityAcceptable,
        officer_behavior_acceptable: officerBehaviorAcceptable,
        would_recommend: wouldRecommend,
        requires_followup: requiresFollowup,
        followup_reason: requiresFollowup ? followupReason.trim() : undefined,
      };

      const response = await fetch('/api/v1/feedbacks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit feedback');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Provide Feedback</h2>
            <p className="text-sm text-gray-600 mt-1">
              Report #{report.report_number || report.id} - {report.title}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-600">Your feedback has been submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Overall Rating <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {rating === 5 && '⭐ Excellent'}
                    {rating === 4 && '👍 Good'}
                    {rating === 3 && '😐 Average'}
                    {rating === 2 && '👎 Poor'}
                    {rating === 1 && '😞 Very Poor'}
                  </span>
                )}
              </div>
            </div>

            {/* Quality Checks */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please rate the following aspects:
              </label>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Resolution time was acceptable</span>
                <button
                  type="button"
                  onClick={() => setResolutionTimeAcceptable(!resolutionTimeAcceptable)}
                  className={`p-2 rounded-lg transition-colors ${
                    resolutionTimeAcceptable
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {resolutionTimeAcceptable ? <ThumbsUp className="w-5 h-5" /> : <ThumbsDown className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Work quality was acceptable</span>
                <button
                  type="button"
                  onClick={() => setWorkQualityAcceptable(!workQualityAcceptable)}
                  className={`p-2 rounded-lg transition-colors ${
                    workQualityAcceptable
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {workQualityAcceptable ? <ThumbsUp className="w-5 h-5" /> : <ThumbsDown className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Officer behavior was professional</span>
                <button
                  type="button"
                  onClick={() => setOfficerBehaviorAcceptable(!officerBehaviorAcceptable)}
                  className={`p-2 rounded-lg transition-colors ${
                    officerBehaviorAcceptable
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {officerBehaviorAcceptable ? <ThumbsUp className="w-5 h-5" /> : <ThumbsDown className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Would recommend this service</span>
                <button
                  type="button"
                  onClick={() => setWouldRecommend(!wouldRecommend)}
                  className={`p-2 rounded-lg transition-colors ${
                    wouldRecommend
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {wouldRecommend ? <ThumbsUp className="w-5 h-5" /> : <ThumbsDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Share your experience or suggestions..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{comment.length}/500 characters</p>
            </div>

            {/* Followup */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="requiresFollowup"
                checked={requiresFollowup}
                onChange={(e) => setRequiresFollowup(e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="requiresFollowup" className="text-sm font-medium text-gray-700 cursor-pointer">
                  This issue requires follow-up
                </label>
                {requiresFollowup && (
                  <textarea
                    value={followupReason}
                    onChange={(e) => setFollowupReason(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Please explain why follow-up is needed..."
                    required={requiresFollowup}
                  />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Feedback
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
