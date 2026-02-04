import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import confetti from 'canvas-confetti'; // ถ้าติดตั้งแล้ว (ถ้ายังให้ลบบรรทัดนี้ออก)

function LessonContent() {
  const { id } = useParams(); // รับค่า ID จาก URL
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessonDetail = async () => {
      try {
        setLoading(true);
        // ดึงข้อมูลบทเรียนตาม ID
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', id)
          .single(); // single() แปลว่าเอามาแค่รายการเดียว

        if (error) throw error;
        setLesson(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessonDetail();
  }, [id]);

  // ฟังก์ชันเมื่อเรียนจบ
  const handleComplete = () => {
    // ยิงพลุฉลอง (ถ้ามี lib confetti)
    if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    
    alert(`🎉 ยินดีด้วย! คุณได้รับ +${lesson.xp || 0} XP`);
    navigate('/lessons'); // กลับไปหน้าบทเรียนรวม
  };

  if (loading) return (
    <div style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem' }}></i>
        <p style={{ marginTop: '10px' }}>กำลังโหลดเนื้อหา...</p>
    </div>
  );

  if (!lesson) return (
    <div style={{ padding: '100px', textAlign: 'center' }}>
        <h2>ไม่พบข้อมูลบทเรียนนี้</h2>
        <button onClick={() => navigate('/lessons')} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
            กลับหน้ารวม
        </button>
    </div>
  );

  return (
    <div className="lesson-content-container" style={{ padding: '100px 20px 40px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* --- ส่วนหัว --- */}
      <div style={{ marginBottom: '30px' }}>
        <button 
            onClick={() => navigate('/lessons')}
            style={{ 
                background: 'transparent', border: 'none', color: '#64748b', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '1rem', marginBottom: '10px' 
            }}
        >
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i> กลับไปหน้ารวม
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
                width: '60px', height: '60px', borderRadius: '12px', 
                background: `${lesson.color || '#3b82f6'}20`, color: lesson.color || '#3b82f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem'
            }}>
                <i className={`fa-solid ${lesson.icon || 'fa-book'}`}></i>
            </div>
            <div>
                <h1 style={{ margin: 0, fontSize: '2rem', color: '#1e293b' }}>{lesson.title}</h1>
                <p style={{ margin: '5px 0 0', color: '#64748b' }}>{lesson.category || 'บทเรียนทั่วไป'}</p>
            </div>
        </div>
      </div>

      {/* --- พื้นที่เนื้อหา (จำลอง) --- */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        
        {/* 1. Video Placeholder */}
        <div style={{ 
            width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', 
            marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            position: 'relative', overflow: 'hidden'
        }}>
            {/* ใส่รูปปก หรือ Youtube Embed ตรงนี้ได้ในอนาคต */}
            <div style={{ textAlign: 'center' }}>
                <i className="fa-solid fa-play-circle" style={{ fontSize: '4rem', opacity: 0.8 }}></i>
                <p style={{ marginTop: '10px' }}>วิดีโอสาธิตการเรียนรู้</p>
            </div>
        </div>

        {/* 2. Text Content */}
        <div style={{ lineHeight: '1.8', color: '#334155', fontSize: '1.1rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#1e293b' }}>รายละเอียดบทเรียน</h3>
            <p style={{ marginBottom: '20px' }}>
                {lesson.description}
            </p>
            
            {/* เนื้อหาจำลอง (เพราะใน DB เรายังไม่มี field content) */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #3b82f6' }}>
                <h4 style={{ margin: '0 0 10px', color: '#1e293b' }}>💡 สิ่งที่จะได้เรียนรู้:</h4>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    <li>ทำความเข้าใจพื้นฐานของ {lesson.title}</li>
                    <li>ตัวอย่างการนำไปใช้ในชีวิตประจำวัน</li>
                    <li>เทคนิคการแก้ปัญหาแบบ Step-by-step</li>
                </ul>
            </div>
            
            <p style={{ marginTop: '20px' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
        </div>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

        {/* 3. Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>รางวัลเมื่อเรียนจบ</span>
                <div style={{ color: '#eab308', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    <i className="fa-solid fa-star"></i> +{lesson.xp} XP
                </div>
            </div>

            <button 
                onClick={handleComplete}
                className="btn-complete hover-scale"
                style={{ 
                    padding: '12px 30px', borderRadius: '50px', border: 'none',
                    background: '#22c55e', color: 'white', fontSize: '1.1rem', fontWeight: 'bold',
                    cursor: 'pointer', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}
            >
                <i className="fa-solid fa-check-circle"></i> เรียนจบแล้ว
            </button>
        </div>

      </div>
    </div>
  );
}

export default LessonContent;