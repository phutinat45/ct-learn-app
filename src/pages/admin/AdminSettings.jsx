import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function AdminSiteSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State สำหรับข้อมูลทั้งหมด
  const [settings, setSettings] = useState({
    site_name: '',
    description: '',
    footer_text: '',
    email: '',
    phone: '',
    welcome_title: '',
    subtitle: '',
    maintenance_mode: false,
    navbar_logo: null, // URL ของรูป
    favicon: null      // URL ของรูป
  });

  // Fetch ข้อมูลเมื่อโหลดหน้า
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // สมมติว่าเก็บในตาราง site_settings และมี row เดียว (id=1)
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      // ถ้ายังไม่มีข้อมูล อาจจะ set default หรือปล่อยว่างไว้
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Update ข้อมูลลง Supabase (สมมติว่า update row ที่ id=1)
      const { error } = await supabase
        .from('site_settings')
        .update(settings)
        .eq('id', 1); 

      if (error) throw error;
      alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ฟังก์ชันจำลองการอัปโหลด (ต้องปรับให้เชื่อมกับ Storage จริงของคุณ)
  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
       // 1. Upload logic here (supabase.storage...)
       // const fileName = ...
       // await supabase.storage.from('assets').upload(fileName, file)
       // const publicUrl = ...
       
       // 2. Mock URL เพื่อแสดงผลตัวอย่าง (ใช้ URL.createObjectURL แทนชั่วคราว)
       const mockUrl = URL.createObjectURL(file);
       setSettings(prev => ({ ...prev, [fieldName]: mockUrl }));
       
       alert('อัปโหลดรูปภาพจำลองสำเร็จ (กรุณาใส่ Logic Upload จริง)');
    } catch (error) {
       console.error(error);
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
      
      {/* --- Header Section --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ 
            width: '50px', height: '50px', 
            background: '#eff6ff', borderRadius: '14px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: '#3b82f6', fontSize: '1.5rem', 
            boxShadow: '0 2px 10px rgba(59, 130, 246, 0.15)' 
          }}>
            <i className="fa-solid fa-sliders"></i>
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem' }}>ตั้งค่าข้อมูลเว็บไซต์</h3>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>จัดการข้อมูลพื้นฐานและสถานะของระบบ</span>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="hover-scale"
          style={{ 
            padding: '10px 24px', 
            borderRadius: '10px', 
            border: 'none', 
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
            color: 'white', 
            display: 'flex', alignItems: 'center', gap: '8px', 
            cursor: saving ? 'not-allowed' : 'pointer', 
            fontWeight: '500', fontSize: '0.95rem',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
          }}
        >
          {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-regular fa-floppy-disk"></i>}
          <span>บันทึกการเปลี่ยนแปลง</span>
        </button>
      </div>

      {loading ? (
         <div style={{textAlign:'center', padding:'50px', color:'#94a3b8'}}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{fontSize:'2rem'}}></i>
            <p style={{marginTop:'10px'}}>กำลังโหลดข้อมูล...</p>
         </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* --- 1. ข้อมูลทั่วไป (General) --- */}
          <section>
            <h4 style={{ color: '#334155', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <i className="fa-solid fa-globe" style={{color:'#64748b'}}></i> ข้อมูลทั่วไป
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
               {/* Site Name */}
               <div>
                 <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>ชื่อเว็บไซต์ (Site Name)</label>
                 <input 
                   type="text" name="site_name" value={settings.site_name} onChange={handleChange}
                   placeholder="เช่น CTLearn"
                   style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', transition: 'border 0.2s', background:'#f8fafc' }}
                   onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                   onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                 />
               </div>
               
               {/* Description */}
               <div>
                 <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>คำอธิบายเว็บ (Description)</label>
                 <textarea 
                   name="description" value={settings.description} onChange={handleChange}
                   rows="3"
                   placeholder="คำอธิบายสั้นๆ เกี่ยวกับเว็บไซต์..."
                   style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit', background:'#f8fafc' }}
                   onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                   onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                 />
               </div>

               {/* Footer */}
               <div>
                 <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>ข้อความส่วนท้าย (Footer Text)</label>
                 <input 
                   type="text" name="footer_text" value={settings.footer_text} onChange={handleChange}
                   placeholder="© 2026 CTLearn. All rights reserved."
                   style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', background:'#f8fafc' }}
                   onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                   onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                 />
               </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0' }} />

          {/* --- 2. โลโก้และไอคอน (Images) --- */}
          <section>
            <h4 style={{ color: '#334155', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <i className="fa-regular fa-image" style={{color:'#64748b'}}></i> โลโก้และไอคอน
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              
              {/* Navbar Logo Upload */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center', background: '#fff' }}>
                 <label style={{ display: 'block', marginBottom: '15px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>โลโก้เว็บ (Navbar)</label>
                 <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', background: '#f1f5f9', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    {settings.navbar_logo ? (
                      <img src={settings.navbar_logo} alt="Navbar Logo" style={{ maxHeight: '60px', maxWidth: '90%' }} />
                    ) : (
                      <span style={{color:'#94a3b8', fontSize:'0.8rem'}}>ไม่มีรูปภาพ</span>
                    )}
                 </div>
                 <label 
                   className="hover-scale"
                   style={{ display: 'inline-block', padding: '6px 15px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', color: '#334155', fontWeight: '500' }}
                 >
                   <i className="fa-solid fa-cloud-arrow-up"></i> อัปโหลด
                   <input type="file" hidden onChange={(e) => handleFileUpload(e, 'navbar_logo')} accept="image/*" />
                 </label>
              </div>

              {/* Favicon Upload */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center', background: '#fff' }}>
                 <label style={{ display: 'block', marginBottom: '15px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>ไอคอนเว็บ (Favicon)</label>
                 <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', background: '#f1f5f9', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    {settings.favicon ? (
                      <img src={settings.favicon} alt="Favicon" style={{ width: '32px', height: '32px' }} />
                    ) : (
                      <i className="fa-solid fa-star" style={{color:'#cbd5e1', fontSize:'1.5rem'}}></i>
                    )}
                 </div>
                 <label 
                   className="hover-scale"
                   style={{ display: 'inline-block', padding: '6px 15px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', color: '#334155', fontWeight: '500' }}
                 >
                   <i className="fa-solid fa-cloud-arrow-up"></i> อัปโหลด
                   <input type="file" hidden onChange={(e) => handleFileUpload(e, 'favicon')} accept="image/*" />
                 </label>
              </div>

            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0' }} />

          {/* --- 3. การติดต่อ (Contact) & Login Text --- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            
            {/* Contact */}
            <section>
              <h4 style={{ color: '#334155', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <i className="fa-solid fa-address-book" style={{color:'#64748b'}}></i> การติดต่อ
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                 <div>
                   <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#475569' }}>อีเมล</label>
                   <div style={{ position: 'relative' }}>
                     <i className="fa-regular fa-envelope" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                     <input type="email" name="email" value={settings.email} onChange={handleChange} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', background:'#f8fafc', outline:'none' }} />
                   </div>
                 </div>
                 <div>
                   <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#475569' }}>เบอร์โทรศัพท์</label>
                   <div style={{ position: 'relative' }}>
                     <i className="fa-solid fa-phone" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                     <input type="text" name="phone" value={settings.phone} onChange={handleChange} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', background:'#f8fafc', outline:'none' }} />
                   </div>
                 </div>
              </div>
            </section>

            {/* Login Text */}
            <section>
              <h4 style={{ color: '#334155', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <i className="fa-solid fa-right-to-bracket" style={{color:'#64748b'}}></i> หน้าเข้าสู่ระบบ
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                 <div>
                   <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#475569' }}>หัวข้อต้อนรับ</label>
                   <input type="text" name="welcome_title" value={settings.welcome_title} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background:'#f8fafc', outline:'none' }} />
                 </div>
                 <div>
                   <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#475569' }}>คำโปรย / คำเชิญชวน</label>
                   <input type="text" name="subtitle" value={settings.subtitle} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background:'#f8fafc', outline:'none' }} />
                 </div>
              </div>
            </section>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0' }} />

          {/* --- 4. System (Maintenance Mode) --- */}
          <section>
             <div style={{ 
               background: settings.maintenance_mode ? '#fef2f2' : '#f0fdf4', 
               border: `1px solid ${settings.maintenance_mode ? '#fecaca' : '#bbf7d0'}`, 
               borderRadius: '12px', 
               padding: '20px',
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               flexWrap: 'wrap',
               gap: '15px',
               transition: 'all 0.3s ease'
             }}>
                <div style={{ display:'flex', gap:'15px', alignItems:'flex-start' }}>
                   <div style={{ 
                     width:'40px', height:'40px', borderRadius:'50%', 
                     background: settings.maintenance_mode ? '#fee2e2' : '#dcfce7', 
                     color: settings.maintenance_mode ? '#ef4444' : '#16a34a',
                     display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem',
                     flexShrink: 0
                   }}>
                      <i className="fa-solid fa-screwdriver-wrench"></i>
                   </div>
                   <div>
                      <h5 style={{ margin:'0 0 5px 0', fontSize:'1rem', color: settings.maintenance_mode ? '#991b1b' : '#166534' }}>
                        โหมดปรับปรุงระบบ (Maintenance Mode)
                      </h5>
                      <p style={{ margin:0, fontSize:'0.85rem', color: settings.maintenance_mode ? '#b91c1c' : '#15803d', maxWidth:'500px' }}>
                        {settings.maintenance_mode 
                          ? 'ระบบกำลังปิดปรับปรุง นักเรียนจะไม่สามารถเข้าใช้งานเว็บไซต์ได้ชั่วคราว (แต่แอดมินยังเข้าได้)' 
                          : 'ระบบเปิดใช้งานตามปกติ นักเรียนสามารถเข้าใช้งานได้'}
                      </p>
                   </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <span style={{ fontSize:'0.9rem', fontWeight:'500', color: settings.maintenance_mode ? '#ef4444' : '#16a34a' }}>
                      {settings.maintenance_mode ? 'เปิดใช้งานอยู่' : 'ปิดใช้งาน'}
                   </span>
                   
                   {/* Toggle Switch */}
                   <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor:'pointer' }}>
                      <input 
                        type="checkbox" 
                        name="maintenance_mode" 
                        checked={settings.maintenance_mode} 
                        onChange={handleChange} 
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{ 
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                        backgroundColor: settings.maintenance_mode ? '#ef4444' : '#cbd5e1', 
                        transition: '.4s', borderRadius: '34px' 
                      }}></span>
                      <span style={{ 
                        position: 'absolute', content: '""', height: '20px', width: '20px', left: '3px', bottom: '3px', 
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                        transform: settings.maintenance_mode ? 'translateX(24px)' : 'translateX(0)' 
                      }}></span>
                   </label>
                </div>
             </div>
          </section>

        </div>
      )}
      
      {/* CSS Add-ons */}
      <style>{`
        .hover-scale:hover { transform: translateY(-2px); transition: transform 0.2s; }
      `}</style>
    </div>
  );
}

export default AdminSiteSettings;