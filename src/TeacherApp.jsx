import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./config";

const mockClasses = [
  { id: 1, name: "星光班", count: 8, avgScore: 81 },
  { id: 2, name: "成长班", count: 6, avgScore: 76 },
  { id: 3, name: "实践班", count: 5, avgScore: 85 },
];

const mockStudents = {
  1: [
    { id: 101, name: "小明", lastSession: "2026-05-24", totalSessions: 12, avgScore: 83, trend: "+4" },
    { id: 102, name: "小华", lastSession: "2026-05-23", totalSessions: 9, avgScore: 79, trend: "+2" },
    { id: 103, name: "小燕", lastSession: "2026-05-22", totalSessions: 15, avgScore: 88, trend: "+6" },
    { id: 104, name: "小峰", lastSession: "2026-05-21", totalSessions: 7, avgScore: 74, trend: "-1" },
  ],
  2: [
    { id: 105, name: "小雨", lastSession: "2026-05-24", totalSessions: 10, avgScore: 77, trend: "+3" },
    { id: 106, name: "小林", lastSession: "2026-05-20", totalSessions: 8, avgScore: 72, trend: "0" },
  ],
  3: [
    { id: 107, name: "小涛", lastSession: "2026-05-23", totalSessions: 14, avgScore: 86, trend: "+5" },
    { id: 108, name: "小蕾", lastSession: "2026-05-22", totalSessions: 11, avgScore: 84, trend: "+2" },
  ],
};

const mockSessionDetail = {
  101: [
    { date: "2026-05-24", module: "训练模块", scene: "打招呼", score: 86, comment: "开头自然，主动提问，整体流畅" },
    { date: "2026-05-22", module: "语音通话", scene: "老师来电", score: 80, comment: "回应较慢，但内容完整" },
    { date: "2026-05-20", module: "共情模拟", scene: "朋友考试失利", score: 85, comment: "能识别负面情绪，回应有温度" },
  ],
  102: [
    { date: "2026-05-23", module: "训练模块", scene: "请求帮助", score: 78, comment: "表达清楚，但略显紧张" },
    { date: "2026-05-21", module: "社交故事", scene: "加入聊天", score: 81, comment: "选择了较优方案" },
  ],
};

const navs = [
  { key: "classes", label: "班级列表" },
  { key: "students", label: "学生记录" },
  { key: "detail", label: "会话明细" },
  { key: "notes", label: "批注与建议" },
];

export default function TeacherApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("classes");
  const [selectedClass, setSelectedClass] = useState(mockClasses[0]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [noteOutput, setNoteOutput] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [classes, setClasses] = useState(mockClasses);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const students = mockStudents[selectedClass?.id] || [];
  const sessions = selectedStudent ? (mockSessionDetail[selectedStudent.id] || []) : [];

  useEffect(() => {
    setLoadingClasses(true);
    fetch(`${API_BASE}/api/teacher/classes`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) setClasses(data);
      })
      .catch(() => {})
      .finally(() => setLoadingClasses(false));
  }, []);

  async function generateNote() {
    const text = noteInput.trim();
    if (!text || noteLoading) return;
    setNoteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/teacher/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: selectedStudent?.name || "该学员",
          observation: text,
          sessions: sessions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "生成失败");
      setNoteOutput(data);
    } catch (e) {
      setNoteOutput({ suggestion: `生成失败：${e.message}`, homework: "", encouragement: "" });
    } finally {
      setNoteLoading(false);
    }
  }

  const styles = {
    page: { minHeight: "100vh", background: "#f5f7fb", color: "#1f2a44", fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif' },
    shell: { maxWidth: "1280px", margin: "0 auto", padding: "20px" },
    topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: "20px", padding: "14px 18px", boxShadow: "0 8px 28px rgba(27,39,94,0.06)", border: "1px solid #e8edf5", marginBottom: "18px", position: "sticky", top: "10px", zIndex: 20 },
    navWrap: { display: "flex", gap: "10px", flexWrap: "wrap" },
    navBtn: (active) => ({ padding: "10px 16px", borderRadius: "12px", border: active ? "1px solid #22a06b" : "1px solid #e1e7f0", background: active ? "#22a06b" : "#fff", color: active ? "#fff" : "#445474", fontWeight: 700, cursor: "pointer" }),
    card: { background: "#fff", borderRadius: "24px", padding: "20px", border: "1px solid #e8edf5", boxShadow: "0 8px 28px rgba(27,39,94,0.06)" },
    sectionTitle: { fontSize: "13px", color: "#7584a3", marginBottom: "8px", fontWeight: 700 },
    primaryBtn: { border: "none", background: "#22a06b", color: "white", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    secondaryBtn: { border: "1px solid #d9e2f0", background: "#fff", color: "#4f5f7f", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    backBtn: { border: "1px solid #e1e7f0", background: "#fff", color: "#7584a3", borderRadius: "10px", padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: "13px" },
    input: { width: "100%", borderRadius: "16px", border: "1px solid #d9e2f0", padding: "14px", boxSizing: "border-box", resize: "vertical", fontSize: "15px", outline: "none" },
    grid: { display: "grid", gridTemplateColumns: "300px 1fr", gap: "18px" },
    badge: (color) => ({ display: "inline-block", padding: "4px 10px", background: color === "green" ? "#e8f8f1" : "#eef4ff", color: color === "green" ? "#22a06b" : "#4567da", borderRadius: "999px", fontSize: "12px", fontWeight: 700 }),
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #edf1f7" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "20px" }}>语依 · 教师端</div>
              <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>班级管理 · 学生记录 · 批注建议</div>
            </div>
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

        {activeTab === "classes" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px", marginBottom: "18px" }}>
              {(loadingClasses ? mockClasses : classes).map((cls) => (
                <div
                  key={cls.id}
                  style={{
                    ...styles.card,
                    cursor: "pointer",
                    border: selectedClass?.id === cls.id ? "2px solid #22a06b" : "1px solid #e8edf5",
                  }}
                  onClick={() => { setSelectedClass(cls); setSelectedStudent(null); setActiveTab("students"); }}
                >
                  <div style={styles.sectionTitle}>班级</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "10px" }}>{cls.name}</div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ background: "#f7f9fd", borderRadius: "10px", padding: "10px 14px", flex: 1 }}>
                      <div style={{ color: "#7584a3", fontSize: "12px" }}>学员数</div>
                      <div style={{ fontWeight: 800, fontSize: "20px" }}>{cls.count}</div>
                    </div>
                    <div style={{ background: "#f7f9fd", borderRadius: "10px", padding: "10px 14px", flex: 1 }}>
                      <div style={{ color: "#7584a3", fontSize: "12px" }}>平均得分</div>
                      <div style={{ fontWeight: 800, fontSize: "20px", color: "#22a06b" }}>{cls.avgScore}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: "14px" }}>
                    <button
                      style={styles.primaryBtn}
                      onClick={(e) => { e.stopPropagation(); setSelectedClass(cls); setSelectedStudent(null); setActiveTab("students"); }}
                    >
                      查看学员 →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "students" && (
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>选择班级</div>
              {(loadingClasses ? mockClasses : classes).map((cls) => (
                <button
                  key={cls.id}
                  style={{
                    width: "100%", textAlign: "left", background: selectedClass?.id === cls.id ? "#e8f8f1" : "#fff",
                    border: selectedClass?.id === cls.id ? "2px solid #22a06b" : "1px solid #e2e8f2",
                    borderRadius: "16px", padding: "14px", marginBottom: "10px", cursor: "pointer",
                  }}
                  onClick={() => { setSelectedClass(cls); setSelectedStudent(null); }}
                >
                  <strong>{cls.name}</strong>
                  <span style={{ color: "#7584a3", fontSize: "13px", marginLeft: "8px" }}>{cls.count} 人</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>{selectedClass?.name} — 学员训练记录</div>
                {students.length === 0 ? (
                  <div style={{ color: "#aab4c8", padding: "20px 0" }}>暂无学员数据</div>
                ) : (
                  students.map((stu) => (
                    <div key={stu.id} style={styles.row}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{stu.name}</div>
                        <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "2px" }}>
                          最近练习：{stu.lastSession} · 共 {stu.totalSessions} 次
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, color: "#22a06b", fontSize: "20px" }}>{stu.avgScore}</div>
                          <div style={{ fontSize: "12px", color: stu.trend.startsWith("+") ? "#22a06b" : stu.trend === "0" ? "#7584a3" : "#d14b5a" }}>
                            {stu.trend !== "0" ? `近期 ${stu.trend}` : "持平"}
                          </div>
                        </div>
                        <button
                          style={styles.primaryBtn}
                          onClick={() => { setSelectedStudent(stu); setActiveTab("detail"); }}
                        >
                          明细
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "detail" && (
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>
            {!selectedStudent ? (
              <div style={styles.card}>
                <div style={{ color: "#aab4c8" }}>请先在"学生记录"中选择一位学员</div>
                <button style={{ ...styles.secondaryBtn, marginTop: "14px" }} onClick={() => setActiveTab("students")}>前往学生记录</button>
              </div>
            ) : (
              <>
                <div style={{ ...styles.card, marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={styles.sectionTitle}>学员会话明细</div>
                      <div style={{ fontSize: "22px", fontWeight: 800 }}>{selectedStudent.name}</div>
                      <div style={{ color: "#7584a3", fontSize: "14px", marginTop: "4px" }}>
                        {selectedClass?.name} · 平均 {selectedStudent.avgScore} 分 · 共 {selectedStudent.totalSessions} 次训练
                      </div>
                    </div>
                    <button style={styles.secondaryBtn} onClick={() => { setActiveTab("notes"); }}>添加批注</button>
                  </div>
                </div>

                <div style={styles.card}>
                  <div style={styles.sectionTitle}>最近会话记录</div>
                  {sessions.length === 0 ? (
                    <div style={{ color: "#aab4c8", padding: "16px 0" }}>暂无会话记录</div>
                  ) : (
                    sessions.map((s, idx) => (
                      <div key={idx} style={{ ...styles.row, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{s.scene}</div>
                          <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "2px" }}>
                            {s.date} · {s.module}
                          </div>
                          <div style={{ color: "#445474", fontSize: "14px", marginTop: "6px", lineHeight: 1.6 }}>
                            {s.comment}
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "22px", color: "#22a06b", minWidth: "50px", textAlign: "right" }}>
                          {s.score}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>批注与作业建议</div>
              <h2 style={{ marginTop: 0 }}>
                {selectedStudent ? `为 ${selectedStudent.name} 生成建议` : "AI 辅助批注"}
              </h2>
              {!selectedStudent && (
                <div style={{ background: "#fff8e6", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", color: "#a07000", fontSize: "14px" }}>
                  提示：在"学生记录"中选择学员后，批注会更有针对性。
                </div>
              )}
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="描述你对该学员的观察，例如：最近两次训练他接话能力有明显提升，但主动发起话题仍然较少……"
                style={{ ...styles.input, minHeight: "130px" }}
              />
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button style={styles.primaryBtn} onClick={generateNote}>{noteLoading ? "生成中..." : "AI 生成建议"}</button>
                <button style={styles.secondaryBtn} onClick={() => { setNoteInput(""); setNoteOutput(null); }}>清空</button>
              </div>
              {noteOutput && (
                <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
                  <div style={{ background: "#e8f8f1", borderRadius: "16px", padding: "16px" }}>
                    <div style={{ color: "#22a06b", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>训练建议</div>
                    <div style={{ lineHeight: 1.8 }}>{noteOutput.suggestion}</div>
                  </div>
                  {noteOutput.homework && (
                    <div style={{ background: "#f7f9fd", borderRadius: "16px", padding: "16px" }}>
                      <div style={{ color: "#7584a3", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>家庭作业</div>
                      <div style={{ lineHeight: 1.8 }}>{noteOutput.homework}</div>
                    </div>
                  )}
                  {noteOutput.encouragement && (
                    <div style={{ background: "#fff8e6", borderRadius: "16px", padding: "16px" }}>
                      <div style={{ color: "#a07000", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>鼓励话语</div>
                      <div style={{ lineHeight: 1.8 }}>{noteOutput.encouragement}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
