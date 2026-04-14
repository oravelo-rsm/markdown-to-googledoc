import {
  markdownToGoogleDocsRequests,
  googleDocsDocumentToMarkdown,
} from "./src/index.js";

const markdownInput = document.querySelector("#markdown-input");
const docsInput = document.querySelector("#docs-input");
const output = document.querySelector("#output");
const copyOutputButton = document.querySelector("#copy-output");
const markdownToDocsButton = document.querySelector("#markdown-to-docs");
const docsToMarkdownButton = document.querySelector("#docs-to-markdown");

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
  output.textContent = String(text ?? "");
  output.scrollTop = 0;
}

setOutput("Run a conversion to see output.");

markdownToDocsButton.addEventListener("click", () => {
  const requests = markdownToGoogleDocsRequests(markdownInput.value);
  setOutput(JSON.stringify(requests, null, 2));
});

docsToMarkdownButton.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(docsInput.value);
    const markdown = googleDocsDocumentToMarkdown(parsed);
    setOutput(markdown);
  } catch (error) {
    setOutput(`Invalid JSON: ${error.message}`);
  }
});

copyOutputButton.addEventListener("click", async () => {
  const text = output.textContent || "";
  if (!text.trim()) {
    return;
  }

  const originalLabel = copyOutputButton.textContent;

  try {
    await navigator.clipboard.writeText(text);
    copyOutputButton.textContent = "Copied!";
  } catch (error) {
    copyOutputButton.textContent = "Copy Failed";
  }

  setTimeout(() => {
    copyOutputButton.textContent = originalLabel;
  }, 1300);
});
