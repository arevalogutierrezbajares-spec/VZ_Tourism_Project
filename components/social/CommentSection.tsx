'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const commentVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

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
            className="min-w-[44px] min-h-[44px] cursor-pointer active:scale-[0.96] transition-[transform,opacity] duration-150"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {localComments.map((comment, index) => (
            <motion.div
              key={comment.id}
              variants={commentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ delay: index < 5 ? index * 0.06 : 0 }}
              className="flex gap-3"
            >
              <Avatar className="w-8 h-8 flex-shrink-0 outline outline-1 -outline-offset-1 outline-black/10 rounded-full">
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
                <p className="text-sm text-foreground/80 text-pretty">{comment.body}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {localComments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
}
