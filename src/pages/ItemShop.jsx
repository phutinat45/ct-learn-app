import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';

function ItemShop() {
  const [xp, setXp] = useState(0); 
  const [inventory, setInventory] = useState([]);
  const [items, setItems] = useState([]); 
  const [loading, setLoading] = useState(true);

  // ข้อมูลสินค้า Default (เผื่อ DB ยังไม่พร้อม)
  const defaultItems = [
    { id: 1, name: 'กรอบทองคำ', type: 'frame', cost: 500, icon: '👑', color: '#fbbf24' },
    { id: 2, name: 'กรอบไฟเย็น', type: 'frame', cost: 300, icon: '❄️', color: '#38bdf8' },
    { id: 3, name: 'ฉายา: Hacker', type: 'title', cost: 1000, icon: '💻', color: '#22c55e' },
    { id: 4, name: 'ฉายา: Wizard', type: 'title', cost: 800, icon: '🧙‍♂️', color: '#a855f7' },
    { id: 5, name: 'ธีม: Dark Mode', type: 'theme', cost: 1500, icon: '🌙', color: '#1e293b' },
  ];

  useEffect(() => {
    fetchShopData();
  }, []);

  // ฟังก์ชันช่วยอัปเดต LocalStorage และแจ้ง Header
  const updateLocalStorageAndNotify = (newXp) => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        currentUser.xp = newXp;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        // ส่งสัญญาณบอก Header ให้รีโหลด
        window.dispatchEvent(new Event('xp-updated'));
        window.dispatchEvent(new Event('storage'));
    }
  };

  const fetchShopData = async () => {
    try {
        setLoading(true);
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return;

        const user = JSON.parse(userStr);

        // --- 1. ดึงรายการสินค้า ---
        let shopItems = defaultItems;
        try {
            const { data: dbItems, error } = await supabase.from('shop_items').select('*').eq('is_active', true).order('price', { ascending: true });
            if (!error && dbItems && dbItems.length > 0) {
                shopItems = dbItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    cost: item.price, 
                    icon: item.icon,
                    color: item.color
                }));
            }
        } catch (err) {
            console.warn("Table shop_items not found, using default items.");
        }
        setItems(shopItems);

        // --- 2. คำนวณรายรับ (Total Earned) ---
        const { data: allLessons } = await supabase.from('lessons').select('id, xp');
        const { data: myProgress } = await supabase
            .from('progress')
            .select('lesson_id')
            .eq('student_id', user.id)
            .eq('passed', true);

        let totalEarned = 0;
        if (myProgress && allLessons) {
            myProgress.forEach(prog => {
                const lesson = allLessons.find(l => l.id === prog.lesson_id);
                if (lesson) totalEarned += (lesson.xp || 0);
            });
        }

        // --- 3. คำนวณรายจ่าย (Total Spent) ---
        const { data: myInventory } = await supabase
            .from('user_inventory')
            .select('item_id')
            .eq('user_id', user.id);

        let totalSpent = 0;
        if (myInventory) {
            myInventory.forEach(inv => {
                const item = shopItems.find(i => i.id === inv.item_id);
                if (item) totalSpent += item.cost;
            });
            setInventory(myInventory);
        }

        // --- 4. สรุปยอด และ Sync ข้อมูล ---
        const finalXp = Math.max(0, totalEarned - totalSpent);
        setXp(finalXp);
        
        // ✅ แก้ไข: อัปเดตข้อมูล XP ที่ถูกต้องกลับไปที่ LocalStorage เพื่อให้ Header ตรงกัน
        updateLocalStorageAndNotify(finalXp);

    } catch (error) {
        console.error("Shop Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const buyItem = async (item) => {
      if (xp < item.cost) {
          Swal.fire({ 
              icon: 'error', 
              title: 'XP ไม่พอ!', 
              text: `ขาดอีก ${item.cost - xp} XP ไปลุยภารกิจเพิ่มก่อนนะ`, 
              confirmButtonColor: '#ef4444' 
          });
          return;
      }

      Swal.fire({
          title: `ยืนยันการแลก?`,
          text: `ใช้ ${item.cost} XP เพื่อแลก "${item.name}"`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'ยืนยันแลกเลย!'
      }).then(async (result) => {
          if (result.isConfirmed) {
              try {
                  const user = JSON.parse(localStorage.getItem('currentUser'));

                  const { error } = await supabase
                      .from('user_inventory')
                      .insert({ user_id: user.id, item_id: item.id });

                  if (error) throw error;

                  // คำนวณ XP ใหม่หลังซื้อ
                  const newXp = xp - item.cost;

                  // อัปเดต State
                  setXp(newXp);
                  setInventory(prev => [...prev, { item_id: item.id }]);
                  
                  // ✅ แก้ไข: แจ้งเตือน Header ทันทีที่ซื้อสำเร็จ
                  updateLocalStorageAndNotify(newXp);
                  window.dispatchEvent(new Event('item-purchased'));
                  
                  Swal.fire('สำเร็จ!', 'ได้รับของรางวัลแล้ว', 'success');

              } catch (err) {
                  Swal.fire('Error', 'เกิดข้อผิดพลาด: ' + err.message, 'error');
              }
          }
      });
  };

  const isOwned = (itemId) => inventory.some(i => i.item_id === itemId);

  if (loading) return <div style={{textAlign:'center', padding:'50px', color:'#64748b'}}>กำลังโหลดร้านค้า...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', fontFamily: "'Sarabun', sans-serif" }}>
        
        {/* Header Shop */}
        <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '24px', padding: '40px', color: 'white', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '2.5rem' }}><i className="fa-solid fa-store"></i> Item Shop</h1>
                <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '1.1rem' }}>แลกของรางวัลด้วย XP ที่สะสมมา</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '15px 30px', borderRadius: '20px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.3)', textAlign: 'center', minWidth:'150px' }}>
                <span style={{ fontSize: '0.9rem', display: 'block', opacity: 0.9, marginBottom:'5px' }}>XP คงเหลือ</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>✨ {xp}</span>
            </div>
        </div>

        {/* Item Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px' }}>
            {items.map(item => {
                const owned = isOwned(item.id);
                return (
                    <div key={item.id} className="hover-card" style={{ background: 'white', borderRadius: '20px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center', border: owned ? '2px solid #dcfce7' : '1px solid #f1f5f9', position: 'relative', overflow: 'hidden', transition: 'all 0.3s' }}>
                        
                        {owned && <div style={{ position: 'absolute', top: '15px', right: '15px', background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'5px' }}><i className="fa-solid fa-check"></i> มีแล้ว</div>}
                        
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '10px auto 20px', color: item.color }}>
                            {item.icon}
                        </div>
                        
                        <h3 style={{ margin: '0 0 5px', color: '#334155', fontSize:'1.2rem' }}>{item.name}</h3>
                        <div style={{ marginBottom: '20px', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight:'bold' }}>{item.type}</div>
                        
                        <button 
                            onClick={() => !owned && buyItem(item)}
                            disabled={owned}
                            style={{ 
                                width: '100%', padding: '12px', borderRadius: '12px', border: 'none', 
                                background: owned ? '#f1f5f9' : item.color, 
                                color: owned ? '#94a3b8' : 'white', 
                                fontWeight: 'bold', cursor: owned ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize:'1rem',
                                boxShadow: owned ? 'none' : `0 4px 10px ${item.color}60`,
                                opacity: owned ? 0.8 : 1,
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => !owned && (e.currentTarget.style.transform = 'scale(1.02)')}
                            onMouseOut={(e) => !owned && (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            {owned ? 'ครอบครองแล้ว' : <>{item.cost} XP</>}
                        </button>
                    </div>
                );
            })}
        </div>
    </div>
  );
}

export default ItemShop;