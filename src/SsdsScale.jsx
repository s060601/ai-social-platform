import { useEffect, useState } from "react";
import { API_BASE } from "./config";
import { beijingDateKey } from "../shared/time.js";
import {
  SSDS_FACTORS,
  SSDS_ITEMS,
  SSDS_RESPONSE_OPTIONS,
  SSDS_VERSION,
  SSDS_WINDOW_LABEL,
  scoreSsds,
  ssdsItemCount,
} from "../shared/ssds.js";

const pageRanges = [
  [1, 9],
  [10, 26],
  [27, 43],
  [44, 58],
  [59, 71],
];

function draftKey(studentId) {
  return "yuyi_ssds_draft:" + (studentId || "unknown");
}

function readDraft(studentId) {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey(studentId)) || "{}");
    return draft && typeof draft === "object" ? draft : {};
  } catch {
    return {};
  }
}

export default function SsdsScale({ student, authHeaders, onSaved }) {
  const [answers, setAnswers] = useState(() => readDraft(student?.id).answers || {});
  const [languageMode, setLanguageMode] = useState(() => readDraft(student?.id).languageMode || "verbal");
  const [relationship, setRelationship] = useState(() => readDraft(student?.id).relationship || "家长/照护者");
  const [page, setPage] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const itemCount = ssdsItemCount(languageMode);
  const activeRanges = languageMode === "nonverbal" ? pageRanges.slice(0, 4) : pageRanges;
  const activeRange = activeRanges[page] || activeRanges[0];
  const visibleItems = SSDS_ITEMS.filter((item) => item.number >= activeRange[0] && item.number <= activeRange[1]);
  const answeredCount = Array.from({ length: itemCount }, (_, index) => Number(answers[index + 1]))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5).length;
  const draftScore = scoreSsds(answers, languageMode);
  const latest = records[0];

  useEffect(() => {
    localStorage.setItem(draftKey(student?.id), JSON.stringify({ answers, languageMode, relationship }));
  }, [answers, languageMode, relationship, student?.id]);

  useEffect(() => {
    if (!student?.id) return undefined;
    let cancelled = false;

    async function requestRecords() {
      try {
        const response = await fetch(API_BASE + "/api/parent/student/" + student.id + "/ssds", { headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "读取 SSDS 记录失败");
        if (!cancelled) setRecords(Array.isArray(data.records) ? data.records : []);
      } catch (error) {
        if (!cancelled) setNotice(error.message || "读取 SSDS 记录失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void requestRecords();
    return () => { cancelled = true; };
  }, [student?.id, authHeaders]);

  function chooseLanguageMode(nextMode) {
    setLanguageMode(nextMode);
    setPage((current) => Math.min(current, nextMode === "nonverbal" ? 3 : 4));
  }

  function changeAnswer(number, value) {
    setAnswers((current) => ({ ...current, [number]: value }));
    setNotice("");
  }

  async function submit() {
    if (saving) return;
    const missing = Array.from({ length: itemCount }, (_, index) => index + 1)
      .filter((number) => !Number.isInteger(Number(answers[number])) || Number(answers[number]) < 1 || Number(answers[number]) > 5);
    if (missing.length) {
      const missingPage = activeRanges.findIndex(([start, end]) => missing[0] >= start && missing[0] <= end);
      setPage(Math.max(0, missingPage));
      setNotice("请先完成第 " + missing[0] + " 题，再保存。");
      return;
    }
    if (!acknowledged) {
      setNotice("请确认你是按过去四周的一般表现填写。");
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(API_BASE + "/api/parent/student/" + student.id + "/ssds", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ answers, languageMode, relationship: relationship.trim(), acknowledged: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "保存 SSDS 失败");
      setRecords((current) => [data.record, ...current]);
      localStorage.removeItem(draftKey(student?.id));
      setAnswers({});
      setAcknowledged(false);
      setPage(0);
      setNotice("SSDS 已保存。结果用于追踪社会行为表现，不用于诊断。");
      onSaved?.(data.record);
    } catch (error) {
      setNotice(error.message || "保存 SSDS 失败");
    } finally {
      setSaving(false);
    }
  }

  const optionStyle = (selected) => ({
    border: selected ? "1px solid #f77f00" : "1px solid #d9e2f0",
    background: selected ? "#f77f00" : "#fff",
    color: selected ? "#fff" : "#4f5f7f",
    borderRadius: "9px",
    padding: "8px 11px",
    minWidth: "58px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
  });

  return (
    <div style={{ maxWidth: "920px", margin: "0 auto", display: "grid", gap: "18px" }}>
      <section style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: "20px", padding: "20px", boxShadow: "0 8px 28px rgba(27,39,94,0.06)" }}>
        <div style={{ color: "#7584a3", fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>家长/照护者量表</div>
        <h2 style={{ margin: "0 0 8px" }}>SSDS 1.0 斯坦福社会维度量表</h2>
        <div style={{ color: "#60708f", lineHeight: 1.75, fontSize: "14px" }}>
          请根据 {SSDS_WINDOW_LABEL} 的一般社交行为填写，而不仅是表现最好或最差的日子。每题选择从不至总是的一个选项。
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
          <button type="button" onClick={() => chooseLanguageMode("verbal")} style={optionStyle(languageMode === "verbal")}>有言语：1-71 题</button>
          <button type="button" onClick={() => chooseLanguageMode("nonverbal")} style={optionStyle(languageMode === "nonverbal")}>无言语：1-58 题</button>
        </div>
        <div style={{ marginTop: "10px", background: "#fff8e6", borderRadius: "12px", padding: "11px 13px", color: "#7a5a20", fontSize: "13px", lineHeight: 1.7 }}>
          原量表说明：若被评定对象没有言语，请在第 58 题后停止作答。该量表用于研究或临床追踪，不用于诊断或筛查。
        </div>
        <label style={{ display: "grid", gap: "7px", marginTop: "14px", maxWidth: "280px", color: "#4f5f7f", fontSize: "14px", fontWeight: 700 }}>
          与被评定对象的关系
          <input value={relationship} onChange={(event) => setRelationship(event.target.value)} maxLength={80} style={{ border: "1px solid #d9e2f0", borderRadius: "10px", padding: "10px", font: "inherit" }} />
        </label>
      </section>

      <section style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: "20px", padding: "20px", boxShadow: "0 8px 28px rgba(27,39,94,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#7584a3", fontSize: "13px", fontWeight: 700 }}>SSDS 填写</div>
            <div style={{ fontWeight: 800, marginTop: "4px" }}>第 {activeRange[0]}-{activeRange[1]} 题</div>
          </div>
          <div style={{ color: "#f77f00", fontWeight: 800, fontSize: "14px" }}>已完成 {answeredCount}/{itemCount} 题</div>
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "14px" }}>
          {activeRanges.map((range, index) => (
            <button key={range[0]} type="button" onClick={() => setPage(index)} aria-label={"前往第 " + range[0] + " 至 " + range[1] + " 题"} style={{ height: "7px", flex: 1, border: "none", borderRadius: "999px", cursor: "pointer", background: index === page ? "#f77f00" : "#e8edf5" }} />
          ))}
        </div>

        <div style={{ marginTop: "14px" }}>
          {visibleItems.map((item) => (
            <div key={item.number} style={{ padding: "17px 0", borderBottom: "1px solid #edf1f7" }}>
              <div style={{ display: "flex", gap: "10px", lineHeight: 1.7 }}>
                <strong style={{ color: "#f77f00", minWidth: "24px" }}>{item.number}.</strong>
                <div style={{ fontWeight: 700 }}>{item.text}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px", marginLeft: "34px" }}>
                {SSDS_RESPONSE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => changeAnswer(item.number, option.value)} style={optionStyle(Number(answers[item.number]) === option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "18px", flexWrap: "wrap" }}>
          <button type="button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} style={{ border: "1px solid #d9e2f0", background: "#fff", color: "#4f5f7f", borderRadius: "10px", padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}>上一组</button>
          {page < activeRanges.length - 1 ? (
            <button type="button" onClick={() => setPage((current) => Math.min(activeRanges.length - 1, current + 1))} style={{ border: "none", background: "#f77f00", color: "#fff", borderRadius: "10px", padding: "10px 14px", cursor: "pointer", fontWeight: 800 }}>下一组</button>
          ) : (
            <div style={{ width: "1px" }} />
          )}
        </div>

        {page === activeRanges.length - 1 && (
          <div style={{ marginTop: "20px", borderTop: "1px solid #edf1f7", paddingTop: "16px" }}>
            <label style={{ display: "flex", gap: "9px", alignItems: "flex-start", color: "#4f5f7f", lineHeight: 1.6, fontSize: "14px" }}>
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} style={{ marginTop: "4px" }} />
              <span>我确认已按过去四周或自上次见面以来的一般表现完成填写，而不是只参考最好或最差的日子。</span>
            </label>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "14px" }}>
              <button type="button" disabled={saving} onClick={submit} style={{ border: "none", background: "#f77f00", color: "#fff", borderRadius: "10px", padding: "11px 16px", cursor: "pointer", fontWeight: 800 }}>
                {saving ? "保存中..." : "保存 SSDS 结果"}
              </button>
              {notice && <span style={{ color: notice.includes("失败") || notice.includes("请") ? "#c54b5b" : "#2f7d5c", fontSize: "14px" }}>{notice}</span>}
            </div>
          </div>
        )}
      </section>

      <section style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: "20px", padding: "20px", boxShadow: "0 8px 28px rgba(27,39,94,0.06)" }}>
        <div style={{ color: "#7584a3", fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>SSDS 结果记录</div>
        {loading ? (
          <div style={{ color: "#7584a3" }}>正在读取 SSDS 记录...</div>
        ) : latest ? (
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ background: "#fff8e6", borderRadius: "14px", padding: "14px", lineHeight: 1.7 }}>
              <strong>最近一次：{beijingDateKey(latest.timestamp, "时间未标注")}</strong>
              <span style={{ marginLeft: "10px", color: "#f77f00", fontWeight: 800 }}>总分 {latest.scores.total}/{latest.scores.max}</span>
              <div style={{ color: "#60708f", fontSize: "14px", marginTop: "5px" }}>每题平均 {latest.scores.average}/5 · {latest.scores.itemCount} 题 · {latest.languageMode === "nonverbal" ? "无言语作答" : "有言语作答"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
              {SSDS_FACTORS.map((factor) => {
                const score = latest.scores.factors?.[factor.key];
                return (
                  <div key={factor.key} style={{ background: "#f7f9fd", borderRadius: "12px", padding: "12px" }}>
                    <div style={{ color: "#60708f", fontSize: "13px" }}>{factor.label}</div>
                    <div style={{ fontSize: "20px", color: "#f77f00", fontWeight: 800, marginTop: "4px" }}>{score?.score ?? "-"}/{score?.max ?? "-"}</div>
                    <div style={{ color: "#7584a3", fontSize: "12px", marginTop: "3px" }}>题组平均 {score?.average ?? "-"}/5</div>
                  </div>
                );
              })}
            </div>
            <div style={{ color: "#60708f", fontSize: "13px", lineHeight: 1.7 }}>这些是原始得分记录，适合和同一人后续按相同条件完成的 SSDS 结果纵向比较；本系统不提供诊断或常模判断。</div>
          </div>
        ) : (
          <div style={{ color: "#7584a3", lineHeight: 1.7 }}>尚无已保存的 SSDS 结果。完成并保存一次后，这里会保留本次原始得分和五个官方分量表。</div>
        )}
        {draftScore && (
          <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "14px" }}>当前草稿已完整，可以保存。草稿总分：{draftScore.total}/{draftScore.max}</div>
        )}
      </section>

      <div style={{ color: "#7584a3", fontSize: "12px", lineHeight: 1.65, padding: "0 4px" }}>
        量表：Stanford Social Dimensions Scale (SSDS) 1.0，{SSDS_VERSION}。题目、顺序与反向计分按原版保留；使用条件请参见 Stanford SSDS 官方说明。
      </div>
    </div>
  );
}
