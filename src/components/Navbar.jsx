import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ เทคนิคที่ 1: Instant State (โหลดจากความจำเครื่องทันที ไม่ต้องรอ Server)
  const [stats, setStats] = useState(() => {
    try {
        const saved = localStorage.getItem('my_stats_cache');
        return saved ? JSON.parse(saved) : { totalXP: 0, streak: 0 };
    } catch (e) {
        return { totalXP: 0, streak: 0 };
    }
  });

  const isActive = (path) => location.pathname === path ? 'active' : '';

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

  const fetchUserStats = useCallback(async () => {
    try {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return;

        const user = JSON.parse(userStr);

        // 🚀 เทคนิคที่ 2: Parallel Fetching (ยิงพร้อมกัน 4 ทาง รวม shop_items ด้วย)
        const [lessonsReq, progressReq, inventoryReq, itemsReq] = await Promise.all([
            supabase.from('lessons').select('id, xp'),
            supabase.from('progress').select('created_at, lesson_id').eq('student_id', user.id).eq('passed', true),
            supabase.from('user_inventory').select('item_id').eq('user_id', user.id),
            supabase.from('shop_items').select('id, price') // ✅ ดึงราคาจาก DB โดยตรง
        ]);

        const allLessons = lessonsReq.data || [];
        const progressData = progressReq.data || [];
        const inventory = inventoryReq.data || [];
        const shopItems = itemsReq.data || [];

        // 1. คำนวณรายรับ (Total Earned)
        const lessonXpMap = {};
        allLessons.forEach(l => { lessonXpMap[String(l.id)] = l.xp });

        let totalEarned = 0;
        progressData.forEach(prog => {
            const xp = lessonXpMap[String(prog.lesson_id)];
            if (xp) totalEarned += xp;
        });

        // 2. สร้าง Map ราคาสินค้าจาก DB (Dynamic Price)
        const dynamicItemCosts = {};
        shopItems.forEach(item => {
            dynamicItemCosts[item.id] = item.price;
        });

        // 3. คำนวณรายจ่าย (Total Spent)
        let totalSpent = 0;
        inventory.forEach(inv => {
            // ถ้ามีราคาใน DB ให้ใช้ราคา DB, ถ้าไม่มี(ของเก่า) ให้เป็น 0
            const cost = dynamicItemCosts[inv.item_id] || 0; 
            totalSpent += cost;
        });

        const newStats = {
            totalXP: Math.max(0, totalEarned - totalSpent),
            streak: calculateStreak(progressData)
        };

        // ✅ เทคนิคที่ 3: Update & Cache (บันทึกค่าใหม่ลงเครื่องทันที)
        setStats(newStats);
        localStorage.setItem('my_stats_cache', JSON.stringify(newStats));
        
        // อัปเดต object ผู้ใช้หลักด้วย เพื่อให้ sync กันทุกจุด
        user.xp = newStats.totalXP;
        localStorage.setItem('currentUser', JSON.stringify(user));

    } catch (err) {
        console.error("Navbar Error:", err.message);
    }
  }, []); 

  useEffect(() => {
    // โหลดข้อมูลเบื้องหลัง (ผู้ใช้เห็นตัวเลขเก่าไปก่อนแล้ว ไม่ต้องรอ)
    fetchUserStats(); 

    const handleUpdate = () => {
        // หน่วงเวลานิดนึงเพื่อให้ DB update เสร็จก่อนดึงใหม่
        setTimeout(() => fetchUserStats(), 500); 
    };

    window.addEventListener('xp-updated', handleUpdate);
    window.addEventListener('item-purchased', handleUpdate);
    // เพิ่ม storage event listener เพื่อให้ sync เวลาเปิดหลาย tab
    window.addEventListener('storage', fetchUserStats);
    
    return () => {
      window.removeEventListener('xp-updated', handleUpdate);
      window.removeEventListener('item-purchased', handleUpdate);
      window.removeEventListener('storage', fetchUserStats);
    };
  }, [fetchUserStats]);

  const handleLogout = async () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('my_stats_cache'); // เคลียร์ Cache ตอนออก
    await supabase.auth.signOut();
    window.location.href = '/login'; 
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/dashboard" className="logo-link">
            <div className="logo-icon"><i className="fa-solid fa-star"></i></div>
            <div className="logo-text">CT<span className="text-blue">Learn</span></div>
        </Link>

        <div className="nav-center">
            <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}><i className="fa-solid fa-house"></i> <span>หน้าแรก</span></Link>
            <Link to="/lessons" className={`nav-item ${isActive('/lessons')}`}><i className="fa-solid fa-book-open"></i> <span>บทเรียน</span></Link>
            <Link to="/shop" className={`nav-item ${isActive('/shop')}`}><i className="fa-solid fa-store"></i> <span>ร้านค้า</span></Link>
            <Link to="/rank" className={`nav-item ${isActive('/rank')}`}><i className="fa-solid fa-trophy"></i> <span>อันดับ</span></Link>
            <Link to="/profile" className={`nav-item ${isActive('/profile')}`}><i className="fa-regular fa-user"></i> <span>โปรไฟล์</span></Link>
        </div>

        <div className="nav-right">
            <div className="streak-chip" title="เรียนต่อเนื่อง (วัน)">
                <i className="fa-solid fa-fire" style={{color: '#ff5722'}}></i> {stats.streak}
            </div>
            
            <div className="xp-chip" key={stats.totalXP} style={{ animation: 'popIn 0.3s ease-out' }} title="คะแนนประสบการณ์คงเหลือ">
                <i className="fa-solid fa-star"></i> {stats.totalXP} XP
            </div>
            
            <div className="divider-vertical"></div> 

            <button className="btn-logout-text" onClick={handleLogout} title="ออกจากระบบ">
                <i className="fa-solid fa-right-from-bracket"></i> ออกจากระบบ
            </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;