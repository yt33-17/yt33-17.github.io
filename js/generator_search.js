(() => {
  const searchInput = _$("#reimu-search-input");
  const searchResult = _$("#reimu-hits");
  const pagination = _$("#reimu-pagination");
  const itemsPerPage = 10;
  let currentPage = 1;
  let dataReady = false;
  const pendingInit = []; // 等待数据加载完后执行的回调

  searchInput.insertAdjacentHTML(
    "beforeend",
    '<form id="search-form"><input type="text" id="search-text"></form>'
  );
  const baseUrl = window.REIMU_CONFIG?.relative;
  const searchUrl = baseUrl ? `${baseUrl}search.json`
    : "/search.json";
  // 页面加载后立即预取 search.json（不阻塞其他资源）
  const prefetch = () => {
    if (dataReady) return Promise.resolve();
    return fetch(searchUrl, { credentials: "omit" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        dataReady = true;
        // 预计算小写字段，避免每次搜索都对全量文章内容重复 toLowerCase
        data.forEach((post) => {
          post._titleLower = post.title ? post.title.toLowerCase() : "";
          post._contentLower = post.content
            ? post.content.toLowerCase()
            : "";
        });
        // 数据就绪后立即绑定表单提交事件
        bindForm(data);
        return data;
      })
      .catch((error) => {
        console.error(
          "There has been a problem with your fetch operation:",
          error
        );
      });
  };

  function bindForm(data) {
    _$("#search-form")
      .off("submit")
      .on("submit", (event) => {
        event.preventDefault();
        const inputText = _$("#search-text").value;
        searchResult.innerHTML = "";
        pagination.innerHTML = "";
        currentPage = 1;
        if (inputText) {
          const keyword = inputText.toLowerCase();
          const hits = data.filter((post) => {
            return (
              post._titleLower.includes(keyword) ||
              post._contentLower.includes(keyword)
            );
          });

          const totalPages = Math.ceil(hits.length / itemsPerPage);
          pagination.insertAdjacentHTML(
            "beforeend",
            '<ul class="ais-Pagination-list pagination">'
          );
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

          _$$(".page-number").forEach((element) => {
            element.off("click").on("click", (event) => {
              event.preventDefault();
              currentPage = element.innerText;
              _$$(".ais-Pagination-item").forEach((element) => {
                element.classList.remove(
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
      });
  }

  // 脚本位于页面底部，DOM 已就绪；fetch 本身异步不阻塞渲染，
  // 不必等待 window.load（否则要等所有图片/字体等资源完成才发请求）
  prefetch();

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
      // 弹窗打开时如果数据还没就绪，先等数据再聚焦
      const openPopup = () => {
        const scrollWidth =
          window.innerWidth - document.documentElement.offsetWidth;
        _$("#container").style.marginRight = scrollWidth + "px";
        _$("#header-nav").style.marginRight = scrollWidth + "px";
        const popup = _$(".popup");
        popup.classList.add("show");
        _$("#mask").classList.remove("hide");
        document.body.style.overflow = "hidden";
        setTimeout(() => {
          _$("#reimu-search-input input")?.focus();
        }, 50);
      };
      // 数据未就绪就先 await，否则直接打开
      if (!dataReady) {
        prefetch().then(openPopup);
      } else {
        openPopup();
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
