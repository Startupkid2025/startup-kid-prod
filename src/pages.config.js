import Admin1 from './pages/Admin1';
import Home1 from './pages/Home1';
import Investments1 from './pages/Investments1';
import Leaderboard1 from './pages/Leaderboard1';
import Lessons1 from './pages/Lessons1';
import MathGames1 from './pages/MathGames1';
import Profile1 from './pages/Profile1';
import Progress1 from './pages/Progress1';
import Vocabulary1 from './pages/Vocabulary1';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin1": Admin1,
    "Home1": Home1,
    "Investments1": Investments1,
    "Leaderboard1": Leaderboard1,
    "Lessons1": Lessons1,
    "MathGames1": MathGames1,
    "Profile1": Profile1,
    "Progress1": Progress1,
    "Vocabulary1": Vocabulary1,
}

export const pagesConfig = {
    mainPage: "Home1",
    Pages: PAGES,
    Layout: __Layout,
};