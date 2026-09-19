(function(){
  const markdownInput = document.getElementById('markdown-input');
  const htmlOutput = document.getElementById('html-output');
  const preview = document.getElementById('preview');
  const wordCount = document.getElementById('word-count');
  const charCount = document.getElementById('char-count');
  const statusPill = document.getElementById('status-pill');

  function escapeHtml(str){
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function convertMarkdown(raw){
    if(!raw.trim()) return "";

    // Escape HTML first so user-typed tags don't get interpreted
    let text = escapeHtml(raw);

    // Fenced code blocks ```code```
    const codeBlocks = [];
    text = text.replace(/```([\s\S]*?)```/g, function(_, code){
      codeBlocks.push(code.replace(/^\n/, "").replace(/\n$/, ""));
      return `\u0000CODEBLOCK${codeBlocks.length - 1}\u0000`;
    });

    // Horizontal rules
    text = text.replace(/^(?:[ \t]*)(-{3,}|\*{3,}|_{3,})[ \t]*$/gm, "<hr>");

    // Headings 1-6
    text = text.replace(/^[ \t]*###### (.*)$/gm, "<h6>$1</h6>");
    text = text.replace(/^[ \t]*##### (.*)$/gm, "<h5>$1</h5>");
    text = text.replace(/^[ \t]*#### (.*)$/gm, "<h4>$1</h4>");
    text = text.replace(/^[ \t]*### (.*)$/gm, "<h3>$1</h3>");
    text = text.replace(/^[ \t]*## (.*)$/gm, "<h2>$1</h2>");
    text = text.replace(/^[ \t]*# (.*)$/gm, "<h1>$1</h1>");

    // Blockquotes
    text = text.replace(/^[ \t]*&gt; ?(.*)$/gm, "<blockquote>$1</blockquote>");
    text = text.replace(/<\/blockquote>\n<blockquote>/g, "\n");

    // Unordered & ordered lists (line-based, simple + reliable)
    const lines = text.split("\n");
    let out = [];
    let listType = null;
    for(let i = 0; i < lines.length; i++){
      const line = lines[i];
      const ul = line.match(/^[ \t]*[-*+] (.*)$/);
      const ol = line.match(/^[ \t]*\d+\. (.*)$/);
      if(ul){
        if(listType !== "ul"){ if(listType) out.push(`</${listType}>`); out.push("<ul>"); listType = "ul"; }
        out.push(`<li>${ul[1]}</li>`);
      } else if(ol){
        if(listType !== "ol"){ if(listType) out.push(`</${listType}>`); out.push("<ol>"); listType = "ol"; }
        out.push(`<li>${ol[1]}</li>`);
      } else {
        if(listType){ out.push(`</${listType}>`); listType = null; }
        out.push(line);
      }
    }
    if(listType) out.push(`</${listType}>`);
    text = out.join("\n");

    // Bold
    text = text.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    // Italics
    text = text.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    // Inline code
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Images
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraphs: wrap loose lines that aren't already tags
    text = text
      .split(/\n{2,}/)
      .map(block => {
        const trimmed = block.trim();
        if(!trimmed) return "";
        if(/^<(h[1-6]|ul|ol|li|blockquote|hr|pre|img)/.test(trimmed)) return trimmed;
        return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
      })
      .join("\n");

    // Restore code blocks
    text = text.replace(/\u0000CODEBLOCK(\d+)\u0000/g, function(_, idx){
      return `<pre><code>${codeBlocks[parseInt(idx, 10)]}</code></pre>`;
    });

    return text.trim();
  }

  function render(){
    const raw = markdownInput.value;
    const html = convertMarkdown(raw);

    if(!raw.trim()){
      htmlOutput.innerHTML = '<span class="empty-hint">Your generated HTML will show up here…</span>';
      preview.innerHTML = '<span class="empty-hint">Your preview will render here…</span>';
    } else {
      htmlOutput.textContent = html;
      preview.innerHTML = html;
    }

    const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;
    wordCount.textContent = `${words} word${words === 1 ? "" : "s"}`;
    charCount.textContent = `${html.length} chars`;
  }

  markdownInput.addEventListener("input", render);

  // Toolbar actions
  document.getElementById("btn-clear").addEventListener("click", function(){
    markdownInput.value = "";
    render();
    markdownInput.focus();
  });

  document.getElementById("btn-sample").addEventListener("click", function(){
    markdownInput.value = `# Welcome

A **calm** little demo of _Markdown_ in action.

## Why it's nice

- Live preview as you type
- Works with [links](https://example.com) and \`inline code\`
- Supports > blockquotes and images

> Simplicity is the ultimate sophistication.

1. Write markdown
2. Watch it convert
3. Copy or download the result

---

\`\`\`
console.log("and code blocks too");
\`\`\`
`;
    render();
  });

  document.getElementById("btn-copy-html").addEventListener("click", async function(){
    const html = convertMarkdown(markdownInput.value);
    try{
      await navigator.clipboard.writeText(html);
      statusPill.textContent = "Copied!";
    } catch(e){
      statusPill.textContent = "Couldn't copy";
    }
    statusPill.classList.add("show");
    setTimeout(() => statusPill.classList.remove("show"), 1600);
  });

  document.getElementById("btn-download").addEventListener("click", function(){
    const html = convertMarkdown(markdownInput.value);
    const full = `<!DOCTYPE html>\n<html><head><meta charset="UTF-8"></head><body>\n${html}\n</body></html>`;
    const blob = new Blob([full], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Theme toggle (per-viewer convenience only)
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const themeLabel = document.getElementById("theme-label");

  function applyStoredTheme(){
    let stored = null;
    try{ stored = localStorage.getItem("md-theme"); } catch(e){}
    if(stored === "dark"){
      document.documentElement.setAttribute("data-theme", "dark");
      themeIcon.textContent = "☀️"; themeLabel.textContent = "Light";
    } else if(stored === "light"){
      document.documentElement.setAttribute("data-theme", "light");
      themeIcon.textContent = "🌙"; themeLabel.textContent = "Dark";
    }
  }

  themeToggle.addEventListener("click", function(){
    const isDarkNow = document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDarkNow ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    themeIcon.textContent = next === "dark" ? "☀️" : "🌙";
    themeLabel.textContent = next === "dark" ? "Light" : "Dark";
    try{ localStorage.setItem("md-theme", next); } catch(e){}
  });

  applyStoredTheme();
  render();
})();
