let shellRunning = false;//sh默认状态
let initialPinchDistance = null;//触摸
let currentFontSize = 14;//默认字体大小
let currentMode = null;  // 原始读取的模式
let selectedMode = null; // 用户选择的模式
let teeOriginalState = null; // 原始配置值：true=enable，false=disable
let teePendingState = null;  // 用户当前点击后希望保存的状态
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;


document.addEventListener('DOMContentLoaded', async () => {
    checkMMRL();// 设置顶部状态栏的样式（亮/暗）
    loadVersionFromModuleProp();// 从module.prop获取版本号
    applySettingsEventListeners()// 交互按钮监听器集合
    applyRippleEffect();//模拟 MD3 波纹动画
    await loadCurrentMode(); //  读取当前模式并更新按钮文字
    await loadTeeStatusConfig(); //  读取 tee 状态并初始化滑块
});


//ksu封装好的执行shell函数
function exec(command) {
    return new Promise((resolve, reject) => {
        const callbackFuncName = `exec_callback_${Date.now()}`;
        window[callbackFuncName] = (errno, stdout, stderr) => {
            delete window[callbackFuncName];
            if (errno !== 0) {
                reject(new Error(`Command failed with exit code ${errno}: ${stderr}`));
                return;
            }
            resolve(stdout);
        };
        try {
            ksu.exec(command, "{}", callbackFuncName);
        } catch (error) {
            delete window[callbackFuncName];
            reject(error);
        }
    });
}



//spawn 函数，用于在 Android WebView 环境中通过 KernelSU 特权创建和管理子进程
function spawn(command, args = []) {
    const child = {
        listeners: {},
        stdout: { listeners: {} },
        stderr: { listeners: {} },
        stdin: { listeners: {} },
        on: function(event, listener) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(listener);
        },
        emit: function(event, ...args) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(listener => listener(...args));
            }
        }
    };
    ['stdout', 'stderr', 'stdin'].forEach(io => {
        child[io].on = child.on.bind(child[io]);
        child[io].emit = child.emit.bind(child[io]);
    });
    const callbackName = `spawn_callback_${Date.now()}`;
    window[callbackName] = child;
    child.on("exit", () => delete window[callbackName]);
    try {
        ksu.spawn(command, JSON.stringify(args), "{}", callbackName);
    } catch (error) {
        child.emit("error", error);
        delete window[callbackName];
    }
    return child;
}
//读取mode.conf
async function loadCurrentMode() {
    try {
        const result = await exec("cat /data/adb/modules/Tricky_Store-xiaoyi/conf/mode.conf");
        currentMode = result.trim();
        selectedMode = currentMode;
        updateModeButtonText();
    } catch (err) {
        appendToOutput(`[${new Date().toLocaleTimeString()}] `);
        appendToOutput("[!] 读取运行模式失败");
        appendToOutput("");
        console.error("读取模式失败:", err);
        const button = document.getElementById('mode-button');
        if (button) button.textContent = "读取模式失败";
    }
}
//读取tee.conf
async function loadTeeStatusConfig() {
    try {
        const result = await exec("cat /data/adb/modules/Tricky_Store-xiaoyi/conf/tee.conf");
        const isEnabled = result.trim() === "enable";

        teeOriginalState = isEnabled;
        teePendingState = isEnabled;

        const toggle = document.getElementById("toggle-auto-tee");
        toggle.checked = isEnabled;

        updateTeeToggleColor();
    } catch (error) {
        appendToOutput(`[${new Date().toLocaleTimeString()}] `);
        appendToOutput("[!] 读取 tee.conf 失败");
        appendToOutput("");
        console.error("读取 tee.conf 失败:", error);
    }
}

function updateModeButtonText() {
    const button = document.getElementById('mode-button');
    if (!button) return;
    if (selectedMode === currentMode) {
        button.textContent = `当前模式为模式${currentMode}`;
    } else {
        button.textContent = `当前模式为模式${currentMode} → 切换为模式${selectedMode}`;
    }
}

function updateTeeToggleColor() {
    const slider = document.getElementById("tee-slider");
    if (!slider) return;

    // 始终只根据 teeOriginalState 来设置颜色
    slider.style.backgroundColor = teeOriginalState ? "#00B8FB" : "#ccc";
}


// 交互按钮监听器集合
function applySettingsEventListeners() {
    // 模式切换按钮
    const modeButton = document.getElementById('mode-button');
    modeButton.addEventListener('click', () => {
        const options = ["0", "1", "2"];
        const choice = prompt("请选择模式：0、1 、2", selectedMode);
        if (choice !== null && options.includes(choice)) {
            if (choice !== selectedMode) {
                selectedMode = choice;
                updateModeButtonText();
            }
        }
    });

    // 切换 tee 滑块：支持点击滑块或整块区域
    const teeToggle = document.getElementById("toggle-auto-tee");
    const container = document.getElementById("auto-tee-toggle-container");

    // 当滑块自身被点击（原生行为）
    teeToggle.addEventListener("change", () => {
        teePendingState = teeToggle.checked;
        updateTeeToggleColor();
    });

    // 当点击容器其它部分时，模拟切换
    container.addEventListener("click", (e) => {
        // 如果点击事件源在 label 内部（包括滑块圆点、轨道），让原生 input 处理
        if (e.target.closest("label")) return;

        // 否则，模拟点击切换
        teeToggle.checked = !teeToggle.checked;
        teePendingState = teeToggle.checked;
        updateTeeToggleColor();
    });
    //说明
    const explainBtn = document.getElementById("explain");
    explainBtn.addEventListener("click", () => {
        alert("作者：酷安 @熠只狗  GitHub@youyou20041\n欢迎使用自动更新 Tricky Store 包名模块！\n本人是小白,借用了Fix的WebUI致歉");
    });

    // 保存按钮
    const saveBtn = document.getElementById("save-button");
    saveBtn.addEventListener("click", async () => {
        let changes = [];

        // 保存模式
        if (selectedMode !== currentMode) {
            try {
                await exec(`echo ${selectedMode} > /data/adb/modules/Tricky_Store-xiaoyi/conf/mode.conf`);
                currentMode = selectedMode;
                updateModeButtonText();
                changes.push("运行模式");
            } catch (err) {
                console.error("保存 mode.conf 失败:", err);
                appendToOutput(`[${new Date().toLocaleTimeString()}] `);
                appendToOutput("[!] 保存运行模式失败！");
                appendToOutput("");
                alert("保存运行模式失败！");
                return;
            }
        }

        // 保存 tee 状态
        if (typeof teePendingState === "boolean" && typeof teeOriginalState === "boolean" && teePendingState !== teeOriginalState) {
            const newValue = teePendingState ? "enable" : "disable";
            try {
                await exec(`echo "${newValue}" > /data/adb/modules/Tricky_Store-xiaoyi/conf/tee.conf`);
                teeOriginalState = teePendingState;
                updateTeeToggleColor();
                changes.push("开机自动修改 tee_status");
            } catch (e) {
                console.error("保存 tee.conf 失败:", e);
                appendToOutput("保存 tee 配置失败！");
                alert("保存 tee 配置失败！");
                return;
            }
        }

        // 输出提示
        if (changes.length > 0) {
            const modeText = `当前运行模式为 模式${currentMode}`;
            const teeText = `开机${teeOriginalState ? "会" : "不会"}修改 tee_status`;
            const message = `保存成功\n${modeText}\n${teeText}`;
            appendToOutput(`[${new Date().toLocaleTimeString()}] `);
            appendToOutput("保存成功");
            appendToOutput(modeText);
            appendToOutput(teeText);
            appendToOutput("");
            alert(message);
        } else {
            const msg = "未修改配置，无需保存";
            appendToOutput(`[${new Date().toLocaleTimeString()}] `);
            appendToOutput(msg);
            appendToOutput("");
            alert(msg);
        }
    });
    //更新包名
    const runNowBtn = document.getElementById("shmindsh");
    runNowBtn.addEventListener("click", () => {
        // 弹出确认框
        const confirmation = confirm("确定要立即更新包名吗？");

        if (confirmation) {  // 用户点击了“确定”
            if (shellRunning) return;
            shellRunning = true;

            const scriptOutput = spawn("sh", ["/data/adb/modules/Tricky_Store-xiaoyi/xiaoyi/yizdog.sh"]);

            appendToOutput(`[${new Date().toLocaleTimeString()}] `);

            scriptOutput.stdout.on("data", (data) => appendToOutput(data));
            scriptOutput.stderr.on("data", (data) => appendToOutput(data));
            
            appendToOutput("");

            scriptOutput.on("exit", () => {
                appendToOutput(""); // 空行换行
                shellRunning = false;
            });

            scriptOutput.on("error", () => {
                appendToOutput(`[${new Date().toLocaleTimeString()}] `);
                appendToOutput("[!] 执行 yizdog.sh 失败");
                appendToOutput("");
                shellRunning = false;
            });
        } else { // 用户点击了“取消”
            appendToOutput(`[${new Date().toLocaleTimeString()}] `);
            appendToOutput("[!] 更新包名操作被取消");
            appendToOutput("");
        }
    });


    // 清除终端内容 + 缩放字体
    const clearButton = document.querySelector('.clear-terminal');
    const terminal = document.querySelector('.output-terminal-content');

    clearButton.addEventListener('click', () => {
        terminal.innerHTML = '';
        currentFontSize = 14;
        updateFontSize(currentFontSize);
    });

    terminal.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    terminal.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            if (initialPinchDistance === null) {
                initialPinchDistance = currentDistance;
                return;
            }
            const scale = currentDistance / initialPinchDistance;
            const newFontSize = currentFontSize * scale;
            updateFontSize(newFontSize);
            initialPinchDistance = currentDistance;
        }
    }, { passive: false });

    terminal.addEventListener('touchend', () => {
        initialPinchDistance = null;
    });
}
// 保存白名单包名的按钮事件监听
const saveWhitelistBtn = document.getElementById("save-whitelist");

saveWhitelistBtn.addEventListener("click", async () => {
    const inputValue = document.getElementById("whitelist-input").value.trim();
    
    // 处理中文逗号为英文逗号，拆分包名
    const packageNames = inputValue.replace(/，/g, ',')  // 将中文逗号替换为英文逗号
                                   .split(',')        // 按照英文逗号拆分
                                   .map(name => name.trim()) // 去除包名的前后空格
                                   .filter(name => name);   // 过滤掉空值

    if (packageNames.length === 0) {
        appendToOutput(`[${new Date().toLocaleTimeString()}] `);
        appendToOutput("[!] 包名不能为空");
        return;
    }

    try {
        // 读取现有的白名单
        const existingWhitelist = await exec("cat /data/adb/modules/Tricky_Store-xiaoyi/conf/白名单.txt");
        const existingPackageNames = existingWhitelist.trim().split('\n').map(name => name.trim());
        
        // 逐一检查并添加新的包名
        for (const packageName of packageNames) {
            if (existingPackageNames.includes(packageName)) {
                appendToOutput(`[${new Date().toLocaleTimeString()}] `);
                appendToOutput(`包名 "${packageName}" 已存在于白名单中`);
                appendToOutput("白名单路径:/data/adb/modules/Tricky_Store-xiaoyi/conf/白名单.txt");
                appendToOutput("");
            } else {
                // 将新包名添加到白名单文件
                await exec(`echo "${packageName}" >> /data/adb/modules/Tricky_Store-xiaoyi/conf/白名单.txt`);
                appendToOutput(`[${new Date().toLocaleTimeString()}] `);
                appendToOutput(`包名 "${packageName}" 已保存到白名单`);
                appendToOutput("白名单路径:/data/adb/modules/Tricky_Store-xiaoyi/conf/白名单.txt");
                appendToOutput("");
            }
        }

        // 清空输入框
        document.getElementById("whitelist-input").value = "";

    } catch (err) {
        console.error("保存包名失败:", err);
        appendToOutput(`[${timeStr}] `);
        appendToOutput("[!] 保存添加白名单失败！");
        appendToOutput("");
        alert(`保存“${packageNames.join(", ")}”失败！`);
    }
});

document.getElementById("save-cron").addEventListener("click", async () => {
    const cronInput = document.getElementById("cron-input").value.trim();
    
    // 如果输入为空，给出提示并退出
    if (cronInput === "") {
        appendToOutput(`[${new Date().toLocaleTimeString()}] `);
        appendToOutput("[!] Cron 表达式不能为空！");
        appendToOutput("");
        return;
    }

    const cronFilePath = "/data/adb/modules/Tricky_Store-xiaoyi/cron/root";
    
    // 创建完整的 Cron 内容
    const cronContent = `${cronInput} sh /data/adb/modules/Tricky_Store-xiaoyi/xiaoyi/yizdog.sh`;

    try {
        // 使用 exec 命令将内容写入 root 文件
        await exec(`echo "${cronContent}" > ${cronFilePath}`);
        
        appendToOutput(`[${new Date().toLocaleTimeString()}] `);
        appendToOutput(`更新频率修改为${cronInput}`);
        appendToOutput("");
        
        // 清空输入框
        document.getElementById("cron-input").value = "";
    } catch (err) {
        appendToOutput(`[${new Date().toLocaleTimeString()}] `);
        appendToOutput("[!] 保存 Cron 表达式失败！");
        appendToOutput("");
    }
});




// 帮助按钮点击事件
document.getElementById("help-cron").addEventListener("click", () => {
    appendToOutput(`[${new Date().toLocaleTimeString()}] `);
    appendToOutput("更新执行频率重启生效!");
    appendToOutput("更新执行频率重启生效!");
    appendToOutput("更新执行频率重启生效!");
    appendToOutput("Cron 表达式的格式为5组数字,每组数字用空格分开");
    appendToOutput("*→第一个数字代表分钟");
    appendToOutput("*→第二个数字代表小时");
    appendToOutput("*→第三个数字代表日");
    appendToOutput("*→第四个数字代表月");
    appendToOutput("*→第五个数字代表星期");
    appendToOutput("星号(*)为每的意思");
    appendToOutput("例子:");
    appendToOutput("15 8 * * * 代表每天 08:15 执行");
    appendToOutput("30 22 * * * 代表每天 22:30 执行");
    appendToOutput("实在不懂让ai按照你的要求生成一个");
    appendToOutput("");
    alert("更新执行频率重启生效!\nCron 表达式的格式为5组数字\n!每组数字用空格分开!\n*→第一个数字代表分钟\n*→第二个数字代表小时\n*→第三个数字代表日\n*→第四个数字代表月\n*→第五个数字代表星期\n星号(*)为每的意思\n \n例子:\n15 8 * * * 代表每天 08:15 执行\n30 22 * * * 代表每天 22:30 执行\n实在不懂让ai生成一个");
});


// 从module.prop获取版本号
async function loadVersionFromModuleProp() {
    const versionElement = document.getElementById('version-text');
    try {
        const version = await exec("grep '^version=' /data/adb/modules/Tricky_Store-xiaoyi/module.prop | cut -d'=' -f2");
        versionElement.textContent = version.trim();
    } catch (error) {
        appendToOutput("[!] Failed to read version from module.prop");
        console.error("Failed to read version from module.prop:", error);
    }
}

// 输出到output
function appendToOutput(content) {
    const output = document.querySelector('.output-terminal-content');
    if (content.trim() === "") {
        const lineBreak = document.createElement('br');
        output.appendChild(lineBreak);
    } else {
        const line = document.createElement('p');
        line.className = 'output-content';
        line.innerHTML = content.replace(/ /g, '&nbsp;');
        output.appendChild(line);
    }
    output.scrollTop = output.scrollHeight;
}

// 执行sh并输出结果
function runAction() {
    if (shellRunning) return;
    shellRunning = true;
    const scriptOutput = spawn("sh", ["/data/adb/modules/playintegrityfix/action.sh"]);
    scriptOutput.stdout.on('data', (data) => appendToOutput(data));
    scriptOutput.stderr.on('data', (data) => appendToOutput(data));
    scriptOutput.on('exit', () => {
        appendToOutput(`[${new Date().toLocaleTimeString()}] `);
        appendToOutput("更新包名成功!");
        appendToOutput("");
        shellRunning = false;
    });
    scriptOutput.on('error', () => {
        appendToOutput(`[${new Date().toLocaleTimeString()}] `);
        appendToOutput("[!] 执行失败");
        appendToOutput("");
        shellRunning = false;
    });
}

/**
 * 模拟 MD3 波纹动画
 * 用法：class="ripple-element" style="position: relative; overflow: hidden;"
 * 隐藏; * 注意：需要 background-color 才能正常工作
 * @return {void}
 */
function applyRippleEffect() {
    document.querySelectorAll('.ripple-element').forEach(element => {
        if (element.dataset.rippleListener !== "true") {
            element.addEventListener("pointerdown", async (event) => {
                // Pointer up event
                const handlePointerUp = () => {
                    ripple.classList.add("end");
                    setTimeout(() => {
                        ripple.classList.remove("end");
                        ripple.remove();
                    }, duration * 1000);
                    element.removeEventListener("pointerup", handlePointerUp);
                    element.removeEventListener("pointercancel", handlePointerUp);
                };
                element.addEventListener("pointerup", handlePointerUp);
                element.addEventListener("pointercancel", handlePointerUp);

                const ripple = document.createElement("span");
                ripple.classList.add("ripple");

                // Calculate ripple size and position
                const rect = element.getBoundingClientRect();
                const width = rect.width;
                const size = Math.max(rect.width, rect.height);
                const x = event.clientX - rect.left - size / 2;
                const y = event.clientY - rect.top - size / 2;

                // Determine animation duration
                let duration = 0.2 + (width / 800) * 0.4;
                duration = Math.min(0.8, Math.max(0.2, duration));

                // Set ripple styles
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;
                ripple.style.animationDuration = `${duration}s`;
                ripple.style.transition = `opacity ${duration}s ease`;

                // Adaptive color
                const computedStyle = window.getComputedStyle(element);
                const bgColor = computedStyle.backgroundColor || "rgba(0, 0, 0, 0)";
                const isDarkColor = (color) => {
                    const rgb = color.match(/\d+/g);
                    if (!rgb) return false;
                    const [r, g, b] = rgb.map(Number);
                    return (r * 0.299 + g * 0.587 + b * 0.114) < 96; // Luma formula
                };
                ripple.style.backgroundColor = isDarkColor(bgColor) ? "rgba(255, 255, 255, 0.2)" : "";

                // Append ripple
                element.appendChild(ripple);
            });
            element.dataset.rippleListener = "true";
        }
    });
}

// 设置顶部状态栏的样式（亮/暗）
async function checkMMRL() {
    if (typeof ksu !== 'undefined' && ksu.mmrl) {
        // Set status bars theme based on device theme
        try {
            $playintegrityfix.setLightStatusBars(!window.matchMedia('(prefers-color-scheme: dark)').matches)
        } catch (error) {
            console.log("Error setting status bars theme:", error)
        }
    }
}

function getDistance(touch1, touch2) {
    return Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
    );
}

function updateFontSize(newSize) {
    currentFontSize = Math.min(Math.max(newSize, MIN_FONT_SIZE), MAX_FONT_SIZE);
    const terminal = document.querySelector('.output-terminal-content');
    terminal.style.fontSize = `${currentFontSize}px`;
}
