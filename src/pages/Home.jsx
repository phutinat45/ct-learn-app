import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import confetti from 'canvas-confetti';
import Typewriter from 'typewriter-effect';
import Tilt from 'react-parallax-tilt';

function Home() {
  const navigate = useNavigate();

  // --- State ---
  const [student, setStudent] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progressMap, setProgressMap] = useState({}); 
  const [stats, setStats] = useState({
    totalXP: 0,
    level: 1,
    nextLevelXP: 100,
    completedCount: 0,
    streak: 0, // ✅ ค่านี้จะถูกคำนวณจริง
    badges: [] 
  });
  const [loading, setLoading] = useState(true);

  // 🔥 ฟังก์ชันคำนวณ Streak (เหมือนหน้า Profile) 🔥
  const calculateStreak = (progressData) => {
      if (!progressData || progressData.length === 0) return 0;

      // แปลงวันที่เรียนเป็น YYYY-MM-DD เพื่อตัดเวลาออก
      const toLocalDateStr = (dateStr) => {
          const d = new Date(dateStr);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
      };

      const uniqueDates = new Set(progressData.map(p => toLocalDateStr(p.created_at)));

      let streak = 0;
      let d = new Date(); // วันนี้

      // 1. เช็ควันนี้และเมื่อวาน
      const todayStr = toLocalDateStr(d);
      const hasToday = uniqueDates.has(todayStr);
      
      d.setDate(d.getDate() - 1); 
      const yesterdayStr = toLocalDateStr(d);
      const hasYesterday = uniqueDates.has(yesterdayStr);

      if (!hasToday && !hasYesterday) return 0;

      // 2. เริ่มนับถอยหลัง
      let checkDate = new Date();
      if (!hasToday) checkDate.setDate(checkDate.getDate() - 1);

      while (true) {
          const dateStr = toLocalDateStr(checkDate);
          if (uniqueDates.has(dateStr)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
          } else {
              break;
          }
      }
      return streak;
  };

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const userStr = localStorage.getItem('currentUser');
        if (!userStr) { navigate('/login'); return; }
        const localUser = JSON.parse(userStr);

        // ดึงข้อมูล 3 ส่วนพร้อมกัน
        const [userRes, lessonsRes, progressRes] = await Promise.all([
            supabase.from('users').select('*').eq('id', localUser.id).single(),
            supabase.from('lessons').select('*').eq('status', 'published').order('id', { ascending: true }),
            // ✅ ดึง created_at เพื่อคำนวณ Streak
            supabase.from('progress').select('lesson_id, passed, created_at').eq('student_id', localUser.id).eq('passed', true)
        ]);

        const userData = userRes.data || localUser;
        const rawLessons = lessonsRes.data || [];
        const progressData = progressRes.data || [];

        setStudent(userData);

        // --- คำนวณ XP, Level, เรียงบทเรียน ---
        const progressMapping = {};
        const completedIds = new Set();
        let calculatedXP = 0;
        let doneCount = 0;

        if (progressData.length > 0) {
            progressData.forEach(p => {
                progressMapping[p.lesson_id] = true;
                completedIds.add(String(p.lesson_id));
                doneCount++;
                const lesson = rawLessons.find(l => String(l.id) === String(p.lesson_id));
                if (lesson) calculatedXP += (lesson.xp || 0);
            });
        }
        setProgressMap(progressMapping);

        // เรียงลำดับ: ยังไม่เรียน -> จบแล้ว
        const sortedLessons = [...rawLessons].sort((a, b) => {
            const isA = completedIds.has(String(a.id));
            const isB = completedIds.has(String(b.id));
            if (isA === isB) return a.id - b.id;
            return isA ? 1 : -1;
        });
        setLessons(sortedLessons);

        // ✅ คำนวณค่าต่างๆ
        const currentLevel = Math.floor(calculatedXP / 100) + 1;
        const currentStreak = calculateStreak(progressData); // คำนวณวันต่อเนื่องจริง

        // สร้างเหรียญจำลองตาม Level
        const computedBadges = [];
        if (currentLevel >= 2) computedBadges.push({ name: 'ผู้เริ่มต้น', icon: 'fa-star', color: '#f59e0b', level: 2 });
        if (currentLevel >= 5) computedBadges.push({ name: 'นักแก้ปัญหา', icon: 'fa-puzzle-piece', color: '#f97316', level: 5 });
        if (currentLevel >= 8) computedBadges.push({ name: 'ความพยายาม', icon: 'fa-droplet', color: '#3b82f6', level: 8 });
        if (currentLevel >= 10) computedBadges.push({ name: 'ผู้ชนะ', icon: 'fa-trophy', color: '#8b5cf6', level: 10 });

        setStats({
            totalXP: calculatedXP,
            level: currentLevel,
            nextLevelXP: currentLevel * 100, // XP เป้าหมายของเวลถัดไป
            completedCount: doneCount,
            streak: currentStreak,
            badges: computedBadges
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);


  // Helper Functions
  const getIconClass = (str) => {
    if (!str) return "fa-solid fa-book"; 
    if (str.startsWith("fa-")) return str; 
    const map = { 'puzzle': 'fa-solid fa-puzzle-piece', 'magnify': 'fa-solid fa-magnifying-glass', 'paint': 'fa-solid fa-palette', 'code': 'fa-solid fa-code', 'brain': 'fa-solid fa-brain' };
    return map[str] || "fa-solid fa-star";
  };

  const getDifficultyColor = (diff) => {
      if(diff === 'Easy' || diff === 'ง่าย') return 'tag-green';
      if(diff === 'Medium' || diff === 'ปานกลาง') return 'tag-orange';
      if(diff === 'Hard' || diff === 'ยาก') return 'tag-red';
      return 'tag-blue';
  };

  const handleStartLearning = (e) => {
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
  };

  if (loading) {
      return (
        <div style={{height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color:'#64748b'}}>
            <i className="fa-solid fa-rocket fa-bounce" style={{fontSize:'3rem', marginBottom:'20px', color:'#3b82f6'}}></i>
            <p style={{fontSize:'1.2rem'}}>กำลังเตรียมห้องเรียน...</p>
        </div>
      );
  }

  // ✅ คำนวณ % หลอด XP
  const xpInCurrentLevel = stats.totalXP % 100;

  return (
    <>
      {/* ================= 1. HERO SECTION ================= */}
      <section className="hero">
        <div className="container hero-grid">
            {/* ฝั่งซ้าย: ข้อความ */}
            <div className="hero-content">
                <span className="badge-blue">
                    <i className="fa-solid fa-bolt animate-bounce" style={{marginRight: '8px'}}></i>
                    สำหรับนักเรียน {student?.grade_level ? `ชั้น ${student.grade_level}` : 'ทั่วไป'}
                </span>
                
                <h1>
                    พัฒนาทักษะ<br />
                    <span className="text-gradient" style={{ display: 'inline-block' }}>
                        <Typewriter
                            options={{
                                strings: ['การคิดเชิงคำนวณ', 'Problem Solving', 'Coding Master'],
                                autoStart: true,
                                loop: true,
                                delay: 75,
                                deleteSpeed: 50,
                            }}
                        />
                    </span>
                </h1>
                
                <p>
                    เรียนรู้ผ่านการแก้ปัญหาจริง สะสม XP และ Badge<br />
                    แบ่งปันกับเพื่อน ๆ ในบรรยากาศที่สนุกและท้าทาย
                </p>

                <div className="hero-buttons">
                    <button onClick={() => document.getElementById('lessons-area').scrollIntoView({behavior: 'smooth'})} className="btn-primary hover-scale">
                        <i className="fa-solid fa-rocket fa-beat" style={{marginRight:'8px'}}></i> เริ่มเรียนเลย
                    </button>
                    <Link to="/rank" className="btn-outline hover-scale" style={{textDecoration:'none'}}>
                        <i className="fa-solid fa-trophy" style={{marginRight:'8px'}}></i> ดูอันดับ
                    </Link>
                </div>
            </div>

            {/* ✅ ฝั่งขวา: Profile Card ที่แก้ไขแล้ว */}
            <div className="profile-card-wrapper">
                <Tilt glareEnable={true} glareMaxOpacity={0.2} scale={1.02} tiltMaxAngleX={5} tiltMaxAngleY={5}>
                    <div className="profile-card">
                        <div className="profile-header">
                            <div className="avatar-box">
                                {student?.image && !student.image.startsWith('fa-') ? 
                                    <img src={student.image} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} /> :
                                    <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#e2e8f0', color:'#64748b'}}>
                                        <i className={`fa-solid ${student?.image || 'fa-user'}`} style={{fontSize: '32px'}}></i>
                                    </div>
                                }
                            </div>
                            <div className="profile-info">
                                <h3>{student?.fullname || student?.username}</h3>
                                
                            </div>
                        </div>

                        {/* ✅ ส่วนแสดง Level และ XP Bar */}
                        <div className="level-section">
                            <div className="level-text">
                                <strong>Level {stats.level}</strong>
                                <span>{stats.totalXP} XP</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-fill" style={{width: `${xpInCurrentLevel}%`}}></div>
                            </div>
                            <small style={{color:'#94a3b8', fontSize:'0.75rem', marginTop:'5px', display:'block'}}>
                                อีก {100 - xpInCurrentLevel} XP จะขึ้น Level {stats.level + 1}
                            </small>
                        </div>

                        {/* ✅ ส่วน Stats (รวมถึง Streak วันติดกัน) */}
                        <div className="stats-row">
                            <div className="stat-box">
                                <strong style={{color: '#60a5fa'}}>{stats.completedCount}</strong>
                                <span>บทเรียน</span>
                            </div>
                            <div className="stat-box">
                                <strong style={{color: '#4ade80'}}>{stats.badges.length}</strong>
                                <span>เหรียญ</span>
                            </div>
                            <div className="stat-box">
                                <strong style={{color: '#fb923c'}}>{stats.streak} <i className="fa-solid fa-fire"></i></strong>
                                <span>วันติดกัน</span>
                            </div>
                        </div>

                        {/* ✅ ส่วนเหรียญรางวัล */}
                        <div className="medals-section">
                            <span className="medals-title">เหรียญที่ได้รับ</span>
                            <div className="medals-list">
                                {stats.badges.length > 0 ? (
                                    stats.badges.map((badge, index) => (
                                        <div key={index} className="medal hover-spin" title={badge.name} style={{
                                            background: 'linear-gradient(135deg, #fff, #f3f4f6)',
                                            border: `2px solid ${badge.color}`,
                                            color: badge.color,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                                        }}>
                                            <i className={`fa-solid ${badge.icon}`}></i>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{display:'flex', alignItems:'center', gap:'10px', color:'#94a3b8', background:'#f8fafc', padding:'8px 12px', borderRadius:'12px', fontSize:'0.85rem', width:'100%'}}>
                                        <i className="fa-solid fa-lightbulb" style={{color:'#fbbf24'}}></i>
                                        <span>เล่นให้ถึง Level 2 เพื่อรับเหรียญแรก!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Tilt>
            </div>
        </div>
      </section>

      {/* ================= 2. FEATURES SECTION ================= */}
      <section className="features-section">
        <div className="container">
            <div className="section-header">
                <h2>เรียนรู้อย่างมีประสิทธิภาพ</h2>
                <p>แพลตฟอร์มที่ออกแบบมาเพื่อพัฒนาทักษะการคิดเชิงคำนวณอย่างเป็นระบบ</p>
            </div>
            <div className="features-grid">
                <div className="feature-card hover-lift">
                    <div className="icon-circle bg-blue"><i className="fa-solid fa-brain"></i></div>
                    <h3>การคิดเชิงคำนวณ</h3>
                    <p>พัฒนาทักษะการแก้ปัญหาอย่างเป็นระบบ</p>
                </div>
                <div className="feature-card hover-lift">
                    <div className="icon-circle bg-purple"><i className="fa-solid fa-bullseye"></i></div>
                    <h3>Problem-Based Learning</h3>
                    <p>เรียนรู้ผ่านโจทย์ปัญหาจากสถานการณ์จริง</p>
                </div>
                <div className="feature-card hover-lift">
                    <div className="icon-circle bg-light-blue"><i className="fa-solid fa-gamepad"></i></div>
                    <h3>Gamification</h3>
                    <p>สนุกกับการสะสม XP, Badge และแข่งขันกับเพื่อน</p>
                </div>
            </div>
        </div>
      </section>

      {/* ================= 3. LATEST LESSONS SECTION ================= */}
      <section className="lessons-section" id="lessons-area">
        <div className="container">
            <div className="flex-between">
                <div>
                    <h2>บทเรียนทั้งหมด</h2>
                    <p style={{color: 'var(--text-gray)'}}>เส้นทางการเรียนรู้ของคุณ</p>
                </div>
                <Link to="/lessons" className="view-all">
                    ดูทั้งหมด <i className="fa-solid fa-arrow-right"></i>
                </Link>
            </div>

            <div className="lessons-grid">
                {lessons.length === 0 ? (
                    <div style={{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'#94a3b8'}}>
                        <i className="fa-solid fa-box-open" style={{fontSize:'2rem', marginBottom:'10px'}}></i>
                        <p>ยังไม่มีบทเรียนในขณะนี้</p>
                    </div>
                ) : (
                    lessons.map((lesson) => {
                        const isCompleted = progressMap[lesson.id];
                        
                        return (
                            <div key={lesson.id} className={`lesson-card ${isCompleted ? 'border-green' : ''} hover-lift`}>
                                
                                {isCompleted && <div className="check-badge"><i className="fa-solid fa-check"></i></div>}
                                
                                <div className="card-icon" style={{color: isCompleted ? '#4caf50' : '#fca72a'}}>
                                    <i className={getIconClass(lesson.image)}></i>
                                </div>
                                
                                <h3>{lesson.title}</h3>
                                <p>{lesson.description || 'ไม่มีคำอธิบาย'}</p>
                                
                                <div className="meta-tags">
                                    <span className={`tag ${getDifficultyColor(lesson.difficulty)}`}>{lesson.difficulty}</span>
                                    <span className="tag-text">{lesson.duration || '15 นาที'}</span>
                                    <span className="tag-xp">⭐ +{lesson.xp} XP</span>
                                </div>
                                
                                {isCompleted ? (
                                    <button className="btn-card-outline" onClick={() => navigate(`/lesson/${lesson.id}`)}>
                                        <i className="fa-solid fa-rotate-left" style={{marginRight:'5px'}}></i> ทบทวน
                                    </button>
                                ) : (
                                    <button 
                                        className="btn-card-solid" 
                                        onClick={(e) => { handleStartLearning(e); navigate(`/lesson/${lesson.id}`); }}
                                    >
                                        เริ่มเรียน <i className="fa-solid fa-arrow-right" style={{marginLeft:'5px'}}></i>
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </section>
    </>
  );
}

export default Home;