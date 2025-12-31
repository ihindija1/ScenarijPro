const btn = document.querySelector(".button");
const cardNew = document.querySelector(".card-new");

function createScenario() {
  const title = prompt("Naslov scenarija:");
  PoziviAjax.postScenario(title || "", (status, data) => {
    if (status !== 200) return alert(data.message || "Greška");
    window.location.href = `writing.html?scenarioId=${data.id}`;
  });
}

if (btn) btn.addEventListener("click", createScenario);
if (cardNew) cardNew.addEventListener("click", createScenario);
