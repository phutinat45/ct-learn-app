import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 
import Swal from 'sweetalert2'; 

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ✅ 1. เพิ่ม State สำหรับตรวจสอบสถานะเริ่มต้น (กันหน้ากระพริบ)
  const [isChecking, setIsChecking] = useState(true);

  // State เดิม
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '', 
    fullname: '',
    confirmPassword: '',
    grade_level: 'ม.1'
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [images, setImages] = useState([
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1740&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1740&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1740&auto=format&fit=crop"
  ]);
  const [loginText, setLoginText] = useState({
    title: 'ยินดีต้อนรับสู่ CTLearn',
    subtitle: 'เข้าสู่ระบบเพื่อเริ่มการเรียนรู้และพัฒนาทักษะของคุณ'
  });

  const [isMaintenance, setIsMaintenance] = useState(false);
  
  // ตรวจสอบ Backdoor (?admin=true)
  const queryParams = new URLSearchParams(location.search);
  const isAdminBypass = queryParams.get('admin') === 'Nan29032545';

  useEffect(() => {
    const fetchPageData = async () => {
        try {
            // 1. ดึงรูปสไลด์
            const { data: slidesData } = await supabase
                .from('login_slides')
                .select('image_url')
                .order('created_at', { ascending: false });

            if (slidesData && slidesData.length > 0) {
                setImages(slidesData.map(s => s.image_url));
            }

            // 2. ดึงการตั้งค่า
            const { data: settingsData } = await supabase
                .from('site_settings')
                .select('*')
                .single();

            if (settingsData) {
                setLoginText({
                    title: settingsData.welcome_title || 'ยินดีต้อนรับสู่ CTLearn',
                    subtitle: settingsData.subtitle || 'เข้าสู่ระบบเพื่อเริ่มการเรียนรู้และพัฒนาทักษะของคุณ'
                });
                
                if (settingsData.maintenance_mode === true) {
                    setIsMaintenance(true);
                } else {
                    setIsMaintenance(false);
                }
            }

        } catch (error) {
            console.error("Error fetching login data:", error);
        } finally {
            // ✅ สำคัญ: เมื่อโหลดเสร็จแล้ว (ไม่ว่าจะสำเร็จหรือพัง) ให้เลิกสถานะ Checking
            setIsChecking(false);
        }
    };

    fetchPageData();
  }, []);

  // Slider Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', formData.username)
        .eq('password', formData.password) 
        .single();

      if (error || !data) throw new Error('ชื่อผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง');
      if (data.status === 'inactive') throw new Error('บัญชีของคุณถูกระงับ');

      // เช็ค Maintenance
      if (isMaintenance && data.role !== 'admin' && !isAdminBypass) {
         throw new Error('ระบบปิดปรับปรุงชั่วคราว (เข้าได้เฉพาะผู้ดูแลระบบ)');
      }

      localStorage.setItem('currentUser', JSON.stringify(data));

      Swal.fire({
          icon: 'success',
          title: 'ยินดีต้อนรับ',
          text: `สวัสดีคุณ ${data.fullname}`,
          timer: 1500,
          showConfirmButton: false
      }).then(() => {
          if (data.role === 'admin') {
            navigate('/teacher'); 
            window.location.reload();   
          } else {
            navigate('/dashboard');  
            window.location.reload();
          }
      });

    } catch (err) {
      console.error(err);
      setErrorMsg('❌ ' + (err.message || 'เกิดข้อผิดพลาด'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("❌ รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', formData.username)
        .single();

      if (existingUser) {
        throw new Error("ชื่อผู้ใช้งานนี้มีคนใช้แล้ว");
      }

      const newUser = {
        fullname: formData.fullname,
        username: formData.username,
        password: formData.password,
        grade_level: formData.grade_level,
        role: 'student',
        status: 'active'
      };

      const { error } = await supabase.from('users').insert([newUser]);
      if (error) throw error;

      Swal.fire('สำเร็จ', 'สมัครสมาชิกเรียบร้อย กรุณาเข้าสู่ระบบ', 'success');
      setIsRegisterMode(false);
      setFormData({ ...formData, password: '', confirmPassword: '' });

    } catch (error) {
      console.error(error);
      setErrorMsg("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ส่วนแสดงผล: ถ้ากำลังเช็คข้อมูล ให้โชว์หน้าขาวหรือ Loading ไปก่อน
  if (isChecking) {
    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
            {/* ใส่ Spinner หมุนๆ เล็กน้อยให้รู้ว่าไม่ได้ค้าง */}
            <div style={{color: '#3b82f6', fontSize: '2rem'}}>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
            </div>
        </div>
    );
  }

  // ✅ ถ้าเช็คเสร็จแล้ว และเป็น Maintenance Mode -> โชว์หน้านี้เลย (ไม่แวบหน้า Login)
  if (isMaintenance && !isAdminBypass) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#f8fafc',
        flexDirection: 'column',
        textAlign: 'center',
        fontFamily: "'Prompt', sans-serif"
      }}>
        <div style={{ fontSize: '4rem', color: '#f59e0b', marginBottom: '20px' }}>
          <i className="fa-solid fa-screwdriver-wrench"></i>
        </div>
        <h1 style={{ color: '#1e293b', marginBottom: '10px' }}>ระบบปิดปรับปรุงชั่วคราว</h1>
        <p style={{ color: '#64748b', maxWidth: '400px' }}>
          เรากำลังอัปเดตระบบเพื่อให้ดียิ่งขึ้น กรุณากลับมาใหม่ในภายหลัง
        </p>
        
      </div>
    );
  }

  // หน้า Login ปกติ
  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="slider-container">
            <div className="slider-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {images.map((img, index) => (
                    <div key={index} className="slide-item" style={{ backgroundImage: `url(${img})` }}></div>
                ))}
            </div>
        </div>
        <div className="slider-overlay"></div>
        <div className="left-content">
          <div className="brand-circle"><i className="fa-solid fa-star"></i></div>
          <h1>{loginText.title}</h1>
          <p>{loginText.subtitle}</p>
          <div className="website-link"><i className="fa-solid fa-globe"></i> www.ctlearn.com</div>
        </div>
      </div>

      <div className="login-right">
        <div className="form-container" style={{maxWidth: isRegisterMode ? '450px' : '400px'}}> 
          
          <h2>{isRegisterMode ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบ'}</h2>
          
          {errorMsg && <div style={{color:'#b91c1c', background:'#fee2e2', padding:'10px', borderRadius:'5px', marginBottom:'15px', fontSize:'0.9rem', textAlign:'center', border:'1px solid #fecaca'}}>{errorMsg}</div>}

          <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
            
            {isRegisterMode && (
                <>
                    <div className="input-line-group">
                        <i className="fa-solid fa-id-card"></i>
                        <input type="text" name="fullname" placeholder="ชื่อ-นามสกุล" required value={formData.fullname} onChange={handleChange} />
                    </div>
                    <div className="input-line-group">
                        <i className="fa-solid fa-graduation-cap"></i>
                        <select name="grade_level" value={formData.grade_level} onChange={handleChange} style={{border:'none', outline:'none', width:'100%', color:'#333', background:'transparent'}}>
                            <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                            <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                            <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                            <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                            <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                            <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
                        </select>
                    </div>
                </>
            )}

            <div className="input-line-group">
                <i className="fa-regular fa-user"></i>
                <input type="text" name="username" placeholder="ชื่อผู้ใช้งาน (Username)" required value={formData.username} onChange={handleChange} />
            </div>
            <div className="input-line-group" style={{marginBottom: isRegisterMode ? '15px' : '30px'}}>
                <i className="fa-solid fa-lock"></i>
                <input type="password" name="password" placeholder="รหัสผ่าน" required value={formData.password} onChange={handleChange} />
            </div>

            {isRegisterMode && (
                <div className="input-line-group" style={{marginBottom: '30px'}}>
                    <i className="fa-solid fa-lock"></i>
                    <input type="password" name="confirmPassword" placeholder="ยืนยันรหัสผ่านอีกครั้ง" required value={formData.confirmPassword} onChange={handleChange} />
                </div>
            )}
            
            <button type="submit" className="btn-gradient" disabled={loading}>
                {loading ? 'กำลังทำงาน...' : (isRegisterMode ? 'ยืนยันการสมัคร' : 'เข้าสู่ระบบ')}
            </button>
          </form>

          <div className="toggle-auth" style={{marginTop:'20px', textAlign:'center'}}>
            {isRegisterMode ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชีใช่ไหม?'} 
            <span 
              onClick={() => {
                  setIsRegisterMode(!isRegisterMode); 
                  setErrorMsg(''); 
              }} 
              style={{color:'#3b82f6', cursor:'pointer', fontWeight:'bold', marginLeft:'5px'}}
            >
              {isRegisterMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;