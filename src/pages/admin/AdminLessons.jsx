import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import Swal from 'sweetalert2'; 

function AdminLessons() {
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [activeLessonTab, setActiveLessonTab] = useState('info');
  
  const lessonFileRef = useRef(null);
  const slideFileRef = useRef(null);
  
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // File States
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedSlideFile, setSelectedSlideFile] = useState(null);
  const [previewSlideName, setPreviewSlideName] = useState(null);

  // Quiz Image Files State
  const [quizImageFiles, setQuizImageFiles] = useState({}); 

  // Categories State
  const [categories, setCategories] = useState(['Computational Thinking', 'Coding', 'Algorithm', 'วิทยาการคำนวณ']);
  const [newCategory, setNewCategory] = useState('');
  const [isManagingCategory, setIsManagingCategory] = useState(false); 

  // Default Lesson Structure
  const defaultLesson = { 
      title: '', category: 'Computational Thinking', difficulty: 'Easy', 
      xp: 100, duration: '15 นาที', status: 'published', 
      image: null, description: '', 
      scenario: '', 
      videoUrl: '', 
      slide_url: null, 
      quiz: [] 
  };
  const [currentLesson, setCurrentLesson] = useState(defaultLesson);

  useEffect(() => { fetchLessons(); }, []);

  const fetchLessons = async () => {
    try {
      setIsLoading(true); 
      const { data, error } = await supabase.from('lessons').select('*').order('id', { ascending: true });
      if (error) throw error;
      setLessons(data.map(item => ({ ...item, quiz: item.quiz || [] })));
    } catch (error) { 
      console.error('Error:', error.message); 
    } finally {
      setIsLoading(false); 
    }
  };

  // --- Handlers ---
  const handleAddLesson = () => { 
      setIsEditingLesson(false); 
      setCurrentLesson(defaultLesson); 
      setPreviewImage(null);
      setSelectedImageFile(null);
      setSelectedSlideFile(null);
      setPreviewSlideName(null);
      setQuizImageFiles({}); 
      setActiveLessonTab('info'); 
      setShowLessonModal(true); 
  };
  
  const handleEditLesson = (l) => { 
      setIsEditingLesson(true); 
      setCurrentLesson({ 
          ...l, 
          quiz: l.quiz || [],
          // Ensure xp has a fallback if null
          xp: l.xp !== undefined && l.xp !== null ? l.xp : 100, 
          duration: l.duration || '15 นาที',
          slide_url: l.slide_url || null,
          scenario: l.scenario || '' 
      }); 
      setPreviewImage(l.image); 
      setSelectedImageFile(null); 
      setSelectedSlideFile(null);
      setPreviewSlideName(null);
      setQuizImageFiles({});
      setActiveLessonTab('info'); 
      setShowLessonModal(true); 
  };

  const handleLessonImgChange = (e) => { 
      if(e.target.files[0]) {
          const file = e.target.files[0];
          setSelectedImageFile(file); 
          setPreviewImage(URL.createObjectURL(file)); 
      } 
  };

  const handleSlideFileChange = (e) => {
      if(e.target.files[0]) {
          const file = e.target.files[0];
          setSelectedSlideFile(file);
          setPreviewSlideName(file.name);
      }
  };

  // --- Quiz Image Handler ---
  const handleQuizImageChange = (e, index) => {
      if (e.target.files[0]) {
          const file = e.target.files[0];
          setQuizImageFiles(prev => ({ ...prev, [index]: file }));
          
          const previewUrl = URL.createObjectURL(file);
          const updatedQuiz = [...currentLesson.quiz];
          updatedQuiz[index].image = previewUrl; 
          setCurrentLesson({ ...currentLesson, quiz: updatedQuiz });
      }
  };

  const removeQuizImage = (index) => {
      const updatedQuiz = [...currentLesson.quiz];
      updatedQuiz[index].image = null;
      setCurrentLesson({ ...currentLesson, quiz: updatedQuiz });
      
      const newQuizFiles = { ...quizImageFiles };
      delete newQuizFiles[index];
      setQuizImageFiles(newQuizFiles);
  };

  // --- Category Handlers ---
  const handleAddCategory = () => {
      if (newCategory.trim() !== "") {
          setCategories([...categories, newCategory.trim()]);
          setCurrentLesson({ ...currentLesson, category: newCategory.trim() });
          setNewCategory('');
      }
  };

  const handleDeleteCategory = (catToDelete) => {
      const updatedCats = categories.filter(c => c !== catToDelete);
      setCategories(updatedCats);
      if (currentLesson.category === catToDelete) {
          setCurrentLesson({ ...currentLesson, category: updatedCats[0] || '' });
      }
  };

  const uploadFileToSupabase = async (file, bucketName) => {
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`; 
          const filePath = `${fileName}`;
          const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
          return data.publicUrl;
      } catch (error) {
          console.error(`Upload Error:`, error);
          return null;
      }
  };

  const handleLessonSave = async () => {
    setIsLoading(true); 
    try {
        let imageUrl = currentLesson.image;
        if (selectedImageFile) {
            const uploadedUrl = await uploadFileToSupabase(selectedImageFile, 'lesson_images'); 
            if (uploadedUrl) imageUrl = uploadedUrl;
        }

        let slideUrl = currentLesson.slide_url;
        if (selectedSlideFile) {
            const uploadedUrl = await uploadFileToSupabase(selectedSlideFile, 'lesson_images'); 
            if (uploadedUrl) slideUrl = uploadedUrl;
        }

        const processedQuiz = await Promise.all(currentLesson.quiz.map(async (q, index) => {
            let quizImgUrl = q.image; 

            if (quizImageFiles[index]) {
                const uploadedQuizImg = await uploadFileToSupabase(quizImageFiles[index], 'lesson_images');
                if (uploadedQuizImg) quizImgUrl = uploadedQuizImg;
            } else if (q.image && q.image.startsWith('blob:')) {
                quizImgUrl = null; 
            }

            return {
                type: q.type || 'choice', 
                question: q.question,
                image: quizImgUrl, 
                options: q.options,
                correct: q.correct, 
                hint: q.hint || '', 
                explanation: q.explanation || '', 
                answer: q.options[q.correct] || "" 
            };
        }));

        const lessonData = {
            title: currentLesson.title,
            category: currentLesson.category,
            difficulty: currentLesson.difficulty,
            xp: parseInt(currentLesson.xp) || 0, // Ensure it's an integer
            duration: currentLesson.duration,
            status: currentLesson.status,
            description: currentLesson.description,
            scenario: currentLesson.scenario, 
            videoUrl: currentLesson.videoUrl || null,
            image: imageUrl, 
            slide_url: slideUrl,
            quiz: processedQuiz 
        };

        if (isEditingLesson) {
            const { error } = await supabase.from('lessons').update(lessonData).eq('id', currentLesson.id);
            if (error) throw error;
            setLessons(lessons.map(l => l.id === currentLesson.id ? { ...currentLesson, ...lessonData } : l));
        } else {
            const { data, error } = await supabase.from('lessons').insert([lessonData]).select();
            if (error) throw error;
            if (data) setLessons([...lessons, { ...data[0], quiz: data[0].quiz || [] }]);
        }

        setShowLessonModal(false);
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });

    } catch (error) {
        console.error("Save Error:", error);
        Swal.fire('Error', 'บันทึกไม่สำเร็จ', 'error');
    } finally {
        setIsLoading(false); 
    }
  };

  const handleLessonDelete = async (id) => { 
      Swal.fire({
          title: 'ยืนยันการลบ?', 
          text: "หากลบ บทเรียนนี้และคะแนนของนักเรียนในบทนี้จะหายไปถาวร!", 
          icon: 'warning',
          showCancelButton: true, 
          confirmButtonColor: '#d33', 
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'ลบเลย',
          cancelButtonText: 'ยกเลิก'
      }).then(async (result) => {
          if (result.isConfirmed) {
              setIsLoading(true);
              try {
                  const { error: progressError } = await supabase.from('progress').delete().eq('lesson_id', id);
                  if (progressError) console.warn("Error deleting progress:", progressError);

                  const { error } = await supabase.from('lessons').delete().eq('id', id);
                  if (error) throw error;

                  setLessons(lessons.filter(l => l.id !== id));
                  Swal.fire('ลบแล้ว!', 'บทเรียนถูกลบเรียบร้อย', 'success');

              } catch (error) {
                  console.error("Delete error:", error);
                  Swal.fire('ลบไม่สำเร็จ', 'เกิดข้อผิดพลาด: ' + error.message, 'error');
              } finally {
                  setIsLoading(false);
              }
          }
      });
  };

  const addQuestion = () => { setCurrentLesson({ ...currentLesson, quiz: [...currentLesson.quiz, { type: 'choice', question: '', image: null, options: ['', '', '', ''], correct: 0, hint: '', explanation: '' }] }); };
  const updateQuestion = (idx, field, val) => { const q = [...currentLesson.quiz]; q[idx][field] = val; setCurrentLesson({...currentLesson, quiz: q}); };
  const updateOption = (qIdx, oIdx, val) => { const q = [...currentLesson.quiz]; q[qIdx].options[oIdx] = val; setCurrentLesson({...currentLesson, quiz: q}); };
  const deleteQuestion = (idx) => { setCurrentLesson({ ...currentLesson, quiz: currentLesson.quiz.filter((_, i) => i !== idx) }); };

  const getDifficultyColor = (d) => d === 'Easy' ? '#22c55e' : d === 'Medium' ? '#f59e0b' : '#ef4444';

  return (
    <div className="card-box" style={{ background: 'white', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                <div style={{width:'50px', height:'50px', background:'#eff6ff', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', color:'#3b82f6', fontSize:'1.4rem', boxShadow:'0 4px 10px rgba(59,130,246,0.1)'}}><i className="fa-solid fa-book-open"></i></div>
                <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem' }}>จัดการบทเรียน (PBL+CT)</h3>
                    <span style={{color:'#64748b', fontSize:'0.9rem'}}>ทั้งหมด {lessons.length} รายการ</span>
                </div>
            </div>
            <button onClick={handleAddLesson} disabled={isLoading} className="hover-scale" style={{ padding: '12px 24px', borderRadius: '12px', background:'linear-gradient(135deg, #3b82f6, #2563eb)', color:'white', border:'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', boxShadow:'0 4px 12px rgba(37,99,235,0.2)', cursor:'pointer' }}>
                <i className="fa-solid fa-plus"></i> เพิ่มภารกิจใหม่
            </button>
        </div>

        {isLoading && <div style={{textAlign:'center', padding:'40px', color:'#3b82f6'}}><i className="fa-solid fa-circle-notch fa-spin" style={{fontSize:'2.5rem', marginBottom:'10px'}}></i><p>กำลังดำเนินการกับฐานข้อมูล...</p></div>}

        {/* Table */}
        <div style={{ overflowX: 'auto', borderRadius:'16px', border:'1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.9rem', textAlign: 'left', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        <th style={{ padding: '18px 24px' }}>รูปปก</th>
                        <th style={{ padding: '18px' }}>ชื่อบทเรียน</th>
                        <th style={{ padding: '18px' }}>หมวดหมู่</th>
                        <th style={{ padding: '18px' }}>XP / เวลา</th>
                        <th style={{ padding: '18px' }}>ข้อสอบ</th>
                        <th style={{ padding: '18px' }}>สถานะ</th>
                        <th style={{ padding: '18px', textAlign: 'center' }}>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    {lessons.length === 0 && !isLoading && <tr><td colSpan="7" style={{textAlign:'center', padding:'40px', color:'#94a3b8', fontSize:'1.1rem'}}>ไม่พบข้อมูลบทเรียน</td></tr>}
                    {lessons.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', background:'white' }}>
                            <td style={{ padding: '15px 24px' }}>
                                <div style={{ width: '80px', height: '50px', borderRadius: '10px', overflow: 'hidden', background: '#e2e8f0', border:'1px solid #e2e8f0', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' }}>
                                    <img src={l.image || 'https://via.placeholder.com/150'} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            </td>
                            <td style={{ padding: '15px' }}>
                                <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize:'1rem' }}>{l.title}</div>
                                <div style={{ fontSize: '0.8rem', color: getDifficultyColor(l.difficulty), display:'flex', alignItems:'center', gap:'6px', marginTop:'4px' }}>
                                    <i className="fa-solid fa-circle" style={{fontSize:'6px'}}></i> {l.difficulty}
                                </div>
                            </td>
                            <td style={{ padding: '15px' }}><span style={{ background: '#f1f5f9', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', color: '#475569', border: '1px solid #e2e8f0', fontWeight:'500' }}>{l.category}</span></td>
                            <td style={{ padding: '15px' }}>
                                <div style={{ fontSize: '0.9rem' }}><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{l.xp} XP</span></div>
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop:'2px' }}><i className="fa-regular fa-clock"></i> {l.duration}</div>
                            </td>
                            <td style={{ padding: '15px' }}><span style={{ background: '#eff6ff', color: '#3b82f6', padding: '6px 12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold' }}>{l.quiz ? l.quiz.length : 0} ข้อ</span></td>
                            <td style={{ padding: '15px' }}>
                                <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: l.status === 'published' ? '#dcfce7' : '#f1f5f9', color: l.status === 'published' ? '#16a34a' : '#64748b' }}>
                                    {l.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
                                </span>
                            </td>
                            <td style={{ padding: '15px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button onClick={() => handleEditLesson(l)} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', width: '38px', height: '38px', borderRadius: '10px', cursor: 'pointer', transition:'all 0.2s' }} className="hover-scale"><i className="fa-solid fa-pen"></i></button>
                                    <button onClick={() => handleLessonDelete(l.id)} style={{ background: 'white', border: '1px solid #fecaca', color: '#ef4444', width: '38px', height: '38px', borderRadius: '10px', cursor: 'pointer', transition:'all 0.2s' }} className="hover-scale"><i className="fa-solid fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {showLessonModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !isLoading && setShowLessonModal(false)}>
            <div style={{ background: 'white', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', padding: '0', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow:'0 20px 50px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                
                <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                    <h2 style={{ margin: 0, color: '#1e293b', fontSize:'1.5rem', display:'flex', alignItems:'center', gap:'10px' }}>
                        {isEditingLesson ? <i className="fa-solid fa-pen-to-square" style={{color:'#3b82f6'}}></i> : <i className="fa-solid fa-sparkles" style={{color:'#f59e0b'}}></i>}
                        {isEditingLesson ? 'แก้ไขภารกิจ' : 'เพิ่มภารกิจใหม่'}
                    </h2>
                    <button onClick={() => setShowLessonModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer', padding:'5px' }}><i className="fa-solid fa-xmark"></i></button>
                </div>

                <div style={{ padding: '0 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '30px' }}>
                    {['info', 'content', 'quiz'].map(tab => (
                        <button key={tab} onClick={() => setActiveLessonTab(tab)} style={{ padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeLessonTab === tab ? '3px solid #3b82f6' : '3px solid transparent', color: activeLessonTab === tab ? '#3b82f6' : '#64748b', fontWeight: activeLessonTab === tab ? 'bold' : '500', fontSize: '1rem', transition:'all 0.2s' }}>
                            {tab === 'info' ? '1. ข้อมูลทั่วไป' : tab === 'content' ? '2. เนื้อหา (PBL)' : `3. แบบทดสอบ (${currentLesson.quiz.length})`}
                        </button>
                    ))}
                </div>

                <div style={{ padding: '30px' }}>
                    {activeLessonTab === 'info' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                            <div>
                                <label className="form-label" style={{fontWeight:'bold', color:'#334155', marginBottom:'10px', display:'block'}}>รูปปกภารกิจ</label>
                                <div style={{ width: '100%', height: '200px', borderRadius: '16px', background: '#f8fafc', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                    {previewImage ? <img src={previewImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{textAlign:'center', color:'#94a3b8'}}><i className="fa-regular fa-image" style={{fontSize: '3rem'}}></i><p style={{margin:'5px 0 0', fontSize:'0.8rem'}}>รองรับ JPG, PNG</p></div>}
                                    <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)' }}>
                                        <button onClick={() => lessonFileRef.current.click()} style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(30, 41, 59, 0.8)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display:'flex', alignItems:'center', gap:'5px' }}><i className="fa-solid fa-camera"></i> {previewImage ? 'เปลี่ยนรูป' : 'เลือกรูป'}</button>
                                        <input type="file" hidden ref={lessonFileRef} onChange={handleLessonImgChange} accept="image/*" />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div><label className="form-label" style={{fontWeight:'bold', color:'#334155'}}>ชื่อภารกิจ</label><input type="text" className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentLesson.title} onChange={e => setCurrentLesson({...currentLesson, title: e.target.value})} placeholder="เช่น ปฏิบัติการกู้ระบบไฟจราจร" /></div>
                                
                                <div>
                                    <label className="form-label" style={{fontWeight:'bold', color:'#334155'}}>หมวดหมู่</label>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <select className="form-control" style={{ flex: 1, padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0' }} value={currentLesson.category} onChange={e => setCurrentLesson({...currentLesson, category: e.target.value})}>
                                            {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                        </select>
                                        <button onClick={() => setIsManagingCategory(!isManagingCategory)} style={{ width: '48px', borderRadius:'10px', border:'1px solid #e2e8f0', background:'white', cursor:'pointer', color:'#475569' }} title="ตั้งค่าหมวดหมู่">
                                            <i className={`fa-solid ${isManagingCategory ? 'fa-chevron-up' : 'fa-gear'}`}></i>
                                        </button>
                                    </div>

                                    {isManagingCategory && (
                                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px', boxShadow:'0 4px 6px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                                <input type="text" style={{flex:1, padding:'8px 12px', borderRadius:'8px', border:'1px solid #cbd5e1'}} placeholder="ชื่อหมวดหมู่ใหม่..." value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                                                <button onClick={handleAddCategory} style={{padding:'8px 15px', borderRadius:'8px', background:'#3b82f6', color:'white', border:'none', cursor:'pointer', fontWeight:'bold'}}><i className="fa-solid fa-plus"></i> เพิ่ม</button>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {categories.map((c, i) => (
                                                    <div key={i} style={{ background: 'white', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', color:'#475569', boxShadow:'0 2px 4px rgba(0,0,0,0.02)' }}>
                                                        {c}
                                                        <i className="fa-solid fa-xmark" style={{cursor:'pointer', color:'#ef4444', fontSize:'0.9rem'}} onClick={() => handleDeleteCategory(c)} title="ลบหมวดหมู่นี้"></i>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div style={{ flex: 1 }}><label className="form-label" style={{fontWeight:'bold', color:'#334155'}}>ความยาก</label><select className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentLesson.difficulty} onChange={e => setCurrentLesson({...currentLesson, difficulty: e.target.value})}><option value="Easy">ระดับฝึกหัด</option><option value="Medium">ระดับทั่วไป</option><option value="Hard">ระดับเซียน</option></select></div>
                                    
                                    {/* ✅ Added XP Input Field Here */}
                                    <div style={{ flex: 1 }}>
                                        <label className="form-label" style={{fontWeight:'bold', color:'#334155'}}>XP (คะแนน)</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} 
                                            value={currentLesson.xp} 
                                            onChange={e => setCurrentLesson({...currentLesson, xp: parseInt(e.target.value) || 0})} // แปลงเป็นตัวเลข
                                        />
                                    </div>

                                    <div style={{ flex: 1 }}><label className="form-label" style={{fontWeight:'bold', color:'#334155'}}>เวลา (นาที)</label><input type="text" className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentLesson.duration} onChange={e => setCurrentLesson({...currentLesson, duration: e.target.value})} /></div>
                                    <div style={{ flex: 1 }}><label className="form-label" style={{fontWeight:'bold', color:'#334155'}}>สถานะ</label><select className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentLesson.status} onChange={e => setCurrentLesson({...currentLesson, status: e.target.value})}><option value="published">เผยแพร่</option><option value="draft">แบบร่าง</option></select></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ... Rest of the component (Content Tab, Quiz Tab) remains the same ... */}
                    {activeLessonTab === 'content' && (
                        <div>
                            {/* Scenario Input */}
                            <div style={{ marginBottom: '25px', background:'#eff6ff', padding:'20px', borderRadius:'12px', border:'1px solid #bfdbfe' }}>
                                <label className="form-label" style={{fontWeight:'bold', color:'#2563eb', display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                                    <i className="fa-solid fa-puzzle-piece"></i> สถานการณ์ปัญหา (Scenario)
                                </label>
                                <p style={{fontSize:'0.85rem', color:'#64748b', marginBottom:'10px'}}>สร้างเรื่องราวหรือปัญหาที่น่าสนใจ เพื่อกระตุ้นให้ผู้เรียนอยากแก้ปัญหา (Problem-Based Learning)</p>
                                <textarea 
                                    rows="3" 
                                    className="form-control" 
                                    style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #bfdbfe', background:'white'}} 
                                    value={currentLesson.scenario} 
                                    onChange={e => setCurrentLesson({...currentLesson, scenario: e.target.value})}
                                    placeholder="เช่น: ระบบไฟจราจรในเมืองเกิดขัดข้อง ทำให้รถติดหนักมาก นักเรียนต้องช่วยเขียนโปรแกรม..."
                                ></textarea>
                            </div>

                            <div style={{ marginBottom: '25px' }}><label className="form-label" style={{fontWeight:'bold', color:'#334155'}}>คำอธิบายบทเรียน</label><textarea rows="5" className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentLesson.description} onChange={e => setCurrentLesson({...currentLesson, description: e.target.value})}></textarea></div>
                            <div style={{ marginBottom: '25px' }}><label className="form-label" style={{fontWeight:'bold', color:'#334155'}}>Video URL (YouTube)</label><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><i className="fa-brands fa-youtube" style={{color:'#ef4444', fontSize:'1.5rem'}}></i><input type="text" className="form-control" style={{flex: 1, padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentLesson.videoUrl} onChange={e => setCurrentLesson({...currentLesson, videoUrl: e.target.value})} placeholder="https://youtube.com/..." /></div></div>
                            <div style={{ padding:'30px', borderRadius:'16px', border:'2px dashed #cbd5e1', background:'#f8fafc', textAlign:'center' }}>
                                <label style={{ display:'block', fontWeight:'bold', marginBottom:'15px', color:'#475569' }}>📄 ไฟล์สไลด์เนื้อหา (PDF / รูปภาพ)</label>
                                {currentLesson.slide_url && !selectedSlideFile && (<div style={{ display:'inline-block', marginBottom:'15px', padding:'10px 20px', background:'#dcfce7', borderRadius:'50px', color:'#166534', fontSize:'0.9rem', fontWeight:'500' }}><i className="fa-solid fa-circle-check"></i> มีไฟล์เดิมอยู่แล้ว <a href={currentLesson.slide_url} target="_blank" rel="noreferrer" style={{marginLeft:'5px', textDecoration:'underline', color:'#15803d'}}>เปิดดู</a></div>)}
                                {previewSlideName && (<div style={{ display:'inline-block', marginBottom:'15px', padding:'10px 20px', background:'#eff6ff', borderRadius:'50px', color:'#1e40af', fontSize:'0.9rem', fontWeight:'500' }}><i className="fa-solid fa-file-arrow-up"></i> เตรียมอัปโหลด: <strong>{previewSlideName}</strong></div>)}
                                <div><button onClick={() => slideFileRef.current.click()} style={{padding:'12px 30px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', cursor:'pointer', fontWeight:'bold', color:'#475569'}}><i className="fa-solid fa-cloud-arrow-up"></i> เลือกไฟล์ใหม่</button><input type="file" hidden ref={slideFileRef} onChange={handleSlideFileChange} accept=".pdf,image/*" /></div>
                            </div>
                        </div>
                    )}

                    {activeLessonTab === 'quiz' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <span style={{ color: '#64748b' }}>แบบทดสอบท้ายบทเรียน</span>
                                <button onClick={addQuestion} style={{ background:'#eef2ff', color:'#6366f1', fontWeight:'bold', border:'none', padding:'10px 20px', borderRadius:'10px', cursor:'pointer' }}>+ เพิ่มข้อสอบ</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '450px', overflowY: 'auto', paddingRight: '5px' }}>
                                {currentLesson.quiz && currentLesson.quiz.map((q, qIndex) => (
                                    <div key={qIndex} style={{ background: '#f8fafc', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow:'0 2px 6px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                                <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize:'1.1rem' }}>ข้อที่ {qIndex + 1}</span>
                                                <button onClick={() => deleteQuestion(qIndex)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><i className="fa-solid fa-trash-can"></i></button>
                                            </div>
                                            
                                            {/* Select Type: Choice vs Parsons */}
                                            <div style={{marginBottom:'15px'}}>
                                                <label style={{marginRight:'10px', fontSize:'0.9rem', color:'#64748b'}}>รูปแบบโจทย์:</label>
                                                <select value={q.type || 'choice'} onChange={e => updateQuestion(qIndex, 'type', e.target.value)} style={{padding:'5px', borderRadius:'5px', border:'1px solid #ccc'}}>
                                                    <option value="choice">ปรนัย (Multiple Choice)</option>
                                                    <option value="parsons">เรียงลำดับ (Parsons Problem)</option>
                                                </select>
                                            </div>

                                            {/* Image Upload for Quiz */}
                                            <div style={{ marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                                                {q.image ? (
                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                        <img src={q.image} alt="Quiz" style={{ maxWidth: '100%', maxHeight: '200px', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: '8px' }} />
                                                        <button onClick={() => removeQuizImage(qIndex)} style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-xmark"></i></button>
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}><i className="fa-regular fa-image" style={{ marginRight: '8px' }}></i>ไม่มีรูปภาพประกอบ</div>
                                                )}
                                                <div style={{ marginTop: '10px' }}>
                                                    <label htmlFor={`quiz-img-${qIndex}`} style={{ cursor: 'pointer', color: '#3b82f6', fontSize: '0.9rem', fontWeight: 'bold' }}>{q.image ? 'เปลี่ยนรูปภาพ' : '+ เพิ่มรูปภาพประกอบ'}</label>
                                                    <input type="file" id={`quiz-img-${qIndex}`} hidden accept="image/*" onChange={(e) => handleQuizImageChange(e, qIndex)} />
                                                </div>
                                            </div>

                                            <input type="text" className="form-control" style={{ width: '100%', marginBottom: '20px', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0', fontWeight:'bold' }} placeholder="พิมพ์โจทย์คำถาม..." value={q.question} onChange={e => updateQuestion(qIndex, 'question', e.target.value)} />
                                            
                                            {/* Hint & Feedback */}
                                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' }}>
                                                <div>
                                                    <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#ea580c', marginBottom:'5px', display:'block'}}>💡 คำใบ้ (Hint)</label>
                                                    <input type="text" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #fed7aa', fontSize:'0.9rem'}} placeholder="คำใบ้ช่วยนักเรียน..." value={q.hint || ''} onChange={e => updateQuestion(qIndex, 'hint', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#16a34a', marginBottom:'5px', display:'block'}}>✅ คำอธิบายเฉลย (Feedback)</label>
                                                    <input type="text" style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #bbf7d0', fontSize:'0.9rem'}} placeholder="อธิบายเหตุผลเมื่อตอบผิด..." value={q.explanation || ''} onChange={e => updateQuestion(qIndex, 'explanation', e.target.value)} />
                                                </div>
                                            </div>

                                            {/* Options */}
                                            <div style={{ background: q.type === 'parsons' ? '#fff7ed' : 'transparent', padding: q.type === 'parsons' ? '15px' : '0', borderRadius:'8px', border: q.type === 'parsons' ? '1px dashed #fed7aa' : 'none' }}>
                                                {q.type === 'parsons' && <div style={{fontSize:'0.85rem', color:'#ea580c', marginBottom:'10px', fontWeight:'bold'}}><i className="fa-solid fa-arrow-down-short-wide"></i> ใส่ขั้นตอนที่ถูกต้องตามลำดับ (ระบบจะสลับให้อัตโนมัติเองตอนเล่น)</div>}
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                    {q.options.map((opt, oIndex) => (
                                                        <div 
                                                            key={oIndex} 
                                                            onClick={() => q.type !== 'parsons' && updateQuestion(qIndex, 'correct', oIndex)} 
                                                            style={{ 
                                                                display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '12px 15px', borderRadius: '12px', cursor: q.type !== 'parsons' ? 'pointer' : 'default', transition:'all 0.2s',
                                                                border: (q.type !== 'parsons' && q.correct === oIndex) ? '2px solid #22c55e' : '1px solid #e2e8f0', 
                                                                background: (q.type !== 'parsons' && q.correct === oIndex) ? '#f0fdf4' : 'white'
                                                            }}
                                                        >
                                                            {q.type !== 'parsons' && (
                                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0, border: q.correct === oIndex ? 'none' : '2px solid #cbd5e1', background: q.correct === oIndex ? '#22c55e' : 'white', color:'white' }}>
                                                                        {q.correct === oIndex && <i className="fa-solid fa-check" style={{fontSize:'0.8rem'}}></i>}
                                                                </div>
                                                            )}
                                                            <span style={{fontWeight:'bold', color:'#94a3b8', minWidth:'20px'}}>{oIndex + 1}.</span>
                                                            <input 
                                                                type="text" 
                                                                placeholder={q.type === 'parsons' ? `ขั้นตอนที่ ${oIndex + 1}` : `ตัวเลือก ${oIndex + 1}`}
                                                                style={{ border: 'none', width: '100%', outline: 'none', background:'transparent', fontSize:'0.95rem', color: q.correct === oIndex && q.type !== 'parsons' ? '#15803d' : '#334155' }} 
                                                                value={opt} 
                                                                onChange={e => updateOption(qIndex, oIndex, e.target.value)} 
                                                                onClick={(e) => e.stopPropagation()} 
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                    </div>
                                ))}
                                {currentLesson.quiz.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px', background:'#f9fafb', borderRadius:'16px' }}>ยังไม่มีข้อสอบ กดปุ่ม "+ เพิ่มข้อสอบ" เพื่อเริ่มสร้าง</div>}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: '20px 30px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '15px', background: 'white', position: 'sticky', bottom: 0, borderRadius: '0 0 24px 24px' }}>
                    <button onClick={() => setShowLessonModal(false)} disabled={isLoading} style={{ padding: '12px 25px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer', fontWeight:'500', fontSize:'1rem' }} className="hover-bg-gray">ยกเลิก</button>
                    <button onClick={handleLessonSave} disabled={isLoading} style={{ padding: '12px 30px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', fontWeight: 'bold', cursor: 'pointer', minWidth:'140px', fontSize:'1rem', boxShadow:'0 4px 10px rgba(79, 70, 229, 0.3)' }} className="hover-scale">{isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
                </div>
            </div>
        </div>
        )}
    </div>
  );
}

export default AdminLessons;