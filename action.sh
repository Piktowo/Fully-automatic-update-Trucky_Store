#!/system/bin/sh

# 模块路径
MODDIR=/data/adb/modules/Tricky_Store-xiaoyi

# 提示配置信息
echo "📁 模块配置文件路径："
echo "   - 模式配置: $MODDIR/conf/mode.conf"
echo "   - tee 设置: $MODDIR/conf/tee.conf"
echo "   - cron 设置: $MODDIR/cron/root"
echo ""
echo "📝 你可以通过手动编辑上述文件来自定义模块模式，此模块为非UI模块，你只能通过手动修改配置文件修改运行模式。或者你可以通过后续更新WEBUI版模块来更新你的配置"
echo ""

# 读取当前模式（mode.conf）
MODE_FILE="$MODDIR/conf/mode.conf"
if [ -f "$MODE_FILE" ]; then
    MODE=$(cat "$MODE_FILE")
    case "$MODE" in
        0)
            echo "🔄 当前模式：模式 0（只添加包名）"
            ;;
        1)
            echo "🔄 当前模式：模式 1（添加包名并加 '!'）"
            ;;
        2)
            echo "🔄 当前模式：模式 2（添加包名并加 '?'）"
            ;;
        *)
            echo "⚠️ 当前模式未知，请检查 $MODE_FILE 文件"
            ;;
    esac
else
    echo "❌ 未找到模式配置文件: $MODE_FILE"
fi

# 读取 tee 配置（tee.conf）
TEE_FILE="$MODDIR/conf/tee.conf"
if [ -f "$TEE_FILE" ]; then
    TEE_STATUS=$(cat "$TEE_FILE" | tr -d '[:space:]')  # 去除空格和换行符
    if [ "$TEE_STATUS" = "enable" ]; then
        echo "🔄 当前 tee 设置：开机自动修改 teeBroken=true"
    elif [ "$TEE_STATUS" = "disable" ]; then
        echo "🔄 当前 tee 设置：不开机自动修改"
    else
        echo "⚠️ tee.conf 文件内容无效"
    fi
else
    echo "❌ 未找到 tee 设置文件: $TEE_FILE"
fi

# 读取 cron/root 文件，获取当前包名的自动更新频率
CRON_FILE="$MODDIR/cron/root"
if [ -f "$CRON_FILE" ]; then
    CRON_SCHEDULE=$(head -n 1 "$CRON_FILE" | cut -d' ' -f1-5)  # 提取前五个字段，即定时任务频率
    echo "🔄 当前 cron 表达式为：($CRON_SCHEDULE)"
else
    echo "❌ 未找到 cron 配置文件: $CRON_FILE"
fi

# 打印 target.txt 文件中的前五个包名
TARGET_FILE="/data/adb/tricky_store/target.txt"
if [ -f "$TARGET_FILE" ]; then
    echo "🔄 当前 target.txt 文件中的前五个包名："
    head -n 5 "$TARGET_FILE"  # 打印前五行（前五个包名）
else
    echo "❌ 未找到 target.txt 文件: $TARGET_FILE"
fi

# 执行主脚本
YIZDOG=$MODDIR/xiaoyi/yizdog.sh
if [ -f "$YIZDOG" ]; then
    echo "🚀 正在执行 yizdog.sh..."
    sh "$YIZDOG"
    echo "✅ yizdog.sh 执行完成。"
else
    echo "❌ 未找到主脚本: $YIZDOG"
fi
# 检查系统规则是否已添加到 target.txt
SYS_RULE_FILE="$MODDIR/系统添加规则.txt"
TARGET_FILE="/data/adb/tricky_store/target.txt"

if [ -f "$SYS_RULE_FILE" ] && [ -f "$TARGET_FILE" ]; then
    echo ""
    echo "📎 正在校验系统添加规则.txt 是否已写入 target.txt..."
    MISSING_PACKAGES=""
    FOUND_PACKAGES=""

    while IFS= read -r pkg || [ -n "$pkg" ]; do
        [ -z "$pkg" ] && continue

        if grep -E -qx "$pkg(!|\?)?" "$TARGET_FILE"; then
            # 找出实际匹配的行（包含原始符号）
            MATCHED=$(grep -E -x "$pkg(!|\?)?" "$TARGET_FILE")
            FOUND_PACKAGES="${FOUND_PACKAGES}\n${MATCHED}"
        else
            MISSING_PACKAGES="${MISSING_PACKAGES}\n${pkg}"
        fi
    done < "$SYS_RULE_FILE"

    if [ -z "$(echo "$MISSING_PACKAGES" | sed '/^$/d')" ]; then
        echo "✅ 系统添加规则已全部添加至 target.txt。包含以下内容："
        echo -e "$FOUND_PACKAGES" | sed '/^$/d'
    else
        echo "⚠️ 以下系统规则包名未出现在 target.txt 中："
        echo -e "$MISSING_PACKAGES" | sed '/^$/d'
    fi
else
    echo "ℹ️ 系统添加规则.txt 或 target.txt 文件不存在，跳过规则校验。"
fi