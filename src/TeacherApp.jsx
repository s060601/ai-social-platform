import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./config";

const navs = [
  { key: "students", label: "学员列表" },
  { key: "detail", label: "训练明细" },
  { key: "notes", label: "批注与建议" },
];

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function TeacherApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("students");
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [savedNotes, setSavedNotes] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [noteOutput, setNoteOutput] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/teacher/students`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setStudents(data); })
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []);

  function selectStudent(stu) {
    setSelectedStudent(stu);
    setNoteOutput(null);
    setNoteInput("");
    setNoteSaved(false);
    setActiveTab("detail");
    setLoadingDetail(true);
    Promise.all([
      fetch(`${API_BASE}/api/teacher/student/${stu.id}/sessions`, { headers: authHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/teacher/student/${stu.id}/notes`, { headers: authHeaders() }).then((r) => r.json()),
    ])
      .then(([sess, notes]) => {
        setSessions(Array.isArray(sess) ? sess : []);
        setSavedNotes(Array.isArray(notes) ? notes : []);
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }

  async function generateNote() {
    const text = noteInput.trim();
    if (!text || noteLoading) return;
    setNoteLoading(true);
    setNoteSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/teacher/note`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ studentName: selectedStudent?.name || "该学员", observation: text, sessions }),
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

  async function saveNote() {
    if (!noteOutput || !selectedStudent || noteSaving) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/teacher/student/${selectedStudent.id}/note/save`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...noteOutput, observation: noteInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "保存失败");
      setSavedNotes((prev) => [data.note, ...prev]);
      setNoteSaved(true);
    } catch (e) {
      alert(`保存失败：${e.message}`);
    } finally {
      setNoteSaving(false);
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
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #edf1f7" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>语依 · 教师端</div>
            <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>学员记录 · 训练明细 · 批注建议</div>
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

        {activeTab === "students" && (
          <div style={styles.card}>
            <div style={styles.sectionTitle}>
              全部学员（{students.length} 人注册）
            </div>
            {loadingStudents ? (
              <div style={{ color: "#aab4c8", padding: "20px 0" }}>加载中...</div>
            ) : students.length === 0 ? (
              <div style={{ color: "#aab4c8", padding: "20px 0" }}>暂无学员账号，请让学员先注册</div>
            ) : (
              students.map((stu) => (
                <div key={stu.id} style={styles.row}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{stu.name}</div>
                    <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "2px" }}>
                      @{stu.username}
                      {stu.lastSession ? ` · 最近：${stu.lastSession}` : " · 暂无训练记录"}
                      {stu.totalSessions > 0 ? ` · 共 ${stu.totalSessions} 次` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {stu.avgScore !== null ? (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: "#22a06b", fontSize: "20px" }}>{stu.avgScore}</div>
                        {stu.trend !== null && (
                          <div style={{ fontSize: "12px", color: stu.trend?.startsWith("+") ? "#22a06b" : "#d14b5a" }}>
                            近期 {stu.trend}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: "#aab4c8", fontSize: "13px" }}>无得分</div>
                    )}
                    <button style={styles.primaryBtn} onClick={() => selectStudent(stu)}>查看</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "detail" && (
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>
            {!selectedStudent ? (
              <div style={styles.card}>
                <div style={{ color: "#aab4c8" }}>请先在"学员列表"中选择一位学员</div>
                <button style={{ ...styles.secondaryBtn, marginTop: "14px" }} onClick={() => setActiveTab("students")}>前往学员列表</button>
              </div>
            ) : (
              <>
                <div style={{ ...styles.card, marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={styles.sectionTitle}>训练明细</div>
                      <div style={{ fontSize: "22px", fontWeight: 800 }}>{selectedStudent.name}</div>
                      <div style={{ color: "#7584a3", fontSize: "14px", marginTop: "4px" }}>
                        @{selectedStudent.username}
                        {selectedStudent.avgScore !== null ? ` · 平均 ${selectedStudent.avgScore} 分` : ""}
                        {selectedStudent.totalSessions > 0 ? ` · 共 ${selectedStudent.totalSessions} 次训练` : " · 暂无训练记录"}
                        {selectedStudent.noteCount > 0 ? ` · ${selectedStudent.noteCount} 条批注` : ""}
                      </div>
                    </div>
                    <button style={styles.secondaryBtn} onClick={() => setActiveTab("notes")}>添加批注</button>
                  </div>
                </div>

                {loadingDetail ? (
                  <div style={{ ...styles.card, color: "#aab4c8" }}>加载中...</div>
                ) : (
                  <div style={styles.card}>
                    <div style={styles.sectionTitle}>最近训练记录</div>
                    {sessions.length === 0 ? (
                      <div style={{ color: "#aab4c8", padding: "16px 0" }}>该学员暂无训练记录</div>
                    ) : (
                      sessions.map((s, idx) => (
                        <div key={idx} style={{ ...styles.row, alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{s.moduleName}{s.scene ? ` · ${s.scene}` : ""}</div>
                            <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "2px" }}>
                              {s.timestamp?.slice(0, 10)} {s.timestamp?.slice(11, 16)}
                            </div>
                            {s.summary && (
                              <div style={{ color: "#445474", fontSize: "14px", marginTop: "6px", lineHeight: 1.6 }}>
                                {s.summary}
                              </div>
                            )}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: "22px", color: "#22a06b", minWidth: "50px", textAlign: "right" }}>
                            {s.score}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div style={{ maxWidth: "880px", margin: "0 auto", display: "grid", gap: "18px" }}>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>批注与作业建议</div>
              <h2 style={{ marginTop: 0 }}>
                {selectedStudent ? `为 ${selectedStudent.name} 生成建议` : "AI 辅助批注"}
              </h2>
              {!selectedStudent && (
                <div style={{ background: "#fff8e6", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", color: "#a07000", fontSize: "14px" }}>
                  提示：在"学员列表"中选择学员后，批注会更有针对性。
                </div>
              )}
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="描述你对该学员的观察，例如：最近两次训练他接话能力有明显提升，但主动发起话题仍然较少……"
                style={{ ...styles.input, minHeight: "130px" }}
              />
              <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                <button style={styles.primaryBtn} onClick={generateNote}>{noteLoading ? "生成中..." : "AI 生成建议"}</button>
                {noteOutput && selectedStudent && !noteSaved && (
                  <button style={{ ...styles.primaryBtn, background: "#4f7cff" }} onClick={saveNote}>
                    {noteSaving ? "保存中..." : "保存批注"}
                  </button>
                )}
                {noteSaved && <div style={{ padding: "11px 16px", color: "#22a06b", fontWeight: 700 }}>✓ 已保存</div>}
                <button style={styles.secondaryBtn} onClick={() => { setNoteInput(""); setNoteOutput(null); setNoteSaved(false); }}>清空</button>
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

            {savedNotes.length > 0 && (
              <div style={styles.card}>
                <div style={styles.sectionTitle}>历史批注记录（{savedNotes.length} 条）</div>
                {savedNotes.map((note, idx) => (
                  <div key={idx} style={{ borderBottom: idx < savedNotes.length - 1 ? "1px solid #edf1f7" : "none", paddingBottom: "16px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ fontWeight: 700, color: "#22a06b" }}>{note.teacherName}</div>
                      <div style={{ fontSize: "13px", color: "#7584a3" }}>{note.timestamp?.slice(0, 10)}</div>
                    </div>
                    {note.observation && <div style={{ color: "#7584a3", fontSize: "13px", marginBottom: "8px" }}>观察：{note.observation}</div>}
                    <div style={{ background: "#e8f8f1", borderRadius: "12px", padding: "12px", lineHeight: 1.7, marginBottom: "8px" }}>{note.suggestion}</div>
                    {note.homework && <div style={{ background: "#f7f9fd", borderRadius: "12px", padding: "10px", fontSize: "14px", color: "#7584a3" }}>作业：{note.homework}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
