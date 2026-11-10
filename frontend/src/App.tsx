import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { StatusPage } from './pages/StatusPage';

export function App() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/status" element={<StatusPage />} />
      </Routes>
    </div>
  );
}
