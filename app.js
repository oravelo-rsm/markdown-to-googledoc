import { googleDocsDocumentToMarkdown } from "./src/index.js";

const markdownInput = document.querySelector("#markdown-input");
const docsInput = document.querySelector("#docs-input");
const output = document.querySelector("#output");
const copyOutputButton = document.querySelector("#copy-output");
const markdownToDocsButton = document.querySelector("#markdown-to-docs");
const docsToMarkdownButton = document.querySelector("#docs-to-markdown");

const copyState = {
  plain: "",
  html: "",
};

const sampleMarkdown = `# Sample Title
This is a starter converter.

- item one
- item two`;

const sampleDocsJson = {
  body: {
    content: [
      {
        paragraph: {
          paragraphStyle: { namedStyleType: "HEADING_1" },
          elements: [{ textRun: { content: "Sample Title\n" } }],
        },
      },
      {
        paragraph: {
          paragraphStyle: { namedStyleType: "NORMAL_TEXT" },
          elements: [{ textRun: { content: "This is a starter converter.\n" } }],
        },
      },
    ],
  },
};

markdownInput.value = sampleMarkdown;
docsInput.value = JSON.stringify(sampleDocsJson, null, 2);

function setOutput(text) {
  const plain = String(text ?? "");
  output.classList.remove("is-rich");
  output.classList.add("is-plain");
  output.textContent = plain;
  copyState.plain = plain;
  copyState.html = "";
  output.scrollTop = 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  );
  return html;
}

function markdownToRichHtml(markdown) {
  const lines = String(markdown ?? "").split("\n");
  const parts = [];
  let listType = "";

  const closeList = () => {
    if (listType) {
      parts.push(`</${listType}>`);
      listType = "";
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      parts.push(`<h${level}>${applyInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        parts.push("<ul>");
      }
      parts.push(`<li>${applyInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        parts.push("<ol>");
      }
      parts.push(`<li>${applyInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    closeList();
    parts.push(`<p>${applyInlineMarkdown(line)}</p>`);
  }

  closeList();
  return parts.join("\n");
}

function setRichOutput(markdown) {
  const richHtml = markdownToRichHtml(markdown);
  const plain = String(markdown ?? "");
  output.classList.remove("is-plain");
  output.classList.add("is-rich");
  output.innerHTML = richHtml;
  copyState.plain = plain;
  copyState.html = `<html><body>${richHtml}</body></html>`;
  output.scrollTop = 0;
}

function fallbackCopyText(text) {
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.setAttribute("readonly", "");
  temp.style.position = "absolute";
  temp.style.left = "-9999px";
  document.body.appendChild(temp);
  temp.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(temp);
  return copied;
}

function makeParagraphBlock(text, options = {}) {
  const value = String(text ?? "").replace(/\r/g, "");
  const styleType = options.styleType || "NORMAL_TEXT";
  const paragraph = {
    paragraphStyle: { namedStyleType: styleType },
    elements: [{ textRun: { content: `${value}\n` } }],
  };

  if (options.bullet) {
    paragraph.bullet = {};
  }

  return { paragraph };
}

function detectHeadingFromText(text) {
  const match = String(text).match(/^(#{1,6})\s+(.+)$/);
  if (!match) {
    return null;
  }

  return {
    styleType: `HEADING_${match[1].length}`,
    content: match[2],
  };
}

function textToGoogleDocsDocument(plainText) {
  const lines = String(plainText ?? "").split("\n");
  const content = [];

  for (const line of lines) {
    const normalized = line.replace(/\r/g, "");
    const heading = detectHeadingFromText(normalized);

    if (heading) {
      content.push(makeParagraphBlock(heading.content, { styleType: heading.styleType }));
      continue;
    }

    const listMatch = normalized.match(/^\s*(?:[-*+]\s+|\d+\.\s+)(.+)$/);
    if (listMatch) {
      content.push(makeParagraphBlock(listMatch[1], { bullet: true }));
      continue;
    }

    content.push(makeParagraphBlock(normalized));
  }

  return { body: { content } };
}

function htmlToGoogleDocsDocument(html, plainText = "") {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const blocks = [];

  const pushTextBlock = (text, styleType = "NORMAL_TEXT", bullet = false) => {
    const cleaned = String(text ?? "").replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return;
    }
    blocks.push(makeParagraphBlock(cleaned, { styleType, bullet }));
  };

  const readTextWithoutNestedLists = (item) => {
    const clone = item.cloneNode(true);
    for (const child of Array.from(clone.querySelectorAll("ul, ol"))) {
      child.remove();
    }
    return clone.textContent || "";
  };

  const walk = (node) => {
    if (!(node instanceof Element)) {
      return;
    }

    const tag = node.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag.slice(1));
      pushTextBlock(node.textContent || "", `HEADING_${level}`);
      return;
    }

    if (tag === "p" || tag === "div") {
      pushTextBlock(node.textContent || "", "NORMAL_TEXT");
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.children).filter(
        (child) => child instanceof Element && child.tagName.toLowerCase() === "li"
      );

      for (const item of items) {
        pushTextBlock(readTextWithoutNestedLists(item), "NORMAL_TEXT", true);

        for (const child of Array.from(item.children)) {
          if (!(child instanceof Element)) {
            continue;
          }
          const childTag = child.tagName.toLowerCase();
          if (childTag === "ul" || childTag === "ol") {
            walk(child);
          }
        }
      }
      return;
    }

    if (tag === "br") {
      pushTextBlock("", "NORMAL_TEXT");
      return;
    }

    for (const child of Array.from(node.children)) {
      walk(child);
    }
  };

  for (const child of Array.from(parsed.body.children)) {
    walk(child);
  }

  if (!blocks.length) {
    return textToGoogleDocsDocument(plainText);
  }

  return { body: { content: blocks } };
}

function convertMarkdownInputToRichOutput() {
  setRichOutput(markdownInput.value);
}

function convertDocsInputToMarkdownOutput() {
  try {
    const parsed = JSON.parse(docsInput.value);
    const markdown = googleDocsDocumentToMarkdown(parsed);
    setOutput(markdown);
  } catch (error) {
    setOutput(`Invalid JSON: ${error.message}`);
  }
}

setOutput("Run a conversion to see output.");

markdownToDocsButton.addEventListener("click", () => {
  convertMarkdownInputToRichOutput();
});

docsToMarkdownButton.addEventListener("click", () => {
  convertDocsInputToMarkdownOutput();
});

markdownInput.addEventListener("paste", () => {
  window.setTimeout(() => {
    convertMarkdownInputToRichOutput();
  }, 0);
});

docsInput.addEventListener("paste", (event) => {
  const clipboard = event.clipboardData;
  const html = clipboard?.getData("text/html") || "";
  const plain = clipboard?.getData("text/plain") || "";

  if (html.trim()) {
    event.preventDefault();
    const generated = htmlToGoogleDocsDocument(html, plain);
    docsInput.value = JSON.stringify(generated, null, 2);
    convertDocsInputToMarkdownOutput();
    return;
  }

  window.setTimeout(() => {
    convertDocsInputToMarkdownOutput();
  }, 0);
});

copyOutputButton.addEventListener("click", async () => {
  const plain = copyState.plain || output.textContent || "";
  const rich = copyState.html;
  if (!plain.trim()) {
    return;
  }

  const originalLabel = copyOutputButton.textContent;

  try {
    if (
      rich &&
      navigator.clipboard &&
      window.isSecureContext &&
      typeof ClipboardItem !== "undefined" &&
      typeof navigator.clipboard.write === "function"
    ) {
      const item = new ClipboardItem({
        "text/html": new Blob([rich], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(plain);
    } else {
      const copied = fallbackCopyText(plain);
      if (!copied) {
        throw new Error("Clipboard API unavailable");
      }
    }
    copyOutputButton.textContent = "Copied!";
  } catch (error) {
    copyOutputButton.textContent = "Copy Failed";
  }

  setTimeout(() => {
    copyOutputButton.textContent = originalLabel;
  }, 1300);
});
