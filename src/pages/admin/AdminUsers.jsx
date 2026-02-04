import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import Swal from 'sweetalert2';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, student, admin
  const [filterGrade, setFilterGrade] = useState('all'); // ✅ เพิ่ม State สำหรับกรองระดับชั้น

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const defaultUser = {
    fullname: '',
    username: '',
    password: '', 
    grade_level: '',
    role: 'student',
    status: 'active',
    image: null
  };
  const [currentUser, setCurrentUser] = useState(defaultUser);
  
  // Image Upload
  const fileInputRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        // ✅ แก้ไขการเรียงลำดับ: เรียงตามระดับชั้น -> แล้วค่อยเรียงตาม username (รหัสนักเรียน)
        .order('grade_level', { ascending: true }) 
        .order('username', { ascending: true });
      
      if (error) throw error;
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ สร้างรายการระดับชั้นทั้งหมดจากข้อมูลที่มี (ไม่ซ้ำกัน)
  const availableGrades = [...new Set(users.map(u => u.grade_level).filter(g => g))].sort();

  // --- Handlers ---
  const handleAddClick = () => {
    setIsEditing(false);
    setCurrentUser(defaultUser);
    setPreviewImage(null);
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleEditClick = (user) => {
    setIsEditing(true);
    setCurrentUser(user);
    setPreviewImage(user.image);
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lesson_images') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('lesson_images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      let imageUrl = currentUser.image;
      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const userData = {
        fullname: currentUser.fullname,
        username: currentUser.username,
        password: currentUser.password,
        grade_level: currentUser.grade_level,
        role: currentUser.role,
        status: currentUser.status,
        image: imageUrl
      };

      if (isEditing) {
        const { error } = await supabase.from('users').update(userData).eq('id', currentUser.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('users').insert([userData]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchUsers();
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });

    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "ผู้ใช้งานนี้และประวัติการเรียนทั้งหมดจะถูกลบออกจากระบบ!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const { error: progressError } = await supabase
            .from('progress')
            .delete()
            .eq('student_id', id);

          if (progressError) console.warn("Error deleting progress:", progressError);

          const { error } = await supabase.from('users').delete().eq('id', id);
          if (error) throw error;

          fetchUsers();
          Swal.fire('ลบแล้ว!', 'ข้อมูลผู้ใช้งานถูกลบแล้ว', 'success');

        } catch (error) {
          console.error("Delete Error:", error);
          Swal.fire('ลบไม่สำเร็จ', error.message, 'error');
        }
      }
    });
  };

  // --- Filter Logic ---
  const filteredUsers = users.filter(u => {
    const matchSearch = (u.fullname || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' ? true : u.role === filterRole;
    // ✅ เพิ่ม Logic การกรองระดับชั้น
    const matchGrade = filterGrade === 'all' ? true : u.grade_level === filterGrade;
    
    return matchSearch && matchRole && matchGrade;
  });

  // Helper UI
  const getRoleBadge = (role) => {
      return role === 'admin' 
        ? <span style={{background:'#e0e7ff', color:'#4338ca', padding:'4px 10px', borderRadius:'20px', fontSize:'0.8rem', fontWeight:'bold'}}>แอดมิน</span>
        : <span style={{background:'#f3f4f6', color:'#4b5563', padding:'4px 10px', borderRadius:'20px', fontSize:'0.8rem'}}>นักเรียน</span>;
  };

  const getStatusBadge = (status) => {
      return status === 'active'
        ? <span style={{color:'#16a34a', background:'#dcfce7', padding:'4px 10px', borderRadius:'20px', fontSize:'0.8rem', fontWeight:'bold'}}>ใช้งานปกติ</span>
        : <span style={{color:'#dc2626', background:'#fee2e2', padding:'4px 10px', borderRadius:'20px', fontSize:'0.8rem', fontWeight:'bold'}}>ระงับ</span>;
  };

  return (
    <div className="card-box" style={{ background: 'white', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap:'wrap', gap:'15px' }}>
        <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem' }}>จัดการผู้ใช้งาน</h3>
            <span style={{color:'#64748b', fontSize:'0.9rem'}}>สมาชิกทั้งหมด {users.length} คน</span>
        </div>
        <button onClick={handleAddClick} className="hover-scale" style={{ padding: '12px 24px', borderRadius: '12px', background:'linear-gradient(135deg, #3b82f6, #2563eb)', color:'white', border:'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', boxShadow:'0 4px 12px rgba(37,99,235,0.2)', cursor:'pointer' }}>
            <i className="fa-solid fa-user-plus"></i> เพิ่มสมาชิก
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display:'flex', gap:'15px', marginBottom:'25px', flexWrap:'wrap', alignItems: 'center' }}>
          {/* Role Filter */}
          <div style={{ display:'flex', background:'#f1f5f9', padding:'5px', borderRadius:'12px', gap:'5px' }}>
              {['all', 'student', 'admin'].map(role => (
                  <button 
                    key={role}
                    onClick={() => setFilterRole(role)}
                    style={{
                        border:'none', background: filterRole === role ? 'white' : 'transparent',
                        padding:'8px 20px', borderRadius:'10px', cursor:'pointer',
                        color: filterRole === role ? '#3b82f6' : '#64748b',
                        fontWeight: filterRole === role ? 'bold' : 'normal',
                        boxShadow: filterRole === role ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                  >
                      {role === 'all' ? 'ทั้งหมด' : role === 'student' ? 'นักเรียน' : 'แอดมิน'}
                  </button>
              ))}
          </div>

          {/* ✅ Grade Filter (เพิ่มใหม่) */}
          <div style={{ position:'relative', minWidth: '150px' }}>
             <select 
                value={filterGrade} 
                onChange={(e) => setFilterGrade(e.target.value)}
                style={{ width:'100%', padding:'10px 15px', borderRadius:'12px', border:'1px solid #e2e8f0', outline:'none', color:'#475569', cursor:'pointer', appearance: 'none', background: 'white' }}
             >
                 <option value="all">ทุกระดับชั้น</option>
                 {availableGrades.map((grade, idx) => (
                     <option key={idx} value={grade}>{grade}</option>
                 ))}
             </select>
             <i className="fa-solid fa-chevron-down" style={{ position:'absolute', right:'15px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'0.8rem', pointerEvents:'none' }}></i>
          </div>
          
          {/* Search */}
          <div style={{ flex:1, position:'relative' }}>
              <i className="fa-solid fa-magnifying-glass" style={{position:'absolute', left:'15px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8'}}></i>
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ Username..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width:'100%', padding:'12px 12px 12px 40px', borderRadius:'12px', border:'1px solid #e2e8f0', outline:'none', fontSize:'0.95rem' }} 
              />
          </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius:'16px', border:'1px solid #f1f5f9' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.9rem', textAlign: 'left', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              <th style={{ padding: '18px 24px' }}>ผู้ใช้งาน</th>
              <th style={{ padding: '18px' }}>ระดับชั้น</th>
              <th style={{ padding: '18px' }}>Username</th>
              <th style={{ padding: '18px' }}>รหัส/เลขที่</th>
              <th style={{ padding: '18px' }}>สถานะ</th>
              <th style={{ padding: '18px', textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>ไม่พบข้อมูลผู้ใช้งาน</td></tr>}
            {filteredUsers.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background:'white' }}>
                <td style={{ padding: '15px 24px', display:'flex', alignItems:'center', gap:'15px' }}>
                    <div style={{ width:'45px', height:'45px', borderRadius:'50%', overflow:'hidden', background:'#e2e8f0', border:'2px solid #fff', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' }}>
                        {u.image && !u.image.startsWith('fa-') ? <img src={u.image} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8'}}><i className="fa-solid fa-user"></i></div>}
                    </div>
                    <div>
                        <div style={{ fontWeight:'bold', color:'#1e293b' }}>{u.fullname}</div>
                        {getRoleBadge(u.role)}
                    </div>
                </td>
                <td style={{ padding: '15px' }}>
                    {u.grade_level ? <span style={{background:'#eff6ff', color:'#3b82f6', padding:'4px 10px', borderRadius:'8px', fontSize:'0.85rem', fontWeight:'bold'}}>{u.grade_level}</span> : <span style={{color:'#cbd5e1'}}>-</span>}
                </td>
                <td style={{ padding: '15px', color:'#475569', fontWeight:'500' }}>{u.username}</td>
                <td style={{ padding: '15px' }}>
                    <span style={{background:'#f1f5f9', padding:'4px 10px', borderRadius:'6px', color:'#64748b', fontSize:'0.85rem', fontFamily:'monospace'}}>{u.password}</span>
                </td>
                <td style={{ padding: '15px' }}>{getStatusBadge(u.status)}</td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button onClick={() => handleEditClick(u)} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', width: '35px', height: '35px', borderRadius: '10px', cursor: 'pointer', transition:'all 0.2s' }} className="hover-scale"><i className="fa-solid fa-pen"></i></button>
                    <button onClick={() => handleDelete(u.id)} style={{ background: 'white', border: '1px solid #fecaca', color: '#ef4444', width: '35px', height: '35px', borderRadius: '10px', cursor: 'pointer', transition:'all 0.2s' }} className="hover-scale"><i className="fa-solid fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', width: '90%', maxWidth: '600px', borderRadius: '24px', padding: '0', position: 'relative', boxShadow:'0 20px 50px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: '#1e293b' }}>{isEditing ? '✏️ แก้ไขข้อมูล' : '✨ เพิ่มสมาชิกใหม่'}</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div style={{ padding: '30px', maxHeight:'70vh', overflowY:'auto' }}>
                
                {/* Avatar Upload */}
                <div style={{ textAlign:'center', marginBottom:'25px' }}>
                    <div style={{ width:'100px', height:'100px', borderRadius:'50%', background:'#f1f5f9', margin:'0 auto 15px', overflow:'hidden', position:'relative', border:'3px solid #fff', boxShadow:'0 4px 10px rgba(0,0,0,0.1)' }}>
                        {previewImage ? <img src={previewImage} alt="Preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <i className="fa-solid fa-user" style={{ lineHeight:'100px', fontSize:'3rem', color:'#cbd5e1' }}></i>}
                    </div>
                    <button onClick={() => fileInputRef.current.click()} style={{ padding:'8px 16px', borderRadius:'20px', border:'1px solid #cbd5e1', background:'white', color:'#475569', cursor:'pointer', fontSize:'0.85rem' }}>
                        <i className="fa-solid fa-camera"></i> เลือกรูปภาพ
                    </button>
                    <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*" />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label" style={{display:'block', marginBottom:'5px', fontWeight:'bold', color:'#334155'}}>ชื่อ - นามสกุล</label>
                        <input type="text" className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentUser.fullname} onChange={e => setCurrentUser({...currentUser, fullname: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className="form-label" style={{display:'block', marginBottom:'5px', fontWeight:'bold', color:'#334155'}}>Username (ชื่อผู้ใช้)</label>
                        <input type="text" className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentUser.username} onChange={e => setCurrentUser({...currentUser, username: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className="form-label" style={{display:'block', marginBottom:'5px', fontWeight:'bold', color:'#334155'}}>รหัสผ่าน / เลขที่</label>
                        <input type="text" className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentUser.password} onChange={e => setCurrentUser({...currentUser, password: e.target.value})} />
                    </div>

                    <div>
                        <label className="form-label" style={{display:'block', marginBottom:'5px', fontWeight:'bold', color:'#334155'}}>ระดับชั้น</label>
                        <input type="text" className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} placeholder="เช่น ม.1" value={currentUser.grade_level} onChange={e => setCurrentUser({...currentUser, grade_level: e.target.value})} />
                    </div>

                    <div>
                        <label className="form-label" style={{display:'block', marginBottom:'5px', fontWeight:'bold', color:'#334155'}}>บทบาท</label>
                        <select className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentUser.role} onChange={e => setCurrentUser({...currentUser, role: e.target.value})}>
                            <option value="student">นักเรียน</option>
                            <option value="admin">แอดมิน</option>
                        </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label" style={{display:'block', marginBottom:'5px', fontWeight:'bold', color:'#334155'}}>สถานะบัญชี</label>
                        <select className="form-control" style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} value={currentUser.status} onChange={e => setCurrentUser({...currentUser, status: e.target.value})}>
                            <option value="active">Active (ใช้งานปกติ)</option>
                            <option value="inactive">Inactive (ระงับ)</option>
                        </select>
                    </div>
                </div>

            </div>

            <div style={{ padding: '20px 30px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '15px', borderRadius: '0 0 24px 24px' }}>
                <button onClick={() => setShowModal(false)} className="btn-light" style={{ padding:'10px 20px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', color:'#64748b', cursor:'pointer' }}>ยกเลิก</button>
                <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ padding:'10px 30px', borderRadius:'10px', background:'#3b82f6', color:'white', border:'none', cursor:'pointer', fontWeight:'bold' }}>
                    {loading ? 'บันทึก...' : 'บันทึกข้อมูล'}
                </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminUsers;