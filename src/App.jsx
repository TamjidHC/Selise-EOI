import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import EOIGenerator from './pages/EOIGenerator'
import History from './pages/History'
import KnowledgeBase from './pages/KnowledgeBase'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/generate" element={<ProtectedRoute><EOIGenerator /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/kb" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/generate" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
