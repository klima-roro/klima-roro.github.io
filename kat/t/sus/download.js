import { createClient }
from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = 'https://euuptkidjsquvhohvicv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1dXB0a2lkanNxdXZob2h2aWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDk4OTksImV4cCI6MjA3MDU4NTg5OX0.O1isV0Ove_Tb1ruXqY_dlD4UdQGM174eVw9Kp_22YO4';

const client = createClient(
    supabaseUrl,
    supabaseKey,
    {
        auth:{
            persistSession:true
        }
    }
);

const downDrop = document.getElementById("downDrop");
const openDownDrop = document.getElementById("openDownDrop");

openDownDrop.onclick = () => {
    if (downDrop.style.display === "none") {
        downDrop.style.display = "block";
    } else {
        downDrop.style.display = "none";
    }

}

document.getElementById("downDrop").addEventListener("change", function () {
    switch (this.value) {
        case "pdf": downloadAsPdf(); break;
        case "ods": downloadAsOds(); break;
        case "excel": downloadAsExcel(); break;
    }

    this.value = "";
});

function kuerze(text, max) {
    text = String(text ?? "");

    return text.length > max
        ? text.slice(0, max - 3) + "..."
        : text;
}

function getSichtbareSchueler() {
    const rows = document.querySelectorAll("#sus tbody tr");
    return [...rows]
        .filter(row => row.style.display !== "none")
        .map(row => {
            const get = field =>
                row.querySelector(`[data-field="${field}"]`)?.textContent.trim() ?? "";

            return {
                klasse: get("klasse"),
                name: get("name"),
                mail: get("mail"),
                zugeordnet: get("zugeordnet")
            };
        });
}

async function downloadAsPdf() {
    await ladeSchueler();
    try{
        const loader = document.getElementById("loader");
        loader.style.display = "block";
        const data = getSichtbareSchueler(); 

        if (data.length > 66) {
            alert(`Es wurden ${data.length} Schüler gefunden. Maximal 66 sind erlaubt.`);
            return;
        }   

        const { generate } = await import("https://esm.sh/@pdfme/generator");
        const { table, text } = await import("https://esm.sh/@pdfme/schemas");

        const {
            data: projekteData,
            error: projekteError
        } = await client
            .from("kat_projekte")
            .select("id, titel")
            .order("id");

        if (projekteError) {
            throw projekteError;
        }

        const projekte = {};

        projekteData.forEach(p => {
            projekte[String(p.id)] = p.titel;
        });

        // Tabellenzeilen erzeugen
        const tableRows = data.map(s => [
            kuerze(s.klasse, 10),
            kuerze(s.name, 20),
            kuerze(s.mail, 20),
            kuerze(s.zugeordnet, 20)
        ]);

        console.log("Anzahl Schueler:", tableRows.length);

        // Template auswählen
        const templateName =
            tableRows.length > 33
                ? "../../m/template_sus_2.json"
                : "../../m/template_sus.json";

        console.log("Template:", templateName);
        const template = await fetch(templateName).then(r => r.json());

        // Tabellen aufteilen
        const table1 = tableRows.slice(0,33);
        const table2 = tableRows.slice(33);

        const datum =  new Date().toLocaleDateString("de-DE");
        const input = {
            header: `Schülerübersicht Klimaaktionstag, Stand: ${datum}`,
            table: table1
        };

        // Nur für template_2
        if(table2.length){
            input.table_2 = table2;
        }

        const pdf = await generate({
            template,
            inputs:[input],

            plugins:{
                table,
                text
            }
        });

        const blob =
            new Blob(
                [
                    pdf
                ],

                {
                    type: "application/pdf"
                }
            );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `kat_schueleruebersicht_${datum}.pdf`;

        a.click();
        URL.revokeObjectURL(url);
    }

    catch(error){
        console.error(error);
        alert(error.message);
    }

    finally{
        document.getElementById("loader").style.display = "none";
    }
}

function getSichtbareDaten() {
    const rows = [...document.querySelectorAll("#sus tbody tr")]
        .filter(row => row.style.display !== "none");

    return rows.map(row => [
        row.querySelector('[data-field="id"]')?.textContent.trim() ?? "",
        row.querySelector('[data-field="klasse"]')?.textContent.trim() ?? "",
        row.querySelector('[data-field="name"]')?.textContent.trim() ?? "",
        row.querySelector('[data-field="mail"]')?.textContent.trim() ?? "",
        row.querySelector('[data-field="zugeordnet"]')?.textContent.trim() ?? "",
        row.querySelector('[data-field="erstwunsch"]')?.textContent.trim() ?? "",
        row.querySelector('[data-field="zweitwunsch"]')?.textContent.trim() ?? "",
        row.querySelector('[data-field="drittwunsch"]')?.textContent.trim() ?? ""
    ]);
}

let XLSX = null;
async function getXLSX() {
    if (!XLSX) {
        XLSX = await import("https://esm.sh/xlsx");
    }

    return XLSX;
}

async function downloadAsExcel() {
    const XLSX = await getXLSX();
    const daten = [
        ["id", "Klasse", "Name", "E-Mail", "Projekt", "Erstwunsch", "Zweitwunsch", "Drittwunsch"],
        ...getSichtbareDaten()
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(daten);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Schueler"
    );

    const datum = new Date()
        .toLocaleDateString("de-DE")
        .replaceAll(".", "-");

    XLSX.writeFile(
        workbook,
        `kat_schueler_${datum}.xlsx`
    );
}

async function downloadAsOds() {
    const XLSX = await getXLSX();
    const daten = [
        ["id", "Klasse", "Name", "E-Mail", "Projekt", "Erstwunsch", "Zweitwunsch", "Drittwunsch"],
        ...getSichtbareDaten()
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(daten);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Schueler"
    );

    const datum = new Date()
        .toLocaleDateString("de-DE")
        .replaceAll(".", "-");

    XLSX.writeFile(
        workbook,
        `kat_schueler_${datum}.ods`,
        {
            bookType: "ods"
        }
    );
}

window.downloadAsPdf = downloadAsPdf;
window.downloadAsOds = downloadAsOds;
window.downloadAsExcel = downloadAsExcel;