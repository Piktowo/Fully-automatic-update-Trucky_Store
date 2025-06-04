全自动更新TS包名可自定义添加!（无UI）

全自动更新Tricky_Store应用包名,可选择是否添加!,?或不添加以及开机是否修改tee_status为teeBroken=true或false

此模块为非UI版，后续请在/data/adb/modules/Tricky_Store-xiaoyi/conf配置选项，或者等待WEBUI版更新使用WEBUI更新你的配置
********************************************
/data/adb/modules/Tricky_Store-xiaoyi/conf为配置文件夹，你可以在此配置mode.conf,tee.conf和白名单，添加进白名单会实时删除白名单内的包名，如果你的target.txt内包名已经添加过了，你可以删除其中全部包名，1分钟内模块会按照规则自动更新包名到target.txt

⚠️注意⚠️，模块不会修改已经添加进target.txt的包名，只会按照规则添加包名
********************************************
mode.conf配置讲解

1. 模式0：仅添加包名
2. 模式1：添加包名并在后面添加!
3. 模式2：添加包名并在后面添加?
********************************************
tee.conf配置讲解

disable：不开启开机自动修改 tee_status内容

enable：开启开机自动修改 tee_status内容

tee_status内容为teeBroken=true

********************************************
/data/adb/modules/Tricky_Store-xiaoyi/cron/root
此文件中的内容为
* * * * * sh /data/adb/modules/Tricky_Store-xiaoyi//xiaoyi/yizdog.sh

前面的 * * * * * 部分表示执行时间，按顺序解释如下：

1. 第一个星号（*）表示每一分钟
2. 第二个星号（*）表示每一小时
3. 第三个星号（*）表示每一天
4. 第四个星号（*）表示每一个月
5. 第五个星号（*）表示每一周的每一天

综合意思是：每一分钟执行一次任务

请无需担心占用，此脚本每分钟更新一次包名，占用可忽略不计
