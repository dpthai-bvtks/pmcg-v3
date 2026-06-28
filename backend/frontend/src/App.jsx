import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API_BASE_URL = '/api';

function Sidebar({ activeTab, setActiveTab }) {
  return (
    <div className="sidebar">
      <div className="sidebar-menu">
        <button 
          className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
          title="Trang Chủ"
        >
          <span className="icon">🏠</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
          title="Xếp Lịch"
        >
          <span className="icon">📅</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
          title="Bệnh Nhân"
        >
          <span className="icon">🏥</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'machines' ? 'active' : ''}`}
          onClick={() => setActiveTab('machines')}
          title="Máy Móc"
        >
          <span className="icon">💻</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'procedures' ? 'active' : ''}`}
          onClick={() => setActiveTab('procedures')}
          title="Thủ Thuật"
        >
          <span className="icon">💉</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
          title="Nhân Sự"
        >
          <span className="icon">👨‍⚕️</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
          title="Phòng"
        >
          <span className="icon">🚪</span>
        </button>
      </div>
    </div>
  );
}

function Dashboard({ stats, patients }) {
  return (
    <div className="tab-content active" id="tab-home">
      <div className="page-header">
        <h2>Trang Chủ - Tổng Quan</h2>
      </div>
      
      <div className="stats-grid">
        <div className="stat-mini-card">
          <div className="s-label">Tổng Bệnh Nhân</div>
          <div className="s-value">{stats.totalPatients}</div>
        </div>
        <div className="stat-mini-card">
          <div className="s-label">Đang Chờ</div>
          <div className="s-value" style={{color: '#e67e22'}}>{stats.waitingPatients}</div>
        </div>
        <div className="stat-mini-card">
          <div className="s-label">Đã Hoàn Thành</div>
          <div className="s-value" style={{color: '#27ae60'}}>{stats.completedProcedures}</div>
        </div>
        <div className="stat-mini-card">
          <div className="s-label">Nhân Sự Đang Trực</div>
          <div className="s-value" style={{color: '#3498db'}}>{stats.activeStaff}</div>
        </div>
      </div>

      <div className="dashboard-3col">
        <div className="dash-panel" style={{ gridColumn: '1 / span 3' }}>
          <h3 className="dash-panel-title">Danh sách Bệnh Nhân (Live API)</h3>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', background: '#f8fafc' }}>
                  <th style={{ padding: '10px' }}>Tên</th>
                  <th style={{ padding: '10px' }}>Năm Sinh</th>
                  <th style={{ padding: '10px' }}>Phòng</th>
                  <th style={{ padding: '10px' }}>Thủ Thuật</th>
                  <th style={{ padding: '10px' }}>Giờ Vào</th>
                  <th style={{ padding: '10px' }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan="6" style={{padding: '10px', textAlign: 'center', color: '#888'}}>Không có bệnh nhân nào</td></tr>
                ) : patients.map(p => (
                  <tr key={p._id || p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.ten}</td>
                    <td style={{ padding: '10px' }}>{p.namSinh}</td>
                    <td style={{ padding: '10px' }}>{p.phong}</td>
                    <td style={{ padding: '10px' }}>
                      {(p.thuThuat || []).map((tt, idx) => (
                        <span key={idx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', margin: '0 2px', fontSize: '12px' }}>{tt}</span>
                      ))}
                    </td>
                    <td style={{ padding: '10px' }}>{p.gioVao}</td>
                    <td style={{ padding: '10px', color: p.status === 'Hoàn thành' ? '#27ae60' : '#e67e22' }}>{p.status || 'Đang chờ'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}



function PatientsTab({ patients }) {
  return (
    <div className="tab-content active">
      <div className="page-header">
        <h2>Quản Lý Bệnh Nhân</h2>
        <button style={{ padding: '8px 16px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Thêm Bệnh Nhân Mới
        </button>
      </div>
      
      <div className="card">
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', background: '#f8fafc' }}>
                <th style={{ padding: '10px' }}>Tên Bệnh Nhân</th>
                <th style={{ padding: '10px' }}>Năm Sinh</th>
                <th style={{ padding: '10px' }}>Phòng</th>
                <th style={{ padding: '10px' }}>Thủ Thuật (Chỉ định)</th>
                <th style={{ padding: '10px' }}>Giờ Vào</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td colSpan="6" style={{padding: '10px', textAlign: 'center', color: '#888'}}>Không có bệnh nhân nào</td></tr>
              ) : patients.map(p => (
                <tr key={p._id || p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#1a5fa8' }}>{p.ten}</td>
                  <td style={{ padding: '10px' }}>{p.namSinh}</td>
                  <td style={{ padding: '10px' }}>{p.phong}</td>
                  <td style={{ padding: '10px' }}>
                    {(p.thuThuat || []).map((tt, idx) => (
                      <span key={idx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', margin: '0 2px', fontSize: '12px' }}>{tt}</span>
                    ))}
                  </td>
                  <td style={{ padding: '10px' }}>{p.gioVao}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button style={{ background: '#f1c40f', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', marginRight: '5px', cursor: 'pointer' }}>Sửa</button>
                    <button style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScheduleTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runSchedule = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/schedule`, {
        date: new Date().toISOString().split('T')[0],
        strategy: 'opt_rare',
        skipProcs: ''
      });
      setResult(res.data.data);
    } catch (err) {
      alert("Lỗi khi chạy xếp lịch: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="tab-content active">
      <div className="page-header">
        <h2>Xếp Lịch Tự Động T.I.M.E.S</h2>
        <button 
          onClick={runSchedule} 
          disabled={loading}
          style={{ padding: '10px 20px', background: loading ? '#ccc' : '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px' }}
        >
          {loading ? 'Đang chạy thuật toán...' : '▶ CHẠY XẾP LỊCH NGAY'}
        </button>
      </div>

      {result && (
        <div className="card">
          <h3 style={{color: '#27ae60'}}>✅ Xếp lịch hoàn tất!</h3>
          <p><strong>Tổng số ca xếp thành công:</strong> {result.scheduleCount}</p>
          <p style={{color: '#e74c3c'}}><strong>Tổng số ca rớt:</strong> {result.unscheduledCount}</p>
          
          <div className="table-responsive" style={{marginTop: '20px'}}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', background: '#f8fafc' }}>
                  <th style={{ padding: '10px' }}>Bệnh Nhân</th>
                  <th style={{ padding: '10px' }}>Thủ Thuật</th>
                  <th style={{ padding: '10px' }}>Phòng</th>
                  <th style={{ padding: '10px' }}>Giờ</th>
                  <th style={{ padding: '10px' }}>KTV/BS Chính</th>
                  <th style={{ padding: '10px' }}>Máy</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.slice(0, 100).map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{s.tenBN}</td>
                    <td style={{ padding: '10px', color: '#0369a1' }}>{s.thuThuat}</td>
                    <td style={{ padding: '10px' }}>{s.phong}</td>
                    <td style={{ padding: '10px', color: '#e67e22', fontWeight: 'bold' }}>{s.gioDienRa} - {s.gioKetThuc}</td>
                    <td style={{ padding: '10px' }}>{s.nvChinh}</td>
                    <td style={{ padding: '10px' }}>{s.may}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function GenericDataTab({ title, endpoint, columns }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/${endpoint}`);
        setData(res.data.data);
      } catch (err) {
        console.error("Error fetching " + endpoint, err);
      }
      setLoading(false);
    };
    fetchData();
  }, [endpoint]);

  return (
    <div className="tab-content active">
      <div className="page-header">
        <h2>{title}</h2>
        <button style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Thêm Mới
        </button>
      </div>
      
      <div className="card">
        <div className="table-responsive">
          {loading ? <p>Đang tải dữ liệu...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', background: '#f8fafc' }}>
                  {columns.map((col, idx) => (
                    <th key={idx} style={{ padding: '10px' }}>{col.label}</th>
                  ))}
                  <th style={{ padding: '10px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={columns.length + 1} style={{padding: '10px', textAlign: 'center', color: '#888'}}>Không có dữ liệu</td></tr>
                ) : data.map(item => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #eee' }}>
                    {columns.map((col, idx) => (
                      <td key={idx} style={{ padding: '10px' }}>
                        {Array.isArray(item[col.key]) ? item[col.key].join(', ') : String(item[col.key] || '')}
                      </td>
                    ))}
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button style={{ background: '#f1c40f', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', marginRight: '5px', cursor: 'pointer' }}>Sửa</button>
                      <button style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState({ totalPatients: 0, completedProcedures: 0, waitingPatients: 0, activeStaff: 0 });
  const [patients, setPatients] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);

  useEffect(() => {
    // Fetch real data from Node.js backend
    const fetchData = async () => {
      setGlobalLoading(true);
      try {
        const [statsRes, patsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/dashboard`),
          axios.get(`${API_BASE_URL}/patients`)
        ]);
        setStats(statsRes.data.data);
        setPatients(patsRes.data.data);
      } catch (err) {
        console.error("Error fetching data from backend. Is Node.js running?", err);
        // Fallback to mock if API fails
        setStats({ totalPatients: 45, completedProcedures: 12, waitingPatients: 15, activeStaff: 8 });
        setPatients([{ id: 1, ten: "Dữ liệu Mẫu (API lỗi)", namSinh: "1980", phong: "Phòng 1", thuThuat: ["Lỗi"], gioVao: "08:00", status: "Đang chờ" }]);
      }
      setGlobalLoading(false);
    };
    fetchData();
  }, [activeTab]); // Tải lại dữ liệu khi chuyển tab

  return (
    <div className="container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="main-wrapper">
        <div className="header-fixed-section">
          <div className="hospital-banner-global">
            <div className="banner-left">
              <img src="/logo.png" alt="Logo" className="banner-logo" style={{width: 60, height: 50}} onError={(e) => e.target.style.display='none'} />
              <div className="banner-text">
                <h1>T.I.M.E.S. System</h1>
                <h2>Khoa YHCT - PHCN</h2>
                <p>Live API Version</p>
              </div>
            </div>
          </div>
          <div className="global-marquee-container">
            <marquee id="thong-bao-chay">Hệ thống đang kết nối với Backend API tại {API_BASE_URL}</marquee>
          </div>
        </div>
        
        {globalLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '20px', color: '#7f8c8d', fontWeight: 'bold' }}>Đang kết nối tới máy chủ, vui lòng đợi giây lát (có thể mất 30-50s nếu máy chủ vừa ngủ gật)...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div className="tab-scroll-content">
            {activeTab === 'home' && <Dashboard stats={stats} patients={patients} />}
            {activeTab === 'schedule' && <ScheduleTab />}
            {activeTab === 'patients' && <PatientsTab patients={patients} />}
            {activeTab === 'machines' && <GenericDataTab title="Quản Lý Máy Móc" endpoint="machines" columns={[
              {label: 'Tên Máy', key: 'ten'},
              {label: 'Phòng', key: 'phong'},
              {label: 'Trạng Thái', key: 'trangThai'}
            ]} />}
            {activeTab === 'procedures' && <GenericDataTab title="Quản Lý Thủ Thuật" endpoint="procedures" columns={[
              {label: 'Tên', key: 'ten'},
              {label: 'Viết Tắt', key: 'vietTat'},
              {label: 'Hệ', key: 'he'},
              {label: 'Loại Máy', key: 'may'},
              {label: 'T.G. Thực Hiện', key: 'thoiGianThucHien'},
              {label: 'T.G. Thủ Thuật', key: 'thoiGianThuThuat'}
            ]} />}
            {activeTab === 'staff' && <GenericDataTab title="Quản Lý Nhân Sự" endpoint="staff" columns={[
              {label: 'Tên', key: 'ten'},
              {label: 'Vai Trò', key: 'vaiTro'},
              {label: 'Trạng Thái', key: 'trangThai'},
              {label: 'Kỹ Năng', key: 'kyNang'},
              {label: 'Thời Gian Làm', key: 'thoiGianLam'}
            ]} />}
            {activeTab === 'rooms' && <GenericDataTab title="Quản Lý Phòng" endpoint="rooms" columns={[
              {label: 'Tên Phòng', key: 'ten'},
              {label: 'Khoa', key: 'khoa'},
              {label: 'Trạng Thái', key: 'trangThai'}
            ]} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
