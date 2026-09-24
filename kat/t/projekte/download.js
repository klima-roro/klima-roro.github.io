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

const downDrop = document.getElementById("downDrop"); // sweet
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

async function downloadAsPdf() {
    await ladeProjekte();
    try{
        const loader = document.getElementById("loader");
        loader.style.display = "block";

        const { generate } = await import("https://esm.sh/@pdfme/generator");
        const { table, text } = await import("https://esm.sh/@pdfme/schemas");

        // Projekte laden
        const {
            data,
            error
        } = await client

            .from("kat_projekte")
            .select("id, titel, ort, lehrkraft")
            .order(
                "id",
                {
                    ascending:true
                }
            );

        if(error){
            throw error;
        }

        // Tabellenzeilen erzeugen
        const tableRows = data.map(row => [
            String(row.id ?? ""),
            row.titel ?? "",
            row.ort ?? "",
            row.lehrkraft ?? ""
        ]);

        console.log("Anzahl Projekte:", tableRows.length);

        // Template auswählen
        const templateName =
            tableRows.length > 33
                ? "../../m/template_projekte_2.json"
                : "../../m/template_projekte.json";

        console.log("Template:", templateName);
        const template = await fetch(templateName).then(r => r.json());

        // Tabellen aufteilen
        const table1 = tableRows.slice(0,33);
        const table2 = tableRows.slice(33);

        const datum =  new Date().toLocaleDateString("de-DE");
        const input = {
            header: `Projektübersicht Klimaaktionstag, Stand: ${datum}`,
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
        a.download = `kat_projektuebersicht_${datum}.pdf`;

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

let XLSX = null;
async function getXLSX() {
    if (!XLSX) {
        XLSX = await import("https://esm.sh/xlsx");
    }

    return XLSX;
}

async function downloadAsExcel() {
    await ladeProjekte();
    const XLSX = await getXLSX();
    const table = document.getElementById("projekte");
    const workbook = XLSX.utils.table_to_book(table, {sheet: "Projekte"});
    const datum = new Date()
        .toLocaleDateString("de-DE")
        .replaceAll(".", "-");

    XLSX.writeFile(
        workbook,
        `kat_projekte_${datum}.xlsx`
    );
}

async function downloadAsOds() {
    await ladeProjekte();
    const XLSX = await getXLSX();
    const table = document.getElementById("projekte");
    const workbook = XLSX.utils.table_to_book(table, {sheet: "Projekte"});
    const datum = new Date()
        .toLocaleDateString("de-DE")
        .replaceAll(".", "-");

    XLSX.writeFile(
        workbook,
        `kat_projekte_${datum}.ods`,
        {
            bookType: "ods"
        }
    );
}

window.downloadAsPdf = downloadAsPdf;
window.downloadAsOds = downloadAsOds;
window.downloadAsExcel = downloadAsExcel;