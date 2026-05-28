import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const roles = [
  {
    key: "student",
    label: "学员端",
    icon: "🎓",
    desc: "社交技能训练、语音练习、共情模拟",
    color: "#4f7cff",
    bg: "linear-gradient(135deg, #4f7cff 0%, #79a7ff 100%)",
  },
  {
    key: "teacher",
    label: "教师端",
    icon: "👩‍🏫",
    desc: "班级管理、学生训练记录、批注与作业建议",
    color: "#22a06b",
    bg: "linear-gradient(135deg, #22a06b 0%, #57d9a3 100%)",
  },
  {
    key: "parent",
    label: "家长端",
    icon: "👨‍👩‍👧",
    desc: "孩子训练周报、能力趋势、教师反馈",
    color: "#f77f00",
    bg: "linear-gradient(135deg, #f77f00 0%, #ffb347 100%)",
  },
];

export default function RoleSelector() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
        padding: "20px",
      }}
    >
      {/* User badge */}
      <div style={{
        position: "fixed", top: "20px", right: "20px",
        background: "#fff", border: "1px solid #e8edf5",
        borderRadius: "16px", padding: "10px 16px",
        display: "flex", alignItems: "center", gap: "12px",
        boxShadow: "0 4px 16px rgba(27,39,94,0.08)",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#1f2a44" }}>{user?.name}</div>
          <div style={{ fontSize: "12px", color: "#7584a3", marginTop: "2px" }}>{user?.username}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            border: "1px solid #ffd5d8", background: "#fff2f3",
            color: "#d14b5a", borderRadius: "10px",
            padding: "6px 12px", fontWeight: 700,
            cursor: "pointer", fontSize: "13px",
          }}
        >
          退出登录
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div style={{ fontSize: "42px", fontWeight: 900, color: "#1f2a44", letterSpacing: "-1px" }}>
          语依
        </div>
        <div style={{ color: "#7584a3", fontSize: "16px", marginTop: "8px" }}>
          欢迎回来，{user?.name}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "24px",
          maxWidth: "900px",
          width: "100%",
        }}
      >
        {roles.map((role) => {
          const isOwn = user?.role === role.key;
          return (
            <button
              key={role.key}
              onClick={() => isOwn && navigate(`/${role.key}`)}
              style={{
                background: isOwn ? "#fff" : "#f9fafc",
                border: isOwn ? `2px solid ${role.color}` : "2px solid #e8edf5",
                borderRadius: "24px",
                padding: "32px 28px",
                cursor: isOwn ? "pointer" : "not-allowed",
                textAlign: "left",
                opacity: isOwn ? 1 : 0.45,
                transition: "box-shadow 0.18s, transform 0.14s",
                boxShadow: isOwn ? "0 8px 28px rgba(27,39,94,0.09)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isOwn) return;
                e.currentTarget.style.boxShadow = `0 16px 40px rgba(27,39,94,0.14)`;
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                if (!isOwn) return;
                e.currentTarget.style.boxShadow = "0 8px 28px rgba(27,39,94,0.09)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: "56px", height: "56px", borderRadius: "16px",
                  background: role.bg, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: "28px", marginBottom: "18px",
                }}
              >
                {role.icon}
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#1f2a44", marginBottom: "8px" }}>
                {role.label}
              </div>
              <div style={{ color: "#7584a3", fontSize: "14px", lineHeight: 1.7 }}>{role.desc}</div>
              <div style={{
                marginTop: "20px", display: "inline-flex",
                alignItems: "center", gap: "6px",
                color: isOwn ? role.color : "#aab4c8",
                fontWeight: 700, fontSize: "14px",
              }}>
                {isOwn ? "进入 →" : "需要对应账号"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
