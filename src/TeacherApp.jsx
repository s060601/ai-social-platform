import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./config";

const navs = [
  { key: "students", label: "学员列表" },
  { key: "detail", label: "测评明细" },
  { key: "notes", label: "报告批注" },
];

const dimensionDefinitions = [
  { key: "contextUnderstanding", label: "情境理解", description: "理解当前情境里对方是谁、想表达什么，以及此刻需要回应什么。" },
  { key: "socialPragmatics", label: "社会语用", description: "表达是否符合对象关系、场合和沟通目的。" },
  { key: "emotionResponse", label: "情绪回应", description: "识别对方的感受，并作出合适、支持性的回应。" },
  { key: "normExpression", label: "礼貌规范", description: "表达是否清楚、礼貌，并符合日常交往中的基本规则。" },
  { key: "dialogueMaintenance", label: "对话维持", description: "能否接住话题、补充信息或自然追问，让交流继续下去。" },
  { key: "problemSolving", label: "问题解决", description: "能否说明原因、协商安排，或提出下一步可行的做法。" },
];
const reportFocus = ["行为证据复核", "优势能力分析", "需支持能力分析", "教育支持建议"];

function getDimensionAverage(records, key) {
  const scores = records
    .map((record) => Number(record.dimensions?.[key]))
    .filter(Number.isFinite);
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
}

function recentDateModuleGroups(records, maxDates = 3) {
  const dates = [];
  const dateGroups = {};
  records.forEach((record) => {
    const date = record.timestamp ? record.timestamp.slice(0, 10) : "未标注日期";
    if (!dates.includes(date) && dates.length < maxDates) dates.push(date);
    if (!dates.includes(date)) return;

    const moduleName = record.moduleName || "未分类测评";
    const scene = record.scene || "";
    const key = `${moduleName}::${scene}`;
    const modules = (dateGroups[date] ||= {});
    if (!modules[key]) modules[key] = { key, moduleName, scene, sessions: [] };
    modules[key].sessions.push(record);
  });
  return dates.map((date) => ({
    date,
    modules: Object.values(dateGroups[date] || {}).map((group) => ({
      ...group,
      averageScore: Math.round(group.sessions.reduce((sum, session) => sum + (Number(session.score) || 0), 0) / group.sessions.length),
    })),
  }));
}

function authHeaders() {
  const token = localStorage.getItem("yuyi_token");
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
  const [bindingCode, setBindingCode] = useState("");
  const [bindingCodeLoading, setBindingCodeLoading] = useState(true);
  const [bindingCodeUpdating, setBindingCodeUpdating] = useState(false);
  const [activeDimensionKey, setActiveDimensionKey] = useState(null);
  const [showDimensionGuide, setShowDimensionGuide] = useState(false);
  const [expandedGroupKey, setExpandedGroupKey] = useState(null);

  const activeDimension = dimensionDefinitions.find((item) => item.key === activeDimensionKey);
  const activeDimensionScore = activeDimension ? getDimensionAverage(sessions, activeDimension.key) : null;
  const recentSessionGroups = recentDateModuleGroups(sessions);

  async function loadStudents() {
    setLoadingStudents(true);
    try {
      const res = await fetch(`${API_BASE}/api/teacher/students`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "读取学员失败");
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }

  async function loadBindingCode() {
    setBindingCodeLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/teacher/binding-code`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "读取绑定码失败");
      setBindingCode(data.code || "");
    } catch {
      setBindingCode("");
    } finally {
      setBindingCodeLoading(false);
    }
  }

  async function regenerateBindingCode() {
    if (bindingCodeUpdating) return;
    setBindingCodeUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/api/teacher/binding-code`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "生成绑定码失败");
      setBindingCode(data.code || "");
    } catch (error) {
      alert(error.message || "生成绑定码失败");
    } finally {
      setBindingCodeUpdating(false);
    }
  }

  useEffect(() => {
    loadStudents();
    loadBindingCode();
  }, []);

  function selectStudent(stu) {
    setSelectedStudent(stu);
    setNoteOutput(null);
    setNoteInput("");
    setNoteSaved(false);
    setExpandedGroupKey(null);
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
    row: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "16px", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #edf1f7", textAlign: "left" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>语依 · 教师测评端</div>
            <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>学员测评记录 · 六维能力画像 · 报告批注建议</div>
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
          <div style={{ display: "grid", gap: "18px" }}>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>学员绑定</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: "6px" }}>请将绑定码提供给需要查看的学员</div>
                  <div style={{ color: "#7584a3", fontSize: "13px" }}>学员登录后可在“我的记录”中输入绑定码。</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "24px", letterSpacing: "3px", color: "#1f2a44" }}>
                    {bindingCodeLoading ? "读取中" : bindingCode || "--"}
                  </strong>
                  <button style={styles.secondaryBtn} onClick={regenerateBindingCode} disabled={bindingCodeUpdating}>
                    {bindingCodeUpdating ? "生成中..." : "重新生成"}
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionTitle}>测评工作台</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "14px" }}>
                {dimensionDefinitions.map((item) => (
                  <button
                    key={item.key}
                    style={{ border: activeDimensionKey === item.key ? "1px solid #22a06b" : "1px solid transparent", background: "#f7f9fd", borderRadius: "14px", padding: "14px", fontWeight: 700, color: "#1f2a44", cursor: "pointer" }}
                    onClick={() => setActiveDimensionKey(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {activeDimension && !selectedStudent && (
                <div style={{ color: "#60708f", lineHeight: 1.7 }}>
                  {activeDimension.description} 选择一位学员后可查看该项得分。
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {reportFocus.map((item) => (
                  <span key={item} style={{ display: "inline-block", padding: "6px 10px", background: "#e8f8f1", color: "#1d7f56", borderRadius: "999px", fontSize: "12px", fontWeight: 700 }}>{item}</span>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                我的学员（{students.length} 人已绑定）
              </div>
              {loadingStudents ? (
                <div style={{ color: "#aab4c8", padding: "20px 0" }}>加载中...</div>
              ) : students.length === 0 ? (
                <div style={{ color: "#aab4c8", padding: "20px 0" }}>暂无已绑定学员。请让学员登录后，在“我的记录”中输入上方绑定码。</div>
              ) : (
                students.map((stu) => (
                  <div key={stu.id} style={styles.row}>
                    <div style={{ minWidth: 0, textAlign: "left" }}>
                      <div style={{ fontWeight: 700 }}>{stu.name}</div>
                      <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "2px" }}>
                        @{stu.username}
                        {stu.lastSession ? ` · 最近：${stu.lastSession}` : " · 暂无测评记录"}
                        {stu.totalSessions > 0 ? ` · 共 ${stu.totalSessions} 次` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", whiteSpace: "nowrap" }}>
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
                      <button style={styles.primaryBtn} onClick={() => selectStudent(stu)}>查看报告</button>
                    </div>
                  </div>
                ))
              )}
            </div>
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
                      <div style={styles.sectionTitle}>测评明细</div>
                      <div style={{ fontSize: "22px", fontWeight: 800 }}>{selectedStudent.name}</div>
                      <div style={{ color: "#7584a3", fontSize: "14px", marginTop: "4px" }}>
                        @{selectedStudent.username}
                        {selectedStudent.avgScore !== null ? ` · 平均 ${selectedStudent.avgScore} 分` : ""}
                        {selectedStudent.totalSessions > 0 ? ` · 共 ${selectedStudent.totalSessions} 次测评` : " · 暂无测评记录"}
                        {selectedStudent.noteCount > 0 ? ` · ${selectedStudent.noteCount} 条批注` : ""}
                      </div>
                    </div>
                    <button style={styles.secondaryBtn} onClick={() => setActiveTab("notes")}>添加批注</button>
                  </div>
                </div>

                <div style={{ ...styles.card, marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
                    <div style={styles.sectionTitle}>六维能力</div>
                    <button style={{ ...styles.secondaryBtn, padding: "8px 12px", fontSize: "13px" }} onClick={() => setShowDimensionGuide((value) => !value)}>
                      {showDimensionGuide ? "收起维度说明" : "社会技能维度说明"}
                    </button>
                  </div>
                  {showDimensionGuide && (
                    <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
                      {dimensionDefinitions.map((item) => (
                        <div key={item.key} style={{ background: "#f7f9fd", borderRadius: "12px", padding: "10px 12px", lineHeight: 1.7 }}>
                          <strong>{item.label}</strong>：{item.description}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
                    {dimensionDefinitions.map((item) => {
                      const score = getDimensionAverage(sessions, item.key);
                      return (
                        <button
                          key={item.key}
                          style={{ border: activeDimensionKey === item.key ? "1px solid #22a06b" : "1px solid #edf1f7", background: activeDimensionKey === item.key ? "#e8f8f1" : "#f7f9fd", borderRadius: "14px", padding: "12px", color: "#1f2a44", textAlign: "left", cursor: "pointer" }}
                          onClick={() => setActiveDimensionKey(item.key)}
                        >
                          <div style={{ fontWeight: 700 }}>{item.label}</div>
                          <div style={{ marginTop: "6px", color: "#22a06b", fontWeight: 800 }}>{score === null ? "暂无得分" : `${score} 分`}</div>
                        </button>
                      );
                    })}
                  </div>
                  {activeDimension && (
                    <div style={{ marginTop: "14px", background: "#f7f9fd", borderRadius: "14px", padding: "14px", lineHeight: 1.75 }}>
                      <strong>{activeDimension.label}</strong>：{activeDimension.description}
                      <span style={{ marginLeft: "8px", color: "#22a06b", fontWeight: 800 }}>
                        当前学员近 30 次记录平均：{activeDimensionScore === null ? "暂无" : `${activeDimensionScore} 分`}
                      </span>
                    </div>
                  )}
                </div>

                {loadingDetail ? (
                  <div style={{ ...styles.card, color: "#aab4c8" }}>加载中...</div>
                ) : (
                  <div style={styles.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
                      <div style={styles.sectionTitle}>近三日互动记录</div>
                      <div style={{ color: "#7584a3", fontSize: "13px" }}>按日期与模块整理</div>
                    </div>
                    {sessions.length === 0 ? (
                      <div style={{ color: "#aab4c8", padding: "16px 0" }}>该学员暂无测评记录</div>
                    ) : (
                      recentSessionGroups.map((group) => (
                        <div key={group.date} style={{ marginTop: "18px" }}>
                          <div style={{ color: "#60708f", fontWeight: 800, fontSize: "14px", paddingBottom: "8px", borderBottom: "1px solid #edf1f7" }}>{group.date}</div>
                          {group.modules.map((moduleGroup) => {
                            const groupKey = `${group.date}-${moduleGroup.key}`;
                            const expanded = expandedGroupKey === groupKey;
                            const latest = moduleGroup.sessions[0];
                            const turnFeedback = Array.isArray(latest?.turnFeedback) ? latest.turnFeedback : [];
                            return (
                              <div key={groupKey} style={{ padding: "14px 0", borderBottom: "1px solid #edf1f7" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "14px", alignItems: "center" }}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 800 }}>{moduleGroup.moduleName}{moduleGroup.scene ? ` · ${moduleGroup.scene}` : ""}</div>
                                    <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>{moduleGroup.sessions.length} 次互动 · 最新 {latest?.timestamp?.slice(11, 16) || "时间未标注"}</div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <strong style={{ color: "#22a06b", fontSize: "20px", whiteSpace: "nowrap" }}>{moduleGroup.averageScore} 分</strong>
                                    <button style={{ ...styles.secondaryBtn, padding: "8px 12px", fontSize: "13px" }} onClick={() => setExpandedGroupKey(expanded ? null : groupKey)}>
                                      {expanded ? "收起详情" : "查看本组反馈"}
                                    </button>
                                  </div>
                                </div>
                                {expanded && (
                                  <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
                                    {latest?.transcriptShared && (latest.transcript || []).length > 0 && (
                                      <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px" }}>
                                        <div style={styles.sectionTitle}>交流原文</div>
                                        {latest.transcript.map((turn) => (
                                          <div key={turn.turn} style={{ marginTop: "8px", lineHeight: 1.7 }}><strong>{turn.speaker === "student" ? "学员" : "对方"}：</strong>{turn.text}</div>
                                        ))}
                                      </div>
                                    )}
                                    <div style={{ background: "#e8f8f1", borderRadius: "14px", padding: "14px" }}>
                                      <div style={styles.sectionTitle}>{latest?.transcriptShared ? "逐句观察与支持建议" : "本次观察与支持建议"}</div>
                                      {latest?.transcriptShared && turnFeedback.length ? turnFeedback.map((turn) => (
                                        <div key={turn.turn} style={{ paddingTop: "10px", marginTop: "10px", borderTop: "1px solid rgba(34,160,107,0.15)", lineHeight: 1.7 }}>
                                          <strong>学员原话：</strong>{turn.text}
                                          <div><strong>观察：</strong>{turn.analysis || "本句未生成单独观察。"}</div>
                                          <div><strong>建议：</strong>{turn.suggestion || "可在下次同类情境中继续练习补充关键信息。"}</div>
                                        </div>
                                      )) : <div style={{ lineHeight: 1.7 }}><strong>本次分析：</strong>{latest?.evidence || latest?.summary || "暂无分析"}<br /><strong>优势能力：</strong>{latest?.strength || "暂无单独记录"}<br /><strong>支持建议：</strong>{latest?.supportNeed || latest?.suggestion || "暂无单独建议"}</div>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
              <div style={styles.sectionTitle}>报告批注与支持建议</div>
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
                placeholder="描述你对该学员的观察，例如：在老师提醒交作业任务中能理解提醒，但原因说明和补救方案还不够完整……"
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
                    <div style={{ color: "#22a06b", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>教育支持建议</div>
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
