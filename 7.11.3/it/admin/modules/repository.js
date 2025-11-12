/* ================== REPOSITORY STATUS ================== */

// Repository status management functions
function updateRepoStatusBox(state, msg) {
  const indicator = $("#repo-status-indicator"), text = $("#repo-status-text");
  if (state === "updating") indicator.css("background", "#fd6c35"), text.html("Stato repository: <b>In aggiornamento...</b>");
  else if (state === "ok") indicator.css("background", "#16c784"), text.html("Stato repository: <b>Aggiornata</b>");
  else indicator.css("background", "#ccc"), text.html("Stato repository: <b>?</b>");
  if (msg) text.append("<br><small>" + msg + "</small>");
}

function checkRepoStatus() {
  if (!window.currentUsername || !window.currentRepo || !window.currentToken) return updateRepoStatusBox("unknown");
  $.ajax({
    url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/commits?per_page=1`,
    headers: { Authorization: `token ${window.currentToken}` },
    success: commits => {
      if (commits?.length) {
        const lastDate = new Date(commits[0].commit.committer.date);
        const diff = (new Date() - lastDate) / 1000;
        updateRepoStatusBox(diff < 30 ? "updating" : "ok", "Ultima modifica: " + lastDate.toLocaleTimeString());
      }
    },
    error: () => updateRepoStatusBox("unknown")
  });
}