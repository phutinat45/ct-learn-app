import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Rank() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // 1. หา User ปัจจุบัน
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      }

      // 2. ดึงข้อมูล 3 ส่วนพร้อมกัน (Users, Progress, Lessons)
      const [usersRes, progressRes, lessonsRes] = await Promise.all([
        // ✅ เพิ่ม .neq('role', 'admin') ตรงนี้เพื่อไม่ดึง Admin มาแสดง
        supabase.from('users').select('id, fullname, username, image, grade_level').neq('role', 'admin'), 
        supabase.from('progress').select('student_id, lesson_id, passed').eq('passed', true),
        supabase.from('lessons').select('id, xp')
      ]);

      if (usersRes.error) console.error(usersRes.error);
      
      const allUsers = usersRes.data || [];
      const allProgress = progressRes.data || [];
      const allLessons = lessonsRes.data || [];

      // 3. สร้าง Map ของ Lesson XP (เพื่อความเร็วในการค้นหา)
      const lessonXpMap = {};
      allLessons.forEach(l => {
          // แปลง ID เป็น String เพื่อกันพลาด
          lessonXpMap[String(l.id)] = l.xp || 0;
      });

      // 4. คำนวณ XP ของแต่ละ User
      const userScores = allUsers.map(user => {
          // หา Progress ของ User คนนี้
          const userProgress = allProgress.filter(p => p.student_id === user.id);
          
          // รวมคะแนน XP
          const totalXP = userProgress.reduce((sum, p) => {
              const xp = lessonXpMap[String(p.lesson_id)] || 0;
              return sum + xp;
          }, 0);

          // คำนวณ Level (100 XP = 1 Level)
          const level = Math.floor(totalXP / 100) + 1;

          return {
              ...user,
              totalXP,
              level
          };
      });

      // 5. เรียงลำดับจากมากไปน้อย
      const sortedLeaderboard = userScores.sort((a, b) => b.totalXP - a.totalXP);

      setLeaderboard(sortedLeaderboard);

    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
      return (
        <div style={{padding:'100px', textAlign:'center', color:'#64748b'}}>
            <i className="fa-solid fa-trophy fa-bounce" style={{fontSize:'3rem', marginBottom:'15px', color:'#f59e0b'}}></i>
            <p>กำลังจัดอันดับผู้เข้าแข่งขัน...</p>
        </div>
      );
  }

  // แยก Top 3 กับคนอื่นๆ
  const topThree = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  return (
    <div className="rank-page" style={{ padding: '120px 20px 60px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Sarabun', sans-serif" }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#1e293b', marginBottom: '10px' }}>กระดานผู้นำ 🏆</h1>
          <p style={{ color: '#64748b' }}>สุดยอดนักคิดเชิงคำนวณประจำสัปดาห์</p>
      </div>

      {/* --- 1. Podium (แท่นรางวัล Top 3) --- */}
      <div className="podium-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '20px', marginBottom: '60px', minHeight: '300px' }}>
          
          {/* อันดับ 2 (ซ้าย) */}
          {topThree[1] && (
              <div className="podium-item" style={{ textAlign: 'center', width: '120px' }}>
                  <div style={{ position: 'relative', marginBottom: '15px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', margin: '0 auto', overflow: 'hidden', border: '4px solid #94a3b8' }}>
                          {topThree[1].image ? <img src={topThree[1].image} style={{width:'100%'}}/> : <i className="fa-solid fa-user" style={{lineHeight:'80px', fontSize:'30px', color:'#94a3b8'}}></i>}
                      </div>
                      <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#94a3b8', color: 'white', width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                  </div>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 5px', color: '#334155' }}>{topThree[1].fullname || topThree[1].username}</h3>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>{topThree[1].totalXP} XP</span>
                  <div style={{ height: '100px', background: 'linear-gradient(to top, #cbd5e1, #f1f5f9)', borderRadius: '15px 15px 0 0', marginTop: '10px' }}></div>
              </div>
          )}

          {/* อันดับ 1 (กลาง - ใหญ่สุด) */}
          {topThree[0] && (
              <div className="podium-item" style={{ textAlign: 'center', width: '140px', zIndex: 2 }}>
                  <div style={{ position: 'relative', marginBottom: '15px' }}>
                      <i className="fa-solid fa-crown" style={{ position: 'absolute', top: '-35px', left: '50%', transform: 'translateX(-50%)', color: '#eab308', fontSize: '2rem', animation: 'bounce 2s infinite' }}></i>
                      <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#e2e8f0', margin: '0 auto', overflow: 'hidden', border: '4px solid #eab308' }}>
                          {topThree[0].image ? <img src={topThree[0].image} style={{width:'100%'}}/> : <i className="fa-solid fa-user" style={{lineHeight:'100px', fontSize:'40px', color:'#cbd5e1'}}></i>}
                      </div>
                      <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#eab308', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', margin: '0 0 5px', color: '#1e293b', fontWeight: 'bold' }}>{topThree[0].fullname || topThree[0].username}</h3>
                  <span style={{ color: '#eab308', fontSize: '1rem', fontWeight: 'bold' }}>{topThree[0].totalXP} XP</span>
                  <div style={{ height: '140px', background: 'linear-gradient(to top, #fcd34d, #fefce8)', borderRadius: '15px 15px 0 0', marginTop: '10px', boxShadow: '0 10px 30px rgba(234, 179, 8, 0.2)' }}></div>
              </div>
          )}

          {/* อันดับ 3 (ขวา) */}
          {topThree[2] && (
              <div className="podium-item" style={{ textAlign: 'center', width: '120px' }}>
                  <div style={{ position: 'relative', marginBottom: '15px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', margin: '0 auto', overflow: 'hidden', border: '4px solid #b45309' }}>
                          {topThree[2].image ? <img src={topThree[2].image} style={{width:'100%'}}/> : <i className="fa-solid fa-user" style={{lineHeight:'80px', fontSize:'30px', color:'#94a3b8'}}></i>}
                      </div>
                      <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#b45309', color: 'white', width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
                  </div>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 5px', color: '#334155' }}>{topThree[2].fullname || topThree[2].username}</h3>
                  <span style={{ color: '#b45309', fontSize: '0.9rem', fontWeight: 'bold' }}>{topThree[2].totalXP} XP</span>
                  <div style={{ height: '80px', background: 'linear-gradient(to top, #d6d3d1, #fafaf9)', borderRadius: '15px 15px 0 0', marginTop: '10px' }}></div>
              </div>
          )}
      </div>

      {/* --- 2. List (อันดับ 4 เป็นต้นไป) --- */}
      <div className="rank-list" style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {others.length > 0 ? others.map((user, index) => {
              const isMe = user.id === currentUserId;
              return (
                  <div key={user.id} 
                       style={{ 
                           display: 'flex', alignItems: 'center', padding: '15px 20px', 
                           borderBottom: '1px solid #f1f5f9',
                           background: isMe ? '#eff6ff' : 'transparent', // ไฮไลท์ถ้าเป็นเรา
                           borderRadius: '12px',
                           marginBottom: '5px',
                           border: isMe ? '1px solid #3b82f6' : 'none'
                       }}
                  >
                      <div style={{ width: '40px', fontWeight: 'bold', color: '#64748b', fontSize: '1.1rem' }}>{index + 4}</div>
                      
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', marginRight: '20px', background: '#f1f5f9' }}>
                          {user.image ? 
                              <img src={user.image} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : 
                              <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#cbd5e1'}}><i className="fa-solid fa-user"></i></div>
                          }
                      </div>
                      
                      <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem' }}>
                              {user.fullname || user.username} 
                              {isMe && <span style={{marginLeft:'10px', fontSize:'0.75rem', background:'#3b82f6', color:'white', padding:'2px 8px', borderRadius:'10px'}}>คุณ</span>}
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Level {user.level}</span>
                      </div>
                      
                      <div style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '1.1rem' }}>
                          {user.totalXP} XP
                      </div>
                  </div>
              );
          }) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  ยังไม่มีผู้เล่นคนอื่น
              </div>
          )}
      </div>

    </div>
  );
}

export default Rank;