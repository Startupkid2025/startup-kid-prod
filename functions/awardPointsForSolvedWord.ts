import { base44 } from "@/base44";
import { AVATAR_ITEMS } from "../components/avatar/TamagotchiAvatar";
import { syncLeaderboardEntry } from "../components/utils/leaderboardSync";

export default async function awardPointsForSolvedWord({ wordId, difficulty, wordEnglish }) {
  const currentUser = await base44.auth.currentUser();
  
  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const freshProgress = await base44.entities.WordProgress.filter({ 
    student_email: currentUser.email 
  });

  const existingWordProg = freshProgress.find(w =>
    w.word_english.toLowerCase() === wordEnglish.toLowerCase()
  );

  if (!existingWordProg || existingWordProg.mastered) {
    return { awarded: false, reason: "Word not found or already mastered" };
  }

  const newStreak = existingWordProg.correct_streak + 1;
  const isMastered = newStreak >= 2;

  if (!isMastered) {
    return { awarded: false, reason: "Not yet mastered" };
  }

  // Calculate coins
  const baseCoins = difficulty * 3;
  let coinsEarned = baseCoins;
  let bonusBreakdown = [{ type: 'base', amount: baseCoins, label: 'בסיס' }];
  
  const purchasedItems = currentUser.purchased_items || [];
  const equippedItems = currentUser.equipped_items || {};
  
  // Eyes bonus
  const equippedEyes = equippedItems.eyes;
  if (equippedEyes && purchasedItems.includes(equippedEyes)) {
    const eyesItem = AVATAR_ITEMS[equippedEyes];
    if (eyesItem && eyesItem.wordBonus) {
      coinsEarned += eyesItem.wordBonus;
      bonusBreakdown.push({ type: 'eyes', amount: eyesItem.wordBonus, label: 'בונוס עיניים' });
    }
  }
  
  // Mouth bonus
  const equippedMouth = equippedItems.mouth;
  if (equippedMouth && purchasedItems.includes(equippedMouth)) {
    const mouthItem = AVATAR_ITEMS[equippedMouth];
    if (mouthItem && mouthItem.wordBonus) {
      coinsEarned += mouthItem.wordBonus;
      bonusBreakdown.push({ type: 'mouth', amount: mouthItem.wordBonus, label: 'בונוס פה' });
    }
  }
  
  // Check vocab king bonus using service role
  const allUsers = await base44.asServiceRole.entities.User.list();
  const allWordProgress = await base44.asServiceRole.entities.WordProgress.list();
  
  let maxVocabEarnings = 0;
  let vocabKingEmail = null;
  
  allUsers.forEach(user => {
    const userWords = allWordProgress.filter(w => w.student_email === user.email);
    const earnings = userWords.reduce((sum, w) => sum + (w.coins_earned || 0), 0);
    if (earnings > maxVocabEarnings) {
      maxVocabEarnings = earnings;
      vocabKingEmail = user.email;
    }
  });
  
  if (vocabKingEmail === currentUser.email && maxVocabEarnings > 0) {
    coinsEarned += 5;
    bonusBreakdown.push({ type: 'king', amount: 5, label: 'בונוס מלך אנגלית' });
  }

  // Update user coins and daily words
  const updatedDailyWords = (currentUser.daily_vocabulary_words || []).filter(
    w => w.toLowerCase() !== wordEnglish.toLowerCase()
  );

  await base44.asServiceRole.entities.User.update(currentUser.id, {
    coins: (currentUser.coins || 0) + coinsEarned,
    daily_vocabulary_words: updatedDailyWords
  });

  // Update word progress
  await base44.entities.WordProgress.update(existingWordProg.id, {
    correct_streak: newStreak,
    total_attempts: existingWordProg.total_attempts + 1,
    mastered: isMastered,
    last_seen: new Date().toISOString(),
    difficulty_level: difficulty,
    coins_earned: (existingWordProg.coins_earned || 0) + coinsEarned
  });

  // Sync to leaderboard
  await syncLeaderboardEntry(currentUser.email, {
    coins: (currentUser.coins || 0) + coinsEarned
  });

  return {
    awarded: true,
    coinsEarned,
    bonusBreakdown,
    newCoins: (currentUser.coins || 0) + coinsEarned,
    updatedDailyWords
  };
}