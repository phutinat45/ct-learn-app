import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';

function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [completedLessonsList, setCompletedLessonsList] = useState([]);
  const [myInventory, setMyInventory] = useState([]); // ✅ เพิ่ม State เก็บของในตัว
  
  // --- State สำหรับเก็บค่าสถิติ ---
  const [stats, setStats] = useState({
    totalXP: 0,
    level: 1,
    maxXp: 100,
    completedCount: 0,
    badgesCount: 0,
    streak: 0,
    rank: '-'
  });

  const [showModal, setShowModal] = useState(false);
  const [tempData, setTempData] = useState({});

  // 🛠️ Config ของรางวัล (ต้องตรงกับหน้า Shop)
  const itemsConfig = [
    { id: 1, name: 'กรอบทองคำ', type: 'frame', icon: '👑', color: '#fbbf24' },
    { id: 2, name: 'กรอบไฟเย็น', type: 'frame', icon: '❄️', color: '#38bdf8' },
    { id: 3, name: 'ฉายา: Hacker', type: 'title', icon: '💻', color: '#22c55e' },
    { id: 4, name: 'ฉายา: Wizard', type: 'title', icon: '🧙‍♂️', color: '#a855f7' },
    { id: 5, name: 'ธีม: Dark Mode', type: 'theme', icon: '🌙', color: '#1e293b' },
  ];

  // รายการเหรียญรางวัล (Badges)
  const badgesConfig = [
    { id: 1, name: 'ผู้เริ่มต้น', desc: 'ถึง Level 2', icon: 'fa-star', color: '#f59e0b', reqLevel: 2 },
    { id: 2, name: 'นักแก้ปัญหา', desc: 'ถึง Level 5', icon: 'fa-puzzle-piece', color: '#f97316', reqLevel: 5 },
    { id: 3, name: 'ความพยายาม', desc: 'ถึง Level 8', icon: 'fa-droplet', color: '#3b82f6', reqLevel: 8 },
    { id: 4, name: 'ผู้ชนะ', desc: 'ถึง Level 10', icon: 'fa-trophy', color: '#8b5cf6', reqLevel: 10 },
    { id: 5, name: 'ยอดอัจฉริยะ', desc: 'ถึง Level 15', icon: 'fa-lightbulb', color: '#eab308', reqLevel: 15 },
  ];

  const avatarOptions = [
    'fa-user-graduate', 'fa-user-astronaut', 'fa-user-ninja', 
    'fa-user-secret', 'fa-user-tie', 'fa-robot', 
    'fa-user-doctor', 'fa-user-gear'
  ];

  useEffect(() => {
    fetchProfileData();
  }, []);

  // 🔥 ฟังก์ชันคำนวณ Streak 🔥
  const calculateStreak = (progressData) => {
      if (!progressData || progressData.length === 0) return 0;
      const toLocalDateStr = (dateStr) => {
          const d = new Date(dateStr);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const uniqueDates = new Set(progressData.map(p => toLocalDateStr(p.created_at)));
      let streak = 0;
      let d = new Date(); 
      if (!uniqueDates.has(toLocalDateStr(d))) {
          d.setDate(d.getDate() - 1);
          if (!uniqueDates.has(toLocalDateStr(d))) return 0;
      }
      while (true) {
          if (uniqueDates.has(toLocalDateStr(d))) { streak++; d.setDate(d.getDate() - 1); } 
          else { break; }
      }
      return streak;
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) { navigate('/login'); return; }
      const localUser = JSON.parse(userStr);

      // ✅ ดึงข้อมูลเพิ่ม: user_inventory
      const [userRes, progressRes, lessonsRes, allUsersRes, inventoryRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', localUser.id).single(),
        supabase.from('progress').select('lesson_id, passed, created_at').eq('student_id', localUser.id).eq('passed', true),
        supabase.from('lessons').select('*'),
        supabase.from('users').select('id, xp').neq('role', 'admin').order('xp', { ascending: false }),
        supabase.from('user_inventory').select('item_id').eq('user_id', localUser.id) // ดึงของ
      ]);

      const userData = userRes.data || localUser;
      const progressData = progressRes.data || [];
      const lessonsData = lessonsRes.data || [];
      const allUsersData = allUsersRes.data || [];
      const inventoryData = inventoryRes.data || [];

      // จัดการ Inventory
      const myItems = inventoryData.map(inv => 
          itemsConfig.find(i => i.id === inv.item_id)
      ).filter(Boolean); // กรองเอาเฉพาะที่มีใน Config

      // 1. หาบทเรียนที่ User นี้ทำผ่านแล้ว
      const passedIds = new Set(progressData.map(p => String(p.lesson_id)));
      const myLessons = lessonsData.filter(l => passedIds.has(String(l.id)));
      
      // 2. คำนวณ XP รวม
      let calculatedXP = 0;
      myLessons.forEach(l => { calculatedXP += (l.xp || 0); });

      // 3. คำนวณ Level
      const currentLevel = Math.floor(calculatedXP / 100) + 1;
      const nextLevelXP = currentLevel * 100;

      // 4. คำนวณ Streak
      const currentStreak = calculateStreak(progressData);

      // 5. นับเหรียญ
      const earnedBadgesCount = badgesConfig.filter(b => currentLevel >= b.reqLevel).length;

      // 6. หาอันดับ
      const myRankIndex = allUsersData.findIndex(u => u.id === userData.id);
      const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '-';

      setStudent(userData);
      setCompletedLessonsList(myLessons);
      setMyInventory(myItems); // ✅ Set Inventory State
      setStats({
        totalXP: calculatedXP,
        level: currentLevel,
        maxXp: nextLevelXP,
        completedCount: myLessons.length,
        badgesCount: earnedBadgesCount,
        streak: currentStreak, 
        rank: myRank
      });

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ส่วนจัดการ Edit Profile ---
  const handleEditClick = () => {
    setTempData({
      fullname: student.fullname || '',
      grade_level: student.grade_level || '',
      image: student.image || 'fa-user-graduate',
      previewImage: null 
    });
    setShowModal(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
          setTempData(prev => ({ ...prev, previewImage: reader.result, image: null }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconSelect = (icon) => {
      setTempData({ ...tempData, image: icon, previewImage: null });
  };

  const handleSave = async () => {
    try {
        const finalImage = tempData.previewImage || tempData.image; 
        const { error } = await supabase.from('users').update({
                fullname: tempData.fullname,
                grade_level: tempData.grade_level,
                image: finalImage
            }).eq('id', student.id);

        if (error) throw error;

        setStudent({ ...student, fullname: tempData.fullname, grade_level: tempData.grade_level, image: finalImage });
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        currentUser.fullname = tempData.fullname;
        currentUser.image = finalImage;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        setShowModal(false);
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
    } catch (error) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  // Helper Functions
  const isIcon = (str) => str && str.startsWith('fa-');

  if (loading) return <div style={{padding:'100px', textAlign:'center'}}>กำลังโหลดข้อมูล...</div>;

  return (
    <div className="profile-page" style={{ padding: '120px 20px 100px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Sarabun', sans-serif" }}>

      {/* --- Header Card --- */}
      <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
          <div style={{ position:'relative' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '24px', overflow: 'hidden', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)' }}>
                {student?.image && !isIcon(student.image) ? (
                    <img src={student.image} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                ) : (
                    <i className={`fa-solid ${student?.image || 'fa-user-graduate'}`} style={{fontSize: '3.5rem', color: 'white'}}></i>
                )}
            </div>
            <div style={{ position:'absolute', bottom:'-10px', right:'-10px', background:'white', borderRadius:'50%', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 10px rgba(0,0,0,0.1)', fontWeight:'bold', color:'#3b82f6', border:'2px solid #e0e7ff' }}>
                {stats.level}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '250px' }}>
              <h1 style={{ margin: '0 0 5px', fontSize: '2rem', color: '#1e293b' }}>{student?.fullname || 'Student Name'}</h1>
              <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '20px' }}>{student?.grade_level || 'นักเรียนทั่วไป'}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  <span style={{color:'#3b82f6'}}>Level {stats.level}</span>
                  <span style={{color:'#94a3b8'}}>{stats.totalXP} / {stats.maxXp} XP</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${(stats.totalXP % 100)}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 0.5s ease' }}></div>
              </div>
          </div>

          <button onClick={handleEditClick} style={{ padding: '10px 20px', borderRadius: '50px', border: '1px solid #3b82f6', background: 'white', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition:'all 0.2s' }} className="hover-scale">
              <i className="fa-solid fa-pen"></i> แก้ไขโปรไฟล์
          </button>
      </div>

      {/* --- Stats Grid --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {[
             { icon: 'fa-book-open', color: '#3b82f6', val: stats.completedCount, label: 'บทเรียนที่จบ' },
             { icon: 'fa-star', color: '#eab308', val: stats.totalXP, label: 'XP รวม' },
             { icon: 'fa-trophy', color: '#22c55e', val: stats.badgesCount, label: 'เหรียญ' },
             { icon: 'fa-fire', color: '#ef4444', val: stats.streak, label: 'วันต่อเนื่อง' },
             { icon: 'fa-bullseye', color: '#8b5cf6', val: `#${stats.rank}`, label: 'อันดับ' }
          ].map((item, idx) => (
            <div key={idx} className="hover-lift" style={{ background: 'white', padding: '25px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                <i className={`fa-solid ${item.icon}`} style={{ fontSize: '2rem', color: item.color, marginBottom: '15px' }}></i>
                <h2 style={{ margin: 0, fontSize: '2rem', color: '#1e293b' }}>{item.val}</h2>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{item.label}</span>
            </div>
          ))}
      </div>

      {/* ✅✅✅ ส่วนแสดงของสะสม (Inventory Section) ✅✅✅ */}
      <div style={{ marginBottom: '30px', background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 20px', color: '#1e293b' }}><i className="fa-solid fa-gem" style={{color: '#8b5cf6'}}></i> กระเป๋าของฉัน ({myInventory.length})</h3>
          
          {myInventory.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
                  {myInventory.map((item, index) => (
                      <div key={index} className="hover-lift" style={{ 
                          background: '#f8fafc', 
                          padding: '20px', 
                          borderRadius: '16px', 
                          border: '1px solid #e2e8f0', 
                          textAlign: 'center',
                          position: 'relative',
                          overflow: 'hidden'
                      }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{item.icon}</div>
                          <h4 style={{ margin: '0 0 5px', fontSize: '1rem', color: '#334155' }}>{item.name}</h4>
                          <span style={{ 
                              fontSize: '0.7rem', 
                              color: 'white', 
                              background: item.color, 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              fontWeight: 'bold'
                          }}>
                              {item.type}
                          </span>
                      </div>
                  ))}
              </div>
          ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
                  ยังไม่มีไอเทม ไปช้อปปิ้งที่ <span style={{color:'#3b82f6', cursor:'pointer', fontWeight:'bold'}} onClick={() => navigate('/shop')}>ร้านค้า</span> เลย!
              </div>
          )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', flexWrap: 'wrap' }}>
          
          {/* --- Badges --- */}
          <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b' }}><i className="fa-solid fa-trophy" style={{color: '#d97706'}}></i> เหรียญรางวัล</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '15px' }}>
                  {badgesConfig.map((badge) => {
                      const isUnlocked = stats.level >= badge.reqLevel;
                      return (
                          <div key={badge.id} title={isUnlocked ? badge.name : `ปลดล็อคเมื่อ ${badge.desc}`} 
                               style={{ 
                                   textAlign: 'center', 
                                   opacity: isUnlocked ? 1 : 0.4, 
                                   filter: isUnlocked ? 'none' : 'grayscale(100%)',
                                   transition: 'all 0.3s'
                               }}>
                              <div style={{ 
                                  width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 8px',
                                  background: isUnlocked ? badge.color : '#e2e8f0', 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'white', fontSize: '1.5rem', 
                                  boxShadow: isUnlocked ? `0 4px 10px ${badge.color}66` : 'none'
                              }}>
                                  <i className={`fa-solid ${badge.icon}`}></i>
                              </div>
                              <span style={{fontSize:'0.8rem', color: isUnlocked ? badge.color : '#94a3b8', fontWeight:'bold'}}>{badge.reqLevel}</span>
                          </div>
                      )
                  })}
              </div>
              {stats.level < 2 && <p style={{textAlign:'center', marginTop:'20px', color:'#94a3b8', fontSize:'0.9rem'}}>*เล่นให้ถึง Level 2 เพื่อรับเหรียญแรก!</p>}
          </div>

          {/* --- Completed Lessons --- */}
          <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b' }}><i className="fa-regular fa-circle-check" style={{color: '#16a34a'}}></i> บทเรียนที่เรียนจบ</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '300px', overflowY: 'auto' }}>
                  {completedLessonsList.length > 0 ? (
                      completedLessonsList.map((lesson) => (
                          <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                  <i className="fa-solid fa-check"></i>
                              </div>
                              <div style={{ flex: 1 }}>
                                  <h4 style={{ margin: '0', fontSize: '1rem', color: '#334155' }}>{lesson.title}</h4>
                                  <span style={{ fontSize: '0.8rem', color: '#eab308' }}>+{lesson.xp} XP</span>
                              </div>
                          </div>
                      ))
                  ) : (
                      <p style={{color:'#94a3b8', textAlign:'center'}}>ยังไม่มีบทเรียนที่จบ</p>
                  )}
              </div>
          </div>
      </div>

      {/* --- Activity Heatmap (Mock Visual for Streak) --- */}
      <div style={{ marginTop: '30px', background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 15px', color: '#1e293b' }}><i className="fa-solid fa-fire" style={{color: '#ef4444'}}></i> ความต่อเนื่อง</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* จุดสีเขียวตามจำนวน Streak */}
              {[...Array(stats.streak)].map((_, i) => (
                  <div key={i} title="เรียนแล้ว" style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4ade80' }}></div>
              ))}
              {/* จุดสีเทา (Mock ให้เต็มแถว) */}
              {[...Array(Math.max(0, 14 - stats.streak))].map((_, i) => (
                  <div key={i} title="ยังไม่เรียน" style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9' }}></div>
              ))}
          </div>
          <p style={{ marginTop: '15px', fontSize: '0.9rem', color: '#64748b' }}>คุณเรียนติดต่อกัน {stats.streak} วันแล้ว!</p>
      </div>

      {/* ================= MODAL POPUP (ยังอยู่เหมือนเดิม) ================= */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '500px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}><i className="fa-solid fa-xmark"></i></button>
                <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b' }}>แก้ไขข้อมูลส่วนตัว</h2>
                
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#e2e8f0', margin: '0 auto 15px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {tempData.previewImage ? (
                            <img src={tempData.previewImage} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Preview" />
                        ) : isIcon(tempData.image) ? (
                            <i className={`fa-solid ${tempData.image}`} style={{fontSize: '3rem', color: '#64748b'}}></i>
                        ) : (
                            <i className="fa-solid fa-user" style={{fontSize: '3rem', color: '#64748b'}}></i>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={() => fileInputRef.current.click()} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}><i className="fa-solid fa-camera"></i> อัปรูปภาพ</button>
                        <input type="file" ref={fileInputRef} style={{display:'none'}} accept="image/*" onChange={handleImageUpload} />
                    </div>
                    <p style={{margin:'10px 0 5px', fontSize:'0.9rem', color:'#64748b'}}>หรือเลือกไอคอน</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {avatarOptions.map(icon => (
                            <div key={icon} onClick={() => handleIconSelect(icon)} style={{ width: '35px', height: '35px', borderRadius: '50%', background: tempData.image === icon && !tempData.previewImage ? '#3b82f6' : '#f1f5f9', color: tempData.image === icon && !tempData.previewImage ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><i className={`fa-solid ${icon}`}></i></div>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#334155' }}>ชื่อ - นามสกุล</label>
                    <input type="text" value={tempData.fullname || ''} onChange={(e) => setTempData({...tempData, fullname: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#334155' }}>ชั้นเรียน / ข้อมูล</label>
                    <input type="text" value={tempData.grade_level || ''} onChange={(e) => setTempData({...tempData, grade_level: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer' }}>ยกเลิก</button>
                    <button onClick={handleSave} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกข้อมูล</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default Profile;