#!/usr/bin/env bash
# 本地开发库：MySQL 8，容器 erp3d-dev-mysql，库 erp3d（utf8mb4，时区 +08:00），数据卷 <fullsys>/devdata/mysql
# 用法：./scripts/dev-db.sh up|down|logs|sql|reset-test
set -euo pipefail
NAME=erp3d-dev-mysql
IMAGE=${DEV_DB_IMAGE:-mysql:8.0}
PORT=${DEV_DB_PORT:-3307}
# 密码不写进代码：从环境变量或本地 scripts/dev-db.env（不进 git）读取 DEV_DB_ROOT_PWD、DEV_DB_PASSWORD
ENV_FILE=${DEV_DB_ENV:-$(cd "$(dirname "$0")" && pwd)/dev-db.env}
[ -f "$ENV_FILE" ] && set -a && . "$ENV_FILE" && set +a
ROOT_PWD=${DEV_DB_ROOT_PWD:?请设置 DEV_DB_ROOT_PWD（或写入 scripts/dev-db.env）}
APP_PWD=${DEV_DB_PASSWORD:?请设置 DEV_DB_PASSWORD（或写入 scripts/dev-db.env）}
HERE=$(cd "$(dirname "$0")/.." && pwd)
DATA=${DEV_DB_DATA:-$(cd "$HERE/.." && pwd)/devdata/mysql}
MYSQL_ARGS=(--character-set-server=utf8mb4 --collation-server=utf8mb4_0900_ai_ci --default-time-zone=+08:00
  --max-connections=200 --skip-name-resolve --port="$PORT")

case "${1:-up}" in
  up)
    mkdir -p "$DATA"
    if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
      docker start "$NAME" >/dev/null
    else
      # 没有 bridge 网络（沙箱里 dockerd --bridge=none）时用 host 网络，mysqld 直接监听 $PORT
      if docker network ls --format '{{.Name}}' | grep -qx bridge; then NET=(-p "$PORT:$PORT"); else NET=(--network host); fi
      docker run -d --name "$NAME" "${NET[@]}" --restart unless-stopped \
        -e MYSQL_ROOT_PASSWORD="$ROOT_PWD" -e MYSQL_DATABASE=erp3d -e MYSQL_USER=erp3d -e MYSQL_PASSWORD="$APP_PWD" \
        -e TZ=Asia/Shanghai -v "$DATA:/var/lib/mysql" "$IMAGE" "${MYSQL_ARGS[@]}" >/dev/null
    fi
    echo "等待 MySQL 就绪…"
    for i in $(seq 1 90); do
      if docker exec -e MYSQL_PWD="$ROOT_PWD" "$NAME" mysqladmin -h127.0.0.1 -P"$PORT" -uroot ping --silent >/dev/null 2>&1; then
        # 测试库（e2e 用，可随时清空）
        docker exec -e MYSQL_PWD="$ROOT_PWD" "$NAME" mysql -h127.0.0.1 -P"$PORT" -uroot -e \
          "CREATE DATABASE IF NOT EXISTS erp3d CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
           CREATE DATABASE IF NOT EXISTS erp3d_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
           CREATE USER IF NOT EXISTS 'erp3d'@'%' IDENTIFIED BY '$APP_PWD';
           GRANT ALL ON erp3d.* TO 'erp3d'@'%'; GRANT ALL ON erp3d_test.* TO 'erp3d'@'%'; FLUSH PRIVILEGES;" 2>/dev/null
        echo "MySQL 就绪：127.0.0.1:$PORT 库 erp3d / erp3d_test 用户 erp3d"; exit 0
      fi
      sleep 2
    done
    echo "MySQL 启动超时，看 ./scripts/dev-db.sh logs" >&2; exit 1 ;;
  down) docker stop "$NAME" ;;
  logs) docker logs --tail 100 "$NAME" ;;
  sql) docker exec -it -e MYSQL_PWD="$APP_PWD" "$NAME" mysql -h127.0.0.1 -P"$PORT" -uerp3d erp3d ;;
  reset-test)
    docker exec -e MYSQL_PWD="$ROOT_PWD" "$NAME" mysql -h127.0.0.1 -P"$PORT" -uroot -e \
      "DROP DATABASE IF EXISTS erp3d_test; CREATE DATABASE erp3d_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; GRANT ALL ON erp3d_test.* TO 'erp3d'@'%';" ;;
  *) echo "用法: $0 up|down|logs|sql|reset-test"; exit 1 ;;
esac
