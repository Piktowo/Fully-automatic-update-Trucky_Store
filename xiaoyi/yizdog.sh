#!/system/bin/sh

# 设置路径
MODDIR=/data/adb/modules/Tricky_Store-xiaoyi
STORE_DIR="/data/adb/tricky_store"
TARGET_FILE="$STORE_DIR/target.txt"
MODE_FILE="$MODDIR/conf/mode.conf"
WHITELIST_FILE="$MODDIR/conf/白名单.txt"

# 默认模式为 1（添加包名并加 '!'）
MODE=1
[ -f "$MODE_FILE" ] && MODE=$(cat "$MODE_FILE")

# 确保目录和文件存在
mkdir -p "$STORE_DIR"
[ -f "$TARGET_FILE" ] || touch "$TARGET_FILE"
[ -f "$WHITELIST_FILE" ] || touch "$WHITELIST_FILE"

# 清洗白名单（移除尾部 '!' 和 '?'）
CLEANED_WHITELIST=$(mktemp)
sed 's/[!?]$//' "$WHITELIST_FILE" > "$CLEANED_WHITELIST"

# 删除 target.txt 中白名单中的包名（无论带不带 ! 或 ?）
grep -v '^$' "$CLEANED_WHITELIST" | while IFS= read -r white_pkg; do
    grep -v -x "$white_pkg" "$TARGET_FILE" \
    | grep -v -x "$white_pkg!" \
    | grep -v -x "$white_pkg?" > "$TARGET_FILE.tmp"
    mv "$TARGET_FILE.tmp" "$TARGET_FILE"
done

# 获取当前所有第三方包名
TMP_PKGS=$(mktemp)
pm list packages -3 | sed 's/package://g' | sort -u > "$TMP_PKGS"

# 依照 MODE 添加包名
grep -vxFf "$CLEANED_WHITELIST" "$TMP_PKGS" | while IFS= read -r raw_pkg; do
    if ! grep -q -x "$raw_pkg" "$TARGET_FILE" \
       && ! grep -q -x "$raw_pkg!" "$TARGET_FILE" \
       && ! grep -q -x "$raw_pkg?" "$TARGET_FILE"; then

        case "$MODE" in
            0) echo "$raw_pkg" >> "$TARGET_FILE" ;;
            1) echo "$raw_pkg!" >> "$TARGET_FILE" ;;
            2) echo "$raw_pkg?" >> "$TARGET_FILE" ;;
        esac
    fi
done

# 清理临时文件
rm -f "$TMP_PKGS" "$CLEANED_WHITELIST"