import Home from './pages/Home';
import Lessons from './pages/Lessons';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Vocabulary from './pages/Vocabulary';
import Leaderboard from './pages/Leaderboard';
import MathGames from './pages/MathGames';
import Investments from './pages/Investments';
import Home1 from './pages/Home1';
import Lessons1 from './pages/Lessons1';
import Vocabulary1 from './pages/Vocabulary1';
import MathGames1 from './pages/MathGames1';
import Investments1 from './pages/Investments1';
import Leaderboard1 from './pages/Leaderboard1';
import Profile1 from './pages/Profile1';
import Admin1 from './pages/Admin1';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Lessons": Lessons,
    "Progress": Progress,
    "Profile": Profile,
    "Admin": Admin,
    "Vocabulary": Vocabulary,
    "Leaderboard": Leaderboard,
    "MathGames": MathGames,
    "Investments": Investments,
    "Home1": Home1,
    "Lessons1": Lessons1,
    "Vocabulary1": Vocabulary1,
    "MathGames1": MathGames1,
    "Investments1": Investments1,
    "Leaderboard1": Leaderboard1,
    "Profile1": Profile1,
    "Admin1": Admin1,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};