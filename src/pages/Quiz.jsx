import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import confetti from 'canvas-confetti';
import Swal from 'sweetalert2';
// ✅ Import ระบบลากวาง
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const AUDIO_SRC = {
  bgm: "/sounds/bgm.mp3",          
  countdown: "/sounds/countdown.mp3", 
  correct: "/sounds/correct.mp3",     
  wrong: "/sounds/wrong.mp3",
  success: "/sounds/success.mp3", 
  fail: "/sounds/fail.mp3"        
};

// ฟังก์ชันสำหรับสลับตำแหน่ง Array (ใช้ตอนลากวาง)
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- State ข้อมูล ---
  const [lesson, setLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- State เกม ---
  const [gameState, setGameState] = useState('ready'); 
  const [startCountdown, setStartCountdown] = useState(3);
  const [isMuted, setIsMuted] = useState(false);

  // --- State ข้อสอบ ---
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isPassed, setIsPassed] = useState(false);

  // ✅ State สำหรับข้อสอบเรียงลำดับ (Parsons)
  const [parsonsItems, setParsonsItems] = useState([]); 

  // --- Audio Refs ---
  const bgmRef = useRef(new Audio(AUDIO_SRC.bgm));
  const endGameRef = useRef(null);

  // Helper Playing Sound
  const playSound = (type) => {
    if (isMuted) return;
    const audio = new Audio(AUDIO_SRC[type]);
    audio.volume = 0.6;
    audio.play().catch(e => console.warn("SFX Error:", e));
  };

  const stopAllSounds = () => {
    if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
    }
    if (endGameRef.current) {
        endGameRef.current.pause();
        endGameRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Init & Fetch Data
  useEffect(() => {
    bgmRef.current.src = AUDIO_SRC.bgm;
    bgmRef.current.loop = true;  
    bgmRef.current.volume = 0.3;

    const fetchQuizData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setLesson(data);
        
        const durationStr = data.duration || "15";
        const minutes = parseInt(String(durationStr).replace(/\D/g, '')) || 15; 
        setTimeLeft(minutes * 60);

        if (data.quiz && Array.isArray(data.quiz)) {
           const formatted = data.quiz.map(q => ({
               id: q.id || Math.random(), // ใช้ ID เพื่อ key ใน dnd
               type: q.type || 'multiple_choice', // ✅ ดึงประเภทโจทย์
               question: q.question || q.questionText || "คำถาม",
               image: q.image || null,
               // ถ้าเป็น parsons ให้ options คือคำตอบที่ถูกเรียงไว้แล้ว (เดี๋ยวเราไปสุ่มทีหลัง)
               options: q.options || (q.answerOptions ? q.answerOptions.map(o => o.answerText) : []),
               correctAnswer: q.correct !== undefined ? q.correct : (q.answerOptions ? q.answerOptions.findIndex(o => o.isCorrect) : 0),
               hint: q.hint || '',             
               explanation: q.explanation || '' 
           }));
           setQuestions(formatted);
        }
      } catch (error) { console.error('Error:', error); } 
      finally { setLoading(false); }
    };
    fetchQuizData();

    return () => {
        stopAllSounds();
    };
  }, [id]);

  // ✅ Effect: เมื่อเปลี่ยนข้อ หรือเริ่มเกม ให้เตรียมข้อมูล Parsons (สุ่มลำดับ)
  useEffect(() => {
    if (questions.length > 0 && gameState === 'playing') {
        const currentQ = questions[currentQuestion];
        if (currentQ.type === 'parsons' || currentQ.type === 'sorting') {
            // สุ่มลำดับตัวเลือกสำหรับให้ผู้เล่นเรียง
            const shuffled = [...currentQ.options].sort(() => Math.random() - 0.5);
            setParsonsItems(shuffled);
        }
    }
  }, [currentQuestion, gameState, questions]);

  const checkScenarioAndStart = () => {
      if (lesson?.scenario && lesson.scenario.trim() !== "") {
          Swal.fire({
              title: '📜 ภารกิจของคุณ',
              html: `<div style="text-align: left; color: #555; line-height: 1.6; font-size: 1.1rem;">${lesson.scenario}</div>`,
              icon: 'info',
              confirmButtonText: 'รับทราบ! เริ่มภารกิจ 🚀',
              confirmButtonColor: '#3b82f6',
              backdrop: `rgba(0,0,123,0.4)`,
              width: 600,
              padding: '2em',
              background: '#fff'
          }).then((result) => {
              if (result.isConfirmed) handleStartGame();
          });
      } else {
          handleStartGame();
      }
  };

  const handleStartGame = () => {
    if (!isMuted) {
        bgmRef.current.play().catch(e => console.log("BGM Blocked:", e));
        playSound('countdown');
    }
    setGameState('countdown');
  };

  useEffect(() => {
    if (gameState === 'countdown') {
        const timer = setInterval(() => {
            setStartCountdown((prev) => {
                if (prev === 1) {
                    clearInterval(timer);
                    setGameState('playing'); 
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing' || timeLeft === null) return;
    if (timeLeft === 0) { finishQuiz(score); return; }
    const timer = setInterval(() => {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft, score]);

  const showHint = () => {
      const currentQ = questions[currentQuestion];
      Swal.fire({
          title: '💡 คำใบ้',
          text: currentQ.hint ? currentQ.hint : "ข้อนี้ไม่มีคำใบ้ พยายามเข้านะ!",
          icon: 'question',
          confirmButtonText: 'โอเค',
          confirmButtonColor: '#f59e0b'
      });
  };

  // ✅ ฟังก์ชันตรวจคำตอบ (แก้ไขให้ไม่แสดง Pop-up ตอนผิด)
  const submitAnswer = (userAnswerData) => {
    const currentQ = questions[currentQuestion];
    let isCorrect = false;

    // ตรวจแบบ Parsons
    if (currentQ.type === 'parsons' || currentQ.type === 'sorting') {
        const correctString = JSON.stringify(currentQ.options);
        const userString = JSON.stringify(userAnswerData); 
        isCorrect = correctString === userString;
    } 
    // ตรวจแบบ Choice
    else {
        isCorrect = userAnswerData === currentQ.correctAnswer;
    }

    if (isCorrect) {
        playSound('correct');
        // แสดงเฉพาะตอนถูก
        Swal.fire({ 
            icon: 'success', 
            title: 'ถูกต้อง! 🎉', 
            timer: 800, 
            showConfirmButton: false, 
            backdrop: `rgba(0,0,0,0.1)`, 
            width: 300 
        });
    } else {
        playSound('wrong'); // เล่นเสียงผิด แต่ไม่แสดง Pop-up
        // ❌ เอา Swal.fire ตอนผิดออก
    }

    if (isCorrect) setScore(prev => prev + 1);

    // ไปข้อต่อไป (ถ้าผิดก็ไปต่อเลย เร็วกว่าตอนถูกนิดหน่อย)
    setTimeout(() => {
      const nextQ = currentQuestion + 1;
      if (nextQ < questions.length) {
        setCurrentQuestion(nextQ);
      } else {
        finishQuiz(isCorrect ? score + 1 : score);
      }
    }, isCorrect ? 800 : 500); // ถ้าผิด รอแค่ 0.5 วิ แล้วไปต่อเลย
  };

  // ✅ ฟังก์ชันจัดการการลากวาง (Drag End)
  const onDragEnd = (result) => {
      if (!result.destination) return;
      const items = reorder(parsonsItems, result.source.index, result.destination.index);
      setParsonsItems(items);
  };

  // ✅ ฟังก์ชันจบเกม (เก็บ High Score)
  const finishQuiz = async (finalScore) => {
    setGameState('finished');
    if (bgmRef.current) bgmRef.current.pause();

    const passed = finalScore >= (questions.length / 2);
    setIsPassed(passed);

    if (!isMuted) {
        const endAudio = new Audio(passed ? AUDIO_SRC.success : AUDIO_SRC.fail);
        endAudio.volume = 0.6;
        endAudio.play().catch(e => console.warn("End sound error:", e));
        endGameRef.current = endAudio;
    }

    if (passed) fireConfetti();

    try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            const { data: existing } = await supabase
                .from('progress')
                .select('*')
                .eq('student_id', user.id)
                .eq('lesson_id', id)
                .single();
            
            if (existing) {
                // อัปเดตเฉพาะเมื่อคะแนนเยอะกว่าเดิม
                if (finalScore > existing.score) {
                    await supabase.from('progress').update({ 
                        passed: passed || existing.passed, 
                        score: finalScore 
                    }).eq('id', existing.id);
                    window.dispatchEvent(new Event('xp-updated'));
                }
            } else {
                await supabase.from('progress').insert({ 
                    student_id: user.id, 
                    lesson_id: id, 
                    passed: passed, 
                    score: finalScore 
                });
                window.dispatchEvent(new Event('xp-updated'));
            }
        }
    } catch (err) { console.error(err); }
  };

  const handleRetry = () => { stopAllSounds(); window.location.reload(); };
  const handleBack = () => { stopAllSounds(); navigate('/lessons'); };
  
  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#22c55e', '#eab308'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#22c55e', '#eab308'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  const toggleMute = () => {
      setIsMuted(prev => {
          const newState = !prev;
          if (newState) { stopAllSounds(); } else { if((gameState === 'playing' || gameState === 'countdown') && bgmRef.current) bgmRef.current.play().catch(() => {}); }
          return newState;
      });
  };

  if (loading) return <div style={{textAlign:'center', marginTop:'100px'}}>กำลังโหลดข้อสอบ...</div>;
  if (!questions.length) return <div style={{textAlign:'center', marginTop:'100px'}}>ไม่พบข้อสอบ</div>;

  if (gameState === 'ready') {
      return (
        <div style={{ textAlign: 'center', padding: '100px 20px', minHeight: '100vh', background: '#f8fafc' }}>
            <h1 style={{ fontSize: '3rem', color: '#1e293b', marginBottom: '10px' }}>{lesson?.title}</h1>
            <p style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '40px' }}>แบบทดสอบท้ายบทเรียน</p>
            <div style={{ fontSize: '6rem', marginBottom: '40px', animation: 'float 3s infinite ease-in-out' }}>🎧</div>
            <button onClick={checkScenarioAndStart} className="hover-scale" style={{ padding: '18px 60px', fontSize: '1.5rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)' }}>
                เริ่มทำภารกิจ (เปิดเสียง) 🚀
            </button>
        </div>
      );
  }

  if (gameState === 'countdown') {
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(59, 130, 246, 0.95)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '15rem', color: 'white', fontWeight: 'bold', margin: 0, animation: 'pulse 1s infinite' }}>{startCountdown}</h1>
            <p style={{ color: 'white', fontSize: '2rem', marginTop: '20px' }}>เตรียมตัว...</p>
        </div>
      );
  }

  if (gameState === 'finished') {
      const percentage = Math.round((score / questions.length) * 100);
      const isPerfect = percentage === 100;
      return (
        <div style={{ padding: '80px 20px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: "'Sarabun', sans-serif" }}>
            <div style={{ background: 'white', maxWidth: '500px', width: '100%', borderRadius: '32px', padding: '50px 30px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <div style={{ width: '120px', height: '120px', background: isPassed ? (isPerfect ? '#fef08a' : '#dcfce7') : '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: isPassed ? 'bounce 2s infinite' : 'shake 0.5s', boxShadow: isPassed ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none' }}>
                    <i className={isPassed ? "fa-solid fa-trophy" : "fa-solid fa-heart-crack"} style={{ fontSize: '4rem', color: isPassed ? (isPerfect ? '#ca8a04' : '#16a34a') : '#dc2626' }}></i>
                </div>
                <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '5px', fontWeight:'800' }}>
                    {isPassed ? 'Mission Complete! 🎉' : 'Mission Failed 🛡️'}
                </h2>
                <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '30px' }}>
                    {isPassed ? `สุดยอดมาก! คุณได้รับ +${lesson?.xp || 100} XP` : 'พลังยังไม่พอ! ต้องการยาเพิ่มพลังไหม? ลองใหม่อีกครั้งนะ'}
                </p>
                <div style={{ position:'relative', height:'25px', background:'#f1f5f9', borderRadius:'15px', overflow:'hidden', marginBottom:'15px', boxShadow:'inner 0 2px 5px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: isPassed ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #ef4444, #f87171)', transition: 'width 1.5s ease', borderRadius: '15px' }}></div>
                    <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:'0.8rem', fontWeight:'bold', color: percentage > 55 ? 'white' : '#64748b' }}>ความสำเร็จ {percentage}%</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '30px' }}>เกณฑ์ผ่านภารกิจ: 50%</div>
                <div style={{ fontSize: '3rem', fontWeight: '800', color: isPassed ? '#16a34a' : '#ef4444', marginBottom: '40px' }}>
                    {score} <span style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight:'normal' }}>/ {questions.length}</span>
                </div>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexDirection: 'column' }}>
                    {!isPassed && (
                        <button onClick={handleRetry} className="hover-scale" style={{ padding: '15px', borderRadius: '16px', background: '#ef4444', color: 'white', border: 'none', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}>
                            <i className="fa-solid fa-rotate-right" style={{marginRight:'8px'}}></i> ลองใหม่อีกครั้ง
                        </button>
                    )}
                    <button onClick={handleBack} style={{ padding: '15px', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>กลับฐานทัพ</button>
                </div>
            </div>
            <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } } @keyframes shake { 0% { transform: translateX(0); } 25% { transform: translateX(-5px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-5px); } 100% { transform: translateX(0); } }`}</style>
        </div>
      );
  }

  // --- Playing Screen ---
  const currentQ = questions[currentQuestion];
  const isParsons = currentQ.type === 'parsons' || currentQ.type === 'sorting';

  return (
    <div style={{ padding: '80px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: "'Sarabun', sans-serif" }}>
      {/* Timer & Mute Buttons */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', background: timeLeft <= 60 ? '#fee2e2' : 'white', padding: '10px 20px', borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', border: timeLeft <= 60 ? '2px solid #ef4444' : '2px solid #3b82f6', zIndex: 100 }}>
          <i className="fa-solid fa-clock" style={{color: timeLeft <= 60 ? '#ef4444' : '#3b82f6'}}></i>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft <= 60 ? '#b91c1c' : '#1e293b', fontFamily: 'monospace' }}>{formatTime(timeLeft)}</span>
      </div>
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
          <button onClick={toggleMute} style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', background: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', color: isMuted ? '#94a3b8' : '#3b82f6', fontSize: '1.2rem' }}><i className={isMuted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high"}></i></button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
         <div><span style={{ textTransform: 'uppercase', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>Lesson {id}</span><h2 style={{ margin: '5px 0 0', color: '#1e293b' }}>แบบทดสอบ</h2></div>
         <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
             <button onClick={showHint} className="hover-scale" style={{background:'#fff7ed', border:'1px solid #fed7aa', color:'#ea580c', padding:'5px 15px', borderRadius:'20px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px', fontSize:'0.9rem'}}><i className="fa-regular fa-lightbulb"></i> คำใบ้</button>
             <div style={{ padding: '5px 15px', background: '#eff6ff', borderRadius: '20px', color: '#3b82f6', fontWeight: 'bold' }}>ข้อ {currentQuestion + 1} / {questions.length}</div>
         </div>
      </div>
      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '40px', overflow: 'hidden' }}><div style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.5s ease' }}></div></div>

      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {currentQ.image && (
              <div style={{ marginBottom: '25px', textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <img src={currentQ.image} alt="Question" style={{ maxWidth: '60%', maxHeight: '200px', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }} />
              </div>
          )}

          <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '30px', lineHeight: '1.6' }}>
             {currentQ.question}
             {isParsons && <div style={{fontSize:'0.9rem', color:'#64748b', marginTop:'10px'}}><i className="fa-solid fa-arrow-down-up-across-line"></i> ลากกล่องข้อความเพื่อเรียงลำดับให้ถูกต้อง</div>}
          </h2>
          
          {/* ✅ ส่วนแสดงผล: ถ้าเป็น Parsons แสดงแบบลากวาง ถ้าไม่ใช่แสดงปุ่มกด */}
          {isParsons ? (
             <div className="parsons-area">
                 <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="parsons-list">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {parsonsItems.map((text, index) => (
                            <Draggable key={`${text}-${index}`} draggableId={`${text}-${index}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    userSelect: 'none', padding: '16px', background: snapshot.isDragging ? '#e0f2fe' : 'white',
                                    border: '1px solid #cbd5e1', borderRadius: '12px',
                                    boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.05)',
                                    color: '#334155', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'grab', fontSize: '1.1rem',
                                    ...provided.draggableProps.style,
                                  }}
                                >
                                  <i className="fa-solid fa-grip-vertical" style={{color:'#94a3b8'}}></i>
                                  {text}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                  <button 
                    onClick={() => submitAnswer(parsonsItems)} 
                    style={{ marginTop: '30px', width: '100%', padding: '15px', borderRadius: '15px', background: '#3b82f6', color: 'white', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}
                  >
                    ส่งคำตอบ <i className="fa-solid fa-paper-plane"></i>
                  </button>
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {currentQ.options.map((opt, index) => (
                  <button 
                      key={index} onClick={() => submitAnswer(index)} className="hover-scale" 
                      style={{ padding: '18px 25px', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', color: '#475569', fontSize: '1.1rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500' }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                  >
                      {opt}
                  </button>
              ))}
            </div>
          )}
      </div>
      <style>{`
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
      `}</style>
    </div>
  );
}

export default Quiz;
