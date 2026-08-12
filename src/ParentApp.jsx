import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./config";

const navs = [
  { key: "report", label: "测评报告" },
  { key: "feedback", label: "教师反馈" },
  { key: "practice", label: "家庭支持" },
];

const homeDimensions = [
  { key: "contextUnderstanding", label: "情境理解", description: "理解当前情境里对方是谁、想表达什么，以及此刻需要回应什么。" },
  { key: "socialPragmatics", label: "社会语用", description: "表达是否符合对象关系、场合和沟通目的。" },
  { key: "emotionResponse", label: "情绪回应", description: "识别对方的感受，并作出合适、支持性的回应。" },
  { key: "normExpression", label: "礼貌规范", description: "表达是否清楚、礼貌，并符合日常交往中的基本规则。" },
  { key: "dialogueMaintenance", label: "对话维持", description: "能否接住话题、补充信息或自然追问，让交流继续下去。" },
  { key: "problemSolving", label: "问题解决", description: "能否说明原因、协商安排，或提出下一步可行的做法。" },
];

function authHeaders() {
  const token = localStorage.getItem("yuyi_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
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

export default function ParentApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("report");
  const [linked, setLinked] = useState(null);
  const [child, setChild] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceOutput, setPracticeOutput] = useState(null);
  const [showParentDetails, setShowParentDetails] = useState(false);
  const [showDimensionGuide, setShowDimensionGuide] = useState(false);
  const [activeDimensionKey, setActiveDimensionKey] = useState(null);
  const [expandedGroupKey, setExpandedGroupKey] = useState(null);

  const activeDimension = homeDimensions.find((item) => item.key === activeDimensionKey);
  const recentSessionGroups = recentDateModuleGroups(summary?.recentThreeDaySessions || summary?.recentSessions || []);

  useEffect(() => {
    fetch(`${API_BASE}/api/parent/students`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.linked && data.child) {
          setLinked(true);
          setChild(data.child);
          loadSummary(data.child);
        } else {
          setLinked(false);
        }
      })
      .catch(() => setLinked(false))
      .finally(() => setLoadingInit(false));
  }, []);

  function loadSummary(c) {
    setSummary(null);
    setPracticeOutput(null);
    setShowParentDetails(false);
    setShowDimensionGuide(false);
    setActiveDimensionKey(null);
    setExpandedGroupKey(null);
    setLoadingSummary(true);
    fetch(`${API_BASE}/api/parent/student/${c.id}/summary`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setSummary(data))
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }

  async function linkChild() {
    const username = linkInput.trim();
    if (!username || linkLoading) return;
    setLinkLoading(true);
    setLinkError("");
    try {
      const res = await fetch(`${API_BASE}/api/parent/link-child`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ childUsername: username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "绑定失败");
      setLinked(true);
      setChild(data.child);
      setLinkInput("");
      loadSummary(data.child);
    } catch (e) {
      setLinkError(e.message);
    } finally {
      setLinkLoading(false);
    }
  }

  async function unlinkChild() {
    if (!window.confirm("确定解除与孩子账号的绑定吗？")) return;
    await fetch(`${API_BASE}/api/parent/unlink-child`, { method: "POST", headers: authHeaders() });
    setLinked(false);
    setChild(null);
    setSummary(null);
    setActiveTab("report");
  }

  async function generatePracticePlan() {
    if (practiceLoading || !summary) return;
    setPracticeLoading(true);
    try {
      const latestNote = summary.notes?.[0];
      const res = await fetch(`${API_BASE}/api/parent/practice`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          childName: summary.student?.name,
          weekReport: {
            totalSessions: summary.weekSessions,
            avgScore: summary.avgScore,
            bestModule: summary.bestModule,
          },
          latestFeedback: latestNote ? { homework: latestNote.homework } : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "生成失败");
      setPracticeOutput(data);
    } catch {
      setPracticeOutput({
        tip: "把支持放在日常对话里，每次只练一个小目标，保持轻松和可预期。",
        activities: [
          { title: "作业提醒小演练", desc: "用一分钟模拟老师提醒交作业，让孩子练习说明完成情况、原因和下一步安排。" },
          { title: "情绪回应小对话", desc: "家长说出一个低落或着急的情境，让孩子先说出对方可能的感受，再给一句支持性回应。" },
          { title: "家庭计划协商", desc: "围绕周末安排练习表达意愿、询问细节和礼貌确认，重点支持对话维持与问题解决。" },
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

  if (loadingInit) {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.topbar}>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>语依 · 家长支持端</div>
            <button style={styles.backBtn} onClick={() => navigate("/")}>切换身份</button>
          </div>
          <div style={{ ...styles.card, color: "#aab4c8" }}>加载中...</div>
        </div>
      </div>
    );
  }

  if (!linked) {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.topbar}>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>语依 · 家长支持端</div>
            <button style={styles.backBtn} onClick={() => navigate("/")}>切换身份</button>
          </div>
          <div style={{ maxWidth: "480px", margin: "60px auto" }}>
            <div style={styles.card}>
              <div style={{ fontSize: "40px", textAlign: "center", marginBottom: "16px" }}>👨‍👩‍👧</div>
              <h2 style={{ margin: "0 0 8px", textAlign: "center" }}>关联孩子的账号</h2>
              <p style={{ color: "#7584a3", lineHeight: 1.8, marginBottom: "20px", textAlign: "center" }}>
                输入孩子在学员端注册的<strong>用户名</strong>，即可查看他的测评报告和教师反馈。
              </p>
              <input
                value={linkInput}
                onChange={(e) => { setLinkInput(e.target.value); setLinkError(""); }}
                onKeyDown={(e) => e.key === "Enter" && linkChild()}
                placeholder="输入孩子的学员用户名"
                style={{ width: "100%", borderRadius: "14px", border: linkError ? "2px solid #d14b5a" : "1px solid #d9e2f0", padding: "14px", fontSize: "16px", boxSizing: "border-box", outline: "none", marginBottom: "12px" }}
              />
              {linkError && (
                <div style={{ color: "#d14b5a", fontSize: "14px", marginBottom: "12px" }}>{linkError}</div>
              )}
              <button
                style={{ ...styles.primaryBtn, width: "100%", padding: "14px", fontSize: "16px" }}
                onClick={linkChild}
              >
                {linkLoading ? "绑定中..." : "绑定账号"}
              </button>
              <div style={{ marginTop: "16px", color: "#aab4c8", fontSize: "13px", textAlign: "center" }}>
                孩子还没有账号？请让他先在学员端注册。
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>语依 · 家长支持端</div>
            <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>
              {child ? `查看：${child.name}（@${child.username}）` : "测评报告 · 教师反馈"}
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
            <button style={{ ...styles.backBtn, color: "#d14b5a", borderColor: "#f5c6c6" }} onClick={unlinkChild}>解除绑定</button>
            <button style={styles.backBtn} onClick={() => navigate("/")}>切换身份</button>
          </div>
        </div>

        {loadingSummary ? (
          <div style={{ ...styles.card, color: "#aab4c8" }}>加载中...</div>
        ) : !summary ? (
          <div style={{ ...styles.card, color: "#aab4c8" }}>暂无数据</div>
        ) : (
          <>
            {activeTab === "report" && (
              <div>
                <div style={styles.hero}>
                  <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px" }}>测评报告</div>
                  <div style={{ fontSize: "32px", fontWeight: 900, marginBottom: "4px" }}>
                    {summary.student.name} 的社会技能画像
                  </div>
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "18px" }}>
                    <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: "16px", padding: "14px 20px" }}>
                      <div style={{ fontSize: "12px", opacity: 0.85 }}>本周测评</div>
                      <div style={{ fontSize: "28px", fontWeight: 900 }}>{summary.weekSessions} 次</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: "16px", padding: "14px 20px" }}>
                      <div style={{ fontSize: "12px", opacity: 0.85 }}>累计测评</div>
                      <div style={{ fontSize: "28px", fontWeight: 900 }}>{summary.totalSessions} 次</div>
                    </div>
                    {summary.avgScore !== null && (
                      <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: "16px", padding: "14px 20px" }}>
                        <div style={{ fontSize: "12px", opacity: 0.85 }}>平均得分</div>
                        <div style={{ fontSize: "28px", fontWeight: 900 }}>{summary.avgScore} 分</div>
                      </div>
                    )}
                    {summary.bestModule && (
                      <div style={{ background: "rgba(255,255,255,0.22)", borderRadius: "16px", padding: "14px 20px" }}>
                        <div style={{ fontSize: "12px", opacity: 0.85 }}>最强模块</div>
                        <div style={{ fontSize: "22px", fontWeight: 900 }}>{summary.bestModule}</div>
                      </div>
                    )}
                  </div>
                </div>

                {summary.totalSessions === 0 ? (
                  <div style={styles.card}>
                    <div style={{ color: "#aab4c8", padding: "16px 0" }}>孩子还没有测评记录，可以先从标准化情境任务开始。</div>
                  </div>
                ) : (
                  <div style={styles.card}>
                    <div style={styles.sectionTitle}>能力与记录</div>
                    <button style={styles.secondaryBtn} onClick={() => setShowParentDetails((value) => !value)}>
                      {showParentDetails ? "收起能力与记录" : "查看能力与记录"}
                    </button>
                    {showParentDetails && (
                      <div style={{ display: "grid", gap: "18px", marginTop: "16px" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
                            <div style={styles.sectionTitle}>六维能力关注点</div>
                            <button style={{ ...styles.secondaryBtn, padding: "8px 12px", fontSize: "13px" }} onClick={() => setShowDimensionGuide((value) => !value)}>
                              {showDimensionGuide ? "收起维度说明" : "社会技能维度说明"}
                            </button>
                          </div>
                          {showDimensionGuide && (
                            <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
                              {homeDimensions.map((item) => (
                                <div key={item.key} style={{ background: "#f7f9fd", borderRadius: "12px", padding: "10px 12px", lineHeight: 1.7 }}>
                                  <strong>{item.label}</strong>：{item.description}
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
                            {homeDimensions.map((item) => (
                              <button
                                key={item.key}
                                style={{ border: activeDimensionKey === item.key ? "1px solid #f77f00" : "1px solid transparent", background: activeDimensionKey === item.key ? "#fff3e6" : "#f7f9fd", borderRadius: "14px", padding: "12px", color: "#1f2a44", fontWeight: 700, cursor: "pointer", textAlign: "left" }}
                                onClick={() => setActiveDimensionKey(item.key)}
                              >
                                <div>{item.label}</div>
                                <div style={{ marginTop: "6px", color: "#f77f00", fontWeight: 800 }}>{summary.dimensionScores?.[item.key] ?? "暂无"}{summary.dimensionScores?.[item.key] !== null && summary.dimensionScores?.[item.key] !== undefined ? " 分" : "得分"}</div>
                              </button>
                            ))}
                          </div>
                          {activeDimension && (
                            <div style={{ marginTop: "12px", background: "#fff8e6", borderRadius: "14px", padding: "14px", lineHeight: 1.75 }}>
                              <strong>{activeDimension.label}</strong>：{activeDimension.description}
                              <span style={{ marginLeft: "8px", color: "#f77f00", fontWeight: 800 }}>
                                当前平均：{summary.dimensionScores?.[activeDimension.key] ?? "暂无"}{summary.dimensionScores?.[activeDimension.key] !== null && summary.dimensionScores?.[activeDimension.key] !== undefined ? " 分" : ""}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={styles.sectionTitle}>各模块综合情况</div>
                          {summary.modules.map((mod) => (
                            <div key={mod.module} style={styles.row}>
                              <div>
                                <div style={{ fontWeight: 700 }}>{mod.moduleName}</div>
                                <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "2px" }}>{mod.sessions} 次记录</div>
                              </div>
                              <strong style={{ fontSize: "20px", color: "#f77f00" }}>{mod.avgScore} 分</strong>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
                            <div style={styles.sectionTitle}>近三日互动记录</div>
                            <div style={{ color: "#7584a3", fontSize: "13px" }}>仅展示评估摘要与家庭支持重点</div>
                          </div>
                          {recentSessionGroups.map((group) => (
                            <div key={group.date} style={{ marginTop: "16px" }}>
                              <div style={{ color: "#60708f", fontWeight: 800, fontSize: "14px", paddingBottom: "8px", borderBottom: "1px solid #edf1f7" }}>{group.date}</div>
                              {group.modules.map((moduleGroup) => {
                                const groupKey = `${group.date}-${moduleGroup.key}`;
                                const expanded = expandedGroupKey === groupKey;
                                const latest = moduleGroup.sessions[0];
                                return (
                                  <div key={groupKey} style={{ padding: "14px 0", borderBottom: "1px solid #edf1f7" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "14px", alignItems: "center" }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 800 }}>{moduleGroup.moduleName}{moduleGroup.scene ? ` · ${moduleGroup.scene}` : ""}</div>
                                        <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>{moduleGroup.sessions.length} 次互动 · 最新 {latest?.timestamp?.slice(11, 16) || "时间未标注"}</div>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <strong style={{ color: "#f77f00", whiteSpace: "nowrap" }}>{moduleGroup.averageScore} 分</strong>
                                        <button style={{ ...styles.secondaryBtn, padding: "8px 12px", fontSize: "13px" }} onClick={() => setExpandedGroupKey(expanded ? null : groupKey)}>
                                          {expanded ? "收起反馈" : "查看本组反馈"}
                                        </button>
                                      </div>
                                    </div>
                                    {expanded && (
                                      <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
                                        <div style={{ background: "#fff8e6", borderRadius: "14px", padding: "14px", lineHeight: 1.7 }}>
                                          <div style={styles.sectionTitle}>本组最近一次观察与支持建议</div>
                                          <div><strong>本次分析：</strong>{latest?.evidence || latest?.summary || "暂无分析"}</div>
                                          {latest?.strength && <div style={{ marginTop: "8px" }}><strong>已体现：</strong>{latest.strength}</div>}
                                          <div style={{ marginTop: "8px" }}><strong>家庭支持重点：</strong>{latest?.supportNeed || latest?.suggestion || "暂无单独建议"}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "feedback" && (
              <div style={{ maxWidth: "880px", margin: "0 auto", display: "grid", gap: "18px" }}>
                {summary.notes.length === 0 ? (
                  <div style={styles.card}>
                    <div style={{ color: "#aab4c8", padding: "16px 0" }}>教师暂未添加批注反馈</div>
                  </div>
                ) : (
                  summary.notes.map((note, idx) => (
                    <div key={idx} style={styles.card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <div style={{ fontWeight: 800, fontSize: "16px" }}>{note.teacherName} 的反馈</div>
                        <div style={{ color: "#7584a3", fontSize: "13px" }}>{note.timestamp?.slice(0, 10)}</div>
                      </div>
                      <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px", lineHeight: 1.8, marginBottom: "12px" }}>
                        {note.suggestion}
                      </div>
                      {note.homework && (
                        <div style={{ background: "#fff8e6", borderRadius: "14px", padding: "14px", lineHeight: 1.8, marginBottom: "12px" }}>
                          <span style={{ color: "#a07000", fontWeight: 700, fontSize: "13px" }}>家庭支持任务：</span>
                          {note.homework}
                        </div>
                      )}
                      {note.encouragement && (
                        <div style={{ background: "#e8f8f1", borderRadius: "14px", padding: "14px", lineHeight: 1.8 }}>
                          <span style={{ color: "#22a06b", fontWeight: 700, fontSize: "13px" }}>鼓励话语：</span>
                          {note.encouragement}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "practice" && (
              <div style={{ maxWidth: "880px", margin: "0 auto" }}>
                <div style={styles.card}>
                  <div style={styles.sectionTitle}>家庭支持建议</div>
                  <h2 style={{ marginTop: 0 }}>AI 生成家庭支持计划</h2>
                  <p style={{ color: "#60708f", lineHeight: 1.8 }}>
                    根据 {summary.student.name} 的测评数据和教师反馈，生成适合在家自然支持的活动建议。
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
                          <div style={{ fontWeight: 700, color: "#1f2a44", marginBottom: "6px" }}>{idx + 1}. {act.title}</div>
                          <div style={{ color: "#60708f", lineHeight: 1.8 }}>{act.desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
