import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import RoleSelector from './RoleSelector.jsx'
import TeacherApp from './TeacherApp.jsx'
import ParentApp from './ParentApp.jsx'
import LoginPage from './LoginPage.jsx'
import RegisterPage from './RegisterPage.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Microsoft YaHei", sans-serif', color: '#7584a3' }}>
      加载中...
    </div>
  )

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />

  return children
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><RoleSelector /></ProtectedRoute>} />
          <Route path="/student" element={<ProtectedRoute role="student"><App /></ProtectedRoute>} />
          <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherApp /></ProtectedRoute>} />
          <Route path="/parent" element={<ProtectedRoute role="parent"><ParentApp /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
