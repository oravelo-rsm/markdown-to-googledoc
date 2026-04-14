function normalizeLine(line) {
  return typeof line === "string" ? line.replace(/\r/g, "") : "";
}

function getIndentLevel(whitespace) {
  const value = String(whitespace || "").replace(/\t/g, "    ");
  return Math.floor(value.length / 2);
}

function parseListLine(line) {
  const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
  if (!match) {
    return null;
  }

  const marker = match[2];
  return {
    indentLevel: getIndentLevel(match[1]),
    text: match[3],
    listType: /\d+\./.test(marker) ? "ordered" : "unordered",
  };
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

export function markdownToGoogleDocsRequests(markdown) {
  const source = typeof markdown === "string" ? markdown : "";
  const lines = source.split("\n");
  const requests = [];

  let index = 1;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    const listLine = parseListLine(line);

    let text = line;
    let styleType = "NORMAL_TEXT";
    if (listLine) {
      text = `${"\t".repeat(listLine.indentLevel)}${listLine.text}`;
    } else {
      const parsed = toParagraphStyleType(line);
      text = parsed.text;
      styleType = parsed.styleType;
    }

    const lineText = `${text}\n`;
    const startIndex = index;
    const endIndex = index + lineText.length;

    requests.push({
      insertText: {
        location: { index: startIndex },
        text: lineText,
      },
    });

    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex,
          endIndex,
        },
        paragraphStyle: {
          namedStyleType: styleType,
        },
        fields: "namedStyleType",
      },
    });

    if (listLine) {
      requests.push({
        createParagraphBullets: {
          range: {
            startIndex,
            endIndex,
          },
          bulletPreset:
            listLine.listType === "ordered"
              ? "NUMBERED_DECIMAL_ALPHA_ROMAN"
              : "BULLET_DISC_CIRCLE_SQUARE",
        },
      });
    }

    index = endIndex;
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

function lookupGlyphType(document, bullet) {
  if (bullet?.listType === "ordered") {
    return "DECIMAL";
  }
  if (bullet?.listType === "unordered") {
    return "BULLET";
  }

  const listId = bullet?.listId;
  if (!listId) {
    return "";
  }

  const nestingLevel = Number(bullet?.nestingLevel || 0);
  const list = document?.lists?.[listId];
  const levels = Array.isArray(list?.listProperties?.nestingLevels)
    ? list.listProperties.nestingLevels
    : [];
  return levels[nestingLevel]?.glyphType || "";
}

function isOrderedBullet(document, bullet) {
  const glyphType = String(lookupGlyphType(document, bullet)).toUpperCase();
  return /(DECIMAL|DIGIT|ROMAN|ALPHA|NUMBER)/.test(glyphType);
}

export function googleDocsDocumentToMarkdown(document) {
  const content = Array.isArray(document?.body?.content) ? document.body.content : [];
  const outputLines = [];
  const orderedCounters = [];

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
      const level = Number(paragraph.bullet?.nestingLevel || 0);
      const indent = "  ".repeat(Math.max(level, 0));

      if (isOrderedBullet(document, paragraph.bullet)) {
        if (orderedCounters.length <= level) {
          for (let i = orderedCounters.length; i <= level; i += 1) {
            orderedCounters.push(0);
          }
        }
        orderedCounters[level] += 1;
        orderedCounters.length = level + 1;
        outputLines.push(`${indent}${orderedCounters[level]}. ${text}`);
      } else {
        orderedCounters.length = level;
        outputLines.push(`${indent}- ${text}`);
      }
      continue;
    }

    orderedCounters.length = 0;

    outputLines.push(`${headingPrefix}${text}`);
  }

  return outputLines.join("\n").replace(/\n{3,}/g, "\n\n");
}
