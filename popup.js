let listConversation = [];
let mappingChatInConversation = {};
let selectLanguageValue = "jp";
let isUserLogin = true;
const PROMPT_MAX_LENGTH = 2900;
let pageDocument;

document.addEventListener("DOMContentLoaded", async function () {
  const Readability = window["Readability"];

  // pdfjs Library
  const pdfjsLib = window["pdfjs-dist/build/pdf"];
  // div content
  let loadingContent = document.getElementById("loading");
  let divContent = document.getElementById("content");
  let divMoreContent = document.getElementById("more-content-div");
  let selectLanguageEl = document.getElementById("select-language");
  let loadAllExtension = document.getElementById("loading-extension");
  let titleHeader = document.getElementById("title-header");
  // button
  let summarizeButton = document.getElementById("summarize-button");
  let loadMoreButton = document.getElementById("more-content");
  let copyButton = document.getElementById("copy-button");
  let retryButton = document.getElementById("retry-button");

  // link
  let relipaLink = document.getElementById("relipa-link");
  relipaLink.addEventListener("click", function (event) {
    event.preventDefault();
    chrome.tabs.create({
      url: "https://relipasoft.com/?utm_source=Chrome+Extension&utm_medium=link&utm_campaign=ChatGPT+Summarize+Everything+Extension&utm_id=chatgpt_extension",
    });
  });

  if (document.readyState !== "loading") {
    isUserLogin = await fetchSessionInfo(loadAllExtension);

    await fetchUserConversation().then(async (data) => {
      await fetchFirstConversation(data);
    });
  }

  if (!isUserLogin) {
    divContent.innerHTML =
      selectLanguageEl === "en"
        ? `<div>Please Login in <span id="redirect-link" class="redirectLink" href="https://chat.openai.com/">chat.openai</span> platform</div>`
        : `<div><span id="redirect-link" class="redirectLink" href="https://chat.openai.com/">chat.openai </span> プラットフォームにログインしてください</div>`;

    summarizeButton.disabled = true;
    selectLanguageEl.disabled = true;
    selectLanguageEl.style.cursor = "not-allowed";

    let redirectLink = document.getElementById("redirect-link");
    redirectLink.addEventListener("click", function (event) {
      event.preventDefault();
      chrome.tabs.create({ url: "https://chat.openai.com" });
    });
    loadAllExtension.style.display = "none";
  } else {
    divContent.innerText = "";
    summarizeButton.disabled = false;
    selectLanguageEl.disabled = false;
    selectLanguageEl.style.cursor = "pointer"
    loadAllExtension.style.display = "none";
  }

  //onchange select
  selectLanguageEl.addEventListener("change", function (event) {
    selectLanguageValue = event.target.value;
    handleChangeTextBaseOnLang(
      event.target.value,
      titleHeader,
      summarizeButton,
      loadMoreButton,
      retryButton,
      copyButton
    );
    const divContentText = divContent.innerText;
    if (divContentText.length > 0) {
      // retry summarize blog
      document.getElementById("content").innerText = "";
      document.getElementById("more-content-div").innerText = "";
      document.getElementById("more-content").style.display = "none";
      loadMoreButton.style.display = "none";

      chrome.tabs.query(
        { active: true, currentWindow: true },
        async function (tabs) {
          if (tabs.length > 0) {
            var activeTab = tabs[0];

            async function printTitle() {
              let text = document.documentElement.innerHTML;
              return text;
            }

            await chrome.scripting
              .executeScript({
                target: { tabId: activeTab.id },
                func: printTitle,
              })
              .then(async (blogContent) => {
                let prompt;
                if (!activeTab?.url?.includes(".pdf")) {
                  const importedCode = blogContent[0]?.result;
                  let fakeHtml = document.createElement("html");
                  fakeHtml.innerHTML = importedCode;
                  const fakeHTMLouter = fakeHtml.outerHTML;
                  const parser = new DOMParser();
                  const docExample = parser.parseFromString(
                    fakeHTMLouter,
                    "text/html"
                  );
                  const article = new Readability(docExample).parse();

                  const blogContentSummarize =
                    article?.textContent?.length > PROMPT_MAX_LENGTH
                      ? article?.textContent?.slice(0, PROMPT_MAX_LENGTH)
                      : article?.textContent;

                  prompt = `Please ignore all previous instructions. \nYour output should use the following template:
              Summary

              Facts
              - 
              Your task is to summarize the text I give you in up to seven bulletpoints and start with a short summary.\n Please reply in ${
                event.target.value === "jp" ? "Japanese" : "English"
              }. \nDon't include link to your result.\n The url to extract facts from is this: ${
                    activeTab?.url
                  }. If the url has a paywall or no content use this text: ${blogContentSummarize}.  `;
                } else {
                  const fullText = await handleGetPDFOnlineContent(
                    pdfjsLib,
                    activeTab?.url,
                    loadAllExtension
                  );
                  const contentPDFLimitInPrompt =
                    fullText?.length > PROMPT_MAX_LENGTH
                      ? fullText?.slice(0, PROMPT_MAX_LENGTH)
                      : fullText;

                  prompt = `Please ignore all previous instructions. \nYour output should use the following template:
                Summary
  
                Facts
                - 
                Your task is to summarize the text I give you in up to seven bulletpoints and start with a short summary. Reply in ${
                  selectLanguageValue === "jp" ? "Japanese" : "English"
                } .The text is : ${contentPDFLimitInPrompt}.`;
                }

                await summarizeText(
                  prompt,
                  loadingContent,
                  divContent,
                  listConversation,
                  mappingChatInConversation,
                  loadMoreButton,
                  copyButton,
                  retryButton,
                  summarizeButton,
                  selectLanguageEl
                );
              });
          } else {
            // alert(2);
          }
        }
      );
    }
  });

  // Button summarize
  summarizeButton.addEventListener("click", function () {
    chrome.tabs.query(
      { active: true, currentWindow: true },
      async function (tabs) {
        if (tabs.length > 0) {
          var activeTab = tabs[0];

          async function printTitle() {
            let text = document.documentElement.innerHTML;
            return text;
          }

          await chrome.scripting
            .executeScript({
              target: { tabId: activeTab.id },
              func: printTitle,
            })
            .then(async (blogContent) => {
              let prompt;

              if (!activeTab?.url?.includes(".pdf")) {
                const importedCode = blogContent[0]?.result;
                let fakeHtml = document.createElement("html");
                fakeHtml.innerHTML = importedCode;
                const fakeHTMLouter = fakeHtml.outerHTML;
                const parser = new DOMParser();
                const docExample = parser.parseFromString(
                  fakeHTMLouter,
                  "text/html"
                );
                const article = new Readability(docExample).parse();

                const blogContentSummarize =
                  article?.textContent?.length > PROMPT_MAX_LENGTH
                    ? article?.textContent?.slice(0, PROMPT_MAX_LENGTH)
                    : article?.textContent;

                prompt = `Please ignore all previous instructions. \nYour output should use the following template:
              Summary

              Facts
              -
              Your task is to summarize the text I give you in up to seven bulletpoints and start with a short summary. Reply in ${
                selectLanguageValue === "jp" ? "Japanese" : "English"
              } .The url to extract facts from is this: ${
                activeTab?.url
              }. If the url has a paywall or no content use this text: ${blogContentSummarize}.`;
              } else {
                const fullText = await handleGetPDFOnlineContent(
                  pdfjsLib,
                  activeTab?.url,
                  loadAllExtension
                );
                const contentPDFLimitInPrompt =
                  fullText?.length > PROMPT_MAX_LENGTH
                    ? fullText?.slice(0, PROMPT_MAX_LENGTH)
                    : fullText;

                prompt = `Please ignore all previous instructions. \nYour output should use the following template:
              Summary

              Facts
              -
              Your task is to summarize the text I give you in up to seven bulletpoints and start with a short summary. Reply in ${
                selectLanguageValue === "jp" ? "Japanese" : "English"
              }.The text is : ${contentPDFLimitInPrompt}.`;
              }

              await summarizeText(
                prompt,
                loadingContent,
                divContent,
                listConversation,
                mappingChatInConversation,
                loadMoreButton,
                copyButton,
                retryButton,
                summarizeButton,
                selectLanguageEl
              );
            });
        } else {
          // alert(2);
        }
      }
    );
  });

  // Button load more content
  loadMoreButton.addEventListener("click", function () {
    loadMoreButton.style.display = "none";
    // script moreLoadContent
    chrome.tabs.query(
      { active: true, currentWindow: true },
      async function (tabs) {
        if (tabs.length > 0) {
          var activeTab = tabs[0];

          function printTitle() {
            let text = document.documentElement.innerHTML;
            return text;
          }

          await chrome.scripting
            .executeScript({
              target: { tabId: activeTab.id },
              func: printTitle,
            })
            .then(async (blogContent) => {
              const currentDivContent = divContent.innerText;
              let prompts;
              if (!activeTab?.url?.includes(".pdf")) {
                const importedCode = blogContent[0]?.result;
                let fakeHtml = document.createElement("html");
                fakeHtml.innerHTML = importedCode;
                const fakeHTMLouter = fakeHtml.outerHTML;
                const parser = new DOMParser();
                const docExample = parser.parseFromString(
                  fakeHTMLouter,
                  "text/html"
                );
                const article = new Readability(docExample).parse();

                const blogContentSummarize =
                  article?.textContent?.length > (PROMPT_MAX_LENGTH - 1000)
                    ? article?.textContent?.slice(0, (PROMPT_MAX_LENGTH - 1000))
                    : article?.textContent;

                prompts = `Please ignore all previous instructions.
                    I have this string:
                    ${currentDivContent}
                    it is a summarize of this blog: ${
                      activeTab?.url
                    } If the url has a paywall or no content use this text: ${blogContentSummarize}.
                    Your task is continue writing base on the above string.
                    The result just be some bulletpoints. Rely in ${
                      selectLanguageValue === "jp" ? "Japanese" : "English"
                    }.
                    Your output should use the following template:
                    
                    - 
                    .Rely in ${
                      selectLanguageValue === "jp" ? "Japanese" : "English"
                    }.
                    `;
              } else {
                const fullText = await handleGetPDFOnlineContent(
                  pdfjsLib,
                  activeTab?.url,
                  loadAllExtension
                );
                const contentPDFLimitInPrompt =
                  fullText?.length > (PROMPT_MAX_LENGTH - 1000)
                    ? fullText?.slice(0, (PROMPT_MAX_LENGTH - 1000))
                    : fullText;

                prompts = `Please ignore all previous instructions.
                  I have this string:
                  ${currentDivContent}
                  it is a summarize of this text: ${contentPDFLimitInPrompt}.
                  Your task is continue writing base on the above string.
                  The result just be some bulletpoints. Rely in ${
                    selectLanguageValue === "jp" ? "Japanese" : "English"
                  }.
                  Your output should use the following template:
                  
                  - .
                  `;
              }
              await continueSummarizeText(
                prompts,
                loadingContent,
                divMoreContent,
                loadMoreButton,
                copyButton,
                retryButton,
                summarizeButton,
                selectLanguageEl
              );
            });
        } else {
          // alert(2);
        }
      }
    );
  });

  // Button copy content
  copyButton.addEventListener("click", function () {
    // Create a temporary textarea element
    const textarea = document.createElement("textarea");
    textarea.value = divContent.innerText;
    document.body.appendChild(textarea);

    // Copy the text from the textarea
    textarea.select();
    document.execCommand("copy");

    // Remove the temporary textarea
    document.body.removeChild(textarea);

    // Provide visual feedback
    copyButton.innerText =
      selectLanguageValue === "en" ? "Copied" : "コピー終了";
    setTimeout(function () {
      copyButton.innerText = selectLanguageValue === "en" ? "Copy" : "コピー";
    }, 2000);
  });

  // Retry button
  retryButton.addEventListener("click", function () {
    divContent.innerText = "";
    divMoreContent.innerText = "";
    loadMoreButton.style.display = "none";
    chrome.tabs.query(
      { active: true, currentWindow: true },
      async function (tabs) {
        if (tabs.length > 0) {
          var activeTab = tabs[0];

          async function printTitle() {
            let docHTML = document.documentElement.innerHTML;
            return docHTML;
          }

          await chrome.scripting
            .executeScript({
              target: { tabId: activeTab.id },
              func: printTitle,
            })
            .then(async (docHTML) => {
              let prompt;
              if (!activeTab?.url?.includes(".pdf")) {
                const importedCode = docHTML[0]?.result;
                let fakeHtml = document.createElement("html");
                fakeHtml.innerHTML = importedCode;
                const fakeHTMLouter = fakeHtml.outerHTML;
                const parser = new DOMParser();
                const docExample = parser.parseFromString(
                  fakeHTMLouter,
                  "text/html"
                );
                const article = new Readability(docExample).parse();

                const blogContentSummarize =
                  article?.textContent?.length > PROMPT_MAX_LENGTH
                    ? article?.textContent?.slice(0, PROMPT_MAX_LENGTH)
                    : article?.textContent;

                prompt = `Please ignore all previous instructions.
              Your output should use the following template:

              Summary

              Facts


              - 

              Your task is to summarize the text I give you in up to seven bulletpoints and start with a short summary. Reply in ${
                selectLanguageValue === "jp" ? "Japanese" : "English"
              }. The url to extract facts from is this: ${
                  activeTab?.url
                }. If the url has a paywall or no content use this text: ${blogContentSummarize}.
              `;
              } else {
                const fullText = await handleGetPDFOnlineContent(
                  pdfjsLib,
                  activeTab?.url,
                  loadAllExtension
                );
                const contentPDFLimitInPrompt =
                  fullText?.length > PROMPT_MAX_LENGTH
                    ? fullText?.slice(0, PROMPT_MAX_LENGTH)
                    : fullText;

                prompt = `Please ignore all previous instructions. \nYour output should use the following template:
            Summary

            Facts
            - 
            Your task is to summarize the text I give you in up to seven bulletpoints and start with a short summary. Reply in ${
              selectLanguageValue === "jp" ? "Japanese" : "English"
            }.The text is : ${contentPDFLimitInPrompt}.`;
              }

              await summarizeText(
                prompt,
                loadingContent,
                divContent,
                listConversation,
                mappingChatInConversation,
                loadMoreButton,
                copyButton,
                retryButton,
                summarizeButton,
                selectLanguageEl
              );
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

async function summarizeText(
  prompt,
  loadingContent,
  divContent,
  listConversation,
  mappingChatInConversation,
  buttonMoreContent,
  buttonCopyContent,
  buttonRetryContent,
  selectEl,
  buttonSummarize
) {
  try {
    handleDOMWhenCallingAPI(
      true,
      loadingContent,
      selectEl,
      buttonSummarize,
      buttonRetryContent,
      buttonCopyContent,
      buttonMoreContent
    );
    const accessToken = localStorage.getItem("accessToken");
    const url = "https://chat.openai.com/backend-api/conversation";
    const parentMessageId = handleGetParentMessageId(mappingChatInConversation);

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: "next",
        messages: [
          {
            id: "22c3e1e2-8005-4340-9071-9165b35e7e73",
            role: "user",
            content: {
              content_type: "text",
              parts: [prompt],
            },
          },
        ],
        model: "text-davinci-002-render-sha",
        parent_message_id: parentMessageId,
      }),
    };
    return await fetch(url, options)
      .then((response) => response.body)
      .then((rb) => {
        const reader = rb.getReader();

        return new ReadableStream({
          start(controller) {
            function push() {
              reader.read().then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                controller.enqueue(value);
                push();
              });
            }
            push();
          },
        });
      })
      .then(async (stream) => {
        const reader = await stream.getReader();
        let result;

        while (!(result = await reader.read()).done) {
          const stringValue = new TextDecoder().decode(result.value);
          if (stringValue) {
            const regex = /"parts":\s*\[(.*?)\]/s;
            const match = stringValue.match(regex);
            const partsString = match?.[1];
            if (partsString) {
              const regexEmoji = /\\u([\dA-F]{4})/gi;
              const textWithEmojis = partsString?.replace(
                regexEmoji,
                (match, grp) => String.fromCharCode(parseInt(grp, 16))
              );
              divContent.innerText = JSON.parse(textWithEmojis);
            }
          }
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(async () => {
        handleDOMWhenCallingAPI(
          false,
          loadingContent,
          selectEl,
          buttonSummarize,
          buttonRetryContent,
          buttonCopyContent,
          buttonMoreContent
        );
        buttonMoreContent.style.display = "block";
        buttonCopyContent.style.display = "block";
        buttonRetryContent.style.display = "block";
        await fetchUserConversation().then(async (data) => {
          const firstConversation = data?.items[0];
          await updateConversationVisible(firstConversation?.id);
        });
      });
  } catch (error) {
    console.error(error);
  }
}

async function continueSummarizeText(
  prompts,
  loadingContent,
  divContent,
  loadMoreButton,
  copyButton,
  retryButton,
  summarizeButton,
  selectEl
) {
  // loadingContent.style.display = "block";
  handleDOMWhenCallingAPI(
    true,
    loadingContent,
    selectEl,
    summarizeButton,
    retryButton,
    copyButton,
    loadMoreButton
  );
  const accessToken = localStorage.getItem("accessToken");
  const url = "https://chat.openai.com/backend-api/conversation";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: "next",
      messages: [
        {
          id: "38cd96b8-4729-461d-b79c-9ce7c766b955",
          role: "user",
          content: {
            content_type: "text",
            parts: [prompts],
          },
        },
      ],
      model: "text-davinci-002-render-sha",
      steam: false,
      parent_message_id: "7fd222da-4f9c-48c2-9270-868bec94d8a0",
    }),
  };

  return await fetch(url, options)
    .then((response) => response.body)
    .then((rb) => {
      const reader = rb.getReader();

      return new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              push();
            });
          }
          push();
        },
      });
    })
    .then(async (stream) => {
      const reader = await stream.getReader();
      let result;

      while (!(result = await reader.read()).done) {
        const stringValue = new TextDecoder().decode(result.value);
        if (stringValue) {
          const regex = /"parts":\s*\[(.*?)\]/s;
          const match = stringValue.match(regex);
          const partsString = match?.[1];
          if (partsString) {
            const regexEmoji = /\\u([\dA-F]{4})/gi;
            const textWithEmojis = partsString?.replace(
              regexEmoji,
              (match, grp) => String.fromCharCode(parseInt(grp, 16))
            );
            divContent.innerText = JSON.parse(textWithEmojis);
          }
        }
      }
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(async () => {
      loadMoreButton.style.display = "none";
      loadingContent.style.display = "none";

      handleDOMWhenCallingAPI(
        false,
        loadingContent,
        selectEl,
        summarizeButton,
        retryButton,
        copyButton,
        loadMoreButton
      );

      await fetchUserConversation().then(async (data) => {
        const firstConversation = data?.items[0];
        await updateConversationVisible(firstConversation?.id);
      });
    });
}

async function fetchSessionInfo(loadingExtensionEl) {
  loadingExtensionEl.style.display = "block";
  let url = "https://chat.openai.com/api/auth/session";
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  return await fetch(url, options)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Request failed");
      }
      return response.json();
    })
    .then((data) => {
      if (Object.keys(data).length > 0) {
        localStorage.setItem("accessToken", data?.accessToken);
        return true;
      } else {
        throw new Error("Request failed");
      }
    })
    .catch((error) => {
      console.error("error:", error);
      return false;
    });
}

async function fetchUserConversation() {
  const accessToken = localStorage.getItem("accessToken");
  const url = "https://chat.openai.com/backend-api/conversations";
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  return await fetch(url, options)
    .then((response) => response.body)
    .then((rb) => {
      const reader = rb.getReader();
      return new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              push();
            });
          }
          push();
        },
      });
    })
    .then((stream) =>
      new Response(stream, { headers: { "Content-Type": "text/html" } }).text()
    )
    .then((result) => {
      const userConversationInfo = JSON.parse(result);
      listConversation = [...userConversationInfo?.items];
      return userConversationInfo;
    })
    .catch((error) => {
      console.error("error:", error);
    });
}

async function fetchFirstConversation(listConversation) {
  const firstConversationId = listConversation?.items[0]?.id;
  const accessToken = localStorage.getItem("accessToken");
  const url = `https://chat.openai.com/backend-api/conversation/${firstConversationId}`;

  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  return await fetch(url, options)
    .then((response) => response.body)
    .then((rb) => {
      const reader = rb.getReader();
      return new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              push();
            });
          }
          push();
        },
      });
    })
    .then((stream) =>
      new Response(stream, { headers: { "Content-Type": "text/html" } }).text()
    )
    .then((result) => {
      const firstConversationResult = JSON.parse(result);
      mappingChatInConversation = { ...firstConversationResult.mapping };
    });
}

function handleGetParentMessageId(mappingList) {
  const value = Object.values(mappingList).find((item) => {
    return (
      item?.children?.length === 0 &&
      item?.message &&
      item?.message?.content?.parts.length > 0
    );
  });
  return value?.id || "f16576d9-6176-40aa-a10f-776cf9ebfbb8";
}

function handleChangeTextBaseOnLang(
  lang = "jp",
  titleHeader,
  summarizeButton,
  buttonMore,
  buttonRetry,
  buttonCopy
) {
  if (lang === "jp") {
    titleHeader.innerText = "ChatGPT - 何でも要約！";
    summarizeButton.innerText = "要約スタート";
    buttonMore.innerText = "もっと見る";
    buttonRetry.innerText = "リトライ";
    buttonCopy.innerText = "コピー";
  } else {
    titleHeader.innerText = "ChatGPT - summarize everything!";
    summarizeButton.innerText = "Summarize";
    buttonMore.innerText = "More";
    buttonRetry.innerText = "Retry";
    buttonCopy.innerText = "Copy";
  }
}

async function handleGetPDFOnlineContent(pdfLib, url, loadingAllExtension) {
  loadingAllExtension.style.display = "block";
  const loadingDocument = pdfLib?.getDocument(url);
  const pdf = await loadingDocument.promise;

  const extractedText = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content?.items?.map((item) => item.str)?.join(" ");
    extractedText.push(pageText);
  }

  const fullText = extractedText.join(`\n`);
  loadingAllExtension.style.display = "none";
  return fullText;
}

function handleDOMWhenCallingAPI(
  isCalling,
  loadingContent,
  selectEl,
  buttonSummarize,
  buttonRetry,
  buttonCopy,
  buttonMore
) {
  if (isCalling) {
    loadingContent.style.display = "block";
    selectEl.disabled = true;
    buttonSummarize.disabled = true;
    buttonRetry.disabled = true;
    buttonCopy.disabled = true;
    buttonMore.disabled = true;
  } else {
    loadingContent.style.display = "none";
    selectEl.disabled = false;
    buttonSummarize.disabled = false;
    buttonRetry.disabled = false;
    buttonCopy.disabled = false;
    buttonMore.disabled = false;
  }
}

async function updateConversationVisible(id) {
  const accessToken = localStorage.getItem("accessToken");
  const url = `https://chat.openai.com/backend-api/conversation/${id}`;

  const options = {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      is_visible: false,
    }),
  };

  return await fetch(url, options)
    .then((response) => {
      return response.body;
    })
    .then((rb) => {
      const reader = rb.getReader();
      return new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              push();
            });
          }
          push();
        },
      });
    })
    .then((stream) =>
      new Response(stream, { headers: { "Content-Type": "text/html" } }).text()
    )
    .then(() => {
      // console.log("result:", result);
    });
}
