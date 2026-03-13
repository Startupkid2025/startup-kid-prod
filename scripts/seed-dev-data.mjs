/**
 * Seed script for the dev Base44 instance.
 * Creates dummy data for all key entities so the dev app mimics prod functionality.
 *
 * Usage: node scripts/seed-dev-data.mjs
 */
import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId: '69b0312e53a24c6bc3f6f8f6',
  serverUrl: 'https://base44.app',
  requiresAuth: false,
});

const e = base44.entities;
const now = new Date().toISOString();
const todayStr = now.split('T')[0]; // YYYY-MM-DD

// ── Students ──
const students = [
  { first_name: 'דני',   last_name: 'כהן',    email: 'dani.test1@startup-kid.dev' },
  { first_name: 'נועה',  last_name: 'לוי',    email: 'noa.test2@startup-kid.dev' },
  { first_name: 'יובל',  last_name: 'אברהם',  email: 'yuval.test3@startup-kid.dev' },
  { first_name: 'מאיה',  last_name: 'שרון',   email: 'maya.test4@startup-kid.dev' },
  { first_name: 'איתי',  last_name: 'גולן',   email: 'itay.test5@startup-kid.dev' },
  { first_name: 'שירה',  last_name: 'דוד',    email: 'shira.test6@startup-kid.dev' },
  { first_name: 'עומר',  last_name: 'רוזן',   email: 'omer.test7@startup-kid.dev' },
  { first_name: 'תמר',   last_name: 'פרידמן', email: 'tamar.test8@startup-kid.dev' },
  { first_name: 'רועי',  last_name: 'מזרחי',  email: 'roi.test9@startup-kid.dev' },
  { first_name: 'ליאן',  last_name: 'ברק',    email: 'lian.test10@startup-kid.dev' },
];

const studentEmails = students.map(s => s.email);

async function safe(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✓ ${label}`);
    return result;
  } catch (err) {
    console.log(`  ✗ ${label}: ${err.message}`);
    return null;
  }
}

// ── 1. Delete old test students and recreate with proper fields ──
async function seedStudents() {
  console.log('\n── Students ──');
  // Try to delete existing test students first
  try {
    const existing = await e.User.list();
    for (const u of existing) {
      if (u.email?.endsWith('@startup-kid.dev')) {
        await safe(`Delete old ${u.email}`, () => e.User.delete(u.id));
      }
    }
  } catch (_) { /* auth required for list — skip cleanup */ }

  for (const s of students) {
    await safe(`Create ${s.first_name} ${s.last_name}`, () =>
      e.User.create({
        ...s,
        full_name: `${s.first_name} ${s.last_name}`,
        role: 'user',
        user_type: 'student',
        coins: 500,
        login_streak: Math.floor(Math.random() * 10),
        total_lessons: Math.floor(Math.random() * 8),
        total_work_hours: Math.floor(Math.random() * 20),
        total_collaboration_coins: 0,
        total_login_streak_coins: 0,
        total_admin_coins: 0,
      })
    );
  }
}

// ── 2. Lessons ──
async function seedLessons() {
  console.log('\n── Lessons ──');
  const existing = await e.Lesson.list();
  if (existing.length >= 4) {
    console.log(`  (skipped — ${existing.length} lessons already exist)`);
    return existing;
  }

  const lessons = [
    { lesson_name: 'מבוא ליזמות', category: 'money_business', ai_tech_xp: 0, personal_dev_xp: 10, social_skills_xp: 5, money_business_xp: 20 },
    { lesson_name: 'בינה מלאכותית בסיסית', category: 'ai_tech', ai_tech_xp: 25, personal_dev_xp: 5, social_skills_xp: 0, money_business_xp: 0 },
    { lesson_name: 'עבודת צוות', category: 'social_skills', ai_tech_xp: 0, personal_dev_xp: 10, social_skills_xp: 25, money_business_xp: 0 },
    { lesson_name: 'ניהול כספים', category: 'money_business', ai_tech_xp: 0, personal_dev_xp: 5, social_skills_xp: 0, money_business_xp: 25 },
    { lesson_name: 'פיתוח אפליקציות', category: 'ai_tech', ai_tech_xp: 25, personal_dev_xp: 10, social_skills_xp: 0, money_business_xp: 5 },
    { lesson_name: 'מנהיגות אישית', category: 'personal_dev', ai_tech_xp: 0, personal_dev_xp: 25, social_skills_xp: 10, money_business_xp: 0 },
  ];

  const created = [];
  for (const l of lessons) {
    const c = await safe(`Lesson: ${l.lesson_name}`, () => e.Lesson.create(l));
    if (c) created.push(c);
  }
  return created.length > 0 ? created : existing;
}

// ── 3. Update Group with students ──
async function seedGroup() {
  console.log('\n── Group ──');
  const groups = await e.Group.list();
  if (groups.length === 0) {
    await safe('Create test group', () => e.Group.create({
      group_name: 'קבוצת מבחן',
      day_of_week: new Date().getDay(),
      hour: '17:00',
      student_emails: studentEmails,
    }));
  } else {
    // Update existing group with student emails if empty
    for (const g of groups) {
      if (!g.student_emails || g.student_emails.length === 0) {
        await safe(`Add students to "${g.group_name}"`, () =>
          e.Group.update(g.id, { student_emails: studentEmails })
        );
      } else {
        console.log(`  (group "${g.group_name}" already has ${g.student_emails.length} students)`);
      }
    }
  }
  return (await e.Group.list());
}

// ── 4. LeaderboardEntry for each student ──
async function seedLeaderboard() {
  console.log('\n── LeaderboardEntry ──');
  const existing = await e.LeaderboardEntry.list();
  const existingEmails = new Set(existing.map(x => x.student_email));

  for (const s of students) {
    if (existingEmails.has(s.email)) {
      console.log(`  (skip ${s.first_name} — already in leaderboard)`);
      continue;
    }
    await safe(`Leaderboard: ${s.first_name}`, () => e.LeaderboardEntry.create({
      student_email: s.email,
      full_name: `${s.first_name} ${s.last_name}`,
      first_name: s.first_name,
      last_name: s.last_name,
      user_type: 'student',
      coins: 500,
      total_lessons: Math.floor(Math.random() * 8),
      mastered_words: Math.floor(Math.random() * 15),
      total_correct_math_answers: Math.floor(Math.random() * 30),
      login_streak: Math.floor(Math.random() * 10),
      total_work_hours: Math.floor(Math.random() * 20),
      total_networth: 500 + Math.floor(Math.random() * 500),
      crowns: [],
      equiped_items: '{}',
    }));
  }
}

// ── 5. VocabularyWord ──
async function seedVocabulary() {
  console.log('\n── VocabularyWord ──');
  const existing = await e.VocabularyWord.list();
  if (existing.length >= 5) {
    console.log(`  (skipped — ${existing.length} words already exist)`);
    return;
  }

  const words = [
    { word: 'יזמות', translation: 'Entrepreneurship', example_sentence: 'יזמות היא היכולת ליצור משהו חדש', difficulty: 'easy' },
    { word: 'השקעה', translation: 'Investment', example_sentence: 'השקעה חכמה מובילה לרווח', difficulty: 'easy' },
    { word: 'אלגוריתם', translation: 'Algorithm', example_sentence: 'אלגוריתם הוא סדרת פעולות לפתרון בעיה', difficulty: 'medium' },
    { word: 'חדשנות', translation: 'Innovation', example_sentence: 'חדשנות היא המפתח להצלחה', difficulty: 'easy' },
    { word: 'תכנות', translation: 'Programming', example_sentence: 'תכנות הוא שפה של המחשב', difficulty: 'medium' },
    { word: 'מניה', translation: 'Stock', example_sentence: 'קניתי מניה של חברת טכנולוגיה', difficulty: 'medium' },
    { word: 'תקציב', translation: 'Budget', example_sentence: 'חשוב לנהל תקציב אישי', difficulty: 'easy' },
    { word: 'סטארטאפ', translation: 'Startup', example_sentence: 'הסטארטאפ שלנו פיתח אפליקציה חדשה', difficulty: 'easy' },
  ];

  for (const w of words) {
    await safe(`Word: ${w.word}`, () => e.VocabularyWord.create(w));
  }
}

// ── 6. QuizQuestion ──
async function seedQuizQuestions() {
  console.log('\n── QuizQuestion ──');
  const existing = await e.QuizQuestion.list();
  if (existing.length >= 3) {
    console.log(`  (skipped — ${existing.length} questions already exist)`);
    return;
  }

  const questions = [
    {
      question_text: 'מה זה סטארטאפ?',
      options: JSON.stringify(['חברה גדולה', 'חברה חדשה בתחילת דרכה', 'בנק', 'חנות']),
      correct_answer: 1,
      category: 'money_business',
    },
    {
      question_text: 'מה תפקידו של אלגוריתם?',
      options: JSON.stringify(['לצייר', 'לפתור בעיות בצורה שיטתית', 'לשחק משחקים', 'לקרוא ספרים']),
      correct_answer: 1,
      category: 'ai_tech',
    },
    {
      question_text: 'מה החשיבות של עבודת צוות?',
      options: JSON.stringify(['אין חשיבות', 'להשיג תוצאות טובות יותר ביחד', 'לבזבז זמן', 'לריב']),
      correct_answer: 1,
      category: 'social_skills',
    },
  ];

  for (const q of questions) {
    await safe(`Quiz: ${q.question_text.slice(0, 20)}...`, () => e.QuizQuestion.create(q));
  }
}

// ── 7. DailyMarketPerformance ──
async function seedMarketData() {
  console.log('\n── DailyMarketPerformance ──');
  const existing = await e.DailyMarketPerformance.filter({ date: todayStr });
  if (existing && existing.length > 0) {
    console.log(`  (skipped — market data for today already exists)`);
    return;
  }

  await safe('Today\'s market', () => e.DailyMarketPerformance.create({
    date: todayStr,
    market_trend: 'up',
    change_percent: 2.5,
    business_performances: JSON.stringify({
      tech: { change: 3.1, price: 110 },
      food: { change: -0.5, price: 95 },
      fashion: { change: 1.2, price: 102 },
      gaming: { change: 4.0, price: 120 },
    }),
  }));
}

// ── 8. ScheduledLesson (for the group) ──
async function seedScheduledLessons(lessons, groups) {
  console.log('\n── ScheduledLesson ──');
  const existing = await e.ScheduledLesson.list();
  if (existing.length >= 2) {
    console.log(`  (skipped — ${existing.length} scheduled lessons already exist)`);
    return;
  }

  const group = groups[0];
  if (!group || !lessons || lessons.length === 0) {
    console.log('  (skipped — no group or lessons)');
    return;
  }

  // Schedule 2 upcoming lessons
  const today = new Date();
  for (let i = 0; i < 2 && i < lessons.length; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + (i * 7)); // today and next week
    const dateStr = date.toISOString().split('T')[0];

    await safe(`Schedule: ${lessons[i].lesson_name} on ${dateStr}`, () =>
      e.ScheduledLesson.create({
        group_id: group.id,
        lesson_id: lessons[i].id,
        scheduled_date: dateStr,
        start_time: group.hour || '17:00',
        is_cancelled: false,
        no_class: false,
        status: 'scheduled',
      })
    );
  }
}

// ── 9. Teacher ──
async function seedTeachers() {
  console.log('\n── Teacher ──');
  const existing = await e.Teacher.list();
  if (existing.length >= 1) {
    console.log(`  (skipped — ${existing.length} teachers already exist)`);
    return;
  }

  await safe('Teacher: רונית המורה', () => e.Teacher.create({
    full_name: 'רונית המורה',
    email: 'ronit.test@startup-kid.dev',
    phone: '050-1234567',
    status: 'active',
    notes: 'מורה לניסוי בסביבת dev',
  }));
}

// ── 10. Posts (community feed) ──
async function seedPosts() {
  console.log('\n── Post ──');
  const existing = await e.Post.list();
  if (existing.length >= 2) {
    console.log(`  (skipped — ${existing.length} posts already exist)`);
    return;
  }

  await safe('Post 1', () => e.Post.create({
    author_email: students[0].email,
    author_name: `${students[0].first_name} ${students[0].last_name}`,
    content: 'שלום לכולם! מתרגש להתחיל את הקורס 🚀',
    likes: [],
    comments: JSON.stringify([]),
    created_at: now,
  }));

  await safe('Post 2', () => e.Post.create({
    author_email: students[1].email,
    author_name: `${students[1].first_name} ${students[1].last_name}`,
    content: 'למדתי היום על יזמות, ממש מעניין!',
    likes: [students[2].email],
    comments: JSON.stringify([]),
    created_at: now,
  }));
}

// ── Run all ──
async function main() {
  console.log('🌱 Seeding dev instance with dummy data...\n');

  await seedStudents();
  const lessons = await seedLessons();
  const groups = await seedGroup();
  await seedLeaderboard();
  await seedVocabulary();
  await seedQuizQuestions();
  await seedMarketData();
  await seedScheduledLessons(lessons, groups);
  await seedTeachers();
  await seedPosts();

  console.log('\n✅ Dev seed complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
