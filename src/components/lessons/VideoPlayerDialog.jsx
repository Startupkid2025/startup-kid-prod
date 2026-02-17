import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { syncLeaderboardEntry } from "../utils/leaderboardSync";

export default function VideoPlayerDialog({ isOpen, onClose, lesson }) {
  const [hasMarkedAsWatched, setHasMarkedAsWatched] = useState(false);
  const [hasGivenXP, setHasGivenXP] = useState(false);

  useEffect(() => {
    let watchTimer;
    
    if (isOpen && lesson && !hasMarkedAsWatched) {
      watchTimer = setTimeout(async () => {
        try {
          const user = await base44.auth.me();
          
          const participations = await base44.entities.LessonParticipation.filter({
            lesson_id: lesson.id,
            student_email: user.email
          });
          
          if (participations.length > 0) {
            const participation = participations[0];
            
            // Check if user didn't attend and hasn't watched yet
            const shouldGiveXP = participation.attended === false && !participation.watched_recording;
            const shouldUpdateLessonCounters = !participation.attended; // Need to increment counters
            
            // Mark as watched
            await base44.entities.LessonParticipation.update(participation.id, {
              watched_recording: true,
              attended: true // Mark as attended when watching
            });
            setHasMarkedAsWatched(true);
            
            // Update lesson counters if needed
            if (shouldUpdateLessonCounters && lesson.category) {
              const updates = { total_lessons: (user.total_lessons || 0) + 1 };
              
              if (lesson.category === 'ai_tech') {
                updates.ai_tech_lessons = (user.ai_tech_lessons || 0) + 1;
              } else if (lesson.category === 'money_business') {
                updates.money_business_lessons = (user.money_business_lessons || 0) + 1;
              } else if (lesson.category === 'personal_skills' || lesson.category === 'social_skills') {
                updates.social_skills_lessons = (user.social_skills_lessons || 0) + 1;
              }
              
              await base44.auth.updateMe(updates);
              
              // Sync total_lessons to leaderboard
              await syncLeaderboardEntry({...user, ...updates}, { total_lessons: updates.total_lessons });
            }
            
            // Give XP if they missed the lesson
            if (shouldGiveXP && !hasGivenXP) {
              const xpToAdd = {
                ai_tech_xp: lesson.ai_tech_xp || 0,
                personal_dev_xp: lesson.personal_dev_xp || 0,
                social_skills_xp: lesson.social_skills_xp || 0,
                money_business_xp: lesson.money_business_xp || 0
              };
              
              const totalXP = Object.values(xpToAdd).reduce((sum, xp) => sum + xp, 0);
              
              if (totalXP > 0) {
                // Update each skill
                const updates = {};
                
                for (const [skill, xp] of Object.entries(xpToAdd)) {
                  if (xp > 0) {
                    const currentXP = user[skill] || 0;
                    const levelKey = skill.replace('_xp', '_level');
                    const currentLevel = user[levelKey] || 1;
                    
                    const totalXPForSkill = (currentLevel - 1) * 100 + currentXP + xp;
                    const newLevel = Math.floor(totalXPForSkill / 100) + 1;
                    const newXP = totalXPForSkill % 100;
                    
                    updates[skill] = newXP;
                    updates[levelKey] = newLevel;
                  }
                }
                
                await base44.auth.updateMe(updates);
                setHasGivenXP(true);
                
                toast.success(`צפית בהקלטה! קיבלת ${totalXP} XP 🎉`);
              }
            }
            
            console.log("Marked lesson as watched" + (shouldGiveXP ? " and gave XP" : ""));
          }
        } catch (error) {
          console.error("Error marking lesson as watched:", error);
        }
      }, 120000); // 2 minutes
    }
    
    return () => {
      if (watchTimer) clearTimeout(watchTimer);
    };
  }, [isOpen, lesson, hasMarkedAsWatched, hasGivenXP]);

  if (!lesson) return null;

  const getEmbedUrl = (url) => {
    if (!url) return null;

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId;
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('youtube.com/watch')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtube.com/embed/')) {
        return url;
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0` : null;
    }

    if (url.includes('drive.google.com')) {
      let fileId = null;
      
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        fileId = fileMatch[1];
      }
      
      if (!fileId) {
        const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch) {
          fileId = idMatch[1];
        }
      }
      
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }

    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}?quality=auto` : null;
    }

    if (url.includes('loom.com')) {
      const videoId = url.split('share/')[1]?.split('?')[0];
      return videoId ? `https://www.loom.com/embed/${videoId}` : null;
    }

    return url;
  };

  const embedUrl = getEmbedUrl(lesson.recorded_lesson_url);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[80vh] bg-black/95 backdrop-blur-xl border-2 border-purple-300 p-0">
        <DialogHeader className="p-3 bg-gradient-to-r from-purple-600 to-pink-600">
          <DialogTitle className="text-lg font-bold text-white text-center">
            {lesson.lesson_name}
          </DialogTitle>
        </DialogHeader>

        <div className="aspect-video p-3">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title={lesson.lesson_name}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-white text-xl mb-4">⚠️ לא ניתן להציג את הסרטון</p>
                <p className="text-white/70 mb-4">פורמט הקישור לא נתמך</p>
                <button
                  onClick={() => window.open(lesson.recorded_lesson_url, '_blank')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2 rounded-lg"
                >
                  פתח בחלון חדש
                </button>
              </div>
            </div>
          )}
        </div>

        {lesson.description && (
          <div className="p-3 bg-white/5 border-t border-white/10">
            <p className="text-white/80 text-sm">{lesson.description}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}