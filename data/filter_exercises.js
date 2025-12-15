// filter_exercises.js
// 用來檢查每個動作的 GIF / PNG 是否存在，兩個都失敗就從清單移除

const fs = require("fs/promises");
const https = require("https");

// 用 HEAD (或 GET) 檢查 URL 是否有效
function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);

    const req = https.request(
      url,
      { method: "HEAD" },
      (res) => {
        const ok = res.statusCode >= 200 && res.statusCode < 400;
        resolve(ok);
      }
    );

    req.on("error", () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function main() {
  console.log("讀取 exercises.json...");
  const raw = await fs.readFile("exercises.json", "utf8");

  // 去掉檔案開頭的 UTF-8 BOM（那個看不見的奇怪字元）
  const cleaned = raw.replace(/^\uFEFF/, "");

  const json = JSON.parse(cleaned);


  const data = json.data || [];
  console.log(`總共有 ${data.length} 個動作，開始檢查圖片...`);

  const kept = [];
  const removed = [];

  // 為了不要一次打太多請求，採用一個一個檢查（1500 個也還能接受）
  let index = 0;
  for (const ex of data) {
    index++;
    const id = ex.exerciseId;
    const name = ex.name;

    const gifUrl = ex.gifUrl;
    const pngUrl = `https://static.exercisedb.dev/api/images/${id}.png`;

    process.stdout.write(`\r[${index}/${data.length}] 檢查中：${name} `);

    const gifOk = await checkUrl(gifUrl);
    const pngOk = await checkUrl(pngUrl);

    if (gifOk || pngOk) {
      kept.push(ex);
    } else {
      removed.push({ id, name });
    }
  }

  console.log("\n檢查完成！");
  console.log(`保留：${kept.length} 個動作`);
  console.log(`移除：${removed.length} 個動作（伺服器沒有任何圖片）`);

  const output = {
    success: true,
    total: kept.length,
    data: kept
  };

  await fs.writeFile(
    "exercises_clean.json",
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("已輸出到 exercises_clean.json");

  // 順便輸出被移除清單，方便你之後查看
  await fs.writeFile(
    "removed_exercises.json",
    JSON.stringify(removed, null, 2),
    "utf8"
  );
  console.log("被移除的動作列表已輸出到 removed_exercises.json");
}

main().catch((err) => {
  console.error("發生錯誤：", err);
});
