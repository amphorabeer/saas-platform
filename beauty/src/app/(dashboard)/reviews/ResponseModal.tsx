'use client';

import { useState } from 'react';
import { X, MessageSquare, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  clientName: string;
}

export function ResponseModal({
  review,
  onClose,
  onSave,
}: {
  review: Review;
  onClose: () => void;
  onSave: (reviewId: string, response: string) => void;
}) {
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) { alert('შეიყვანეთ პასუხი'); return; }
    setSaving(true);
    await onSave(review.id, response);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-primary-400" />
            პასუხი
          </h2>
          <button onClick={onClose} className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Original review */}
          <div className="p-3 bg-dark-900/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white">{review.clientName}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={10} className={cn(i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-dark-600')} />
                ))}
              </div>
            </div>
            {review.comment && <p className="text-sm text-dark-300">{review.comment}</p>}
          </div>

          <div>
            <label className="label">თქვენი პასუხი *</label>
            <textarea value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4} placeholder="მადლობა თქვენი უკუკავშირისთვის..."
              className="input resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-dark-700 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">გაუქმება</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'იგზავნება...' : 'გაგზავნა'}
          </button>
        </div>
      </div>
    </div>
  );
}
