import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/AuthContext'
import Landing from './pages/Landing'
import Editor from './pages/Editor'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import Dashboard from './pages/Dashboard'
import GuidePage from './pages/GuidePage'
import BlogIndex from './pages/blog/BlogIndex'
import PackoutInserts from './pages/blog/PackoutInserts'
import GridfinityFromPhoto from './pages/blog/GridfinityFromPhoto'
import GasketMaker from './pages/blog/GasketMaker'
import PaperMeasure from './pages/blog/PaperMeasure'
import PhotoToSTL from './pages/blog/PhotoToSTL'
import ComparisonPost from './pages/blog/ComparisonPost'
import OrganizerIdeas from './pages/blog/OrganizerIdeas'
import FoamAlternative from './pages/blog/FoamAlternative'
import OrganizePackout from './pages/blog/OrganizePackout'
import ImageToSTL from './pages/blog/ImageToSTL'
import GridfinityCustomCutout from './pages/blog/GridfinityCustomCutout'
import PrintedToolOrganizer from './pages/blog/PrintedToolOrganizer'
import KnipexOrganizer from './pages/blog/KnipexOrganizer'
import GridfinityGenerator from './pages/blog/GridfinityGenerator'
import SavedToolLibrary from './pages/blog/SavedToolLibrary'
import PhotoToGridfinityGuide from './pages/blog/PhotoToGridfinityGuide'
import CompetitorComparison from './pages/blog/CompetitorComparison'
import GridfinityPackoutDrawer from './pages/blog/GridfinityPackoutDrawer'
import PhotoTipsForTrace from './pages/blog/PhotoTipsForTrace'
import WeraScrewdriverBin from './pages/blog/WeraScrewdriverBin'
import WrenchSetBin from './pages/blog/WrenchSetBin'
import DrillBitStorage from './pages/blog/DrillBitStorage'
import CommunityPage from './pages/CommunityPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/custom-milwaukee-packout-inserts-3d-print" element={<PackoutInserts />} />
          <Route path="/blog/gridfinity-insert-from-photo" element={<GridfinityFromPhoto />} />
          <Route path="/blog/gasket-maker-from-photo" element={<GasketMaker />} />
          <Route path="/blog/measure-tool-from-photo-paper" element={<PaperMeasure />} />
          <Route path="/blog/tool-organizer-photo-to-stl" element={<PhotoToSTL />} />
          <Route path="/blog/gridfinity-vs-packout-vs-custom-tray" element={<ComparisonPost />} />
          <Route path="/blog/best-3d-printed-tool-organizer-ideas" element={<OrganizerIdeas />} />
          <Route path="/blog/3d-printed-inserts-vs-kaizen-foam" element={<FoamAlternative />} />
          <Route path="/blog/how-to-organize-milwaukee-packout" element={<OrganizePackout />} />
          <Route path="/blog/image-to-stl-converter-free" element={<ImageToSTL />} />
          <Route path="/blog/gridfinity-custom-cutout-no-cad" element={<GridfinityCustomCutout />} />
          <Route path="/blog/3d-printed-tool-organizer-guide" element={<PrintedToolOrganizer />} />
          <Route path="/blog/knipex-pliers-organizer-3d-printed" element={<KnipexOrganizer />} />
          <Route path="/blog/gridfinity-generator-photo-vs-parametric" element={<GridfinityGenerator />} />
          <Route path="/blog/reusable-tool-library-drawer-trays" element={<SavedToolLibrary />} />
          <Route path="/blog/photo-to-gridfinity-guide" element={<PhotoToGridfinityGuide />} />
          <Route path="/blog/tracetoforge-vs-tooltrace-vs-gridpilot" element={<CompetitorComparison />} />
          <Route path="/blog/gridfinity-in-packout-drawer" element={<GridfinityPackoutDrawer />} />
          <Route path="/blog/photo-tips-for-gridfinity-trace" element={<PhotoTipsForTrace />} />
          <Route path="/blog/wera-screwdriver-gridfinity-bin" element={<WeraScrewdriverBin />} />
          <Route path="/blog/wrench-set-gridfinity-bin" element={<WrenchSetBin />} />
          <Route path="/blog/drill-bit-gridfinity-storage" element={<DrillBitStorage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
