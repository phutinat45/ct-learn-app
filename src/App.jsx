import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// ❌ ลบการ import แบบเดิมทิ้ง (เพราะมันโหลดทุกอย่างมารอ ทำให้ช้า)
/*
import Login from './pages/Login';
import Home from './pages/Home';
import TeacherDashboard from './pages/TeacherDashboard';
import Lessons from './pages/Lessons';
import StudyRoom from './pages/StudyRoom'; 
import Rank from './pages/Rank';
import Profile from './pages/Profile';
import Quiz from './pages/Quiz'; 
import ItemShop from './pages/ItemShop';
*/

// ✅ เปลี่ยนมาใช้ Lazy Import (โหลดเฉพาะตอนคนกดเข้าไปดู)
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const Lessons = lazy(() => import('./pages/Lessons'));
const StudyRoom = lazy(() => import('./pages/StudyRoom'));
const Rank = lazy(() => import('./pages/Rank'));
const Profile = lazy(() => import('./pages/Profile'));
const Quiz = lazy(() => import('./pages/Quiz'));
const ItemShop = lazy(() => import('./pages/ItemShop'));

// ✨ สร้างหน้าโหลดเท่ๆ ไว้คั่นเวลา (CSS Spinner)
const PageLoader = () => (
  <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      background: '#f8fafc', 
      flexDirection: 'column',
      gap: '15px'
  }}>
    <div className="spinner"></div>
    <div style={{color: '#6366f1', fontWeight: 'bold', fontSize: '1.2rem'}}>กำลังโหลด... 🚀</div>
    <style>{`
      .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #e2e8f0;
        border-top: 5px solid #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

function App() {
  const location = useLocation();

  // ฟังก์ชันป้องกัน Route (เหมือนเดิม เป๊ะๆ)
  const ProtectedRoute = ({ children, allowedRole }) => {
    const userStr = localStorage.getItem('currentUser');
    
    if (!userStr) {
        return <Navigate to="/login" replace />;
    }

    try {
        const user = JSON.parse(userStr);
        
        if (allowedRole && user.role !== allowedRole) {
           if (user.role === 'admin') return <Navigate to="/teacher" replace />;
           if (user.role === 'student') return <Navigate to="/dashboard" replace />;
        }
        
        return children;
    } catch (error) {
        console.error("Auth Error:", error);
        localStorage.removeItem('currentUser');
        return <Navigate to="/login" replace />;
    }
  };
  
  const isHideNavbar = location.pathname === '/login' || location.pathname.startsWith('/teacher');

  return (
    <div className="app">
      {!isHideNavbar && <Navbar />} 
      
      <div className={!isHideNavbar ? "content" : ""}>
        {/* ✅ ครอบ Routes ด้วย Suspense เพื่อรองรับ Lazy Loading */}
        <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Student Routes */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRole="student"><Home /></ProtectedRoute>} />
            <Route path="/lessons" element={<ProtectedRoute allowedRole="student"><Lessons /></ProtectedRoute>} />
            <Route path="/shop" element={<ProtectedRoute allowedRole="student"><ItemShop /></ProtectedRoute>} />
            <Route path="/rank" element={<ProtectedRoute allowedRole="student"><Rank /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRole="student"><Profile /></ProtectedRoute>} />
            
            <Route path="/lesson/:id" element={<ProtectedRoute allowedRole="student"><StudyRoom /></ProtectedRoute>} />
            <Route path="/lesson/:id/quiz" element={<ProtectedRoute allowedRole="student"><Quiz /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/teacher/*" element={<ProtectedRoute allowedRole="admin"><TeacherDashboard /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default App;