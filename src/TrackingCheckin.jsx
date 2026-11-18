import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "./config";
import { beijingDateKey } from "../shared/time.js";
import {
  TRACKING_ITEMS,
  TRACKING_RESPONSE_OPTIONS,
  TRACKING_WINDOW_LABEL,
  emptyTrackingScores,
  lowestTrackedItem,
  trackingAverage,
} from "../shared/tracking.js";

export default function TrackingCheckin({ student, authHeaders, accentColor, observerLabel }) {
  const [records, setRecords] = useState([]);
  const [scores, setScores] = useState(emptyTrackingScores);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!student?.id) return undefined;
    let cancelled = false;

    async function requestRecords() {
      try {
        const response = await fetch(API_BASE + "/api/tracking/student/" + student.id, { headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "读取观察记录失败");
        if (!cancelled) setRecords(Array.isArray(data.records) ? data.records : []);
      } catch (error) {
        if (!cancelled) setNotice(error.message || "读取观察记录失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void requestRecords();
    return () => { cancelled = true; };
  }, [student?.id, authHeaders]);

  const answeredCount = TRACKING_ITEMS.filter((item) => Number.isFinite(Number(scores[item.key]))).length;
  const latest = records[0];
  const latestFocus = useMemo(() => lowestTrackedItem(latest?.scores), [latest]);

  async function submit() {
    if (!student?.id || saving) return;
    if (!answeredCount) {
      setNotice("请至少选择一项日常观察后再保存。");
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/api/tracking/student/${student.id}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ scores, note: note.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "保存失败");
      setRecords((current) => [data.record, ...current]);
      setScores(emptyTrackingScores());
      setNote("");
      setNotice("本次观察已保存。它会作为后续练习安排的参考。" );
    } catch (error) {
      setNotice(error.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const buttonStyle = (selected) => ({
    border: selected ? `1px solid ${accentColor}` : "1px solid #d9e2f0",
    background: selected ? accentColor : "#fff",
    color: selected ? "#fff" : "#4f5f7f",
    borderRadius: "9px",
    minWidth: "68px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
  });

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto", display: "grid", gap: "18px" }}>
      <section style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: "20px", padding: "20px", boxShadow: "0 8px 28px rgba(27,39,94,0.06)" }}>
        <div style={{ color: "#7584a3", fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>{observerLabel}观察</div>
        <h2 style={{ margin: "0 0 8px" }}>{TRACKING_WINDOW_LABEL}训练观察</h2>
        <p style={{ color: "#60708f", lineHeight: 1.75, margin: 0 }}>
          围绕日常交流中可观察到的表现填写。它用于追踪训练变化和安排支持，不是诊断量表，也不应用于诊断判断。
        </p>

        <div style={{ marginTop: "18px", borderTop: "1px solid #edf1f7" }}>
          {TRACKING_ITEMS.map((item) => (
            <div key={item.key} style={{ padding: "16px 0", borderBottom: "1px solid #edf1f7" }}>
              <div style={{ fontWeight: 800 }}>{item.label}</div>
              <div style={{ color: "#60708f", lineHeight: 1.65, fontSize: "14px", marginTop: "4px" }}>{item.prompt}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                {TRACKING_RESPONSE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    style={buttonStyle(Number(scores[item.key]) === option.value)}
                    onClick={() => setScores((current) => ({ ...current, [item.key]: option.value }))}
                  >
                    {option.label}
                  </button>
                ))}
                {scores[item.key] && (
                  <button
                    type="button"
                    onClick={() => setScores((current) => ({ ...current, [item.key]: null }))}
                    style={{ border: "none", background: "transparent", color: "#7584a3", padding: "8px", cursor: "pointer", fontSize: "13px" }}
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <label style={{ display: "grid", gap: "8px", marginTop: "18px" }}>
          <span style={{ fontWeight: 800 }}>补充观察（可选）</span>
          <textarea
            value={note}
            maxLength={400}
            onChange={(event) => setNote(event.target.value)}
            placeholder="例如：在晚饭时能主动说明学校发生的事，但遇到临时变化时仍需要提醒。"
            style={{ width: "100%", minHeight: "92px", boxSizing: "border-box", border: "1px solid #d9e2f0", borderRadius: "12px", padding: "12px", resize: "vertical", fontSize: "14px", fontFamily: "inherit" }}
          />
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "14px", flexWrap: "wrap" }}>
          <button type="button" disabled={saving} onClick={submit} style={{ border: "none", background: accentColor, color: "#fff", borderRadius: "10px", padding: "11px 16px", fontWeight: 800, cursor: "pointer" }}>
            {saving ? "保存中..." : "保存本次观察"}
          </button>
          <span style={{ color: "#7584a3", fontSize: "13px" }}>已填写 {answeredCount}/{TRACKING_ITEMS.length} 项</span>
          {notice && <span style={{ color: notice.includes("失败") || notice.includes("请至少") ? "#c54b5b" : "#2f7d5c", fontSize: "14px" }}>{notice}</span>}
        </div>
      </section>

      <section style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: "20px", padding: "20px", boxShadow: "0 8px 28px rgba(27,39,94,0.06)" }}>
        <div style={{ color: "#7584a3", fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>长期记录</div>
        {loading ? (
          <div style={{ color: "#7584a3" }}>正在读取观察记录...</div>
        ) : records.length ? (
          <div style={{ display: "grid", gap: "14px" }}>
            {latest && (
              <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px", lineHeight: 1.75 }}>
                <strong>最近一次：{beijingDateKey(latest.timestamp, "时间未标注")}</strong>
                <span style={{ marginLeft: "10px", color: accentColor, fontWeight: 800 }}>平均 {trackingAverage(latest.scores) ?? "-"}/5</span>
                {latestFocus && <div style={{ marginTop: "8px", color: "#4f5f7f" }}>可优先练习：{latestFocus.label}。{latestFocus.support}</div>}
              </div>
            )}
            {records.slice(0, 6).map((record) => (
              <div key={record.id} style={{ paddingBottom: "12px", borderBottom: "1px solid #edf1f7", lineHeight: 1.7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" }}>
                  <strong>{beijingDateKey(record.timestamp, "时间未标注")}</strong>
                  <span style={{ color: accentColor, fontWeight: 800 }}>平均 {trackingAverage(record.scores) ?? "-"}/5</span>
                </div>
                {record.note && <div style={{ color: "#60708f", marginTop: "5px" }}>观察：{record.note}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#7584a3", lineHeight: 1.75 }}>还没有观察记录。连续每两周填写一次，比单次分数更适合看训练过程中的变化。</div>
        )}
      </section>
    </div>
  );
}
