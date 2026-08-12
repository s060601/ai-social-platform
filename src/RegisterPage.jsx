import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { API_BASE } from "./config";

const ROLE_PATH = { student: "/student", teacher: "/teacher", parent: "/parent" };

const roles = [
  { key: "student", label: "学员", color: "#4f7cff", bg: "linear-gradient(135deg,#4f7cff 0%,#79a7ff 100%)" },
  { key: "teacher", label: "教师", color: "#22a06b", bg: "linear-gradient(135deg,#22a06b 0%,#57d9a3 100%)" },
  { key: "parent",  label: "家长", color: "#f77f00", bg: "linear-gradient(135deg,#f77f00 0%,#ffb347 100%)" },
];

const CONSENT_VERSION = "2026-08-12";
const CONSENT_READ_SECONDS = 15;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [role, setRole] = useState("student");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [captcha, setCaptcha] = useState({ id: "", emojis: [], target: null });
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [remainingReadSeconds, setRemainingReadSeconds] = useState(CONSENT_READ_SECONDS);
  const [consentAtBottom, setConsentAtBottom] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const consentTextRef = useRef(null);

  const consentReady = remainingReadSeconds === 0 && consentAtBottom;

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingReadSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  function handleConsentScroll(event) {
    const target = event.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 4) {
      setConsentAtBottom(true);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !name.trim()) {
      setError("请完整填写注册信息");
      return;
    }
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username.trim())) {
      setError("用户名为 4-20 位字母、数字或下划线");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (password !== confirmPwd) {
      setError("两次输入的密码不一致");
      return;
    }
    if (!consentReady || !consentAccepted) {
      setError("请阅读到底并同意测评数据处理与原文记录说明");
      return;
    }
    if (!captcha.id || captchaAnswer === "") {
      setError("请完成人机验证");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await register({
        username: username.trim(),
        password,
        name: name.trim(),
        role,
        captchaId: captcha.id,
        captchaAnswer,
        consentAccepted,
        consentVersion: CONSENT_VERSION,
      });
      navigate(ROLE_PATH[data.role] || "/", { replace: true });
    } catch (err) {
      setError(err.message);
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  const inputBase = {
    border: "1px solid #d9e2f0",
    borderRadius: "14px",
    padding: "13px 16px",
    fontSize: "15px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

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
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "44px", fontWeight: 900, color: "#1f2a44", letterSpacing: "-1px" }}>语依</div>
          <div style={{ color: "#7584a3", fontSize: "15px", marginTop: "8px" }}>创建一个新账号</div>
        </div>

        <div style={{
          background: "#fff",
          borderRadius: "28px",
          padding: "32px",
          boxShadow: "0 20px 60px rgba(27,39,94,0.10)",
          border: "1px solid #e8edf5",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#7584a3" }}>身份</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}>
                {roles.map((r) => {
                  const active = role === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      style={{
                        background: active ? r.bg : "#fff",
                        color: active ? "#fff" : "#445474",
                        border: active ? `2px solid ${r.color}` : "1px solid #e1e7f0",
                        borderRadius: "14px",
                        padding: "12px 0",
                        fontWeight: 800,
                        cursor: "pointer",
                        fontSize: "14px",
                        transition: "all 0.15s",
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#7584a3" }}>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="4-20 位字母、数字或下划线"
                autoComplete="username"
                style={inputBase}
              />
            </div>

            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#7584a3" }}>显示名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：王老师 / 小明 / 小明家长"
                style={inputBase}
              />
            </div>

            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#7584a3" }}>密码</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                  style={{ ...inputBase, paddingRight: "48px" }}
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

            <div style={{ display: "grid", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#7584a3" }}>确认密码</label>
              <input
                type={showPwd ? "text" : "password"}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
                style={inputBase}
              />
            </div>

            <div style={{ display: "grid", gap: "9px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#7584a3" }}>测评数据处理与原文记录说明</label>
                <span style={{ fontSize: "12px", color: consentReady ? "#22a06b" : "#7584a3", whiteSpace: "nowrap" }}>
                  {remainingReadSeconds > 0 ? `请阅读 ${remainingReadSeconds} 秒` : consentAtBottom ? "已阅读到底" : "请滚动到底部"}
                </span>
              </div>
              <div
                ref={consentTextRef}
                onScroll={handleConsentScroll}
                style={{
                  maxHeight: "188px", overflowY: "auto", border: "1px solid #d9e2f0", borderRadius: "14px",
                  padding: "14px", background: "#fbfcff", color: "#445474", fontSize: "13px", lineHeight: 1.75,
                }}
              >
                <p style={{ marginTop: 0, fontWeight: 800, color: "#1f2a44" }}>知情同意</p>
                <p>“语依”用于社会沟通练习与教育支持，不提供医学诊断结论。系统会记录账号信息、所选任务、完成时间、最终文字输入或最终语音转写、测评参考分和反馈内容，用于生成个人练习记录及向已关联的教师提供教育支持。</p>
                <p>系统默认不保存原始录音，不保存未完成的语音识别片段。语音通话只会在识别到最终转写并完成本轮互动后保存文字记录；没有有效回应时不会生成评分或记录。</p>
                <p>学生原文默认仅供本人和经授权的系统管理人员在教育支持范围内查看。已关联教师默认只能查看评分、行为摘要和支持建议；只有学生在“我的记录”中单独授权后，教师才能查看完整交流原文，学生也可以随时停止该授权。家长端仅查看汇总结果、评估摘要和教师反馈，不展示完整交流原文。系统管理人员将严格保密，不将记录用于与教育支持无关的用途。请不要在互动中输入身份证号、住址、银行卡号、诊断证明等与本次练习无关的敏感信息。</p>
                <p>你可以查看自己的测评记录；如需更正或删除记录，或有使用建议、咨询问题，请联系系统管理人员：3546704972@qq.com。未满十四周岁的用户应在监护人知情并同意后注册和使用。</p>
                <p style={{ marginBottom: 0 }}>继续注册，即表示你已阅读并理解以上说明，并同意按上述范围处理本次使用产生的测评数据与最终转写文本。版本号：{CONSENT_VERSION}</p>
              </div>
              <label style={{ display: "flex", gap: "9px", alignItems: "flex-start", color: consentReady ? "#1f2a44" : "#9aa8c0", fontSize: "13px", lineHeight: 1.55, cursor: consentReady ? "pointer" : "not-allowed" }}>
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  disabled={!consentReady}
                  onChange={(event) => setConsentAccepted(event.target.checked)}
                  style={{ marginTop: "3px", accentColor: "#4f7cff" }}
                />
                我已阅读并同意上述测评数据处理与原文记录说明。
              </label>
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
              }}
            >
              {loading ? "注册中..." : "注 册"}
            </button>

            <div style={{ textAlign: "center", fontSize: "14px", color: "#7584a3" }}>
              已有账号？
              <Link to="/login" style={{ color: "#4f7cff", fontWeight: 700, marginLeft: "6px", textDecoration: "none" }}>返回登录</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
