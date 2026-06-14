const storageKey = "futsalTrainingApp.v1";

const initialState = {
  nextMenu: "A",
  history: [],
  exercises: {
    "ベンチプレス": { menu: "A", weight: 55, reps: 6, sets: 3, unit: "kg", streak: 1 },
    "ブルガリアンスクワット": { menu: "A", weight: 16, reps: 8, sets: 3, unit: "kg", streak: 0 },
    "ジャンピングスクワット": { menu: "A", weight: 16, reps: 8, sets: 3, unit: "kg", streak: 0, jump: true },
    "フェイスプル": { menu: "A", weight: 32.5, reps: 6, sets: 3, unit: "kg", streak: 1 },
    "シーテッドロー": { menu: "A", weight: 35, reps: 6, sets: 3, unit: "kg", streak: 1 },
    "ラットプルダウン": { menu: "B", weight: 68, reps: 8, sets: 3, unit: "kg", streak: 1, next: { weight: 70, reps: 6, sets: 3 } },
    RDL: { menu: "B", weight: 85, reps: 6, sets: 2, unit: "kg", streak: 0, next: { weight: 85, reps: 6, sets: 3 } },
    "レッグプレス": { menu: "B", weight: 170, reps: 6, sets: 3, unit: "kg", streak: 1, next: { weight: 170, reps: 7, sets: 3 } },
    "カーフレイズ（加重）": { menu: "B", weight: 20, reps: 10, sets: 3, unit: "kg", streak: 0 },
    "シーテッドレッグカール": { menu: "B", weight: 68, reps: 8, sets: 3, unit: "kg", streak: 0 },
    "コペンハーゲンプランク": { menu: "A", weight: 0, reps: 20, sets: 2, unit: "秒", streak: 0 },
    "チビアリスレイズ": { menu: "B", weight: 0, reps: 15, sets: 2, unit: "回", streak: 0 },
    "スペインスクワット": { menu: "A", weight: 0, reps: 30, sets: 3, unit: "秒", streak: 0, status: "代替" }
  }
};

const order = {
  A: ["ベンチプレス", "ブルガリアンスクワット", "ジャンピングスクワット", "フェイスプル", "シーテッドロー"],
  B: ["ラットプルダウン", "RDL", "レッグプレス", "カーフレイズ（加重）", "シーテッドレッグカール"]
};

const changeIdeas = {
  "ベンチプレス": "ダンベルベンチプレス",
  "ブルガリアンスクワット": "ステップアップ",
  "ジャンピングスクワット": "メディシンボールスクワットスロー",
  "フェイスプル": "リアデルトフライ",
  "シーテッドロー": "チェストサポートロー",
  "ラットプルダウン": "片手ラットプルダウン",
  RDL: "ヒップスラスト",
  "レッグプレス": "ハックスクワット",
  "カーフレイズ（加重）": "片脚カーフレイズ",
  "シーテッドレッグカール": "ノルディックカール補助",
  "コペンハーゲンプランク": "サイドプランク内転筋レイズ",
  "チビアリスレイズ": "バンド足関節背屈",
  "スペインスクワット": "スプリットスクワットアイソメトリック"
};

const alternatives = {
  knee: { "ジャンピングスクワット": "スペインスクワット" },
  support: { A: "コペンハーゲンプランク", B: "チビアリスレイズ" }
};

let state = loadState();
let selectedMenu = state.nextMenu;

const els = {
  menuA: document.querySelector("#menuA"),
  menuB: document.querySelector("#menuB"),
  todayMenu: document.querySelector("#todayMenu"),
  fatigue: document.querySelector("#fatigueToggle"),
  knee: document.querySelector("#kneeToggle"),
  notice: document.querySelector("#notice"),
  list: document.querySelector("#workoutList"),
  completeAll: document.querySelector("#completeAll"),
  savePartial: document.querySelector("#savePartial"),
  history: document.querySelector("#historyList"),
  reset: document.querySelector("#resetData"),
  aiMemo: document.querySelector("#aiMemo"),
  copyAiMemo: document.querySelector("#copyAiMemo")
};

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return structuredClone(initialState);
  try {
    const saved = JSON.parse(raw);
    const base = structuredClone(initialState);
    const merged = { ...base, ...saved, exercises: { ...base.exercises, ...saved.exercises } };
    Object.entries(merged.exercises).forEach(([name, exercise]) => {
      const initial = base.exercises[name] || {};
      exercise.streak = Number(exercise.streak || 0);
      exercise.missStreak = Number(exercise.missStreak || 0);
      exercise.totalSessions = Number(exercise.totalSessions || 0);
      exercise.weeksOnMenu = Number(exercise.weeksOnMenu || 0);
      exercise.status = exercise.status || "実施中";
      exercise.unit = exercise.unit || initial.unit || "kg";
    });
    return merged;
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function formatPlan(item) {
  const unit = item.unit || "kg";
  if (unit === "秒") return `${item.reps}秒 × ${item.sets}セット`;
  if (unit === "回" && !item.weight) return `${item.reps}回 × ${item.sets}セット`;
  return `${item.weight}${unit} × ${item.reps}回 × ${item.sets}セット`;
}

function adjustedExercise(name) {
  if (els.knee.checked && alternatives.knee[name]) {
    const replacementName = alternatives.knee[name];
    return { name: replacementName, ...state.exercises[replacementName], replaces: name, recordKey: replacementName };
  }
  const item = { name, ...state.exercises[name], recordKey: name };
  if (els.fatigue.checked) item.sets = Math.max(2, item.sets - 1);
  return item;
}

function getWorkout() {
  const main = order[selectedMenu].map(adjustedExercise);
  const supportName = alternatives.support[selectedMenu];
  const support = [{ name: supportName, ...state.exercises[supportName], support: true, recordKey: supportName }];
  return [...main, ...support];
}

function getExerciseDecision(name) {
  const exercise = state.exercises[name];
  if (!exercise) return { streak: 0, kind: "", label: "記録対象外" };
  const streak = Math.min(exercise.streak || 0, 3);
  if ((exercise.missStreak || 0) >= 4 || (exercise.weeksOnMenu || 0) >= 8) {
    return { streak, kind: "change", label: `変更候補：${changeIdeas[name] || "代替種目を検討"}` };
  }
  if ((exercise.missStreak || 0) > 0) return { streak, kind: "retry", label: "次回：同条件で再挑戦" };
  if ((exercise.streak || 0) >= 3 || exercise.next) {
    const next = { ...(exercise.next || { weight: exercise.weight, reps: exercise.reps + 1, sets: exercise.sets }), unit: exercise.unit };
    return { streak, kind: "ready", label: `次回チャレンジ：${formatPlan(next)}` };
  }
  return { streak, kind: "", label: "次回：同条件で継続" };
}

function getUpgradeCandidate() {
  const candidateName = order[selectedMenu].find((name) => {
    const exercise = state.exercises[name];
    return exercise.streak >= 3 || exercise.next;
  });
  if (!candidateName) return null;
  const exercise = state.exercises[candidateName];
  return { name: candidateName, next: { ...(exercise.next || { weight: exercise.weight, reps: exercise.reps + 1, sets: exercise.sets }), unit: exercise.unit } };
}

function render() {
  els.todayMenu.textContent = `${selectedMenu}メニュー`;
  els.menuA.classList.toggle("active", selectedMenu === "A");
  els.menuB.classList.toggle("active", selectedMenu === "B");

  const messages = [];
  if (els.fatigue.checked) messages.push("疲労ありのため、メイン種目はセット数を少し下げます。");
  if (els.knee.checked) messages.push("膝痛ありのため、ジャンプ系は外して膝補強に置き換えます。");
  const upgrade = getUpgradeCandidate();
  if (upgrade) messages.unshift(`${upgrade.name}は安定しているため、次回は${formatPlan(upgrade.next)}に挑戦候補です。`);
  els.notice.hidden = messages.length === 0;
  els.notice.textContent = messages.join(" ");

  els.list.innerHTML = "";
  getWorkout().forEach((item, index) => {
    const decision = getExerciseDecision(item.recordKey || item.name);
    const row = document.createElement("article");
    row.className = "exercise";
    row.dataset.name = item.name;
    row.dataset.original = item.recordKey || item.name;
    row.innerHTML = `
      <div class="exercise-info">
        <div class="exercise-name">${item.name}</div>
        <div class="exercise-meta">${item.replaces ? `${item.replaces}から変更` : formatPlan(item)}</div>
        <div class="growth">
          <span class="pill ${decision.kind}">連続達成 ${decision.streak}/3</span>
          <span class="pill ${decision.kind}">${decision.label}</span>
        </div>
      </div>
      <div class="fields">
        <label class="field"><span>重量</span><input inputmode="decimal" value="${item.weight}" aria-label="${item.name} 重量"></label>
        <label class="field"><span>${item.unit === "秒" ? "秒数" : "回数"}</span><input inputmode="numeric" value="${item.reps}" aria-label="${item.name} 回数"></label>
        <label class="field"><span>セット</span><input inputmode="numeric" value="${item.sets}" aria-label="${item.name} セット"></label>
        <label class="field"><span>単位</span><input value="${item.unit}" aria-label="${item.name} 単位"></label>
      </div>
      <label class="done" title="達成"><input type="checkbox" ${index < order[selectedMenu].length ? "checked" : ""} aria-label="${item.name} 達成"></label>
    `;
    els.list.appendChild(row);
  });
  renderHistory();
  renderAiMemo();
}

function readRows(forceComplete = false) {
  return [...document.querySelectorAll(".exercise")].map((row) => {
    const inputs = row.querySelectorAll("input");
    return {
      name: row.dataset.name,
      original: row.dataset.original,
      weight: Number(inputs[0].value) || 0,
      reps: Number(inputs[1].value) || 0,
      sets: Number(inputs[2].value) || 0,
      unit: inputs[3].value || "kg",
      done: forceComplete || inputs[4].checked
    };
  });
}

function record(forceComplete) {
  const rows = readRows(forceComplete);
  rows.forEach((row) => {
    const target = state.exercises[row.original];
    if (!target) return;
    const sameCondition = target.weight === row.weight && target.reps === row.reps && target.sets === row.sets;
    target.totalSessions = (target.totalSessions || 0) + 1;
    target.weeksOnMenu = (target.weeksOnMenu || 0) + 1;
    if (row.done) {
      target.weight = row.weight;
      target.reps = row.reps;
      target.sets = row.sets;
      target.unit = row.unit;
      target.streak = sameCondition ? (target.streak || 0) + 1 : 1;
      target.missStreak = 0;
    } else {
      target.missStreak = (target.missStreak || 0) + 1;
    }
  });
  const now = new Date();
  const doneCount = rows.filter((row) => row.done).length;
  state.history.unshift({
    date: now.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
    menu: selectedMenu,
    done: doneCount,
    total: rows.length,
    flags: [els.fatigue.checked ? "疲労" : "", els.knee.checked ? "膝痛" : ""].filter(Boolean)
  });
  state.history = state.history.slice(0, 8);
  state.nextMenu = selectedMenu === "A" ? "B" : "A";
  selectedMenu = state.nextMenu;
  els.fatigue.checked = false;
  els.knee.checked = false;
  saveState();
  render();
}

function renderHistory() {
  els.history.innerHTML = "";
  if (state.history.length === 0) {
    const li = document.createElement("li");
    li.textContent = "まだ記録はありません。";
    els.history.appendChild(li);
    return;
  }
  state.history.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.date} ${item.menu}メニュー</strong> ${item.done}/${item.total}達成${item.flags.length ? ` ・ ${item.flags.join("・")}` : ""}`;
    els.history.appendChild(li);
  });
}

function renderAiMemo() {
  els.aiMemo.value = buildAiMemo();
}

function buildAiMemo() {
  const lines = [
    "現在の筋トレ記録です。次回メニューと強度調整を判断してください。",
    "",
    "ユーザー方針：",
    "- 24歳男性、171cm、60kg、アマチュアフットサル選手",
    "- 目的：競技力向上、体型維持、後半でも動ける脚、膝痛予防、切り返し能力向上",
    "- 上半身は維持寄り、下半身と補強を競技力優先",
    "- 疲労や痛みがある場合はボリュームを下げる",
    "- 膝痛がある場合はジャンプ系を外し、スペインスクワットや補強に置き換える",
    "",
    `次回予定：${state.nextMenu}メニュー`,
    "",
    "種目別ステータス："
  ];
  Object.entries(order).forEach(([menu, names]) => {
    lines.push("", `${menu}メニュー：`);
    [...names, alternatives.support[menu]].forEach((name) => {
      const exercise = state.exercises[name];
      const decision = getExerciseDecision(name);
      lines.push(`- ${name}：${formatPlan(exercise)} / 連続達成${exercise.streak || 0}/3 / 未達連続${exercise.missStreak || 0} / ${decision.label}`);
    });
  });
  const spanish = state.exercises["スペインスクワット"];
  lines.push("", `膝痛時の代替：スペインスクワット：${formatPlan(spanish)} / 連続達成${spanish.streak || 0}/3 / 未達連続${spanish.missStreak || 0}`);
  lines.push("", "直近ログ：");
  if (state.history.length === 0) lines.push("- まだ記録なし");
  else state.history.slice(0, 6).forEach((item) => lines.push(`- ${item.date} ${item.menu}メニュー ${item.done}/${item.total}達成${item.flags.length ? `（${item.flags.join("・")}）` : ""}`));
  lines.push("", "AIへの依頼：", "- 今日のメニューのみ簡潔に提示", "- 強度変更がある場合のみ理由を一言", "- 変更候補は1種目だけ提案", "- JSON出力は不要");
  return lines.join("\n");
}

els.menuA.addEventListener("click", () => { selectedMenu = "A"; render(); });
els.menuB.addEventListener("click", () => { selectedMenu = "B"; render(); });
els.fatigue.addEventListener("change", render);
els.knee.addEventListener("change", render);
els.completeAll.addEventListener("click", () => record(true));
els.savePartial.addEventListener("click", () => record(false));
els.reset.addEventListener("click", () => {
  state = structuredClone(initialState);
  selectedMenu = state.nextMenu;
  saveState();
  render();
});
els.copyAiMemo.addEventListener("click", async () => {
  els.aiMemo.select();
  try { await navigator.clipboard.writeText(els.aiMemo.value); }
  catch { document.execCommand("copy"); }
  els.copyAiMemo.textContent = "コピー済み";
  els.copyAiMemo.classList.add("copied");
  window.setTimeout(() => {
    els.copyAiMemo.textContent = "コピー";
    els.copyAiMemo.classList.remove("copied");
  }, 1400);
});

render();
