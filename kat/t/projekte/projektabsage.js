let absageProjekte = [];
let absageSchueler = [];
let absageErgebnis = [];
let absageProjektId = null;

const absageSelect = document.getElementById("absageProjektSelect");
const absageTbody = document.querySelector("#projektabsagung table tbody");
const absageInfo = document.getElementById("absageInfo");
const absageDownloadBtn = document.getElementById("downloadAbsage");
const absageBtn = document.getElementById("absagen");

function istAktivesProjekt(projekt) {
    return projekt && projekt.status !== false && projekt.status !== "false";
}

function stufenfilterAbsage(schueler, projekt) {
    const stufe = parseInt(String(schueler.klasse ?? "").match(/^\d+/)?.[0], 10);

    if (isNaN(stufe) || !projekt) {
        return false;
    }

    return stufe >= projekt.stufe_min && stufe <= projekt.stufe_max;
}

function projektAnzeige(projekt) {
    if (!projekt) return "";

    const zeit = [projekt.startzeit, projekt.endzeit]
        .filter(Boolean)
        .map(t => String(t).slice(0, 5))
        .join("–");

    return `${projekt.titel ?? ""}${projekt.ort ? ` (${projekt.ort}` : ""}${zeit ? `${projekt.ort ? ", " : " ("}${zeit}` : ""}${projekt.ort || zeit ? ")" : ""}`;
}

function projektOrtZeit(projekt) {
    if (!projekt) return "";

    const ort = projekt.ort ?? "";
    const zeit = [projekt.startzeit, projekt.endzeit]
        .filter(Boolean)
        .map(t => String(t).slice(0, 5))
        .join("–");

    if (ort && zeit) return `${ort} / ${zeit} Uhr`;
    return ort || zeit || "";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function zeigeAbsageTabelle() {
    absageTbody.innerHTML = "";

    absageErgebnis.forEach(s => {
        const projekt = s.neuesProjekt != null
            ? absageProjekte.find(p => Number(p.id) === Number(s.neuesProjekt))
            : null;

    const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(s.id)}</td>
            <td>${escapeHtml(s.klasse)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td class="mail" data-mail="${escapeHtml(s.mail)}" title="Klicke zum Kopieren">${escapeHtml(s.mail)}</td>
            <td>${projekt ? escapeHtml(`${projekt.id ?? ""} - ${projekt.titel ?? ""}${projektOrtZeit(projekt) ? ` (${projektOrtZeit(projekt)})` : ""}`) : ""}</td>
            <td>${escapeHtml(s.erstwunsch)}</td>
            <td>${escapeHtml(s.zweitwunsch)}</td>
            <td>${escapeHtml(s.drittwunsch)}</td>
        `;

        absageTbody.appendChild(tr);
        
        const zelle = tr.querySelector(".mail");
        zelle.style.cursor = "pointer";
        zelle.addEventListener("click", async () => {
            if (modus === "edit") return;

            const mail = zelle.dataset.mail;
            if (!mail) return;

            await navigator.clipboard.writeText(mail);

            zelle.textContent = "Kopiert ✓";
            zelle.title = "E-Mail wurde kopiert";

            setTimeout(() => {
                zelle.textContent = mail;
                zelle.title = "Klicken zum Kopieren";
            }, 3000);
        });
    });
}

function zeigeAbsageInfo() {
    const nichtZuordenbar = absageErgebnis.filter(s => s.neuesProjekt == null);
    const zugeordnet = absageErgebnis.length - nichtZuordenbar.length;

    if (!absageErgebnis.length) {
        absageInfo.textContent = "Keine Schüler sind diesem Projekt zugeordnet.";
        return;
    }

    let text = `${absageErgebnis.length} Schüler betroffen, ${zugeordnet} neu zugeordnet.`;

    if (nichtZuordenbar.length) {
        text += `\nNicht zuordenbar: ${nichtZuordenbar.map(s => `${s.name} (${s.id})`).join(", ")}`;
    }

    absageInfo.textContent = text;
    absageInfo.style.whiteSpace = "pre-line";
}

async function ladeAbsageProjekte() {
    const { data, error } = await client
        .from("kat_projekte")
        .select("*")
        .order("id");

    if (error) {
        console.error(error);
        alert(`Fehler beim Laden der Projekte: ${error.message}`);
        return;
    }

    absageProjekte = data || [];

    absageSelect.innerHTML = `<option value="">---</option>`;

    absageProjekte
        .filter(p => istAktivesProjekt(p) && Number(p.id) !== 0)
        .forEach(p => {
            const option = document.createElement("option");
            option.value = p.id;
            option.textContent = `${p.id} – ${p.titel ?? ""}`;
            absageSelect.appendChild(option);
        });

    absageProjektId = null;
    absageSchueler = [];
    absageErgebnis = [];
    absageTbody.innerHTML = "";
    absageInfo.textContent = "";
}

async function ladeAbsageSchueler() {
    absageProjektId = absageSelect.value ? Number(absageSelect.value) : null;
    absageSchueler = [];
    absageErgebnis = [];
    absageTbody.innerHTML = "";
    absageInfo.textContent = "";

    if (absageProjektId == null) {
        return;
    }

    const { data, error } = await client
        .from("kat_sus")
        .select("id, name, mail, klasse, zugeordnet, erstwunsch, zweitwunsch, drittwunsch")
        .eq("zugeordnet", absageProjektId);

    if (error) {
        console.error(error);
        alert(`Fehler beim Laden der Schüler: ${error.message}`);
        return;
    }

    absageSchueler = (data || []).map(s => ({
        id: s.id,
        name: s.name ?? "",
        mail: s.mail ?? "",
        klasse: s.klasse ?? "",
        zugeordnet: s.zugeordnet,
        erstwunsch: s.erstwunsch,
        zweitwunsch: s.zweitwunsch,
        drittwunsch: s.drittwunsch,
        neuesProjekt: null
    }));

    absageErgebnis = absageSchueler.map(s => ({...s}));
    zeigeAbsageTabelle();
    zeigeAbsageInfo();
}

function berechneAbsageNeuordnung() {
    if (absageProjektId == null) return [];

    const aktiveProjekte = absageProjekte.filter(p =>
        istAktivesProjekt(p) &&
        Number(p.id) !== 0 &&
        Number(p.id) !== Number(absageProjektId)
    );

    const aktiveIds = new Set(aktiveProjekte.map(p => Number(p.id)));
    const betroffenIds = new Set(absageSchueler.map(s => String(s.id)));

    // Aktuelle Belegung aller Projekte laden; die Schüler des abgesagten
    // Projekts werden für die Zielkapazitäten nicht mitgezählt.
    const belegt = {};
    absageAlleSchueler.forEach(s => {
        const id = Number(s.zugeordnet);
        if (!Number.isNaN(id) && aktiveIds.has(id)) {
            belegt[id] = (belegt[id] || 0) + 1;
        }
    });

    const cap = {};
    aktiveProjekte.forEach(p => {
        cap[p.id] = Math.max(0, Number(p.plaetze || 0) - (belegt[p.id] || 0));
    });

    const sch = absageSchueler.map(s => ({...s, neuesProjekt: null}));

    // 1. Wunschvergabe
    for (const s of sch) {
        for (const w of [s.erstwunsch, s.zweitwunsch, s.drittwunsch]) {
            const projekt = aktiveProjekte.find(p => Number(p.id) === Number(w));
            const ziel = w == null || w === "" ? null : Number(w);

            if (
                projekt &&
                aktiveIds.has(ziel) &&
                stufenfilterAbsage(s, projekt) &&
                cap[ziel] > 0
            ) {
                s.neuesProjekt = ziel;
                cap[ziel]--;
                break;
            }
        }
    }

    // 2. Nachvergabe: nur Schüler, die vom abgesagten Projekt betroffen sind,
    // dürfen innerhalb dieser Neuverteilung verschoben werden.
    let changed = true;
    while (changed) {
        changed = false;

        for (const s of sch) {
            if (s.neuesProjekt !== null) continue;

            const wishes = [s.erstwunsch, s.zweitwunsch, s.drittwunsch];

            for (const target of wishes) {
                const ziel = Number(target);
                const zielProjekt = aktiveProjekte.find(p => Number(p.id) === ziel);

                if (!zielProjekt || !stufenfilterAbsage(s, zielProjekt)) {
                    continue;
                }

                let moved = false;

                for (const o of sch) {
                    if (Number(o.neuesProjekt) !== ziel) continue;

                    for (const alt of [o.zweitwunsch, o.drittwunsch]) {
                        const altId = Number(alt);
                        const altProjekt = aktiveProjekte.find(p => Number(p.id) === altId);

                        if (
                            altProjekt &&
                            altId !== ziel &&
                            stufenfilterAbsage(o, altProjekt) &&
                            cap[altId] > 0
                        ) {
                            o.neuesProjekt = altId;
                            cap[altId]--;
                            cap[ziel]++;

                            s.neuesProjekt = ziel;
                            cap[ziel]--;

                            changed = true;
                            moved = true;
                            break;
                        }
                    }

                    if (moved) break;
                }

                if (s.neuesProjekt !== null) break;

                if (cap[ziel] > 0) {
                    s.neuesProjekt = ziel;
                    cap[ziel]--;
                    changed = true;
                    break;
                }
            }
        }
    }

    // 3. Restplatzvergabe. Schüler ohne mögliche Zuordnung bleiben bewusst leer.
    for (const s of sch) {
        if (s.neuesProjekt !== null) continue;

        const freiesProjekt = aktiveProjekte.find(p =>
            cap[p.id] > 0 && stufenfilterAbsage(s, p)
        );

        if (freiesProjekt) {
            s.neuesProjekt = Number(freiesProjekt.id);
            cap[freiesProjekt.id]--;
        }
    }

    return sch;
}

let absageAlleSchueler = [];

async function bereiteAbsageVor() {
    if (absageProjektId == null) {
        alert("Bitte zuerst ein Projekt wählen.");
        return false;
    }

    if (!absageSchueler.length) {
        alert("Diesem Projekt sind keine Schüler zugeordnet.");
        return false;
    }

    const { data, error } = await client
        .from("kat_sus")
        .select("id, zugeordnet");

    if (error) {
        console.error(error);
        alert(`Fehler beim Laden der aktuellen Belegung: ${error.message}`);
        return false;
    }

    absageAlleSchueler = data || [];
    absageErgebnis = berechneAbsageNeuordnung();
    zeigeAbsageTabelle();
    zeigeAbsageInfo();

    return true;
}

async function openProjektabsagung() {
    openElement("projektabsagung");
    await ladeAbsageProjekte();
}

absageSelect.addEventListener("change", async () => {
    await ladeAbsageSchueler();
    if (absageProjektId != null && absageSchueler.length) {
        await bereiteAbsageVor();
    }
    document.querySelector("#projektabsagung table").style.display = "block";
    document.querySelector("#projektabsagung div div").style.display = "flex";
});

absageDownloadBtn.addEventListener("mouseenter", () => {
    document.querySelector("#downloadAbsage img").src = "../../b/download-hover.png";
});
absageDownloadBtn.addEventListener("mouseleave", () => {
    document.querySelector("#downloadAbsage img").src = "../../b/download.png";
});

absageDownloadBtn.onclick = async () => {
    if (!absageErgebnis.length) {
        alert("Bitte zuerst ein Projekt wählen und die Neuverteilung berechnen.");
        return;
    }

    const XLSX = await import("https://esm.sh/xlsx");
    const rows = absageErgebnis.map(s => {
        const projekt = s.neuesProjekt != null
            ? absageProjekte.find(
                p => Number(p.id) === Number(s.neuesProjekt)
              )
            : null;

        return {
            id: s.id ?? "",
            Klasse: s.klasse ?? "",
            Name: s.name ?? "",
            "E-Mail": s.mail ?? "",
            "neues Projekt": projekt ? `${projekt.id} - ${projekt.titel}`: "-",
            "Ort / Zeit": projektOrtZeit(projekt),
            Erstwunsch: s.erstwunsch ?? "",
            Zweitwunsch: s.zweitwunsch ?? "",
            Drittwunsch: s.drittwunsch ?? ""
        };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(rows),
        "Projektabsage"
    );

    const projekt = absageProjekte.find(p => Number(p.id) === Number(absageProjektId));
    const datum = new Date().toLocaleDateString("de-DE").replaceAll(".", "-");

    XLSX.writeFile(
        workbook,
        `kat_projektabsage_${projekt?.id ?? ""}_${datum}.ods`,
        {bookType: "ods"}
    );
};

absageBtn.onclick = async () => {
    if (!(await bereiteAbsageVor())) return;

    const nichtZuordenbar = absageErgebnis.filter(s => s.neuesProjekt == null);
    const projekt = absageProjekte.find(p => Number(p.id) === Number(absageProjektId));

    let bestaetigung = `Projekt ${projekt?.id ?? absageProjektId} – ${projekt?.titel ?? ""} wird abgesagt.\n\n`;
    bestaetigung += `${absageErgebnis.length} Schüler sind betroffen.\n`;
    bestaetigung += `${absageErgebnis.length - nichtZuordenbar.length} werden neu zugeordnet.\n`;
    bestaetigung += `${nichtZuordenbar.length} bleiben ohne Zuordnung.`;

    if (nichtZuordenbar.length) {
        bestaetigung += `\n\nNicht zuordenbar:\n${nichtZuordenbar.map(s => `${s.name} (${s.id})`).join("\n")}`;
    }

    bestaetigung += "\n\nMöchten Sie die Absage jetzt durchführen?";

    if (!confirm(bestaetigung)) return;

    absageBtn.disabled = true;

    try {
        // Zuerst alle betroffenen Schüler aktualisieren. Der ursprüngliche
        // Projektwert wird in ehemalig gespeichert. Nicht zuordenbare Schüler
        // bekommen bewusst NULL/leer als neue Zuordnung.
        for (const s of absageErgebnis) {
            const { error } = await client
                .from("kat_sus")
                .update({
                    zugeordnet: s.neuesProjekt == null ? null : Number(s.neuesProjekt),
                    ehemalig: Number(absageProjektId)
                })
                .eq("id", s.id);

            if (error) {
                throw new Error(`Fehler bei Schüler ${s.name} (${s.id}): ${error.message}`);
            }
        }

        // Das Projekt bleibt in kat_projekte erhalten, wird aber deaktiviert.
        const { error: projektError } = await client
            .from("kat_projekte")
            .update({ status: false })
            .eq("id", absageProjektId);

        if (projektError) {
            throw new Error(`Schüler wurden aktualisiert, aber das Projekt konnte nicht deaktiviert werden: ${projektError.message}`);
        }

        alert(
            `Projekt ${absageProjektId} wurde abgesagt.\n` +
            `${absageErgebnis.length - nichtZuordenbar.length} Schüler wurden neu zugeordnet.` +
            (nichtZuordenbar.length
                ? `\n\nNicht zuordenbar:\n${nichtZuordenbar.map(s => `${s.name} (${s.id})`).join("\n")}`
                : "")
        );

        await ladeProjekte();
        await ladeAbsageProjekte();
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        absageBtn.disabled = false;
    }
};