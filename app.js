/* ============================================================
 * 文本复制与文件保存工具
 * 纯前端 · 无依赖 · 深色适配 · 防崩溃下载
 * ========================================================== */
(function () {
  "use strict";

  /* ---------------- 工具 ---------------- */
  var $ = function (id) {
    return document.getElementById(id);
  };
  var raf =
    window.requestAnimationFrame ||
    function (fn) {
      return setTimeout(fn, 16);
    };

  // 防抖
  function debounce(fn, wait) {
    var t = 0;
    return function () {
      var ctx = this,
        args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  // 正则计数（带最大上限）
  function countRe(str, re, max) {
    var limit = max || 999;
    var flags = re.flags.indexOf("g") > -1 ? re.flags : re.flags + "g";
    var reg = new RegExp(re.source, flags);
    var count = 0;
    while (reg.exec(str) !== null) {
      count++;
      if (count >= limit) break;
    }
    return count;
  }

  /* ---------------- 文件格式定义 ---------------- */
  var FORMATS = [
    { value: "txt", label: "TXT", desc: "纯文本", mime: "text/plain", icon: "file" },
    { value: "json", label: "JSON", desc: "数据格式", mime: "application/json", icon: "json" },
    { value: "md", label: "MD", desc: "Markdown", mime: "text/markdown", icon: "hash" },
    { value: "csv", label: "CSV", desc: "表格数据", mime: "text/csv", icon: "hash" },
    { value: "xml", label: "XML", desc: "标记语言", mime: "application/xml", icon: "code" },
    { value: "yaml", label: "YAML", desc: "配置文件", mime: "text/yaml", icon: "file" },
    { value: "html", label: "HTML", desc: "网页标记", mime: "text/html", icon: "code" },
    { value: "js", label: "JS", desc: "JavaScript", mime: "text/javascript", icon: "code" },
    { value: "ts", label: "TS", desc: "TypeScript", mime: "text/typescript", icon: "code" },
    { value: "css", label: "CSS", desc: "样式表", mime: "text/css", icon: "hash" },
    { value: "py", label: "PY", desc: "Python", mime: "text/x-python", icon: "code" },
    { value: "java", label: "JAVA", desc: "Java", mime: "text/x-java-source", icon: "code" },
    { value: "go", label: "GO", desc: "Go", mime: "text/x-go", icon: "code" },
    { value: "rs", label: "RS", desc: "Rust", mime: "text/rust", icon: "code" },
    { value: "c", label: "C", desc: "C 语言", mime: "text/x-c", icon: "code" },
    { value: "cpp", label: "C++", desc: "C++", mime: "text/x-c++", icon: "code" },
    { value: "php", label: "PHP", desc: "PHP", mime: "application/x-php", icon: "code" },
    { value: "rb", label: "RB", desc: "Ruby", mime: "text/x-ruby", icon: "code" },
    { value: "sh", label: "SH", desc: "Shell 脚本", mime: "application/x-sh", icon: "code" },
    { value: "sql", label: "SQL", desc: "SQL 查询", mime: "application/sql", icon: "braces" },
    { value: "log", label: "LOG", desc: "日志文件", mime: "text/plain", icon: "file" },
    { value: "ini", label: "INI", desc: "配置文件", mime: "text/plain", icon: "file" },
    { value: "toml", label: "TOML", desc: "TOML 配置", mime: "application/toml", icon: "file" },
  ];

  var ICON_SYMBOL = {
    file: "#i-file",
    json: "#i-json",
    hash: "#i-hash",
    code: "#i-code",
    braces: "#i-braces",
  };

  var MIME = {};
  for (var fi = 0; fi < FORMATS.length; fi++) MIME[FORMATS[fi].value] = FORMATS[fi].mime;

  var EXTS = [
    ".txt", ".json", ".md", ".markdown", ".csv", ".xml", ".yaml", ".yml", ".html",
    ".htm", ".js", ".mjs", ".jsx", ".ts", ".tsx", ".css", ".scss", ".less", ".py",
    ".java", ".go", ".rs", ".c", ".h", ".cpp", ".hpp", ".cc", ".php", ".rb", ".sh",
    ".bash", ".sql", ".log", ".ini", ".conf", ".toml",
  ];

  /* ---------------- 智能检测规则 ---------------- */
  var DETECTORS = [
    {
      format: "json",
      test: function (raw, t) {
        var n = 0;
        try {
          var o = JSON.parse(t);
          n += o !== null && typeof o === "object" ? 100 : 40;
        } catch (e) {
          if (/^\s*[[{]/.test(t) && /[\]}]\s*$/.test(t)) n += 25;
        }
        n += countRe(t, /"[^"]+"\s*:/g, 5) * 8;
        if (/^[\s"{}\[\]:,]*(-?\d+\.?\d*|"[^"]*"|true|false|null)[\s"{}\[\]:,]*$/s.test(t)) n += 15;
        return n;
      },
    },
    {
      format: "html",
      test: function (raw, t) {
        var n = 0;
        if (/<!doctype\s+html>/i.test(t)) n += 80;
        if (/<html[\s>]/i.test(t)) n += 40;
        if (/<head[\s>]/i.test(t)) n += 20;
        if (/<body[\s>]/i.test(t)) n += 20;
        n += countRe(t, /<\/?(div|span|p|a|img|ul|li|table|tr|td|section|header|footer|nav|article|h[1-6])\b/gi, 6) * 8;
        if (/<script[\s>]/i.test(t)) n += 10;
        if (/<style[\s>]/i.test(t)) n += 10;
        if (/<link\s|<meta\s/i.test(t)) n += 8;
        return n;
      },
    },
    {
      format: "xml",
      test: function (raw, t) {
        var n = 0;
        if (/^\s*<\?xml/.test(t)) n += 90;
        n += countRe(t, /<[\w.:-]+\s[^>]*\/>/g, 6) * 8;
        n += countRe(t, /<\/?[\w.:-]+:[\w.:-]+/g, 5) * 10;
        if (!/<html|<body|<div|<span/i.test(t)) {
          n += countRe(t, /<[\w.:-]+(\s[^>]*)?>[\s\S]*?<\/[\w.:-]+>/g, 5) * 8;
        }
        n += countRe(t, /\s[\w.:-]+="[^"]*"/g, 6) * 3;
        return n;
      },
    },
    {
      format: "css",
      test: function (raw, t) {
        var n = 0;
        n += countRe(t, /[^{}]+\{[^{}]*\}/g, 8) * 12;
        n += countRe(t, /[\w-]+\s*:\s*[^;]+;/g, 10) * 4;
        if (/@media|@import|@keyframes|@font-face/.test(t)) n += 15;
        if (/!important/.test(t)) n += 8;
        if (/#[\w-]+\s*\{|\.[\w-]+\s*\{/.test(t)) n += 10;
        return n;
      },
    },
    {
      format: "js",
      test: function (raw, t) {
        var n = 0;
        if (/^\s*(import\s|export\s|const\s|let\s|var\s|function\s|class\s|async\s)/m.test(t)) n += 15;
        if (/console\.(log|error|warn|info|debug)\s*\(/.test(t)) n += 20;
        if (/(?:const|let|var)\s+\w+\s*=/.test(t)) n += 12;
        if (/=>\s*[{(]/.test(t)) n += 12;
        if (/require\s*\(/.test(t)) n += 15;
        if (/import\s+.*\s+from\s+['"]/.test(t)) n += 15;
        if (/document\.(getElementById|querySelector)/.test(t)) n += 10;
        if (/addEventListener\s*\(/.test(t)) n += 8;
        if (/async\s+function|await\s+/.test(t)) n += 8;
        if (/\bstring\b|\bnumber\b|\bboolean\b/.test(t) && /:\s*(string|number|boolean)\b/.test(t)) n -= 30;
        return n;
      },
    },
    {
      format: "ts",
      test: function (raw, t) {
        var n = 0;
        if (/:\s*(string|number|boolean|void|any|never|unknown)\b/.test(t)) n += 30;
        if (/interface\s+\w+/.test(t)) n += 25;
        if (/type\s+\w+\s*=/.test(t)) n += 25;
        if (/import\s+.*\s+from\s+['"]/.test(t)) n += 5;
        if (/<\w+>/.test(t) && /interface|type\s+\w+/.test(t)) n += 10;
        if (/enum\s+\w+/.test(t)) n += 15;
        if (/as\s+(const|string|number|boolean|any)\b/.test(t)) n += 10;
        if (/@(Component|Injectable|NgModule|Input|Output)\b/.test(t)) n += 15;
        return n;
      },
    },
    {
      format: "py",
      test: function (raw, t) {
        var n = 0;
        if (/^\s*def\s+\w+\s*\(/m.test(t)) n += 25;
        if (/^\s*class\s+\w+/m.test(t)) n += 20;
        if (/^\s*import\s+\S+/m.test(t)) n += 15;
        if (/^\s*from\s+\S+\s+import\s+/m.test(t)) n += 15;
        if (/if\s+__name__\s*==\s*['"]__main__['"]/.test(t)) n += 40;
        if (/print\s*\(/.test(t)) n += 10;
        if (/self\./.test(t)) n += 12;
        if (/:\s*\n\s+/.test(t)) n += 8;
        if (/lambda\s/.test(t)) n += 8;
        return n;
      },
    },
    {
      format: "java",
      test: function (raw, t) {
        var n = 0;
        if (/public\s+class\s+\w+/.test(t)) n += 35;
        if (/package\s+[\w.]+;/.test(t)) n += 20;
        if (/import\s+java\./.test(t)) n += 25;
        if (/(public|private|protected)\s+(static\s+)?(void|String|int|boolean|double|long|List|Map)\s+\w+\s*\(/.test(t)) n += 20;
        if (/System\.out\.print/.test(t)) n += 15;
        if (/@\w+/.test(t) && /class\s+\w+/.test(t)) n += 8;
        return n;
      },
    },
    {
      format: "go",
      test: function (raw, t) {
        var n = 0;
        if (/^package\s+\w+/m.test(t)) n += 40;
        if (/^import\s+\(/m.test(t) || /^import\s+['"]/m.test(t)) n += 20;
        if (/func\s+(\w+\s*\()?\w*\s*\(/.test(t)) n += 20;
        if (/:=/.test(t)) n += 15;
        if (/\bfmt\.(Print|Sprint|Fprint)/.test(t)) n += 15;
        if (/\bif\s+err\s*!=\s*nil\b/.test(t)) n += 25;
        if (/\bgo\s+\w+\(/.test(t)) n += 8;
        return n;
      },
    },
    {
      format: "rs",
      test: function (raw, t) {
        var n = 0;
        if (/fn\s+\w+/.test(t)) n += 20;
        if (/let\s+mut\s+/.test(t)) n += 25;
        if (/use\s+std::/.test(t)) n += 20;
        if (/#\[derive\(/.test(t)) n += 30;
        if (/println!\s*\(/.test(t)) n += 20;
        if (/\bmod\s+\w+/.test(t)) n += 15;
        if (/\bpub\s+(fn|struct|enum)\s+/.test(t)) n += 15;
        if (/&mut\s+/.test(t)) n += 10;
        return n;
      },
    },
    {
      format: "c",
      test: function (raw, t) {
        var n = 0;
        if (/#include\s*<.+\.h>/.test(t)) n += 35;
        if (/#include\s*<stdio\.h>/.test(t)) n += 15;
        if (/int\s+main\s*\(/.test(t)) n += 20;
        if (/printf\s*\(/.test(t)) n += 10;
        if (/malloc\s*\(|free\s*\(/.test(t)) n += 10;
        if (/std::|cout|cin|namespace/.test(t)) n -= 50;
        return n;
      },
    },
    {
      format: "cpp",
      test: function (raw, t) {
        var n = 0;
        if (/#include\s*<iostream>/.test(t)) n += 40;
        if (/std::/.test(t)) n += 25;
        if (/(std::)?cout\s*<<|cin\s*>>/.test(t)) n += 25;
        if (/using\s+namespace\s+std/.test(t)) n += 30;
        if (/template\s*<.*>/.test(t)) n += 15;
        if (/class\s+\w+\s*\{/.test(t)) n += 10;
        if (/#include\s*<.+>/.test(t)) n += 5;
        return n;
      },
    },
    {
      format: "php",
      test: function (raw, t) {
        var n = 0;
        if (/^\s*<\?php/.test(t)) n += 80;
        if (/\$\w+/.test(t)) n += 10;
        if (/echo\s+/.test(t)) n += 12;
        if (/function\s+\w+\s*\(/.test(t)) n += 8;
        if (/->\w+/.test(t)) n += 8;
        if (/array\s*\(/.test(t)) n += 10;
        return n;
      },
    },
    {
      format: "rb",
      test: function (raw, t) {
        var n = 0;
        if (/^\s*def\s+\w+/m.test(t)) n += 20;
        if (/puts\s+/.test(t)) n += 20;
        if (/require\s+['"]/.test(t)) n += 15;
        if (/end\s*$/.test(t) && /\b(do|def|if|class|module)\b/.test(t)) n += 15;
        if (/@\w+/.test(t)) n += 10;
        if (/attr_(accessor|reader|writer)\s*:/.test(t)) n += 20;
        return n;
      },
    },
    {
      format: "sh",
      test: function (raw, t) {
        var n = 0;
        if (/^#!/.test(t) && /(bash|sh|zsh)/.test(t)) n += 50;
        if (/^\s*echo\s+/m.test(t)) n += 15;
        if (/\$\{?\w+\}?/.test(t)) n += 5;
        if (/^\s*(if|for|while|case)\s+/m.test(t)) n += 12;
        if (/^\s*fi\s*$/m.test(t) || /^\s*done\s*$/m.test(t)) n += 15;
        if (/^\s*export\s+\w+/.test(t)) n += 12;
        return n;
      },
    },
    {
      format: "sql",
      test: function (raw, t) {
        var n = 0;
        var r = t.toLowerCase();
        if (/\bselect\b[\s\S]*\bfrom\b/.test(r)) n += 40;
        if (/\binsert\s+into\b/.test(r)) n += 30;
        if (/\bupdate\b[\s\S]*\bset\b/.test(r)) n += 30;
        if (/\bdelete\s+from\b/.test(r)) n += 30;
        if (/\bcreate\s+table\b/.test(r)) n += 30;
        if (/\balter\s+table\b/.test(r)) n += 25;
        if (/\b(inner|left|right|outer)\s+join\b/.test(r)) n += 20;
        if (/\bwhere\s+\w+\s*(=|like|in|>|<)/.test(r)) n += 10;
        return n;
      },
    },
    {
      format: "yaml",
      test: function (raw, t) {
        var n = 0;
        var lines = t.split("\n");
        var nonEmpty = lines.filter(function (l) {
          return l.trim();
        });
        if (lines.length < 2) return 0;
        var ratio =
          nonEmpty.filter(function (l) {
            return /^\s*[\w.-]+\s*:\s/.test(l) && l.indexOf("{") < 0 && l.indexOf("[") < 0;
          }).length / nonEmpty.length;
        if (ratio > 0.5) n += Math.round(ratio * 40);
        if (/^\s{2,}\w/.test(t)) n += 15;
        if (/^\s*-\s+/m.test(t)) n += 15;
        if (/&\w+|\*\w+/.test(t)) n += 15;
        if (/^---\s*$/m.test(t)) n += 20;
        if (/^\s*[{[]/.test(t)) n -= 30;
        if (/<[\w/]/.test(t)) n -= 20;
        return n;
      },
    },
    {
      format: "csv",
      test: function (raw, t) {
        var n = 0;
        var lines = t.split("\n").filter(function (i) {
          return i.trim();
        });
        if (lines.length < 2) return 0;
        var commaCount = (lines[0].match(/,/g) || []).length;
        if (commaCount < 1) return 0;
        var uniform = lines.every(function (i) {
          return (i.match(/,/g) || []).length === commaCount;
        });
        if (uniform) n += 50;
        if (!/[{}<>]/.test(t)) n += 10;
        if (/"[^"]*"\s*,/.test(lines[0])) n += 10;
        return n;
      },
    },
    {
      format: "md",
      test: function (raw, t) {
        var n = 0;
        var rules = [
          [/^#{1,6}\s+/m, 15],
          [/^```/m, 15],
          [/^\s*[-*+]\s+/m, 10],
          [/^\s*\d+\.\s+/m, 10],
          [/^\|.*\|/m, 12],
          [/```[\s\S]*?```/, 15],
          [/\*\*[^*]+\*\*/, 8],
          [/\[.+?\]\(.+?\)/, 8],
          [/!\[.*?\]\(.+?\)/, 8],
          [/^\s*>\s+/m, 8],
          [/^---+\s*$/m, 5],
          [/`[^`]+`/, 4],
        ];
        for (var i = 0; i < rules.length; i++) {
          if (rules[i][0].test(t)) n += rules[i][1];
        }
        return n;
      },
    },
    {
      format: "ini",
      test: function (raw, t) {
        var n = 0;
        if (/^\[.+\]\s*$/m.test(t)) n += 40;
        n += countRe(t, /^[\w.]+\s*=\s*.+/gm, 8) * 6;
        if (/^;\s/.test(t)) n += 8;
        return n;
      },
    },
    {
      format: "toml",
      test: function (raw, t) {
        var n = 0;
        if (/^\[.+\]\s*$/m.test(t)) n += 25;
        if (/^\[".+"\]\s*$/m.test(t)) n += 20;
        if (/^[\w.]+\s*=\s*["\[\dtf]/m.test(t)) n += 15;
        if (/^"""[\s\S]*?"""/m.test(t)) n += 15;
        if (/^#/.test(t) && /^\[.+\]/m.test(t)) n += 8;
        return n;
      },
    },
    {
      format: "log",
      test: function (raw, t) {
        var n = 0;
        var lines = t.split("\n").filter(function (i) {
          return i.trim();
        });
        if (lines.length < 2) return 0;
        if (
          lines.filter(function (i) {
            return /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/.test(i);
          }).length /
            lines.length >
          0.5
        )
          n += 50;
        if (
          lines.filter(function (i) {
            return /\b(INFO|WARN|ERROR|DEBUG|TRACE|FATAL)\b/.test(i);
          }).length /
            lines.length >
          0.3
        )
          n += 30;
        if (/\[[\w.-]+\]/.test(t)) n += 10;
        return n;
      },
    },
  ];

  function detectFormat(content) {
    if (!content || !content.trim()) {
      return { format: null, label: "未能识别，已默认为 TXT", confidence: 0 };
    }
    var t = content.trim();
    var scored = DETECTORS.map(function (d) {
      return { format: d.format, score: d.test(content, t) };
    }).sort(function (a, b) {
      return b.score - a.score;
    });
    var best = scored[0];
    var second = scored[1];
    if (!best || best.score < 15) {
      return { format: "txt", label: "未能识别，已默认为 TXT", confidence: 0 };
    }
    if (best.score >= 60 && best.score - ((second && second.score) || 0) >= 20) {
      return { format: best.format, label: "高置信度推荐：" + best.format.toUpperCase(), confidence: "high" };
    }
    if (best.score >= 30) {
      return { format: best.format, label: "推荐格式：" + best.format.toUpperCase(), confidence: "medium" };
    }
    return {
      format: "txt",
      label: "可能为 " + best.format.toUpperCase() + "（不确定，已默认为 TXT）",
      confidence: "low",
    };
  }

  /* ---------------- Toast 提示 ---------------- */
  var toastBox = $("toasts");
  var TOAST_ICON = { success: "#i-check-circle", error: "#i-warn", info: "#i-info", warn: "#i-warn" };

  function toast(type, msg) {
    var el = document.createElement("div");
    el.className = "toast " + type;
    var icoWrap = document.createElement("span");
    icoWrap.className = "t-ico";
    icoWrap.innerHTML = '<svg><use href="' + (TOAST_ICON[type] || "#i-info") + '"/></svg>';
    var text = document.createElement("span");
    text.textContent = msg;
    el.appendChild(icoWrap);
    el.appendChild(text);
    toastBox.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 320);
    }, 2600);
  }

  /* ---------------- 主题切换 ---------------- */
  var THEMES = ["auto", "light", "dark"];
  var THEME_ICON = { auto: "#i-auto", light: "#i-sun", dark: "#i-moon" };
  var THEME_LABEL = { auto: "跟随系统", light: "浅色模式", dark: "深色模式" };
  var themeBtn = $("themeBtn");
  var themeIcon = $("themeIcon");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeIcon.setAttribute("href", THEME_ICON[theme]);
    try {
      localStorage.setItem("cpt-theme", theme);
    } catch (e) {}
  }
  var savedTheme = "auto";
  try {
    savedTheme = localStorage.getItem("cpt-theme") || "auto";
  } catch (e) {}
  if (THEMES.indexOf(savedTheme) < 0) savedTheme = "auto";
  applyTheme(savedTheme);

  themeBtn.addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") || "auto";
    var next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    applyTheme(next);
    toast("info", "主题：" + THEME_LABEL[next]);
  });

  /* ---------------- 标签切换 ---------------- */
  var tabsEl = $("tabs");
  var tabBtns = tabsEl.querySelectorAll(".tab");
  var panels = { upload: $("panel-upload"), download: $("panel-download") };

  function switchTab(name) {
    tabsEl.setAttribute("data-active", name);
    for (var i = 0; i < tabBtns.length; i++) {
      tabBtns[i].classList.toggle("active", tabBtns[i].getAttribute("data-tab") === name);
    }
    panels.upload.classList.toggle("active", name === "upload");
    panels.download.classList.toggle("active", name === "download");
  }
  for (var ti = 0; ti < tabBtns.length; ti++) {
    (function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-tab"));
      });
    })(tabBtns[ti]);
  }

  /* ---------------- 通用：更新统计 ---------------- */
  function statsOf(text) {
    var chars = text.length;
    var lines = text ? text.split("\n").length : 0;
    return chars + " 字符 · " + lines + " 行";
  }

  /* ============================================================
   * 面板一：上传 → 复制
   * ========================================================== */
  var dropzone = $("dropzone");
  var fileInput = $("fileInput");
  var fileChip = $("fileChip");
  var fileNameEl = $("fileName");
  var fileInfoEl = $("fileInfo");
  var fileRemove = $("fileRemove");
  var uploadContent = $("uploadContent");
  var uploadMeta = $("uploadMeta");
  var copyBtn = $("copyBtn");
  var clearUpload = $("clearUpload");
  var currentFile = null;

  function humanSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function setUploadState(text, file) {
    uploadContent.value = text;
    uploadMeta.textContent = statsOf(text);
    copyBtn.disabled = !text;
    copyBtn.classList.remove("btn-success");
    copyBtn.innerHTML = '<svg><use href="#i-copy"/></svg>复制到剪贴板';
    if (file) {
      currentFile = file;
      fileNameEl.textContent = file.name;
      fileInfoEl.textContent = humanSize(file.size) + " · " + text.split("\n").length + " 行";
      fileChip.classList.add("show");
    }
  }

  function resetUpload() {
    currentFile = null;
    uploadContent.value = "";
    uploadMeta.textContent = "0 字符 · 0 行";
    copyBtn.disabled = true;
    fileChip.classList.remove("show");
    fileNameEl.textContent = "—";
    fileInfoEl.textContent = "—";
  }

  function handleFile(file) {
    if (!file) return;
    resetUpload();
    var ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (EXTS.indexOf(ext) < 0) {
      toast("error", '不支持的文件类型 "' + ext + '"');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("warn", "文件较大（>" + humanSize(file.size) + "），加载可能稍慢");
    }
    dropzone.classList.add("loading");
    var dzTitle = dropzone.querySelector(".dz-title");
    var dzTitleOrig = dzTitle ? dzTitle.textContent : "";
    if (dzTitle) dzTitle.textContent = "正在读取文件…";
    var reader = new FileReader();
    reader.onload = function (ev) {
      dropzone.classList.remove("loading");
      if (dzTitle) dzTitle.textContent = dzTitleOrig;
      var result = ev.target && ev.target.result;
      if (typeof result === "string") {
        setUploadState(result, file);
        toast("success", "已加载：" + file.name);
      } else {
        toast("error", "文件内容无法读取，请确认为文本文件");
      }
    };
    reader.onerror = function () {
      dropzone.classList.remove("loading");
      if (dzTitle) dzTitle.textContent = dzTitleOrig;
      toast("error", "文件读取失败，请重试或更换文件");
    };
    reader.readAsText(file);
  }

  dropzone.addEventListener("click", function () {
    fileInput.click();
  });
  // 阻止 input 的 click 冒泡回 dropzone，避免递归触发
  fileInput.addEventListener("click", function (e) {
    e.stopPropagation();
  });
  fileInput.addEventListener("change", function (ev) {
    var f = ev.target.files && ev.target.files[0];
    handleFile(f);
    ev.target.value = "";
  });
  ["dragenter", "dragover"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(f);
  });
  fileRemove.addEventListener("click", function (e) {
    e.stopPropagation();
    resetUpload();
  });
  clearUpload.addEventListener("click", function () {
    resetUpload();
    toast("info", "已清空");
  });

  copyBtn.addEventListener("click", function () {
    var text = uploadContent.value;
    if (!text) {
      toast("error", "没有可复制的内容");
      return;
    }
    copyText(text, function (ok) {
      if (ok) {
        toast("success", "内容已复制到剪贴板");
        copyBtn.classList.add("btn-success");
        copyBtn.innerHTML = '<svg><use href="#i-check"/></svg>已复制';
        setTimeout(function () {
          copyBtn.classList.remove("btn-success");
          copyBtn.innerHTML = '<svg><use href="#i-copy"/></svg>复制到剪贴板';
        }, 1600);
      } else {
        toast("error", "复制失败，请手动选择文本复制");
      }
    });
  });

  /* ---------------- 剪贴板：复制 ---------------- */
  function copyText(text, cb) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () {
          cb(true);
        },
        function () {
          cb(fallbackCopy(text));
        }
      );
    } else {
      cb(fallbackCopy(text));
    }
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  /* ============================================================
   * 面板二：输入 → 下载
   * ========================================================== */
  var sourceContent = $("sourceContent");
  var sourceMeta = $("sourceMeta");
  var clearSource = $("clearSource");
  var readClipBtn = $("readClipBtn");
  var detectRow = $("detectRow");
  var detectSwitch = $("detectSwitch");
  var detectNote = $("detectNote");
  var detectText = $("detectText");
  var formatSelect = $("formatSelect");
  var formatMenu = $("formatMenu");
  var selIcon = $("selIcon");
  var selLabel = $("selLabel");
  var selDesc = $("selDesc");
  var fileNameInput = $("fileNameInput");
  var downloadBtn = $("downloadBtn");

  var currentFormat = "txt";
  var smartDetect = true;

  // 渲染格式菜单
  (function buildMenu() {
    var html = "";
    for (var i = 0; i < FORMATS.length; i++) {
      var f = FORMATS[i];
      html +=
        '<button class="opt" type="button" role="option" data-value="' + f.value + '">' +
        '<span class="o-ico"><svg><use href="' + ICON_SYMBOL[f.icon] + '"/></svg></span>' +
        '<span class="o-name">' + f.label + "</span>" +
        '<span class="o-desc">' + f.desc + "</span>" +
        "</button>";
    }
    formatMenu.innerHTML = html;
    formatMenu.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".opt") : null;
      if (!btn) return;
      setFormat(btn.getAttribute("data-value"));
      closeSelect();
    });
  })();

  function setFormat(value) {
    var f = null;
    for (var i = 0; i < FORMATS.length; i++) {
      if (FORMATS[i].value === value) {
        f = FORMATS[i];
        break;
      }
    }
    if (!f) return;
    currentFormat = value;
    selLabel.textContent = f.label;
    selDesc.textContent = f.desc;
    selIcon.setAttribute("href", ICON_SYMBOL[f.icon]);
    var opts = formatMenu.querySelectorAll(".opt");
    for (var j = 0; j < opts.length; j++) {
      opts[j].classList.toggle("selected", opts[j].getAttribute("data-value") === value);
    }
  }
  setFormat("txt");

  function openSelect() {
    formatSelect.classList.add("open");
  }
  function closeSelect() {
    formatSelect.classList.remove("open");
  }
  formatSelect.querySelector(".select-btn").addEventListener("click", function (e) {
    e.stopPropagation();
    if (formatSelect.classList.contains("open")) closeSelect();
    else openSelect();
  });
  document.addEventListener("click", function (e) {
    if (!formatSelect.contains(e.target)) closeSelect();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSelect();
  });

  // 智能检测开关
  detectSwitch.addEventListener("click", function () {
    smartDetect = !smartDetect;
    detectSwitch.classList.toggle("on", smartDetect);
    detectSwitch.setAttribute("aria-checked", String(smartDetect));
    detectRow.classList.toggle("on", smartDetect);
    if (!smartDetect) {
      detectNote.classList.remove("show");
    } else {
      runDetect();
    }
  });
  detectRow.classList.add("on");

  function runDetect() {
    if (!smartDetect) return;
    var text = sourceContent.value;
    if (!text.trim()) {
      detectNote.classList.remove("show");
      return;
    }
    var res = detectFormat(text);
    var conf = res.confidence || "";
    detectNote.className = "detect-note show conf-" + (conf || "medium");
    detectText.textContent = res.label;
    if (res.format) setFormat(res.format);
  }

  // 统计 + 检测（防抖，避免高频重排）
  var updateStats = debounce(function () {
    sourceMeta.textContent = statsOf(sourceContent.value);
  }, 60);
  var scheduleDetect = debounce(runDetect, 320);

  sourceContent.addEventListener("input", function () {
    updateStats();
    if (smartDetect) scheduleDetect();
    else sourceMeta.textContent = statsOf(sourceContent.value);
  });

  clearSource.addEventListener("click", function () {
    sourceContent.value = "";
    sourceMeta.textContent = "0 字符 · 0 行";
    detectNote.classList.remove("show");
    toast("info", "已清空");
  });

  readClipBtn.addEventListener("click", function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(
        function (txt) {
          if (txt) {
            sourceContent.value = txt;
            sourceMeta.textContent = statsOf(txt);
            toast("success", "已从剪贴板粘贴内容");
            if (smartDetect) runDetect();
          } else {
            toast("info", "剪贴板为空");
          }
        },
        function () {
          toast("error", "请手动粘贴或授权剪贴板访问");
        }
      );
    } else {
      toast("error", "当前浏览器不支持读取剪贴板，请手动粘贴");
    }
  });

  /* ---------------- 下载（防崩溃） ---------------- */
  var downloading = false;
  var lastURL = null;

  function setDownloadBusy(busy) {
    downloadBtn.disabled = busy;
    if (busy) {
      downloadBtn.innerHTML = '<svg class="spin"><use href="#i-spin"/></svg>下载中...';
    } else {
      downloadBtn.innerHTML = '<svg><use href="#i-download"/></svg>下载文件';
    }
  }

  function downloadText(content, filename, mime) {
    if (downloading) return;
    downloading = true;
    setDownloadBusy(true);
    try {
      // 及时释放上一次的 ObjectURL，避免内存堆积导致崩溃
      if (lastURL) {
        try {
          URL.revokeObjectURL(lastURL);
        } catch (e) {}
        lastURL = null;
      }
      var blob = new Blob([content], { type: mime + ";charset=utf-8" });
      var url = URL.createObjectURL(blob);
      lastURL = url;
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 延迟释放，确保下载已取到数据
      setTimeout(function () {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
        if (lastURL === url) lastURL = null;
      }, 4000);
      toast("success", "文件 " + filename + " 已开始下载");
    } catch (err) {
      toast("error", "下载失败，请长按内容手动保存");
    } finally {
      setTimeout(function () {
        downloading = false;
        setDownloadBusy(false);
      }, 900);
    }
  }

  downloadBtn.addEventListener("click", function () {
    var content = sourceContent.value;
    if (!content.trim()) {
      toast("error", "请先输入内容");
      return;
    }
    if (content.length > 5 * 1024 * 1024) {
      toast("warn", "内容过大（>" + (content.length / 1024 / 1024).toFixed(1) + "MB），建议拆分后下载");
    }
    var base = (fileNameInput.value.trim() || "未命名").replace(/\.[a-zA-Z0-9]+$/, "");
    var filename = base + "." + currentFormat;
    var mime = MIME[currentFormat] || "text/plain";
    downloadText(content, filename, mime);
  });

  /* ---------------- 页面级错误兜底 ---------------- */
  window.addEventListener("error", function (e) {
    // 静默记录，不阻断用户操作
    if (window.console) console.error("运行时异常：", e.message);
  });
  window.addEventListener("unhandledrejection", function (e) {
    if (window.console) console.error("未处理的 Promise 异常：", e.reason);
  });
})();
