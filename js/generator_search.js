(() => {
  const searchInput = _$("#reimu-search-input");
  const searchResult = _$("#reimu-hits");
  const pagination = _$("#reimu-pagination");
  const itemsPerPage = 10;
  let currentPage = 1;

  searchInput.insertAdjacentHTML(
    "beforeend",
    '<form id="search-form"><input type="text" id="search-text"></form>'
  );
  const baseUrl = window.REIMU_CONFIG?.relative;
  const searchUrl = baseUrl ? `${baseUrl}search.json`
    : "/search.json";

  // 单例数据加载：脚本 defer 执行时 DOM 已解析，立即预取，不等 window load
  // （load 要等图片/音乐等全部资源，会白白推迟搜索索引就绪时间）
  let searchData = null;
  let loadingPromise = null;
  function loadData() {
    if (searchData) return Promise.resolve(searchData);
    if (!loadingPromise) {
      loadingPromise = fetch(searchUrl, { credentials: "omit" })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok " + response.statusText);
          }
          return response.json();
        })
        .then((data) => {
          searchData = data;
          return data;
        })
        .catch((error) => {
          // 失败后允许下次重试
          loadingPromise = null;
          console.error(
            "There has been a problem with your fetch operation:",
            error
          );
          throw error;
        });
    }
    return loadingPromise;
  }
  // 立即开始预取
  loadData().catch(() => {});

  function showLoading(text) {
    searchResult.innerHTML =
      `<div class="reimu-search-loading">${text}</div>`;
  }

  function runSearch(inputText, data) {
    const keyword = inputText.toLowerCase();
    const hits = data.filter((post) => {
      return (
        (post.title &&
          post.title.toLowerCase().includes(keyword)) ||
        (post.content &&
          post.content.toLowerCase().includes(keyword))
      );
    });

    const totalPages = Math.ceil(hits.length / itemsPerPage);
    pagination.innerHTML =
      '<ul class="ais-Pagination-list pagination"></ul>';
    for (let i = 1; i <= totalPages; i++) {
      const pageItem = document.createElement("li");
      pageItem.className =
        "ais-Pagination-item pagination-item ais-Pagination-item--page";
      pageItem.innerHTML = `<a class="ais-Pagination-link page-number" aria-label="Page ${i}" href="#">${i}</a>`;
      if (i === currentPage) {
        pageItem.classList.add(
          "ais-Pagination-item--selected",
          "current"
        );
      }
      pagination.querySelector("ul").appendChild(pageItem);
    }

    pagination.querySelectorAll(".page-number").forEach((element) => {
      element.off("click").on("click", (event) => {
        event.preventDefault();
        currentPage = parseInt(element.innerText, 10);
        pagination.querySelectorAll(".ais-Pagination-item").forEach((item) => {
          item.classList.remove(
            "ais-Pagination-item--selected",
            "current"
          );
        });
        element.parentNode.classList.add(
          "ais-Pagination-item--selected",
          "current"
        );
        displayHits(hits, currentPage, itemsPerPage);
      });
    });

    displayHits(hits, currentPage, itemsPerPage);
  }

  // 表单一开始就绑定提交，数据未就绪时先提示再等待（不再等数据好了才绑事件）
  _$("#search-form")
    .off("submit")
    .on("submit", async (event) => {
      event.preventDefault();
      searchResult.innerHTML = "";
      pagination.innerHTML = "";
      currentPage = 1;
      const inputText = _$("#search-text").value.trim();
      if (!inputText) return;

      let data = searchData;
      if (!data) {
        showLoading("索引加载中…");
        try {
          data = await loadData();
        } catch (e) {
          showLoading("索引加载失败，请重试");
          return;
        }
        // 等待期间用户可能修改了输入，以最新内容为准
        const latest = _$("#search-text").value.trim();
        if (!latest) {
          searchResult.innerHTML = "";
          return;
        }
        runSearch(latest, data);
      } else {
        runSearch(inputText, data);
      }
    });

  function displayHits(hits, page, itemsPerPage) {
    searchResult.innerHTML = "";
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    hits.slice(start, end).forEach((hit) => {
      searchResult.insertAdjacentHTML(
        "beforeend",
        `<a href="${hit.url}" class="reimu-hit-item-link" title="${
          hit.title || ""
        }">${hit.title}</a>`
      );
    });
  }

  _$(".popup-trigger")
    .off("click")
    .on("click", (event) => {
      event.stopPropagation();
      // 点击后立即打开弹窗（即时反馈），数据未就绪时结果区显示加载提示，
      // 而不是卡住弹窗等 fetch 回来才开始淡入
      const scrollWidth =
        window.innerWidth - document.documentElement.offsetWidth;
      _$("#container").style.marginRight = scrollWidth + "px";
      _$("#header-nav").style.marginRight = scrollWidth + "px";
      const popup = _$(".popup");
      popup.classList.add("show");
      _$("#mask").classList.remove("hide");
      document.body.style.overflow = "hidden";
      _$("#reimu-search-input input")?.focus();
      if (!searchData) {
        loadData()
          .then(() => {
            // 仅当用户还没有触发搜索时清掉提示
            if (
              searchResult.querySelector(".reimu-search-loading") &&
              !_$("#search-text").value.trim()
            ) {
              searchResult.innerHTML = "";
            }
          })
          .catch(() => {});
      }

      const keydownHandler = (e) => {
        const focusables = _$(".popup").querySelectorAll("input, [href]");
        const firstFocusable = focusables[0];
        const lastFocusable = focusables[focusables.length - 1];
        if (e.key === "Escape") {
          closePopup();
        } else if (e.key === "Tab" && focusables.length) {
          if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      };
      document.addEventListener("keydown", keydownHandler);
      function closePopup() {
        const popup = _$(".popup");
        popup.classList.remove("show");
        _$("#mask").classList.add("hide");
        _$("#container").style.marginRight = "";
        _$("#header-nav").style.marginRight = "";
        document.body.style.overflow = "";
        document.removeEventListener("keydown", keydownHandler);
        _$("#nav-search-btn")?.focus();
      }
      _$(".popup").__closePopup = closePopup;
    });

  _$(".popup-btn-close")
    .off("click")
    .on("click", () => {
      _$(".popup").__closePopup?.();
    });
})();
