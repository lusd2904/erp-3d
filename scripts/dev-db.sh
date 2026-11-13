#!/usr/bin/env bash
# 本地开发库：MySQL 8，容器 erp3d-dev-mysql，库 erp3d（utf8mb4，时区 +08:00），数据卷 <fullsys>/devdata/mysql
# 用法：./scripts/dev-db.sh up|down|logs|sql|reset-test
set -euo pipefail
NAME=erp3d-dev-mysql
IMAGE=${DEV_DB_IMAGE:-mysql:8.0}
PORT=${DEV_DB_PORT:-3307}
ROOT_PWD=${DEV_DB_ROOT_PWD:-erp3d_root_dev}
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
        -e MYSQL_ROOT_PASSWORD="$ROOT_PWD" -e MYSQL_DATABASE=erp3d -e MYSQL_USER=erp3d -e MYSQL_PASSWORD=erp3d_dev_pwd \
        -e TZ=Asia/Shanghai -v "$DATA:/var/lib/mysql" "$IMAGE" "${MYSQL_ARGS[@]}" >/dev/null
    fi
    echo "等待 MySQL 就绪…"
    for i in $(seq 1 90); do
      if docker exec "$NAME" mysqladmin -h127.0.0.1 -P"$PORT" -uroot -p"$ROOT_PWD" ping --silent >/dev/null 2>&1; then
        # 测试库（e2e 用，可随时清空）
        docker exec "$NAME" mysql -h127.0.0.1 -P"$PORT" -uroot -p"$ROOT_PWD" -e \
          "CREATE DATABASE IF NOT EXISTS erp3d CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
           CREATE DATABASE IF NOT EXISTS erp3d_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
           CREATE USER IF NOT EXISTS 'erp3d'@'%' IDENTIFIED BY 'erp3d_dev_pwd';
           GRANT ALL ON erp3d.* TO 'erp3d'@'%'; GRANT ALL ON erp3d_test.* TO 'erp3d'@'%'; FLUSH PRIVILEGES;" 2>/dev/null
        echo "MySQL 就绪：127.0.0.1:$PORT 库 erp3d / erp3d_test 用户 erp3d"; exit 0
      fi
      sleep 2
    done
    echo "MySQL 启动超时，看 ./scripts/dev-db.sh logs" >&2; exit 1 ;;
  down) docker stop "$NAME" ;;
  logs) docker logs --tail 100 "$NAME" ;;
  sql) docker exec -it "$NAME" mysql -h127.0.0.1 -P"$PORT" -uerp3d -perp3d_dev_pwd erp3d ;;
  reset-test)
    docker exec "$NAME" mysql -h127.0.0.1 -P"$PORT" -uroot -p"$ROOT_PWD" -e \
      "DROP DATABASE IF EXISTS erp3d_test; CREATE DATABASE erp3d_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; GRANT ALL ON erp3d_test.* TO 'erp3d'@'%';" ;;
  *) echo "用法: $0 up|down|logs|sql|reset-test"; exit 1 ;;
esac
