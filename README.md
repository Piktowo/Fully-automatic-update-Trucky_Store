# -TS-UI-
全自动更新TS包名可自定义添加!（无UI）
全自动更新Tricky_Store应用包名,可选择是否添加!,?或不添加以及开机是否修改tee_status为teeBroken=true或false.此模块为非UI版，后续请在/data/adb/modules/Tricky_Store-xiaoyi/conf配置选项，或者等待WEBUI版更新使用WEBUI更新你的配置


mode.conf配置讲解
模式0：仅添加包名
模式1：添加包名并在后面添加!
模式2：添加包名并在后面添加?


tee.conf配置讲解
disable：不开启开机自动修改 tee_status内容
tee_status内容为teeBroken=true
enable：开启开机自动修改 tee_status内容



/data/adb/modules/Tricky_Store-xiaoyi/cron/root
此文件中的内容为
* * * * * sh /data/adb/modules/Tricky_Store-xiaoyi//xiaoyi/yizdog.sh

前面的 * * * * * 部分表示执行时间，按顺序解释如下：

1. 第一个星号（*）表示每一分钟。
2. 第二个星号（*）表示每一小时。
3. 第三个星号（*）表示每一天。
4. 第四个星号（*）表示每一个月。
5. 第五个星号（*）表示每一周的每一天。
综合意思是：每一分钟执行一次任务。
请无需担心占用，次脚本每分钟更新一次包名，占用可忽略不计
