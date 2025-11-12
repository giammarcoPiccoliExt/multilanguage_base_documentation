/* ================== DEPLOY FUNCTIONS ================== */

function editAutomationYaml(setTrue, callback) {
  const { username, repo, token } = getCurrentCredentials();
  const url = `https://api.github.com/repos/${username}/${repo}/contents/.github/workflows/Automation.yml`;
  $.ajax({
    url, headers: { Authorization: `token ${token}` },
    success: file => {
      let content = decodeBase64Utf8(file.content)
        .replace(/RUN_DEPLOY_DOCS: '(true|false)'/, `RUN_DEPLOY_DOCS: '${setTrue}'`);
      $.ajax({
        url, type: "PUT", headers: { Authorization: `token ${token}` },
        data: JSON.stringify({ message: setTrue ? "Abilita deploy docs" : "Disabilita deploy docs", content: encodeUtf8Base64(content), sha: file.sha }),
        success: res => callback?.(res.content.sha),
        error: () => alert("Errore nel salvataggio di Automation.yml.")
      });
    },
    error: () => alert("Errore nel caricamento di Automation.yml.")
  });
}