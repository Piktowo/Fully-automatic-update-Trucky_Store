#!/system/bin/sh    
MODDIR=${0%/*}    

(    
# 等待系统启动完成    
until [ "$(getprop sys.boot_completed)" = "1" ]; do    
    sleep 5    
done    

export PATH="/system/bin:/system/xbin:/vendor/bin:$(magisk --path)/.magisk/busybox:$PATH"    

# 启动定时任务    
crond -c "$MODDIR/cron"    

# 确保 log 目录存在    
LOGDIR="$MODDIR/log"    
NOW=$(date "+%Y%m%d_%H%M%S")    
if [ ! -d "$LOGDIR" ]; then    
    mkdir -p "$LOGDIR"    
    LOGFILE="$LOGDIR/new_$NOW.log"    
else    
    LOGFILE="$LOGDIR/$NOW.log"    
fi    

# 读取 tee.conf 内容并修改 tee_status    
TEE_CONF_FILE="$MODDIR/conf/tee.conf"
TEE_STATUS_FILE="/data/adb/tricky_store/tee_status"

if [ -f "$TEE_CONF_FILE" ]; then
    TEE_STATUS=$(cat "$TEE_CONF_FILE" | tr -d '[:space:]')  # 去除空格和换行符
    if [ "$TEE_STATUS" = "enable" ]; then
        echo "teeBroken=true" > "$TEE_STATUS_FILE"  # 设置为 true
    elif [ "$TEE_STATUS" = "disable" ]; then
        echo "teeBroken=false" > "$TEE_STATUS_FILE"  # 设置为 false
    else
        echo "无效的 tee.conf 内容，未修改 tee_status"
    fi
else
    echo "未找到 tee.conf 文件，无法修改 tee_status"
fi

# 写入 tee_status 内容（如果存在）    
[ -f "$TEE_STATUS_FILE" ] && cat "$TEE_STATUS_FILE" > "$LOGFILE"    

# 设置权限    
chmod -R 777 "$MODDIR"    

) &    
