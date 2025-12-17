import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, Shield, Edit2, Trash2, FileText, Languages, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import StudentRow from "../components/admin/StudentRow";
import AddLessonDialog from "../components/admin/AddLessonDialog";
import EditLessonDialog from "../components/admin/EditLessonDialog";
import DeleteConfirmDialog from "../components/admin/DeleteConfirmDialog";
import LessonCard from "../components/lessons/LessonCard";
import LessonStudentsList from "../components/admin/LessonStudentsList";
import GroupManagement from "../components/admin/GroupManagement";
import TeacherManagement from "../components/admin/TeacherManagement";
import QuizQuestionsManager from "../components/admin/QuizQuestionsManager";
import VocabularyManager from "../components/admin/VocabularyManager";
import { AVATAR_ITEMS } from '../components/avatar/TamagotchiAvatar';

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [deletingLesson, setDeletingLesson] = useState(null);
  const [managingQuizLesson, setManagingQuizLesson] = useState(null);
  const [isFixingEverything, setIsFixingEverything] = useState(false);
  const [isRecalculatingCoins, setIsRecalculatingCoins] = useState(false);
  const [groups, setGroups] = useState([]);
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterUserType, setFilterUserType] = useState("student");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log("Loading admin data...");
      const user = await base44.auth.me();
      setCurrentUser(user);

      if (user.role !== "admin") {
        window.location.href = "/";
        return;
      }

      const allUsers = await base44.entities.User.list();
      const studentUsers = allUsers;
      
      const allLessons = await base44.entities.Lesson.list("-lesson_date");
      const allParticipations = await base44.entities.LessonParticipation.list();
      const allGroups = await base44.entities.Group.list();

      console.log("Loaded users:", allUsers.length);
      
      setStudents(studentUsers);
      setLessons(allLessons);
      setParticipations(allParticipations);
      setGroups(allGroups);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("שגיאה בטעינת נתונים");
      setIsLoading(false);
    }
  };

  // ... keep existing code (recalculateAllCoinsAccurately, fixEverything, etc.) ...

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          className="text-4xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          ⚙️
        </motion.div>
      </div>
    );
  }

  const totalParticipations = participations.length;

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">
          פאנל ניהול 🛠️
        </h1>
        <p className="text-white/80 text-lg">
          שלום {currentUser?.full_name}, ברוך הבא למערכת הניהול
        </p>
      </motion.div>

      {/* ... keep existing UI ... */}
    </div>
  );
}