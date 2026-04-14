function normalizeLine(line) {
  return typeof line === "string" ? line.replace(/\r/g, "") : "";
}

function toParagraphStyleType(line) {
  const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
  if (!headingMatch) {
    return { text: line, styleType: "NORMAL_TEXT" };
  }

  const level = headingMatch[1].length;
  const content = headingMatch[2] || "";

  return {
    text: content,
    styleType: `HEADING_${level}`,
  };
}

function stripBasicListMarker(text) {
  return text.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, "");
}

export function markdownToGoogleDocsRequests(markdown) {
  const source = typeof markdown === "string" ? markdown : "";
  const lines = source.split("\n");
  const requests = [];

  let index = 1;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    const hasListMarker = /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line);
    const baseText = hasListMarker ? stripBasicListMarker(line) : line;
    const { text, styleType } = toParagraphStyleType(baseText);
    const lineText = `${text}\n`;

    requests.push({
      insertText: {
        location: { index },
        text: lineText,
      },
    });

    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: index,
          endIndex: index + lineText.length,
        },
        paragraphStyle: {
          namedStyleType: styleType,
        },
        fields: "namedStyleType",
      },
    });

    index += lineText.length;
  }

  return requests;
}

function readParagraphText(paragraph) {
  const elements = Array.isArray(paragraph?.elements) ? paragraph.elements : [];
  return elements
    .map((element) => element?.textRun?.content || "")
    .join("")
    .replace(/\n$/, "");
}

function styleToMarkdownPrefix(styleType) {
  const match = typeof styleType === "string" && styleType.match(/^HEADING_(\d)$/);
  if (!match) {
    return "";
  }

  const level = Number(match[1]);
  if (level < 1 || level > 6) {
    return "";
  }

  return `${"#".repeat(level)} `;
}

export function googleDocsDocumentToMarkdown(document) {
  const content = Array.isArray(document?.body?.content) ? document.body.content : [];
  const outputLines = [];

  for (const block of content) {
    const paragraph = block?.paragraph;
    if (!paragraph) {
      continue;
    }

    const text = readParagraphText(paragraph);
    if (!text.trim()) {
      outputLines.push("");
      continue;
    }

    const styleType = paragraph?.paragraphStyle?.namedStyleType || "NORMAL_TEXT";
    const headingPrefix = styleToMarkdownPrefix(styleType);

    if (paragraph?.bullet) {
      outputLines.push(`- ${text}`);
      continue;
    }

    outputLines.push(`${headingPrefix}${text}`);
  }

  return outputLines.join("\n").replace(/\n{3,}/g, "\n\n");
}
