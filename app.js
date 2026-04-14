import {
  markdownToGoogleDocsRequests,
  googleDocsDocumentToMarkdown,
} from "./src/index.js";

const markdownInput = document.querySelector("#markdown-input");
const docsInput = document.querySelector("#docs-input");
const output = document.querySelector("#output");
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
output.textContent = "Run a conversion to see output.";

markdownToDocsButton.addEventListener("click", () => {
  const requests = markdownToGoogleDocsRequests(markdownInput.value);
  output.textContent = JSON.stringify(requests, null, 2);
});

docsToMarkdownButton.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(docsInput.value);
    const markdown = googleDocsDocumentToMarkdown(parsed);
    output.textContent = markdown;
  } catch (error) {
    output.textContent = `Invalid JSON: ${error.message}`;
  }
});
