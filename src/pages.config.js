/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
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