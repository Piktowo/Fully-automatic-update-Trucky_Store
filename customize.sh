#!/system/bin/sh

[ -z "$MODPATH" ] && MODPATH="/data/adb/modules/Tricky_Store-xiaoyi"
MODDIR="$MODPATH"
CONFDIR="$MODDIR/conf"
MODE_FILE="$CONFDIR/mode.conf"
TEE_CONF="$CONFDIR/tee.conf"
YIZDOG="$MODDIR/xiaoyi/yizdog.sh"
TEE_STATUS_FILE="/data/adb/tricky_store/tee_status"
TARGET_FILE="/data/adb/tricky_store/target.txt"

mkdir -p "$CONFDIR"
# 工具函数：获取音量键按键
get_volume_key() {
  while true; do
    keycheck
    VOLKEY=$(getevent -qlc 1 | grep -m 1 "KEY_VOLUME" | awk '{print $3}')
    if [ "$VOLKEY" = "KEY_VOLUMEUP" ] || [ "$VOLKEY" = "KEY_VOLUMEDOWN" ]; then
      echo "$VOLKEY"
      return
    fi
    sleep 0.1
  done
}

# 一、通过音量键选择模式
ui_print ""
ui_print "📦 当前包名添加模式说明："
ui_print " 0 = 只添加包名"
ui_print " 1 = 添加包名并加 '!'"
ui_print " 2 = 添加包名并加 '?'"
ui_print "👇 请按音量下键切换，音量上键确认："

CURRENT_MODE=0
while true; do
  ui_print "👉 当前选择：模式 $CURRENT_MODE"
  VOLKEY=$(get_volume_key)
  if [ "$VOLKEY" = "KEY_VOLUMEUP" ]; then
    break
  elif [ "$VOLKEY" = "KEY_VOLUMEDOWN" ]; then
    CURRENT_MODE=$(( (CURRENT_MODE + 1) % 3 ))
    sleep 0.3  # 防抖
  fi
done

echo "$CURRENT_MODE" > "$MODE_FILE"
ui_print "✅ 已设置包名添加模式为 $CURRENT_MODE"
# 二、选择是否自动修改 tee_status
ui_print ""
ui_print "📶 是否开机自动修改 tee_status 为 teeBroken=true？"
ui_print "📌 音量上键 = 开启 (true)，音量下键 = 关闭 (false)"
ui_print "⏳ 请在 10 秒内按键选择..."

# --- 修复核心：等待上一轮按键完成 + 清除残余事件 ---
sleep 1
getevent -qlc 1 > /dev/null 2>&1
sleep 0.2

# --- 等待按键（最多10秒） ---
VOLKEY=""
for i in $(seq 1 100); do
  VOLKEY=$(getevent -qlc 1 2>/dev/null | grep -m 1 "KEY_VOLUME" | awk '{print $3}')
  if [ "$VOLKEY" = "KEY_VOLUMEUP" ] || [ "$VOLKEY" = "KEY_VOLUMEDOWN" ]; then
    break
  fi
  sleep 0.1
done

# --- 判断结果 ---
if [ "$VOLKEY" = "KEY_VOLUMEUP" ]; then
  TEE_VALUE="true"
  echo "enable" > "$TEE_CONF"
  ui_print "✅ 已选择：自动修改 tee_status"
elif [ "$VOLKEY" = "KEY_VOLUMEDOWN" ]; then
  TEE_VALUE="false"
  echo "disable" > "$TEE_CONF"
  ui_print "ℹ️ 已选择：不开启自动修改 tee_status"
else
  TEE_VALUE="false"
  echo "disable" > "$TEE_CONF"
  ui_print "⚠️ 未检测到音量键输入（10秒超时），默认关闭"
fi
# 三、立即运行主逻辑脚本 yizdog.sh
ui_print ""
ui_print "🚀 正在加载包名……"
if [ -f "$YIZDOG" ]; then
  sh "$YIZDOG"
else
  ui_print "⚠️ 未找到 $YIZDOG，跳过加载包名"
fi

# 四、显示前5个加载的包名
if [ -f "$TARGET_FILE" ]; then
  ui_print "📋 加载的包名前5个："
  head -n 5 "$TARGET_FILE" | while read -r line; do
    ui_print "  - $line"
  done
  ui_print "✅ 包名加载完成"
else
  ui_print "⚠️ 未找到 $TARGET_FILE，可能未成功写入包名"
fi

# 五、立即修改 tee_status
ui_print ""
ui_print "🛠️ 正在修改 tee_status 为 teeBroken=$TEE_VALUE"

if [ ! -d "/data/adb/tricky_store" ]; then
  mkdir -p /data/adb/tricky_store
  ui_print "📁 已创建 /data/adb/tricky_store"
fi

echo "teeBroken=$TEE_VALUE" > "$TEE_STATUS_FILE"
ui_print "✅ tee_status 已设置为 teeBroken=$TEE_VALUE"

# 六、结尾提示信息
ui_print ""
ui_print "🎉 模块配置完成！"
ui_print "📌 模式和开机设置可在 $MODDIR/conf/ 修改"
ui_print "📌 静默更新包名任务可在 $MODDIR/conf/cron 中调整"
ui_print "如需修改配置，可执行模块内自定义脚本，或手动编辑配置文件"