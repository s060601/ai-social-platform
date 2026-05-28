import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./config";

const mockReport = {
  childName: "小明",
  weekStart: "2026-05-19",
  weekEnd: "2026-05-25",
  totalSessions: 5,
  avgScore: 83,
  bestModule: "共情模拟",
  improvement: "+4",
  modules: [
    { name: "训练模块", sessions: 2, avgScore: 85 },
    { name: "语音通话", sessions: 1, avgScore: 80 },
    { name: "共情模拟", sessions: 1, avgScore: 88 },
    { name: "社交故事", sessions: 1, avgScore: 79 },
  ],
};

const mockTrends = [
  { week: "5月第1周", clarity: 72, relevance: 70, empathy: 68, overall: 70 },
  { week: "5月第2周", clarity: 76, relevance: 74, empathy: 72, overall: 74 },
  { week: "5月第3周", clarity: 80, relevance: 78, empathy: 79, overall: 79 },
  { week: "5月第4周", clarity: 83, relevance: 82, empathy: 84, overall: 83 },
];

const mockTeacherFeedback = [
  {
    date: "2026-05-24",
    teacher: "王老师",
    content:
      "本周小明在训练模块中表现积极，打招呼场景接话自然，主动提问次数增加。语音通话中回应速度有所提升，建议继续练习主动发起话题。",
    homework: "每天找一个真实情境，练习主动问一个跟进问题。",
    encouragement: "小明这周进步很大，继续保持这个状态！",
  },
  {
    date: "2026-05-17",
    teacher: "王老师",
    content:
      "小明在共情模拟中能识别他人情绪，回应有温度。社交故事练习中选择更优方案的比例提升。",
    homework: "可以尝试和家人进行一次角色扮演，练习被拒绝时的平和回应。",
    encouragement: "你学会了先理解别人的感受，这是很重要的社交技能！",
  },
];

const mockSessions = [
  { date: "2026-05-24", module: "训练模块", scene: "打招呼", score: 86, comment: "开头自然，主动提问，整体流畅" },
  { date: "2026-05-23", module: "共情模拟", scene: "朋友考试失利", score: 88, comment: "能识别负面情绪，回应有温度" },
  { date: "2026-05-22", module: "语音通话", scene: "老师来电", score: 80, comment: "回应较慢，但内容完整" },
  { date: "2026-05-21", module: "社交故事", scene: "加入聊天", score: 79, comment: "选择了较优方案" },
  { date: "2026-05-20", module: "训练模块", scene: "请求帮助", score: 83, comment: "表达清楚，思路连贯" },
];

const navs = [
  { key: "report", label: "训练周报" },
  { key: "trends", label: "能力趋势" },
  { key: "feedback", label: "教师反馈" },
  { key: "practice", label: "练习建议" },
];

export default function ParentApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("report");
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceOutput, setPracticeOutput] = useState(null);

  async function generatePracticePlan() {
    if (practiceLoading) return;
    setPracticeLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/parent/practice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: mockReport.childName,
          weekReport: mockReport,
          trends: mockTrends,
          latestFeedback: mockTeacherFeedback[0],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "生成失败");
      setPracticeOutput(data);
    } catch (e) {
      setPracticeOutput({
        tip: "每次练习控制在 10-15 分钟，保持轻松，避免纠错压力。",
        activities: [
          { title: "角色扮演练习", desc: "在家模拟课间聊天场景，练习主动加入话题的表达方式。" },
          { title: "情绪卡片游戏", desc: "用表情卡片配合日常对话，练习识别和命名他人情绪。" },
          { title: "电话礼仪练习", desc: "模拟接打电话，重点练习开头问候和礼貌结束语。" },
        ],
      });
    } finally {
      setPracticeLoading(false);
    }
  }

  const styles = {
    page: { minHeight: "100vh", background: "#f5f7fb", color: "#1f2a44", fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif' },
    shell: { maxWidth: "1280px", margin: "0 auto", padding: "20px" },
    topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: "20px", padding: "14px 18px", boxShadow: "0 8px 28px rgba(27,39,94,0.06)", border: "1px solid #e8edf5", marginBottom: "18px", position: "sticky", top: "10px", zIndex: 20 },
    navWrap: { display: "flex", gap: "10px", flexWrap: "wrap" },
    navBtn: (active) => ({ padding: "10px 16px", borderRadius: "12px", border: active ? "1px solid #f77f00" : "1px solid #e1e7f0", background: active ? "#f77f00" : "#fff", color: active ? "#fff" : "#445474", fontWeight: 700, cursor: "pointer" }),
    card: { background: "#fff", borderRadius: "24px", padding: "20px", border: "1px solid #e8edf5", boxShadow: "0 8px 28px rgba(27,39,94,0.06)" },
    sectionTitle: { fontSize: "13px", color: "#7584a3", marginBottom: "8px", fontWeight: 700 },
    primaryBtn: { border: "none", background: "#f77f00", color: "white", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    secondaryBtn: { border: "1px solid #d9e2f0", background: "#fff", color: "#4f5f7f", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    backBtn: { border: "1px solid #e1e7f0", background: "#fff", color: "#7584a3", borderRadius: "10px", padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: "13px" },
    hero: { background: "linear-gradient(135deg, #f77f00 0%, #ffb347 100%)", color: "white", borderRadius: "28px", padding: "28px", boxShadow: "0 18px 45px rgba(247,127,0,0.22)", marginBottom: "18px" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #edf1f7" },
  };

  const latestTrend = mockTrends[mockTrends.length - 1];
  const prevTrend = mockTrends[mockTrends.length - 2];

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>语依 · 家长端</div>
            <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>训练周报 · 能力趋势 · 教师反馈</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={styles.navWrap}>
              {navs.map((nav) => (
                <button key={nav.key} style={styles.navBtn(activeTab === nav.key)} onClick={() => setActiveTab(nav.key)}>
                  {nav.label}
                </button>
              ))}
            </div>
            <button style={styles.backBtn} onClick={() => navigate("/")}>切换身份</button>
          </div>
        </div>

        {activeTab === "report" && (
          <div>
            <div style={styles.hero}>
              <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px" }}>
                {mockReport.weekStart} — {mockReport.weekEnd} 周报
              </div>
              <div style={{ fontSize: "32px", fontWeight: 900, marginBottom: "4px" }}>
                {mockReport.childName} 本周训练总览
              </div>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "18px" }}>
                <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: "16px", padding: "14px 20px" }}>
                  <div style={{ fontSize: "12px", opacity: 0.85 }}>训练次数</div>
                  <div style={{ fontSize: "28px", fontWeight: 900 }}>{mockReport.totalSessions} 次</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: "16px", padding: "14px 20px" }}>
                  <div style={{ fontSize: "12px", opacity: 0.85 }}>平均得分</div>
                  <div style={{ fontSize: "28px", fontWeight: 900 }}>{mockReport.avgScore} 分</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: "16px", padding: "14px 20px" }}>
                  <div style={{ fontSize: "12px", opacity: 0.85 }}>本周进步</div>
                  <div style={{ fontSize: "28px", fontWeight: 900 }}>{mockReport.improvement}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: "16px", padding: "14px 20px" }}>
                  <div style={{ fontSize: "12px", opacity: 0.85 }}>最强模块</div>
                  <div style={{ fontSize: "22px", fontWeight: 900 }}>{mockReport.bestModule}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>各模块训练情况</div>
                {mockReport.modules.map((mod) => (
                  <div key={mod.name} style={styles.row}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{mod.name}</div>
                      <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "2px" }}>{mod.sessions} 次练习</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: "22px", color: "#f77f00" }}>{mod.avgScore}</div>
                      <div style={{ fontSize: "12px", color: "#7584a3" }}>分</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>最近练习记录</div>
                {mockSessions.slice(0, 5).map((s, idx) => (
                  <div key={idx} style={styles.row}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.scene}</div>
                      <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "2px" }}>{s.date} · {s.module}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "20px", color: "#f77f00" }}>{s.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "trends" && (
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ ...styles.card, marginBottom: "18px" }}>
              <div style={styles.sectionTitle}>能力维度趋势（近四周）</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
                  <thead>
                    <tr>
                      {["周次", "表达清晰", "情境相关", "共情能力", "综合得分"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#7584a3", fontSize: "13px", fontWeight: 700, borderBottom: "2px solid #edf1f7" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockTrends.map((row, idx) => {
                      const isLatest = idx === mockTrends.length - 1;
                      return (
                        <tr key={idx} style={{ background: isLatest ? "#fff8f0" : "transparent" }}>
                          <td style={{ padding: "12px", fontWeight: isLatest ? 800 : 500, color: isLatest ? "#f77f00" : "#1f2a44" }}>
                            {row.week}
                          </td>
                          {[row.clarity, row.relevance, row.empathy, row.overall].map((val, vi) => (
                            <td key={vi} style={{ padding: "12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ flex: 1, height: "8px", background: "#eef2f8", borderRadius: "999px", overflow: "hidden" }}>
                                  <div style={{ width: `${val}%`, height: "100%", background: isLatest ? "#f77f00" : "#c8d6f5", borderRadius: "999px" }} />
                                </div>
                                <span style={{ fontWeight: 700, minWidth: "32px", color: isLatest ? "#f77f00" : "#1f2a44" }}>{val}</span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
              {[
                { label: "表达清晰", cur: latestTrend.clarity, prev: prevTrend.clarity },
                { label: "情境相关", cur: latestTrend.relevance, prev: prevTrend.relevance },
                { label: "共情能力", cur: latestTrend.empathy, prev: prevTrend.empathy },
              ].map((item) => {
                const diff = item.cur - item.prev;
                return (
                  <div key={item.label} style={styles.card}>
                    <div style={styles.sectionTitle}>{item.label}</div>
                    <div style={{ fontSize: "40px", fontWeight: 900, color: "#f77f00" }}>{item.cur}</div>
                    <div style={{ fontSize: "13px", color: diff > 0 ? "#22a06b" : diff < 0 ? "#d14b5a" : "#7584a3", marginTop: "6px" }}>
                      {diff > 0 ? `↑ +${diff}` : diff < 0 ? `↓ ${diff}` : "→ 持平"} 较上周
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "feedback" && (
          <div style={{ maxWidth: "880px", margin: "0 auto", display: "grid", gap: "18px" }}>
            {mockTeacherFeedback.map((fb, idx) => (
              <div key={idx} style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ fontWeight: 800, fontSize: "16px" }}>{fb.teacher} 的反馈</div>
                  <div style={{ color: "#7584a3", fontSize: "13px" }}>{fb.date}</div>
                </div>
                <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px", lineHeight: 1.8, marginBottom: "12px" }}>
                  {fb.content}
                </div>
                {fb.homework && (
                  <div style={{ background: "#fff8e6", borderRadius: "14px", padding: "14px", lineHeight: 1.8, marginBottom: "12px" }}>
                    <span style={{ color: "#a07000", fontWeight: 700, fontSize: "13px" }}>家庭作业：</span>
                    {fb.homework}
                  </div>
                )}
                {fb.encouragement && (
                  <div style={{ background: "#e8f8f1", borderRadius: "14px", padding: "14px", lineHeight: 1.8 }}>
                    <span style={{ color: "#22a06b", fontWeight: 700, fontSize: "13px" }}>鼓励话语：</span>
                    {fb.encouragement}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "practice" && (
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>家庭练习建议</div>
              <h2 style={{ marginTop: 0 }}>AI 生成本周家庭练习计划</h2>
              <p style={{ color: "#60708f", lineHeight: 1.8 }}>
                根据 {mockReport.childName} 本周的训练数据和教师反馈，生成适合在家练习的活动建议。
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={styles.primaryBtn} onClick={generatePracticePlan}>
                  {practiceLoading ? "生成中..." : "生成练习建议"}
                </button>
                {practiceOutput && (
                  <button style={styles.secondaryBtn} onClick={() => setPracticeOutput(null)}>清空</button>
                )}
              </div>

              {practiceOutput && (
                <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
                  {practiceOutput.tip && (
                    <div style={{ background: "#fff8e6", borderRadius: "16px", padding: "14px 16px", lineHeight: 1.8 }}>
                      <span style={{ color: "#a07000", fontWeight: 700 }}>温馨提示：</span>{practiceOutput.tip}
                    </div>
                  )}
                  {(practiceOutput.activities || []).map((act, idx) => (
                    <div key={idx} style={{ background: "#f7f9fd", borderRadius: "16px", padding: "16px" }}>
                      <div style={{ fontWeight: 700, color: "#1f2a44", marginBottom: "6px" }}>
                        {idx + 1}. {act.title}
                      </div>
                      <div style={{ color: "#60708f", lineHeight: 1.8 }}>{act.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
