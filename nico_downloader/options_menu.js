// 設定画面専用。保存キーと保存名の生成処理は動画ページと共通。
const optionDefaults = {
    video_downloading: "0",
    save_comments_json: "0",
    video_filename_mode: "default",
    video_filename_part_1: "uploader",
    video_filename_part_2: "title",
    video_filename_part_3: "id",
    video_pattern: "sm[0-9]{1,}",
    shorts_video_pattern: "ss[0-9]{1,}",
    video_autosave: "0",
    video_hlssave: "0",
    debug: "0",
    language_setting: "ja",
    downFile_setting: "mp4",
};
let savedOptions = null;
let optionsBusy = true;
let savedGuideAcknowledged = "0";
const pendingOptionChanges = new Map();
const optionConflicts = new Set();
const optionRepairs = new Set();

// 画面だけで補正した旧保存値も、明示的な保存時には実データへ反映する。
function RememberOptionRepair(name, stored, normalized) {
    // 旧プリセットは保存側で互換対応しているため、自動修復で消さない。
    if (name === "video_filename_mode" && ["legacy", "uploader_title_id"].includes(stored)) {
        optionRepairs.delete(name);
        return;
    }
    const primitive = typeof stored === "string" || typeof stored === "number";
    if (stored !== undefined && (!primitive || String(stored) !== normalized)) optionRepairs.add(name);
    else optionRepairs.delete(name);
}

function ShowOptionsEditingStatus(savedMessage = "保存済みの設定です。") {
    if (!OptionsAcknowledged()) {
        ShowOptionsStatus("先に上の使い方を確認してください。");
        return;
    }
    const current = ReadOptionsForm();
    for (const name of optionConflicts) {
        if (current[name] === savedOptions[name]) optionConflicts.delete(name);
    }
    if (optionConflicts.size) {
        ShowOptionsStatus("別の画面で同じ項目が変更されました。編集中の値は保持しています。保存するとこの画面の値を使います。");
        return;
    }
    const dirty = Object.keys(optionDefaults).some(name => current[name] !== savedOptions[name]);
    if (optionRepairs.size) {
        ShowOptionsStatus((dirty ? "変更はまだ保存されていません。" : "") +
            "保存値と画面表示に不整合があります。「設定を保存」で表示中の値に修復できます。");
        return;
    }
    ShowOptionsStatus(dirty ? "変更はまだ保存されていません。" : savedMessage);
}

function ApplyPendingOptionChanges() {
    if (!savedOptions || optionsBusy || !pendingOptionChanges.size) return false;
    const current = ReadOptionsForm();
    for (const [name, value] of pendingOptionChanges) {
        if (name === "guide_acknowledged") {
            const control = document.getElementById(name);
            const normalized = String(value) === "1" ? "1" : "0";
            if (String(Number(control.checked)) === savedGuideAcknowledged) control.checked = normalized === "1";
            savedGuideAcknowledged = normalized;
            continue;
        }
        const editing = current[name] !== savedOptions[name];
        // コントロールと同じ正規化で保存済みの基準値を更新する。
        WriteOptionControl(name, value);
        const normalized = ReadOptionControl(name);
        RememberOptionRepair(name, value, normalized);
        savedOptions[name] = normalized;
        if (editing) WriteOptionControl(name, current[name]);
        if (editing && current[name] !== normalized) optionConflicts.add(name);
        else optionConflicts.delete(name);
    }
    pendingOptionChanges.clear();
    UpdateFilenamePreview();
    SetOptionsBusy(false);
    return true;
}

function ObserveOptionChanges(changes, area) {
    if (area !== "local") return;
    for (const [name, change] of Object.entries(changes)) {
        if (!Object.prototype.hasOwnProperty.call(optionDefaults, name) && name !== "guide_acknowledged") continue;
        const fallback = name === "guide_acknowledged" ? "0" : optionDefaults[name];
        pendingOptionChanges.set(name, Object.prototype.hasOwnProperty.call(change, "newValue") ? change.newValue : fallback);
    }
    if (ApplyPendingOptionChanges()) ShowOptionsEditingStatus("別の画面で変更された設定を反映しました。");
}

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
    const basicName = patterns[ReadOptionControl("video_downloading")] || patterns[0];
    const extension = ReadOptionControl("downFile_setting");
    const mode = ReadOptionControl("video_filename_mode");
    document.getElementById("filename_custom_fields").hidden = mode !== "custom";
    const parts = mode === "custom" ? [1, 2, 3].map((i) => ReadOptionControl("video_filename_part_" + i)) : ["uploader", "title", "id"];
    const name = mode === "default" ? basicName + "." + extension :
        BuildVideoFilename(parts, { id: "sm12345678", title: "動画タイトル", uploader: "投稿者名" }, extension);
    document.getElementById("filename_preview").textContent = name;
    document.getElementById("shorts_filename_preview").textContent = basicName.replace("sm12345678", "ss12345678") + "." + extension;
}

function OptionsChanged() {
    for (const name of ["video_pattern", "shorts_video_pattern"]) document.getElementById(name).setCustomValidity("");
    UpdateFilenamePreview();
    if (!optionsBusy && savedOptions) ShowOptionsEditingStatus();
}

function Options_Save(event) {
    event?.preventDefault();
    if (optionsBusy || !savedOptions || !OptionsAcknowledged()) return;
    ApplyPendingOptionChanges();
    if (!OptionsAcknowledged()) { ShowOptionsEditingStatus(); return; }
    const values = ReadOptionsForm();
    // 編集キーと、画面上の補正だけでは直っていない保存値だけを書き込む。
    const edited = Object.fromEntries(Object.entries(values).filter(([name, value]) =>
        value !== savedOptions[name] || optionRepairs.has(name)));
    const expected = { ...edited, newloading: "1", guide_acknowledged: "1" };
    for (const [name, label] of [["video_pattern", "通常動画"], ["shorts_video_pattern", "ショート"]]) {
        const pattern = document.getElementById(name);
        try {
            if (!values[name].trim()) throw new Error("empty pattern");
            new RegExp(values[name]);
        } catch (error) {
            document.getElementById("advanced").open = true;
            pattern.setCustomValidity("有効な正規表現を入力してください。");
            pattern.reportValidity();
            pattern.focus();
            ShowOptionsStatus(label + "のURL判別パターンを確認してください。", true);
            return;
        }
    }
    SetOptionsBusy(true);
    ShowOptionsStatus("保存中…");
    const onError = (error) => {
        SetOptionsBusy(false);
        ApplyPendingOptionChanges();
        ShowOptionsStatus("保存できませんでした。もう一度お試しください。", true);
        console.error("設定の保存に失敗しました:", error);
    };
    try {
        chrome.storage.local.set(expected, () => {
            if (chrome.runtime.lastError) {
                onError(chrome.runtime.lastError.message);
                return;
            }
            // 書き込み通知だけで成功扱いにせず、実際の保存値を読み戻す。
            try {
                chrome.storage.local.get(Object.keys(expected), (stored) => {
                    if (chrome.runtime.lastError) {
                        onError(chrome.runtime.lastError.message);
                        return;
                    }
                    if (Object.keys(expected).some((name) => stored[name] !== expected[name])) {
                        onError(new Error("書き込み後の設定値が一致しません。"));
                        return;
                    }
                    try {
                        for (const [name, value] of Object.entries(expected)) localStorage.setItem(name, value);
                    } catch (error) {
                        console.warn("設定のローカル控えを更新できませんでした:", error);
                    }
                    for (const [name, value] of Object.entries(edited)) {
                        savedOptions[name] = value;
                        optionConflicts.delete(name);
                        optionRepairs.delete(name);
                    }
                    savedGuideAcknowledged = "1";
                    SetOptionsBusy(false);
                    ApplyPendingOptionChanges();
                    ShowOptionsEditingStatus("設定を保存しました。");
                });
            } catch (error) {
                onError(error);
            }
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
    // 最初の読み込み中に別画面で変更された値も取りこぼさない。
    chrome.storage.onChanged.addListener(ObserveOptionChanges);
    const acknowledgement = document.getElementById("guide_acknowledged");
    acknowledgement.checked = false;
    acknowledgement.addEventListener("change", () => {
        SetOptionsBusy(optionsBusy);
        if (!optionsBusy) {
            if (OptionsAcknowledged()) OptionsChanged();
            else ShowOptionsStatus("先に上の使い方を確認してください。");
        }
    });
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
        chrome.storage.local.get({ ...optionDefaults, guide_acknowledged: "0" }, (values) => {
            if (chrome.runtime.lastError) {
                onError(chrome.runtime.lastError.message);
                return;
            }
            const latest = { ...values, ...Object.fromEntries(pendingOptionChanges) };
            pendingOptionChanges.clear();
            for (const name of Object.keys(optionDefaults)) {
                WriteOptionControl(name, latest[name]);
                RememberOptionRepair(name, latest[name], ReadOptionControl(name));
            }
            savedOptions = ReadOptionsForm();
            savedGuideAcknowledged = String(latest.guide_acknowledged) === "1" ? "1" : "0";
            acknowledgement.checked = savedGuideAcknowledged === "1";
            UpdateFilenamePreview();
            SetOptionsBusy(false);
            if (!OptionsAcknowledged() && location.hash && location.hash !== "#help") location.hash = "#help";
            UpdateOptionsNavigation();
            ShowOptionsEditingStatus("設定を変更したら保存してください。");
        });
    } catch (error) {
        onError(error);
    }
}

document.addEventListener("DOMContentLoaded", InitializeOptions, { once: true });
