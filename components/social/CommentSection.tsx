'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { formatRelativeDate, getInitials } from '@/lib/utils';

interface Comment {
  id: string;
  author: { name: string; avatar?: string };
  body: string;
  created_at: string;
}

interface CommentSectionProps {
  comments: Comment[];
  onSubmit?: (body: string) => Promise<void>;
  isAuthenticated?: boolean;
}

export function CommentSection({ comments, onSubmit, isAuthenticated = true }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState(comments);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(newComment);
      setLocalComments((prev) => [
        {
          id: Date.now().toString(),
          author: { name: 'You' },
          body: newComment,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Add a comment">
          <label htmlFor="comment-input" className="sr-only">Write a comment</label>
          <Input
            id="comment-input"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1"
            aria-describedby={isSubmitting ? 'comment-submitting' : undefined}
          />
          {isSubmitting && <span id="comment-submitting" className="sr-only">Submitting comment</span>}
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || isSubmitting}
            aria-label="Submit comment"
            className="min-w-[44px] min-h-[44px] cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}

      <div className="space-y-3">
        {localComments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={comment.author.avatar} alt={`${comment.author.name}'s avatar`} />
              <AvatarFallback className="text-xs">
                {getInitials(comment.author.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted/30 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium">{comment.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeDate(comment.created_at)}
                </span>
              </div>
              <p className="text-sm text-foreground/80">{comment.body}</p>
            </div>
          </div>
        ))}

        {localComments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
}
