'use client';

import { useState, useMemo } from 'react';
import {
  Star,
  Search,
  Plus,
  MessageSquare,
  Eye,
  EyeOff,
  Filter,
  Users,
  TrendingUp,
  Download,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { ReviewModal } from './ReviewModal';
import { ResponseModal } from './ResponseModal';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  isPublic: boolean;
  clientName: string;
  clientId: string | null;
  staffName: string | null;
  staffId: string | null;
  createdAt: string;
}

interface ReviewsData {
  reviews: Review[];
  staff: { id: string; name: string }[];
}

export function ReviewsClient({ data }: { data: ReviewsData }) {
  const [reviews, setReviews] = useState(data.reviews);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [staffFilter, setStaffFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [respondingReview, setRespondingReview] = useState<Review | null>(null);

  // Stats
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { avg: 0, total: 0, distribution: [0, 0, 0, 0, 0], positive: 0, needsResponse: 0 };
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / total;
    const distribution = [1, 2, 3, 4, 5].map((r) => reviews.filter((rv) => rv.rating === r).length);
    const positive = reviews.filter((r) => r.rating >= 4).length;
    const needsResponse = reviews.filter((r) => !r.response && r.comment).length;
    return { avg, total, distribution, positive, needsResponse };
  }, [reviews]);

  // Filtered
  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      const matchSearch = !search ||
        r.clientName.toLowerCase().includes(search.toLowerCase()) ||
        r.comment?.toLowerCase().includes(search.toLowerCase()) ||
        r.staffName?.toLowerCase().includes(search.toLowerCase());
      const matchRating = !ratingFilter || r.rating === ratingFilter;
      const matchStaff = !staffFilter || r.staffId === staffFilter;
      return matchSearch && matchRating && matchStaff;
    });
  }, [reviews, search, ratingFilter, staffFilter]);

  const handleAddReview = async (reviewData: any) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      window.location.reload();
    } catch (err: any) { alert(err.message); }
  };

  const handleResponse = async (reviewId: string, response: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) throw new Error('შეცდომა');
      setReviews(reviews.map((r) => r.id === reviewId ? { ...r, response } : r));
      setRespondingReview(null);
    } catch (err: any) { alert(err.message); }
  };

  const toggleVisibility = async (reviewId: string, isPublic: boolean) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (!res.ok) throw new Error('შეცდომა');
      setReviews(reviews.map((r) => r.id === reviewId ? { ...r, isPublic: !isPublic } : r));
    } catch (err: any) { alert(err.message); }
  };

  const downloadCSV = () => {
    const lines = ['\uFEFF თარიღი,კლიენტი,სპეციალისტი,შეფასება,კომენტარი,პასუხი,საჯარო'];
    reviews.forEach((r) => {
      const date = new Date(r.createdAt).toLocaleDateString('ka-GE');
      lines.push(`${date},${r.clientName},${r.staffName || ''},${r.rating},${(r.comment || '').replace(/,/g, ';')},${(r.response || '').replace(/,/g, ';')},${r.isPublic ? 'დიახ' : 'არა'}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `შეფასებები_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const renderStars = (rating: number, size = 14) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={cn(i <= rating ? 'text-amber-400 fill-amber-400' : 'text-dark-600')} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star size={24} className="text-primary-400" />
            შეფასებები
          </h1>
          <p className="text-dark-400 mt-1">კლიენტების უკუკავშირი</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> ექსპორტი
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> შეფასება
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{stats.avg.toFixed(1)}</p>
          <div className="flex justify-center my-1">{renderStars(Math.round(stats.avg))}</div>
          <p className="text-xs text-dark-400">{stats.total} შეფასება</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <ThumbsUp size={16} className="text-emerald-400" />
            <span className="text-xs text-dark-400">პოზიტიური (4-5⭐)</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{stats.positive}</p>
          {stats.total > 0 && <p className="text-xs text-dark-500">{((stats.positive / stats.total) * 100).toFixed(0)}%</p>}
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={16} className="text-amber-400" />
            <span className="text-xs text-dark-400">უპასუხოდ</span>
          </div>
          <p className="text-xl font-bold text-amber-400">{stats.needsResponse}</p>
        </div>
        <div className="card p-4">
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((r) => {
              const count = stats.distribution[r - 1];
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={r} className="flex items-center gap-2">
                  <span className="text-[10px] text-dark-400 w-3">{r}</span>
                  <Star size={8} className="text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-dark-500 w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ძებნა კლიენტით, კომენტარით..." className="input pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setRatingFilter(null)}
            className={cn('px-3 py-1.5 rounded-lg text-sm', !ratingFilter ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-dark-800 text-dark-300 border border-dark-700')}>
            ყველა
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button key={r} onClick={() => setRatingFilter(ratingFilter === r ? null : r)}
              className={cn('px-3 py-1.5 rounded-lg text-sm flex items-center gap-1', ratingFilter === r ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-dark-800 text-dark-300 border border-dark-700')}>
              {r} <Star size={10} className="fill-current" />
            </button>
          ))}
        </div>
        {data.staff.length > 0 && (
          <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="input w-auto text-sm">
            <option value="">ყველა სპეც.</option>
            {data.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Reviews List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Star size={48} className="mx-auto mb-4 text-dark-500 opacity-30" />
          <p className="text-dark-400">{search || ratingFilter ? 'შეფასება ვერ მოიძებნა' : 'შეფასებები ჯერ არ არის'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div key={review.id} className="card">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-primary-500/20 text-primary-400 rounded-xl flex items-center justify-center text-sm font-bold shrink-0">
                  {review.clientName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-sm font-medium text-white">{review.clientName}</span>
                      {review.staffName && (
                        <span className="text-xs text-dark-400 ml-2">→ {review.staffName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating, 12)}
                      <span className="text-[10px] text-dark-500">
                        {new Date(review.createdAt).toLocaleDateString('ka-GE', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm text-dark-200 mt-2">{review.comment}</p>
                  )}

                  {/* Response */}
                  {review.response && (
                    <div className="mt-3 p-3 bg-primary-500/5 border border-primary-500/10 rounded-lg">
                      <p className="text-xs text-primary-400 mb-1">პასუხი:</p>
                      <p className="text-sm text-dark-200">{review.response}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    {!review.response && review.comment && (
                      <button
                        onClick={() => setRespondingReview(review)}
                        className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded hover:bg-dark-700 flex items-center gap-1"
                      >
                        <MessageSquare size={12} /> პასუხი
                      </button>
                    )}
                    <button
                      onClick={() => toggleVisibility(review.id, review.isPublic)}
                      className={cn('text-xs px-2 py-1 rounded flex items-center gap-1',
                        review.isPublic
                          ? 'text-emerald-400 hover:bg-dark-700'
                          : 'text-dark-400 hover:bg-dark-700'
                      )}
                    >
                      {review.isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                      {review.isPublic ? 'საჯარო' : 'პრივატული'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <ReviewModal
          staff={data.staff}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddReview}
        />
      )}
      {respondingReview && (
        <ResponseModal
          review={respondingReview}
          onClose={() => setRespondingReview(null)}
          onSave={handleResponse}
        />
      )}
    </div>
  );
}
