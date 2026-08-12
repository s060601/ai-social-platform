import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { API_BASE } from "./config";

const ROLE_PATH = { student: "/student", teacher: "/teacher", parent: "/parent" };

const demoAccounts = [
  { label: "学员端", username: "student001", password: "pass123", color: "#4f7cff", bg: "linear-gradient(135deg,#4f7cff 0%,#79a7ff 100%)" },
  { label: "教师端", username: "teacher001", password: "pass123", color: "#22a06b", bg: "linear-gradient(135deg,#22a06b 0%,#57d9a3 100%)" },
  { label: "家长端", username: "parent001",  password: "pass123", color: "#f77f00", bg: "linear-gradient(135deg,#f77f00 0%,#ffb347 100%)" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [captcha, setCaptcha] = useState({ id: "", emojis: [], target: null });
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const from = location.state?.from || null;

  async function refreshCaptcha() {
    setCaptchaAnswer("");
    setError("");
    setCaptcha({ id: "", emojis: [], target: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/captcha?refresh=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("获取验证码失败");
      const data = await res.json();
      setCaptcha({ id: data.id, emojis: data.emojis, target: data.target });
    } catch {
      setCaptcha({ id: "", emojis: [], target: null });
    }
  }

  useEffect(() => { refreshCaptcha(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }
    if (!captcha.id || captchaAnswer === "") {
      setError("请完成人机验证");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await login(username.trim(), password, { captchaId: captcha.id, captchaAnswer });
      const dest = from || ROLE_PATH[data.role] || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account) {
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "44px", fontWeight: 900, color: "#1f2a44", letterSpacing: "-1px" }}>语依</div>
          <div style={{ color: "#7584a3", fontSize: "15px", marginTop: "8px" }}>登录以继续使用</div>
        </div>

        <div style={{
          background: "#fff",
          borderRadius: "28px",
          padding: "36px 32px",
          boxShadow: "0 20px 60px rgba(27,39,94,0.10)",
          border: "1px solid #e8edf5",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#7584a3" }}>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                style={{
                  border: "1px solid #d9e2f0",
                  borderRadius: "14px",
                  padding: "13px 16px",
                  fontSize: "15px",
                  outline: "none",
                  transition: "border-color 0.15s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4f7cff")}
                onBlur={(e) => (e.target.style.borderColor = "#d9e2f0")}
              />
            </div>

            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#7584a3" }}>密码</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  style={{
                    border: "1px solid #d9e2f0",
                    borderRadius: "14px",
                    padding: "13px 48px 13px 16px",
                    fontSize: "15px",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4f7cff")}
                  onBlur={(e) => (e.target.style.borderColor = "#d9e2f0")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  style={{
                    position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#7584a3", fontSize: "13px",
                  }}
                >
                  {showPwd ? "隐藏" : "显示"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#7584a3" }}>人机验证</label>
              {captcha.target ? (
                <>
                  <div style={{
                    background: "#f0f4ff", borderRadius: "14px", padding: "12px 16px",
                    display: "flex", alignItems: "center", gap: "10px",
                    fontSize: "15px", fontWeight: 700, color: "#1f2a44",
                  }}>
                    <span style={{ fontSize: "30px", lineHeight: 1 }}>{captcha.target.emoji}</span>
                    请找到并点击「{captcha.target.label}」
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {captcha.emojis.map((item, i) => {
                      const selected = captchaAnswer === item.emoji;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCaptchaAnswer(item.emoji)}
                          style={{
                            background: selected ? "#e8f0fe" : "#f7f9fd",
                            border: selected ? "2px solid #4f7cff" : "2px solid #e8edf5",
                            borderRadius: "14px",
                            padding: "12px 0",
                            cursor: "pointer",
                            fontSize: "34px",
                            lineHeight: 1,
                            transition: "all 0.12s",
                            transform: selected ? "scale(1.08)" : "scale(1)",
                          }}
                        >
                          {item.emoji}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#7584a3", fontSize: "13px", textDecoration: "underline",
                    }}
                  >
                    换一组
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  style={{
                    border: "1px dashed #c0d0ec", background: "#f7f9fd",
                    borderRadius: "14px", padding: "14px",
                    cursor: "pointer", color: "#7584a3", fontSize: "14px",
                  }}
                >
                  点击加载验证码
                </button>
              )}
            </div>

            {error && (
              <div style={{
                background: "#fff2f3", border: "1px solid #ffd5d8",
                borderRadius: "12px", padding: "11px 14px",
                color: "#d14b5a", fontSize: "14px",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                border: "none",
                background: loading ? "#9bb5ff" : "linear-gradient(135deg, #4f7cff 0%, #79a7ff 100%)",
                color: "#fff",
                borderRadius: "14px",
                padding: "14px",
                fontSize: "16px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "4px",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? "登录中..." : "登 录"}
            </button>

            <div style={{ textAlign: "center", fontSize: "14px", color: "#7584a3", marginTop: "4px" }}>
              还没有账号？
              <Link to="/register" style={{ color: "#4f7cff", fontWeight: 700, marginLeft: "6px", textDecoration: "none" }}>立即注册</Link>
            </div>
          </form>
        </div>

        <div style={{ marginTop: "28px" }}>
          <div style={{ textAlign: "center", fontSize: "13px", color: "#aab4c8", marginBottom: "14px" }}>
            演示账号（点击自动填入）
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.label}
                onClick={() => fillDemo(acc)}
                style={{
                  background: "#fff",
                  border: "1px solid #e8edf5",
                  borderRadius: "16px",
                  padding: "14px 10px",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  boxShadow: "0 4px 14px rgba(27,39,94,0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = acc.color;
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(27,39,94,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e8edf5";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(27,39,94,0.06)";
                }}
              >
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: acc.bg, margin: "0 auto 8px",
                }} />
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1f2a44" }}>{acc.label}</div>
                <div style={{ fontSize: "11px", color: "#aab4c8", marginTop: "3px" }}>{acc.username}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
