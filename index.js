
// import * as pageContent from 'get-content';
const pageContent = require('get-content');

document.addEventListener("DOMContentLoaded", function () {
  var getPageContentButton = document.getElementById("get-page-content");

  getPageContentButton.addEventListener("click", function () {
    chrome.tabs.query(
      { active: true, currentWindow: true },
      async function (tabs) {
        if (tabs.length > 0) {
          var activeTab = tabs[0];

          function printTitle() {
            document.body.style.backgroundColor = "green";
            let text = document.body.innerText;
            return text;
          }

          // const url = "https://spiderum.com/bai-dang/He-den-roi-ta-di-bien-thoi-LkYZoLVcLtkG";
          // const type = linkType(url);

          // get(url).then((pageContent) => console.log('pageContent:', pageContent))

          await chrome.scripting
            .executeScript({
              target: { tabId: activeTab.id },
              func: printTitle,
            })
            .then(async (data) => {
              const prompt = `Summarize the following text:\n ${data[0].result}`;
              // const result = await summarizeText(prompt);
              document.getElementById("content").innerText = prompt;
            });
        } else {
          alert(2);
        }
      }
    );
  });
});

function getPageContent() {
  return document.documentElement.outerHTML;
}

async function summarizeText(prompt) {
  const apiKey = "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"
  const url = "https://api.openai.com/v1/completions";

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      //   model: "text-davinci-003",
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 1,
    }),
  };

  return await fetch(url, options)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Request failed");
      }
      return response.json();
    })
    .then((data) => {
      const summary = data.choices[0].text.trim();
      return summary;
    })
    .catch((error) => {
      console.error(error);
    });
}
