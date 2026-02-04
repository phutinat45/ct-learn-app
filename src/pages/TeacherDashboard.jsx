import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

import AdminHome from './admin/AdminHome'; 
import AdminLessons from './admin/AdminLessons';
import AdminUsers from './admin/AdminUsers';
import AdminScores from './admin/AdminScores';
import AdminSettings from './admin/AdminSettings';
import AdminLoginImages from './admin/AdminLoginImages'; 
import ManageShop from './admin/ManageShop'; // ✅ 1. นำเข้าหน้าจัดการร้านค้า

function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // --- Profile State ---
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // State ข้อมูล Admin
  const [adminInfo, setAdminInfo] = useState({
    name: 'Admin', 
    role: 'กำลังโหลด...', 
    img: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'
  });
  
  const adminFileRef = useRef(null);
  const [tempAdmin, setTempAdmin] = useState(adminInfo);

  // ดึงข้อมูล Admin จริง
  useEffect(() => {
      const fetchAdminData = async () => {
          const userStr = localStorage.getItem('currentUser');
          if(!userStr) { navigate('/login'); return; }
          
          const localUser = JSON.parse(userStr);
          
          try {
              const { data, error } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', localUser.id)
                  .single();
              
              if (error) throw error;

              if(data) {
                  let displayImage = 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff';
                  if (data.image && !data.image.startsWith('fa-')) {
                      displayImage = data.image;
                  }

                  setAdminInfo({
                      name: data.fullname || data.username || 'Admin',
                      role: data.role === 'admin' ? 'ผู้ดูแลระบบสูงสุด' : 'ผู้ดูแลระบบ',
                      img: displayImage
                  });
                  setTempAdmin({
                      name: data.fullname || data.username,
                      role: data.role === 'admin' ? 'ผู้ดูแลระบบสูงสุด' : 'ผู้ดูแลระบบ',
                      img: displayImage
                  });
              }
          } catch (err) {
              console.error("Error fetching admin data:", err);
          }
      };
      fetchAdminData();
  }, [navigate]);

  const handleAdminImgChange = (e) => { 
      if(e.target.files[0]) {
          setTempAdmin({...tempAdmin, img: URL.createObjectURL(e.target.files[0])}); 
      }
  };

  const handleAdminSave = async () => { 
      setAdminInfo(tempAdmin); 
      setShowProfileModal(false); 
  };

  const handleLogout = () => {
      localStorage.removeItem('currentUser');
      navigate('/login');
  };

  return (
    <div className="admin-container">
      
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
            <div className="logo-icon-sm"><i className="fa-solid fa-star"></i></div>
            <span>CTLearn <small>Admin</small></span>
        </div>
        
        <ul className="admin-menu">
            <li className={activeMenu === 'dashboard' ? 'active' : ''} onClick={() => setActiveMenu('dashboard')}>
                <i className="fa-solid fa-chart-pie"></i> แดชบอร์ด
            </li>
            <li className={activeMenu === 'lessons' ? 'active' : ''} onClick={() => setActiveMenu('lessons')}>
                <i className="fa-solid fa-book-open"></i> จัดการบทเรียน
            </li>
            <li className={activeMenu === 'students' ? 'active' : ''} onClick={() => setActiveMenu('students')}>
                <i className="fa-solid fa-users-gear"></i> จัดการผู้ใช้งาน
            </li>
            <li className={activeMenu === 'scores' ? 'active' : ''} onClick={() => setActiveMenu('scores')}>
                <i className="fa-solid fa-clipboard-check"></i> ตรวจสอบคะแนน
            </li>
            
            {/* ✅ 2. เพิ่มเมนูจัดการร้านค้า */}
            <li className={activeMenu === 'shop' ? 'active' : ''} onClick={() => setActiveMenu('shop')}>
                <i className="fa-solid fa-store"></i> จัดการร้านค้า
            </li>
            
            <li className="menu-divider">การตั้งค่า</li>
            
            <li className={activeMenu === 'login-images' ? 'active' : ''} onClick={() => setActiveMenu('login-images')}>
                <i className="fa-solid fa-images"></i> จัดการรูปหน้า Login
            </li>
            
            <li className={activeMenu === 'settings' ? 'active' : ''} onClick={() => setActiveMenu('settings')}>
                <i className="fa-solid fa-gear"></i> ข้อมูลและชื่อเว็บ
            </li>
        </ul>

        <div className="admin-logout" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> ออกจากระบบ
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content">
        
        <header className="admin-header">
            <div className="header-greeting">
                <h2>
                    {activeMenu === 'dashboard' && 'ภาพรวมระบบ'}
                    {activeMenu === 'lessons' && 'จัดการบทเรียน'}
                    {activeMenu === 'students' && 'จัดการผู้ใช้งาน'}
                    {activeMenu === 'scores' && 'ตรวจสอบคะแนน'}
                    {activeMenu === 'shop' && 'จัดการร้านค้า'} {/* ✅ แสดงหัวข้อร้านค้า */}
                    {activeMenu === 'login-images' && 'จัดการรูปหน้า Login'}
                    {activeMenu === 'settings' && 'ตั้งค่าข้อมูลเว็บไซต์'}
                </h2>
                <p>ระบบจัดการการเรียนรู้ CTLearn</p>
            </div>
            <div className="header-actions">
                <div className="admin-profile-box" onClick={() => { setTempAdmin(adminInfo); setShowProfileModal(true); }}>
                    <div className="admin-text">
                        <strong>{adminInfo.name}</strong>
                        <span>{adminInfo.role}</span>
                    </div>
                    <img src={adminInfo.img} alt="Admin" style={{objectFit: 'cover'}} />
                </div>
            </div>
        </header>

        {/* --- DYNAMIC CONTENT SWITCHER --- */}
        {activeMenu === 'dashboard' && <AdminHome />}
        {activeMenu === 'lessons' && <AdminLessons />}
        {activeMenu === 'students' && <AdminUsers />}
        {activeMenu === 'scores' && <AdminScores />}
        {activeMenu === 'shop' && <ManageShop />} {/* ✅ 3. แสดงหน้า ManageShop */}
        {activeMenu === 'login-images' && <AdminLoginImages />}
        {activeMenu === 'settings' && <AdminSettings />}

      </main>

      {/* Admin Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>แก้ไขข้อมูลส่วนตัว</h2><button className="btn-close" onClick={() => setShowProfileModal(false)}><i className="fa-solid fa-xmark"></i></button></div>
                <div className="modal-body">
                    <div className="avatar-edit-section center">
                        <div className="current-avatar-preview large"><img src={tempAdmin.img} alt="Preview" style={{objectFit:'cover'}} /></div>
                        <button className="btn-upload sm" onClick={() => adminFileRef.current.click()}>เปลี่ยนรูปภาพ</button>
                        <input type="file" hidden ref={adminFileRef} onChange={handleAdminImgChange} accept="image/*" />
                    </div>
                    <div className="form-group"><label className="form-label">ชื่อ - นามสกุล</label><input type="text" className="form-control" value={tempAdmin.name} onChange={e => setTempAdmin({...tempAdmin, name: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">ตำแหน่ง</label><input type="text" className="form-control" value={tempAdmin.role} onChange={e => setTempAdmin({...tempAdmin, role: e.target.value})} /></div>
                </div>
                <div className="modal-footer"><button className="btn-save" onClick={handleAdminSave} style={{width: '100%'}}>บันทึก</button></div>
            </div>
        </div>
      )}

    </div>
  );
}

export default TeacherDashboard;