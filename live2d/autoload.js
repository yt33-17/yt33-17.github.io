// live2d_path 参数建议使用绝对路径
const live2d_path = "/live2d/";
// 本地化：核心资源（waifu.css / live2d.min.js / waifu-tips.js / waifu-tips.json）与模型均已放在本站 /live2d/ 下

// 预载缓存：加载当前模型时，同时预取后面两个模型的资源（暖浏览器缓存，切换时秒开）
const preloadCache = new Set();
const modelListPromise = fetch(live2d_path + "model_list.json").then(r => r.json()).catch(() => null);

// 根据当前模型名，找出它后面 2 个条目的所有模型名（数组条目含多个模型，全部预载）
function getNextModelNames(curName, list) {
	if (!list || !Array.isArray(list.models)) return [];
	const models = list.models;
	let cur = -1;
	for (let i = 0; i < models.length; i++) {
		const entry = models[i];
		const arr = Array.isArray(entry) ? entry : [entry];
		if (arr.includes(curName)) { cur = i; break; }
	}
	if (cur < 0) return [];
	const names = new Set();
	for (const off of [1, 2]) {
		const entry = models[(cur + off) % models.length];
		const arr = Array.isArray(entry) ? entry : [entry];
		arr.forEach(n => names.add(n));
	}
	return [...names];
}

// 预取一个模型的全部资源文件（index.json 里引用的 model.moc / textures / motions / expressions）
function preloadModel(name) {
	const base = live2d_path + "model/" + name + "/";
	return fetch(base + "index.json")
		.then(res => res.ok ? res.json() : null)
		.then(cfg => {
			if (!cfg) return;
			const files = [cfg.model];
			Array.isArray(cfg.textures) && cfg.textures.forEach(t => files.push(t));
			Object.values(cfg.motions || {}).forEach(arr => arr.forEach(m => files.push(m.file)));
			Array.isArray(cfg.expressions) && cfg.expressions.forEach(e => files.push(e.file));
			files.filter(f => f).forEach(f => {
				const u = base + f;
				if (preloadCache.has(u)) return;
				preloadCache.add(u);
				fetch(u).catch(() => {});
			});
		})
		.catch(() => {});
}

// 包装 loadlive2d：每次实际加载一个模型时，顺带预载它后面两个模型
window.__wrapLoadlive2d = () => {
	const orig = window.loadlive2d;
	if (!orig || window.__loadlive2dWrapped) return;
	window.__loadlive2dWrapped = true;
	window.loadlive2d = function (_id, url) {
		const m = typeof url === "string" && url.match(/\/model\/(.+?)\/index\.json$/);
		if (m) modelListPromise.then(list => getNextModelNames(m[1], list).forEach(preloadModel));
		return orig.apply(this, arguments);
	};
};

// 封装异步加载资源的方法
function loadExternalResource(url, type) {
	return new Promise((resolve, reject) => {
		let tag;

		if (type === "css") {
			tag = document.createElement("link");
			tag.rel = "stylesheet";
			tag.href = url;
		}
		else if (type === "js") {
			tag = document.createElement("script");
			tag.src = url;
		}
		if (tag) {
			tag.onload = () => resolve(url);
			tag.onerror = () => reject(url);
			document.head.appendChild(tag);
		}
	});
}

// 加载 waifu.css live2d.min.js waifu-tips.js
if (screen.width >= 768) {
	Promise.all([
		loadExternalResource(live2d_path + "waifu.css", "css"),
		loadExternalResource(live2d_path + "live2d.min.js", "js"),
		loadExternalResource(live2d_path + "waifu-tips.js", "js")
	]).then(() => {
		window.__wrapLoadlive2d(); // 资源就绪后再包装 loadlive2d 以启动预载
		// 配置选项的具体用法见 README.md
		initWidget({
			waifuPath: live2d_path + "waifu-tips.json",
			//apiPath: "https://live2d.fghrsh.net/api/",
			cdnPath: "/live2d/",
			tools: ["switch-model", "switch-texture", "photo", "info", "quit"]
		});

		// 默认收起：模型先正常渲染预加载，再延时收起（避免 display:none 影响 canvas 渲染）。
		// 点击折叠按钮时模型已就绪，秒开。已手动收起过则保持原状态。
		setTimeout(() => {
			const w = document.getElementById("waifu");
			const t = document.getElementById("waifu-toggle");
			if (!w || !t || localStorage.getItem("waifu-display")) return; // 已收起过则跳过
			w.style.right = "-500px"; // 从右缘滑出收起
			setTimeout(() => {
				w.style.display = "none";
				t.classList.add("waifu-toggle-active"); // 显示折叠按钮
			}, 3000);
		}, 2000); // 给模型首帧渲染留时间
	});
}

console.log(`
  く__,.ヘヽ.        /  ,ー､ 〉
           ＼ ', !-─‐-i  /  /´
           ／｀ｰ'       L/／｀ヽ､
         /   ／,   /|   ,   ,       ',
       ｲ   / /-‐/  ｉ  L_ ﾊ ヽ!   i
        ﾚ ﾍ 7ｲ｀ﾄ   ﾚ'ｧ-ﾄ､!ハ|   |
          !,/7 '0'     ´0iソ|    |
          |.从"    _     ,,,, / |./    |
          ﾚ'| i＞.､,,__  _,.イ /   .i   |
            ﾚ'| | / k_７_/ﾚ'ヽ,  ﾊ.  |
              | |/i 〈|/   i  ,.ﾍ |  i  |
             .|/ /  ｉ：    ﾍ!    ＼  |
              kヽ>､ﾊ    _,.ﾍ､    /､!
              !'〈//｀Ｔ´', ＼ ｀'7'ｰr'
              ﾚ'ヽL__|___i,___,ンﾚ|ノ
                  ﾄ-,/  |___./
                  'ｰ'    !_,.:
`);
