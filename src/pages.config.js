import Home from './pages/Home';
import Lessons from './pages/Lessons';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Vocabulary from './pages/Vocabulary';
import Leaderboard from './pages/Leaderboard';
import MathGames from './pages/MathGames';
import Investments from './pages/Investments';
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
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};