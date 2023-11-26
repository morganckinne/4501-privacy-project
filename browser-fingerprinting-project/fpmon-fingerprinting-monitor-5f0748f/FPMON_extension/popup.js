const MAX_SCRIPTS_TO_SHOW = 3;

const setDOMInfo = (data) => {
    const t = JSON.parse(data.extension_score);

    if (t.url.startsWith("file")) {
        nameoffile = t.url.split("/").slice(-1);
        document.getElementById("url").innerText = nameoffile;
    } else {
        document.getElementById("url").innerText = t.url.split("/").slice(2, 3).join("/");
    }

    document.getElementById("coverage").innerText = t.coverage_entities;
    document.getElementById("categories").innerText = t.coverage_categories;
    document.getElementById("aggressive_coverage").innerText = t.aggressive_coverage;

    fingerprint_categories = t.fingerprint_categories.replace(/_/g, " ");
    fingerprint_categories = fingerprint_categories.replace("App name", "Browser vendor");
    fingerprint_categories = fingerprint_categories.replace("Oscpu", "Operating system");
    fingerprint_categories = fingerprint_categories.replace("Cpu Class", "CPU class");
    fingerprint_categories = fingerprint_categories.replace("Online", "Online status");
    fingerprint_categories = fingerprint_categories.replace("Audio Video formats", "Audio and video formats");
    fingerprint_categories = fingerprint_categories.replace("Hardware concurrency", "CPU concurrency");

    fingerprint_categories_list = fingerprint_categories.split(";");
    aggrocalls = [];
    naggrocalls = [];

    for (let r = 0; r < fingerprint_categories_list.length; r++) {
        item = fingerprint_categories_list[r];
        if (item !== "") {
            if (["Canvas", "JS fonts", "List of plugins", "WebGL", "Webdriver", "Audio and video formats", "Audio", "Media devices", "Frequency analyzer", "Geolocation", "Connection", "App version", "Permissions", "Product sub", "Operating system", "Battery status", "Device memory", "CPU concurrency"].includes(item)) {
                aggrocalls.push(item);
            } else {
                naggrocalls.push(item);
            }
        }
    }

    fingerprint_categories_text = "";
    fingerprint_categories_aggro_text = "";

    if (naggrocalls.length > 0) {
        fingerprint_categories_text = "<li>" + naggrocalls.join("</li><li>") + "</li>";
    }

    if (aggrocalls.length > 0) {
        fingerprint_categories_aggro_text = "<li>" + aggrocalls.join("</li><li>") + "</li>";
    }

    document.getElementById("fingerprint_categories").innerHTML = fingerprint_categories_text;
    document.getElementById("fingerprint_categories_aggro").innerHTML = fingerprint_categories_aggro_text;
};

const setScriptInfo = (data) => {
    const t = JSON.parse(data.script_origins_internal);
    document.getElementById("fingerprint_scripts").innerHTML = "";
    script_counter = 0;

    Object.keys(t).sort((e, r) => t[e].unique_categories.length - t[r].unique_categories.length).reverse().forEach((e, r) => {
        if (!(script_counter > 2)) {
            script_calls_cnt = t[e].fingerprint.length;
            script_fp = t[e].fingerprint.join(";");
            script_score = t[e].unique_categories.length;
            fixed_url = e;

            if (e.includes("?")) {
                fixed_url = e.split("?")[0];
            }

            url = new URL(fixed_url);
            filename = url.pathname.replace(/^.*[\\\/]/, "");
            if (!filename.includes(".js")) {
                filename = url.pathname;
            }

            const n = document.createElement("a");
            n.setAttribute("href", e);
            n.setAttribute("target", "_blank");
            textnode = url.hostname + filename;
            textnode.length > 36 && (textnode = textnode.substring(0, 36) + "...");
            n.appendChild(document.createTextNode(textnode));

            table_row = '<tr style="line-height: 8px;">';
            table_row += '<td style="border-bottom: 0px;">' + script_score + "</td>";
            table_row += '<td style="border-bottom: 0px;">' + n.outerHTML + "</td>";
            table_row += "</tr>";

            document.getElementById("fingerprint_scripts").innerHTML += table_row;
            script_counter++;
        }
    });
};

window.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content loaded");

    setInterval(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { from: "popup", subject: "DOMInfo" }, setDOMInfo);
        });
    }, 250);

    setInterval(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { from: "popup", subject: "ScriptInfo" }, setScriptInfo);
        });
    }, 500);

    // Added export functionality
    document.getElementById('exportButton').addEventListener('click', () => {
        exportToCSV();
    });
});

const exportToCSV = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { from: "popup", subject: "ExportData" }, (data) => {
            if (data) {
                const csvContent = generateCSVContent(data);
                downloadCSV(csvContent);
            }
        });
    });
};

const generateCSVContent = (data) => {
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => obj[header]));
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};

const downloadCSV = (csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
