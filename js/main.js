// ==================== DOM 取得 ====================

const dropdown = document.querySelector(".dropdown");
const dropdownToggle = document.querySelector(".dropdown-toggle");
const dropdownMenuButtons = document.querySelectorAll(".dropdown-menu button");

const titleEl = document.getElementById("current-part-title");
const descEl = document.getElementById("current-part-desc");
const gridEl = document.getElementById("exercise-grid");
const startBtn = document.getElementById("start-training-btn");
const rerollBtn = document.getElementById("reroll-btn");

// 一週菜單
const daysInput = document.getElementById("days-input");
const generatePlanBtn = document.getElementById("generate-plan-btn");
const planResultEl = document.getElementById("plan-result");

// 飲食建議
const goalSelect = document.getElementById("goal-select");
const weightInput = document.getElementById("weight-input");
const activitySelect = document.getElementById("activity-select");
const generateNutritionBtn = document.getElementById("generate-nutrition-btn");
const nutritionResultEl = document.getElementById("nutrition-result");

// 導覽列按鈕
const navPlanBtn = document.getElementById("nav-plan-btn");
const navNutritionBtn = document.getElementById("nav-nutrition-btn");

let currentCategory = "";
let allExercises = [];

// ==================== 部位說明 ====================

const partInfo = {
  chest: {
    title: "胸部訓練（Chest）",
    desc: "胸部主要訓練胸大肌與前束三角肌，搭配推的動作與夾胸類訓練最有效。"
  },
  back: {
    title: "背部訓練（Back）",
    desc: "背部訓練可改善體態，包含划船、高位下拉、引體向上等動作。"
  },
  triceps: {
    title: "三頭肌訓練（Triceps）",
    desc: "負責手臂伸直，透過下壓、伸展類動作可有效刺激。"
  },
  biceps: {
    title: "二頭肌訓練（Biceps）",
    desc: "負責手肘彎曲，透過各種彎舉動作可增強二頭肌。"
  },
  legs: {
    title: "腿部訓練（Legs）",
    desc: "深蹲、硬舉、腿推等動作能有效刺激腿部與臀部的力量。"
  },
  shoulders: {
    title: "肩膀訓練（Shoulders）",
    desc: "肩膀訓練可打造更寬的上半身外型，包含推舉與抬舉類動作。"
  },
  core: {
    title: "核心訓練（Core）",
    desc: "核心包含腹肌與深層穩定肌群，有助於提升全身力量與平衡。"
  }
};

// ==================== 排除與優先規則 ====================

const bannedByCategory = {
  chest: ["high style scapula push-up", "scapula push-up"],
  back: ["inverted row bent knees", "barbell incline row"],
  triceps: ["handstand"],
  legs: [
    "squat on bosu ball",
    "bosu ball",
    "assisted prone lying quads stretch",
    "lying (side) quads stretch",
    "lying side quads stretch"
  ],
  core: ["barbell press sit-up", "barbell press sit up", "sledge hammer"]
};

const preferredByCategory = {
  chest: ["bench press", "press", "push up", "push-up", "fly"],
  back: ["lat pulldown", "pull-down", "pulldown", "row", "deadlift"],
  triceps: ["triceps", "dumbbell", "extension", "pushdown", "skullcrusher"],
  biceps: ["curl", "biceps", "dumbbell"],
  legs: ["squat", "deadlift", "leg press", "hack squat", "lunge", "machine"],
  shoulders: ["press", "overhead", "lateral raise", "face pull"],
  core: ["plank", "crunch", "leg raise", "twist", "sit-up", "sit up"]
};

// 一週菜單使用的主要分類
const mainCategories = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "triceps",
  "biceps",
  "core"
];

// ==================== 讀取資料 ====================

async function loadExercises() {
  try {
    const res = await fetch("data/exercises.json"); // 這裡是你清理後的檔案
    const json = await res.json();
    allExercises = json.data || [];
  } catch (err) {
    console.error("載入資料錯誤：", err);
    if (gridEl) {
      gridEl.innerHTML = "<p>資料載入失敗，請確認 JSON 是否存在。</p>";
    }
  }
}

// ==================== 動作篩選邏輯 ====================

function filterByCategory(category) {
  return allExercises.filter((ex) => {
    const parts = ex.bodyParts || [];
    const targets = ex.targetMuscles || [];

    switch (category) {
      case "chest":
        return (
          parts.includes("chest") ||
          targets.some((t) =>
            t.toLowerCase().includes("chest") ||
            t.toLowerCase().includes("pectoral")
          )
        );

      case "back":
        return parts.includes("back");

      case "triceps":
        return targets.some((t) => t.toLowerCase().includes("triceps"));

      case "biceps":
        return targets.some((t) => t.toLowerCase().includes("biceps"));

      case "legs":
        return (
          parts.includes("upper legs") ||
          parts.includes("lower legs") ||
          targets.some((t) =>
            ["quads", "quadriceps", "hamstrings", "glutes", "calves"].some(
              (k) => t.toLowerCase().includes(k)
            )
          )
        );

      case "shoulders":
        return (
          parts.includes("shoulders") ||
          targets.some((t) =>
            ["shoulder", "delts", "deltoid"].some((k) =>
              t.toLowerCase().includes(k)
            )
          )
        );

      case "core":
        return (
          parts.includes("waist") ||
          targets.some((t) =>
            ["abs", "abdominals", "obliques", "core"].some((k) =>
              t.toLowerCase().includes(k)
            )
          )
        );

      default:
        return false;
    }
  });
}

function sortAndFilter(list, category) {
  const banned = bannedByCategory[category] || [];
  const preferred = preferredByCategory[category] || [];

  const cleanList = list.filter((ex) => {
    const name = ex.name.toLowerCase();
    return !banned.some((b) => name.includes(b.toLowerCase()));
  });

  const preferredList = cleanList.filter((ex) =>
    preferred.some((p) => ex.name.toLowerCase().includes(p.toLowerCase()))
  );

  const others = cleanList.filter((ex) => !preferredList.includes(ex));

  return [...preferredList, ...others];
}

// ==================== 圖片處理（GIF → PNG Fallback） ====================

function generateImageTag(ex, extraClass = "") {
  const gifUrl = ex.gifUrl;
  const pngUrl = `https://static.exercisedb.dev/api/images/${ex.exerciseId}.png`;
  const fallbackUrl = "img/no-image.png";

  // 沒 gifUrl 直接用 PNG
  if (!gifUrl) {
    return `
      <img
        class="${extraClass}"
        src="${pngUrl}"
        alt="${ex.name}"
        loading="lazy"
        onerror="
          this.onerror = null;
          this.src = '${fallbackUrl}';
        "
      >
    `;
  }

  // 先試 GIF → 失敗改 PNG → 再失敗用預設圖
  return `
    <img
      class="${extraClass}"
      src="${gifUrl}"
      alt="${ex.name}"
      loading="lazy"
      onerror="
        if (this.dataset.state !== 'png') {
          this.dataset.state = 'png';
          this.src = '${pngUrl}';
        } else {
          this.onerror = null;
          this.src = '${fallbackUrl}';
        }
      "
    >
  `;
}

// ==================== 單一部位訓練渲染 ====================

function renderExercisesByCategory(category) {
  currentCategory = category;

  if (!partInfo[category]) return;

  titleEl.textContent = partInfo[category].title;
  descEl.textContent = partInfo[category].desc;

  const baseList = filterByCategory(category);
  const curated = sortAndFilter(baseList, category);

  const shuffled = curated.slice().sort(() => Math.random() - 0.5);
  const toShow = shuffled.slice(0, 8); // 顯示 8 個動作

  const panel = document.querySelector(".training-panel");
  if (panel) {
    panel.classList.remove("hidden");
  }

  gridEl.innerHTML = toShow
    .map((ex) => {
      const targets = ex.targetMuscles?.join(", ") || "（資料待補）";
      const eq = ex.equipments?.join(", ") || "無器材 / 自重";

      return `
        <article class="exercise-card">
          <h3>${ex.name}</h3>
          <p>主要肌群：${targets}<br>器材：${eq}</p>
          ${generateImageTag(ex)}
        </article>
      `;
    })
    .join("");
}

// ==================== 一週訓練菜單 ====================

function pickRandomExercises(category, count) {
  const list = sortAndFilter(filterByCategory(category), category);
  if (!list.length) return [];
  const shuffled = list.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function buildWeekSplit(days) {
  const result = Array.from({ length: days }, () => []);

  if (days === 1) {
    result[0] = [...mainCategories];
    return result;
  }
  if (days === 2) {
    result[0] = ["chest", "shoulders", "triceps", "core"];
    result[1] = ["back", "biceps", "legs", "core"];
    return result;
  }
  if (days === 3) {
    result[0] = ["chest", "shoulders", "triceps"];
    result[1] = ["back", "biceps", "core"];
    result[2] = ["legs", "core"];
    return result;
  }

  let idx = 0;
  mainCategories.forEach((cat) => {
    result[idx % days].push(cat);
    idx++;
  });

  return result;
}

function generateWeeklyPlan(days) {
  if (!allExercises.length) {
    planResultEl.innerHTML =
      "<p>資料尚未載入完成，請稍後再試一次。</p>";
    return;
  }

  if (isNaN(days) || days < 1) days = 1;
  if (days > 7) days = 7;

  const split = buildWeekSplit(days);

  const html = split
    .map((cats, index) => {
      const exList = [];
      cats.forEach((cat) => {
        const pick = pickRandomExercises(cat, 2);
        pick.forEach((ex) => {
          exList.push({ ex, cat });
        });
      });

      const dayHtml = exList
        .map(({ ex, cat }) => {
          const targets =
            ex.targetMuscles?.join(", ") || "（資料待補）";
          const eq =
            ex.equipments?.join(", ") || "無器材 / 自重";
          const partName = partInfo[cat]?.title || "";

          return `
            <div class="plan-day-exercise">
              <strong>${ex.name}</strong><br>
              <small>${partName}</small><br>
              <small>主要肌群：${targets}</small><br>
              <small>器材：${eq}</small>
              ${generateImageTag(ex, "plan-day-exercise-img")}
            </div>
          `;
        })
        .join("");

      return `
        <article class="plan-day-card">
          <h3>Day ${index + 1}</h3>
          <p>今天訓練部位：${cats
            .map((c) => partInfo[c]?.title || c)
            .join("、")}</p>
          ${dayHtml || "<p>這一天暫時沒有可用動作。</p>"}
        </article>
      `;
    })
    .join("");

  planResultEl.innerHTML = html;
}

// ==================== 飲食建議（使用目前體重計算） ====================

function generateNutritionPlan() {
  if (!weightInput || !goalSelect || !activitySelect || !nutritionResultEl) {
    return;
  }

  const weight = parseFloat(weightInput.value);
  const goal = goalSelect.value; // 'lose' | 'maintain' | 'gain'
  const activity = activitySelect.value; // 'low' | 'medium' | 'high'

  if (isNaN(weight) || weight <= 0) {
    nutritionResultEl.innerHTML = "<p>請輸入合理的體重數值（kg）。</p>";
    return;
  }

  // 基礎估算：維持體重大約 weight * 30 kcal
  let baseKcal = weight * 30;

  // 活動量修正
  let activityFactor = 1.0;
  if (activity === "low") activityFactor = 0.95;
  if (activity === "medium") activityFactor = 1.05;
  if (activity === "high") activityFactor = 1.15;

  baseKcal *= activityFactor;

  // 依目標調整熱量
  let goalText = "";
  if (goal === "lose") {
    baseKcal -= 300;
    goalText = "減脂：建議微幅熱量赤字，搭配足夠蛋白質與重量訓練。";
  } else if (goal === "gain") {
    baseKcal += 250;
    goalText = "增肌：建議適度熱量盈餘，搭配高蛋白與重量訓練。";
  } else {
    goalText = "維持：維持現在體態，讓訓練與飲食保持穩定。";
  }

  const totalKcal = Math.round(baseKcal);

  // 簡單 macro 分配
  let proteinRatio, carbRatio, fatRatio;
  if (goal === "lose") {
    proteinRatio = 0.3;
    carbRatio = 0.35;
    fatRatio = 0.35;
  } else if (goal === "gain") {
    proteinRatio = 0.25;
    carbRatio = 0.5;
    fatRatio = 0.25;
  } else {
    proteinRatio = 0.25;
    carbRatio = 0.45;
    fatRatio = 0.3;
  }

  const proteinKcal = totalKcal * proteinRatio;
  const carbKcal = totalKcal * carbRatio;
  const fatKcal = totalKcal * fatRatio;

  const proteinGrams = Math.round(proteinKcal / 4);
  const carbGrams = Math.round(carbKcal / 4);
  const fatGrams = Math.round(fatKcal / 9);

  let tips = "";
  if (goal === "lose") {
    tips =
      "以原型食物為主，多吃雞胸肉、魚、豆類，搭配適量全穀類（糙米、地瓜）、大量蔬菜，減少含糖飲料與油炸。";
  } else if (goal === "gain") {
    tips =
      "在三餐之間加上優質點心（優格、堅果、香蕉＋花生醬），每餐確保有澱粉、蛋白質與少量好油，避免只吃垃圾食物硬撐熱量。";
  } else {
    tips =
      "三餐維持固定時間，確保每餐有蛋白質來源（肉、魚、蛋、豆），搭配全穀類與蔬菜，避免過度加工食品。";
  }

  nutritionResultEl.innerHTML = `
    <article class="nutrition-card">
      <h3>每日建議熱量</h3>
      <p><strong>約 ${totalKcal} kcal / 天</strong></p>
      <p>${goalText}</p>
    </article>

    <article class="nutrition-card">
      <h3>三大營養素分配（約略）</h3>
      <ul>
        <li>蛋白質：<strong>${proteinGrams} g</strong>（約 ${Math.round(
    proteinRatio * 100
  )}%）</li>
        <li>碳水化合物：<strong>${carbGrams} g</strong>（約 ${Math.round(
    carbRatio * 100
  )}%）</li>
        <li>脂肪：<strong>${fatGrams} g</strong>（約 ${Math.round(
    fatRatio * 100
  )}%）</li>
      </ul>
    </article>

    <article class="nutrition-card">
      <h3>飲食建議方向</h3>
      <p>${tips}</p>
      <ul>
        <li>可將每日熱量粗略分成 3～4 餐，避免一次吃太撐。</li>
        <li>訓練前後可多安排蛋白質＋少量碳水（例如：香蕉＋乳清）。</li>
        <li>多喝水，減少含糖飲料與酒精。</li>
      </ul>
    </article>
  `;
}

// ==================== 事件綁定 ====================

// 開啟 / 關閉訓練部位下拉
if (dropdownToggle) {
  dropdownToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });
}

// 點選部位
dropdownMenuButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.remove("open");
    const cat = btn.dataset.target;
    renderExercisesByCategory(cat);
    const panel = document.querySelector(".training-panel");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Hero 上的「開始選擇訓練部位」按鈕
if (startBtn) {
  startBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    dropdown.classList.add("open");
    dropdownToggle?.focus();
  });
}

// 重抽動作
if (rerollBtn) {
  rerollBtn.addEventListener("click", () => {
    if (currentCategory) {
      renderExercisesByCategory(currentCategory);
    }
  });
}

// 生成一週訓練菜單
if (generatePlanBtn) {
  generatePlanBtn.addEventListener("click", () => {
    const days = parseInt(daysInput.value, 10) || 3;
    generateWeeklyPlan(days);
    const sec = document.querySelector(".weekly-planner");
    if (sec) {
      sec.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// 生成飲食建議
if (generateNutritionBtn) {
  generateNutritionBtn.addEventListener("click", () => {
    generateNutritionPlan();
    const sec = document.querySelector(".nutrition-planner");
    if (sec) {
      sec.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// 導覽列：「一週菜單」按鈕 → 捲到 AI 菜單
if (navPlanBtn) {
  navPlanBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const sec = document.getElementById("weekly-planner");
    if (sec) {
      sec.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// 導覽列：「飲食建議」按鈕 → 捲到飲食區
if (navNutritionBtn) {
  navNutritionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const sec = document.querySelector(".nutrition-planner");
    if (sec) {
      sec.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// 點其他地方關閉 dropdown
document.addEventListener("click", (e) => {
  if (
    dropdown &&
    !dropdown.contains(e.target) &&
    !dropdownToggle.contains(e.target)
  ) {
    dropdown.classList.remove("open");
  }
});

// ==================== 初始化 ====================
loadExercises();