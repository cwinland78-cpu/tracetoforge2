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
import PhotoToSTL from './pages/blog/PhotoToSTL'
import ComparisonPost from './pages/blog/ComparisonPost'
import OrganizerIdeas from './pages/blog/OrganizerIdeas'
import FoamAlternative from './pages/blog/FoamAlternative'
import OrganizePackout from './pages/blog/OrganizePackout'

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
          <Route path="/blog/tool-organizer-photo-to-stl" element={<PhotoToSTL />} />
          <Route path="/blog/gridfinity-vs-packout-vs-custom-tray" element={<ComparisonPost />} />
          <Route path="/blog/best-3d-printed-tool-organizer-ideas" element={<OrganizerIdeas />} />
          <Route path="/blog/3d-printed-inserts-vs-kaizen-foam" element={<FoamAlternative />} />
          <Route path="/blog/how-to-organize-milwaukee-packout" element={<OrganizePackout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
