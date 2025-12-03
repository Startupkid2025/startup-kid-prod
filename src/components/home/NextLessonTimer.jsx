import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, BookOpen, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function NextLessonTimer({ group, lesson }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [nextScheduledLesson, setNextScheduledLesson] = useState(null);
  const [actualLesson, setActualLesson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useDefaultSchedule, setUseDefaultSchedule] = useState(false);

  useEffect(() => {
    loadNextScheduledLesson();
  }, [group]);

  const getNextOccurrenceOfDay = (dayOfWeek, hour) => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const [lessonHour, lessonMinute] = hour.split(':').map(Number);
    
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && (currentHour > lessonHour || (currentHour === lessonHour && currentMinute >= lessonMinute)))) {
      daysUntil += 7;
    }

    const targetDateTime = new Date(now);
    targetDateTime.setDate(targetDateTime.getDate() + daysUntil);
    targetDateTime.setHours(lessonHour, lessonMinute, 0, 0);
    
    return targetDateTime;
  };

  const loadNextScheduledLesson = async () => {
    if (!group) {
      setIsLoading(false);
      return;
    }

    try {
      const scheduledLessons = await base44.entities.ScheduledLesson.filter({
        group_id: group.id
      });

      const now = new Date();
      const futureLessons = scheduledLessons.filter(sl => {
        if (sl.is_cancelled) return false;
        
        try {
          const dateStr = sl.scheduled_date.includes('T') 
            ? sl.scheduled_date.split('T')[0] 
            : sl.scheduled_date;
          
          const lessonDateTime = new Date(dateStr + 'T00:00:00');
          
          if (sl.start_time) {
            const [hours, minutes] = sl.start_time.split(':');
            lessonDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else if (group.hour) {
            const [hours, minutes] = group.hour.split(':');
            lessonDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          }
          
          return lessonDateTime > now;
        } catch (e) {
          console.error("Error parsing lesson date:", e);
          return false;
        }
      });

      futureLessons.sort((a, b) => {
        const dateAStr = a.scheduled_date.includes('T') ? a.scheduled_date.split('T')[0] : a.scheduled_date;
        const dateBStr = b.scheduled_date.includes('T') ? b.scheduled_date.split('T')[0] : b.scheduled_date;
        const dateA = new Date(dateAStr + 'T00:00:00');
        const dateB = new Date(dateBStr + 'T00:00:00');
        return dateA - dateB;
      });

      // Calculate next default occurrence
      const nextDefaultOccurrence = getNextOccurrenceOfDay(group.day_of_week, group.hour);

      // Decide what to show: scheduled lesson or default schedule
      if (futureLessons.length > 0) {
        const nextScheduledDateTime = new Date(
          (futureLessons[0].scheduled_date.includes('T') 
            ? futureLessons[0].scheduled_date.split('T')[0] 
            : futureLessons[0].scheduled_date) + 'T00:00:00'
        );
        
        if (futureLessons[0].start_time) {
          const [hours, minutes] = futureLessons[0].start_time.split(':');
          nextScheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else if (group.hour) {
          const [hours, minutes] = group.hour.split(':');
          nextScheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        // If default occurrence is sooner, use it instead
        if (nextDefaultOccurrence < nextScheduledDateTime) {
          setNextScheduledLesson(null);
          setActualLesson(null);
          setUseDefaultSchedule(true);
        } else {
          setNextScheduledLesson(futureLessons[0]);
          setUseDefaultSchedule(false);
          
          if (futureLessons[0].lesson_id) {
            try {
              const allLessons = await base44.entities.Lesson.list();
              const lessonData = allLessons.find(l => l.id === futureLessons[0].lesson_id);
              setActualLesson(lessonData || null);
            } catch (e) {
              console.log("Could not load lesson details:", e);
              setActualLesson(null);
            }
          } else {
            setActualLesson(null);
          }
        }
      } else {
        setNextScheduledLesson(null);
        setActualLesson(null);
        setUseDefaultSchedule(true);
      }
    } catch (error) {
      console.error("Error loading scheduled lessons:", error);
      setNextScheduledLesson(null);
      setActualLesson(null);
      setUseDefaultSchedule(true);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (!group) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      let targetDateTime;

      try {
        if (nextScheduledLesson && !useDefaultSchedule) {
          const dateStr = nextScheduledLesson.scheduled_date.includes('T') 
            ? nextScheduledLesson.scheduled_date.split('T')[0] 
            : nextScheduledLesson.scheduled_date;
          
          targetDateTime = new Date(dateStr + 'T00:00:00');
          
          if (nextScheduledLesson.start_time) {
            const [hours, minutes] = nextScheduledLesson.start_time.split(':');
            targetDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else if (group.hour) {
            const [hours, minutes] = group.hour.split(':');
            targetDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          }
        } else {
          // Use default schedule
          targetDateTime = getNextOccurrenceOfDay(group.day_of_week, group.hour);
        }

        const diff = targetDateTime - now;
        
        if (diff <= 0) {
          return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        };
      } catch (error) {
        console.error("Error calculating time:", error);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [group, nextScheduledLesson, useDefaultSchedule]);

  if (!group || isLoading) return null;

  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const isLessonSoon = timeLeft.days === 0 && timeLeft.hours < 2;
  const canJoinLesson = timeLeft.days === 0 && timeLeft.hours === 0;

  const displayLesson = actualLesson || lesson;
  
  let displayDate = null;
  let displayDayName = "";
  
  try {
    if (nextScheduledLesson && !useDefaultSchedule) {
      const dateStr = nextScheduledLesson.scheduled_date.includes('T') 
        ? nextScheduledLesson.scheduled_date.split('T')[0] 
        : nextScheduledLesson.scheduled_date;
      displayDate = new Date(dateStr + 'T00:00:00');
      displayDayName = dayNames[displayDate.getDay()];
    } else {
      // Show next default occurrence
      displayDate = getNextOccurrenceOfDay(group.day_of_week, group.hour);
      displayDayName = dayNames[displayDate.getDay()];
    }
  } catch (e) {
    console.error("Error parsing display date:", e);
  }
  
  const displayTime = nextScheduledLesson?.start_time || group.hour;

  const handleDiscordClick = () => {
    window.open("https://discord.gg/UknsPbhT", "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-6"
    >
      <Card className={`overflow-hidden border-2 shadow-2xl ${
        isLessonSoon 
          ? 'bg-gradient-to-br from-red-900/60 to-orange-900/60 border-red-400/60 animate-pulse' 
          : 'bg-gradient-to-br from-purple-900/60 to-pink-900/60 border-purple-400/50'
      } backdrop-blur-xl`}>
        <CardContent className="p-4 sm:p-6">
          {/* Header */}
          <div className="text-center mb-4">
            <h3 className="text-xl sm:text-2xl font-black text-white mb-1">
              {isLessonSoon ? '🚨 השיעור הבא ממש קרוב! 🚨' : '⏰ השיעור הבא'}
            </h3>
            {displayLesson && !useDefaultSchedule && (
              <div className="flex items-center justify-center gap-2 text-purple-200">
                <BookOpen className="w-4 h-4" />
                <p className="font-bold">{displayLesson.lesson_name}</p>
              </div>
            )}
            {displayDate && (
              <p className="text-white/70 text-sm mt-1">
                יום {displayDayName}, {displayDate.getDate()} {displayDate.toLocaleDateString('he-IL', { month: 'long' })}
              </p>
            )}
          </div>

          {/* Timer */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
            {[
              { value: timeLeft.seconds, label: "שניות" },
              { value: timeLeft.minutes, label: "דקות" },
              { value: timeLeft.hours, label: "שעות" },
              { value: timeLeft.days, label: "ימים" }
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="bg-white/15 rounded-xl p-2 sm:p-3 text-center backdrop-blur-sm border border-white/20"
              >
                <motion.div 
                  key={item.value}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl sm:text-4xl font-black text-white"
                >
                  {item.value}
                </motion.div>
                <div className="text-[10px] sm:text-xs text-white/70 mt-1">{item.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Info */}
          <div className="flex items-center justify-center gap-4 text-sm text-white/90 bg-white/10 rounded-lg p-3 border border-white/20 mb-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-300" />
              <span className="font-medium">שעה {displayTime}</span>
            </div>
          </div>

          {/* Discord Button */}
          {canJoinLesson && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleDiscordClick}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 text-base shadow-lg"
              >
                <MessageCircle className="w-5 h-5 ml-2" />
                כניסה לשיעור 🚀
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}