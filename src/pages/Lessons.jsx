import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function Lessons() {
  const navigate = useNavigate();
  
  // --- State ---
  const [lessons, setLessons] = useState([]); // เก็บทั้งหมด (เรียงแล้ว)
  const [progressMap, setProgressMap] = useState({}); 
  const [loading, setLoading] = useState(true);
  
  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ทั้งหมด');
  const [categories, setCategories] = useState(['ทั้งหมด']); // ✅ ตัวแปรเก็บหมวดหมู่แบบ Dynamic

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. ตรวจสอบ User
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) { navigate('/login'); return; }
        const localUser = JSON.parse(userStr);

        // 2. ดึงข้อมูล 2 อย่างพร้อมกัน (บทเรียน + ประวัติการเรียน)
        const [lessonsRes, progressRes] = await Promise.all([
            supabase.from('lessons').select('*').eq('status', 'published').order('id', { ascending: true }),
            supabase.from('progress').select('lesson_id, passed').eq('student_id', localUser.id).eq('passed', true)
        ]);

        if (lessonsRes.error) console.error("Lessons Error:", lessonsRes.error);
        if (progressRes.error) console.error("Progress Error:", progressRes.error);

        const rawLessons = lessonsRes.data || [];
        const progressData = progressRes.data || [];

        // 3. สร้าง Map เช็คสถานะเรียนจบ
        const progressMapping = {};
        const completedIds = new Set();
        progressData.forEach(p => {
            progressMapping[p.lesson_id] = true;
            completedIds.add(String(p.lesson_id));
        });
        setProgressMap(progressMapping);

        // 4. ✅ ดึงหมวดหมู่ (Category) จาก Database จริง
        // เอา Category ทั้งหมดมา -> ตัดตัวซ้ำออก -> ใส่ 'ทั้งหมด' ไว้ตัวแรก
        const uniqueCategories = ['ทั้งหมด', ...new Set(rawLessons.map(l => l.category).filter(Boolean))];
        setCategories(uniqueCategories);

        // 5. ✅ เรียงลำดับ: ยังไม่เรียนขึ้นก่อน / เรียนจบแล้วลงล่าง
        const sortedLessons = [...rawLessons].sort((a, b) => {
            const isACompleted = completedIds.has(String(a.id));
            const isBCompleted = completedIds.has(String(b.id));

            // ถ้าสถานะเหมือนกัน ให้เรียงตาม ID
            if (isACompleted === isBCompleted) return a.id - b.id;
            
            // ถ้าต่างกัน: ยังไม่จบ (false) มาก่อน จบแล้ว (true)
            return isACompleted ? 1 : -1;
        });

        setLessons(sortedLessons);

      } catch (error) {
        console.error('Error fetching lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // --- Logic การกรองบทเรียน (Search + Category) ---
  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeFilter === 'ทั้งหมด' || lesson.category === activeFilter;
    return matchesSearch && matchesCategory;
  });

  // Helper: สี Badge ความยาก
  const getDifficultyColor = (diff) => {
      if(diff === 'Easy' || diff === 'ง่าย') return '#dcfce7'; // เขียวอ่อน
      if(diff === 'Medium' || diff === 'ปานกลาง') return '#ffedd5'; // ส้มอ่อน
      if(diff === 'Hard' || diff === 'ยาก') return '#fee2e2'; // แดงอ่อน
      return '#f1f5f9';
  };
  
  const getDifficultyTextColor = (diff) => {
      if(diff === 'Easy' || diff === 'ง่าย') return '#166534'; 
      if(diff === 'Medium' || diff === 'ปานกลาง') return '#9a3412'; 
      if(diff === 'Hard' || diff === 'ยาก') return '#991b1b'; 
      return '#475569';
  };

  // Helper: Icon Class (เหมือนหน้า Home)
  const getIconClass = (dbImageString) => {
    if (!dbImageString) return "fa-solid fa-book"; 
    if (dbImageString.startsWith("fa-")) return dbImageString; 
    const map = {
        'puzzle': 'fa-solid fa-puzzle-piece',
        'magnify': 'fa-solid fa-magnifying-glass',
        'paint': 'fa-solid fa-palette',
        'code': 'fa-solid fa-code',
        'brain': 'fa-solid fa-brain',
        'robotic': 'fa-solid fa-robot'
    };
    return map[dbImageString] || "fa-solid fa-book-open";
  };

  if (loading) return (
    <div style={{padding:'100px', textAlign:'center', color:'#64748b'}}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{fontSize:'2rem', marginBottom:'15px'}}></i>
        <p>กำลังโหลดบทเรียน...</p>
    </div>
  );

  return (
    <div className="page-container" style={{ padding: '120px 20px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Sarabun', sans-serif" }}>
      
      <div className="header-section" style={{ marginBottom: '40px' }}>
        <h1 className="page-title" style={{ fontSize: '2.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>
          บทเรียนทั้งหมด
        </h1>
        <p className="page-subtitle" style={{ color: '#64748b', fontSize: '1.1rem' }}>
          เลือกบทเรียนที่คุณต้องการเรียนรู้และพัฒนาทักษะการคิดเชิงคำนวณ
        </p>
      </div>

      {/* --- Tools Bar --- */}
      <div className="tools-bar" style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '40px' }}>
        
        {/* Search */}
        <div className="search-box" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8', marginRight: '15px', fontSize: '1.1rem' }}></i>
          <input 
            type="text" 
            placeholder="ค้นหาบทเรียน..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '1rem', color: '#334155' }}
          />
        </div>

        {/* ✅ Dynamic Filters (สร้างจาก Database) */}
        <div className="filters" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ marginRight: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
             <i className="fa-solid fa-filter"></i> <span style={{fontSize: '0.9rem'}}>ตัวกรอง:</span>
          </div>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveFilter(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '50px',
                border: activeFilter === cat ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                background: activeFilter === cat ? '#eff6ff' : 'white',
                color: activeFilter === cat ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.9rem',
                fontWeight: activeFilter === cat ? '600' : '400'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* --- Lessons Grid --- */}
      <div className="lessons-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
          
          {filteredLessons.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <i className="fa-solid fa-box-open" style={{fontSize:'3rem', marginBottom:'15px', opacity:0.5}}></i>
                  <p>ไม่พบบทเรียนที่ค้นหา</p>
              </div>
          ) : (
              filteredLessons.map((lesson) => {
                const isCompleted = progressMap[lesson.id]; // ✅ เช็คสถานะเรียนจบ

                return (
                  <div key={lesson.id} className="lesson-card" 
                     style={{ 
                       background: 'white', 
                       borderRadius: '20px', 
                       padding: '30px', 
                       border: isCompleted ? '2px solid #bbf7d0' : '1px solid #f1f5f9', // ขอบเขียวถ้าจบแล้ว
                       position: 'relative', 
                       transition: 'transform 0.2s, box-shadow 0.2s', 
                       display: 'flex', 
                       flexDirection: 'column', 
                       justifyContent: 'space-between', 
                       height: '100%',
                       boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                     }}
                     onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)'; }}
                     onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                  >
                    
                    {/* Badge ผ่านแล้ว */}
                    {isCompleted && (
                        <div style={{ 
                            position: 'absolute', top: '20px', right: '20px', 
                            background: '#dcfce7', color: '#15803d', 
                            padding: '4px 12px', borderRadius: '20px', 
                            fontSize: '0.8rem', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}>
                            <i className="fa-solid fa-check"></i> ผ่านแล้ว
                        </div>
                    )}

                    {/* Content Top */}
                    <div>
                      <div style={{ marginBottom: '20px' }}>
                          <div style={{ 
                            width: '56px', height: '56px', borderRadius: '14px', 
                            background: isCompleted ? '#dcfce7' : '#eff6ff', 
                            color: isCompleted ? '#16a34a' : '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem'
                          }}>
                            <i className={getIconClass(lesson.image)}></i>
                          </div>
                      </div>

                      <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '10px', color: '#1e293b', lineHeight: '1.4' }}>
                          {lesson.title}
                      </h3>
                      <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '20px', lineHeight: '1.6', minHeight: '48px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {lesson.description && lesson.description !== 'EMPTY' ? lesson.description : 'เรียนรู้และพัฒนาทักษะผ่านบทเรียนนี้'}
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '30px' }}>
                        {/* Difficulty Badge */}
                        <span style={{ 
                          background: getDifficultyColor(lesson.difficulty),
                          color: getDifficultyTextColor(lesson.difficulty),
                          padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold'
                        }}>
                          {lesson.difficulty || 'Easy'}
                        </span>
                        {/* Duration Badge */}
                        <span style={{ background: '#f8fafc', color: '#475569', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                            <i className="fa-regular fa-clock" style={{ marginRight: '6px' }}></i> {lesson.duration || '15 นาที'}
                        </span>
                        {/* XP Badge */}
                        <span style={{ background: '#fefce8', color: '#b45309', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #fef08a', display: 'flex', alignItems: 'center' }}>
                            <i className="fa-solid fa-star" style={{ marginRight: '6px', color: '#eab308' }}></i> +{lesson.xp || 100} XP
                        </span>
                      </div>
                    </div>

                    {/* Button Bottom */}
                    <div>
                      {isCompleted ? (
                        // ✅ ปุ่มสีเขียวอ่อน สำหรับบทเรียนที่จบแล้ว
                        <button onClick={() => navigate(`/lesson/${lesson.id}`)} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#dcfce7', color: '#166534', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                             <i className="fa-solid fa-circle-check"></i> ทำข้อสอบแล้ว
                        </button>
                      ) : (
                        // ✅ ปุ่มสีทอง สำหรับบทเรียนใหม่
                        <button onClick={() => navigate(`/lesson/${lesson.id}`)} style={{ 
                            width: '100%', padding: '14px', borderRadius: '10px', border: 'none', 
                            background: '#ca8a04', color: 'white', fontWeight: 'bold', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)', transition: 'all 0.2s', fontSize: '1rem',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                          }}
                          className="hover-scale"
                        >
                            เริ่มเรียนทันที <i className="fa-solid fa-arrow-right"></i>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
          )}
      </div>
    </div>
  );
}

export default Lessons;