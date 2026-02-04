import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  // State เก็บข้อมูลสถิติ
  const [stats, setStats] = useState({
    studentCount: 0,
    lessonCount: 0,
    quizCount: 0,
    totalXP: 0
  });

  // State เก็บข้อมูลกราฟ
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. ดึงข้อมูลสถิติพร้อมกัน
      const [studentsRes, lessonsRes, progressRes, quizRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
        supabase.from('progress').select('lesson_id, created_at, passed'), 
        supabase.from('lessons').select('id, quiz, xp') 
      ]);

      // --- ประมวลผลตัวเลขสถิติ ---
      const studentCount = studentsRes.count || 0;
      const lessonCount = lessonsRes.count || 0;
      
      let totalQuestions = 0;
      const lessonsData = quizRes.data || [];
      lessonsData.forEach(l => {
          if (l.quiz && Array.isArray(l.quiz)) {
              totalQuestions += l.quiz.length;
          }
      });

      const lessonXpMap = {};
      lessonsData.forEach(l => lessonXpMap[l.id] = l.xp || 0);

      let totalXP = 0;
      const progressData = progressRes.data || [];
      progressData.forEach(p => {
          if (p.passed) {
              totalXP += (lessonXpMap[p.lesson_id] || 0);
          }
      });

      setStats({ studentCount, lessonCount, quizCount: totalQuestions, totalXP });

      // --- เตรียมข้อมูลกราฟ ---
      processChartData(progressData);

    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (progressData) => {
      const dateCount = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
          dateCount[dateStr] = 0;
      }
      progressData.forEach(p => {
          const d = new Date(p.created_at);
          const diffTime = Math.abs(today - d);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) {
              const dateStr = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
              if (dateCount[dateStr] !== undefined) dateCount[dateStr]++;
          }
      });
      setChartData({
        labels: Object.keys(dateCount),
        datasets: [{
            label: 'จำนวนการเข้าทำบทเรียน (ครั้ง)',
            data: Object.values(dateCount),
            borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4, fill: true, pointBackgroundColor: '#fff', pointBorderColor: '#3b82f6', pointBorderWidth: 2
        }]
      });
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', padding: 10, titleFont: { family: "'Sarabun'" }, bodyFont: { family: "'Sarabun'" } } },
    scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: "'Sarabun'" }, stepSize: 1 } }, x: { grid: { display: false }, ticks: { font: { family: "'Sarabun'" } } } }
  };

  if (loading) return <div style={{height:'300px', display:'flex', justifyContent:'center', alignItems:'center', color:'#64748b'}}>กำลังโหลดข้อมูล...</div>;

  return (
    <div className="admin-page-container" style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Sarabun', sans-serif" }}>
      
      {/* ❌ ลบ Header ออกแล้ว (เพราะใช้จาก TeacherDashboard แทน) */}

      {/* --- Stats Cards Grid --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="admin-stat-card hover-lift" style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: '#eff6ff', color: '#3b82f6' }}><i className="fa-solid fa-users"></i></div>
              <div><span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>นักเรียนทั้งหมด</span><h3 style={{ margin: '5px 0 0', fontSize: '1.8rem', color: '#1e293b' }}>{stats.studentCount} คน</h3></div>
          </div>
          <div className="admin-stat-card hover-lift" style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: '#eef2ff', color: '#6366f1' }}><i className="fa-solid fa-book"></i></div>
              <div><span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>บทเรียนออนไลน์</span><h3 style={{ margin: '5px 0 0', fontSize: '1.8rem', color: '#1e293b' }}>{stats.lessonCount} บท</h3></div>
          </div>
          <div className="admin-stat-card hover-lift" style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: '#fff7ed', color: '#f97316' }}><i className="fa-solid fa-pen-to-square"></i></div>
              <div><span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>ข้อสอบในระบบ</span><h3 style={{ margin: '5px 0 0', fontSize: '1.8rem', color: '#1e293b' }}>{stats.quizCount} ข้อ</h3></div>
          </div>
          <div className="admin-stat-card hover-lift" style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: '#f0fdf4', color: '#22c55e' }}><i className="fa-solid fa-star"></i></div>
              <div><span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>XP ที่แจกไปแล้ว</span><h3 style={{ margin: '5px 0 0', fontSize: '1.8rem', color: '#1e293b' }}>{stats.totalXP.toLocaleString()}</h3></div>
          </div>
      </div>

      {/* --- Chart Section --- */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
          <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '1.2rem' }}>สถิติการเข้าใช้งานรายสัปดาห์</h3>
          <div style={{ height: '300px', width: '100%' }}>
              {chartData && <Line data={chartData} options={chartOptions} />}
          </div>
      </div>

    </div>
  );
}

export default AdminDashboard;