import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function StudyRoom() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  const getEmbedUrl = (url) => {
    if (!url) return "";
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const getLessonStyle = (category) => {
    const styles = {
      'Computational Thinking': { color: '#3b82f6', icon: 'fa-brain' },
      'Algorithm': { color: '#ef4444', icon: 'fa-gears' },
      'Decomposition': { color: '#22c55e', icon: 'fa-puzzle-piece' },
      'Pattern Recognition': { color: '#eab308', icon: 'fa-magnifying-glass' },
      'Abstraction': { color: '#a855f7', icon: 'fa-cube' }
    };
    return styles[category] || { color: '#6366f1', icon: 'fa-book-open' };
  };

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setLesson(data);
      } catch (error) {
        console.error('Error fetching lesson:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id]);

  const handleStartQuiz = () => {
    navigate(`/lesson/${id}/quiz`);
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>กำลังโหลด...</div>;
  if (!lesson) return <div style={{ padding: '100px', textAlign: 'center' }}>ไม่พบข้อมูล</div>;

  const { color } = getLessonStyle(lesson.category);
  
  // เช็คข้อมูล
  const hasVideo = lesson.videoUrl && lesson.videoUrl.trim() !== "";
  const slideUrl = lesson.slide_url; 
  const hasSlide = slideUrl && slideUrl.trim() !== "";
  const isPdf = hasSlide && slideUrl.toLowerCase().includes('.pdf');

  // Logic: ถ้ามีวิดีโอ ให้วิดีโออยู่ซ้าย (Main)
  // ถ้าไม่มีวิดีโอ ให้สไลด์มาอยู่ซ้ายแทน
  const showMainVideo = hasVideo;
  const showMainSlideOnly = !hasVideo && hasSlide; // กรณีไม่มีวิดีโอ โชว์สไลด์ฝั่งซ้ายเลย

  return (
    <div className="study-room" style={{ padding: '100px 40px 60px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Sarabun', sans-serif" }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/lessons')} style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b', padding: '8px 16px', borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <i className="fa-solid fa-arrow-left"></i> ย้อนกลับ
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <span style={{ color: color, background: `${color}15`, padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                {lesson.category || 'General'}
            </span>
            <div style={{ color: '#eab308', fontWeight: 'bold', background: '#fefce8', padding: '8px 16px', borderRadius: '50px', border: '1px solid #fef08a' }}>
                <i className="fa-solid fa-star"></i> +{lesson.xp || 100} XP
            </div>
        </div>
      </div>

      <h1 style={{ margin: '0 0 30px', fontSize: '2.2rem', color: '#1e293b' }}>{lesson.title}</h1>

      {/* --- Layout แบบแบ่งซ้ายขวา (Flexbox) --- */}
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* === ฝั่งซ้าย: วิดีโอ (หรือสื่อหลัก) === */}
        <div style={{ flex: '2 1 600px', minWidth: '300px' }}>
             <div style={{ width: '100%', background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                {showMainVideo ? (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                         <iframe 
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            src={getEmbedUrl(lesson.videoUrl)} 
                            title={lesson.title} frameBorder="0" allowFullScreen
                        ></iframe>
                    </div>
                ) : showMainSlideOnly ? (
                    // กรณีไม่มีวิดีโอ เอาสไลด์มาโชว์ตรงนี้แทน
                    isPdf ? (
                        <iframe src={slideUrl} style={{ width: '100%', height: '600px', border: 'none', background: 'white' }}></iframe>
                    ) : (
                        <img src={slideUrl} alt="Slide" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    )
                ) : (
                    <div style={{ textAlign: 'center', color: 'white', padding: '100px 20px' }}>
                        <i className="fa-solid fa-video-slash" style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '10px' }}></i>
                        <p>ไม่มีวิดีโอประกอบ</p>
                    </div>
                )}
            </div>
        </div>

        {/* === ฝั่งขวา: เอกสารและคำอธิบาย === */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. ส่วนเอกสาร (ถ้ามีทั้งวิดีโอ และ สไลด์ -> โชว์สไลด์ตรงนี้) */}
            {hasVideo && hasSlide && (
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 15px', fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center' }}>
                        <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', marginRight: '8px' }}></i> 
                        เอกสารประกอบ
                    </h3>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', height: '400px', background: '#f8fafc' }}>
                        {isPdf ? (
                            <iframe src={slideUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Doc"></iframe>
                        ) : (
                            <div style={{height: '100%', overflowY: 'auto'}}>
                                <img src={slideUrl} alt="Doc" style={{ width: '100%', display: 'block' }} />
                            </div>
                        )}
                    </div>
                    <a href={slideUrl} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: '10px', fontSize: '0.9rem', color: '#3b82f6', textDecoration: 'none' }}>
                        <i className="fa-solid fa-external-link-alt"></i> เปิดไฟล์เต็มจอ
                    </a>
                </div>
            )}

            {/* 2. ส่วนคำอธิบาย */}
            <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 15px', fontSize: '1.1rem', color: '#1e293b' }}>
                    <i className="fa-solid fa-align-left" style={{ color: '#3b82f6', marginRight: '8px' }}></i>
                    คำอธิบายบทเรียน
                </h3>
                <p style={{ lineHeight: '1.6', color: '#334155', fontSize: '1rem', whiteSpace: 'pre-line' }}>
                    {(lesson.description && lesson.description !== 'EMPTY') ? lesson.description : 'ไม่มีคำอธิบายเพิ่มเติม'}
                </p>
            </div>

            {/* 3. ปุ่มไปทำข้อสอบ */}
            <div style={{ marginTop: '10px' }}>
                <button 
                    onClick={handleStartQuiz}
                    className="hover-scale"
                    style={{ 
                        width: '100%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                        color: 'white', border: 'none', padding: '15px', borderRadius: '12px', 
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', 
                        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'
                    }}
                >
                    <span>ทำแบบทดสอบ</span> <i className="fa-solid fa-arrow-right"></i>
                </button>
            </div>

        </div>

      </div>
    </div>
  );
}

export default StudyRoom;