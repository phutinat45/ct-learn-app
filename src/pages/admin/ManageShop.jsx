import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import Swal from 'sweetalert2';

function ManageShop() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State สำหรับเช็คว่ากำลัง "แก้ไข" หรือ "เพิ่มใหม่"
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({ 
      name: '', 
      type: 'frame', 
      price: '', 
      icon: '', 
      color: '#3b82f6' 
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
        setLoading(true);
        const { data, error } = await supabase
            .from('shop_items')
            .select('*')
            .order('id', { ascending: false });
        
        if (error) throw error;
        setItems(data || []);
    } catch (error) {
        console.error("Error fetching items:", error);
    } finally {
        setLoading(false);
    }
  };

  // 1. ฟังก์ชันเตรียมข้อมูลใส่ฟอร์ม (เมื่อกดปุ่มดินสอ)
  const handleEditClick = (item) => {
      setEditingId(item.id); // บอกระบบว่ากำลังแก้ ID นี้อยู่
      setFormData({
          name: item.name,
          type: item.type,
          price: item.price,
          icon: item.icon,
          color: item.color
      });
      // เลื่อนหน้าจอขึ้นไปที่ฟอร์ม
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 2. ฟังก์ชันยกเลิกการแก้ไข
  const handleCancelEdit = () => {
      setEditingId(null);
      setFormData({ name: '', type: 'frame', price: '', icon: '', color: '#3b82f6' });
  };

  // 3. ฟังก์ชันบันทึก (ใช้ได้ทั้ง เพิ่มใหม่ และ อัปเดต)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.icon) {
        Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
        return;
    }

    try {
        if (editingId) {
            // --- กรณีแก้ไข (Update) ---
            const { error } = await supabase
                .from('shop_items')
                .update({
                    name: formData.name,
                    type: formData.type,
                    price: parseInt(formData.price),
                    icon: formData.icon,
                    color: formData.color
                })
                .eq('id', editingId); // อัปเดตเฉพาะ ID ที่เลือก

            if (error) throw error;
            Swal.fire({ icon: 'success', title: 'แก้ไขข้อมูลสำเร็จ', timer: 1500, showConfirmButton: false });

        } else {
            // --- กรณีเพิ่มใหม่ (Insert) ---
            const { error } = await supabase
                .from('shop_items')
                .insert([{
                    name: formData.name,
                    type: formData.type,
                    price: parseInt(formData.price),
                    icon: formData.icon,
                    color: formData.color,
                    is_active: true
                }]);

            if (error) throw error;
            Swal.fire({ icon: 'success', title: 'เพิ่มสินค้าสำเร็จ', timer: 1500, showConfirmButton: false });
        }

        // รีเซ็ตค่าหลังจากทำรายการเสร็จ
        handleCancelEdit(); 
        fetchItems();

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "สินค้าจะหายไปจากหน้าร้านค้าทันที",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ลบเลย'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await supabase.from('shop_items').delete().eq('id', id);
            fetchItems();
        }
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: "'Sarabun', sans-serif", maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '30px' }}>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.8rem' }}>จัดการร้านค้า</h2>
          <p style={{ color: '#64748b' }}>เพิ่ม ลบ หรือแก้ไขสินค้าในร้านค้า</p>
      </div>
      
      {/* --- ส่วนฟอร์ม (ใช้ร่วมกันทั้งเพิ่มและแก้) --- */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '40px', border: editingId ? '2px solid #f59e0b' : '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 20px', color: editingId ? '#f59e0b' : '#3b82f6', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{background: editingId ? '#fef3c7' : '#eff6ff', padding:'8px', borderRadius:'10px'}}>
                <i className={editingId ? "fa-solid fa-pen-to-square" : "fa-solid fa-plus"}></i>
            </div> 
            {editingId ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'end' }}>
            
            <div>
                <label className="form-label">ชื่อสินค้า</label>
                <input type="text" className="form-input" placeholder="เช่น กรอบเทพเจ้า" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div>
                <label className="form-label">ประเภท</label>
                <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="frame">กรอบ (Frame)</option>
                    <option value="title">ฉายา (Title)</option>
                    <option value="theme">ธีม (Theme)</option>
                </select>
            </div>

            <div>
                <label className="form-label">ราคา (XP)</label>
                <input type="number" className="form-input" placeholder="เช่น 500" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>

            <div>
                <label className="form-label">ไอคอน (Emoji/FontAwesome)</label>
                <div style={{display:'flex', gap:'10px'}}>
                    <input 
                        type="text" 
                        className="form-input"
                        placeholder="เช่น 👑 หรือ fa-solid fa-crown" 
                        value={formData.icon}
                        onChange={e => setFormData({...formData, icon: e.target.value})} 
                        style={{ flex: 1 }}
                    />
                    <div style={{width:'45px', height:'45px', borderRadius:'10px', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', border:'1px solid #e2e8f0'}}>
                        {formData.icon.startsWith('fa-') ? <i className={formData.icon}></i> : formData.icon}
                    </div>
                </div>
            </div>

            <div>
                <label className="form-label">สีธีม</label>
                <div style={{display:'flex', alignItems:'center', gap:'10px', border:'1px solid #cbd5e1', padding:'5px 10px', borderRadius:'12px', height:'45px'}}>
                    <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ border: 'none', background: 'none', width: '40px', height: '30px', cursor: 'pointer' }} />
                    <span style={{color:'#64748b', fontSize:'0.9rem'}}>{formData.color}</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                {editingId && (
                    <button type="button" onClick={handleCancelEdit} style={{ flex: 1, height: '45px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>
                        ยกเลิก
                    </button>
                )}
                <button type="submit" className="hover-scale" style={{ flex: 1, height: '45px', borderRadius: '12px', border: 'none', background: editingId ? '#f59e0b' : '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: editingId ? '0 4px 15px rgba(245, 158, 11, 0.4)' : '0 4px 15px rgba(59, 130, 246, 0.4)' }}>
                    <i className={editingId ? "fa-solid fa-save" : "fa-solid fa-plus-circle"}></i> {editingId ? 'บันทึกแก้ไข' : 'เพิ่มสินค้า'}
                </button>
            </div>

        </form>
      </div>

      {/* --- รายการสินค้า --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' }}>
        {items.map(item => (
          <div key={item.id} className="hover-lift" style={{ background: 'white', borderRadius: '20px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center', position: 'relative', border: '1px solid #f1f5f9' }}>
            
            <div style={{ position: 'absolute', top: '15px', right: '15px', display:'flex', gap:'5px' }}>
                {/* ปุ่มแก้ไข (สีส้ม) */}
                <button onClick={() => handleEditClick(item)} style={{ background: '#fef3c7', color: '#d97706', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title="แก้ไข">
                    <i className="fa-solid fa-pen"></i>
                </button>
                {/* ปุ่มลบ (สีแดง) */}
                <button onClick={() => handleDelete(item.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title="ลบ">
                    <i className="fa-solid fa-trash-can"></i>
                </button>
            </div>

            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px auto 15px', color: item.color }}>
                {item.icon.startsWith('fa-') ? <i className={item.icon} style={{fontSize: '2.5rem'}}></i> : <span style={{fontSize: '2.5rem'}}>{item.icon}</span>}
            </div>
            
            <h4 style={{ margin: '0 0 5px', color: '#334155' }}>{item.name}</h4>
            <div style={{ marginBottom: '15px', color: '#94a3b8', fontSize: '0.75rem', fontWeight:'bold', textTransform:'uppercase' }}>{item.type}</div>
            <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', color: '#334155', fontWeight:'bold', fontSize:'0.9rem' }}>ราคา: {item.price} XP</div>
          </div>
        ))}
      </div>

      <style>{`
        .form-label { display: block; margin-bottom: 8px; font-weight: bold; color: #475569; font-size: 0.9rem; }
        .form-input { width: 100%; padding: 10px; border-radius: 12px; border: 1px solid #cbd5e1; outline: none; height: 45px; box-sizing: border-box; }
        .hover-lift { transition: transform 0.2s; }
        .hover-lift:hover { transform: translateY(-5px); }
      `}</style>
    </div>
  );
}

export default ManageShop;