import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function AdminScores() {
  const [users, setUsers] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');

  useEffect(() => {
    fetchScoreData();
  }, []);

  const fetchScoreData = async () => {
    try {
      setLoading(true);
      const [usersRes, lessonsRes, progressRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'student').order('grade_level', { ascending: true }),
        supabase.from('lessons').select('*').order('id', { ascending: true }),
        supabase.from('progress').select('*')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (lessonsRes.error) throw lessonsRes.error;
      if (progressRes.error) throw progressRes.error;

      const pMap = {};
      progressRes.data.forEach(p => {
        const key = `${p.student_id}_${p.lesson_id}`;
        pMap[key] = p;
      });

      setUsers(usersRes.data);
      setLessons(lessonsRes.data);
      setProgressMap(pMap);
    } catch (error) {
      console.error("Error fetching scores:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScore = (userId, lessonId, lessonXP) => {
    const key = `${userId}_${lessonId}`;
    const record = progressMap[key];
    if (record && record.passed) return lessonXP;
    return 0;
  };

  const getTotalXP = (userId) => {
    return lessons.reduce((sum, lesson) => sum + getScore(userId, lesson.id, lesson.xp), 0);
  };

  const getPassCount = (userId) => {
    return lessons.filter(l => progressMap[`${userId}_${l.id}`]?.passed).length;
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.fullname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchGrade = selectedGrade === 'all' ? true : u.grade_level === selectedGrade;
    return matchSearch && matchGrade;
  });

  const gradeLevels = [...new Set(users.map(u => u.grade_level).filter(g => g))].sort();

  // --- Export Functions ---
  const prepareExportData = () => {
    return filteredUsers.map(u => {
      const row = {
        'ชื่อ-นามสกุล': u.fullname,
        'ชื่อผู้ใช้': u.username,
        'ระดับชั้น': u.grade_level || '-',
      };
      lessons.forEach((l, index) => {
        row[`บทที่ ${index + 1} (${l.xp} XP)`] = getScore(u.id, l.id, l.xp);
      });
      row['รวม XP'] = getTotalXP(u.id);
      row['ผ่าน (บท)'] = `${getPassCount(u.id)}/${lessons.length}`;
      return row;
    });
  };

  const exportToExcel = () => {
    try {
      const data = prepareExportData();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Scores");
      XLSX.writeFile(workbook, "Student_Scores.xlsx");
    } catch (err) {
      console.error("Excel Export Error:", err);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด Excel");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const tableColumn = ["Name", "Grade", "Total XP", "Passed"];
      const tableRows = [];

      filteredUsers.forEach(u => {
        const scoreData = [
          u.fullname, 
          u.grade_level || '-',
          getTotalXP(u.id),
          `${getPassCount(u.id)}/${lessons.length}`
        ];
        tableRows.push(scoreData);
      });

      doc.text("Student Score Report", 14, 15);
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { fontSize: 8 },
      });
      doc.save("Student_Scores.pdf");
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("ไม่สามารถสร้าง PDF ได้ในขณะนี้");
    }
  };

  return (
    // ปรับ style main container: เพิ่ม box-sizing และ overflow: hidden เพื่อไม่ให้ล้น frame
    <div className="card-box" style={{ 
      background: 'white', 
      borderRadius: '20px', 
      padding: '25px', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)', 
      width: '100%', 
      boxSizing: 'border-box', // สำคัญ: ป้องกัน padding ดันจนล้นจอ
      overflow: 'hidden'       // สำคัญ: ตัดส่วนที่เกินออก
    }}>
      
      {/* CSS ซ่อน Scrollbar */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '45px', height: '45px', background: '#fff7ed', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontSize: '1.3rem' }}>
            <i className="fa-solid fa-clipboard-check"></i>
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem' }}>ตรวจสอบคะแนน</h3>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>ติดตามพัฒนาการของนักเรียน</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={exportToExcel}
            className="hover-scale" 
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #16a34a', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}
          >
            <i className="fa-solid fa-file-excel"></i> Excel
          </button>
          
          <button 
            onClick={exportToPDF}
            className="hover-scale" 
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #dc2626', background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}
          >
            <i className="fa-solid fa-file-pdf"></i> PDF
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-user-check"></i></div>
          <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>นักเรียน</span><strong style={{ display: 'block', fontSize: '1rem', color: '#1e293b' }}>{filteredUsers.length} คน</strong></div>
        </div>
        <div style={{ flex: 1, minWidth: '180px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-book-open"></i></div>
          <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>บทเรียน</span><strong style={{ display: 'block', fontSize: '1rem', color: '#1e293b' }}>{lessons.length} บท</strong></div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <div style={{ position: 'relative', flex: 2 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}></i>
          <input
            type="text"
            placeholder="ค้นหาชื่อ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
          />
        </div>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', cursor: 'pointer', background: 'white', fontSize: '0.9rem' }}
        >
          <option value="all">ทุกระดับชั้น</option>
          {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Score Table Container */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#3b82f6' }}><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '1.8rem' }}></i><p>กำลังโหลด...</p></div>
      ) : (
        // ใช้ class hide-scrollbar ที่นี่เพื่อซ่อน Scrollbar ของตาราง
        <div className="hide-scrollbar" style={{ width: '100%', overflowX: 'auto', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'center', height: '50px' }}>
                {/* Sticky Column */}
                <th style={{ padding: '0 15px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10, textAlign: 'left', minWidth: '200px', borderRight: '1px solid #e2e8f0' }}>ชื่อ - นามสกุล</th>
                <th style={{ padding: '0 10px', minWidth: '80px' }}>ระดับชั้น</th>
                {lessons.map((l, i) => (
                  <th key={l.id} style={{ padding: '5px', minWidth: '70px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                      <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '0.85rem' }}>บทที่ {i + 1}</span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>({l.xp} XP)</span>
                    </div>
                  </th>
                ))}
                <th style={{ padding: '0 15px', background: '#eff6ff', color: '#1e40af', minWidth: '80px' }}>รวม XP</th>
                <th style={{ padding: '0 15px', background: '#f0fdf4', color: '#166534', minWidth: '90px' }}>ผ่าน</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && <tr><td colSpan={lessons.length + 4} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>ไม่พบข้อมูล</td></tr>}
              {filteredUsers.map((u) => {
                const totalXP = getTotalXP(u.id);
                const passedCount = getPassCount(u.id);
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                    <td style={{ padding: '10px 15px', position: 'sticky', left: 0, background: 'white', zIndex: 10, borderRight: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                          {u.image && !u.image.startsWith('fa-') ? <img src={u.image} alt="user" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}><i className="fa-solid fa-user"></i></div>}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{u.fullname}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {u.grade_level ? <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', color: '#64748b' }}>{u.grade_level}</span> : '-'}
                    </td>
                    {lessons.map(l => {
                      const score = getScore(u.id, l.id, l.xp);
                      return (
                        <td key={l.id} style={{ padding: '8px', textAlign: 'center' }}>
                          {score > 0 ? (
                            <span style={{ color: '#16a34a', fontWeight: 'bold', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>{score}</span>
                          ) : (
                            <span style={{ color: '#e2e8f0', fontSize: '1rem' }}>-</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: '10px', textAlign: 'center', background: '#eff6ff', fontWeight: 'bold', color: '#2563eb' }}>{totalXP}</td>
                    <td style={{ padding: '10px', textAlign: 'center', background: '#f0fdf4' }}>
                      <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{passedCount}/{lessons.length}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminScores;