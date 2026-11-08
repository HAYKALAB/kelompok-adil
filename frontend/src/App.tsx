import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </div>
  );
}
