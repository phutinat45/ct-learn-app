import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// 1. Import ฟอนต์ภาษาไทย
import { fontBase64 } from './SarabunFont';

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
        supabase.from('users').select('*').eq('role', 'student').order('username', { ascending: true }),
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

  // Helper: ดึง XP
  const getXPValue = (userId, lessonId, lessonXP) => {
    const key = `${userId}_${lessonId}`;
    const record = progressMap[key];
    if (record && record.passed) return lessonXP;
    return 0;
  };

  // Helper: ดึงคะแนนรายบท (8/10)
  const getRawScoreDisplay = (userId, lesson) => {
    const key = `${userId}_${lesson.id}`;
    const record = progressMap[key];
    const totalQuestions = lesson.quiz ? lesson.quiz.length : 0;
    
    if (record) {
        return { 
            score: record.score !== undefined ? record.score : 0, 
            total: totalQuestions,
            passed: record.passed
        };
    }
    return null; 
  };

  // ✅ Helper: คำนวณคะแนนรวมทุกบท (เช่น 45/60)
  const getTotalRawScore = (userId) => {
    let totalObtained = 0;
    let totalMax = 0;

    lessons.forEach(l => {
        const maxScore = l.quiz ? l.quiz.length : 0;
        totalMax += maxScore;

        const key = `${userId}_${l.id}`;
        const record = progressMap[key];
        if (record && record.score !== undefined) {
            totalObtained += record.score;
        }
    });

    return { obtained: totalObtained, max: totalMax };
  };

  const getTotalXP = (userId) => {
    return lessons.reduce((sum, lesson) => sum + getXPValue(userId, lesson.id, lesson.xp), 0);
  };

  const getPassCount = (userId) => {
    return lessons.filter(l => progressMap[`${userId}_${l.id}`]?.passed).length;
  };

  // Filter & Sort
  const getFilteredAndSortedUsers = () => {
    let result = users.filter(u => {
      const matchSearch = (u.fullname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchGrade = selectedGrade === 'all' ? true : u.grade_level === selectedGrade;
      return matchSearch && matchGrade;
    });

    if (selectedGrade !== 'all') {
      result.sort((a, b) => {
        const idA = parseInt(a.username) || 0;
        const idB = parseInt(b.username) || 0;
        if (idA !== 0 && idB !== 0) return idA - idB;
        return (a.fullname || '').localeCompare(b.fullname || '', 'th');
      });
    } 
    return result;
  };

  const filteredUsers = getFilteredAndSortedUsers();
  const gradeLevels = [...new Set(users.map(u => u.grade_level).filter(g => g))].sort();

  // --- Export Functions ---
  const prepareExportData = () => {
    return filteredUsers.map(u => {
      const totalRaw = getTotalRawScore(u.id); // ดึงคะแนนรวม
      const row = {
        'ชื่อ-นามสกุล': u.fullname,
        'ชื่อผู้ใช้': u.username,
        'ระดับชั้น': u.grade_level || '-',
      };
      lessons.forEach((l, index) => {
        const scoreInfo = getRawScoreDisplay(u.id, l);
        if (scoreInfo) {
            const xpText = scoreInfo.passed ? `${l.xp} XP` : 'ไม่ผ่าน';
            row[`บทที่ ${index + 1}`] = `${xpText} (${scoreInfo.score}/${scoreInfo.total})`;
        } else {
            row[`บทที่ ${index + 1}`] = "-";
        }
      });
      // เพิ่มคอลัมน์ Export
      row['คะแนนสอบรวม'] = `${totalRaw.obtained}/${totalRaw.max}`;
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
      XLSX.writeFile(workbook, "Student_Scores_Full.xlsx");
    } catch (err) {
      console.error("Excel Export Error:", err);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด Excel");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // 2. เพิ่มฟอนต์ภาษาไทยเข้าสู่ PDF
      doc.addFileToVFS("Sarabun-Regular.ttf", fontBase64);
      doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
      doc.setFont("Sarabun"); // เรียกใช้ฟอนต์

      const tableColumn = ["Name", "Grade", "Total Score", "Total XP", "Passed"];
      const tableRows = [];
      filteredUsers.forEach(u => {
        const totalRaw = getTotalRawScore(u.id);
        tableRows.push([
          u.fullname, 
          u.grade_level || '-',
          `${totalRaw.obtained}/${totalRaw.max}`, // เพิ่มใน PDF
          getTotalXP(u.id),
          `${getPassCount(u.id)}/${lessons.length}`
        ]);
      });
      
      doc.text("Student Score Report (รายงานคะแนนนักเรียน)", 14, 15);
      
      autoTable(doc, { 
        head: [tableColumn], 
        body: tableRows, 
        startY: 20,
        // 3. ตั้งค่าให้ตารางใช้ฟอนต์ไทย
        styles: { 
            font: "Sarabun", 
            fontStyle: "normal",
            fontSize: 10 
        },
        headStyles: {
            font: "Sarabun",
            fontStyle: "normal"
        }
      });
      doc.save("Student_Scores.pdf");
    } catch (err) { 
        console.error("PDF Error:", err);
        alert("ไม่สามารถสร้าง PDF ได้ (ตรวจสอบไฟล์ฟอนต์)"); 
    }
  };

  return (
    <div className="card-box" style={{ background: 'white', borderRadius: '20px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '45px', height: '45px', background: '#fff7ed', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontSize: '1.3rem' }}>
            <i className="fa-solid fa-clipboard-check"></i>
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem' }}>ตรวจสอบคะแนนละเอียด</h3>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>ดูคะแนนสอบจริงและ XP</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportToExcel} className="hover-scale" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #16a34a', background: '#dcfce7', color: '#166534', cursor: 'pointer', fontWeight: '500' }}><i className="fa-solid fa-file-excel"></i> Excel</button>
          <button onClick={exportToPDF} className="hover-scale" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #dc2626', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: '500' }}><i className="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <div style={{ position: 'relative', flex: 2 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}></i>
          <input type="text" placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }} />
        </div>
        <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', cursor: 'pointer', background: 'white' }}>
          <option value="all">ทุกระดับชั้น</option>
          {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#3b82f6' }}><i className="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>
      ) : (
        <div className="hide-scrollbar" style={{ width: '100%', overflowX: 'auto', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'center', height: '50px' }}>
                <th style={{ padding: '0 15px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10, textAlign: 'left', minWidth: '200px', borderRight: '1px solid #e2e8f0' }}>ชื่อ - นามสกุล</th>
                <th style={{ padding: '0 10px', minWidth: '80px' }}>ระดับชั้น</th>
                
                {/* Headers บทเรียน */}
                {lessons.map((l, i) => (
                  <th key={l.id} style={{ padding: '5px', minWidth: '90px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                      <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '0.85rem' }}>บทที่ {i + 1}</span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>({l.xp} XP)</span>
                    </div>
                  </th>
                ))}

                {/* ✅ คอลัมน์ใหม่: คะแนนรวม */}
                <th style={{ padding: '0 15px', background: '#fffbeb', color: '#b45309', minWidth: '100px' }}>คะแนนรวม</th>
                <th style={{ padding: '0 15px', background: '#eff6ff', color: '#1e40af', minWidth: '90px' }}>รวม XP</th>
                <th style={{ padding: '0 15px', background: '#f0fdf4', color: '#166534', minWidth: '80px' }}>ผ่าน</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && <tr><td colSpan={lessons.length + 5} style={{ textAlign: 'center', padding: '30px' }}>ไม่พบข้อมูล</td></tr>}
              {filteredUsers.map((u) => {
                const totalXP = getTotalXP(u.id);
                const passedCount = getPassCount(u.id);
                // ✅ คำนวณคะแนนรวม
                const totalRaw = getTotalRawScore(u.id);

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                    <td style={{ padding: '10px 15px', position: 'sticky', left: 0, background: 'white', zIndex: 10, borderRight: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                          {u.image && !u.image.startsWith('fa-') ? <img src={u.image} alt="user" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><i className="fa-solid fa-user"></i></div>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#334155' }}>{u.fullname}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{u.grade_level || '-'}</td>
                    
                    {/* คะแนนรายบท */}
                    {lessons.map(l => {
                      const scoreInfo = getRawScoreDisplay(u.id, l);
                      return (
                        <td key={l.id} style={{ padding: '8px', textAlign: 'center' }}>
                          {scoreInfo ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                {scoreInfo.passed ? 
                                    <span style={{ color: '#16a34a', fontWeight: 'bold', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>+{l.xp} XP</span> : 
                                    <span style={{ color: '#ef4444', fontWeight: 'bold', background: '#fee2e2', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>ไม่ผ่าน</span>
                                }
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight:'bold' }}>{scoreInfo.score} / {scoreInfo.total}</span>
                            </div>
                          ) : <span style={{ color: '#e2e8f0', fontSize: '1rem' }}>-</span>}
                        </td>
                      );
                    })}
                    
                    {/* ✅ แสดงคะแนนรวม (Raw Score) */}
                    <td style={{ padding: '10px', textAlign: 'center', background: '#fffbeb', fontWeight: 'bold', color: '#b45309' }}>
                        {totalRaw.obtained} / {totalRaw.max}
                    </td>

                    <td style={{ padding: '10px', textAlign: 'center', background: '#eff6ff', fontWeight: 'bold', color: '#2563eb' }}>{totalXP}</td>
                    <td style={{ padding: '10px', textAlign: 'center', background: '#f0fdf4', fontWeight: 'bold', color: '#16a34a' }}>{passedCount}/{lessons.length}</td>
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
