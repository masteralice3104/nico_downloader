// 設定画面専用。共有のoptions.jsや動画ページの処理には変更を加えない。
const optionDefaults = {
    video_downloading: "0",
    video_pattern: "sm[0-9]{1,}",
    video_autosave: "0",
    video_hlssave: "0",
    debug: "0",
    language_setting: "ja",
    downFile_setting: "mp4",
};
let savedOptions = null;
let optionsBusy = true;

function ReadOptionControl(name) {
    const control = document.getElementById(name);
    return control.type === "checkbox" ? control.checked ? control.dataset.on : control.dataset.off : control.value;
}

function WriteOptionControl(name, value) {
    const control = document.getElementById(name);
    const normalized = String(value ?? optionDefaults[name]);
    if (control.type === "checkbox") {
        // 以前の高速モード値も、設定を開くだけでは通常モードへ変えない。
        if (name === "video_hlssave") control.dataset.off = normalized === "2" ? "2" : "1";
        control.checked = normalized === control.dataset.on;
    }
    else {
        control.value = normalized;
        if (control.tagName === "SELECT" && control.selectedIndex < 0) control.value = optionDefaults[name];
    }
}

function ReadOptionsForm() {
    return Object.fromEntries(Object.keys(optionDefaults).map((name) => [name, ReadOptionControl(name)]));
}

function OptionsAcknowledged() {
    return document.getElementById("guide_acknowledged").checked;
}

function SetOptionsBusy(busy) {
    optionsBusy = busy;
    const locked = busy || !OptionsAcknowledged();
    document.getElementById("guide_acknowledged").disabled = busy;
    document.getElementById("settings_fields").disabled = locked;
    document.getElementById("save_button").disabled = locked;
    document.getElementById("default_val").disabled = locked;
}

function ShowOptionsStatus(message, error = false) {
    const status = document.getElementById("saved");
    status.textContent = message;
    status.dataset.state = error ? "error" : "normal";
}

function UpdateFilenamePreview() {
    const patterns = ["sm12345678", "動画タイトル", "sm12345678_動画タイトル", "動画タイトル_sm12345678"];
    const name = patterns[ReadOptionControl("video_downloading")] || patterns[0];
    document.getElementById("filename_preview").textContent = name + "." + ReadOptionControl("downFile_setting");
}

function OptionsChanged() {
    document.getElementById("video_pattern").setCustomValidity("");
    UpdateFilenamePreview();
    if (!optionsBusy && savedOptions) {
        const dirty = JSON.stringify(ReadOptionsForm()) !== JSON.stringify(savedOptions);
        ShowOptionsStatus(dirty ? "変更はまだ保存されていません。" : "保存済みの設定です。");
    }
}

function Options_Save(event) {
    event?.preventDefault();
    if (optionsBusy || !savedOptions || !OptionsAcknowledged()) return;
    const values = ReadOptionsForm();
    const pattern = document.getElementById("video_pattern");
    try {
        if (!values.video_pattern.trim()) throw new Error("empty pattern");
        new RegExp(values.video_pattern);
    } catch (error) {
        document.getElementById("advanced").open = true;
        pattern.setCustomValidity("有効な正規表現を入力してください。");
        pattern.reportValidity();
        pattern.focus();
        ShowOptionsStatus("URL判別パターンを確認してください。", true);
        return;
    }
    SetOptionsBusy(true);
    ShowOptionsStatus("保存中…");
    const onError = (error) => {
        SetOptionsBusy(false);
        ShowOptionsStatus("保存できませんでした。もう一度お試しください。", true);
        console.error("設定の保存に失敗しました:", error);
    };
    try {
        chrome.storage.local.set({ ...values, newloading: "1" }, () => {
            if (chrome.runtime.lastError) {
                onError(chrome.runtime.lastError.message);
                return;
            }
            // 動画ページで使うキーと値は従来のまま。ローカルの控えも同期する。
            try {
                for (const [name, value] of Object.entries({ ...values, newloading: "1" })) localStorage.setItem(name, value);
            } catch (error) {
                console.warn("設定のローカル控えを更新できませんでした:", error);
            }
            savedOptions = values;
            SetOptionsBusy(false);
            ShowOptionsStatus("設定を保存しました。");
        });
    } catch (error) {
        onError(error);
    }
}

function Default_click() {
    if (optionsBusy || !OptionsAcknowledged()) return;
    for (const [name, value] of Object.entries(optionDefaults)) WriteOptionControl(name, value);
    OptionsChanged();
    ShowOptionsStatus("初期値に戻しました。反映するには保存してください。");
}

function UpdateOptionsNavigation() {
    const hash = location.hash || "#help";
    for (const link of document.querySelectorAll(".navigation a")) {
        if (link.getAttribute("href") === hash) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
    }
}

function InitializeOptions() {
    const acknowledgement = document.getElementById("guide_acknowledged");
    acknowledgement.checked = false;
    acknowledgement.addEventListener("change", () => {
        SetOptionsBusy(optionsBusy);
        if (!optionsBusy) {
            if (OptionsAcknowledged()) OptionsChanged();
            else ShowOptionsStatus("先に上の使い方を確認してください。");
        }
    });
    if (location.hash && location.hash !== "#help") location.hash = "#help";
    document.getElementById("form").addEventListener("submit", Options_Save);
    document.getElementById("form").addEventListener("input", OptionsChanged);
    document.getElementById("form").addEventListener("change", OptionsChanged);
    document.getElementById("default_val").addEventListener("click", Default_click);
    window.addEventListener("hashchange", UpdateOptionsNavigation);
    UpdateOptionsNavigation();
    document.getElementById("version").textContent = "バージョン " + chrome.runtime.getManifest().version;
    const onError = (error) => {
        ShowOptionsStatus("設定を読み込めませんでした。画面を再読み込みしてください。", true);
        console.error("設定の読み込みに失敗しました:", error);
    };
    try {
        chrome.storage.local.get(optionDefaults, (values) => {
            if (chrome.runtime.lastError) {
                onError(chrome.runtime.lastError.message);
                return;
            }
            for (const name of Object.keys(optionDefaults)) WriteOptionControl(name, values[name]);
            savedOptions = ReadOptionsForm();
            UpdateFilenamePreview();
            SetOptionsBusy(false);
            ShowOptionsStatus("先に上の使い方を確認してください。");
        });
    } catch (error) {
        onError(error);
    }
}

document.addEventListener("DOMContentLoaded", InitializeOptions, { once: true });
