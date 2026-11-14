import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { StatusPage } from './pages/StatusPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import { AiFasilitatorPage } from './pages/AiFasilitatorPage';
import AIChatPage from './pages/AIChatPage';
import { ServerWarmingBanner } from './components/ServerWarmingBanner';

export function App() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/workspace/:pin" element={<WorkspacePage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/guru" element={<TeacherDashboardPage />} />
        <Route path="/guru/:pin" element={<TeacherDashboardPage />} />
        <Route path="/ai" element={<AiFasilitatorPage />} />
        <Route path="/ai-tutor" element={<AIChatPage />} />
      </Routes>
      <ServerWarmingBanner />
    </div>
  );
}
