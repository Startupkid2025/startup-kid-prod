import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, MessageCircle, Send, Trash2, Edit2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import TamagotchiAvatar from "../avatar/TamagotchiAvatar";

export default function CommunityFeed({ userData, onRefresh }) {
  const currentUser = userData;
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [commentTexts, setCommentTexts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [editingComment, setEditingComment] = useState(null); // { postId, commentIndex, text }
  const [editingPost, setEditingPost] = useState(null); // { postId, text }
  const [showLikesDialog, setShowLikesDialog] = useState(null); // postId or null
  const [likesUserData, setLikesUserData] = useState({}); // { email: { name, equipped_items } }

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const allPosts = await base44.entities.Post.list("-created_date", 50);
      
      // Try to fetch user data for avatars, but don't fail if not allowed
      let usersMap = {};
      try {
        const allUsers = await base44.entities.User.list();
        allUsers.forEach(u => {
          usersMap[u.email] = {
            equipped_items: u.equipped_items || {},
            first_name: u.first_name,
            last_name: u.last_name
          };
        });
      } catch (userError) {
        console.log("Could not load user data (normal for non-admin users)");
        // For current user, use their own data
        if (userData) {
          usersMap[userData.email] = {
            equipped_items: userData.equipped_items || {},
            first_name: userData.first_name,
            last_name: userData.last_name
          };
        }
      }
      
      // Store user data for likes dialog
      setLikesUserData(usersMap);
      
      const postsWithUserData = allPosts.map(post => ({
        ...post,
        userData: usersMap[post.author_email] || {}
      }));
      
      setPosts(postsWithUserData);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("שגיאה בטעינת הפיד");
    }
    setIsLoading(false);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error("אנא כתוב משהו");
      return;
    }

    setIsPosting(true);
    try {
      const authorName = currentUser.first_name && currentUser.last_name
        ? `${currentUser.first_name} ${currentUser.last_name}`
        : currentUser.full_name;

      await base44.entities.Post.create({
        author_email: currentUser.email,
        author_name: authorName,
        content: newPostContent
      });

      setNewPostContent("");
      toast.success("הפוסט פורסם! 🎉");
      await loadPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("שגיאה בפרסום הפוסט");
    }
    setIsPosting(false);
  };

  const handleLike = async (post) => {
    try {
      const likes = post.likes || [];
      const hasLiked = likes.includes(currentUser.email);

      const updatedLikes = hasLiked
        ? likes.filter(email => email !== currentUser.email)
        : [...likes, currentUser.email];

      await base44.entities.Post.update(post.id, {
        likes: updatedLikes
      });

      // Award 3 coins for liking (only when adding a like, not removing)
      if (!hasLiked) {
        const newCoins = (currentUser.coins || 0) + 3;
        await base44.auth.updateMe({
          coins: newCoins
        });

        // Update leaderboard
        try {
          const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: currentUser.email });
          if (leaderboardEntries.length > 0) {
            await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
              coins: newCoins
            });
          }
        } catch (leaderboardError) {
          console.error("Error updating leaderboard:", leaderboardError);
        }

        toast.success("לייק! +3 מטבעות 💙");
      }

      await loadPosts();
    } catch (error) {
      console.error("Error liking post:", error);
      toast.error("שגיאה");
    }
  };

  const handleComment = async (post) => {
    const commentText = commentTexts[post.id];
    if (!commentText?.trim()) {
      toast.error("אנא כתוב תגובה");
      return;
    }

    try {
      const authorName = currentUser.first_name && currentUser.last_name
        ? `${currentUser.first_name} ${currentUser.last_name}`
        : currentUser.full_name;

      const comments = post.comments || [];
      const newComment = {
        author_email: currentUser.email,
        author_name: authorName,
        content: commentText,
        created_at: new Date().toISOString()
      };

      await base44.entities.Post.update(post.id, {
        comments: [...comments, newComment]
      });

      // Award 3 coins for commenting
      const newCoins = (currentUser.coins || 0) + 3;
      await base44.auth.updateMe({
        coins: newCoins
      });

      // Update leaderboard
      try {
        const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: currentUser.email });
        if (leaderboardEntries.length > 0) {
          await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
            coins: newCoins
          });
        }
      } catch (leaderboardError) {
        console.error("Error updating leaderboard:", leaderboardError);
      }

      setCommentTexts({ ...commentTexts, [post.id]: "" });
      toast.success("תגובה נוספה! +3 מטבעות 💬");
      await loadPosts();
    } catch (error) {
      console.error("Error commenting:", error);
      toast.error("שגיאה בהוספת תגובה");
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await base44.entities.Post.delete(postId);
      toast.success("הפוסט נמחק");
      await loadPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("שגיאה במחיקת הפוסט");
    }
  };

  const handleEditPost = async (post) => {
    if (!editingPost?.text?.trim()) {
      toast.error("אנא כתוב משהו");
      return;
    }

    try {
      await base44.entities.Post.update(post.id, {
        content: editingPost.text,
        edited: true
      });

      setEditingPost(null);
      toast.success("הפוסט עודכן! ✏️");
      await loadPosts();
    } catch (error) {
      console.error("Error editing post:", error);
      toast.error("שגיאה בעריכת הפוסט");
    }
  };

  const handleEditComment = async (post, commentIndex) => {
    if (!editingComment?.text?.trim()) {
      toast.error("אנא כתוב תגובה");
      return;
    }

    try {
      const comments = [...post.comments];
      comments[commentIndex] = {
        ...comments[commentIndex],
        content: editingComment.text,
        edited: true
      };

      await base44.entities.Post.update(post.id, {
        comments: comments
      });

      setEditingComment(null);
      toast.success("התגובה עודכנה! ✏️");
      await loadPosts();
    } catch (error) {
      console.error("Error editing comment:", error);
      toast.error("שגיאה בעריכת התגובה");
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6 text-center">
          <div className="text-white/70">טוען פיד...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-xl flex items-center gap-2">
          💬 הפיד של הכיתה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create New Post */}
        <div className="bg-white/5 rounded-lg p-4">
          <Textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="שתף משהו עם הכיתה... 💭"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 mb-3 min-h-[80px]"
          />
          <Button
            onClick={handleCreatePost}
            disabled={isPosting || !newPostContent.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            פרסם
          </Button>
        </div>

        {/* Posts Feed */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          <AnimatePresence>
            {posts.map((post) => {
              const likes = post.likes || [];
              const hasLiked = likes.includes(currentUser.email);
              const comments = post.comments || [];
              const isOwnPost = post.author_email === currentUser.email;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/5 rounded-lg p-4"
                >
                  {/* Post Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                        <div className="scale-[0.55] -mt-2 -mr-2">
                          <TamagotchiAvatar
                            equippedItems={post.userData?.equipped_items || {}}
                            size="small"
                            showBackground={false}
                            userEmail={post.author_email}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-bold text-sm">{post.author_name}</p>
                        {isOwnPost && editingPost?.postId !== post.id && (
                          <div className="flex gap-1">
                            <Button
                              onClick={() => setEditingPost({ postId: post.id, text: post.content })}
                              size="sm"
                              variant="ghost"
                              className="text-white/50 hover:text-white/80 h-6 px-2"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeletePost(post.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-300 hover:text-red-200 h-6 px-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-white/50 text-xs">
                        {new Date(post.created_date).toLocaleDateString('he-IL')} {new Date(post.created_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        {post.edited && <span className="mr-1">(נערך)</span>}
                      </p>
                    </div>
                  </div>

                  {/* Post Content */}
                  {editingPost?.postId === post.id ? (
                    <div className="mb-3">
                      <Textarea
                        value={editingPost.text}
                        onChange={(e) => setEditingPost({ ...editingPost, text: e.target.value })}
                        className="bg-white/10 border-white/20 text-white mb-2"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditPost(post)}
                          size="sm"
                          className="bg-green-500/30 hover:bg-green-500/50"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          שמור
                        </Button>
                        <Button
                          onClick={() => setEditingPost(null)}
                          size="sm"
                          variant="ghost"
                          className="text-white/50 hover:text-white/80"
                        >
                          <X className="w-3 h-3 mr-1" />
                          ביטול
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white mb-3 whitespace-pre-wrap">{post.content}</p>
                  )}

                  {/* Like Button */}
                  <div className="flex items-center gap-4 mb-3">
                    <Button
                      onClick={() => handleLike(post)}
                      size="sm"
                      variant="ghost"
                      className={`h-8 px-3 ${hasLiked ? 'text-red-400' : 'text-white/70'} hover:text-red-300`}
                    >
                      <Heart className={`w-4 h-4 mr-1 ${hasLiked ? 'fill-current' : ''}`} />
                      {likes.length > 0 && (
                        <span 
                          className="cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLikesDialog(post.id);
                          }}
                        >
                          {likes.length}
                        </span>
                      )}
                    </Button>
                    <div className="text-white/50 text-sm flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {comments.length}
                    </div>
                  </div>

                  {/* Comments */}
                  {comments.length > 0 && (
                    <div className="space-y-2 mb-3 pl-4 border-r-2 border-white/10">
                      {comments.map((comment, idx) => {
                        const isOwnComment = comment.author_email === currentUser.email;
                        const isEditing = editingComment?.postId === post.id && editingComment?.commentIndex === idx;
                        
                        return (
                          <div key={idx} className="bg-white/5 rounded-lg p-2">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-white/90 font-bold text-xs">{comment.author_name}</p>
                              {isOwnComment && !isEditing && (
                                <Button
                                  onClick={() => setEditingComment({ postId: post.id, commentIndex: idx, text: comment.content })}
                                  size="sm"
                                  variant="ghost"
                                  className="text-white/50 hover:text-white/80 h-5 px-1"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            
                            {isEditing ? (
                              <div className="flex gap-1 items-center">
                                <Input
                                  value={editingComment.text}
                                  onChange={(e) => setEditingComment({ ...editingComment, text: e.target.value })}
                                  className="bg-white/10 border-white/20 text-white h-7 text-sm"
                                  autoFocus
                                />
                                <Button
                                  onClick={() => handleEditComment(post, idx)}
                                  size="sm"
                                  className="bg-green-500/30 hover:bg-green-500/50 h-7 px-2"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => setEditingComment(null)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-white/50 hover:text-white/80 h-7 px-2"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="text-white/70 text-sm">{comment.content}</p>
                                <p className="text-white/40 text-[10px] mt-1">
                                  {new Date(comment.created_at).toLocaleDateString('he-IL')} {new Date(comment.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                  {comment.edited && <span className="mr-1">(נערך)</span>}
                                </p>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Input
                      value={commentTexts[post.id] || ""}
                      onChange={(e) => setCommentTexts({ ...commentTexts, [post.id]: e.target.value })}
                      placeholder="כתוב תגובה..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleComment(post);
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleComment(post)}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 h-8"
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {posts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-white/50">אין עדיין פוסטים... היה הראשון! 🚀</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Likes Dialog */}
      <Dialog open={!!showLikesDialog} onOpenChange={(open) => !open && setShowLikesDialog(null)}>
        <DialogContent className="bg-gradient-to-br from-purple-500/95 to-pink-500/95 backdrop-blur-xl border-2 border-white/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white text-center">
              💙 לייקים
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {showLikesDialog && posts.find(p => p.id === showLikesDialog)?.likes?.map((email, idx) => {
              const userData = likesUserData[email] || {};
              const displayName = userData.first_name && userData.last_name
                ? `${userData.first_name} ${userData.last_name}`
                : email.split('@')[0];
              
              return (
                <div key={idx} className="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                    <div className="scale-[0.55] -mt-2 -mr-2">
                      <TamagotchiAvatar
                        equippedItems={userData.equipped_items || {}}
                        size="small"
                        showBackground={false}
                        userEmail={email}
                      />
                    </div>
                  </div>
                  <p className="text-white font-bold text-sm">{displayName}</p>
                </div>
              );
            })}
            {showLikesDialog && posts.find(p => p.id === showLikesDialog)?.likes?.length === 0 && (
              <p className="text-white/70 text-center py-4">אין עדיין לייקים</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}