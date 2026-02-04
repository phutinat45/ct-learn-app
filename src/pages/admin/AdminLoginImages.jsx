import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

function AdminLoginImages() {
  const [slides, setSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // 1. ดึงข้อมูลรูปทั้งหมด
  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('login_slides')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSlides(data);
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  // 2. ฟังก์ชันอัปโหลดรูป
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
        const fileExt = file.name.split('.').pop();
        // ตั้งชื่อไฟล์สุ่มเพื่อไม่ให้ซ้ำ
        const fileName = `slide-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // 2.1 อัปโหลดไฟล์
        const { error: uploadError } = await supabase.storage
            .from('lesson_images') // ใช้ Bucket เดิมตามที่คุณตั้งค่าไว้
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 2.2 เอา URL มา
        const { data } = supabase.storage
            .from('lesson_images')
            .getPublicUrl(fileName);
        
        const publicUrl = data.publicUrl;

        // 2.3 บันทึกลงฐานข้อมูล
        const { data: insertData, error: insertError } = await supabase
            .from('login_slides')
            .insert([{ image_url: publicUrl }])
            .select();

        if (insertError) throw insertError;

        // 2.4 อัปเดต State
        if (insertData && insertData.length > 0) {
            setSlides([insertData[0], ...slides]);
        } else {
            // Fallback กรณีไม่ได้ data กลับมา (บาง version) ให้ fetch ใหม่
            fetchSlides(); 
        }

    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
        setIsLoading(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. ฟังก์ชันลบรูป
  const handleDelete = async (id) => {
    if (window.confirm('ต้องการลบรูปภาพนี้ออกจากสไลด์?')) {
        try {
            const { error } = await supabase
                .from('login_slides')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSlides(slides.filter(s => s.id !== id));

        } catch (error) {
            alert('ลบไม่สำเร็จ: ' + error.message);
        }
    }
  };

  return (
    <div className="card-box" style={{ 
      background: 'white', 
      borderRadius: '20px', 
      padding: '30px', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)', 
      maxWidth: '100%', 
      boxSizing: 'border-box'
    }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '50px', height: '50px', background: '#fff7ed', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontSize: '1.5rem', boxShadow:'0 2px 10px rgba(249, 115, 22, 0.1)' }}>
            <i className="fa-regular fa-images"></i>
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem' }}>จัดการรูปหน้า Login</h3>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>ปรับแต่งภาพสไลด์โชว์หน้าแรก</span>
          </div>
        </div>

        <button 
            className="hover-scale"
            onClick={() => fileInputRef.current.click()} 
            disabled={isLoading}
            style={{ 
                padding: '10px 20px', 
                borderRadius: '10px', 
                border: 'none', 
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: isLoading ? 'not-allowed' : 'pointer', 
                fontWeight: '500', 
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
            }}
        >
            {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>} 
            <span>อัปโหลดรูปเพิ่ม</span>
        </button>
        <input type="file" hidden ref={fileInputRef} onChange={handleUpload} accept="image/*" />
      </div>

      {/* Grid Container */}
      <div style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '25px', 
          marginTop: '20px'
      }}>
        
        {/* Card: Add New (ปุ่มเพิ่มแบบการ์ด) */}
        <div 
            onClick={() => fileInputRef.current.click()} 
            className="add-card-hover"
            style={{
                border: '2px dashed #cbd5e1', 
                borderRadius: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '220px', 
                cursor: 'pointer', 
                color: '#64748b',
                background: '#f8fafc',
                transition: 'all 0.2s ease'
            }}
        >
            <div style={{
                width: '60px', height: '60px', borderRadius: '50%', background: 'white', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)', marginBottom: '15px'
            }}>
                <i className="fa-solid fa-plus" style={{fontSize: '1.5rem', color: '#3b82f6'}}></i>
            </div>
            <span style={{fontWeight:'500'}}>เพิ่มรูปภาพใหม่</span>
        </div>

        {/* Card: Image Slide Loop */}
        {slides.map(slide => (
            <div key={slide.id} style={{
                background: 'white', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Image Area (16:9 Aspect Ratio) */}
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#e2e8f0' }}>
                    <img 
                        src={slide.image_url} 
                        alt="Slide" 
                        style={{
                            position: 'absolute', 
                            top: 0, left: 0, 
                            width: '100%', height: '100%', 
                            objectFit: 'cover'
                        }} 
                    />
                </div>
                
                {/* Action Area */}
                <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'white' }}>
                    <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>
                        ID: {slide.id}
                    </span>
                    <button 
                        onClick={() => handleDelete(slide.id)} 
                        style={{
                            background: '#fee2e2', 
                            color: '#b91c1c', 
                            border: 'none', 
                            padding: '6px 12px', 
                            borderRadius: '8px', 
                            cursor: 'pointer', 
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                    >
                        <i className="fa-regular fa-trash-can"></i> ลบ
                    </button>
                </div>
            </div>
        ))}
      </div>
      
      {/* Empty State */}
      {slides.length === 0 && !isLoading && (
        <div style={{textAlign:'center', padding:'40px 0', color:'#94a3b8'}}>
            <i className="fa-solid fa-images" style={{fontSize:'3rem', marginBottom:'15px', color:'#cbd5e1'}}></i>
            <p>ยังไม่มีรูปภาพสไลด์ (ระบบจะใช้รูปพื้นฐาน)</p>
        </div>
      )}

      {/* Info Box */}
      <div style={{
          marginTop: '30px', 
          background: '#eff6ff', 
          border: '1px solid #dbeafe',
          padding: '15px 20px', 
          borderRadius: '12px', 
          color: '#1e40af', 
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
      }}>
        <i className="fa-solid fa-circle-info" style={{fontSize:'1.2rem'}}></i> 
        <div>
            <strong>คำแนะนำ:</strong> ควรใช้รูปภาพแนวนอนขนาดใหญ่ (เช่น 1920x1080) เพื่อความคมชัดสูงสุด
        </div>
      </div>

      {/* Style for Hover Effects */}
      <style>{`
        .add-card-hover:hover {
            border-color: #3b82f6 !important;
            background: #eff6ff !important;
            color: #3b82f6 !important;
        }
        .hover-scale {
            transition: transform 0.2s;
        }
        .hover-scale:hover {
            transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}

export default AdminLoginImages;